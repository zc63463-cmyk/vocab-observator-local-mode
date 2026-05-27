"use client";

import { Badge } from "@/components/ui/Badge";
import { InsightBanner, BodyStat } from "./_shared";
import { formatPercent } from "../format";
import type { DashboardSummary } from "../types";

interface PresetForecastBodyProps {
  summary: Pick<
    DashboardSummary,
    "retentionForecasts" | "configuredDesiredRetention" | "configuredRetentionForecast"
  >;
}

const PRESET_META: Record<string, { color: string; barColor: string }> = {
  current: { color: "var(--color-accent)", barColor: "bg-[var(--color-accent)]" },
  sprint: { color: "#ef4444", barColor: "bg-red-400" },
  balanced: { color: "#3b82f6", barColor: "bg-blue-400" },
  conservative: { color: "#22c55e", barColor: "bg-emerald-400" },
};

/**
 * PresetForecastBody — retention preset comparison with visual bar chart.
 *
 * Upgrades:
 *   - Side-by-side bar chart (current vs 3 presets)
 *   - Insight banner with actionable advice
 *   - Current preset highlighted with accent border
 */
export function PresetForecastBody({ summary }: PresetForecastBodyProps) {
  const current = summary.configuredRetentionForecast;
  const currentRetention = summary.configuredDesiredRetention;

  // Build rows for the bar chart: current + 3 presets
  const rows = [
    {
      id: "current",
      label: "当前",
      retention: currentRetention,
      due7d: current.due7d,
      due14d: current.due14d,
      isCurrent: true,
    },
    ...summary.retentionForecasts.map((f) => ({
      id: f.id,
      label: f.label,
      retention: f.desiredRetention,
      due7d: f.due7d,
      due14d: f.due14d,
      isCurrent: Math.abs(f.desiredRetention - currentRetention) < 0.0005,
    })),
  ];

  const maxDue = Math.max(...rows.map((r) => r.due14d), 1);

  // ── Insight generation ─────────────────────────────────────────────
  let insightText = "";
  let insightTone: "cool" | "warm" | "info" = "info";

  const currentRow = rows.find((r) => r.isCurrent) ?? rows[0];
  const sortedByLoad = [...rows].sort((a, b) => a.due7d - b.due7d);
  const lightest = sortedByLoad[0];
  const heaviest = sortedByLoad[sortedByLoad.length - 1];

  if (currentRow.due7d > heaviest.due7d * 0.9) {
    insightText = `当前 retention ${formatPercent(currentRetention)} 是负荷最重的设置之一，未来 7 天到期 ${currentRow.due7d} 张。如果感觉复习压力过大，可考虑降至 Balanced (${formatPercent(
      summary.retentionForecasts.find((f) => f.id === "balanced")?.desiredRetention ?? 0.9,
    )})，预计减少 ${currentRow.due7d - (summary.retentionForecasts.find((f) => f.id === "balanced")?.due7d ?? 0)} 张。`;
    insightTone = "warm";
  } else if (currentRow.due7d < lightest.due7d * 1.2) {
    insightText = `当前 retention ${formatPercent(currentRetention)} 属于偏保守策略，复习量较轻。如果希望加强记忆巩固，可尝试提升至 Balanced 或 Sprint 模式。`;
    insightTone = "cool";
  } else {
    insightText = `当前 retention ${formatPercent(currentRetention)} 处于均衡区间，7 天内到期 ${currentRow.due7d} 张。各预设之间的差异为 ${heaviest.due7d - lightest.due7d} 张，可根据近期时间灵活调整。`;
    insightTone = "info";
  }

  return (
    <div className="space-y-5">
      <InsightBanner text={insightText} tone={insightTone} />

      {/* ── Bar chart comparison ──────────────────────────────────── */}
      <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          到期量对比
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)] opacity-60">
          当前设置 vs 三个预设的 7 天 / 14 天到期量
        </p>

        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const meta = PRESET_META[row.id] ?? PRESET_META.current;
            const pct7 = (row.due7d / maxDue) * 100;
            const pct14 = (row.due14d / maxDue) * 100;

            return (
              <div key={row.id}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="font-medium text-[var(--color-ink)]">
                      {row.label}
                    </span>
                    {row.isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-ink-soft)]">
                        当前
                      </span>
                    )}
                  </div>
                  <span className="tabular-nums text-[var(--color-ink-soft)]">
                    {row.due7d} / 7d · {row.due14d} / 14d
                  </span>
                </div>
                <div className="relative mt-1.5 h-4 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
                  {/* 14d bar (background) */}
                  <div
                    className={`absolute top-0 h-full ${meta.barColor} opacity-30`}
                    style={{ width: `${pct14}%` }}
                  />
                  {/* 7d bar (foreground) */}
                  <div
                    className={`absolute top-0 h-full ${meta.barColor} opacity-70`}
                    style={{ width: `${pct7}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[var(--color-ink-soft)]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full bg-[var(--color-accent)] opacity-70" />
            7 天到期
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full bg-[var(--color-accent)] opacity-30" />
            14 天到期
          </span>
        </div>
      </div>

      {/* ── Preset cards ──────────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {summary.retentionForecasts.map((forecast) => {
          const delta7d = forecast.due7d - current.due7d;
          const delta14d = forecast.due14d - current.due14d;
          const isCurrent =
            Math.abs(forecast.desiredRetention - currentRetention) < 0.0005;

          return (
            <div
              key={forecast.id}
              className={`rounded-2xl border p-4 ${
                isCurrent
                  ? "border-[var(--color-accent)] bg-[var(--color-surface-soft)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-soft)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {forecast.label} {formatPercent(forecast.desiredRetention)}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--color-ink-soft)]">
                    {forecast.description}
                  </p>
                </div>
                <Badge tone={delta7d > 0 ? "warm" : "default"}>
                  {isCurrent
                    ? "当前"
                    : `${delta7d >= 0 ? "+" : ""}${delta7d}/7d`}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <Stat label="即时" value={forecast.dueNow} />
                <Stat label="7d" value={forecast.due7d} />
                <Stat label="14d" value={forecast.due14d} />
              </div>

              <p className="mt-2.5 text-[11px] leading-5 text-[var(--color-ink-soft)] opacity-70">
                vs 当前：{delta7d >= 0 ? "+" : ""}{delta7d} / 7d，
                {delta14d >= 0 ? "+" : ""}{delta14d} / 14d
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-2 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="text-base font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
