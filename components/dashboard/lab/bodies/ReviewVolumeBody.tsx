"use client";

import { useState } from "react";
import { MiniBarChart } from "@/components/ui/MiniBarChart";
import { BodyStat, InsightBanner } from "./_shared";
import type { DashboardSummary } from "../types";

interface ReviewVolumeBodyProps {
  summary: Pick<DashboardSummary, "reviewVolume7d" | "reviewVolume30d" | "metrics" | "weakestSemanticFields">;
}

type TabKey = "7d" | "14d" | "30d";

const TABS: { key: TabKey; label: string }[] = [
  { key: "7d", label: "7 日" },
  { key: "14d", label: "14 日" },
  { key: "30d", label: "30 日" },
];

export function ReviewVolumeBody({ summary }: ReviewVolumeBodyProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("7d");

  if (activeTab === "7d") {
    const data = summary.reviewVolume7d;
    const max = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const peak = Math.max(...data.map((d) => d.count), 0);
    const dailyAverage = data.length > 0 ? Math.round(total / data.length) : 0;

    // Rhythm analysis
    const nonZeroDays = data.filter((d) => d.count > 0).length;
    const zeroDays = data.length - nonZeroDays;

    return (
      <div className="space-y-5">
        <TabBar active={activeTab} onChange={setActiveTab} />
        <MiniBarChart data={data} maxCount={max} />
        <div className="grid grid-cols-3 gap-3">
          <BodyStat label="本周总量" value={total} />
          <BodyStat label="日均" value={dailyAverage} />
          <BodyStat label="单日峰值" value={peak} />
        </div>
        <InsightBanner
          text={
            zeroDays >= 2
              ? `本周有 ${zeroDays} 天未复习，节奏断裂。建议设置每日提醒，保持连续性。`
              : total > 0 && dailyAverage < 5
                ? "本周复习量偏少，建议每天至少处理 5-10 张卡片以维持记忆强度。"
                : peak > dailyAverage * 3
                  ? `本周出现明显峰值（${peak} 张），可能是补卡或积压。建议分散复习以避免单日过载。`
                  : "本周复习节奏平稳，继续保持。"
          }
          tone={zeroDays >= 2 || (total > 0 && dailyAverage < 5) ? "warm" : "cool"}
        />
      </div>
    );
  }

  if (activeTab === "14d") {
    const data = summary.reviewVolume30d.slice(-14);
    const max = Math.max(...summary.reviewVolume30d.map((d) => d.count), 1);
    const total14 = data.reduce((sum, d) => sum + d.count, 0);
    const avg14 = data.length > 0 ? Math.round(total14 / data.length) : 0;
    const peak14 = Math.max(...data.map((d) => d.count), 0);

    return (
      <div className="space-y-5">
        <TabBar active={activeTab} onChange={setActiveTab} />
        <MiniBarChart data={data} maxCount={max} accentColor="var(--color-accent-2)" />
        <div className="grid grid-cols-3 gap-3">
          <BodyStat label="14 日总量" value={total14} />
          <BodyStat label="日均" value={avg14} />
          <BodyStat label="峰值" value={peak14} />
        </div>
        <InsightBanner
          text={
            avg14 < 5
              ? "近两周复习量偏低，记忆可能正在衰退。建议增加每日复习量或降低 retention 目标以减少压力。"
              : peak14 > avg14 * 2.5
                ? "近两周出现明显峰值，复习节奏不均。建议每日固定复习时段，避免堆积。"
                : "近两周复习节奏稳定，记忆保持状态良好。"
          }
          tone={avg14 < 5 ? "warm" : "cool"}
        />
      </div>
    );
  }

  // 30d
  const data = summary.reviewVolume30d;
  const max = Math.max(...data.map((d) => d.count), 1);
  const total30 = summary.metrics.reviewed30d;
  const today = data.at(-1)?.count ?? 0;
  const peak30 = Math.max(...data.map((d) => d.count), 0);
  const avg30 = data.length > 0 ? Math.round(total30 / data.length) : 0;

  return (
    <div className="space-y-5">
      <TabBar active={activeTab} onChange={setActiveTab} />
      <MiniBarChart data={data} maxCount={max} accentColor="var(--color-accent-2)" />
      <div className="grid grid-cols-4 gap-3">
        <BodyStat label="30 日总量" value={total30} />
        <BodyStat label="日均" value={avg30} />
        <BodyStat label="今日" value={today} />
        <BodyStat label="峰值" value={peak30} />
      </div>

      {summary.weakestSemanticFields.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            最易遗忘的语义场
          </p>
          <div className="mt-3 space-y-2">
            {summary.weakestSemanticFields.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3"
              >
                <span className="font-medium text-[var(--color-ink)]">{field.name}</span>
                <span className="text-sm text-[var(--color-ink-soft)]">
                  {(field.againRate * 100).toFixed(0)}% Again
                  <span className="ml-2 opacity-60">· {field.total} 次</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <InsightBanner
        text={
          summary.weakestSemanticFields.length > 0
            ? `近 30 天中最薄弱的语义场是「${summary.weakestSemanticFields[0].name}」，Again 率高达 ${(summary.weakestSemanticFields[0].againRate * 100).toFixed(0)}%。建议针对该领域的词条增加笔记或降低间隔。`
            : avg30 < 3
              ? "近 30 天复习量偏低，建议每天至少复习 5 张卡片以维持长期记忆。"
              : "近 30 天复习节奏健康，无明显薄弱领域。"
        }
        tone={summary.weakestSemanticFields.length > 0 || avg30 < 3 ? "warm" : "cool"}
      />
    </div>
  );
}

function TabBar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            active === tab.key
              ? "bg-[var(--color-accent)] text-white shadow-sm"
              : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
