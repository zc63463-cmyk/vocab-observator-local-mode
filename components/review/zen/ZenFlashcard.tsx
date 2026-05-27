"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Volume2 } from "lucide-react";
import { useState } from "react";
import { springs } from "@/components/motion";
import { useZenReviewContext } from "./ZenReviewProvider";
import type { ReviewQueueItem } from "@/lib/review/types";
import { speakLemma, canSpeak } from "@/lib/tts";
import { WordRelationLinks } from "./WordRelationLinks";
import { ZenDefinitionRenderer } from "./ZenDefinitionRenderer";
import { ZenChainRenderer } from "./ZenChainRenderer";

function FlashcardFront({
  item,
  onReveal,
}: {
  item: ReviewQueueItem;
  onReveal: () => void;
}) {
  return (
    <motion.div
      key="front"
      className="absolute inset-0 flex flex-col items-center justify-center backface-hidden cursor-pointer"
      style={{ backfaceVisibility: "hidden" }}
      onClick={onReveal}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: 0 }}
      exit={{ rotateY: 180 }}
      transition={{ type: "spring", ...springs.smooth }}
    >
      <div className="flex w-full flex-1 items-center justify-center px-6 sm:px-10">
        <div className="text-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              speakLemma(item.lemma, item.lang_code);
            }}
            className="group relative cursor-pointer appearance-none border-none bg-transparent p-0"
            title="点击朗读"
          >
            <h1
              className="text-6xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-7xl md:text-8xl"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {item.lemma}
            </h1>
            {canSpeak() && (
              <span className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-70 sm:-right-10">
                <Volume2 size={22} className="text-[var(--color-ink-soft)]" />
              </span>
            )}
          </button>

          {item.ipa && (
            <p className="mt-4 text-xl text-[var(--color-ink-soft)] sm:text-2xl">
              {item.ipa}
            </p>
          )}
        </div>
      </div>

      <div className="absolute bottom-3 left-0 right-0 text-center">
        <p className="text-sm text-[var(--color-ink-soft)] opacity-60">
          按 <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">Space</kbd> 或点击显示答案
          <span className="mx-2">·</span>
          <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">P</kbd> 朗读
        </p>
      </div>
    </motion.div>
  );
}

interface FlashcardBackProps {
  item: ReviewQueueItem;
}

