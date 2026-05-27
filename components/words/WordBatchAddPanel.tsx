"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

interface UntrackedWord {
  id: string;
  slug: string;
  title: string;
  lemma: string;
  ipa: string | null;
  short_definition: string | null;
  metadata: unknown;
}

type MatchMode = "contain" | "prefix" | "suffix";

interface WordBatchAddPanelProps {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onBatchAdd: () => void;
  isPending: boolean;
}

/* ── Metadata helpers ──────────────────────────────────────────────── */
function getSemanticField(metadata: unknown): string | null {
  return (
    typeof metadata === "object" &&
    metadata &&
    "semantic_field" in metadata
      ? String(metadata.semantic_field)
      : null
  );
}

function getWordFreq(metadata: unknown): string | null {
  return (
    typeof metadata === "object" &&
    metadata &&
    "word_freq" in metadata
      ? String(metadata.word_freq)
      : null
  );
}

/* ── Text matching ─────────────────────────────────────────────────── */
function matches(text: string, needle: string, mode: MatchMode): boolean {
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

/* ── Highlight ─────────────────────────────────────────────────────── */
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
];

/**
 * 嵌入词条库页面的「搜索加入」面板。
 *
 * 关键设计：不从父组件接收 words，而是自己 fetch `/api/words/untracked`，
 * 确保搜索范围覆盖**整个词库**中未加入复习的词条，而非仅当前分页已加载的 subset。
 *
 * 筛选维度（AND 关系）：
 *   1. 文本搜索（前缀 / 后缀 / 包含）
 *   2. 语义场（从 metadata.semantic_field 提取）
 *   3. 词频层级（从 metadata.word_freq 提取）
 */
