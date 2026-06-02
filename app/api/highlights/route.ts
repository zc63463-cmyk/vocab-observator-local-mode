import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";
import { sql } from "@/lib/db";

/**
 * GET /api/highlights?wordIds=a,b,c
 *
 * Batch-fetch highlights for multiple words in the active wordbook.
 * Returns a flat list; the caller groups by word_id client-side.
 */
export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const { searchParams } = new URL(request.url);
  const wordIdsParam = searchParams.get("wordIds");
  const wordbookId = await resolveWordbookId(supabase, userId, null);

  if (!wordIdsParam || wordIdsParam.trim().length === 0) {
    return NextResponse.json({ highlights: [] });
  }

  const wordIds = wordIdsParam.split(",").filter(Boolean);
  if (wordIds.length === 0) {
    return NextResponse.json({ highlights: [] });
  }

  // Guard against SQL injection on the word-id list by only keeping UUID-shaped strings.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeIds = wordIds.filter((id) => uuidRe.test(id));
  if (safeIds.length === 0) {
    return NextResponse.json({ highlights: [] });
  }

  const { data, error } = await sql<{
    id: string;
    word_id: string;
    source_field: string;
    text_snippet: string;
    color: string;
    created_at: string;
  }>`
    SELECT
      id,
      word_id,
      source_field,
      text_snippet,
      color,
      created_at
    FROM word_highlights
    WHERE user_id = ${userId}
      AND wordbook_id = ${wordbookId}
      AND word_id = ANY(${safeIds}::uuid[])
    ORDER BY created_at ASC
  `;

  if (error) {
    return apiErrorResponse(error, "api/highlights");
  }

  return NextResponse.json({ highlights: data ?? [] });
}

/**
 * POST /api/highlights
 *
 * Body: { word_id, source_field?, text_snippet, color? }
 * Creates a new highlight.  Duplicates (same user+wordbook+word+field+snippet)
 * are silently ignored thanks to the unique index.
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
  const sourceField = typeof body.source_field === "string" ? body.source_field : "definition_md";
  const textSnippet = typeof body.text_snippet === "string" ? body.text_snippet : "";
  const color = typeof body.color === "string" ? body.color : "#eab308";

  if (!wordId || !textSnippet) {
    return NextResponse.json({ error: "word_id and text_snippet are required" }, { status: 400 });
  }

  const { data, error } = await sql<{
    id: string;
    word_id: string;
    source_field: string;
    text_snippet: string;
    color: string;
    created_at: string;
  }>`
    INSERT INTO word_highlights (user_id, word_id, wordbook_id, source_field, text_snippet, color)
    VALUES (${userId}, ${wordId}, ${wordbookId}, ${sourceField}, ${textSnippet}, ${color})
    ON CONFLICT (user_id, wordbook_id, word_id, source_field, text_snippet)
    DO UPDATE SET color = EXCLUDED.color
    RETURNING id, word_id, source_field, text_snippet, color, created_at
  `;

  if (error) {
    return apiErrorResponse(error, "api/highlights");
  }

  return NextResponse.json({ highlight: data?.[0] ?? null });
}
