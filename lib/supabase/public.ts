import { cache } from "react";
import { createBrowserClient } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/env";

const getCachedPublicSupabaseClient = cache(() => createBrowserClient());

export function getPublicSupabaseClientOrNull() {
  if (!hasDatabaseUrl()) {
    return null;
  }
  return getCachedPublicSupabaseClient();
}

const TRANSIENT_PATTERNS = [
  "terminated",
  "econnreset",
  "fetch failed",
  "network error",
  "etimedout",
  "socket hang up",
];

function isTransientError(error: unknown): boolean {
  const text = String(
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : error,
  ).toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => text.includes(p));
}

export async function withTransientPublicReadRetry<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (!isTransientError(err)) {
      throw err;
    }
    console.warn(
      `[public-read-retry] Transient error for ${label}, retrying in 250ms...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await operation();
  }
}
