import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { buildInitialSchedulerPayload } from "@/lib/review/fsrs-adapter";
import {
  buildBatchReviewInsertPlan,
  uniqueWordIds,
  type BatchReviewWord,
} from "@/lib/review/batch-add";
import { getUserDesiredRetention } from "@/lib/review/settings";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getWordbookWordIds } from "@/lib/wordbook";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) return ownerSession.response;

  const { id: wordbookId } = await params;
  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;

  try {
    const wordIds = await getWordbookWordIds(supabase, wordbookId);
    const requestedWordIds = uniqueWordIds(wordIds);

    if (requestedWordIds.length === 0) {
      return NextResponse.json({
        addedCount: 0,
        alreadyTrackedCount: 0,
        notFound: [],
        ok: true,
      });
    }

    const { data: words, error: wordsError } = await supabase
      .from("words")
      .select("id, content_hash")
      .in("id", requestedWordIds)
      .eq("is_deleted", false);

    if (wordsError) throw wordsError;

    const foundWordIds = (words ?? []).map((word) => word.id);
    const existingWordIds = new Set<string>();
    if (foundWordIds.length > 0) {
      const { data: existingProgress, error: existingProgressError } = await supabase
        .from("user_word_progress")
        .select("word_id")
        .eq("user_id", userId)
        .eq("wordbook_id", wordbookId)
        .in("word_id", foundWordIds);

      if (existingProgressError) throw existingProgressError;
      for (const progress of existingProgress ?? []) {
        existingWordIds.add(progress.word_id);
      }
    }

    const nowIso = new Date().toISOString();
    const desiredRetention = await getUserDesiredRetention(supabase, userId);
    const initialPayload = buildInitialSchedulerPayload(new Date(nowIso));
    const plan = buildBatchReviewInsertPlan({
      desiredRetention,
      existingWordIds,
      initialPayload,
      nowIso,
      requestedWordIds,
      userId,
      wordbookId,
      words: (words ?? []) as BatchReviewWord[],
    });

    if (plan.rows.length === 0) {
      return NextResponse.json({
        addedCount: 0,
        alreadyTrackedCount: plan.alreadyTrackedCount,
        notFound: plan.notFound,
        ok: true,
      });
    }

    const { data, error } = await supabase
      .from("user_word_progress")
      .upsert(plan.rows, {
        ignoreDuplicates: true,
        onConflict: "user_id,wordbook_id,word_id",
      })
      .select("id, word_id");

    if (error) {
      return apiErrorResponse(error, "api/wordbooks/[id]/join");
    }

    const addedCount = data?.length ?? 0;
    const ignoredAsAlreadyTracked = Math.max(0, plan.rows.length - addedCount);

    return NextResponse.json({
      addedCount,
      alreadyTrackedCount: plan.alreadyTrackedCount + ignoredAsAlreadyTracked,
      notFound: plan.notFound,
      ok: true,
    });
  } catch (error) {
    return apiErrorResponse(
      { message: (error as Error).message },
      "api/wordbooks/[id]/join",
    );
  }
}
