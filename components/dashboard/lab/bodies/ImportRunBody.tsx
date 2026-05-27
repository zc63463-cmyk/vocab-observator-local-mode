"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import type { DashboardSummary } from "../types";
import { BodyStat, InsightBanner } from "./_shared";

interface ImportRunBodyProps {
  summary: Pick<DashboardSummary, "importOverview">;
}

/**
 * Pure body for the import-run section.
 * Surfaces the latest vault sync run + any recent errors so vault
 * pipeline rot can't quietly stale the corpus.
 *
 * Layout: status → stat cards → timeline → data delta → error log
 */
export function ImportRunBody({ summary }: ImportRunBodyProps) {
  const overview = summary.importOverview;

  if (!overview.available) {
    return (
      <p className="text-sm text-[var(--color-ink-soft)]">
        Import 跟踪表尚未启用。运行 <code className="text-xs">0003_import_tracking.sql</code> 后即可看到运行历史。
      </p>
    );
  }

  if (!overview.latestRun) {
    return (
      <p className="text-sm text-[var(--color-ink-soft)]">
        还没有 import 历史。下次 <code className="text-xs">/api/imports/github</code> 运行将创建首条记录。
      </p>
    );
  }

  const run = overview.latestRun;
  const isError = run.status === "completed_with_errors" || run.status === "failed";
  const isRunning = run.status === "running";

  const statusLabel: Record<string, string> = {
    completed: "已完成",
    "completed_with_errors": "完成（含错误）",
    failed: "失败",
    running: "进行中",
  };

  const durationMs = useMemo(() => {
    if (!run.finished_at) return null;
    const start = new Date(run.started_at).getTime();
    const end = new Date(run.finished_at).getTime();
    const diff = end - start;
    if (diff < 0 || !Number.isFinite(diff)) return null;
    return diff;
  }, [run.started_at, run.finished_at]);

  const durationLabel = useMemo(() => {
    if (durationMs == null) return isRunning ? "进行中" : "—";
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (minutes < 60) return `${minutes}m ${rem}s`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return `${hours}h ${remMin}m`;
  }, [durationMs, isRunning]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-6 text-[var(--color-ink-soft)]">
          保持同步管线可见，避免源文件损坏或局部失败悄悄陈旧化语料。
        </p>
        <Badge tone={isError ? "warm" : "default"}>
          {statusLabel[run.status] ?? run.status}
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <BodyStat label="新建" value={run.created_count} tone="default" />
        <BodyStat label="更新" value={run.updated_count} tone="default" />
        <BodyStat
          label="错误"
          value={run.error_count}
          tone={run.error_count > 0 ? "warm" : "default"}
        />
      </div>

      {/* Timeline */}
      <TimelineCard
        startedAt={run.started_at}
        finishedAt={run.finished_at}
        durationLabel={durationLabel}
        isRunning={isRunning}
      />

      {/* Data delta */}
      <div className="grid grid-cols-3 gap-3">
        <MiniDelta label="已导入" value={run.imported_count} />
        <MiniDelta label="未变化" value={run.unchanged_count} />
        <MiniDelta label="软删除" value={run.soft_deleted_count} />
      </div>

      {/* Error log */}
      {overview.recentErrors.length > 0 && (
        <ErrorLog errors={overview.recentErrors} />
      )}
    </div>
  );
}

/* ── Timeline ──────────────────────────────────────────────────────── */

