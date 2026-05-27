import { createAdminClient } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/env";

export function createAdminSupabaseClient() {
  return createAdminClient();
}

export function getAdminSupabaseClientOrNull() {
  if (!hasDatabaseUrl()) {
    return null;
  }
  return createAdminSupabaseClient();
}
