/**
 * Backup script for the local PostgreSQL database.
 *
 * Usage:
 *   pnpm backup          → creates backups/vocab-YYYY-MM-DD-HH-mm-ss.sql
 *   pnpm backup:list     → lists all backups with size and date
 *   pnpm backup:restore  → restores from the latest backup (prompts for confirmation)
 *
 * Backups are plain-text SQL dumps so they are human-readable and can be
 * hand-edited if necessary.  They include schema + data for the whole DB.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import * as readline from "readline";

const BACKUP_DIR = resolve(process.cwd(), "backups");
const DATABASE_URL = process.env.DATABASE_URL;

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function timestamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createBackup() {
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set.  Aborting.");
    process.exit(1);
  }

  ensureBackupDir();
  const fileName = `vocab-${timestamp()}.sql`;
  const filePath = join(BACKUP_DIR, fileName);

  console.log(`💾 Creating backup: ${fileName}`);
  try {
    const dump = execSync(`pg_dump "${DATABASE_URL}" --format=plain --verbose`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });
    writeFileSync(filePath, dump, "utf-8");
    const size = statSync(filePath).size;
    console.log(`✅ Backup written to backups/${fileName} (${formatBytes(size)})`);
  } catch (err) {
    console.error("❌ pg_dump failed:", err);
    process.exit(1);
  }
}

function listBackups() {
  if (!existsSync(BACKUP_DIR)) {
    console.log("📂 No backups directory yet.");
    return;
  }

  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => {
      const stats = statSync(join(BACKUP_DIR, f));
      return { name: f, size: stats.size, mtime: stats.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    console.log("📂 No backups found.");
    return;
  }

  console.log(`\n📦 ${files.length} backup(s) in ./backups/\n`);
  for (const file of files) {
    const date = file.mtime.toLocaleString("zh-CN");
    console.log(`  ${file.name.padEnd(40)} ${formatBytes(file.size).padStart(10)}  ${date}`);
  }
  console.log();
}

function restoreBackup() {
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set.  Aborting.");
    process.exit(1);
  }

  if (!existsSync(BACKUP_DIR)) {
    console.error("❌ No backups directory found.");
    process.exit(1);
  }

  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => {
      const stats = statSync(join(BACKUP_DIR, f));
      return { name: f, mtime: stats.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    console.error("❌ No backup files found.");
    process.exit(1);
  }

  const latest = files[0].name;
  const filePath = join(BACKUP_DIR, latest);

  console.warn("⚠️  This will DESTROY the current database and replace it with the backup.");
  console.warn(`   Target backup: ${latest}`);
  console.warn(`   Database:      ${DATABASE_URL.replace(/:.+@/, ":****@")}`);

  if (process.argv.includes("--yes")) {
    console.log("⏳ --yes flag detected, proceeding without confirmation...");
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Type "RESTORE" to confirm: ', (answer: string) => {
      rl.close();
      if (answer.trim() !== "RESTORE") {
        console.log("❌ Cancelled.");
        process.exit(0);
      }
      performRestore(filePath);
    });
    return;
  }

  performRestore(filePath);
}

function performRestore(filePath: string) {
  console.log(`⏳ Restoring from ${filePath}...`);
  try {
    execSync(`psql "${DATABASE_URL}" --file="${filePath}"`, {
      stdio: "inherit",
      encoding: "utf-8",
    });
    console.log("✅ Restore completed.");
  } catch (err) {
    console.error("❌ Restore failed:", err);
    process.exit(1);
  }
}

// CLI router
const command = process.argv[2];

switch (command) {
  case "list":
    listBackups();
    break;
  case "restore":
    restoreBackup();
    break;
  case "create":
  default:
    createBackup();
    break;
}
