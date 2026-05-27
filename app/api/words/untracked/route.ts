import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireOwnerApiSession } from "@/lib/request-auth";

/**
 * GET /api/words/untracked
 *
 * Returns every published word that the current owner has NOT yet added
 * to their review queue. Used by the "Search & Add" panel on the words
 * page so users can search across the *entire* lexicon rather than the
 * paginated subset already loaded on the page.
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
  `;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
