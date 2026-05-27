"use client";

import { Badge } from "@/components/ui/Badge";
import { RetentionDiagnostics } from "@/components/review/RetentionDiagnostics";
import { ReviewRetentionSettings } from "@/components/review/ReviewRetentionSettings";
import { BodyStat, BodyMini, InsightBanner } from "./_shared";
import { formatPercent, formatSignedPoints } from "../format";
import type { DashboardSummary } from "../types";

interface ReviewLoadBodyProps {
  summary: Pick<
    DashboardSummary,
    | "metrics"
    | "configuredDesiredRetention"
    | "averageDesiredRetention"
    | "configuredRetentionForecast"
    | "fsrsCalibrationGap30d"
    | "fsrsForgettingRate"
    | "forgettingRate30d"
    | "retentionDiagnostic"
    | "activeSession"
  >;
}

export function ReviewLoadBody({ summary }: ReviewLoadBodyProps) {
  const { trackedWords, dueToday, reviewedToday } = summary.metrics;
  const gap = summary.fsrsCalibrationGap30d;
  const forecast = summary.configuredRetentionForecast;

  /* ── Load level classification ────────────────────────────────────── */
  const loadLevel =
    dueToday === 0
      ? { label: "无负载", tone: "default" as const, color: "#0f766e" }
      : dueToday < 15
        ? { label: "轻松", tone: "default" as const, color: "#22c55e" }
        : dueToday < 30
          ? { label: "适中", tone: "default" as const, color: "#3b82f6" }
          : dueToday < 50
            ? { label: "较重", tone: "warm" as const, color: "#f59e0b" }
            : { label: "过载", tone: "warm" as const, color: "#ef4444" };

  const _completionRate = dueToday > 0 ? Math.min(1, reviewedToday / dueToday) : 1;
  const remaining = Math.max(0, dueToday - reviewedToday);

  /* ── Insight generation ───────────────────────────────────────────── */
  let insightText = "";
  let insightTone: "cool" | "warm" | "info" = "info";

  if (gap > 0.03) {
    insightText = `FSRS 校准偏移显著为正（${formatSignedPoints(gap)}），实际遗忘率高于预期。建议运行 FSRS 权重训练或适当调高 retention 目标。`;
    insightTone = "warm";
  } else if (gap < -0.03) {
    insightText = `FSRS 校准偏移为负（${formatSignedPoints(gap)}），记忆表现优于算法预期。可以适当降低 retention 目标以减少复习量。`;
    insightTone = "cool";
  } else if (dueToday > 30) {
    insightText = `今日到期 ${dueToday} 张，负载较重。建议优先处理核心复习，新词可适当延后。`;
    insightTone = "warm";
  } else if (dueToday === 0) {
    insightText = "今日无到期卡片，是补充新词或回顾旧笔记的好时机。";
    insightTone = "info";
  } else {
    insightText = "FSRS 校准良好，复习节奏稳定。保持当前目标即可。";
    insightTone = "cool";
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════
          ① 负载概览 Load Overview
         ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          eyebrow="Load Overview"
          title="今日复习负载"
          badge={<Badge tone={loadLevel.tone}>{loadLevel.label}</Badge>}
        />

        <div className="mt-4 grid gap-5 lg:grid-cols-[240px_1fr]">
          {/* Load Gauge — large circular progress */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
            <LoadGauge
              completed={reviewedToday}
              total={dueToday}
              color={loadLevel.color}
            />
            <p className="mt-3 text-center text-sm text-[var(--color-ink-soft)]">
              {dueToday > 0
                ? `${reviewedToday} / ${dueToday} 已完成`
                : "今日无到期卡片"}
            </p>
            {remaining > 0 && (
              <p className="mt-1 text-center text-xs text-[var(--color-ink-soft)] opacity-70">
                还剩 {remaining} 张
              </p>
            )}
          </div>

          {/* Quick stats row */}
          <div className="flex flex-col justify-center gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <BodyStat label="跟踪词" value={trackedWords} />
              <BodyStat
                label="今日到期"
                value={dueToday}
                tone={loadLevel.tone === "warm" ? "warm" : "default"}
              />
              <BodyStat label="今日已复习" value={reviewedToday} tone="cool" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <BodyStat
                label="FSRS Gap 30d"
                value={formatSignedPoints(gap)}
                tone={gap > 0 ? "warm" : gap < -0.02 ? "cool" : "default"}
              />
              <BodyStat
                label="期望遗忘率"
                value={formatPercent(summary.fsrsForgettingRate)}
              />
              <BodyStat
                label="观测遗忘率 30d"
                value={formatPercent(summary.forgettingRate30d)}
                tone={summary.forgettingRate30d > summary.fsrsForgettingRate + 0.03 ? "warm" : "default"}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ② 校准状态 Calibration Status
         ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader eyebrow="Calibration Status" title="FSRS 校准状态" />

        <div className="mt-4 space-y-4">
          {/* Calibration deviation bar */}
          <CalibrationBar gap={gap} />

          {/* Target + Forecast cards */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                当前目标
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {formatPercent(summary.configuredDesiredRetention)}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
                活跃卡片平均目标：{formatPercent(summary.averageDesiredRetention)}
                {Math.abs(summary.configuredDesiredRetention - summary.averageDesiredRetention) >= 0.005 && (
                  <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                    （混合目标）
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                到期预测
              </p>
              <div className="mt-3 flex items-end gap-3">
                <ForecastBar value={forecast.dueNow} max={forecast.due14d} label="即时" />
                <ForecastBar value={forecast.due7d} max={forecast.due14d} label="7d" />
                <ForecastBar value={forecast.due14d} max={forecast.due14d} label="14d" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ③ 调节控制台 Calibration Console
         ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader eyebrow="Calibration Console" title="调节 Retention 目标" />
        <div className="mt-4">
          <ReviewRetentionSettings
            key={summary.configuredDesiredRetention}
            initialDesiredRetention={summary.configuredDesiredRetention}
            averageDesiredRetention={summary.averageDesiredRetention}
            trackedWords={trackedWords}
          />
        </div>
        <div className="mt-4">
          <RetentionDiagnostics diagnostic={summary.retentionDiagnostic} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ④ 诊断洞察 Diagnostic Insight
         ═══════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <InsightBanner text={insightText} tone={insightTone} />

        {summary.activeSession && (
          <div className="flex items-center gap-4 rounded-2xl border border-[rgba(15,111,98,0.18)] bg-[var(--color-surface-muted)] p-4">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 text-sm leading-6 text-[var(--color-ink-soft)]">
              <p>
                活跃会话进行中 · 已浏览{" "}
                <strong className="text-[var(--color-ink)]">
                  {summary.activeSession.cards_seen}
                </strong>{" "}
                张卡片
              </p>
              <p className="opacity-70">
                观测 Again 率 30d：{formatPercent(summary.forgettingRate30d)}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── SectionHeader ─────────────────────────────────────────────────── */
function SectionHeader({
  eyebrow,
  title,
  badge,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] pb-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          {eyebrow}
        </p>
        <h3 className="section-title mt-1 text-lg font-semibold text-[var(--color-ink)]">
          {title}
        </h3>
      </div>
      {badge}
    </div>
  );
}

/* ── LoadGauge ───────────────────────────────────────────────────────
 * Circular progress showing completed / total reviews for today.
 * Pure SVG, no external chart deps.
 */
function LoadGauge({
  completed,
  total,
  color,
}: {
  completed: number;
  total: number;
  color: string;
}) {
  const radius = 42;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, completed / total) : 1;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      {/* Background ring */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
        opacity="0.5"
      />
      {/* Progress arc */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Center text — rendered upright by counter-rotating the text group */}
      <g transform="rotate(90, 60, 60)">
        <text
          x="60"
          y="58"
          textAnchor="middle"
          className="fill-[var(--color-ink)] text-2xl font-semibold"
          style={{ fontSize: "28px", fontWeight: 600 }}
        >
          {total > 0 ? `${Math.round(progress * 100)}` : "—"}
        </text>
        <text
          x="60"
          y="76"
          textAnchor="middle"
          className="fill-[var(--color-ink-soft)]"
          style={{ fontSize: "11px", fontWeight: 500 }}
        >
          {total > 0 ? "%" : ""}
        </text>
      </g>
    </svg>
  );
}

/* ── CalibrationBar ──────────────────────────────────────────────────
 * Horizontal deviation bar for FSRS calibration gap.
 * Center = 0, left = negative (good), right = positive (bad).
 */
function CalibrationBar({ gap }: { gap: number }) {
  const min = -0.05;
  const max = 0.05;
  const clamped = Math.max(min, Math.min(max, gap));
  const pct = ((clamped - min) / (max - min)) * 100;

  const getGapLabel = () => {
    if (gap > 0.03) return "显著偏高";
    if (gap > 0.01) return "略偏高";
    if (gap < -0.03) return "显著偏低";
    if (gap < -0.01) return "略偏低";
    return "良好";
  };

  const getGapTone = () => {
    if (gap > 0.03) return "text-red-500 dark:text-red-400";
    if (gap > 0.01) return "text-amber-600 dark:text-amber-400";
    if (gap < -0.03) return "text-emerald-600 dark:text-emerald-400";
    if (gap < -0.01) return "text-teal-600 dark:text-teal-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          校准偏差 · {formatSignedPoints(gap)}
        </p>
        <span className={`text-xs font-semibold ${getGapTone()}`}>{getGapLabel()}</span>
      </div>

      {/* Bar track */}
      <div className="relative mt-4 h-3 rounded-full bg-gradient-to-r from-emerald-500/20 via-slate-200/30 to-red-500/20 dark:from-emerald-500/15 dark:via-slate-700/30 dark:to-red-500/15">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[var(--color-ink-soft)] opacity-30" />

        {/* Pointer */}
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-ink)] shadow-md dark:border-[var(--color-panel-strong)]"
          style={{ left: `${pct}%`, transition: "left 0.6s ease" }}
        />
      </div>

      {/* Labels */}
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)] opacity-60">
        <span>-5pp（优于目标）</span>
        <span>0</span>
        <span>+5pp（低于目标）</span>
      </div>
    </div>
  );
}

/* ── ForecastBar ─────────────────────────────────────────────────────
 * Micro vertical bar for the forecast card.
 */
function ForecastBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const height = max > 0 ? Math.max(8, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="relative flex h-24 w-full items-end justify-center rounded-xl bg-[var(--color-surface)] p-2">
        <div
          className="w-6 rounded-md bg-[var(--color-accent)] transition-all"
          style={{ height: `${height}%`, opacity: 0.7 }}
        />
      </div>
      <BodyMini label={label} value={value} />
    </div>
  );
}
