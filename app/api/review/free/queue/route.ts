import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireOwnerApiSession } from "@/lib/request-auth";
import type { ReviewQueueItem } from "@/lib/review/types";
import { extractPreviewExamples } from "@/lib/review/examples";

export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const { searchParams } = new URL(request.url);
  const wordIdsParam = searchParams.get("wordIds");

  if (!wordIdsParam || wordIdsParam.trim().length === 0) {
    return NextResponse.json({
      items: [],
      session: null,
      stats: null,
    });
  }

  const wordIds = wordIdsParam.split(",").filter(Boolean);
  if (wordIds.length === 0) {
    return NextResponse.json({
      items: [],
      session: null,
      stats: null,
    });
  }

  const supabase = ownerSession.supabase!;

  const { data, error } = await supabase
    .from("words")
    .select(
      "id, slug, title, lemma, lang_code, ipa, short_definition, definition_md, metadata, examples",
    )
    .in("id", wordIds)
    .eq("is_published", true)
    .eq("is_deleted", false);

  if (error) {
    return apiErrorResponse(error, "api/review/free/queue");
  }

  const items = (data ?? []).map(
    (word): ReviewQueueItem => ({
      content_hash_snapshot: null,
      definition_md: word.definition_md,
      due_at: null,
      ipa: word.ipa,
      is_new: true,
      lemma: word.lemma,
      metadata: word.metadata as ReviewQueueItem["metadata"],
      progress_id: word.id,
      queue_bucket: "new",
      queue_label: "自由复习",
      queue_reason: "自由禅意复习模式",
      retrievability: null,
      review_count: 0,
      short_definition: word.short_definition,
      lang_code: word.lang_code ?? "en",
      previewExamples: extractPreviewExamples(word.examples),
      slug: word.slug,
      state: "new",
      title: word.title,
      word_id: word.id,
    }),
  );

  // Preserve the order the user selected the words in
  const orderMap = new Map(wordIds.map((id, i) => [id, i]));
  items.sort((a, b) => {
    const ai = orderMap.get(a.word_id) ?? 0;
    const bi = orderMap.get(b.word_id) ?? 0;
    return ai - bi;
  });

  const syntheticSession = {
    id: "free-session",
    started_at: new Date().toISOString(),
    cards_seen: 0,
  };

  const syntheticStats = {
    completed: 0,
    deferredNewCards: 0,
    dueToday: items.length,
    newCards: items.length,
    remaining: items.length,
  };

  return NextResponse.json({
    items,
    session: syntheticSession,
    stats: syntheticStats,
  });
}
