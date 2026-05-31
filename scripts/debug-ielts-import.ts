/**
 * 调试脚本：找出导致 JSON 格式错误的 IELTS 文件
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseWordMarkdown } from "../lib/sync/parseMarkdown";
import { renderWordHtmlPayload } from "../lib/sync/upsertWord";
import { createWordUpsertPayload } from "../lib/sync/upsertWord";

const DATA_DIR = join(process.cwd(), "data", "ielts-vocabulary");

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

function validateJson(value: unknown, label: string, file: string): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    console.error(`[INVALID JSON] ${file} — field: ${label}`);
    console.error("  Value:", JSON.stringify(value));
    return false;
  }
}

async function main() {
  const files = collectMarkdownFiles(DATA_DIR);
  console.log(`[debug] Found ${files.length} file(s)`);

  let badCount = 0;
  for (const file of files) {
    const markdown = readFileSync(file, "utf8");
    const relName = file.replace(DATA_DIR, "Wiki/L1_雅思词汇").replace(/\\/g, "/");
    const parsed = parseWordMarkdown(markdown, relName);

    const html = await renderWordHtmlPayload(parsed as Parameters<typeof renderWordHtmlPayload>[0]);
    const payload = createWordUpsertPayload(
      parsed as Parameters<typeof createWordUpsertPayload>[0],
      new Date().toISOString(),
      true,
      html,
    );

    // Check every field in payload for JSON validity
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") continue;
      if (!validateJson(value, key, relName)) {
        badCount++;
        if (badCount >= 5) {
          console.log("[debug] Stopping after 5 errors.");
          process.exit(1);
        }
      }
    }
  }

  console.log(`[debug] All ${files.length} files passed JSON validation.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
