"use client";

import { type ReactNode } from "react";
import type { WordHighlight } from "@/lib/review/types";

type SplitSegment =
  | { kind: "text"; content: string }
  | { kind: "highlight"; content: string; color: string; id: string };

/**
 * Split a plain-text string by highlight snippets.
 */
function splitByHighlights(
  text: string,
  highlights: WordHighlight[],
): SplitSegment[] {
  const relevant = highlights.filter((h) => text.includes(h.text_snippet));
  if (relevant.length === 0) {
    return [{ kind: "text", content: text }];
  }

  const segments: SplitSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestLen = 0;
    let bestHl: (typeof relevant)[number] | null = null;

    for (const hl of relevant) {
      const idx = remaining.indexOf(hl.text_snippet);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestLen = hl.text_snippet.length;
        bestHl = hl;
      }
    }

    if (bestIdx === -1 || !bestHl) {
      segments.push({ kind: "text", content: remaining });
      break;
    }

    if (bestIdx > 0) {
      segments.push({ kind: "text", content: remaining.slice(0, bestIdx) });
    }
    segments.push({
      kind: "highlight",
      content: bestHl.text_snippet,
      color: bestHl.color,
      id: bestHl.id,
    });
    remaining = remaining.slice(bestIdx + bestLen);
  }

  return segments;
}

