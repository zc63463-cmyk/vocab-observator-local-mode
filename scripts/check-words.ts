import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query("SELECT COUNT(*) as count FROM words");
  console.log("Words count:", rows[0].count);
  const { rows: sample } = await client.query("SELECT id, slug FROM words LIMIT 5");
  console.log("Sample words:");
  for (const row of sample) {
    console.log("  ", row.id, row.slug);
  }
  await client.end();
}

main().catch(console.error);
