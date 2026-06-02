"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type MatchMode = "contain" | "prefix" | "suffix" | "morph-prefix" | "morph-suffix";

interface FreeZenCandidate {
  id: string;
  slug: string;
  title: string;
  lemma: string;
  ipa: string | null;
  short_definition: string | null;
  metadata: unknown;
  prefixes?: string[];
  suffixes?: string[];
}

interface FreeZenWordPickerProps {
  candidates: ReadonlyArray<FreeZenCandidate>;
  onStart: (selectedIds: string[]) => void;
  onExit: () => void;
}

function getSemanticField(metadata: unknown): string | null {
  return (
    typeof metadata === "object" &&
    metadata &&
    "semantic_field" in metadata
      ? String(metadata.semantic_field)
      : null
  );
}

function cleanMorphNeedle(needle: string, mode: MatchMode): string {
  let n = needle.trim().toLowerCase();
  if (mode === "morph-prefix") n = n.replace(/-$/, "");
  if (mode === "morph-suffix") n = n.replace(/^-/, "");
  return n;
}

function matches(
  text: string,
  needle: string,
  mode: MatchMode,
): boolean {
  const t = text.toLowerCase();
  const n = needle.toLowerCase();
  switch (mode) {
    case "prefix":
      return t.startsWith(n);
    case "suffix":
      return t.endsWith(n);
    default:
      return t.includes(n);
  }
}

function matchesMorph(
  parts: string[] | undefined,
  needle: string,
): boolean {
  if (!parts || parts.length === 0) return false;
  const n = needle.toLowerCase();
  return parts.some((p) => p.toLowerCase().includes(n));
}

/**
 * Highlight matching substring in text.
 */
function Highlight({
  text,
  needle,
  mode,
}: {
  text: string;
  needle: string;
  mode: MatchMode;
}) {
  if (!needle) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();

  let startIdx: number;
  switch (mode) {
    case "prefix":
      startIdx = 0;
      break;
    case "suffix":
      startIdx = lowerText.length - lowerNeedle.length;
      if (startIdx < 0) startIdx = lowerText.indexOf(lowerNeedle);
      break;
    default:
      startIdx = lowerText.indexOf(lowerNeedle);
  }

  if (startIdx === -1) return <>{text}</>;
  const endIdx = startIdx + needle.length;

  return (
    <>
      {text.slice(0, startIdx)}
      <mark
        className="rounded px-0.5 font-semibold"
        style={{
          backgroundColor: "var(--color-accent)",
          color: "white",
        }}
      >
        {text.slice(startIdx, endIdx)}
      </mark>
      {text.slice(endIdx)}
    </>
  );
}

const MODE_CONFIG: { id: MatchMode; label: string }[] = [
  { id: "contain", label: "包含" },
  { id: "prefix", label: "前缀" },
  { id: "suffix", label: "后缀" },
  { id: "morph-prefix", label: "词缀前缀" },
  { id: "morph-suffix", label: "词缀后缀" },
];

/**
 * Word picker for Free Zen Review mode.
 *
 * Search modes:
 *   - 包含 (contain): substring anywhere
 *   - 前缀 (prefix): starts with needle
 *   - 后缀 (suffix): ends with needle
 *
 * Quick actions:
 *   - A-Z letter index: one-click filter by first letter
 *   - "全选并复习": select all visible + start immediately
 */
