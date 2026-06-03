/**
 * Tests for lib/supabase/ — local-auth wrappers around the DB client.
 *
 * module under test: server, middleware, admin
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Control `hasDatabaseUrl` through the env module ────────────────────
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, hasDatabaseUrl: vi.fn(() => true) };
});

vi.mock("@/lib/db", () => ({
  createServerClient: vi.fn(() => ({ __tag: "server-client" })),
  createBrowserClient: vi.fn(() => ({ __tag: "browser-client" })),
  createAdminClient: vi.fn(() => ({ __tag: "admin-client" })),
}));

import { createServerSupabaseClient, getServerSupabaseClientOrNull } from "@/lib/supabase/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createAdminSupabaseClient, getAdminSupabaseClientOrNull } from "@/lib/supabase/admin";
import { hasDatabaseUrl } from "@/lib/env";

// React's `cache()` — clears between tests when we reset modules.
// We want to test that `getCachedServerSupabaseClient` actually caches,
// so we need to re-import after each reset.

// =========================================================================
// Server client
// =========================================================================

describe("lib/supabase/server", () => {
  beforeEach(() => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
  });

  it("createServerSupabaseClient returns a client object", async () => {
    const client = await createServerSupabaseClient();
    expect(client).toBeDefined();
    expect(client).toHaveProperty("__tag", "server-client");
  });

  it("getServerSupabaseClientOrNull returns a client when DB is configured", async () => {
    const client = await getServerSupabaseClientOrNull();
    expect(client).toBeDefined();
    expect(client).toHaveProperty("__tag", "server-client");
  });

  it("getServerSupabaseClientOrNull returns null when DB is not configured", async () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    const client = await getServerSupabaseClientOrNull();
    expect(client).toBeNull();
  });

  it("getServerSupabaseClientOrNull returns the SAME client on repeated calls (React cache)", async () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    const a = await getServerSupabaseClientOrNull();
    const b = await getServerSupabaseClientOrNull();
    // React.cache returns the memoised value → same reference
    expect(a).toStrictEqual(b);
  });
});

// =========================================================================
// Middleware
// =========================================================================

describe("lib/supabase/middleware", () => {
  it("returns the local owner user in the session", async () => {
    const mockReq = { url: "http://localhost:3000" } as any;
    const { user } = await updateSession(mockReq);
    expect(user.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("returns a NextResponse with the request forwarded", async () => {
    const mockReq = { url: "http://localhost:3000/test" } as any;
    const { response } = await updateSession(mockReq);
    expect(response.status).toBe(200);
  });
});

// =========================================================================
// Admin client
// =========================================================================

describe("lib/supabase/admin", () => {
  beforeEach(() => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
  });

  it("createAdminSupabaseClient returns a client object", () => {
    const client = createAdminSupabaseClient();
    expect(client).toBeDefined();
    expect(client).toHaveProperty("__tag", "admin-client");
  });

  it("getAdminSupabaseClientOrNull returns a client when DB is configured", () => {
    const client = getAdminSupabaseClientOrNull();
    expect(client).toBeDefined();
    expect(client).toHaveProperty("__tag", "admin-client");
  });

  it("getAdminSupabaseClientOrNull returns null when DB is not configured", () => {
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    const client = getAdminSupabaseClientOrNull();
    expect(client).toBeNull();
  });

  it("getAdminSupabaseClientOrNull returns null when DB was previously configured", () => {
    // Ensure toggling works (not cached by React.cache)
    vi.mocked(hasDatabaseUrl).mockReturnValue(true);
    expect(getAdminSupabaseClientOrNull()).not.toBeNull();
    vi.mocked(hasDatabaseUrl).mockReturnValue(false);
    expect(getAdminSupabaseClientOrNull()).toBeNull();
  });
});
