import { importWordsFromGitHubArchive } from "../lib/sync/github-source";
import { createAdminSupabaseClient } from "../lib/supabase/admin";
import { createImportRun } from "../lib/imports";
import { env } from "../lib/env";
import { selectAllInScope } from "../lib/sync/upsertWord";
import { planWordSync, type ExistingWordRef } from "../lib/sync/import-plan";
import { createWordUpsertPayload, renderWordHtmlPayload } from "../lib/sync/upsertWord";
import { chunkArray } from "../lib/utils";
import type { Database } from "../types/database.types";

async function main() {
  const admin = createAdminSupabaseClient();
  const imported = await importWordsFromGitHubArchive();
  const incomingWords = imported.words;
  const activePrefixes = env.wordsPrefixes;

  console.log("Step 1: createImportRun...");
  const importRun = await createImportRun(admin, "script");
  console.log("Import run created:", importRun?.id);

  console.log("\nStep 2: selectAllInScope words...");
  const existingRows = await selectAllInScope<{ id: string; slug: string; content_hash: string | null; is_deleted: boolean; source_path: string }>(
    admin,
    "words",
    "id, slug, source_path, content_hash, is_deleted",
    activePrefixes,
  );
  console.log("Existing words:", existingRows.length);

  console.log("\nStep 3: planWordSync...");
  const plan = planWordSync(existingRows as ExistingWordRef[], incomingWords);
  console.log("Create:", plan.create.length, "Update:", plan.update.length, "Unchanged:", plan.unchanged.length);

  const syncableWords = [...plan.create, ...plan.update, ...plan.unchanged];
  console.log("Syncable words:", syncableWords.length);

  console.log("\nStep 4: renderWordHtmlPayload...");
  const htmlPayloads = await Promise.all(syncableWords.map((word) => renderWordHtmlPayload(word)));

  console.log("\nStep 5: upsert words...");
  const includeStructuredFields = true;
  const upsertableWords: Database["public"]["Tables"]["words"]["Insert"][] = syncableWords.map(
    (word, index) => createWordUpsertPayload(word, new Date().toISOString(), includeStructuredFields, htmlPayloads[index]),
  );

  for (const chunk of chunkArray(upsertableWords, 100)) {
    if (chunk.length === 0) continue;
    const { error } = await admin.from("words").upsert(chunk, { onConflict: "slug" });
    if (error) {
      console.error("Word upsert error:", error);
      return;
    }
  }
  console.log("Words upserted successfully");

  console.log("\nStep 6: select words with ids...");
  const wordsWithIds = await selectAllInScope<{ id: string; slug: string }>(admin, "words", "id, slug", activePrefixes);
  console.log("Words with ids:", wordsWithIds.length);

  // Check for non-uuid ids
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const row of wordsWithIds) {
    if (!uuidRegex.test(row.id)) {
      console.error("NON-UUID ID FOUND:", row.id, "slug:", row.slug);
    }
  }

  console.log("\nStep 7: select tags...");
  const { data: tagsWithIds, error: tagsError } = await admin.from("tags").select("id, slug");
  if (tagsError) {
    console.error("Tags error:", tagsError);
    return;
  }
  console.log("Tags:", tagsWithIds?.length);

  // Check for non-uuid tag ids
  for (const row of (tagsWithIds ?? [])) {
    if (!uuidRegex.test(row.id)) {
      console.error("NON-UUID TAG ID FOUND:", row.id, "slug:", row.slug);
    }
  }

  console.log("\nStep 8: build wordTagRows...");
  const wordIdBySlug = new Map((wordsWithIds ?? []).map((row) => [row.slug, row.id]));
  const tagIdBySlug = new Map((tagsWithIds ?? []).map((row) => [row.slug, row.id]));
  const importedWordIds = incomingWords
    .map((word) => wordIdBySlug.get(word.slug))
    .filter((value): value is string => Boolean(value));

  console.log("Imported word ids:", importedWordIds.length);
  for (const id of importedWordIds) {
    if (!uuidRegex.test(id)) {
      console.error("NON-UUID WORD ID IN importedWordIds:", id);
    }
  }

  console.log("\nStep 9: delete word_tags...");
  for (const chunk of chunkArray(importedWordIds, 100)) {
    if (chunk.length === 0) continue;
    console.log("Deleting word_tags for", chunk.length, "words. First id:", chunk[0]);
    const { error } = await admin.from("word_tags").delete().in("word_id", chunk);
    if (error) {
      console.error("WordTag delete error:", error);
      return;
    }
  }
  console.log("WordTags deleted successfully");

  console.log("\nStep 10: insert word_tags...");
  const wordTagRows = incomingWords.flatMap((word) => {
    const wordId = wordIdBySlug.get(word.slug);
    if (!wordId) return [];
    return word.tags
      .map((tag) => tagIdBySlug.get(tag))
      .filter((tagId): tagId is string => Boolean(tagId))
      .map((tagId) => ({ tag_id: tagId, word_id: wordId }));
  });

  console.log("WordTag rows:", wordTagRows.length);
  for (const row of wordTagRows.slice(0, 10)) {
    console.log("  word_id:", row.word_id, "tag_id:", row.tag_id);
  }

  for (const chunk of chunkArray(wordTagRows, 300)) {
    if (chunk.length === 0) continue;
    const { error } = await admin.from("word_tags").upsert(chunk, { onConflict: "word_id,tag_id" });
    if (error) {
      console.error("WordTag upsert error:", error);
      return;
    }
  }
  console.log("WordTags inserted successfully");

  console.log("\nAll steps completed!");
}

main().catch(console.error);