function TimelineCard({
  startedAt,
  finishedAt,
  durationLabel,
  isRunning,
}: {
  startedAt: string;
  finishedAt: string | null;
  durationLabel: string;
  isRunning: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
        运行时间线
      </p>

      <div className="mt-4 flex items-center gap-2">
        {/* Start node */}
        <NodeLabel
          label="开始"
          time={formatDateTime(startedAt)}
          active
          tone="cool"
        />

        {/* Connector */}
        <div className="flex flex-1 flex-col items-center">
          <div className="relative h-px w-full">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--color-border) 0 4px, transparent 4px 8px)",
              }}
            />
          </div>
          <span className="mt-1.5 text-[10px] font-medium tracking-wider text-[var(--color-ink-soft)]">
            {durationLabel}
          </span>
        </div>

        {/* End node */}
        <NodeLabel
          label={isRunning ? "进行中" : "完成"}
          time={finishedAt ? formatDateTime(finishedAt) : "—"}
          active={!isRunning}
          tone={isRunning ? "default" : "cool"}
        />
      </div>
    </div>
  );
}

function NodeLabel({
  label,
  time,
  active,
  tone,
}: {
  label: string;
  time: string;
  active: boolean;
  tone: "cool" | "default";
}) {
  const dotColor =
    tone === "cool"
      ? "bg-[var(--color-accent)]"
      : "bg-[var(--color-ink-soft)]";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${dotColor} ${
            active ? "opacity-100" : "opacity-40"
          }`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
          {label}
        </span>
      </div>
      <span className="text-xs tabular-nums text-[var(--color-ink)]">{time}</span>
    </div>
  );
}

/* ── Mini delta ────────────────────────────────────────────────────── */

function MiniDelta({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

/* ── Error log ─────────────────────────────────────────────────────── */

function ErrorLog({
  errors,
}: {
  errors: Array<{
    id: string;
    error_stage: string;
    source_path: string | null;
    error_message: string;
  }>;
}) {
  const [expanded, setExpanded] = useState(true);

  // Group by severity inferred from stage name
  const grouped = useMemo(() => {
    const severe: typeof errors = [];
    const warn: typeof errors = [];
    for (const e of errors) {
      const stage = e.error_stage.toLowerCase();
      if (
        stage.includes("write") ||
        stage.includes("insert") ||
        stage.includes("update") ||
        stage.includes("db") ||
        stage.includes("database")
      ) {
        severe.push(e);
      } else {
        warn.push(e);
      }
    }
    return { severe, warn };
  }, [errors]);

  const total = errors.length;
  const severeCount = grouped.severe.length;

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          近期错误
          <span className="ml-1.5 inline-block rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] tabular-nums">
            {total}
          </span>
          {severeCount > 0 && (
            <span className="ml-1.5 inline-block rounded-full bg-[var(--color-surface-muted-warm)] px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-400">
              {severeCount} 严重
            </span>
          )}
        </p>
        <span className="text-xs text-[var(--color-ink-soft)]">
          {expanded ? "收起 ↑" : "展开 ↓"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2.5">
          {grouped.severe.length > 0 && (
            <div className="space-y-2">
              {grouped.severe.map((entry) => (
                <ErrorCard key={entry.id} entry={entry} severity="severe" />
              ))}
            </div>
          )}
          {grouped.warn.length > 0 && (
            <div className="space-y-2">
              {grouped.warn.map((entry) => (
                <ErrorCard key={entry.id} entry={entry} severity="warn" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorCard({
  entry,
  severity,
}: {
  entry: {
    id: string;
    error_stage: string;
    source_path: string | null;
    error_message: string;
  };
  severity: "severe" | "warn";
}) {
  const border =
    severity === "severe"
      ? "border-[rgba(178,87,47,0.3)]"
      : "border-[rgba(178,87,47,0.15)]";
  const bg =
    severity === "severe"
      ? "bg-[var(--color-surface-muted-warm)]"
      : "bg-[var(--color-surface-soft)]";
  const icon = severity === "severe" ? "❌" : "⚠️";

  return (
    <div className={`rounded-2xl border ${border} ${bg} p-4`}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex-shrink-0 text-sm">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-md bg-[var(--color-panel)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
              {entry.error_stage}
            </span>
            <span className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {entry.source_path ?? "pipeline"}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-[var(--color-ink-soft)]">
            {entry.error_message}
          </p>
        </div>
      </div>
    </div>
  );
}
