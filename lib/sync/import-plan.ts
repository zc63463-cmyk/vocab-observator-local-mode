import type { ParsedWord } from "@/lib/sync/parseMarkdown";

export interface ExistingSyncRef {
  content_hash: string;
  is_deleted: boolean;
  slug: string;
  source_path: string;
}

interface ParsedSyncEntity {
  contentHash: string;
  slug: string;
  sourcePath: string;
}

export interface EntitySyncPlan<T extends ParsedSyncEntity> {
  create: T[];
  softDelete: ExistingSyncRef[];
  unchanged: T[];
  update: T[];
  skip: Array<{ word: T; reason: string }>;
}

export type ExistingWordRef = ExistingSyncRef;
export type WordSyncPlan = EntitySyncPlan<ParsedWord>;

/**
 * Lower number = higher priority.
 * L0_ (考研基础/超纲/集合) > L1_ (雅思) > everything else.
 */
function prefixPriority(sourcePath: string): number {
  if (sourcePath.startsWith("Wiki/L0_")) return 0;
  if (sourcePath.startsWith("Wiki/L1_")) return 1;
  return 99;
}

function isCrossCorpusSkip(
  existing: ExistingSyncRef,
  incoming: ParsedSyncEntity,
): { skip: boolean; reason?: string } {
  // Same source path → normal update, not a cross-corpus conflict.
  if (existing.source_path === incoming.sourcePath) {
    return { skip: false };
  }

  const existingPriority = prefixPriority(existing.source_path);
  const incomingPriority = prefixPriority(incoming.sourcePath);

  if (existingPriority < incomingPriority) {
    return {
      reason: `cross-corpus skip: existing "${existing.source_path}" (priority ${existingPriority}) outranks incoming "${incoming.sourcePath}" (priority ${incomingPriority})`,
      skip: true,
    };
  }

  return { skip: false };
}

export function planEntitySync<T extends ParsedSyncEntity>(
  existing: ExistingSyncRef[],
  incoming: T[],
): EntitySyncPlan<T> {
  const bySlug = new Map(existing.map((item) => [item.slug, item]));
  const bySourcePath = new Map(existing.map((item) => [item.source_path, item]));
  const matchedSourcePaths = new Set<string>();
  const create: T[] = [];
  const update: T[] = [];
  const unchanged: T[] = [];
  const skip: Array<{ word: T; reason: string }> = [];

  for (const word of incoming) {
    const matched = bySlug.get(word.slug) ?? bySourcePath.get(word.sourcePath);
    if (!matched) {
      create.push(word);
      continue;
    }

    matchedSourcePaths.add(matched.source_path);

    const conflict = isCrossCorpusSkip(matched, word);
    if (conflict.skip) {
      skip.push({ word, reason: conflict.reason! });
      continue;
    }

    if (
      matched.content_hash !== word.contentHash ||
      matched.source_path !== word.sourcePath ||
      matched.is_deleted
    ) {
      update.push(word);
      continue;
    }

    unchanged.push(word);
  }

  const incomingSourcePaths = new Set(incoming.map((word) => word.sourcePath));
  const softDelete = existing.filter(
    (item) =>
      !incomingSourcePaths.has(item.source_path) &&
      !matchedSourcePaths.has(item.source_path),
  );

  return {
    create,
    softDelete,
    unchanged,
    update,
    skip,
  };
}

export function planWordSync(
  existing: ExistingWordRef[],
  incoming: ParsedWord[],
): WordSyncPlan {
  return planEntitySync(existing, incoming);
}
