"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Save } from "lucide-react";

interface AnnotationModalProps {
  isOpen: boolean;
  wordId: string;
  initialContent: string;
  onClose: () => void;
  onSaved: (content: string) => void;
  onDeleted: () => void;
}

export function AnnotationModal({
  isOpen,
  wordId,
  initialContent,
  onClose,
  onSaved,
  onDeleted,
}: AnnotationModalProps) {
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(initialContent.length);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When modal opens: reset textarea to saved content, focus, resize.
  useEffect(() => {
    if (!isOpen) return;
    const el = textareaRef.current;
    if (!el) return;

    el.value = initialContent;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
    setTimeout(() => el.focus(), 100);

    // Defer char count to next tick to avoid set-state-in-effect lint
    const id = setTimeout(() => setCharCount(initialContent.length), 0);
    return () => clearTimeout(id);
  }, [isOpen, initialContent]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
    setCharCount(el.value.length);
  }, []);

  const handleSave = useCallback(async () => {
    const value = (textareaRef.current?.value ?? "").trim();
    setSaving(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_id: wordId, content: value }),
      });
      if (res.ok) {
        onSaved(value);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [wordId, onSaved, onClose]);

  const handleDelete = useCallback(async () => {
    if (!confirm("确定删除这条批注吗？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_id: wordId, content: "" }),
      });
      if (res.ok) {
        onDeleted();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [wordId, onDeleted, onClose]);

  const hasContent = charCount > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-ink)]">
                📝 批注
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-soft)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              id={`annotation-${wordId}`}
              name={`annotation-${wordId}`}
              defaultValue={initialContent}
              onInput={handleInput}
              placeholder="记录这个词给你留下的印象、联想、用法心得..."
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-6 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              rows={4}
            />

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-[var(--color-ink-faint)]">
                {hasContent ? `${charCount} 字` : "暂无内容"}
              </div>
              <div className="flex items-center gap-2">
                {initialContent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    删除
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2 text-xs text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-soft)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || (!hasContent && !initialContent)}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
                >
                  <Save size={13} />
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
