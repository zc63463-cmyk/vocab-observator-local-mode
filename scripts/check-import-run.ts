import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query("SELECT id, status FROM import_runs ORDER BY started_at DESC LIMIT 5");
  console.log("Import runs:");
  for (const row of rows) {
    console.log("  ", row.id, row.status);
  }
  await client.end();
}

main().catch(console.error);
