import {
  RETENTION_BUCKET_MIN_SAMPLES,
  RETENTION_DIAGNOSTIC_MIN_SAMPLES,
  RETENTION_MATURE_THRESHOLD_DAYS,
  type RetentionBucketKey,
  type RetentionDiagnostic,
  type RetentionSlice,
} from "@/lib/review/retention-diagnostics";

interface RetentionDiagnosticsProps {
  diagnostic: RetentionDiagnostic;
}

function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPoints(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}pp`;
}

/**
 * 将诊断建议类型映射为中文标题 + 说明 + 色调。
 * 措辞保持观察性而非命令式——因为观测与目标 retention 的偏差
 * 可能源于未拟合的 FSRS w-参数，而非 desired_retention 设置本身有误。
 */
function getSuggestionContent(
  diagnostic: RetentionDiagnostic,
): { body: string; headline: string; tone: "info" | "warm" | "cool" } {
  const desiredPct = formatPercent(diagnostic.desiredRetention, 0);

  switch (diagnostic.suggestionKind) {
    case "insufficient-data":
      return {
        body: `需要过去 ${diagnostic.windowDays} 天内至少 ${RETENTION_DIAGNOSTIC_MIN_SAMPLES} 次到期复习才能做出可靠估计。当前仅有 ${diagnostic.dueReviews} 次符合条件的复习记录。`,
        headline: "数据不足，建议继续积累",
        tone: "info",
      };
    case "on-target":
      return {
        body: `过去 ${diagnostic.windowDays} 天内，观测到的记忆保持率与 ${desiredPct} 目标在统计上无显著差异。当前设置与你的实际记忆行为高度吻合。`,
        headline: "校准良好",
        tone: "cool",
      };
    case "above-target":
      return {
        body: `观测到的记忆保持率持续高于 ${desiredPct} 目标。这通常意味着排程间隔偏短——你可以降低 desired_retention 来减少工作量，但更精确的解决方案是运行 FSRS 优化器重新拟合 w-参数。`,
        headline: "记忆保持率高于目标",
        tone: "info",
      };
    case "below-target":
      return {
        body: `观测到的记忆保持率持续低于 ${desiredPct} 目标。在提高 desired_retention 之前，请先考虑 w-参数是否需要重新拟合——一个欠拟合的模型即使目标值合理，也可能导致观测保持率偏低。`,
        headline: "记忆保持率低于目标",
        tone: "warm",
      };
  }
}

function ToneBadge({ tone }: { tone: "info" | "warm" | "cool" }) {
  const cls = {
    info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    warm: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    cool: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  }[tone];
  const label = { info: "提示", warm: "注意", cool: "良好" }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

export function RetentionDiagnostics({ diagnostic }: RetentionDiagnosticsProps) {
  const suggestion = getSuggestionContent(diagnostic);
  const hasObservation = diagnostic.observedRetention != null;

  return (
    <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            Retention 诊断 · 近 {diagnostic.windowDays} 天
          </p>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {suggestion.headline}
          </p>
        </div>
        <ToneBadge tone={suggestion.tone} />
      </div>

      <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
        {suggestion.body}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DiagnosticStat
          label="到期复习次数"
          value={String(diagnostic.dueReviews)}
          hint={`窗口期内共 ${diagnostic.totalReviews} 次复习`}
        />
        <DiagnosticStat
          label="观测保持率"
          value={
            hasObservation
              ? formatPercent(diagnostic.observedRetention!, 1)
              : "—"
          }
          hint={
            diagnostic.confidenceInterval
              ? `95% 置信区间 ${formatPercent(diagnostic.confidenceInterval.low, 1)} – ${formatPercent(diagnostic.confidenceInterval.high, 1)}`
              : "到期复习次数不足"
          }
        />
        <DiagnosticStat
          label="目标保持率"
          value={formatPercent(diagnostic.desiredRetention, 0)}
          hint="你当前设定的目标"
        />
        <DiagnosticStat
          label="与目标偏差"
          value={
            diagnostic.gap != null
              ? formatSignedPoints(diagnostic.gap, 1)
              : "—"
          }
          hint={
            diagnostic.gapSignificant
              ? "统计上显著偏离"
              : "在随机波动范围内"
          }
        />
      </div>

      <BucketBreakdown diagnostic={diagnostic} />

      <p className="mt-3 text-[11px] leading-5 text-[var(--color-ink-soft)]">
        方法论：仅统计满足 <code>elapsed_days ≥ scheduled_days</code>
        {" "}且 <code>scheduled_days ≥ 1</code> 的复习记录，排除提前复习和学习期卡片对估计的干扰。
        置信区间采用 Wilson score 方法。分桶阈值按 Anki/FSRS 惯例取 <code>scheduled_days = {RETENTION_MATURE_THRESHOLD_DAYS}</code>；
        每桶需 ≥ {RETENTION_BUCKET_MIN_SAMPLES} 次到期复习才能产生有效信号。
      </p>
    </div>
  );
}

const BUCKET_LABELS: Record<RetentionBucketKey, { interval: string; title: string }> = {
  young: {
    interval: `间隔 < ${RETENTION_MATURE_THRESHOLD_DAYS} 天`,
    title: "新卡片",
  },
  mature: {
    interval: `间隔 ≥ ${RETENTION_MATURE_THRESHOLD_DAYS} 天`,
    title: "成熟卡片",
  },
};

/**
 * 按卡片成熟度分桶的细分卡片。
 * 将整体 Wilson 置信区间指标按间隔长度拆分，帮助用户区分
 * "巩固期偏差"与"长期记忆模型偏差"——两者的根因往往截然不同。
 */
function BucketBreakdown({ diagnostic }: { diagnostic: RetentionDiagnostic }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {(Object.keys(BUCKET_LABELS) as RetentionBucketKey[]).map((key) => (
        <BucketSliceCard
          key={key}
          desiredRetention={diagnostic.desiredRetention}
          intervalDescription={BUCKET_LABELS[key].interval}
          slice={diagnostic.buckets[key]}
          title={BUCKET_LABELS[key].title}
        />
      ))}
    </div>
  );
}

function BucketSliceCard({
  desiredRetention,
  intervalDescription,
  slice,
  title,
}: {
  desiredRetention: number;
  intervalDescription: string;
  slice: RetentionSlice;
  title: string;
}) {
  const tone = sliceTone(slice);
  return (
    <div className={`rounded-[1rem] border p-3 ${tone.containerClass}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)]">
          {intervalDescription}
        </p>
      </div>

      <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
        {slice.observedRetention != null
          ? formatPercent(slice.observedRetention, 1)
          : "—"}
      </p>
      <p className="text-[11px] text-[var(--color-ink-soft)]">
        {slice.confidenceInterval
          ? `95% 置信区间 ${formatPercent(slice.confidenceInterval.low, 1)} – ${formatPercent(slice.confidenceInterval.high, 1)}`
          : "到期复习次数不足"}
      </p>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-ink-soft)]">
        <span>{slice.dueReviews} 次到期复习</span>
        <span>
          {slice.gap != null ? formatSignedPoints(slice.gap, 1) : "—"} vs{" "}
          {formatPercent(desiredRetention, 0)}
        </span>
      </div>

      <p className={`mt-2 text-[11px] leading-4 ${tone.headlineClass}`}>
        {tone.headline}
      </p>
    </div>
  );
}

function sliceTone(slice: RetentionSlice): {
  containerClass: string;
  headline: string;
  headlineClass: string;
} {
  switch (slice.suggestionKind) {
    case "above-target":
      return {
        containerClass: "border-sky-500/30 bg-sky-500/5",
        headline: "持续高于目标",
        headlineClass: "text-sky-700 dark:text-sky-300",
      };
    case "below-target":
      return {
        containerClass: "border-amber-500/40 bg-amber-500/5",
        headline: "持续低于目标",
        headlineClass: "text-amber-700 dark:text-amber-300",
      };
    case "on-target":
      return {
        containerClass: "border-emerald-500/30 bg-emerald-500/5",
        headline: "与目标无显著差异",
        headlineClass: "text-emerald-700 dark:text-emerald-300",
      };
    case "insufficient-data":
    default:
      return {
        containerClass: "border-[var(--color-border)] bg-[var(--color-panel)]",
        headline: `需 ${RETENTION_BUCKET_MIN_SAMPLES}+ 次到期复习才能判断`,
        headlineClass: "text-[var(--color-ink-soft)]",
      };
  }
}

function DiagnosticStat({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--color-ink-soft)]">{hint}</p>
    </div>
  );
}
