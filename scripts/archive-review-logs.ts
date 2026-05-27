#!/usr/bin/env tsx
/**
 * Archive old review logs to prevent unbounded table growth.
 *
 * Calls the PostgreSQL function `archive_review_logs()` which:
 *   1. Moves undone logs older than 30 days → review_logs_archive
 *   2. Moves normal logs older than 2 years → review_logs_archive
 *
 * Designed to run as a scheduled task (cron / systemd timer / Vercel Cron).
 * Safe to re-run: ON CONFLICT (id) DO NOTHING prevents duplicates.
 *
 * Usage:
 *   npx tsx scripts/archive-review-logs.ts
 *   DATABASE_URL=postgresql://... npx tsx scripts/archive-review-logs.ts
 */
import { Client } from "pg";

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
    // Pre-check counts
    const beforeHot = await client.query(
      "SELECT COUNT(*)::int AS n FROM review_logs"
    );
    const beforeArchive = await client.query(
      "SELECT COUNT(*)::int AS n FROM review_logs_archive"
    );
    console.log(
      `  review_logs: ${beforeHot.rows[0].n} rows, ` +
        `archive: ${beforeArchive.rows[0].n} rows`
    );

    // Run archival
    const result = await client.query<{ moved: number }>(
      "SELECT archive_review_logs() AS moved"
    );
    const moved = result.rows[0]?.moved ?? 0;

    // Post-check counts
    const afterHot = await client.query(
      "SELECT COUNT(*)::int AS n FROM review_logs"
    );
    const afterArchive = await client.query(
      "SELECT COUNT(*)::int AS n FROM review_logs_archive"
    );

    console.log(`\n✓ Archival complete.`);
    console.log(`  Moved rows: ${moved}`);
    console.log(
      `  review_logs: ${beforeHot.rows[0].n} → ${afterHot.rows[0].n}`
    );
    console.log(
      `  archive: ${beforeArchive.rows[0].n} → ${afterArchive.rows[0].n}`
    );

    if (moved === 0) {
      console.log("  (Nothing to archive — all rows are within retention window.)");
    }
  } catch (err) {
    console.error("\n❌ Archival failed:", (err as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
