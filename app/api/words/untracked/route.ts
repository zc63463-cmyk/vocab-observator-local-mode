import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { sql } from "@/lib/db";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";

/**
 * GET /api/words/untracked
 *
 * Returns ALL published words that the current owner has NOT yet
 * added to their review queue for the active wordbook.
 */
export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const ownerId = ownerSession.user.id;
  const wordbookId = await resolveWordbookId(
    ownerSession.supabase!,
    ownerId,
    request.nextUrl.searchParams.get("wordbookId"),
  );

  const { data, error } = await sql<{
    id: string;
    slug: string;
    title: string;
    lemma: string;
    ipa: string | null;
    short_definition: string | null;
    metadata: unknown;
  }>`
    SELECT w.id, w.slug, w.title, w.lemma, w.ipa, w.short_definition, w.metadata
    FROM words w
    WHERE w.is_published = true
      AND w.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM user_word_progress p
        WHERE p.word_id = w.id AND p.user_id = ${ownerId} AND p.wordbook_id = ${wordbookId}
      )
    ORDER BY w.lemma ASC
  `;

  if (error) {
    return apiErrorResponse(error, "api/words/untracked");
  }

  return NextResponse.json({ items: data ?? [] });
}
