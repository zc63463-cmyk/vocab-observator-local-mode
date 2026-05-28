"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="panel-strong max-w-lg rounded-[2rem] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          Something went wrong
        </p>
        <h2 className="section-title mt-3 text-3xl font-semibold">页面出了点问题</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--color-ink-soft)]">
          当前页面加载时遇到了错误。你可以重试当前视图，或者先返回首页继续使用其他页面。
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-[var(--color-surface-muted-warm)] p-4 text-left text-xs text-[var(--color-accent-2)]">
            {error.message}
            {error.digest ? `\n(digest: ${error.digest})` : ""}
          </pre>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <Button type="button" onClick={() => reset()} variant="secondary">
            重试
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            返回仪表盘
          </Link>
        </div>
      </div>
    </div>
  );
}
