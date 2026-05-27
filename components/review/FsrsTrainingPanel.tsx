"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CheckCircle, RefreshCw, RotateCcw, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import type { FsrsTrainingStatus } from "@/lib/review/training-status";

interface FsrsTrainingPanelProps {
  initialStatus: FsrsTrainingStatus;
}

/* ── ts-fsrs FSRS-6 default weights (21 parameters) ───────────────── */
const DEFAULT_WEIGHTS: number[] = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
  0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
  0.0912, 0.0658, 0.1542,
];

/* ── Parameter metadata: Chinese labels + functional groups ───────── */
const PARAM_META: Record<
  number,
  { label: string; group: string; hint: string }
> = {
  0: { label: "初始稳定性 (Again)", group: "初始稳定性", hint: "首次 Again 后记忆稳定天数" },
  1: { label: "初始稳定性 (Good)", group: "初始稳定性", hint: "首次 Good 后记忆稳定天数" },
  2: { label: "难度基准", group: "难度与增益", hint: "卡片难度的起始基准" },
  3: { label: "难度增长", group: "难度与增益", hint: "难度随复习的增长系数" },
  4: { label: "低难度增益", group: "难度与增益", hint: "低难度卡片答对后的稳定性增长" },
  5: { label: "高难度增益", group: "难度与增益", hint: "高难度卡片答对后的稳定性增长" },
  6: { label: "遗忘衰减", group: "遗忘与惩罚", hint: "答错后稳定性下降幅度" },
  7: { label: "衰减调节", group: "遗忘与惩罚", hint: "遗忘衰减的精细调节" },
  8: { label: "难度幂次", group: "耦合与调节", hint: "难度对稳定性增长的影响强度" },
  9: { label: "难度回归", group: "耦合与调节", hint: "难度向均值回归的强度" },
  10: { label: "回归偏移", group: "耦合与调节", hint: "难度回归的偏移量" },
  11: { label: "短期衰减", group: "耦合与调节", hint: "日内多次复习的记忆衰减率" },
  12: { label: "短期增益", group: "耦合与调节", hint: "日内多次复习的稳定性增益" },
  13: { label: "再学惩罚", group: "遗忘与惩罚", hint: "再次 Again 后的额外惩罚" },
  14: { label: "再学调节", group: "遗忘与惩罚", hint: "再学习过程中的间隔调节" },
  15: { label: "长期上限", group: "长期记忆", hint: "记忆稳定性的长期上限" },
  16: { label: "长期增长", group: "长期记忆", hint: "长期稳定性增长速率" },
  17: { label: "长期衰减", group: "长期记忆", hint: "长期记忆衰减因子" },
  18: { label: "长期恢复", group: "长期记忆", hint: "长期记忆恢复因子" },
  19: { label: "扩展衰减", group: "长期记忆", hint: "FSRS-6 扩展衰减参数" },
  20: { label: "扩展增益", group: "长期记忆", hint: "FSRS-6 扩展增益参数" },
};

