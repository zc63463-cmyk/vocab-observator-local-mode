"use client";

import { PATTERNS, SECTION_META, type SectionId } from "./sections";

/**
 * Tiered group configuration.
 */
const TIER_CONFIG = [
  {
    label: "核心指标",
    sublabel: "4 项 · L 系手势 · 高触觉成就",
    count: 4,
    borderColor: "var(--color-accent)",
    bgTint: "rgba(15, 111, 98, 0.03)",
  },
  {
    label: "战略概览",
    sublabel: "2 项 · 对角线 · 中触觉成就",
    count: 2,
    borderColor: "var(--color-accent-2)",
    bgTint: "rgba(200, 160, 80, 0.03)",
  },
  {
    label: "详细数据",
    sublabel: "6 项 · 横竖线 · 低触觉成就",
    count: 6,
    borderColor: "var(--color-border-strong)",
    bgTint: "transparent",
  },
] as const;

/** Pre-computed tier slices so we never mutate `offset` during render. */
const TIERS = (() => {
  let offset = 0;
  return TIER_CONFIG.map((tier) => {
    const patterns = PATTERNS.slice(offset, offset + tier.count);
    offset += tier.count;
    return { ...tier, patterns };
  });
})();

/**
 * SectionDirectory — clickable index of every patterned dashboard
 * section, now organised by Tier.
 *
 * **Visual idiom.** This component is intentionally rendered in the
 * exact same Console aesthetic as `InstrumentCluster`: `panel-strong`
 * shell, accent halo at the top, secondary halo in the bottom-right
 * corner, and a 4-pixel scan-line texture overlay. Reading the two
 * panels in sequence should feel like reading two adjacent gauges on
 * the same instrument — one ("Cluster") shows numeric truth at a
 * glance, the other ("Directory") shows topological access to all the
 * other readings. Mirroring the chrome reinforces that pairing.
 *
 * **Why this exists.**
 * The desktop layout deliberately exposes only three living surfaces
 * inline (Cluster, Mastery Network, Pattern Lock). Every other section
 * is reachable via either a gauge drill-down (4 routes) or by drawing
 * the matching gesture on the lock (12 routes). For first-time
 * visitors and keyboard users those affordances are not enough on
 * their own, so this directory provides an explicit clickable index
 * of all 12 patterned sections — a flat sitemap.
 *
 * **Cell anatomy.** Cells have *no* internal border or background.
 * They float on the panel-strong shell and are separated only by
 * whitespace, mirroring how each `CircularGauge` floats inside the
 * cluster. Hover paints a faint warm tint so the click target is
 * still discoverable.
 *
 *   - eyebrow: lowercase tracking-wide editorial label, top-left
 *   - title:   bold Chinese section name, second line
 *   - glyph:   pattern shape (e.g. `┗`) as a faint watermark in the
 *              upper-right; opacity 25 → 60 on hover. Reinforces the
 *              gesture↔section association so users gradually
 *              internalise the lock shortcuts.
 *
 * **Tier grouping.** PATTERNS is already ordered by tier
 * (4 L-rotations → 2 diagonals → 6 lines). We slice it into three
 * visual groups, each with a subtle tinted background and coloured
 * top border that signals importance without adding clutter.
 *
 * **Why not include `mastery-network` and `forecast-calendar`?**
 *   - `mastery-network` is the always-on featured surface and lives
 *     directly above this directory; listing it again would be
 *     redundant.
 *   - `forecast-calendar` has no gesture pattern (it's a gauge-only
 *     drill-down from the DUE TODAY gauge); including it here would
 *     leave a card with no glyph and break the visual rhythm.
 */
export interface SectionDirectoryProps {
  onOpenSection: (id: SectionId) => void;
}

export function SectionDirectory({ onOpenSection }: SectionDirectoryProps) {
  return (
    <section className="panel-strong relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
      {/* Ambient halo gradients — pure decoration, marked aria-hidden.
          Recipe and dimensions copied verbatim from InstrumentCluster
          so the two console panels feel like the same instrument
          family. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[120%] -translate-x-1/2 opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-accent), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--color-accent-2)" }}
      />

      {/* Subtle scan-line texture — drives the "instrument console"
          feel without overwhelming the readings. Pure CSS gradient,
          no images. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--color-ink) 0 1px, transparent 1px 4px)",
        }}
      />

      <div className="relative">
        {/* Header — eyebrow left + status right, identical rhythm to
            the InstrumentCluster header. */}
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
            Directory
          </p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)] opacity-60">
            12 section · 点击或绘制图案进入
          </p>
        </div>

        {/* Tiered groups — PATTERNS is already ordered by tier, so we
            slice into three contiguous runs. */}
        <div className="mt-6 space-y-4">
          {TIERS.map((tier) => (
            <div
              key={tier.label}
              className="rounded-xl border border-[var(--color-border)] p-3 sm:p-4"
              style={{
                borderTopWidth: "2px",
                borderTopColor: tier.borderColor,
                background: tier.bgTint,
              }}
            >
              {/* Tier header */}
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: tier.borderColor }}
                >
                  {tier.label}
                </p>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)] opacity-50">
                  {tier.sublabel}
                </p>
              </div>

              {/* Cell grid for this tier */}
              <ul
                className={`grid gap-3 ${
                  tier.count <= 2
                    ? "grid-cols-2 md:grid-cols-2"
                    : tier.count <= 4
                      ? "grid-cols-2 md:grid-cols-2 xl:grid-cols-4"
                      : "grid-cols-2 md:grid-cols-3 xl:grid-cols-3"
                }`}
              >
                {tier.patterns.map((pattern) => {
                  const meta = SECTION_META[pattern.sectionId];
                  return (
                    <li key={pattern.key}>
                      <button
                        type="button"
                        onClick={() => onOpenSection(pattern.sectionId)}
                        aria-label={`打开 ${meta.title}（手势：${pattern.name}）`}
                        className="group relative block w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--color-surface-soft)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-panel-strong)]"
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute right-2 top-1 select-none font-mono text-[22px] leading-none text-[var(--color-ink-soft)] opacity-15 transition-opacity duration-300 group-hover:opacity-40"
                        >
                          {pattern.glyph}
                        </span>
                        <p className="line-clamp-1 pr-7 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
                          {meta.eyebrow}
                        </p>
                        <p className="section-title mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-ink)]">
                          {meta.title}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
