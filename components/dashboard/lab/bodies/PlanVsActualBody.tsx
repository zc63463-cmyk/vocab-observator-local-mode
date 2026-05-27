"use client";

import { PlanVsActualChart } from "@/components/ui/PlanVsActualChart";
import { BodyStat, InsightBanner } from "./_shared";
import type { DashboardSummary } from "../types";

interface PlanVsActualBodyProps {
  summary: Pick<DashboardSummary, "planVsActual">;
}

export function PlanVsActualBody({ summary }: PlanVsActualBodyProps) {
  const data = summary.planVsActual;

  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-soft)]">
        暂无数据——完成一次复习后即可对比计划与实际。
      </p>
    );
  }

  const totalForecast = data.reduce((sum, p) => sum + p.forecastCount, 0);
  const totalActual = data.reduce((sum, p) => sum + p.actualCount, 0);
  const ratio = totalForecast > 0 ? totalActual / totalForecast : 0;

  /* ── Trend analysis ───────────────────────────────────────────────── */
  const dailyRatios = data.map((p) => ({
    ...p,
    ratio: p.forecastCount > 0 ? p.actualCount / p.forecastCount : 1,
  }));

  // Consecutive days with ratio < 0.8 (incomplete)
  let incompleteStreak = 0;
  for (let i = dailyRatios.length - 1; i >= 0; i--) {
    if (dailyRatios[i].ratio < 0.8 && dailyRatios[i].forecastCount > 0) {
      incompleteStreak++;
    } else {
      break;
    }
  }

  // Best / worst day
  const bestDay = [...dailyRatios].sort((a, b) => b.ratio - a.ratio)[0];
  const worstDay = [...dailyRatios].filter((d) => d.forecastCount > 0).sort((a, b) => a.ratio - b.ratio)[0];

  /* ── Insight generation ───────────────────────────────────────────── */
  let insightText = "";
  let insightTone: "cool" | "warm" | "info" = "info";

  if (incompleteStreak >= 3) {
    insightText = `连续 ${incompleteStreak} 天未完成目标计划，建议优先处理核心复习，避免积压滚雪球。`;
    insightTone = "warm";
  } else if (ratio >= 1.1) {
    insightText = "实际复习量超出计划，节奏积极。注意避免过度复习导致 burnout。";
    insightTone = "info";
  } else if (ratio >= 0.9) {
    insightText = "计划与实际高度吻合，复习节奏稳定。";
    insightTone = "cool";
  } else if (ratio >= 0.7) {
    insightText = "完成率尚可，但存在轻微滞后。建议每天先完成到期卡片，再处理新词。";
    insightTone = "info";
  } else {
    insightText = "完成率偏低，建议检查 retention 目标是否过高，或复习时间是否不足。";
    insightTone = "warm";
  }

  return (
    <div className="space-y-5">
      <PlanVsActualChart data={data} />

      <div className="grid grid-cols-3 gap-3">
        <BodyStat label="14d 计划合计" value={totalForecast} />
        <BodyStat label="14d 实际合计" value={totalActual} />
        <BodyStat
          label="完成率"
          value={`${Math.round(ratio * 100)}%`}
          tone={ratio < 0.8 ? "warm" : ratio >= 1.0 ? "cool" : "default"}
        />
      </div>

      <InsightBanner text={insightText} tone={insightTone} />

      {/* Daily detail table */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          每日明细
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                <th className="pb-2 font-semibold">日期</th>
                <th className="pb-2 font-semibold text-right">计划</th>
                <th className="pb-2 font-semibold text-right">实际</th>
                <th className="pb-2 font-semibold text-right">完成率</th>
                <th className="pb-2 font-semibold text-right">状态</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-ink)]">
              {dailyRatios.map((d) => {
                const pct = Math.round(d.ratio * 100);
                let status = "完成";
                let statusClass = "text-emerald-600 dark:text-emerald-400";
                if (d.forecastCount === 0) {
                  status = "—";
                  statusClass = "text-[var(--color-ink-soft)] opacity-50";
                } else if (d.ratio < 0.5) {
                  status = "滞后";
                  statusClass = "text-red-500 dark:text-red-400";
                } else if (d.ratio < 0.8) {
                  status = "不足";
                  statusClass = "text-amber-600 dark:text-amber-400";
                }
                return (
                  <tr
                    key={d.date}
                    className={`border-t border-[var(--color-border)] ${d.isToday ? "bg-[var(--color-surface)]" : ""}`}
                  >
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{d.date}</span>
                      {d.isToday && (
                        <span className="ml-2 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          今天
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{d.forecastCount}</td>
                    <td className="py-2.5 text-right tabular-nums">{d.actualCount}</td>
                    <td className="py-2.5 text-right tabular-nums">{pct}%</td>
                    <td className={`py-2.5 text-right text-xs font-semibold ${statusClass}`}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best / worst summary */}
      {bestDay && worstDay && (
        <div className="grid grid-cols-2 gap-3">
          <BodyStat
            label="最佳完成日"
            value={
              <span>
                {bestDay.date}{" "}
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  {Math.round(bestDay.ratio * 100)}%
                </span>
              </span>
            }
            tone="cool"
          />
          <BodyStat
            label="最弱完成日"
            value={
              <span>
                {worstDay.date}{" "}
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  {Math.round(worstDay.ratio * 100)}%
                </span>
              </span>
            }
            tone={worstDay.ratio < 0.5 ? "warm" : "default"}
          />
        </div>
      )}
    </div>
  );
}
