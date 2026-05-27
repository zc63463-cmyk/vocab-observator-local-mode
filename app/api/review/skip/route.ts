import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { reviewSkipSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const parsed = reviewSkipSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = ownerSession.supabase!;

  // Increment skip_count so skip behaviour is persisted server-side.
  // The client still re-orders the local queue; this just ensures
  // analytics and future server-side queue builds know the card was
  // skipped rather than simply absent from the queue.
  const { error } = await supabase
    .from("user_word_progress")
    .update({
      skip_count: supabase.rpc("increment", { row_id: parsed.data.progressId, amount: 1 }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.progressId)
    .eq("user_id", ownerSession.user!.id);

  // Fallback: if the RPC doesn't exist in local mode, do a raw SQL
  // increment via the PostgREST `.select()` workaround or simply
  // read-modify-write. For simplicity we use read-modify-write here
  // because the local pg client doesn't support the Supabase RPC shape.
  if (error && error.message?.includes("increment")) {
    const { data: row } = await supabase
      .from("user_word_progress")
      .select("skip_count")
      .eq("id", parsed.data.progressId)
      .eq("user_id", ownerSession.user!.id)
      .single();

    const { error: updateError } = await supabase
      .from("user_word_progress")
      .update({
        skip_count: (row?.skip_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.progressId)
      .eq("user_id", ownerSession.user!.id);

    if (updateError) {
      return apiErrorResponse(updateError, "api/review/skip");
    }
  } else if (error) {
    return apiErrorResponse(error, "api/review/skip");
  }

  return NextResponse.json({
    ok: true,
    progressId: parsed.data.progressId,
    sessionId: parsed.data.sessionId,
  });
}
