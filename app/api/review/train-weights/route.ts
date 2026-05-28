import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { z } from "zod";
import {
  MIN_REVIEWS_FOR_TRAINING,
  buildOptimizerItems,
  buildTrainingDiagnostics,
  evaluateFsrsWeights,
  simulateFsrsScenarios,
  trainFsrsWeights,
  type OptimizerLog,
} from "@/lib/review/fsrs-optimizer";
import {
  updateUserFsrsWeightsSetting,
  validateFsrsWeightsArray,
  type FsrsWeightsSetting,
  FSRS_WEIGHTS_SETTING_VERSION,
} from "@/lib/review/settings";
import {
  getFsrsTrainingStatus,
  type FsrsTrainingStatus,
} from "@/lib/review/training-status";
import { requireOwnerApiSession } from "@/lib/request-auth";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@/lib/db";

/**
 * Training is heavier than other review endpoints —the WASI optimizer in
 * @open-spaced-repetition/binding can take several seconds for a few thousand
 * reviews. Force the Node runtime (Edge can't load native modules) and bump
 * the per-invocation timeout enough that realistic histories finish in time.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

/** Hard cap on rows pulled to keep training memory bounded. */
const MAX_LOGS_TO_FETCH = 50_000;
const PAGE_SIZE = 1_000;

const trainBodySchema = z
  .object({
    /** Forwarded to the optimizer; defaults to ts-fsrs's preferred behaviour. */
    enableShortTerm: z.boolean().optional(),
  })
  .strict()
  .optional();

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Pages through `review_logs` for the given user, returning rows in the
 * exact shape the optimizer expects. Skips undone logs since those have
 * been reverted by the undo flow and do not represent real recall events.
 *
 * When a user exceeds `MAX_LOGS_TO_FETCH`, we keep the **most recent**
 * reviews rather than the earliest. Descending iteration combined with
 * a global cap ensures recent behaviour dominates training —reversing
 * the old behaviour which would have trained on stale review patterns.
 * Per-card chronological order is restored inside `buildOptimizerItems`
 * (it sorts each card's reviews by timestamp before computing delta_t).
 */
async function fetchOptimizerLogs(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<{ data: OptimizerLog[]; error: unknown }> {
  const out: OptimizerLog[] = [];
  let offset = 0;

  while (out.length < MAX_LOGS_TO_FETCH) {
    const { data, error } = await supabase
      .from("review_logs")
      .select("progress_id, rating, reviewed_at")
      .eq("user_id", userId)
      .eq("undone", false)
      .order("reviewed_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { data: [], error };
    }

    if (!data || data.length === 0) {
      break;
    }

    out.push(
      ...data.map((row) => ({
        progress_id: row.progress_id,
        rating: row.rating,
        reviewed_at: row.reviewed_at,
      })),
    );

    if (data.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { data: out, error: null };
}

export async function GET() {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const status = await getFsrsTrainingStatus(
    ownerSession.supabase!,
    ownerSession.user!.id,
  );
  return NextResponse.json(status satisfies FsrsTrainingStatus);
}

/* ── NDJSON streaming POST ─────────────────────────────────────────── */

interface StreamMessage {
  type: "progress" | "result" | "error";
  current?: number;
  total?: number;
  status?: FsrsTrainingStatus;
  message?: string;
}

export async function POST(request: NextRequest) {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;

  // Body is optional —POST with no body is the common "train with defaults" path.
  let bodyOptions: z.infer<typeof trainBodySchema> = undefined;
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      const parsed = trainBodySchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 },
        );
      }
      bodyOptions = parsed.data;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { data: logs, error: logsError } = await fetchOptimizerLogs(supabase, userId);
  if (logsError) {
    return apiErrorResponse(logsError, "api/review/train-weights");
  }
  if (logs.length < MIN_REVIEWS_FOR_TRAINING) {
    return NextResponse.json(
      {
        error: "Not enough review history to train.",
        eligibility: {
          canTrain: false,
          minRequired: MIN_REVIEWS_FOR_TRAINING,
          totalReviews: logs.length,
        },
      },
      { status: 422 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: StreamMessage) {
        controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));
      }

      try {
        // 1. Train with progress callbacks
        const trained = await trainFsrsWeights(logs, {
          enableShortTerm: bodyOptions?.enableShortTerm ?? true,
          progress: (current, total) => {
            send({ type: "progress", current, total });
          },
        });

        // 2. Validate weights
        const validatedWeights = validateFsrsWeightsArray(trained.weights);
        if (!validatedWeights) {
          send({
            type: "error",
            message:
              "Optimizer returned an unusable weights vector (wrong length or non-finite values). Training not persisted.",
          });
          controller.close();
          return;
        }

        // 3. Build items for eval + diagnostics
        const items = buildOptimizerItems(logs);

        // 4. Evaluate personalised vs default
        let evaluation: FsrsWeightsSetting["evaluation"] = null;
        try {
          const [personalized, baseline] = await Promise.all([
            evaluateFsrsWeights(items, validatedWeights),
            evaluateFsrsWeights(items, null),
          ]);
          evaluation = {
            logLoss: personalized.logLoss,
            rmseBins: personalized.rmseBins,
            baselineLogLoss: baseline.logLoss,
            baselineRmseBins: baseline.rmseBins,
          };
        } catch {
          // best-effort
        }

        // 5. Simulate + diagnostics
        let diagnostics: FsrsWeightsSetting["diagnostics"] = null;
        try {
          const simulations = await simulateFsrsScenarios(validatedWeights);
          diagnostics = {
            ...buildTrainingDiagnostics(logs, items),
            simulations,
          };
        } catch {
          // best-effort
        }

        // 6. Persist
        const nowIso = new Date().toISOString();
        const payload: FsrsWeightsSetting = {
          sampleSize: trained.sampleSize,
          trainedAt: nowIso,
          version: FSRS_WEIGHTS_SETTING_VERSION,
          weights: validatedWeights,
          evaluation,
          diagnostics,
        };
        await updateUserFsrsWeightsSetting(supabase, userId, payload, nowIso);

        // 7. Return final status
        const status = await getFsrsTrainingStatus(supabase, userId);
        send({ type: "result", status });
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Training failed";
        send({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}

export async function DELETE() {
  const ownerSession = await requireOwnerApiSession();
  if (ownerSession.response) {
    return ownerSession.response;
  }

  const supabase = ownerSession.supabase!;
  const userId = ownerSession.user!.id;
  const nowIso = new Date().toISOString();

  await updateUserFsrsWeightsSetting(supabase, userId, null, nowIso);
  const status = await getFsrsTrainingStatus(supabase, userId);
  return NextResponse.json(status satisfies FsrsTrainingStatus);
}