export function FreeZenWordPicker({ candidates, onStart, onExit }: FreeZenWordPickerProps) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<MatchMode>("contain");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const deferredSearch = useDeferredValue(search);
  const needle = deferredSearch.trim();

  // ── Filtering ─────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const n = needle.toLowerCase();
    if (n === "") return candidates.slice();

    if (mode === "morph-prefix") {
      const clean = cleanMorphNeedle(needle, "morph-prefix");
      return candidates.filter((c) => matchesMorph(c.prefixes, clean));
    }
    if (mode === "morph-suffix") {
      const clean = cleanMorphNeedle(needle, "morph-suffix");
      return candidates.filter((c) => matchesMorph(c.suffixes, clean));
    }

    return candidates.filter((c) => {
      return (
        matches(c.lemma, n, mode) ||
        matches(c.title, n, mode) ||
        matches(c.short_definition ?? "", n, mode)
      );
    });
  }, [candidates, needle, mode]);

  // ── A-Z index (only letters that actually exist) ─────────────────
  const activeLetters = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) {
      const first = c.lemma.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) set.add(first);
    }
    return Array.from(set).sort();
  }, [candidates]);

  // ── Selection helpers ────────────────────────────────────────────
  const toggle = useCallback((wordId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) next.add(c.id);
      return next;
    });
  }, [visible]);

  const clearVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) next.delete(c.id);
      return next;
    });
  }, [visible]);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const selectedCount = selected.size;

  const handleStart = useCallback(() => {
    if (selectedCount === 0) return;
    const chosen = candidates.filter((c) => selected.has(c.id)).map((c) => c.id);
    onStart(chosen);
  }, [candidates, selected, selectedCount, onStart]);

  /** One-click: select all visible + start */
  const selectAllAndStart = useCallback(() => {
    if (visible.length === 0) return;
    const ids = visible.map((c) => c.id);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    onStart(ids);
  }, [visible, onStart]);

  /** Click a letter to prefix-filter */
  const filterByLetter = useCallback((letter: string) => {
    setMode("prefix");
    setSearch(letter.toLowerCase());
  }, []);

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="复习队列为空"
        description="当前词本的复习队列中没有任何词条。先去加入一些词吧！"
        action={
          <Button type="button" variant="secondary" size="sm" onClick={onExit}>
            返回复习页
          </Button>
        }
      />
    );
  }

  const isMorphMode = mode === "morph-prefix" || mode === "morph-suffix";
  const showHighlight = needle.length > 0 && !isMorphMode;
  const isFiltered = needle.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="panel rounded-[1.75rem] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          自由禅意复习
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
          选择要复习的词条
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          从当前复习队列中选择词条进行自由练习。自由模式下，复习不会更新你的 FSRS 进度，也不会写入复习日志。纯粹练习。
        </p>
      </div>

      {/* ── Search + Mode ───────────────────────────────────────────── */}
      <div className="panel rounded-[1.75rem] p-4 sm:p-5 space-y-3">
        {/* Search box */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={
              mode === "prefix"
                ? "输入前缀，如 ab…"
                : mode === "suffix"
                  ? "输入后缀，如 tion…"
                  : mode === "morph-prefix"
                    ? "输入词缀前缀，如 re, in, con…"
                    : mode === "morph-suffix"
                      ? "输入词缀后缀，如 tion, al, ly…"
                      : "输入关键词搜索…"
            }
            aria-label="搜索词"
            className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-4 pr-10 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              aria-label="清除搜索"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Mode pills */}
        <div className="flex flex-wrap gap-1.5">
          {MODE_CONFIG.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                mode === m.id
                  ? "border-transparent bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-soft)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* A-Z quick index (only for text modes) */}
        {mode !== "morph-prefix" && mode !== "morph-suffix" && (
          <div className="flex flex-wrap gap-1">
            {activeLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => filterByLetter(letter)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                  mode === "prefix" &&
                  needle.length === 1 &&
                  needle.toUpperCase() === letter
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Stats + actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-soft)]">
          <span>
            可选 {candidates.length} 个
            {isFiltered && (
              <>
                {" · 匹配 "}
                <strong className="text-[var(--color-ink)]">{visible.length}</strong>
                {" 个"}
              </>
            )}
            {" · 已选 "}
            <strong className="text-[var(--color-ink)]">{selectedCount}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllVisible}
              disabled={visible.length === 0}
            >
              全选当前
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearVisible}
              disabled={visible.length === 0}
            >
              取消当前
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={selectedCount === 0}
            >
              清空全部
            </Button>
          </div>
        </div>
      </div>

      {/* ── Quick "select all & start" banner ───────────────────────── */}
      {isFiltered && visible.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-2.5">
          <span className="text-xs text-[var(--color-ink-soft)]">
            当前筛选共 <strong className="text-[var(--color-accent)]">{visible.length}</strong> 个词条
          </span>
          <Button
            type="button"
            size="sm"
            onClick={selectAllAndStart}
          >
            全选并复习 →
          </Button>
        </div>
      )}

      {/* ── Word list ───────────────────────────────────────────────── */}
      <div className="panel rounded-[1.75rem] p-2 sm:p-3">
        {visible.length === 0 && isFiltered ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-[var(--color-ink-soft)]">
              {mode === "prefix" && (
                <>没有以「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」开头的词条。</>
              )}
              {mode === "suffix" && (
                <>没有以「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」结尾的词条。</>
              )}
              {mode === "contain" && (
                <>没有包含「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」的词条。</>
              )}
              {mode === "morph-prefix" && (
                <>没有包含前缀词素「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」的词条。</>
              )}
              {mode === "morph-suffix" && (
                <>没有包含后缀词素「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」的词条。</>
              )}
            </p>
            <button
              type="button"
              onClick={() => { setSearch(""); setMode("contain"); }}
              className="mt-3 text-xs text-[var(--color-accent)] hover:underline"
            >
              清除搜索
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--color-ink-soft)]">
            没有可用词条。
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {visible.map((c) => {
              const checked = selected.has(c.id);
              const semanticField = getSemanticField(c.metadata);

              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-pressed={checked}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                      checked
                        ? "bg-[var(--color-accent)]/8"
                        : "hover:bg-[var(--color-surface-soft)]"
                    }`}
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                          : "border-[var(--color-border-strong)] bg-transparent"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                          <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {showHighlight ? (
                            <Highlight text={c.lemma} needle={needle} mode={mode} />
                          ) : (
                            c.lemma
                          )}
                        </span>
                        {c.title !== c.lemma && (
                          <span className="text-xs text-[var(--color-ink-soft)]">
                            {showHighlight ? (
                              <Highlight text={c.title} needle={needle} mode={mode} />
                            ) : (
                              c.title
                            )}
                          </span>
                        )}
                        {c.ipa ? (
                          <span className="text-xs text-[var(--color-ink-soft)] opacity-70">
                            {c.ipa}
                          </span>
                        ) : null}
                      </span>
                      {c.short_definition && (
                        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-soft)]">
                          {showHighlight ? (
                            <Highlight text={c.short_definition} needle={needle} mode={mode} />
                          ) : (
                            c.short_definition
                          )}
                        </span>
                      )}
                      <span className="mt-1 flex flex-wrap gap-1">
                        {semanticField && (
                          <span className="inline-block rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--color-ink-soft)]">
                            {semanticField}
                          </span>
                        )}
                        {c.prefixes && c.prefixes.length > 0 &&
                          c.prefixes.map((pfx) => {
                            const isHit = mode === "morph-prefix" && needle.length > 0 && pfx.toLowerCase().includes(cleanMorphNeedle(needle, "morph-prefix"));
                            return (
                              <span
                                key={`pre-${pfx}`}
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${
                                  isHit
                                    ? "bg-[var(--color-accent)] text-white font-semibold"
                                    : "bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]"
                                }`}
                              >
                                {pfx}-
                              </span>
                            );
                          })}
                        {c.suffixes && c.suffixes.length > 0 &&
                          c.suffixes.map((sfx) => {
                            const isHit = mode === "morph-suffix" && needle.length > 0 && sfx.toLowerCase().includes(cleanMorphNeedle(needle, "morph-suffix"));
                            return (
                              <span
                                key={`suf-${sfx}`}
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${
                                  isHit
                                    ? "bg-[var(--color-accent)] text-white font-semibold"
                                    : "bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]"
                                }`}
                              >
                                -{sfx}
                              </span>
                            );
                          })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Sticky footer: start / exit ─────────────────────────────── */}
      <div className="sticky bottom-4 z-10">
        <div className="panel-strong rounded-full p-2 pl-4 shadow-lg backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-ink-soft)]">
              {selectedCount > 50
                ? `已选 ${selectedCount} 个 · 会是一场长途`
                : `已选 ${selectedCount} 个`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExit}
              >
                返回
              </Button>
              <Button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleStart}
              >
                开始自由复习 →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
