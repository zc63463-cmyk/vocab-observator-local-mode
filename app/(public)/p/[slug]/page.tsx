import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { OwnerWordSidebar } from "@/components/words/OwnerWordSidebar";
import { WordDefinitions } from "@/components/words/WordDefinitions";
import { WordHeader } from "@/components/words/WordHeader";
import { WordMnemonic } from "@/components/words/WordMnemonic";
import { WordMorphology } from "@/components/words/WordMorphology";
import { VocabTopologyGraphIsland } from "@/components/vocab/VocabTopologyGraphIsland";
import type { Mnemonic, Morphology } from "@/lib/structured-word";
import type { Json } from "@/types/database.types";
import { buildLocalVocabGraph, type VocabGraphData } from "@/lib/vocab-graph";
import {
  getAllPublicWordIndexEntries,
  getPlainWordBySlug,
  getPublicWordMetadataBySlug,
  getStaticPublicWordSlugs,
  type PublicWordIndexEntry,
} from "@/lib/words";

export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 86400;
const STATIC_WORD_PARAM_LIMIT = 50;

// Build-time singleton cache for the full word index.
// During SSG Next.js may invoke this page thousands of times (once per slug).
// Without caching, getAllPublicWordIndexEntries() fires a 10-round-trip
// paginated query for *every* slug, which balloons build time past 45 min.
// A module-level promise deduplicates it to a single fetch per worker.
let allEntriesCache: PublicWordIndexEntry[] | null = null;
let allEntriesPromise: Promise<PublicWordIndexEntry[]> | null = null;

async function getAllEntriesOnce(): Promise<PublicWordIndexEntry[]> {
  if (allEntriesCache) {
    return allEntriesCache;
  }
  if (allEntriesPromise) {
    return allEntriesPromise;
  }
  allEntriesPromise = getAllPublicWordIndexEntries();
  allEntriesCache = await allEntriesPromise;
  return allEntriesCache;
}

function getMetadataField<T>(metadata: Json, key: string): T | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, Json>)[key];
  return value == null ? null : (value as unknown as T);
}

function getRelatedReviewWordIds(graphData: VocabGraphData) {
  return [
    ...new Set(
      graphData.nodes
        .filter((node) => node.id !== graphData.centerId)
        .map((node) => node.wordId)
        .filter((wordId): wordId is string => Boolean(wordId)),
    ),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicWordMetadataBySlug(slug);

  if (!result.word) {
    return { title: "词条未找到" };
  }

  const word = result.word;
  const title = `${word.title} - 词汇知识库`;
  const description = word.short_definition
    ? `${word.title}${word.lemma !== word.title ? ` (${word.lemma})` : ""}：${word.short_definition}`
    : `查看 ${word.title} 的释义。`;

  return {
    description,
    openGraph: { description, title, type: "article" },
    title,
  };
}

export async function generateStaticParams() {
  const slugs = await getStaticPublicWordSlugs(STATIC_WORD_PARAM_LIMIT);
  return slugs.map((slug) => ({ slug }));
}

export default async function PlainWordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, allEntries] = await Promise.all([
    getPlainWordBySlug(slug),
    getAllEntriesOnce(),
  ]);

  if (result.configured && !result.word) {
    notFound();
  }

  if (!result.word) {
    return (
      <div className="panel rounded-[2rem] p-8 text-sm text-[var(--color-ink-soft)]">
        当前还没有可显示的词条，请先完成 Supabase 配置与导入同步。
      </div>
    );
  }

  const word = result.word;
  const graphData = buildLocalVocabGraph(word, allEntries, "/p/");
  const relatedReviewWordIds = getRelatedReviewWordIds(graphData);
  const morphology = getMetadataField<Morphology>(word.metadata, "morphology");
  const mnemonic = getMetadataField<Mnemonic>(word.metadata, "mnemonic");

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/words", label: "词条库" },
          { label: word.lemma },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <WordHeader word={word} />

          <WordDefinitions
            definitions={word.core_definitions}
            fallbackHtml={word.definition_html}
          />

          {morphology ? <WordMorphology morphology={morphology} /> : null}
          {mnemonic ? <WordMnemonic mnemonic={mnemonic} /> : null}

          <section className="panel rounded-[1.75rem] p-6">
            <h2 className="section-title text-2xl font-semibold">词汇拓扑图谱</h2>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              {graphData.nodes.length} 节点 · {graphData.edges.length} 关联
            </p>
            <div className="mt-4">
              <VocabTopologyGraphIsland data={graphData} maxNodes={60} />
            </div>
          </section>

          <section className="flex justify-end">
            <a
              href={`/words/${encodeURIComponent(word.slug)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft-deep)]"
            >
              查看完整词条
              <ArrowUpRight size={14} />
            </a>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-height,5rem)+1.5rem)] lg:self-start">
          <div className="space-y-6">
            <Suspense
              fallback={
                <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface-soft-deep)] p-5">
                  <SkeletonLine className="h-4 w-24" />
                  <SkeletonLine className="mt-4 h-10 rounded-2xl" />
                </div>
              }
            >
              <OwnerWordSidebar
                wordId={word.id}
                relatedReviewWordIds={relatedReviewWordIds}
              />
            </Suspense>
          </div>
        </aside>
      </div>
    </>
  );
}
