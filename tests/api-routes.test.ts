/**
 * API route integration / smoke tests.
 *
 * Tests key API route handlers by mocking the database and auth layers
 * at the boundary. Uses Node's built-in Request API (Node 18+) so no
 * jsdom dependency is needed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// ── State variables that tests can control ───────────────────────────────
const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@example.com",
};
let mockAuthError = false;

// ── Helper: create a standard supabase-like mock ─────────────────────────
function mockSupabase() {
  // Build a mock that supports both direct builder calls (via supabase.from())
  // and the chainable pattern used by API routes.
  function makeBuilder() {
    const chain: any = { data: [], error: null, count: null };
    const b: any = {
      select: vi.fn(() => b),
      insert: vi.fn(() => b),
      upsert: vi.fn(() => b),
      update: vi.fn(() => b),
      delete: vi.fn(() => b),
      eq: vi.fn(() => b),
      neq: vi.fn(() => b),
      gt: vi.fn(() => b),
      gte: vi.fn(() => b),
      lt: vi.fn(() => b),
      lte: vi.fn(() => b),
      in: vi.fn(() => b),
      order: vi.fn(() => b),
      limit: vi.fn(() => b),
      range: vi.fn(() => b),
      match: vi.fn(() => b),
      like: vi.fn(() => b),
      ilike: vi.fn(() => b),
      contains: vi.fn(() => b),
      or: vi.fn(() => b),
      is: vi.fn(() => b),
      single: vi.fn(() => Promise.resolve({ data: { id: "mock-id" }, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { id: "mock-id", content_hash: "a".repeat(64) }, error: null })),
      then: vi.fn((resolve: any) => resolve({ data: chain.data, error: chain.error, count: chain.count })),
    };
    return b;
  }
  const builder = makeBuilder();
  // The .from() method creates a new builder for a specific table
  (builder as any).from = vi.fn((_table: string) => makeBuilder());
  (builder as any).rpc = vi.fn((_fn: string, _params?: any) => {
    const rpcBuilder = makeBuilder();
    rpcBuilder.then = vi.fn((resolve: any) => resolve({ data: [{ days: 0, total: 0 }], error: null }));
    return rpcBuilder;
  });
  return builder;
}

// ── Mock the auth boundary ───────────────────────────────────────────────
vi.mock("@/lib/request-auth", () => ({
  requireOwnerApiSession: vi.fn(() => {
    if (mockAuthError) {
      return {
        response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
        supabase: null,
        user: null,
      };
    }
    return {
      response: null,
      supabase: mockSupabase(),
      user: mockUser,
    };
  }),
}));

// ── Mock dependencies used by API routes ─────────────────────────────────
vi.mock("@/lib/review/fsrs-adapter", () => ({
  buildInitialSchedulerPayload: vi.fn(() => ({
    difficulty: null,
    due: new Date().toISOString(),
    elapsed_days: 0,
    lapses: 0,
    last_review: new Date().toISOString(),
    reps: 0,
    scheduled_days: 0,
    stability: 0,
    state: 0,
  })),
  applyReviewAnswer: vi.fn(),
  normalizeDesiredRetention: vi.fn((v: number) => v),
  retuneScheduledReviewCard: vi.fn(),
  MIN_DESIRED_RETENTION: 0.7,
  MAX_DESIRED_RETENTION: 0.99,
}));

vi.mock("@/lib/review/settings", () => ({
  getWordbookDesiredRetention: vi.fn(() => Promise.resolve(0.9)),
  getWordbookFsrsWeights: vi.fn(() => Promise.resolve({ weights: null })),
}));

vi.mock("@/lib/wordbook", () => ({
  resolveWordbookId: vi.fn(() => Promise.resolve("default-wordbook-id")),
  getOrCreateDefaultWordbook: vi.fn(() => Promise.resolve("default-wordbook-id")),
}));

vi.mock("@/lib/words", () => ({
  serializeOwnerWordProgress: vi.fn((data: any) => data),
  getPublicWords: vi.fn(() =>
    Promise.resolve({ data: [], error: null, count: 0 }),
  ),
  getPublicWordBySlug: vi.fn(() =>
    Promise.resolve({ configured: true, word: null }),
  ),
}));

vi.mock("@/lib/review/session", () => ({
  getOrCreateReviewSession: vi.fn(() =>
    Promise.resolve({ session: { id: "session-1", cards_seen: 0 }, error: null }),
  ),
}));

vi.mock("@/lib/review/examples", () => ({
  extractPreviewExamples: vi.fn(() => []),
}));

vi.mock("@/lib/review/queue", () => ({
  buildReviewQueueBatch: vi.fn(() => ({
    items: [],
    deferredNewCards: 0,
  })),
  REVIEW_QUEUE_CANDIDATE_LIMIT: 100,
}));

vi.mock("@/lib/dashboard", () => ({
  getDashboardSummary: vi.fn(() => Promise.resolve({ totalWords: 42, dueToday: 7 })),
}));

vi.mock("@/lib/api-error", () => ({
  apiErrorResponse: vi.fn((error: any, _tag: string, _status?: number, _fallbackMsg?: string) =>
    NextResponse.json({ error: error.message ?? "Internal error" }, { status: _status ?? 500 }),
  ),
}));

vi.mock("@/types/database.types", () => ({
  asJson: vi.fn((v: any) => v),
}));

// ── Reset between tests ──────────────────────────────────────────────────
beforeEach(() => {
  mockAuthError = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Create a mock request object that satisfies the interface used by
 * Next.js App Router route handlers. Avoids Node's Request class which
 * has read-only `url`.
 */
