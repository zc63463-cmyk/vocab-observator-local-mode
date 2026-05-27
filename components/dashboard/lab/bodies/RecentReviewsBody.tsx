"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { InsightBanner } from "./_shared";
import type { DashboardSummary } from "../types";

interface RecentReviewsBodyProps {
  summary: Pick<DashboardSummary, "recentLogs">;
}

const RATING_TONES: Record<string, string> = {
  again: "text-red-500 dark:text-red-400",
  hard: "text-amber-600 dark:text-amber-400",
  good: "text-emerald-600 dark:text-emerald-400",
  easy: "text-blue-600 dark:text-blue-400",
};

const RATING_LABELS: Record<string, string> = {
  again: "重来",
  hard: "困难",
  good: "良好",
  easy: "简单",
};

export function RecentReviewsBody({ summary }: RecentReviewsBodyProps) {
  const logs = summary.recentLogs;

  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-ink-soft)]">还没有复习记录。</p>
        <Link
          href="/review"
          className="inline-flex items-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          开始复习 →
        </Link>
      </div>
    );
  }

  const againCount = logs.filter((l) => l.rating.toLowerCase() === "again").length;

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const rating = log.rating.toLowerCase();
        const tone = RATING_TONES[rating] ?? "text-[var(--color-ink-soft)]";
        const label = RATING_LABELS[rating] ?? log.rating;
        const needsAttention = rating === "again" || rating === "hard";

        return (
          <div
            key={`${log.reviewed_at}-${index}`}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
              needsAttention
                ? "border-[rgba(178,87,47,0.2)] bg-[var(--color-surface-muted-warm)]/30"
                : "border-[var(--color-border)] bg-[var(--color-surface-soft)]"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {log.words ? (
                  <Link
                    href={`/p/${log.words.slug}`}
                    className="text-base font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    {log.words.lemma}
                  </Link>
                ) : (
                  <span className="text-base font-semibold text-[var(--color-ink-soft)]">已删除词条</span>
                )}
                {log.words?.semanticField && (
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
                    {log.words.semanticField}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)] opacity-70">
                {formatDateTime(log.reviewed_at)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>{label}</span>
              {needsAttention && log.words && (
                <Link
                  href={`/review?focus=${log.words.slug}`}
                  className="text-[10px] font-medium text-[var(--color-accent)] hover:underline"
                >
                  再次复习
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {againCount >= 3 && (
        <InsightBanner
          text={`最近 ${logs.length} 次复习中有 ${againCount} 次 Again，这些词条记忆较薄弱。建议点击词条进入详情页加深记忆，或使用「再次复习」快速重练。`}
          tone="warm"
        />
      )}
    </div>
  );
}
