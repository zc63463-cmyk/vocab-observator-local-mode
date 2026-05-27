import { cache } from "react";
import { createServerClient } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/env";

export async function createServerSupabaseClient() {
  return createServerClient();
}

const getCachedServerSupabaseClient = cache(async () => createServerSupabaseClient());

export async function getServerSupabaseClientOrNull() {
  if (!hasDatabaseUrl()) {
    return null;
  }
  return getCachedServerSupabaseClient();
}
