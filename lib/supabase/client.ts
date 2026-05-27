"use client";

import { createBrowserClient as createDbClient } from "@/lib/db";

export function createBrowserSupabaseClient() {
  // In local mode all data access should go through API routes (Server
  // Actions or Route Handlers). Direct pg connections don't work in the
  // browser. If you hit this error, move the query to an API route and
  // call it with fetch() from the client component.
  if (typeof window !== "undefined") {
    console.warn(
      "createBrowserSupabaseClient() in local mode delegates to the server-side implementation. " +
      "For browser components, use API routes instead.",
    );
  }
  return createDbClient();
}
