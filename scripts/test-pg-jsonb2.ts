import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Test: JSON.stringify array of objects before passing
  try {
    await client.query(`INSERT INTO words (slug, content_hash, source_path, title, lemma, definition_md, body_md, antonym_items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      'test-str-' + Date.now(),
      'e'.repeat(64),
      'test.md',
      'Test',
      'test',
      'def',
      'body',
      JSON.stringify([{ note: 'test', word: 'word' }]),
    ]);
    console.log("Test (JSON.stringify array) passed");
  } catch (err) {
    console.error("Test failed:", (err as Error).message);
  }

  // Test: array of strings for text[]
  try {
    await client.query(`INSERT INTO words (slug, content_hash, source_path, title, lemma, definition_md, body_md, aliases) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      'test-alias-' + Date.now(),
      'f'.repeat(64),
      'test.md',
      'Test',
      'test',
      'def',
      'body',
      ['a', 'b', 'c'],
    ]);
    console.log("Test (string array for text[]) passed");
  } catch (err) {
    console.error("Test failed:", (err as Error).message);
  }

  await client.end();
}

main().catch(console.error);
