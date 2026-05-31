import { NextResponse, type NextRequest } from "next/server";
import { retuneScheduledReviewCard } from "@/lib/review/fsrs-adapter";
import {
  getWordbookDesiredRetention,
  getWordbookFsrsWeights,
  updateWordbookDesiredRetentionSetting,
} from "@/lib/review/settings";
import type { StoredSchedulerCard } from "@/lib/review/types";
import { requireOwnerApiSession } from "@/lib/request-auth";
import { getOrCreateDefaultWordbook } from "@/lib/wordbook";
import { reviewSettingsSchema } from "@/lib/validation/schemas";
import { asJson } from "@/types/database.types";

export async function GET(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const { searchParams } = new URL(request.url);
  const wordbookId = searchParams.get("wordbookId")
    ?? await getOrCreateDefaultWordbook(ownerSession.supabase!, ownerSession.user!.id);

  const desiredRetention = await getWordbookDesiredRetention(
    ownerSession.supabase!,
    wordbookId,
  );

  return NextResponse.json({
    desiredRetention,
  });
}

export async function POST(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const parsed = reviewSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const wordbookId = parsed.data.wordbookId
    ?? await getOrCreateDefaultWordbook(supabase, userId);
  const now = new Date();
  const nowIso = now.toISOString();
  const desiredRetention = await updateWordbookDesiredRetentionSetting(
    supabase,
    wordbookId,
    parsed.data.desiredRetention,
    nowIso,
  );

  const { error: progressError } = await supabase
    .from("user_word_progress")
    .update({
      desired_retention: desiredRetention,
      updated_at: nowIso,
    })
    .eq("user_id", userId)
    .eq("wordbook_id", wordbookId);

  if (progressError) {
    throw progressError;
  }

  let retunedCount = 0;
  if (parsed.data.retuneExisting) {
    // Personalised weights are baked into every retune call so the new
    // intervals reflect both the new desired retention AND the user's fitted w.
    const fsrsWeights = await getWordbookFsrsWeights(supabase, wordbookId);
    const { data: progressRows, error: progressRowsError } = await supabase
      .from("user_word_progress")
      .select("id, scheduler_payload")
      .eq("user_id", userId)
      .eq("wordbook_id", wordbookId)
      .neq("state", "suspended");

    if (progressRowsError) {
      throw progressRowsError;
    }

    for (const row of progressRows ?? []) {
      const retuned = retuneScheduledReviewCard(
        row.scheduler_payload as StoredSchedulerCard | null,
        desiredRetention,
        now,
        fsrsWeights?.weights ?? null,
      );

      if (!retuned) {
        continue;
      }

      const { error: retuneError } = await supabase
        .from("user_word_progress")
        .update({
          desired_retention: desiredRetention,
          due_at: retuned.dueAt,
          interval_days: retuned.scheduledDays,
          retrievability: retuned.retrievability,
          scheduler_payload: asJson(retuned.nextPayload),
          updated_at: nowIso,
        })
        .eq("id", row.id)
        .eq("user_id", userId)
        .eq("wordbook_id", wordbookId);

      if (retuneError) {
        throw retuneError;
      }

      retunedCount += 1;
    }
  }

  return NextResponse.json({
    desiredRetention,
    ok: true,
    retunedCount,
  });
}