function FlashcardBack({ item }: FlashcardBackProps) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [mnemonicOpen, setMnemonicOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);

  // Safely extract mnemonic from metadata (Json | object)
  const mnemonic =
    typeof item.metadata === "object" &&
    item.metadata &&
    "mnemonic" in item.metadata &&
    item.metadata.mnemonic &&
    typeof item.metadata.mnemonic === "object"
      ? (item.metadata.mnemonic as {
          etymology?: string;
          breakdown?: string;
        })
      : null;

  const hasMnemonic = mnemonic && (mnemonic.etymology || mnemonic.breakdown);

  // Safely extract semantic chain from metadata
  const semanticChain = (() => {
    if (
      typeof item.metadata === "object" &&
      item.metadata &&
      "semantic_chain" in item.metadata &&
      item.metadata.semantic_chain &&
      typeof item.metadata.semantic_chain === "object"
    ) {
      const sc = item.metadata.semantic_chain as Record<string, unknown>;
      return {
        chain: typeof sc.chain === "string" ? sc.chain : null,
        oneWord: typeof sc.oneWord === "string" ? sc.oneWord : null,
        centerExtension: typeof sc.centerExtension === "string" ? sc.centerExtension : null,
        validation: typeof sc.validation === "string" ? sc.validation : null,
      };
    }
    return null;
  })();

  const hasSemanticChain =
    semanticChain &&
    (semanticChain.chain ||
      semanticChain.oneWord ||
      semanticChain.centerExtension);

  const semanticField =
    typeof item.metadata === "object" &&
    item.metadata &&
    "semantic_field" in item.metadata
      ? String(item.metadata.semantic_field)
      : null;

  return (
    <motion.div
      key="back"
      className="absolute inset-0 flex flex-col items-center overflow-hidden p-6 backface-hidden"
      style={{ 
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
      initial={{ rotateY: -180 }}
      animate={{ rotateY: 0 }}
      exit={{ rotateY: -180 }}
      transition={{ type: "spring", ...springs.smooth }}
    >
      {/*
        Scroll container. Takes remaining vertical space via flex-1.
        `min-h-0` is required so flex-1 can shrink past intrinsic size
        and overflow-y-auto actually kicks in.

        We use `items-start` at every breakpoint and delegate vertical
        centering to the card's own `my-auto`. This sidesteps the
        classic flexbox + overflow trap that `items-center` creates:
        when the card's content is taller than the scroll container
        (definition panel with framed sub-cards + examples + relations
        + review-count footer routinely overflows a 4:3 flashcard), a
        center-aligned flex item distributes the overflow *symmetrically*
        above and below the container. `overflow-y-auto` can only scroll
        the range [0, scrollHeight - clientHeight], which means the top
        half of the overflow sits above the viewport and the user
        literally cannot reach the word lemma / IPA / top tags no matter
        how hard they scroll. `my-auto` on the child collapses to 0
        whenever the child overflows, pinning it to the top and making
        the full height scrollable; when the child fits, auto margins
        expand to fill the cross axis, yielding the same visual centering.
      */}
      <div className="flex w-full min-h-0 flex-1 items-start justify-center overflow-y-auto">
      {/* Answer Card */}
      <div 
        className="my-auto w-full max-w-2xl rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-lg backdrop-blur-lg sm:p-10"
        style={{ 
          background: "var(--color-panel)",
          backdropFilter: "blur(18px)",
        }}
      >
        {/* Tags */}
        <div className="mb-6 flex flex-wrap gap-2">
          {semanticField && (
            <span className="rounded-full border border-[var(--color-pill-border)] bg-[var(--color-pill-bg)] px-3 py-1 text-xs text-[var(--color-pill-text)]">
              {semanticField}
            </span>
          )}
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs text-[var(--color-ink-soft)]">
            {item.queue_label}
          </span>
        </div>

        {/* Word */}
        <button
          type="button"
          onClick={() => speakLemma(item.lemma, item.lang_code)}
          className="group relative cursor-pointer appearance-none border-none bg-transparent p-0"
          title="点击朗读"
        >
          <h2
            className="text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            {item.lemma}
          </h2>
          {canSpeak() && (
            <span className="absolute -right-7 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-70 sm:-right-9">
              <Volume2 size={18} className="text-[var(--color-ink-soft)]" />
            </span>
          )}
        </button>

        {item.ipa && (
          <p className="mt-2 text-lg text-[var(--color-ink-soft)]">{item.ipa}</p>
        )}

        {/*
          Definition panel. Wrapped in its own framed card (rounded
          border + subtle surface tint) so that the nested callout
          rows inside ZenDefinitionRenderer (原型义 / 延伸维度 /
          隐喻类型 small chips) read as children of a first-class
          section rather than floating freely on the flashcard.

          `definition_md` takes priority over `short_definition`
          because it's the structured markdown source — it's what
          carries the `> [!tip]` callouts and `` `V N` `` grammar
          markers we want to surface. `short_definition` is the
          one-line summary used only as a fallback when the word
          entry predates structured fields.
        */}
        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
            核心释义
          </p>
          <div className="mt-4">
            <ZenDefinitionRenderer
              markdown={item.definition_md?.trim() || item.short_definition || ""}
            />
          </div>
        </div>

        {/* Mnemonic anchor (collapsible) */}
        {hasMnemonic && (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={() => setMnemonicOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                记忆锚点
              </span>
              <motion.span animate={{ rotate: mnemonicOpen ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4 text-[var(--color-ink-soft)]" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {mnemonicOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {mnemonic!.etymology && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/60 p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                          叙事化词源
                        </span>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-ink)]">
                          {mnemonic!.etymology}
                        </p>
                      </div>
                    )}
                    {mnemonic!.breakdown && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-glass)]/60 p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                          词拆分记忆
                        </span>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                          {mnemonic!.breakdown}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Semantic chain (collapsible) */}
        {hasSemanticChain && (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={() => setChainOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                语义链路
              </span>
              <motion.span animate={{ rotate: chainOpen ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4 text-[var(--color-ink-soft)]" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {chainOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {semanticChain!.oneWord && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/60 p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                          一字一词
                        </span>
                        <p className="mt-2 text-sm font-medium leading-7 text-[var(--color-ink)]">
                          {semanticChain!.oneWord}
                        </p>
                      </div>
                    )}
                    {semanticChain!.centerExtension && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/60 p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                          延伸中心
                        </span>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-ink-soft)]">
                          {semanticChain!.centerExtension}
                        </p>
                      </div>
                    )}
                    {semanticChain!.chain && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-glass)]/60 p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                          链路展开
                        </span>
                        <div className="mt-2">
                          <ZenChainRenderer text={semanticChain!.chain} />
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Corpus & Collocations — richer than legacy previewExamples */}
        {(() => {
          // Extract corpus items from metadata
          const corpusItems = (() => {
            if (
              typeof item.metadata === "object" &&
              item.metadata &&
              "corpus_items" in item.metadata &&
              Array.isArray(item.metadata.corpus_items)
            ) {
              return (item.metadata.corpus_items as unknown[])
                .map((raw) => {
                  const r = raw as Record<string, unknown>;
                  return {
                    text: typeof r.text === "string" ? r.text : "",
                    note: typeof r.note === "string" ? r.note : null,
                    source: typeof r.source === "string" ? r.source : null,
                    translation: typeof r.translation === "string" ? r.translation : null,
                  };
                })
                .filter((c) => c.text);
            }
            return [];
          })();

          // Extract collocations from metadata
          const collocations = (() => {
            if (
              typeof item.metadata === "object" &&
              item.metadata &&
              "collocations" in item.metadata &&
              Array.isArray(item.metadata.collocations)
            ) {
              return (item.metadata.collocations as unknown[])
                .map((raw) => {
                  const r = raw as Record<string, unknown>;
                  const examples = Array.isArray(r.examples)
                    ? (r.examples as unknown[])
                        .map((e) => {
                          const ex = e as Record<string, unknown>;
                          return {
                            text: typeof ex.text === "string" ? ex.text : "",
                            translation: typeof ex.translation === "string" ? ex.translation : null,
                          };
                        })
                        .filter((ex) => ex.text)
                    : [];
                  return {
                    phrase: typeof r.phrase === "string" ? r.phrase : "",
                    gloss: typeof r.gloss === "string" ? r.gloss : null,
                    note: typeof r.note === "string" ? r.note : null,
                    examples,
                  };
                })
                .filter((c) => c.phrase);
            }
            return [];
          })();

          const hasRichContent = corpusItems.length > 0 || collocations.length > 0;
          const totalCount = corpusItems.length + collocations.length;

          if (!hasRichContent && (!item.previewExamples || item.previewExamples.length === 0)) {
            return null;
          }

          return (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                onClick={() => setExamplesOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                  {hasRichContent
                    ? `语料与搭配 (${totalCount} 条)`
                    : `例句 (${item.previewExamples!.length} 条)`}
                </span>
                <motion.span animate={{ rotate: examplesOpen ? 180 : 0 }}>
                  <ChevronDown className="h-4 w-4 text-[var(--color-ink-soft)]" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {examplesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    {hasRichContent ? (
                      <div className="space-y-3">
                        {/* Collocations */}
                        {collocations.map((col, i) => (
                          <div
                            key={`col-${i}`}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/60 p-3"
                          >
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                              {col.phrase}
                            </p>
                            {col.gloss && (
                              <p className="mt-1 text-xs leading-5 text-[var(--color-ink-soft)]">
                                {col.gloss}
                              </p>
                            )}
                            {col.examples.length > 0 && (
                              <div className="mt-2 space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-glass)]/40 p-2.5">
                                {col.examples.map((ex, j) => (
                                  <div key={`ex-${j}`}>
                                    <p className="text-xs leading-5 text-[var(--color-ink)]">
                                      {ex.text}
                                    </p>
                                    {ex.translation && (
                                      <p className="text-xs leading-5 text-[var(--color-ink-soft)]">
                                        {ex.translation}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Corpus items */}
                        {corpusItems.map((corp, i) => (
                          <div
                            key={`corp-${i}`}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]/60 p-3"
                          >
                            <p className="text-sm font-semibold leading-6 text-[var(--color-ink)]">
                              {corp.text}
                            </p>
                            {corp.translation && (
                              <p className="mt-1.5 text-xs leading-5 text-[var(--color-ink-soft)]">
                                {corp.translation}
                              </p>
                            )}
                            {corp.note && !corp.translation && (
                              <p className="mt-1.5 text-xs leading-5 text-[var(--color-ink-soft)]">
                                {corp.note}
                              </p>
                            )}
                            {corp.source && (
                              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] opacity-60">
                                来源 · {corp.source}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2 text-[var(--color-ink-soft)]">
                        {item.previewExamples!.map((ex, i) => (
                          <li key={i} className="text-sm leading-relaxed">
                            {ex.text}
                            {ex.label && (
                              <span className="ml-1 text-xs text-[var(--color-ink-muted)]">
                                ({ex.label})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* Word relations from metadata */}
        <WordRelationLinks metadata={item.metadata} />

        {/* Review count hint */}
        <div className="mt-6 flex items-center justify-between text-xs text-[var(--color-ink-soft)] opacity-60">
          <span>已复习 {item.review_count} 次</span>
          {item.retrievability !== null && (
            <span>记忆留存度 {Math.round(item.retrievability * 100)}%</span>
          )}
        </div>
      </div>
      </div>

      {/*
        Rating hint: static flex footer (no longer `absolute bottom-8`). Previously
        the hint sat on top of the card's flow, which let expanded content
        collide with it. Now it occupies its own row below the scrollable card
        area and `shrink-0` guarantees the card area — not the hint — absorbs
        any layout pressure.
      */}
      <div className="mt-3 w-full shrink-0 text-center">
        <p className="text-sm text-[var(--color-ink-soft)] opacity-60">
          <span className="hidden sm:inline">
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">1</kbd> 重来
            {" "}<kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">2</kbd> 困难
            {" "}<kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">3</kbd> 良好
            {" "}<kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">4</kbd> 简单
            <span className="mx-2">·</span>
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">D</kbd> 查看词条
            <span className="mx-2">·</span>
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs">P</kbd> 朗读
          </span>
          <span className="sm:hidden">
            点击右下角 ••• 按钮开启评分菜单
          </span>
        </p>
      </div>
    </motion.div>
  );
}

export function ZenFlashcard() {
  const { item, phase, reveal } = useZenReviewContext();

  if (!item) return null;

  const showBack = phase === "back" || phase === "rating";

  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-3xl cursor-pointer sm:aspect-[16/10]"
      style={{ perspective: "1200px" }}
      onClick={phase === "front" ? reveal : undefined}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: showBack ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 rounded-[2.5rem] border border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] shadow-[var(--shadow-panel-strong)]"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <FlashcardFront item={item} onReveal={reveal} />
        </div>

        {/* Back Face */}
        <div 
          className="absolute inset-0 rounded-[2.5rem] border border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] shadow-[var(--shadow-panel-strong)]"
          style={{ 
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <FlashcardBack item={item} />
        </div>
      </motion.div>
    </div>
  );
}
