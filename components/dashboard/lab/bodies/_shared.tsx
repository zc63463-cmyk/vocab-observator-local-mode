"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle, Info } from "lucide-react";

/* ── Shared layout primitives for dashboard section bodies ───────────
 *
 * Extracted so every body uses the same spacing, border radius, and
 * typography scale.  Changing one token here updates every modal.
 */

/* ── Card ──────────────────────────────────────────────────────────── */
export function BodyCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 ${className}`}
    >
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/* ── Stat ──────────────────────────────────────────────────────────── */
export function BodyStat({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warm" | "cool";
  className?: string;
}) {
  const toneClasses = {
    default: "border-[var(--color-border)] bg-[var(--color-surface-soft)]",
    warm: "border-[rgba(178,87,47,0.25)] bg-[var(--color-surface-muted-warm)]",
    cool: "border-[rgba(15,111,98,0.18)] bg-[var(--color-surface-muted)]",
  };
  return (
    <div className={`rounded-2xl border p-3 ${toneClasses[tone]} ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

/* ── Mini ──────────────────────────────────────────────────────────── */
export function BodyMini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-2 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className="text-base font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

/* ── Insight Banner ────────────────────────────────────────────────── */
export type InsightTone = "cool" | "warm" | "info";

export function InsightBanner({ text, tone = "info" }: { text: string; tone?: InsightTone }) {
  const config: Record<
    InsightTone,
    {
      border: string;
      bg: string;
      text: string;
      icon: React.ReactNode;
    }
  > = {
    cool: {
      border: "border-[rgba(15,111,98,0.18)]",
      bg: "bg-[var(--color-surface-muted)]",
      text: "text-teal-700 dark:text-teal-300",
      icon: <CheckCircle size={16} className="text-teal-600 dark:text-teal-400" />,
    },
    warm: {
      border: "border-[rgba(178,87,47,0.25)]",
      bg: "bg-[var(--color-surface-muted-warm)]",
      text: "text-amber-700 dark:text-amber-400",
      icon: <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />,
    },
    info: {
      border: "border-[var(--color-border)]",
      bg: "bg-[var(--color-surface-soft)]",
      text: "text-[var(--color-ink-soft)]",
      icon: <Info size={16} className="text-[var(--color-ink-soft)]" />,
    },
  };
  const c = config[tone];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 text-sm leading-relaxed ${c.text}`}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex-shrink-0">{c.icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────────────── */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--color-ink-soft)]">{children}</p>;
}

/* ── Preamble ──────────────────────────────────────────────────────── */
export function Preamble({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-6 text-[var(--color-ink-soft)]">{children}</p>;
}

/* ── Trend Badge ───────────────────────────────────────────────────── */
export function TrendBadge({
  delta,
  inverse = false,
}: {
  delta: number; // percentage points, e.g. -0.03 = -3pp
  inverse?: boolean; // true = negative is good (e.g. Again rate going down)
}) {
  const isGood = inverse ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 0.005;
  const absPct = Math.abs(delta * 100).toFixed(0);

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-soft)]">
        <span>→</span> 持平
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isGood
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400"
      }`}
    >
      {delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {absPct}pp
    </span>
  );
}
