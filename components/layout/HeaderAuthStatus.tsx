"use client";

import { LOCAL_OWNER } from "@/lib/local-owner";
import { Badge } from "@/components/ui/Badge";

export function HeaderAuthStatus() {
  return (
    <div className="hidden items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-2 sm:flex">
      <Badge>Owner active</Badge>
      <div className="text-right">
        <p className="text-sm font-semibold">{LOCAL_OWNER.email}</p>
        <p className="text-xs text-[var(--color-ink-soft)]">Local study layer active</p>
      </div>
    </div>
  );
}
