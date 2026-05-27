// Scan local Obsidian-Eg corpus and run parseWordMarkdown against every file,
// collecting thrown exceptions. Helps pinpoint which files trip the new
// structured parsers without waiting for a Vercel import round-trip.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseWordMarkdown } from "@/lib/sync/parseMarkdown";

const WIKI_ROOT = "D:\\Notes\\Obsidian-Eg\\Wiki";
const PREFIXES = ["L0_超纲词", "L0_基础词", "L0_单词集合"];

interface Failure {
  error: string;
  sourcePath: string;
  stack: string | null;
}

function collectMarkdownFiles(dir: string, repoRelative: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = `${repoRelative}/${entry}`;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectMarkdownFiles(full, rel));
    } else if (entry.toLowerCase().endsWith(".md") && !entry.startsWith("_")) {
      out.push(rel);
    }
  }
  return out;
}

const failures: Failure[] = [];
let ok = 0;

for (const prefix of PREFIXES) {
  const dir = join(WIKI_ROOT, prefix);
  const files = collectMarkdownFiles(dir, `Wiki/${prefix}`);
  for (const rel of files) {
    const abs = join(WIKI_ROOT, relative("Wiki", rel));
    const markdown = readFileSync(abs, "utf8");
    try {
      parseWordMarkdown(markdown, rel);
      ok += 1;
    } catch (error) {
      failures.push({
        error: error instanceof Error ? error.message : String(error),
        sourcePath: rel,
        stack: error instanceof Error ? error.stack ?? null : null,
      });
    }
  }
}

console.log(`Parsed ok: ${ok}`);
console.log(`Failures: ${failures.length}`);
console.log("---");
// Group failures by error message so the output is scannable even with many
// files impacted.
const byMessage = new Map<string, Failure[]>();
for (const failure of failures) {
  const bucket = byMessage.get(failure.error) ?? [];
  bucket.push(failure);
  byMessage.set(failure.error, bucket);
}
for (const [message, group] of byMessage) {
  console.log(`\n[${group.length}x] ${message}`);
  for (const f of group.slice(0, 3)) {
    console.log(`  - ${f.sourcePath}`);
  }
  if (group.length > 3) {
    console.log(`  ... and ${group.length - 3} more`);
  }
  const first = group[0];
  if (first.stack) {
    const firstFrame = first.stack.split("\n").slice(0, 4).join("\n");
    console.log(`  Stack:\n${firstFrame}`);
  }
}
