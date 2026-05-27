"use client";

import { type ReactNode } from "react";

/**
 * Parse `**bold**` markers into `<strong>` elements.
 */
function parseBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--color-ink)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
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
export function ZenChainRenderer({ text }: { text: string }) {
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
              {parseBold(item.content)}
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
          {parseBold(trimmed)}
        </p>,
      );
    }
  }

  flushList();

  return <div className="space-y-3">{blocks}</div>;
}
