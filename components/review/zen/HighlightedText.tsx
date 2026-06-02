"use client";

import type { WordHighlight } from "@/lib/review/types";

interface HighlightedTextProps {
  text: string;
  highlights: WordHighlight[];
  className?: string;
  onDeleteHighlight?: (id: string) => void;
}

/**
 * Split a plain-text string by highlight snippets and render <mark> spans.
 *
 * Matching is greedy: the first matching highlight wins at each position
 * to avoid overlapping highlight ambiguities.
 */
export function HighlightedText({
  text,
  highlights,
  className,
  onDeleteHighlight,
}: HighlightedTextProps) {
  // Only highlights whose snippet actually appears in this text
  const relevant = highlights.filter((h) => text.includes(h.text_snippet));

  if (relevant.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build segments by repeatedly finding the earliest highlight match
  const segments: Array<
    | { kind: "text"; content: string }
    | { kind: "highlight"; content: string; color: string; id: string }
  > = [];

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

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "highlight" ? (
          seg.color === "bold" ? (
            <strong
              key={`${seg.id}-${i}`}
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
              key={`${seg.id}-${i}`}
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
          <span key={`t-${i}`}>{seg.content}</span>
        ),
      )}
    </span>
  );
}
