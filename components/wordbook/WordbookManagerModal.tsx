"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, BookMarked, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWordbook } from "./WordbookContext";

export function WordbookManagerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { wordbooks, refreshWordbooks, activeWordbook, setActiveWordbookId } = useWordbook();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/wordbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        await refreshWordbooks();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个词本吗？相关学习进度将被清除。")) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/wordbooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeWordbook?.id === id) {
          const remaining = wordbooks.filter((w) => w.id !== id);
          const fallback = remaining.find((w) => w.is_default) ?? remaining[0];
          if (fallback) {
            setActiveWordbookId(fallback.id);
          }
        }
        await refreshWordbooks();
      }
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-20 sm:p-6 md:p-8 md:pt-24"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative flex max-h-[calc(100dvh-8rem)] w-full max-w-lg flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-lg font-semibold">管理词本</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-glass-hover)] hover:text-[var(--color-ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {/* Create form */}
              <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-3">
                <p className="text-xs font-medium text-[var(--color-ink-soft)]">新建词本</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="词本名称"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  maxLength={100}
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述（可选）"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  maxLength={500}
                />
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !name.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  创建
                </button>
              </div>

              {/* List */}
              <div className="space-y-1.5">
                {wordbooks.map((wb) => (
                  <div
                    key={wb.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookMarked className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{wb.name}</p>
                        <p className="text-xs text-[var(--color-ink-soft)]">
                          {wb.word_count} 词 · {wb.progress_count} 在复习
                          {wb.is_default && " · 默认"}
                        </p>
                      </div>
                    </div>
                    {!wb.is_default && (
                      <button
                        onClick={() => handleDelete(wb.id)}
                        disabled={isDeleting === wb.id}
                        className="ml-2 shrink-0 rounded p-1.5 text-[var(--color-ink-soft)] transition-colors hover:bg-red-100 hover:text-red-600"
                      >
                        {isDeleting === wb.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
