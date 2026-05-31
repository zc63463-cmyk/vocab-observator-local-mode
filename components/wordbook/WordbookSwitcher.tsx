"use client";

import { useState } from "react";
import { BookMarked, ChevronDown, Loader2 } from "lucide-react";
import { useWordbook } from "./WordbookContext";
import { WordbookManagerModal } from "./WordbookManagerModal";

export function WordbookSwitcher() {
  const { activeWordbook, wordbooks, isLoading, setActiveWordbookId } = useWordbook();
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="hidden items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-sm text-[var(--color-ink-soft)] md:flex">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        词本
      </div>
    );
  }

  if (wordbooks.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative hidden md:block">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-glass-hover)]"
        >
          <BookMarked className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          <span className="max-w-[120px] truncate">{activeWordbook?.name ?? "词本"}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          {activeWordbook && activeWordbook.progress_count > 0 && (
            <span className="ml-0.5 rounded-full bg-[var(--color-accent)] px-1.5 py-0 text-[10px] font-semibold text-white">
              {activeWordbook.progress_count}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
              <div className="max-h-64 overflow-y-auto py-1">
                {wordbooks.map((wb) => (
                  <button
                    key={wb.id}
                    onClick={() => {
                      setActiveWordbookId(wb.id);
                      setOpen(false);
                      window.location.reload();
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-glass-hover)] ${
                      wb.id === activeWordbook?.id ? "bg-[var(--color-surface-glass-hover)] font-medium text-[var(--color-accent)]" : "text-[var(--color-ink)]"
                    }`}
                  >
                    <span className="truncate">{wb.name}</span>
                    <span className="shrink-0 text-xs text-[var(--color-ink-soft)]">
                      {wb.word_count}词
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--color-border)] px-3 py-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setManagerOpen(true);
                  }}
                  className="w-full text-left text-xs text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-accent)]"
                >
                  管理词本 →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <WordbookManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
}
