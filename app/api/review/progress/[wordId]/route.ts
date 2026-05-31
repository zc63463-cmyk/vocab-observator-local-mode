import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getOrCreateDefaultWordbook } from "@/lib/wordbook";
import { serializeOwnerWordProgress } from "@/lib/words";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ wordId: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const { wordId } = await context.params;
  const { searchParams } = new URL(request.url);
  const wordbookId = searchParams.get("wordbookId")
    ?? await getOrCreateDefaultWordbook(ownerSession.supabase!, ownerSession.user!.id);

  const { data, error } = await ownerSession.supabase!
    .from("user_word_progress")
    .select(
      "id, due_at, review_count, state, last_reviewed_at, lapse_count, again_count",
    )
    .eq("user_id", ownerSession.user!.id)
    .eq("wordbook_id", wordbookId)
    .eq("word_id", wordId)
    .maybeSingle();

  if (error) {
    return apiErrorResponse(error, "api/review/progress/[wordId]");
  }

  return NextResponse.json({
    progress: data ? serializeOwnerWordProgress(data) : null,
  });
}
