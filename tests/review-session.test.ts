/**
 * Tests for lib/review/session.ts — review session lifecycle.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock utilities ──────────────────────────────────────────────────────

/** Create a mock supabase client whose query chain resolves to given data. */
function mockSupabase(resolveData: any = null, resolveError: any = null) {
  const final = Promise.resolve({ data: resolveData, error: resolveError });
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => final),
    maybeSingle: vi.fn(() => final),
    then: vi.fn((resolve: any) => resolve({ data: resolveData, error: resolveError })),
  };
  builder.from = vi.fn(() => builder);
  return builder;
}

/** Mock supabase that returns data via maybeSingle. */
function mockSupabaseMaybeSingle(data: any) {
  return mockSupabase(data, null);
}

/** Mock supabase that returns error via maybeSingle. */
function mockSupabaseError(message: string) {
  return mockSupabase(null, { message });
}

// ── Mock startOfTodayIso so dates are deterministic ─────────────────────
const TODAY = "2026-06-03T00:00:00.000Z";
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, startOfTodayIso: vi.fn(() => TODAY) };
});

import {
  getActiveReviewSession,
  getOrCreateReviewSession,
  incrementSessionCardsSeen,
} from "@/lib/review/session";

const USER_ID = "uu-1";
const WORD_BOOK_ID = "wb-1";

// =========================================================================
// getOrCreateReviewSession
// =========================================================================

describe("getOrCreateReviewSession", () => {
  it("returns the existing session when it was created today", async () => {
    const todaySession = { id: "s1", started_at: "2026-06-03T08:00:00.000Z", cards_seen: 5 };
    const supabase = mockSupabaseMaybeSingle(todaySession);

    const { session, error } = await getOrCreateReviewSession(supabase, USER_ID, WORD_BOOK_ID);

    expect(error).toBeNull();
    expect(session).toEqual({
      id: "s1",
      started_at: "2026-06-03T08:00:00.000Z",
      cards_seen: 5,
    });
  });

  it("ends a stale (yesterday) session and creates a new one for today", async () => {
    const yesterdaySession = { id: "old-1", started_at: "2026-06-02T10:00:00.000Z", cards_seen: 12 };
    const newSession = { id: "new-1", started_at: "2026-06-03T09:00:00.000Z", cards_seen: 0 };

    // We need a supabase where:
    // 1. maybeSingle → yesterdaySession
    // 2. update → success
    // 3. single → newSession
    const builder = mockSupabase(null, null);
    // Override maybeSingle for the first call
    builder.maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: yesterdaySession, error: null });
    // Override single for the insert
    builder.single = vi
      .fn()
      .mockResolvedValueOnce({ data: newSession, error: null });

    const { session, error } = await getOrCreateReviewSession(builder, USER_ID, WORD_BOOK_ID);

    expect(error).toBeNull();
    expect(session).toEqual({
      id: "new-1",
      started_at: "2026-06-03T09:00:00.000Z",
      cards_seen: 0,
    });
    // Verify the old session was ended
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ ended_at: expect.any(String) }),
    );
  });

  it("creates a new session when no session exists at all", async () => {
    const newSession = { id: "fresh-1", started_at: "2026-06-03T09:00:00.000Z", cards_seen: 0 };
    const builder = mockSupabase(null, null);
    builder.maybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    builder.single = vi.fn().mockResolvedValueOnce({ data: newSession, error: null });

    const { session, error } = await getOrCreateReviewSession(builder, USER_ID, WORD_BOOK_ID);

    expect(error).toBeNull();
    expect(session).toEqual(newSession);
  });

  it("returns error when the initial query fails", async () => {
    const supabase = mockSupabaseError("connection lost");

    const { session, error } = await getOrCreateReviewSession(supabase, USER_ID, WORD_BOOK_ID);

    expect(session).toBeNull();
    expect(error).toEqual({ message: "connection lost" });
  });

  it("returns error when the insert fails after ending old session", async () => {
    const yesterdaySession = { id: "old-1", started_at: "2026-06-02T10:00:00.000Z", cards_seen: 12 };
    const builder = mockSupabase(null, null);
    builder.maybeSingle = vi.fn().mockResolvedValueOnce({ data: yesterdaySession, error: null });
    builder.single = vi.fn().mockResolvedValueOnce({ data: null, error: { message: "insert failed" } });

    const { session, error } = await getOrCreateReviewSession(builder, USER_ID, WORD_BOOK_ID);

    expect(session).toBeNull();
    expect(error).toEqual({ message: "insert failed" });
  });
});

// =========================================================================
// getActiveReviewSession
// =========================================================================

describe("getActiveReviewSession", () => {
  it("returns the session when one is active today", async () => {
    const activeSession = { id: "s1", started_at: "2026-06-03T08:00:00.000Z", cards_seen: 3 };
    const supabase = mockSupabaseMaybeSingle(activeSession);

    const session = await getActiveReviewSession(supabase, USER_ID, WORD_BOOK_ID);

    expect(session).toEqual(activeSession);
  });

  it("returns null when no active session exists", async () => {
    const supabase = mockSupabaseMaybeSingle(null);

    const session = await getActiveReviewSession(supabase, USER_ID, WORD_BOOK_ID);

    expect(session).toBeNull();
  });

  it("throws on DB error", async () => {
    const supabase = mockSupabaseError("timeout");

    await expect(
      getActiveReviewSession(supabase, USER_ID, WORD_BOOK_ID),
    ).rejects.toEqual({ message: "timeout" });
  });
});

// =========================================================================
// incrementSessionCardsSeen
// =========================================================================

describe("incrementSessionCardsSeen", () => {
  it("increments cards_seen by 1", async () => {
    const builder = mockSupabase(null, null);
    // First call: select returns current count
    builder.single = vi
      .fn()
      .mockResolvedValueOnce({ data: { cards_seen: 7 }, error: null });
    // Second call: update (we don't assert return value)

    await incrementSessionCardsSeen(builder, "session-1");

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ cards_seen: 8 }),
    );
    expect(builder.eq).toHaveBeenCalledWith("id", "session-1");
  });

  it("increments from 0 to 1", async () => {
    const builder = mockSupabase(null, null);
    builder.single = vi
      .fn()
      .mockResolvedValueOnce({ data: { cards_seen: 0 }, error: null });

    await incrementSessionCardsSeen(builder, "session-1");

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ cards_seen: 1 }),
    );
  });

  it("throws when the select query fails", async () => {
    const supabase = mockSupabaseError("session not found");

    await expect(incrementSessionCardsSeen(supabase, "bad-id")).rejects.toEqual({
      message: "session not found",
    });
  });

  it("throws when the update query fails", async () => {
    // The update path uses `await builder` which relies on the builder's
    // `then()` method. We verify that the error-propagation contract works
    // by using a mock that resolves with an error via then().
    const supabase = mockSupabase(null, null);
    supabase.single = vi
      .fn()
      .mockResolvedValueOnce({ data: { cards_seen: 3 }, error: null });

    // Override then to return an error for the update call
    supabase.then = (resolve: any) =>
      resolve({ data: null, error: { message: "update failed" } });

    await expect(
      incrementSessionCardsSeen(supabase, "session-1"),
    ).rejects.toEqual({ message: "update failed" });
  });
});
