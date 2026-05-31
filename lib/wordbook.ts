import type { SupabaseClient } from "@/lib/db";
import type { Database } from "@/types/database.types";

type OwnerSupabaseClient = SupabaseClient<Database>;

export interface Wordbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WordbookWithStats extends Wordbook {
  word_count: number;
  progress_count: number;
}

export async function getUserWordbooks(
  supabase: OwnerSupabaseClient,
  userId: string,
): Promise<Wordbook[]> {
  const { data, error } = await supabase
    .from("wordbooks")
    .select("id, user_id, name, description, is_default, created_at, updated_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Wordbook[];
}

export async function getUserWordbooksWithStats(
  supabase: OwnerSupabaseClient,
  userId: string,
): Promise<WordbookWithStats[]> {
  const { data, error } = await supabase
    .from("wordbooks")
    .select(
      `id, user_id, name, description, is_default, created_at, updated_at,
      wordbook_items(count),
      user_word_progress(count)`,
    )
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
    wordbook_items: [{ count: number }] | [];
    user_word_progress: [{ count: number }] | [];
  }>).map((w) => ({
    ...w,
    word_count: w.wordbook_items[0]?.count ?? 0,
    progress_count: w.user_word_progress[0]?.count ?? 0,
  }));
}

export async function getDefaultWordbook(
  supabase: OwnerSupabaseClient,
  userId: string,
): Promise<Wordbook | null> {
  const { data, error } = await supabase
    .from("wordbooks")
    .select("id, user_id, name, description, is_default, created_at, updated_at")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  return data as Wordbook | null;
}

export async function getOrCreateDefaultWordbook(
  supabase: OwnerSupabaseClient,
  userId: string,
): Promise<string> {
  const existing = await getDefaultWordbook(supabase, userId);
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("wordbooks")
    .insert({ user_id: userId, name: "Global", is_default: true })
    .select("id")
    .single();

  if (error) throw error;
  return data!.id;
}

export async function createWordbook(
  supabase: OwnerSupabaseClient,
  userId: string,
  name: string,
  description?: string,
): Promise<Wordbook> {
  const { data, error } = await supabase
    .from("wordbooks")
    .insert({ user_id: userId, name, description: description ?? null })
    .select("id, user_id, name, description, is_default, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as Wordbook;
}

export async function deleteWordbook(
  supabase: OwnerSupabaseClient,
  userId: string,
  wordbookId: string,
): Promise<void> {
  const { error } = await supabase
    .from("wordbooks")
    .delete()
    .eq("id", wordbookId)
    .eq("user_id", userId)
    .eq("is_default", false);

  if (error) throw error;
}

export async function renameWordbook(
  supabase: OwnerSupabaseClient,
  userId: string,
  wordbookId: string,
  name: string,
  description?: string,
): Promise<void> {
  const { error } = await supabase
    .from("wordbooks")
    .update({ name, description: description ?? null, updated_at: new Date().toISOString() })
    .eq("id", wordbookId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function addWordsToWordbook(
  supabase: OwnerSupabaseClient,
  wordbookId: string,
  wordIds: string[],
): Promise<void> {
  if (wordIds.length === 0) return;
  const rows = wordIds.map((word_id) => ({ wordbook_id: wordbookId, word_id }));
  const { error } = await supabase
    .from("wordbook_items")
    .upsert(rows, { ignoreDuplicates: true });

  if (error) throw error;
}

export async function removeWordsFromWordbook(
  supabase: OwnerSupabaseClient,
  wordbookId: string,
  wordIds: string[],
): Promise<void> {
  if (wordIds.length === 0) return;
  const { error } = await supabase
    .from("wordbook_items")
    .delete()
    .eq("wordbook_id", wordbookId)
    .in("word_id", wordIds);

  if (error) throw error;
}

export async function getWordbookWordIds(
  supabase: OwnerSupabaseClient,
  wordbookId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("wordbook_items")
    .select("word_id")
    .eq("wordbook_id", wordbookId);

  if (error) throw error;
  return (data ?? []).map((r) => r.word_id);
}

/**
 * Resolve a wordbook ID. If `wordbookId` is provided and valid, return it.
 * Otherwise return the user's default (Global) wordbook ID.
 */
export async function resolveWordbookId(
  supabase: OwnerSupabaseClient,
  userId: string,
  wordbookId?: string | null,
): Promise<string> {
  if (wordbookId) {
    const { data, error } = await supabase
      .from("wordbooks")
      .select("id")
      .eq("id", wordbookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) return data.id;
  }
  return getOrCreateDefaultWordbook(supabase, userId);
}
