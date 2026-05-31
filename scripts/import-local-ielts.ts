/**
 * 本地雅思词汇导入脚本
 *
 * 扫描 `data/ielts-vocabulary/` 下的 `.md` 文件，解析后直接写入本地 PostgreSQL。
 * 不经过 GitHub、不创建 import_run 记录，适合开发和测试迭代。
 *
 * 用法：
 *   npx tsx scripts/import-local-ielts.ts [--dry-run]
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pool } from "../lib/db";
import { parseWordMarkdown } from "../lib/sync/parseMarkdown";
import { renderWordHtmlPayload } from "../lib/sync/upsertWord";
import { createWordUpsertPayload } from "../lib/sync/upsertWord";
import type { ParsedWord } from "../lib/sync/parseMarkdown";

const DATA_DIR = join(process.cwd(), "data", "ielts-vocabulary");
const SOURCE_PREFIX = "Wiki/L1_雅思词汇";
const BATCH_SIZE = 50;

const dryRun = process.argv.includes("--dry-run");

function collectMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry.startsWith("_")) continue;
    const lower = entry.toLowerCase();
    if (lower === "readme.md" || lower === "readme") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectMarkdownFiles(full));
    } else if (lower.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const files = collectMarkdownFiles(DATA_DIR);
  if (files.length === 0) {
    console.log(`[ielts-import] No .md files found in ${DATA_DIR}`);
    return;
  }

  console.log(`[ielts-import] Found ${files.length} file(s)`);

  const parsedWords: ParsedWord[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    const markdown = readFileSync(file, "utf8");
    const relName = file.replace(DATA_DIR, SOURCE_PREFIX).replace(/\\/g, "/");
    try {
      const parsed = parseWordMarkdown(markdown, relName);
      if (parsed.warnings.length > 0) {
        console.warn(`[ielts-import] Warnings in ${relName}:`, parsed.warnings.map((w) => w.errorMessage).join("; "));
      }
      parsedWords.push(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ file: relName, error: msg });
      console.error(`[ielts-import] Failed to parse ${relName}: ${msg}`);
    }
  }

  console.log(`[ielts-import] Parsed OK: ${parsedWords.length}, Errors: ${errors.length}`);
  if (parsedWords.length === 0) return;

  if (dryRun) {
    console.log("[ielts-import] Dry run mode — skipping database writes.");
    for (const w of parsedWords) {
      console.log(`  - ${w.lemma} (${w.slug}) — ${w.shortDefinition ?? "no definition"}`);
    }
    return;
  }

  const db = pool();
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < parsedWords.length; i += BATCH_SIZE) {
    const batch = parsedWords.slice(i, i + BATCH_SIZE);

    // Fetch existing rows for this batch to decide insert vs update
    const slugs = batch.map((w) => w.slug);
    const { rows: existingRows } = await db.query<
      { slug: string; content_hash: string }
    >(
      "SELECT slug, content_hash FROM words WHERE slug = ANY($1)",
      [slugs],
    );
    const existingMap = new Map(existingRows.map((r: { slug: string; content_hash: string }) => [r.slug, r.content_hash]));

    for (const word of batch) {
      const html = await renderWordHtmlPayload(word as Parameters<typeof renderWordHtmlPayload>[0]);
      const payload = createWordUpsertPayload(
        word as Parameters<typeof createWordUpsertPayload>[0],
        now,
        true,
        html,
      );

      const existingHash = existingMap.get(word.slug);
      if (existingHash === word.contentHash) {
        skipped++;
        continue;
      }

      const JSONB_COLUMNS = [
        "examples",
        "metadata",
        "core_definitions",
        "collocations",
        "corpus_items",
        "synonym_items",
        "antonym_items",
      ];
      const columns = Object.keys(payload);
      const values = columns.map((col) => {
        const v = (payload as Record<string, unknown>)[col];
        if (v === undefined) return v;
        if (JSONB_COLUMNS.includes(col) && typeof v === "object" && v !== null) {
          return JSON.stringify(v);
        }
        return v;
      });
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");

      const onConflict = columns
        .filter((c) => c !== "slug")
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(", ");

      const sql = `
        INSERT INTO words (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT (slug) DO UPDATE SET ${onConflict}
      `;

      await db.query(sql, values);

      if (existingHash) {
        updated++;
      } else {
        created++;
      }
    }

    console.log(`[ielts-import] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(parsedWords.length / BATCH_SIZE)} done`);
  }

  console.log(`[ielts-import] Summary: ${created} created, ${updated} updated, ${skipped} unchanged`);

  if (errors.length > 0) {
    console.error("[ielts-import] Errors:");
    for (const e of errors) {
      console.error(`  - ${e.file}: ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
