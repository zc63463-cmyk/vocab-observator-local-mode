import type { InlineSegment, DefinitionBlock } from "./parse-zen-definition";
import type { WordHighlight } from "./types";

/**
 * Apply user-generated highlight snippets to a list of inline segments.
 *
 * Strategy: walk each `kind: "text"` segment and check whether any highlight
 * `text_snippet` is a substring of it.  When a match is found, the segment is
 * split into up to three pieces:
 *   [plain text] → [highlight segment with color] → [plain text]
 *
 * Non-text segments (code, bold, author-highlight) are left untouched so we
 * never nest user highlights inside already-styled spans.
 *
 * Overlapping highlights are resolved by "first match wins" in the order
 * they are supplied (typically chronological).
 */
export function applyHighlightsToSegments(
  segments: InlineSegment[],
  highlights: WordHighlight[],
): InlineSegment[] {
  if (!highlights.length) return segments;

  const result: InlineSegment[] = [];

  for (const seg of segments) {
    if (seg.kind !== "text") {
      result.push(seg);
      continue;
    }

    const remaining = seg.content;

    // Collect all matches for this segment, then sort by position.
    type Match = { index: number; snippet: string; color: string; id?: string };
    const matches: Match[] = [];

    for (const hl of highlights) {
      const snippet = hl.text_snippet;
      if (!snippet) continue;
      const idx = remaining.indexOf(snippet);
      if (idx !== -1) {
        matches.push({ index: idx, snippet, color: hl.color, id: hl.id });
      }
    }

    if (matches.length === 0) {
      result.push(seg);
      continue;
    }

    // Sort by position; if same position, longer snippet first so it wins.
    matches.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.snippet.length - a.snippet.length;
    });

    // Deduplicate overlapping matches (first match wins).
    const kept: Match[] = [];
    let lastEnd = -1;
    for (const m of matches) {
      if (m.index >= lastEnd) {
        kept.push(m);
        lastEnd = m.index + m.snippet.length;
      }
    }

    let pos = 0;
    for (const m of kept) {
      if (m.index > pos) {
        result.push({ kind: "text", content: remaining.slice(pos, m.index) });
      }
      result.push({
        kind: "highlight",
        content: remaining.slice(m.index, m.index + m.snippet.length),
        color: m.color,
        id: m.id,
      });
      pos = m.index + m.snippet.length;
    }

    if (pos < remaining.length) {
      result.push({ kind: "text", content: remaining.slice(pos) });
    }
  }

  return result;
}

/**
 * Apply highlights to every text-bearing part of a parsed definition block list.
 * Paragraphs and callout rows are both processed.
 */
export function applyHighlightsToBlocks(
  blocks: DefinitionBlock[],
  highlights: WordHighlight[],
): DefinitionBlock[] {
  if (!highlights.length) return blocks;

  return blocks.map((block) => {
    if (block.kind === "paragraph") {
      return {
        ...block,
        segments: applyHighlightsToSegments(block.segments, highlights),
      };
    }

    // callout
    return {
      ...block,
      rows: block.rows.map((row) => ({
        ...row,
        segments: applyHighlightsToSegments(row.segments, highlights),
      })),
    };
  });
}