function renderSegments(
  segments: SplitSegment[],
  keyPrefix: string,
  onDeleteHighlight?: (id: string) => void,
): ReactNode[] {
  return segments.map((seg, i) =>
    seg.kind === "highlight" ? (
      seg.color === "bold" ? (
        <strong
          key={`hl-${keyPrefix}-${seg.id}-${i}`}
          className="cursor-pointer font-semibold text-[var(--color-ink)] transition hover:opacity-80"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteHighlight?.(seg.id);
          }}
          title="点击取消加粗"
        >
          {seg.content}
        </strong>
      ) : (
        <mark
          key={`hl-${keyPrefix}-${seg.id}-${i}`}
          className="cursor-pointer rounded-sm transition hover:opacity-80"
          style={{
            backgroundColor: `${seg.color}33`,
            borderBottom: `2.5px solid ${seg.color}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteHighlight?.(seg.id);
          }}
          title="点击取消标亮"
        >
          {seg.content}
        </mark>
      )
    ) : (
      <span key={`t-${keyPrefix}-${i}`}>{seg.content}</span>
    ),
  );
}

/**
 * Apply highlights without breaking bold markers.
 *
 * Strategy: split text by `**bold**` regions first, then apply
 * highlights inside each region independently. This prevents a
 * highlight snippet from "stealing" text out of a bold span and
 * leaving orphaned `**` markers.
 */
function applyHighlights(
  text: string,
  highlights: WordHighlight[],
  onDeleteHighlight?: (id: string) => void,
): ReactNode[] {
  // Split into bold regions and plain-text regions
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.flatMap((part, partIdx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Bold region: strip **, highlight inside, wrap in <strong>
      const inner = part.slice(2, -2);
      const segments = splitByHighlights(inner, highlights);
      if (segments.length === 1 && segments[0].kind === "text") {
        // No highlights inside this bold region
        return (
          <strong
            key={`b-${partIdx}`}
            className="font-semibold text-[var(--color-ink)]"
          >
            {inner}
          </strong>
        );
      }
      return (
        <strong
          key={`b-${partIdx}`}
          className="font-semibold text-[var(--color-ink)]"
        >
          {renderSegments(segments, `b${partIdx}`, onDeleteHighlight)}
        </strong>
      );
    }

    // Plain-text region: apply highlights directly
    const segments = splitByHighlights(part, highlights);
    return renderSegments(segments, `p${partIdx}`, onDeleteHighlight);
  });
}

const INDENT_REM = 0.75;

/**
 * Lightweight Markdown renderer for semantic-chain text.
 *
 * Visual design:
 *   - Paragraphs are separated by generous vertical space (space-y-3).
 *   - Lists use a left accent border whose colour deepens with nesting
 *     depth, giving users an immediate visual cue of hierarchy.
 *   - Indentation increases by 0.75 rem per level.
 *   - List items are spaced slightly more loosely (space-y-2).
 *
 * Ordered-list numbers are preserved in the text content rather than
 * relying on the browser's `<ol>` counter — this avoids the "all 1."
 * bug when ordered items are interleaved with unordered sub-lists.
 *
 * Supported syntax:
 *   - Paragraphs, bold `**text**`, unordered lists `-`, ordered lists `1.`,
 *     checkboxes `- [x]`.
 */
export function ZenChainRenderer({
  text,
  highlights = [],
  onDeleteHighlight,
}: {
  text: string;
  highlights?: WordHighlight[];
  onDeleteHighlight?: (id: string) => void;
}) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];

  type ListItem = {
    content: string;
    checked: boolean | null;
    indent: number;
  };

  let currentItems: ListItem[] = [];
  let currentKind: "ul" | "ol" | "checkbox" | null = null;

  function flushList() {
    if (currentItems.length === 0) return;

    const baseIndent = currentItems[0]?.indent ?? 0;
    const isCheckbox = currentItems[0]?.checked !== null;

    // Accent border colour gets more prominent with deeper nesting
    const depth = Math.min(Math.floor(baseIndent / 2), 3);
    const borderOpacity = 0.08 + depth * 0.06;

    blocks.push(
      <ul
        key={blocks.length}
        className={`space-y-2 ${isCheckbox ? "list-none" : "list-disc"}`}
        style={{
          marginLeft: `${baseIndent * INDENT_REM}rem`,
          paddingLeft: isCheckbox ? undefined : "0.5rem",
          borderLeft:
            depth > 0
              ? `2px solid rgba(15, 111, 98, ${borderOpacity})`
              : undefined,
        }}
      >
        {currentItems.map((item, i) => {
          const itemDepth = Math.min(
            Math.floor((item.indent - baseIndent) / 2),
            3,
          );
          return (
            <li
              key={i}
              className={`text-sm leading-6 text-[var(--color-ink)] ${
                item.checked !== null ? "flex items-start gap-2.5" : ""
              }`}
              style={{
                marginLeft: `${Math.max(item.indent - baseIndent, 0) * INDENT_REM}rem`,
                paddingLeft: itemDepth > 0 ? "0.5rem" : undefined,
                borderLeft:
                  itemDepth > 0
                    ? `2px solid rgba(15, 111, 98, ${0.1 + itemDepth * 0.07})`
                    : undefined,
              }}
            >
              {item.checked !== null && (
                <span className="mt-0.5 shrink-0 text-xs text-[var(--color-accent)]">
                  {item.checked ? "☑" : "☐"}
                </span>
              )}
              {applyHighlights(item.content, highlights, onDeleteHighlight)}
            </li>
          );
        })}
      </ul>,
    );

    currentItems = [];
    currentKind = null;
  }

  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    // Checkbox: - [x] content  or  - [ ] content
    const checkboxMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    // Unordered list: - content  or  * content
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    // Ordered list: 1. content  — preserve the number in content
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (checkboxMatch) {
      if (currentKind && currentKind !== "checkbox") flushList();
      currentKind = "checkbox";
      currentItems.push({
        content: checkboxMatch[2],
        checked: checkboxMatch[1].toLowerCase() === "x",
        indent,
      });
    } else if (ulMatch) {
      if (currentKind && currentKind !== "ul") flushList();
      currentKind = "ul";
      currentItems.push({
        content: ulMatch[1],
        checked: null,
        indent,
      });
    } else if (olMatch) {
      if (currentKind && currentKind !== "ol") flushList();
      currentKind = "ol";
      // Preserve the original number so we don't rely on browser <ol> counter
      currentItems.push({
        content: `${olMatch[1]}. ${olMatch[2]}`,
        checked: null,
        indent,
      });
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p
          key={blocks.length}
          className="text-sm leading-7 text-[var(--color-ink)]"
        >
          {applyHighlights(trimmed, highlights, onDeleteHighlight)}
        </p>,
      );
    }
  }

  flushList();

  return <div className="space-y-3">{blocks}</div>;
}
