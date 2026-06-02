"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useWordbook } from "@/components/wordbook/WordbookContext";
import { buildWordDetailHref } from "@/lib/words-routing";

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

interface BatchAddResponse {
  addedCount: number;
  alreadyTrackedCount?: number;
  error?: string;
  ok: boolean;
}

interface WordSearchPanelProps {
  /** Optional query params to preserve on navigation (e.g. current filters). */
  sourceParams?: URLSearchParams;
  /** Called after a successful batch add so the parent can refresh its data. */
  onRefresh?: () => void | Promise<void>;
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

/** 考研词包含的词频子类（必备词、超纲词、基础词） */
const GAOKAO_FREQS = ["必备词", "超纲词", "基础词"];

/**
 * 词条库页面的「搜索浏览」面板。
 *
 * 支持两种交互：
 *   1. 点击词条文本区 → 跳转词条详情页（/p/:slug）
 *   2. 勾选 checkbox → 批量加入复习队列
 *
 * 自己 fetch `/api/words/untracked`，确保搜索范围覆盖整个词库。
 */
export function WordSearchPanel({
  sourceParams,
  onRefresh,
}: WordSearchPanelProps) {
  const { addToast } = useToast();
  const [words, setWords] = useState<UntrackedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<MatchMode>("contain");
  const [semanticFilter, setSemanticFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");

  const { activeWordbook } = useWordbook();
  const activeWordbookId = activeWordbook?.id;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const needle = deferredSearch.trim();

  // ── Load global untracked words ───────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const url = activeWordbookId
      ? `/api/words/untracked?wordbookId=${activeWordbookId}`
      : "/api/words/untracked";

    fetch(url, { credentials: "same-origin" })
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
  }, [activeWordbookId]);

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
      if (n !== "") {
        const textMatch =
          matches(w.lemma, n, mode) ||
          matches(w.title, n, mode) ||
          matches(w.short_definition ?? "", n, mode);
        if (!textMatch) return false;
      }
      if (semanticFilter) {
        const sf = getSemanticField(w.metadata);
        if (sf !== semanticFilter) return false;
      }
      if (freqFilter) {
        const wf = getWordFreq(w.metadata);
        if (freqFilter === "考研词") {
          if (!wf || !GAOKAO_FREQS.includes(wf)) return false;
        } else if (wf !== freqFilter) {
          return false;
        }
      }
      return true;
    });
  }, [words, needle, mode, semanticFilter, freqFilter]);

  // ── A-Z index ─────────────────────────────────────────────────────
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

  // ── Selection helpers ─────────────────────────────────────────────
  const toggle = useCallback((wordId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of visible) next.add(c.id);
      return next;
    });
  }, [visible]);

  const clearVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of visible) next.delete(c.id);
      return next;
    });
  }, [visible]);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const selectedCount = selectedIds.size;

  // ── Batch add ─────────────────────────────────────────────────────
  const handleBatchAdd = useCallback(() => {
    if (selectedCount === 0 || isPending) return;

    setIsPending(true);
    void (async () => {
      try {
        const response = await fetch("/api/review/add-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordIds: [...selectedIds],
            wordbookId: activeWordbookId,
          }),
        });
        const payload = (await response.json()) as BatchAddResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "批量添加失败");
        }

        setSelectedIds(new Set());
        await onRefresh?.();
        addToast(
          payload.alreadyTrackedCount
            ? `已将 ${payload.addedCount} 个词条加入复习，${payload.alreadyTrackedCount} 个已在复习中`
            : `已将 ${payload.addedCount} 个词条加入复习`,
          "success",
        );
      } catch (error) {
        addToast(error instanceof Error ? error.message : "批量添加失败", "error");
      } finally {
        setIsPending(false);
      }
    })();
  }, [selectedCount, isPending, selectedIds, onRefresh, addToast, activeWordbookId]);

  const isTextFiltered = needle.length > 0;
  const isFacetFiltered = semanticFilter !== "" || freqFilter !== "";
  const isFiltered = isTextFiltered || isFacetFiltered;
  const showHighlight = needle.length > 0;

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
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="panel rounded-[1.75rem] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          搜索浏览
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
          在全局未追踪词条中搜索
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          点击词条可跳转详情页浏览；勾选后可批量加入复习队列。
        </p>
      </div>

      {/* ── Search controls ─────────────────────────────────────────── */}
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
                  : "输入关键词搜索…"
            }
            aria-label="搜索词条"
            className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-5 pr-12 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
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
          <div className="relative">
            <select
              value={semanticFilter}
              onChange={(e) => setSemanticFilter(e.target.value)}
              aria-label="按语义场筛选"
              className="w-full appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-4 pr-10 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="">全部语义场</option>
              {semanticOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-soft)]"
              viewBox="0 0 16 16" fill="none"
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="relative">
            <select
              value={freqFilter}
              onChange={(e) => setFreqFilter(e.target.value)}
              aria-label="按词频层级筛选"
              className="w-full appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-4 pr-10 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="">全部词频</option>
              {GAOKAO_FREQS.some((g) => freqOptions.includes(g)) && (
                <option value="考研词">考研词</option>
              )}
              {freqOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-soft)]"
              viewBox="0 0 16 16" fill="none"
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
                mode === "prefix" && needle.length === 1 && needle.toUpperCase() === letter
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Stats + selection actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-soft)]">
          <span>
            全局共 <strong className="text-[var(--color-ink)]">{words.length}</strong> 个未追踪
            {isFiltered && (
              <>
                {" · 匹配 "}<strong className="text-[var(--color-ink)]">{visible.length}</strong>{" 个"}
              </>
            )}
            {" · 已选 "}<strong className="text-[var(--color-ink)]">{selectedCount}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {isFiltered && (
              <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>清除筛选</Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={selectAllVisible} disabled={visible.length === 0}>
              全选当前
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearVisible} disabled={visible.length === 0}>
              取消当前
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={selectedCount === 0}>
              清空全部
            </Button>
          </div>
        </div>
      </div>

      {/* Quick "select all & add" banner */}
      {isFiltered && visible.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-2.5">
          <span className="text-xs text-[var(--color-ink-soft)]">
            当前筛选共 <strong className="text-[var(--color-accent)]">{visible.length}</strong> 个词条
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              for (const w of visible) {
                if (!selectedIds.has(w.id)) toggle(w.id);
              }
            }}
          >
            全选当前
          </Button>
        </div>
      )}

      {/* Word list */}
      <div className="panel rounded-[1.75rem] p-2 sm:p-3">
        <WordList
          visible={visible}
          isFiltered={isFiltered}
          isTextFiltered={isTextFiltered}
          needle={needle}
          mode={mode}
          semanticFilter={semanticFilter}
          freqFilter={freqFilter}
          selectedIds={selectedIds}
          onToggle={toggle}
          showHighlight={showHighlight}
          clearAllFilters={clearAllFilters}
          sourceParams={sourceParams}
        />
      </div>

      {/* Bottom action bar */}
      <div className="panel-strong rounded-full p-2 pl-5 pr-3 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--color-ink-soft)]">
            已选 <strong className="text-[var(--color-ink)]">{selectedCount}</strong> 个词条
          </span>
          <Button
            type="button"
            disabled={selectedCount === 0 || isPending}
            onClick={handleBatchAdd}
          >
            {isPending ? "处理中…" : `批量加入复习 (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Virtualised word list ─────────────────────────────────────────── */

const VIRTUOSO_THRESHOLD = 100;

interface WordListProps {
  visible: UntrackedWord[];
  isFiltered: boolean;
  isTextFiltered: boolean;
  needle: string;
  mode: MatchMode;
  semanticFilter: string;
  freqFilter: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  showHighlight: boolean;
  clearAllFilters: () => void;
  sourceParams?: URLSearchParams;
}

function WordList({
  visible,
  isFiltered,
  isTextFiltered,
  needle,
  mode,
  semanticFilter,
  freqFilter,
  selectedIds,
  onToggle,
  showHighlight,
  clearAllFilters,
  sourceParams,
}: WordListProps) {
  if (visible.length === 0 && isFiltered) {
    return (
      <div className="max-h-[360px] overflow-y-auto">
        <div className="px-3 py-8 text-center">
          <p className="text-sm text-[var(--color-ink-soft)]">
            {isTextFiltered ? (
              <>
                {mode === "prefix" && (
                  <>没有以「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」开头的词条。</>
                )}
                {mode === "suffix" && (
                  <>没有以「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」结尾的词条。</>
                )}
                {mode === "contain" && (
                  <>没有包含「<span className="font-semibold text-[var(--color-ink)]">{needle}</span>」的词条。</>
                )}
                {(semanticFilter || freqFilter) && "（在当前筛选条件下）"}
              </>
            ) : (
              <>当前筛选条件下没有匹配词条。</>
            )}
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-3 text-xs text-[var(--color-accent)] hover:underline"
          >
            清除全部筛选
          </button>
        </div>
      </div>
    );
  }

  if (visible.length <= VIRTUOSO_THRESHOLD) {
    return (
      <div className="max-h-[360px] overflow-y-auto">
        <ul className="divide-y divide-[var(--color-border)]">
          {visible.map((w) => (
            <WordListItem
              key={w.id}
              word={w}
              selectedIds={selectedIds}
              onToggle={onToggle}
              showHighlight={showHighlight}
              needle={needle}
              mode={mode}
              sourceParams={sourceParams}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="h-[360px]">
      <Virtuoso
        data={visible}
        itemContent={(_index, w) => (
          <WordListItem
            word={w}
            selectedIds={selectedIds}
            onToggle={onToggle}
            showHighlight={showHighlight}
            needle={needle}
            mode={mode}
            sourceParams={sourceParams}
          />
        )}
        style={{ height: "360px" }}
      />
    </div>
  );
}

interface WordListItemProps {
  word: UntrackedWord;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  showHighlight: boolean;
  needle: string;
  mode: MatchMode;
  sourceParams?: URLSearchParams;
}

function WordListItem({
  word: w,
  selectedIds,
  onToggle,
  showHighlight,
  needle,
  mode,
  sourceParams,
}: WordListItemProps) {
  const checked = selectedIds.has(w.id);
  const semanticField = getSemanticField(w.metadata);
  const wordFreq = getWordFreq(w.metadata);
  const href = buildWordDetailHref(w.slug, sourceParams);

  return (
    <li className={`flex items-start transition ${checked ? "bg-[var(--color-accent)]/8" : ""}`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(w.id);
        }}
        aria-pressed={checked}
        className="flex shrink-0 items-center justify-center px-3 py-3"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
            checked
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
              : "border-[var(--color-border-strong)] bg-transparent"
          }`}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      {/* Link to detail */}
      <Link
        href={href as Route}
        className="min-w-0 flex-1 px-3 py-3 text-left transition hover:bg-[var(--color-surface-soft)]"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-semibold text-[var(--color-ink)]">
            {showHighlight ? <Highlight text={w.lemma} needle={needle} mode={mode} /> : w.lemma}
          </span>
          {w.title !== w.lemma && (
            <span className="text-xs text-[var(--color-ink-soft)]">
              {showHighlight ? <Highlight text={w.title} needle={needle} mode={mode} /> : w.title}
            </span>
          )}
          {w.ipa ? <span className="text-xs text-[var(--color-ink-soft)] opacity-70">{w.ipa}</span> : null}
        </span>
        {w.short_definition && (
          <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-soft)]">
            {showHighlight ? <Highlight text={w.short_definition} needle={needle} mode={mode} /> : w.short_definition}
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
      </Link>
    </li>
  );
}
