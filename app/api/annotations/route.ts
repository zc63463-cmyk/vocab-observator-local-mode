import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";
import { sql } from "@/lib/db";

/**
 * GET /api/annotations?wordId=xxx
 *
 * Fetch the single annotation for a word in the active wordbook.
 */
export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const { searchParams } = new URL(request.url);
  const wordId = searchParams.get("wordId");
  const wordbookId = await resolveWordbookId(supabase, userId, null);

  if (!wordId) {
    return NextResponse.json({ annotation: null });
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(wordId)) {
    return NextResponse.json({ annotation: null });
  }

  const { data, error } = await sql<{
    id: string;
    word_id: string;
    content: string;
    updated_at: string;
  }>`
    SELECT id, word_id, content, updated_at
    FROM word_annotations
    WHERE user_id = ${userId}
      AND wordbook_id = ${wordbookId}
      AND word_id = ${wordId}::uuid
    LIMIT 1
  `;

  if (error) {
    return apiErrorResponse(error, "api/annotations");
  }

  return NextResponse.json({ annotation: data?.[0] ?? null });
}

/**
 * POST /api/annotations
 *
 * Body: { word_id, content }
 * Creates or updates (upsert) the annotation for a word.
 */
export async function POST(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const wordbookId = await resolveWordbookId(supabase, userId, null);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wordId = typeof body.word_id === "string" ? body.word_id : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (!wordId) {
    return NextResponse.json({ error: "word_id is required" }, { status: 400 });
  }

  const { data, error } = await sql<{
    id: string;
    word_id: string;
    content: string;
    updated_at: string;
  }>`
    INSERT INTO word_annotations (user_id, word_id, wordbook_id, content)
    VALUES (${userId}, ${wordId}::uuid, ${wordbookId}, ${content})
    ON CONFLICT (user_id, wordbook_id, word_id)
    DO UPDATE SET content = EXCLUDED.content, updated_at = now()
    RETURNING id, word_id, content, updated_at
  `;

  if (error) {
    return apiErrorResponse(error, "api/annotations");
  }

  return NextResponse.json({ annotation: data?.[0] ?? null });
}