export function WordBatchAddPanel({
  selectedIds,
  onToggle,
  onBatchAdd,
  isPending,
}: WordBatchAddPanelProps) {
  const [words, setWords] = useState<UntrackedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<MatchMode>("contain");
  const [semanticFilter, setSemanticFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");

  const deferredSearch = useDeferredValue(search);
  const needle = deferredSearch.trim();

  // ── Load global untracked words ───────────────────────────────────
  useEffect(() => {
    let mounted = true;

    fetch("/api/words/untracked", { credentials: "same-origin" })
      .then(async (res) => {
        const payload = (await res.json()) as { items?: UntrackedWord[]; error?: string };
        if (!mounted) return;
        if (!res.ok) {
          throw new Error(payload.error ?? "加载未追踪词条失败");
        }
        setWords(payload.items ?? []);
      })
      .catch((err) => {
        if (!mounted) return;
        setFetchError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  // ── Extract facet options from loaded words ───────────────────────
  const { semanticOptions, freqOptions } = useMemo(() => {
    const semantics = new Set<string>();
    const freqs = new Set<string>();
    for (const w of words) {
      const sf = getSemanticField(w.metadata);
      const wf = getWordFreq(w.metadata);
      if (sf) semantics.add(sf);
      if (wf) freqs.add(wf);
    }
    return {
      semanticOptions: Array.from(semantics).sort((a, b) => a.localeCompare(b)),
      freqOptions: Array.from(freqs).sort((a, b) => a.localeCompare(b)),
    };
  }, [words]);

  // ── Client-side filtering (text + semantic + freq) ────────────────
  const visible = useMemo(() => {
    const n = needle.toLowerCase();
    return words.filter((w) => {
      // Text filter
      if (n !== "") {
        const textMatch =
          matches(w.lemma, n, mode) ||
          matches(w.title, n, mode) ||
          matches(w.short_definition ?? "", n, mode);
        if (!textMatch) return false;
      }
      // Semantic field filter
      if (semanticFilter) {
        const sf = getSemanticField(w.metadata);
        if (sf !== semanticFilter) return false;
      }
      // Word freq filter
      if (freqFilter) {
        const wf = getWordFreq(w.metadata);
        if (wf !== freqFilter) return false;
      }
      return true;
    });
  }, [words, needle, mode, semanticFilter, freqFilter]);

  // ── A-Z index (based on currently filtered words, not all) ────────
  const activeLetters = useMemo(() => {
    const set = new Set<string>();
    for (const w of words) {
      const first = w.lemma.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) set.add(first);
    }
    return Array.from(set).sort();
  }, [words]);

  const filterByLetter = useCallback((letter: string) => {
    setMode("prefix");
    setSearch(letter.toLowerCase());
  }, []);

  const selectedCount = selectedIds.size;
  const isTextFiltered = needle.length > 0;
  const isFacetFiltered = semanticFilter !== "" || freqFilter !== "";
  const isFiltered = isTextFiltered || isFacetFiltered;
  const showHighlight = needle.length > 0;

  const handleSelectAllVisible = useCallback(() => {
    for (const w of visible) {
      if (!selectedIds.has(w.id)) onToggle(w.id);
    }
  }, [visible, selectedIds, onToggle]);

  const handleClearVisible = useCallback(() => {
    for (const w of visible) {
      if (selectedIds.has(w.id)) onToggle(w.id);
    }
  }, [visible, selectedIds, onToggle]);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setMode("contain");
    setSemanticFilter("");
    setFreqFilter("");
  }, []);

  // ── Loading / Error / Empty ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">正在加载全局未追踪词条…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-xl border border-[var(--color-accent-2)]/30 bg-[var(--color-surface-muted-warm)] px-4 py-6 text-center">
        <p className="text-sm text-[var(--color-accent-2)]">{fetchError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
        >
          刷新重试
        </button>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-ink-soft)]">
        太棒了！所有已发布词条都已加入复习队列。
      </p>
    );
  }

  return (
    <div className="space-y-3">
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
                : "输入关键词搜索…"
          }
          aria-label="搜索要加入复习的词条"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-4 pr-10 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            aria-label="清除搜索"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

      {/* Facet filters: semantic + freq */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Semantic field */}
        <div className="relative">
          <select
            value={semanticFilter}
            onChange={(e) => setSemanticFilter(e.target.value)}
            aria-label="按语义场筛选"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-4 pr-10 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value="">全部语义场</option>
            {semanticOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-soft)]"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Word freq */}
        <div className="relative">
          <select
            value={freqFilter}
            onChange={(e) => setFreqFilter(e.target.value)}
            aria-label="按词频层级筛选"
            className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-4 pr-10 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value="">全部词频</option>
            {freqOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-soft)]"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* A-Z quick index */}
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

      {/* Stats + quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-soft)]">
        <span>
          全局共{" "}
          <strong className="text-[var(--color-ink)]">{words.length}</strong>{" "}
          个未追踪
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
          {isFiltered && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-accent-2)] hover:bg-[var(--color-surface-soft)]"
            >
              清除筛选
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectAllVisible}
            disabled={visible.length === 0}
            className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface-soft)] disabled:opacity-40"
          >
            全选当前
          </button>
          <button
            type="button"
            onClick={handleClearVisible}
            disabled={visible.length === 0}
            className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-soft)] disabled:opacity-40"
          >
            取消当前
          </button>
        </div>
      </div>

      {/* Quick "select all & add" banner */}
      {isFiltered && visible.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-2.5">
          <span className="text-xs text-[var(--color-ink-soft)]">
            当前筛选共{" "}
            <strong className="text-[var(--color-accent)]">{visible.length}</strong>{" "}
            个词条
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              for (const w of visible) {
                if (!selectedIds.has(w.id)) onToggle(w.id);
              }
              onBatchAdd();
            }}
          >
            全选并加入 →
          </Button>
        </div>
      )}

      {/* Compact word list */}
      <div className="max-h-[360px] overflow-y-auto rounded-xl border border-[var(--color-border)]">
        {visible.length === 0 && isFiltered ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-[var(--color-ink-soft)]">
              {isTextFiltered ? (
                <>
                  没有
                  {mode === "prefix" && "以"}
                  {mode === "suffix" && "以"}
                  {mode === "contain" && "包含"}
                  「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」
                  {mode === "prefix" && "开头"}
                  {mode === "suffix" && "结尾"}
                  的词条
                  {isFacetFiltered && "（在当前筛选条件下）"}
                  。
                </>
              ) : (
                <>当前筛选条件下没有匹配词条。</>
              )}
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
            >
              清除全部筛选
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {visible.map((w) => {
              const checked = selectedIds.has(w.id);
              const semanticField = getSemanticField(w.metadata);
              const wordFreq = getWordFreq(w.metadata);

              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(w.id)}
                    aria-pressed={checked}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                      checked
                        ? "bg-[var(--color-accent)]/8"
                        : "hover:bg-[var(--color-surface-soft)]"
                    }`}
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {/* Checkbox */}
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

                    {/* Content */}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {showHighlight ? (
                            <Highlight text={w.lemma} needle={needle} mode={mode} />
                          ) : (
                            w.lemma
                          )}
                        </span>
                        {w.title !== w.lemma && (
                          <span className="text-xs text-[var(--color-ink-soft)]">
                            {showHighlight ? (
                              <Highlight text={w.title} needle={needle} mode={mode} />
                            ) : (
                              w.title
                            )}
                          </span>
                        )}
                        {w.ipa ? (
                          <span className="text-xs text-[var(--color-ink-soft)] opacity-70">
                            {w.ipa}
                          </span>
                        ) : null}
                      </span>
                      {w.short_definition && (
                        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-soft)]">
                          {showHighlight ? (
                            <Highlight text={w.short_definition} needle={needle} mode={mode} />
                          ) : (
                            w.short_definition
                          )}
                        </span>
                      )}
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {semanticField && (
                          <span className="inline-block rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--color-ink-soft)]">
                            {semanticField}
                          </span>
                        )}
                        {wordFreq && (
                          <span className="inline-block rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] text-[var(--color-ink-soft)]">
                            {wordFreq}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3">
        <span className="text-sm text-[var(--color-ink-soft)]">
          已选 <strong className="text-[var(--color-ink)]">{selectedCount}</strong> 个词条
        </span>
        <Button
          type="button"
          disabled={selectedCount === 0 || isPending}
          onClick={onBatchAdd}
        >
          {isPending ? "处理中…" : `批量加入复习 (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
}
