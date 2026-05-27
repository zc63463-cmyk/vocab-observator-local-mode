"use client";

import { StackedRatingBar } from "@/components/ui/StackedRatingBar";
import { InsightBanner, BodyStat } from "./_shared";
import type { DashboardSummary } from "../types";

interface RatingMixBodyProps {
  summary: Pick<DashboardSummary, "ratingDistribution" | "metrics">;
}

const RATING_META = [
  { key: "again" as const, label: "重来", color: "#ef4444", tone: "warm" as const },
  { key: "hard" as const, label: "困难", color: "#f59e0b", tone: "default" as const },
  { key: "good" as const, label: "良好", color: "#22c55e", tone: "default" as const },
  { key: "easy" as const, label: "简单", color: "#3b82f6", tone: "default" as const },
];

export function RatingMixBody({ summary }: RatingMixBodyProps) {
  const { again, hard, good, easy } = summary.ratingDistribution;
  const total = again + hard + good + easy;

  const segments = RATING_META.map((m) => ({
    label: m.label,
    value: summary.ratingDistribution[m.key],
    color: m.color,
  }));

  if (total === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-ink-soft)]">
          暂无评分数据。完成几次复习后即可看到分布。
        </p>
        <a
          href="/review/zen"
          className="inline-flex items-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          开始首次复习 →
        </a>
      </div>
    );
  }

  const againPct = again / total;
  const _hardPct = hard / total;
  const goodPct = good / total;
  const easyPct = easy / total;

  /* ── Insight generation ───────────────────────────────────────────── */
  let insightText = "";
  let insightTone: "cool" | "warm" | "info" = "info";

  if (againPct > 0.25) {
    insightText = `Again 比例高达 ${(againPct * 100).toFixed(0)}%，说明当前 retention 目标可能偏激进，卡片间隔过短。建议适当调高 retention 目标（如 0.90→0.92），让系统更信任你的记忆。`;
    insightTone = "warm";
  } else if (againPct > 0.18) {
    insightText = `Again 比例 ${(againPct * 100).toFixed(0)}% 略高，处于挑战区。如果体感上很多卡片确实记不住了，保持当前目标即可；如果体感偏简单，可微调 retention 目标。`;
    insightTone = "warm";
  } else if (easyPct > 0.4) {
    insightText = `Easy 比例高达 ${(easyPct * 100).toFixed(0)}%，卡片可能过于熟悉。建议适度降低 retention 目标（如 0.92→0.90），减少不必要的复习量。`;
    insightTone = "info";
  } else if (goodPct > 0.5 && againPct < 0.1) {
    insightText = "Good 占主导，Again 很低——当前 retention 目标与记忆状态匹配良好，保持即可。";
    insightTone = "cool";
  } else {
    insightText = "评分分布均衡，复习节奏健康。";
    insightTone = "cool";
  }

  return (
    <div className="space-y-5">
      <StackedRatingBar segments={segments} />

      {/* Distribution stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RATING_META.map((m) => {
          const count = summary.ratingDistribution[m.key];
          const pct = count / total;
          return (
            <BodyStat
              key={m.key}
              label={m.label}
              value={
                <span className="flex items-baseline gap-1.5">
                  <span>{count}</span>
                  <span className="text-sm font-medium text-[var(--color-ink-soft)]">
                    ({(pct * 100).toFixed(0)}%)
                  </span>
                </span>
              }
              tone={m.tone}
            />
          );
        })}
      </div>

      <InsightBanner text={insightText} tone={insightTone} />

      <p className="text-xs leading-6 text-[var(--color-ink-soft)]">
        近 30 天共 {total} 次评分。Again 比例越高代表当前 retention 目标偏激进；
        Easy 比例过高则可能是过度复习，可以考虑提升 retention 目标节省时间。
      </p>
    </div>
  );
}
