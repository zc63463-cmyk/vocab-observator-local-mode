import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Test 1: empty array for jsonb
  try {
    await client.query(`INSERT INTO words (slug, content_hash, source_path, title, lemma, definition_md, body_md, antonym_items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      'test-empty-' + Date.now(),
      'b'.repeat(64),
      'test.md',
      'Test',
      'test',
      'def',
      'body',
      [],
    ]);
    console.log("Test 1 (empty array) passed");
  } catch (err) {
    console.error("Test 1 failed:", (err as Error).message);
  }

  // Test 2: array of objects for jsonb
  try {
    await client.query(`INSERT INTO words (slug, content_hash, source_path, title, lemma, definition_md, body_md, antonym_items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      'test-obj-arr-' + Date.now(),
      'c'.repeat(64),
      'test.md',
      'Test',
      'test',
      'def',
      'body',
      [{ note: 'test', word: 'word' }],
    ]);
    console.log("Test 2 (array of objects) passed");
  } catch (err) {
    console.error("Test 2 failed:", (err as Error).message);
  }

  // Test 3: nested object for jsonb (metadata)
  try {
    await client.query(`INSERT INTO words (slug, content_hash, source_path, title, lemma, definition_md, body_md, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      'test-meta-' + Date.now(),
      'd'.repeat(64),
      'test.md',
      'Test',
      'test',
      'def',
      'body',
      { review_count: 0, antonym_items: [{ note: 'test', word: 'word' }] },
    ]);
    console.log("Test 3 (nested object) passed");
  } catch (err) {
    console.error("Test 3 failed:", (err as Error).message);
  }

  await client.end();
}

main().catch(console.error);