function makeReq(fullUrl: string, init?: RequestInit & { body?: string }) {
  const parsedUrl = new URL(fullUrl);
  return {
    url: fullUrl,
    nextUrl: parsedUrl,
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
    json: async () => {
      if (init?.body) return JSON.parse(init.body);
      // For POST tests, the route calls request.json(); default to empty object
      return {};
    },
  };
}

// =========================================================================
// PUBLIC WORDS LISTING
// =========================================================================

describe("API — GET /api/words", () => {
  it("returns a 200 response with the public words data", async () => {
    const { GET } = await import("@/app/api/words/route");
    const req = makeReq("http://localhost:3000/api/words");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });
});

// =========================================================================
// STATS SUMMARY
// =========================================================================

describe("API — GET /api/stats/summary", () => {
  it("returns dashboard summary when authenticated", async () => {
    const { GET } = await import("@/app/api/stats/summary/route");
    const req = makeReq("http://localhost:3000/api/stats/summary");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalWords", 42);
    expect(body).toHaveProperty("dueToday", 7);
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockAuthError = true;
    const { GET } = await import("@/app/api/stats/summary/route");
    const req = makeReq("http://localhost:3000/api/stats/summary");
    const res = await GET(req as any);

    expect(res.status).toBe(401);
  });
});

// =========================================================================
// REVIEW — ADD WORD
// =========================================================================

describe("API — POST /api/review/add", () => {
  it("adds a word to the review queue with valid payload", async () => {
    const { POST } = await import("@/app/api/review/add/route");
    const req = makeReq("http://localhost:3000/api/review/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
    });

    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("progressId");
  });

  it("returns 400 for missing wordId in payload", async () => {
    const { POST } = await import("@/app/api/review/add/route");
    const req = makeReq("http://localhost:3000/api/review/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);

    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthError = true;
    const { POST } = await import("@/app/api/review/add/route");
    const req = makeReq("http://localhost:3000/api/review/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
    });

    const res = await POST(req as any);

    expect(res.status).toBe(401);
  });
});

// =========================================================================
// REVIEW QUEUE
// =========================================================================

describe("API — GET /api/review/queue", () => {
  it("returns the review queue with stats", async () => {
    const { GET } = await import("@/app/api/review/queue/route");
    const req = makeReq("http://localhost:3000/api/review/queue");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("session");
    expect(body).toHaveProperty("stats");
    expect(body.stats).toHaveProperty("dueToday");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthError = true;
    const { GET } = await import("@/app/api/review/queue/route");
    const req = makeReq("http://localhost:3000/api/review/queue");
    const res = await GET(req as any);

    expect(res.status).toBe(401);
  });
});

// =========================================================================
// REVIEW STATS
// =========================================================================

describe("API — GET /api/review/stats", () => {
  it("returns review statistics", async () => {
    const { GET } = await import("@/app/api/review/stats/route");
    const req = makeReq("http://localhost:3000/api/review/stats");
    const res = await GET(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });
});

// =========================================================================
// WORD DETAIL
// =========================================================================

describe("API — GET /api/words/[slug]", () => {
  it("returns a public word detail or 404", async () => {
    const { GET } = await import("@/app/api/words/[slug]/route");
    const req = makeReq("http://localhost:3000/api/words/test-word");
    const res = await GET(req as any, { params: Promise.resolve({ slug: "test-word" }) });

    expect([200, 404]).toContain(res.status);
  });
});

// =========================================================================
// ERROR FORMAT CONSISTENCY
// =========================================================================

describe("API — error format consistency", () => {
  it("returns JSON with error property on auth failure", async () => {
    mockAuthError = true;
    const { GET } = await import("@/app/api/stats/summary/route");
    const req = makeReq("http://localhost:3000/api/stats/summary");
    const res = await GET(req as any);

    expect(res.status).toBe(401);
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/json");
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns JSON with ok property on successful word add", async () => {
    const { POST } = await import("@/app/api/review/add/route");
    const req = makeReq("http://localhost:3000/api/review/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
    });

    const res = await POST(req as any);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
