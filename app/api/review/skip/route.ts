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
  const userId = ownerSession.user!.id;

  // Read-modify-write: fetch current skip_count, increment, update.
  // The original Supabase `rpc("increment")` approach is not supported by
  // the local pg shim, so we use explicit RMW here. skip_count is
  // non-critical (analytics-only), so the tiny race window is acceptable.
  const { data: row, error: readError } = await supabase
    .from("user_word_progress")
    .select("skip_count")
    .eq("id", parsed.data.progressId)
    .eq("user_id", userId)
    .single();

  if (readError) {
    const isNotFound = (readError as { code?: string }).code === "PGRST116";
    return apiErrorResponse(
      readError,
      "api/review/skip",
      isNotFound ? 404 : 500,
      isNotFound ? "Progress not found." : undefined,
    );
  }

  const { error: updateError } = await supabase
    .from("user_word_progress")
    .update({
      skip_count: (row?.skip_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.progressId)
    .eq("user_id", userId);

  if (updateError) {
    return apiErrorResponse(updateError, "api/review/skip");
  }

  return NextResponse.json({
    ok: true,
    progressId: parsed.data.progressId,
    sessionId: parsed.data.sessionId,
  });
}
