import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { sql } from "@/lib/db";
import { requireOwnerApiSession } from "@/lib/request-auth";

/**
 * GET /api/words/untracked
 *
 * Returns up to 2000 published words that the current owner has NOT yet
 * added to their review queue. Used by the "Search & Add" panel on the
 * words page so users can search across the lexicon rather than the
 * paginated subset already loaded on the page.
 *
 * A hard LIMIT prevents memory/JSON pressure on large lexicons (> 5 k
 * rows). The caller can surface a "load more" UI when `hasMore` is true.
 *
 * Performance: the NOT EXISTS clause uses the indexed (user_id, word_id)
 * composite on user_word_progress; for a few-thousand-row words table
 * this is typically < 20 ms on a warm connection.
 */
export async function GET() {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const ownerId = ownerSession.user.id;

  const limit = 2000;
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
        WHERE p.word_id = w.id AND p.user_id = ${ownerId}
      )
    ORDER BY w.lemma ASC
    LIMIT ${limit + 1}
  `;

  if (error) {
    return apiErrorResponse(error, "api/words/untracked");
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({ items, hasMore });
}
