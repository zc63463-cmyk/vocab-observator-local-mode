import type {
  AntonymItem,
  CollocationItem,
  CoreDefinition,
  CorpusItem,
  DerivedWord,
  Mnemonic,
  Morphology,
  PosConversion,
  SemanticChain,
  SynonymItem,
} from "@/lib/structured-word";
import type { Json } from "@/types/database.types";

export type ReviewFilter = "all" | "tracked" | "due" | "untracked";

export interface OwnerWordProgressSummary {
  again_count: number;
  due_at: string | null;
  id: string;
  is_due: boolean;
  lapse_count: number;
  last_reviewed_at: string | null;
  review_count: number;
  state: string;
}

export interface PublicWordSummary {
  id: string;
  ipa: string | null;
  lemma: string;
  metadata: Json;
  progress: OwnerWordProgressSummary | null;
  short_definition: string | null;
  slug: string;
  title: string;
  updated_at: string;
}

export type PublicWordIndexEntry = Omit<PublicWordSummary, "progress">;

export interface PublicWordDetail extends PublicWordSummary {
  antonym_html?: string | null;
  antonym_items: AntonymItem[];
  body_html?: string | null;
  body_md: string;
  collocations: CollocationItem[];
  core_definitions: CoreDefinition[];
  corpus_items: CorpusItem[];
  definition_html?: string | null;
  definition_md: string;
  derived_words: DerivedWord[];
  examples: Json;
  mnemonic: Mnemonic | null;
  morphology: Morphology | null;
  pos: string | null;
  pos_conversions: PosConversion[];
  prototype_text: string | null;
  resolved_antonym_items: ResolvedAntonymItem[];
  resolved_synonym_items: ResolvedSynonymItem[];
  semantic_chain: SemanticChain | null;
  synonym_html?: string | null;
  source_path: string;
  synonym_items: SynonymItem[];
  tags: Array<{ label: string; slug: string }>;
}

export interface CachedPublicWordDetail extends PublicWordDetail {
  antonym_html: string;
  body_html: string;
  definition_html: string;
  synonym_html: string;
}

export interface PlainWordDetail {
  antonym_items: AntonymItem[];
  body_md: string;
  core_definitions: CoreDefinition[];
  definition_html: string | null;
  id: string;
  ipa: string | null;
  lemma: string;
  metadata: Json;
  pos: string | null;
  short_definition: string | null;
  slug: string;
  synonym_items: SynonymItem[];
  tags: Array<{ label: string; slug: string }>;
  title: string;
  updated_at: string;
}

export interface ResolvedSynonymItem extends SynonymItem {
  href: string | null;
}

export interface ResolvedAntonymItem extends AntonymItem {
  href: string | null;
}

export interface WordQueryFilters {
  freq?: string;
  q?: string;
  review?: ReviewFilter;
  semantic?: string;
}

export interface WordPagination {
  limit?: number | null;
  offset?: number | null;
}

export interface NormalizedWordQueryFilters {
  freq: string;
  q: string;
  review: ReviewFilter;
  semantic: string;
}

export interface NormalizedWordPagination {
  limit: number;
  offset: number;
}

 
export interface PublicWordsPageInfo {
  hasMore: boolean;
  limit: number;
  offset: number;
  total: number;
}

export interface PublicWordsResponse {
  configured: boolean;
  counts: {
    showing: number;
    total: number;
  };
  filterOptions: {
    frequencies: string[];
    semanticFields: string[];
  };
  filters: NormalizedWordQueryFilters;
  isOwner: boolean;
  pageInfo: PublicWordsPageInfo;
  truncated: boolean;
  words: PublicWordSummary[];
}

export interface PublicWordFilterOptions {
  frequencies: string[];
  semanticFields: string[];
}

export interface LandingSnapshot {
  configured: boolean;
  featuredWords: PublicWordSummary[];
  repoName: string;
  totalWords: number;
}

export interface BareSlimPublicWordIndexRow {
  id: string;
  ipa: string | null;
  lemma: string;
  metadata_antonyms: Json | null;
  metadata_roots: Json | null;
  metadata_semantic_field: string | null;
  metadata_synonyms: Json | null;
  metadata_word_freq: string | null;
  short_definition: string | null;
  slug: string;
  title: string;
  updated_at: string;
}
