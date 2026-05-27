const defaults = {
  repoOwner: "zc63463-cmyk",
  repoName: "Obsidian-Eg",
  repoBranch: "main",
  wordsPrefixes: [
    "Wiki/L0_超纲词",
    "Wiki/L0_基础词",
    "Wiki/L0_单词集合",
  ],
} as const;

function parsePrefixes(value: string | undefined) {
  if (!value) return null;
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

export const env = {
  // Local Postgres
  databaseUrl: process.env.DATABASE_URL,
  // Auth / owner
  ownerEmail: process.env.OWNER_EMAIL?.trim().toLowerCase(),
  // Secrets
  importSecret: process.env.IMPORT_SECRET,
  cronSecret: process.env.CRON_SECRET,
  // GitHub sync
  repoOwner: process.env.OBSIDIAN_REPO_OWNER ?? defaults.repoOwner,
  repoName: process.env.OBSIDIAN_REPO_NAME ?? defaults.repoName,
  repoBranch: process.env.OBSIDIAN_REPO_BRANCH ?? defaults.repoBranch,
  wordsPrefixes:
    parsePrefixes(process.env.OBSIDIAN_WORDS_PREFIXES) ??
    parsePrefixes(process.env.OBSIDIAN_WORDS_PREFIX) ??
    [...defaults.wordsPrefixes],
};

export function hasDatabaseUrl() {
  return Boolean(env.databaseUrl);
}

export function requireDatabaseUrl() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return env.databaseUrl;
}

// Backwards-compatible shims for code that still calls Supabase env helpers
export function hasSupabasePublicEnv() {
  return hasDatabaseUrl();
}

export function hasSupabaseAdminEnv() {
  return hasDatabaseUrl();
}

export function requireSupabasePublicEnv() {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return { url: "http://local", key: "local" };
}

export function requireSupabaseAdminEnv() {
  return requireSupabasePublicEnv();
}
