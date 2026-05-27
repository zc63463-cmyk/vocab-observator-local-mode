import { createAdminSupabaseClient } from "../lib/supabase/admin";

async function main() {
  const admin = createAdminSupabaseClient();

  const testWord = {
    aliases: [],
    antonym_html: "",
    antonym_items: [],
    body_html: "",
    body_md: "test body",
    collocations: [],
    content_hash: "a".repeat(64),
    core_definitions: [],
    corpus_items: [],
    definition_html: "",
    definition_md: "test definition",
    examples: [],
    ipa: null,
    is_deleted: false,
    is_published: true,
    lang_code: "en",
    lemma: "test",
    metadata: {},
    pos: null,
    prototype_text: null,
    short_definition: "test",
    slug: "test-word-" + Date.now(),
    source_path: "Wiki/L0_超纲词/test.md",
    source_updated_at: null,
    synonym_html: "",
    synonym_items: [],
    synced_at: new Date().toISOString(),
    title: "Test",
    updated_at: new Date().toISOString(),
  };

  console.log("Upserting test word...");
  const { data, error } = await admin.from("words").upsert(testWord, {
    onConflict: "slug",
  });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

main().catch(console.error);
