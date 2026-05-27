"use client";

import Link from "next/link";
import { excerpt, formatDateTime } from "@/lib/utils";
import { InsightBanner } from "./_shared";
import type { DashboardSummary } from "../types";

interface RecentNotesBodyProps {
  summary: Pick<DashboardSummary, "notes">;
}

export function RecentNotesBody({ summary }: RecentNotesBodyProps) {
  const notes = summary.notes;

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[var(--color-ink-soft)]">还没有笔记。</p>
        <Link
          href="/notes"
          className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
        >
          打开笔记区 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/notes"
          className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
        >
          查看全部笔记 →
        </Link>
      </div>

      {notes.map((note, index) => (
        <div
          key={`${note.updated_at}-${index}`}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            {note.words ? (
              <Link
                href={`/p/${note.words.slug}`}
                className="font-semibold text-[var(--color-accent)] hover:underline"
              >
                {note.words.lemma}
              </Link>
            ) : (
              <span className="font-semibold text-[var(--color-ink-soft)]">已删除词条</span>
            )}
            <div className="flex items-center gap-2">
              {note.version > 1 && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
                  已编辑 {note.version} 版
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)] opacity-70">
                {formatDateTime(note.updated_at)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
            {excerpt(note.content_md, 140) || "（空笔记）"}
          </p>
          {note.words && (
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/p/${note.words.slug}`}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                查看词条 →
              </Link>
              <Link
                href={`/review?focus=${note.words.slug}`}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                复习该词 →
              </Link>
            </div>
          )}
        </div>
      ))}

      {notes.length >= 5 && (
        <InsightBanner
          text={`最近笔记活跃，共 ${notes.length} 条。笔记与复习相辅相成——记录个人理解能显著提升记忆保持率。`}
          tone="cool"
        />
      )}
    </div>
  );
}
