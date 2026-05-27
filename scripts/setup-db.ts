#!/usr/bin/env tsx
/**
 * Setup local PostgreSQL database for vocab-observatory-local.
 * 1. Connects to local Postgres
 * 2. Runs all migration files in order
 * 3. Seeds LOCAL_OWNER into auth.users + profiles
 */
import path from "node:path";
import fs from "node:fs";
import { Client } from "pg";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const LOCAL_OWNER_ID = "00000000-0000-0000-0000-000000000001";
const LOCAL_OWNER_EMAIL = "zc63463@gmail.com";

function getMigrationFiles(): string[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((f) => path.join(MIGRATIONS_DIR, f));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL env var is required.");
    console.error("Example: postgresql://vocab:vocab@localhost:5432/vocab");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("→ Connected to", new URL(databaseUrl).host);

  try {
    const files = getMigrationFiles();
    console.log(`→ Found ${files.length} migration files`);

    for (const file of files) {
      const sql = fs.readFileSync(file, "utf8");
      const name = path.basename(file);
      process.stdout.write(`  applying ${name} ... `);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("ok");
    }

    // Seed local owner
    console.log("→ Seeding local owner ...");
    await client.query(
      `INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
      [LOCAL_OWNER_ID, LOCAL_OWNER_EMAIL],
    );

    await client.query(
      `INSERT INTO profiles (id, email, role, settings, created_at, updated_at)
       VALUES ($1, $2, 'admin', '{}'::jsonb, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         role = EXCLUDED.role,
         updated_at = NOW()`,
      [LOCAL_OWNER_ID, LOCAL_OWNER_EMAIL],
    );

    console.log("\n✓ Database setup complete.");
    console.log(`  Owner: ${LOCAL_OWNER_EMAIL} (${LOCAL_OWNER_ID})`);
  } catch (err) {
    console.error("\n❌ Setup failed:", (err as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
