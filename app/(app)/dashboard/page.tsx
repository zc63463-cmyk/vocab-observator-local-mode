import { LabClient } from "@/components/dashboard/lab/LabClient";
import { getDashboardSummary } from "@/lib/dashboard";
import { cookies } from "next/headers";

/**
 * Dashboard — the canonical owner-facing dashboard.
 *
 * Composition:
 *   - Mobile: compact 4-gauge instrument cluster + featured cards +
 *     9-dot gesture pattern lock that unlocks the remaining sections
 *     as modals.
 *   - Desktop: Console hero (4 circular gauges with drill-down +
 *     sparklines) → pattern-lock playground + editorial narrative →
 *     Observation Deck (mastery network + forecast calendar side-by-
 *     side) → bento grid of secondary readings.
 *
 * Data comes from `getDashboardSummary()`; auth is inherited from
 * `(app)/layout.tsx` via `requireOwnerUser()`, so no extra gate is
 * needed at this level.
 *
 * Evolution: the previous dense panel-blur grid used to live here
 * before being retired in favour of this design. The experimental
 * `/dashboard/lab` route that incubated this work has been folded in.
 */
export default async function DashboardPage() {
  let summary: Awaited<ReturnType<typeof getDashboardSummary>>;
  try {
    const cookieStore = await cookies();
    const wordbookId = cookieStore.get("wordbook-id")?.value;
    summary = await getDashboardSummary(wordbookId);
  } catch (err) {
    return (
      <div className="space-y-6">
        <header className="panel-strong rounded-[2rem] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
            Dashboard
          </p>
          <h1 className="section-title mt-2 text-3xl font-semibold sm:text-4xl">
            学习仪表盘
          </h1>
        </header>

        <div className="panel rounded-[1.75rem] p-8 text-sm leading-7 text-[var(--color-ink-soft)]">
          <p className="font-semibold text-[var(--color-ink)]">
            Dashboard 数据加载失败
          </p>
          <p className="mt-2">
            数据库连接暂时不可用。这通常是本地 Docker 容器的瞬时问题，刷新页面即可恢复。
          </p>
          <pre className="mt-3 rounded-lg bg-[var(--color-surface-soft)] p-3 text-xs tabular-nums">
            {err instanceof Error ? err.message : String(err)}
          </pre>
          <a
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            刷新页面
          </a>
        </div>
      </div>
    );
  }

  if (!summary.configured) {
    return (
      <div className="panel rounded-[1.75rem] p-8 text-sm leading-7 text-[var(--color-ink-soft)]">
        Dashboard 数据不可用 —— 本地数据库未配置。请确保 `.env.local` 中设置了 `DATABASE_URL` 并运行 `npm run db:setup`。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="panel-strong rounded-[2rem] p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
          Dashboard
        </p>
        <h1 className="section-title mt-2 text-3xl font-semibold sm:text-4xl">
          学习仪表盘
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
          gauge 读数给出当下，sparkline 勾勒趋势，Observation Deck 把
          快速入口与记忆拓扑并置。手机端用 9-dot 手势密码锁解锁更多视图。
        </p>
      </header>

      <LabClient summary={summary} />
    </div>
  );
}
