import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { sql } from "@/lib/db";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";

interface ZenCandidate {
  id: string;
  slug: string;
  title: string;
  lemma: string;
  ipa: string | null;
  short_definition: string | null;
  metadata: unknown;
  prefixes: string[];
  suffixes: string[];
}

function extractMorphParts(metadata: unknown, kind: "prefix" | "suffix"): string[] {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return [];
  }
  const record = metadata as Record<string, unknown>;
  const morphology = record.morphology;
  if (
    !morphology ||
    typeof morphology !== "object" ||
    Array.isArray(morphology)
  ) {
    return [];
  }
  const parts = (morphology as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return [];

  const out: string[] = [];
  for (const part of parts) {
    if (
      part &&
      typeof part === "object" &&
      !Array.isArray(part) &&
      (part as Record<string, unknown>).kind === kind &&
      typeof (part as Record<string, unknown>).text === "string"
    ) {
      const text = ((part as Record<string, unknown>).text as string).trim();
      if (text) out.push(text);
    }
  }
  return out;
}

/**
 * GET /api/review/zen-candidates
 *
 * Returns all words currently in the user's review queue (user_word_progress)
 * for the active wordbook, with morphological prefix/suffix data extracted
 * from words.metadata so the Free Zen picker can search by affix.
 */
export async function GET() {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const wordbookId = await resolveWordbookId(supabase, userId, null);

  const { data, error } = await sql<{
    word_id: string;
    slug: string;
    title: string;
    lemma: string;
    ipa: string | null;
    short_definition: string | null;
    metadata: unknown;
  }>`
    SELECT
      p.word_id,
      w.slug,
      w.title,
      w.lemma,
      w.ipa,
      w.short_definition,
      w.metadata
    FROM user_word_progress p
    JOIN words w ON w.id = p.word_id
    WHERE p.user_id = ${userId}
      AND p.wordbook_id = ${wordbookId}
      AND w.is_published = true
      AND w.is_deleted = false
    ORDER BY w.lemma ASC
  `;

  if (error) {
    return apiErrorResponse(error, "api/review/zen-candidates");
  }

  const items: ZenCandidate[] = (data ?? []).map((row) => ({
    id: row.word_id,
    slug: row.slug,
    title: row.title,
    lemma: row.lemma,
    ipa: row.ipa,
    short_definition: row.short_definition,
    metadata: row.metadata,
    prefixes: extractMorphParts(row.metadata, "prefix"),
    suffixes: extractMorphParts(row.metadata, "suffix"),
  }));

  return NextResponse.json({ items });
}
