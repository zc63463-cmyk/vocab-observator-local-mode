import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import {
  buildReviewQueueBatch,
  REVIEW_QUEUE_CANDIDATE_LIMIT,
} from "@/lib/review/queue";
import { getOrCreateReviewSession } from "@/lib/review/session";
import { getWordbookFsrsWeights } from "@/lib/review/settings";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { resolveWordbookId } from "@/lib/wordbook";
import type { ReviewQueueItem, StoredSchedulerCard } from "@/lib/review/types";
import { extractPreviewExamples } from "@/lib/review/examples";

export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const wordbookId = await resolveWordbookId(
    supabase,
    userId,
    request.nextUrl.searchParams.get("wordbookId"),
  );
  const { session, error: sessionError } = await getOrCreateReviewSession(supabase, userId, wordbookId);
  if (sessionError || !session) {
    return apiErrorResponse(sessionError ?? { message: "Failed to create session" }, "api/review/queue");
  }
  // Personalised weights influence retrievability ranking inside the queue
  // builder. Fetched in parallel with the candidate query to avoid an extra
  // round-trip latency. A null result keeps ts-fsrs defaults active.
  const [queueResult, fsrsWeights] = await Promise.all([
    supabase
      .from("user_word_progress")
      .select(
        "id, word_id, state, review_count, due_at, desired_retention, scheduler_payload, content_hash_snapshot, words!inner(slug, title, lemma, lang_code, ipa, short_definition, definition_md, metadata, examples)",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .eq("wordbook_id", wordbookId)
      .neq("state", "suspended")
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(REVIEW_QUEUE_CANDIDATE_LIMIT),
    getWordbookFsrsWeights(supabase, wordbookId),
  ]);
  const { count, data, error } = queueResult;

  if (error) {
    return apiErrorResponse(error, "api/review/queue");
  }

  const rawRows = (data ?? []) as unknown as Array<{
    content_hash_snapshot: string | null;
    desired_retention: number | null;
    due_at: string | null;
    id: string;
    review_count: number;
    scheduler_payload: StoredSchedulerCard | null;
    state: string;
    word_id: string;
    words: {
      definition_md: string;
      examples: unknown;
      ipa: string | null;
      lang_code: string;
      lemma: string;
      metadata: unknown;
      short_definition: string | null;
      slug: string;
      title: string;
    };
  }>;

  // Filter out orphaned progress rows whose linked word has been soft-deleted.
  const validRows = rawRows.filter((row) => row.words != null);

  const batch = buildReviewQueueBatch(
    validRows,
    new Date(),
    undefined,
    fsrsWeights?.weights ?? null,
  );
  const dueToday = count ?? rawRows.length;
  const newCards = rawRows.filter((row) => row.state === "new").length;

  const items = batch.items.map(({ item: row, priority }): ReviewQueueItem => ({
    content_hash_snapshot: row.content_hash_snapshot,
    definition_md: row.words.definition_md,
    due_at: row.due_at,
    ipa: row.words.ipa,
    is_new: row.state === "new",
    lemma: row.words.lemma,
    metadata: row.words.metadata as ReviewQueueItem["metadata"],
    progress_id: row.id,
    queue_bucket: priority.bucket,
    queue_label: priority.label,
    queue_reason: priority.reason,
    retrievability: priority.retrievability,
    review_count: row.review_count,
    short_definition: row.words.short_definition,
    lang_code: row.words.lang_code ?? "en",
    previewExamples: extractPreviewExamples(row.words.examples),
    slug: row.words.slug,
    state: row.state,
    title: row.words.title,
    word_id: row.word_id,
  }));

  return NextResponse.json({
    items,
    session,
    stats: {
      completed: session.cards_seen,
      deferredNewCards: batch.deferredNewCards,
      dueToday,
      newCards,
      remaining: dueToday,
    },
  });
}
