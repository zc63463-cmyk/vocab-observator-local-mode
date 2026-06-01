import type { ParsedExample } from "@/lib/sync/parseMarkdown";

/**
 * Extract up to 2 preview examples from the raw `examples` JSONB column.
 * Defensively handles non-array values and empty arrays.
 */
export function extractPreviewExamples(raw: unknown): ParsedExample[] | null {
  const arr = Array.isArray(raw) ? (raw as ParsedExample[]) : null;
  if (!arr || arr.length === 0) return null;
  return arr.slice(0, 2);
}
