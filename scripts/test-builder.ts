import { createAdminSupabaseClient } from "../lib/supabase/admin";

async function main() {
  const admin = createAdminSupabaseClient();

  // Test upsert with array of objects for jsonb via PostgrestBuilder
  const { data, error } = await admin.from("words").upsert({
    aliases: [],
    antonym_html: "",
    antonym_items: [{ note: "test", word: "word" }],
    body_html: "",
    body_md: "test body",
    collocations: [],
    content_hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    core_definitions: [],
    corpus_items: [],
    definition_html: "",
    definition_md: "test def",
    examples: [],
    ipa: null,
    is_deleted: false,
    is_published: true,
    lang_code: "en",
    lemma: "test",
    metadata: { review_count: 0 },
    pos: null,
    prototype_text: null,
    short_definition: "test",
    slug: "test-builder-" + Date.now(),
    source_path: "Wiki/L0_超纲词/test.md",
    source_updated_at: null,
    synonym_html: "",
    synonym_items: [],
    synced_at: new Date().toISOString(),
    title: "Test",
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "slug",
  });

  if (error) {
    console.error("Upsert error:", error);
  } else {
    console.log("Upsert success! Returned id:", data?.[0]?.id);
  }
}

main().catch(console.error);
