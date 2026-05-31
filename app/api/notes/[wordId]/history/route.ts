import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { isNoteRevisionsRelationMissing } from "@/lib/notes";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getOrCreateDefaultWordbook } from "@/lib/wordbook";

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
    .from("note_revisions")
    .select("id, version, content_md, created_at")
    .eq("word_id", wordId)
    .eq("wordbook_id", wordbookId)
    .eq("user_id", ownerSession.user!.id)
    .order("version", { ascending: false })
    .limit(8);

  if (isNoteRevisionsRelationMissing(error)) {
    return NextResponse.json({
      revisions: [],
    });
  }

  if (error) {
    return apiErrorResponse(error, "api/notes/[wordId]/history");
  }

  return NextResponse.json({
    revisions: data ?? [],
  });
}