const GROUP_ORDER = [
  "初始稳定性",
  "难度与增益",
  "遗忘与惩罚",
  "耦合与调节",
  "长期记忆",
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

/**
 * Owner-only control for personalised FSRS w-parameters.
 *
 * Upgraded design:
 *   - Full Chinese localisation
 *   - Eligibility progress as a stylised bar with threshold markers
 *   - Weight inspector: top-changed params spotlight + grouped full inspector
 *   - Visual comparison against ts-fsrs defaults
 */
export function FsrsTrainingPanel({ initialStatus }: FsrsTrainingPanelProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [status, setStatus] = useState<FsrsTrainingStatus>(initialStatus);
  const [pending, setPending] = useState<"train" | "reset" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAllWeights, setShowAllWeights] = useState(false);
  const [trainProgress, setTrainProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const { eligibility, weights } = status;
  const isTraining = pending === "train";
  const isResetting = pending === "reset";

  function applyStatusFromResponse(payload: unknown): FsrsTrainingStatus | null {
    if (!payload || typeof payload !== "object") return null;
    const candidate = payload as Partial<FsrsTrainingStatus> & {
      eligibility?: Partial<FsrsTrainingStatus["eligibility"]>;
    };
    if (!candidate.eligibility) return null;
    const elig = candidate.eligibility;
    if (
      typeof elig.canTrain !== "boolean" ||
      typeof elig.minRequired !== "number" ||
      typeof elig.totalReviews !== "number"
    ) {
      return null;
    }
    return {
      eligibility: {
        canTrain: elig.canTrain,
        minRequired: elig.minRequired,
        totalReviews: elig.totalReviews,
      },
      weights: candidate.weights ?? null,
    };
  }

  function handleTrain() {
    if (pending) return;
    if (!eligibility.canTrain) return;

    setPending("train");
    setTrainProgress(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/review/train-weights", {
          method: "POST",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as unknown;
          const message =
            (payload as { error?: string } | null)?.error ?? "训练失败。";
          throw new Error(message);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Read NDJSON stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const data = JSON.parse(line) as {
              type: "progress" | "result" | "error";
              current?: number;
              total?: number;
              status?: unknown;
              message?: string;
            };

            if (data.type === "progress" && data.total) {
              setTrainProgress({
                current: data.current ?? 0,
                total: data.total,
              });
            } else if (data.type === "result") {
              const next = applyStatusFromResponse(data.status);
              if (next) setStatus(next);
              addToast(
                next?.weights
                  ? `已基于 ${formatNumber(next.weights.sampleSize)} 条日志完成训练。`
                  : "训练完成。",
                "success",
              );
              router.refresh();
            } else if (data.type === "error") {
              throw new Error(data.message ?? "训练失败。");
            }
          }
        }
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : "训练失败。",
          "error",
        );
      } finally {
        setPending(null);
        setTrainProgress(null);
      }
    });
  }

  function handleReset() {
    if (pending) return;

    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }

    setPending("reset");
    setConfirmReset(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/review/train-weights", {
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          const message =
            (payload as { error?: string } | null)?.error ??
            "恢复默认权重失败。";
          throw new Error(message);
        }
        const next = applyStatusFromResponse(payload);
        if (next) setStatus(next);
        addToast("已恢复 ts-fsrs 默认权重。", "success");
        router.refresh();
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : "恢复默认权重失败。",
          "error",
        );
      } finally {
        setPending(null);
      }
    });
  }

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round((eligibility.totalReviews / eligibility.minRequired) * 100),
    ),
  );

  /* ── Weight comparison data ──────────────────────────────────────── */
  const topChanges = useMemo(() => {
    if (!weights) return [];
    const diffs = weights.weights.map((trained, i) => {
      const def = DEFAULT_WEIGHTS[i] ?? 0;
      const diff = trained - def;
      return {
        index: i,
        trained,
        default: def,
        diff,
        absDiff: Math.abs(diff),
        pct: def !== 0 ? (diff / def) * 100 : 0,
        meta: PARAM_META[i],
      };
    });
    diffs.sort((a, b) => b.absDiff - a.absDiff);
    return diffs.slice(0, 6);
  }, [weights]);

  const groupedWeights = useMemo(() => {
    if (!weights) return [];
    const map = new Map<string, typeof topChanges>();
    for (let i = 0; i < weights.weights.length; i++) {
      const trained = weights.weights[i];
      const def = DEFAULT_WEIGHTS[i] ?? 0;
      const meta = PARAM_META[i];
      const group = meta?.group ?? "其他";
      const entry = {
        index: i,
        trained,
        default: def,
        diff: trained - def,
        absDiff: Math.abs(trained - def),
        pct: def !== 0 ? ((trained - def) / def) * 100 : 0,
        meta,
      };
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(entry);
    }
    return GROUP_ORDER.map((g) => ({ group: g, items: map.get(g) ?? [] })).filter(
      (x) => x.items.length > 0,
    );
  }, [weights]);

  return (
    <div className="space-y-5">
      {/* ═════ Header + Controls ═══════════════════════════════════════ */}
      <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                个性化 FSRS 权重
              </p>
              {weights ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                  <CheckCircle size={10} />
                  已训练
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-soft)]">
                  默认参数
                </span>
              )}
            </div>
            {weights ? (
              <p className="text-sm text-[var(--color-ink-soft)]">
                基于 {formatNumber(weights.sampleSize)} 条复习日志训练，
                {formatDateTime(weights.trainedAt)}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-ink-soft)]">
                当前使用 ts-fsrs 默认参数。达到{" "}
                {formatNumber(eligibility.minRequired)} 条日志后即可训练个性化遗忘曲线。
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!eligibility.canTrain || pending !== null}
              onClick={handleTrain}
              icon={isTraining ? undefined : <RefreshCw size={14} />}
            >
              {isTraining
                ? "训练中…"
                : weights
                  ? "重新训练"
                  : "开始训练"}
            </Button>
            {weights ? (
              <Button
                type="button"
                variant={confirmReset ? "danger" : "ghost"}
                size="sm"
                disabled={pending !== null}
                onClick={handleReset}
                onBlur={() => setConfirmReset(false)}
                icon={<RotateCcw size={14} />}
              >
                {isResetting
                  ? "恢复中…"
                  : confirmReset
                    ? "再次点击确认"
                    : "恢复默认"}
              </Button>
            ) : null}
          </div>
        </div>

        {/* ═════ Eligibility Progress ══════════════════════════════════ */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
            <span>训练资格</span>
            <span>
              {formatNumber(eligibility.totalReviews)} /{" "}
              {formatNumber(eligibility.minRequired)}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                background:
                  progressPercent >= 100
                    ? "var(--color-accent)"
                    : progressPercent >= 60
                      ? "linear-gradient(90deg, var(--color-accent), #f59e0b)"
                      : "var(--color-ink-soft)",
                width: `${progressPercent}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)] opacity-70">
            {eligibility.canTrain
              ? "已满足最低训练门槛"
              : `还需 ${formatNumber(eligibility.minRequired - eligibility.totalReviews)} 条日志即可开始训练`}
          </p>
        </div>

        {/* ═════ Training Progress (live stream) ═══════════════════════ */}
        {isTraining && trainProgress && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">
                优化器迭代中…
              </span>
              <span className="tabular-nums text-[var(--color-ink-soft)]">
                {trainProgress.current.toLocaleString()} /{" "}
                {trainProgress.total.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                style={{
                  width: `${Math.min(100, (trainProgress.current / trainProgress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--color-ink-soft)] opacity-60">
              基于 WASM 优化器计算最佳遗忘曲线参数，大数据集可能需要数秒…
            </p>
          </div>
        )}
      </div>

      {/* ═════ Training Quality Score ════════════════════════════════ */}
      {weights?.evaluation && (
        <QualityScoreCard evaluation={weights.evaluation} />
      )}

      {/* ═════ Parameter Reliability ═════════════════════════════════ */}
      {weights?.diagnostics && (
        <ReliabilityCard diagnostics={weights.diagnostics} />
      )}

      {/* ═════ Top Changes Spotlight ═══════════════════════════════════ */}
      {weights && topChanges.length > 0 && (
        <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-[var(--color-ink-soft)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
              参数变化 Top {topChanges.length}
            </p>
            <span className="text-[10px] text-[var(--color-ink-soft)] opacity-60">
              与 ts-fsrs 默认值对比
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {topChanges.map((c) => (
              <WeightDiffRow
                key={c.index}
                data={c}
                warning={getParamWarning(c.index, getReliabilityRules(weights?.diagnostics))}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═════ Simulation Comparison ═════════════════════════════════ */}
      {weights?.diagnostics && weights.diagnostics.simulations.length > 0 && (
        <SimulationCard simulations={weights.diagnostics.simulations} />
      )}

      {/* ═════ Training Data Profile ═════════════════════════════════ */}
      {weights?.diagnostics && (
        <DiagnosticsCard diagnostics={weights.diagnostics} />
      )}

      {/* ═════ Full Inspector ════════════════════════════════════════ */}
      {weights && (
        <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
          <button
            type="button"
            onClick={() => setShowAllWeights((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
              全部参数 ({weights.weights.length})
            </p>
            {showAllWeights ? (
              <ChevronUp size={14} className="text-[var(--color-ink-soft)]" />
            ) : (
              <ChevronDown size={14} className="text-[var(--color-ink-soft)]" />
            )}
          </button>

          {showAllWeights && (
            <div className="mt-3 space-y-4">
              {groupedWeights.map(({ group, items }) => (
                <div key={group}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)] opacity-70">
                    {group}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <WeightDiffRow
                        key={item.index}
                        data={item}
                        compact
                        warning={getParamWarning(item.index, getReliabilityRules(weights?.diagnostics))}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Parameter reliability rules ─────────────────────────────────── */

interface ReliabilityRule {
  paramIndices: number[];
  warning: string;
}

function getReliabilityRules(
  diagnostics: { ratingDistribution: Record<string, number>; timeSpanDays: number } | null | undefined,
): ReliabilityRule[] {
  if (!diagnostics) return [];
  const { ratingDistribution, timeSpanDays } = diagnostics;
  const rules: ReliabilityRule[] = [];

  const againCount = ratingDistribution.again ?? 0;
  const easyCount = ratingDistribution.easy ?? 0;
  const total = Object.values(ratingDistribution).reduce((a: number, b: number) => a + b, 0);

  if (againCount < 20) {
    rules.push({
      paramIndices: [6, 7, 13, 14],
      warning: `Again 样本仅 ${againCount} 个（< 20），遗忘与再学相关参数的估计可能不够稳定`,
    });
  }
  if (easyCount < 15) {
    rules.push({
      paramIndices: [4, 5],
      warning: `Easy 样本仅 ${easyCount} 个（< 15），高难度增益参数的估计可能受限`,
    });
  }
  if (timeSpanDays < 60) {
    rules.push({
      paramIndices: [15, 16, 17, 18, 19, 20],
      warning: `训练时间跨度仅 ${timeSpanDays} 天（< 60），长期记忆参数的估计可能不够可靠`,
    });
  }
  if (total < 500) {
    rules.push({
      paramIndices: [0, 1, 2, 3, 8, 9, 10, 11, 12],
      warning: `总样本仅 ${total} 条（< 500），整体参数估计的置信度偏低`,
    });
  }

  return rules;
}

function getParamWarning(
  paramIndex: number,
  rules: ReliabilityRule[],
): string | undefined {
  for (const rule of rules) {
    if (rule.paramIndices.includes(paramIndex)) {
      return rule.warning;
    }
  }
  return undefined;
}

/* ── Weight diff row ───────────────────────────────────────────────── */

function WeightDiffRow({
  data,
  compact = false,
  warning,
}: {
  data: {
    index: number;
    trained: number;
    default: number;
    diff: number;
    pct: number;
    meta?: { label: string; hint: string };
  };
  compact?: boolean;
  warning?: string;
}) {
  const { trained, default: def, diff, pct, meta } = data;
  const isUp = diff > 0;
  const isNeutral = Math.abs(diff) < 0.001;

  const diffColor = isNeutral
    ? "text-[var(--color-ink-soft)]"
    : isUp
      ? "text-amber-600 dark:text-amber-400"
      : "text-teal-600 dark:text-teal-400";

  const pctLabel = `${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`;

  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-medium text-[var(--color-ink)]">
              {meta?.label ?? `w${data.index}`}
            </p>
            {warning && (
              <span
                className="inline-flex shrink-0 items-center rounded bg-[var(--color-surface-muted-warm)] px-1 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400"
                title={warning}
              >
                ⚠️ 低可信
              </span>
            )}
          </div>
          {!compact && meta?.hint && (
            <p className="text-[10px] text-[var(--color-ink-soft)] opacity-60">
              {meta.hint}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span className="text-[var(--color-ink-soft)] opacity-50">
            {def.toFixed(3)}
          </span>
          <span className="text-[var(--color-ink-soft)] opacity-30">→</span>
          <span className="font-semibold text-[var(--color-ink)]">
            {trained.toFixed(3)}
          </span>
          <span className={`text-[11px] ${diffColor}`}>{pctLabel}</span>
        </div>
      </div>

      {/* Mini deviation bar */}
      {!compact && (
        <div className="mt-2">
          <DeviationBar defaultValue={def} trainedValue={trained} />
        </div>
      )}
    </div>
  );
}

/**
 * A small horizontal bar that visualises deviation from default.
 * Centre = default value. Bar extends left (teal, decrease) or right (amber, increase).
 */
function DeviationBar({
  defaultValue,
  trainedValue,
}: {
  defaultValue: number;
  trainedValue: number;
}) {
  const diff = trainedValue - defaultValue;
  const isNeutral = Math.abs(diff) < 0.001;
  if (isNeutral) {
    return (
      <div className="relative h-1 w-full rounded-full bg-[var(--color-border)]">
        <div
          className="absolute top-0 h-full w-1 rounded-full bg-[var(--color-ink-soft)]"
          style={{ left: "50%" }}
        />
      </div>
    );
  }

  // Normalise deviation to a 0-100% scale for the bar
  // Use log-ish scaling so small and large diffs are both visible
  const maxAbs = Math.max(Math.abs(diff), 0.5); // at least 0.5 for scale
  const rawPct = (diff / maxAbs) * 50; // -50 to +50
  const clamped = Math.max(-48, Math.min(48, rawPct));

  const leftPct = clamped < 0 ? 50 + clamped : 50;
  const widthPct = Math.abs(clamped);

  const color =
    diff > 0
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-teal-500 dark:bg-teal-400";

  return (
    <div className="relative h-1 w-full rounded-full bg-[var(--color-border)]">
      {/* Default marker */}
      <div
        className="absolute top-0 h-full w-0.5 rounded-full bg-[var(--color-ink-soft)] opacity-40"
        style={{ left: "50%" }}
      />
      {/* Deviation bar */}
      <div
        className={`absolute top-0 h-full rounded-full ${color} opacity-80`}
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      />
    </div>
  );
}

/* ── Quality Score Card ────────────────────────────────────────────── */

function QualityScoreCard({
  evaluation,
}: {
  evaluation: {
    logLoss: number;
    rmseBins: number;
    baselineLogLoss: number;
    baselineRmseBins: number;
  };
}) {
  const { rmseBins, baselineRmseBins } = evaluation;

  // Grade thresholds (RMSE-Bins, lower-is-better)
  const grade =
    rmseBins < 0.05
      ? { letter: "A", label: "优秀", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500" }
      : rmseBins < 0.08
        ? { letter: "B", label: "良好", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500" }
        : rmseBins < 0.12
          ? { letter: "C", label: "一般", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" }
          : { letter: "D", label: "需改善", color: "text-red-600 dark:text-red-400", bg: "bg-red-500" };

  const improvement =
    baselineRmseBins > 0
      ? ((baselineRmseBins - rmseBins) / baselineRmseBins) * 100
      : 0;
  const isBetter = improvement > 0;

  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            训练质量评分
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)] opacity-60">
            基于训练数据集的交叉验证评估
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${grade.color} bg-[var(--color-panel)]`}
          >
            {grade.letter}
          </span>
          <span className={`text-xs font-semibold ${grade.color}`}>
            {grade.label}
          </span>
        </div>
      </div>

      {/* RMSE comparison bars */}
      <div className="mt-4 space-y-3">
        <MetricBar
          label="RMSE-Bins"
          value={rmseBins}
          baseline={baselineRmseBins}
          gradeColor={grade.bg}
          format={(v) => v.toFixed(4)}
        />
        <MetricBar
          label="Log-Loss"
          value={evaluation.logLoss}
          baseline={evaluation.baselineLogLoss}
          gradeColor={grade.bg}
          format={(v) => v.toFixed(4)}
        />
      </div>

      {Math.abs(improvement) > 0.1 && (
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
          个性化模型比默认参数
          <span className={isBetter ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-amber-600 dark:text-amber-400"}>
            {" "}{isBetter ? "精确" : "偏差"} {Math.abs(improvement).toFixed(1)}%
          </span>
        </p>
      )}
    </div>
  );
}

/* ── Simulation Card ───────────────────────────────────────────────── */

function SimulationCard({
  simulations,
}: {
  simulations: Array<{
    name: string;
    description: string;
    defaultInterval: number;
    personalizedInterval: number;
  }>;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
        预测差异模拟
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)] opacity-60">
        典型场景下，个性化参数 vs 默认参数的间隔预测差异
      </p>

      <div className="mt-3 space-y-3">
        {simulations.map((s) => {
          const diff = s.personalizedInterval - s.defaultInterval;
          const diffPct =
            s.defaultInterval > 0
              ? (diff / s.defaultInterval) * 100
              : 0;
          const isLonger = diff > 0;

          return (
            <div
              key={s.name}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink)]">
                    {s.name}
                  </p>
                  <p className="text-[10px] text-[var(--color-ink-soft)] opacity-60">
                    {s.description}
                  </p>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <span className="text-[var(--color-ink-soft)] opacity-50">
                    {s.defaultInterval}天
                  </span>
                  <span className="mx-1 text-[var(--color-ink-soft)] opacity-30">
                    →
                  </span>
                  <span
                    className={`font-semibold ${
                      isLonger
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {s.personalizedInterval}天
                  </span>
                  <span
                    className={`ml-1 text-[11px] ${
                      isLonger
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {isLonger ? "+" : ""}
                    {diffPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Mini interval bar */}
              <div className="relative mt-2 h-1.5 w-full rounded-full bg-[var(--color-border)]">
                <div
                  className="absolute top-0 h-full w-0.5 rounded-full bg-[var(--color-ink-soft)] opacity-30"
                  style={{
                    left: `${Math.min(100, (s.defaultInterval / Math.max(s.defaultInterval, s.personalizedInterval, 1)) * 100)}%`,
                  }}
                />
                <div
                  className={`absolute top-0 h-full rounded-full ${isLonger ? "bg-teal-500" : "bg-amber-500"} opacity-70`}
                  style={{
                    width: `${Math.min(100, (Math.min(s.defaultInterval, s.personalizedInterval) / Math.max(s.defaultInterval, s.personalizedInterval, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Diagnostics Card ──────────────────────────────────────────────── */

function DiagnosticsCard({
  diagnostics,
}: {
  diagnostics: {
    cardCount: number;
    timeSpanDays: number;
    ratingDistribution: Record<string, number>;
  };
}) {
  const total = Object.values(diagnostics.ratingDistribution).reduce(
    (a, b) => a + b,
    0,
  );
  const ratings = ["again", "hard", "good", "easy"] as const;
  const colors: Record<string, string> = {
    again: "bg-red-400",
    hard: "bg-orange-400",
    good: "bg-blue-400",
    easy: "bg-emerald-400",
  };
  const labels: Record<string, string> = {
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
  };

  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
        训练数据画像
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <MiniStat label="覆盖卡片" value={diagnostics.cardCount} />
        <MiniStat label="日志条数" value={total} />
        <MiniStat
          label="时间跨度"
          value={`${diagnostics.timeSpanDays}天`}
        />
      </div>

      {/* Rating distribution bar */}
      <div className="mt-3">
        <p className="text-[10px] text-[var(--color-ink-soft)] opacity-60">
          Rating 分布
        </p>
        <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full">
          {ratings.map((r) => {
            const count = diagnostics.ratingDistribution[r] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct < 1) return null;
            return (
              <div
                key={r}
                className={`h-full ${colors[r]}`}
                style={{ width: `${pct}%` }}
                title={`${labels[r]}: ${count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ratings.map((r) => {
            const count = diagnostics.ratingDistribution[r] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <span key={r} className="inline-flex items-center gap-1 text-[10px] text-[var(--color-ink-soft)]">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[r]}`} />
                {labels[r]} {pct.toFixed(0)}%
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-2 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/* ── Reliability Card ──────────────────────────────────────────────── */

function ReliabilityCard({
  diagnostics,
}: {
  diagnostics: {
    cardCount: number;
    timeSpanDays: number;
    ratingDistribution: Record<string, number>;
  };
}) {
  const rules = getReliabilityRules(diagnostics);
  if (rules.length === 0) return null;

  // Unique warnings only
  const seen = new Set<string>();
  const uniqueWarnings: string[] = [];
  for (const rule of rules) {
    if (!seen.has(rule.warning)) {
      seen.add(rule.warning);
      uniqueWarnings.push(rule.warning);
    }
  }

  return (
    <div className="rounded-[1.2rem] border border-[rgba(178,87,47,0.2)] bg-[var(--color-surface-muted-warm)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">⚠️</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
          参数可信度提示
        </p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {uniqueWarnings.map((w, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400"
          >
            <span className="mt-1 block h-1 w-1 rounded-full bg-amber-500" />
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricBar({
  label,
  value,
  baseline,
  gradeColor,
  format,
}: {
  label: string;
  value: number;
  baseline: number;
  gradeColor: string;
  format: (v: number) => string;
}) {
  const max = Math.max(value, baseline, value * 1.2);
  const valuePct = max > 0 ? (value / max) * 100 : 0;
  const baselinePct = max > 0 ? (baseline / max) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-ink-soft)]">{label}</span>
        <span className="tabular-nums text-[var(--color-ink)]">
          <span className="text-[var(--color-ink-soft)] opacity-50">默认 {format(baseline)}</span>
          {" → "}
          <span className="font-semibold">{format(value)}</span>
        </span>
      </div>
      <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
        {/* Baseline marker */}
        <div
          className="absolute top-0 h-full w-0.5 rounded-full bg-[var(--color-ink-soft)] opacity-30"
          style={{ left: `${baselinePct}%` }}
        />
        {/* Value bar */}
        <div
          className={`absolute top-0 h-full rounded-full ${gradeColor} opacity-80`}
          style={{ width: `${valuePct}%` }}
        />
      </div>
    </div>
  );
}
