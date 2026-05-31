import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { isNoteRevisionsRelationMissing } from "@/lib/notes";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getOrCreateDefaultWordbook } from "@/lib/wordbook";
import { noteSchema } from "@/lib/validation/schemas";

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
    .from("notes")
    .select("content_md, updated_at, version")
    .eq("word_id", wordId)
    .eq("wordbook_id", wordbookId)
    .maybeSingle();

  if (error) {
    return apiErrorResponse(error, "api/notes/[wordId] GET");
  }

  return NextResponse.json({
    contentMd: data?.content_md ?? "",
    updatedAt: data?.updated_at ?? null,
    version: data?.version ?? 0,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ wordId: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const parsed = noteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { wordId } = await context.params;
  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const wordbookId = parsed.data.wordbookId
    ?? await getOrCreateDefaultWordbook(supabase, userId);

  const { data: current, error: currentError } = await supabase
    .from("notes")
    .select("id, version, content_md")
    .eq("word_id", wordId)
    .eq("wordbook_id", wordbookId)
    .maybeSingle();

  if (currentError) {
    throw currentError;
  }

  const hasChanged = current?.content_md !== parsed.data.contentMd;
  const nextVersion = hasChanged ? (current?.version ?? 0) + 1 : (current?.version ?? 0);
  const { data, error } = await supabase
    .from("notes")
    .upsert(
      {
        content_md: parsed.data.contentMd,
        id: current?.id,
        updated_at: new Date().toISOString(),
        user_id: userId,
        version: nextVersion || 1,
        word_id: wordId,
        wordbook_id: wordbookId,
      },
      {
        onConflict: "user_id,wordbook_id,word_id",
      },
    )
    .select("id, updated_at, version")
    .single();

  if (error) {
    return apiErrorResponse(error, "api/notes/[wordId] PUT");
  }

  if (hasChanged || !current) {
    const { error: revisionError } = await supabase.from("note_revisions").insert({
      content_md: parsed.data.contentMd,
      note_id: data.id,
      user_id: userId,
      version: data.version,
      word_id: wordId,
      wordbook_id: wordbookId,
    });

    if (revisionError && !isNoteRevisionsRelationMissing(revisionError)) {
      throw revisionError;
    }
  }

  return NextResponse.json({
    ok: true,
    updatedAt: data.updated_at,
    version: data.version,
  });
}
