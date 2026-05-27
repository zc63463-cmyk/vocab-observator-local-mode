import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(`
    SELECT a.attname as column_name, pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
    FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = 'words'::regclass AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum
  `);
  for (const row of rows) {
    console.log(row.column_name, ":", row.data_type);
  }
  await client.end();
}

main().catch(console.error);
