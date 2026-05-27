import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'words' ORDER BY ordinal_position"
  );
  for (const row of rows) {
    console.log(row.column_name, ":", row.data_type);
  }
  await client.end();
}

main().catch(console.error);
