/**
 * Tests for the local PostgreSQL QueryBuilder (lib/db.ts).
 *
 * All SQL generation is verified by mocking the `pg` Pool and inspecting
 * the queries that would be sent to the database. No real DB connection
 * is required.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock Setup (hoisted by vitest before any imports) ────────────────────
const mockQuery = vi.fn();

// Use a plain function (not an arrow) so vitest treats it as a valid
// constructor substitute for `new Pool(...)`.
vi.mock("pg", () => ({
  Pool: function MockPool() {
    this.query = mockQuery;
  },
  types: {
    builtins: {
      NUMERIC: 1700,
      INT8: 20,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      DATE: 1082,
    },
    setTypeParser: vi.fn(),
  },
}));

// Must import AFTER the mock is defined
import { createBrowserClient, createServerClient } from "@/lib/db";
import { getPool } from "@/lib/db";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Extract the last SQL string sent to the mocked pool. */
function lastSql(): string {
  const calls = mockQuery.mock.calls;
  if (calls.length === 0) throw new Error("No SQL was generated");
  return calls[calls.length - 1][0] as string;
}

/** Extract the last parameter array sent to the mocked pool. */
function lastParams(): unknown[] {
  const calls = mockQuery.mock.calls;
  if (calls.length === 0) throw new Error("No SQL was generated");
  return (calls[calls.length - 1][1] as unknown[]) ?? [];
}

/** Normalise whitespace for reliable SQL comparison. */
function nws(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function setupDbUrl() {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
}

function teardownDbUrl() {
  delete process.env.DATABASE_URL;
}

// ── Hooks ────────────────────────────────────────────────────────────────

beforeEach(() => {
  setupDbUrl();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  teardownDbUrl();
});

// =========================================================================
// CLIENT FACTORY
// =========================================================================

describe("Client factory", () => {
  it("createServerClient returns a working from() builder", async () => {
    const client = createServerClient();
    await client.from("words").select();
    expect(lastSql()).toContain('FROM "words"');
  });

  it("createBrowserClient returns a working from() builder", async () => {
    const client = createBrowserClient();
    await client.from("words").select();
    expect(lastSql()).toContain('FROM "words"');
  });

  it("auth.getUser returns the local owner", async () => {
    const client = createServerClient();
    const { data, error } = await client.auth.getUser();
    expect(error).toBeNull();
    expect(data.user.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("auth.getSession returns a session with the local owner", async () => {
    const client = createServerClient();
    const { data, error } = await client.auth.getSession();
    expect(error).toBeNull();
    expect(data.session.user.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("auth.signOut returns no error", async () => {
    const client = createServerClient();
    const { error } = await client.auth.signOut();
    expect(error).toBeNull();
  });

  it("auth.onAuthStateChange fires SIGNED_IN immediately", async () => {
    const client = createServerClient();
    const cb = vi.fn();
    const result = client.auth.onAuthStateChange(cb);
    expect(cb).toHaveBeenCalledWith("SIGNED_IN", expect.objectContaining({ user: expect.any(Object) }));
    expect(result.data.subscription.unsubscribe).toBeDefined();
  });

  it("auth.admin.listUsers returns the local owner", async () => {
    const client = createServerClient();
    const { data, error } = await client.auth.admin.listUsers();
    expect(error).toBeNull();
    expect(data.users).toHaveLength(1);
    expect(data.users[0].id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("auth.admin.createUser returns the local owner", async () => {
    const client = createServerClient();
    const { data, error } = await client.auth.admin.createUser({ email: "test@test.com" });
    expect(error).toBeNull();
    expect(data.user.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("auth.admin.generateLink returns a local callback URL", async () => {
    const client = createServerClient();
    const { data, error } = await client.auth.admin.generateLink({ type: "signup", email: "a@b.com" });
    expect(error).toBeNull();
    expect(data.properties.action_link).toContain("localhost");
  });

  it("storage.from returns an unimplemented upload stub", async () => {
    const client = createServerClient();
    const bucket = client.storage.from("avatars");
    const { data, error } = await bucket.upload();
    expect(data).toBeNull();
    expect(error).toEqual({ message: "Storage not implemented in local mode" });
  });
});

// =========================================================================
// SELECT — BASIC
// =========================================================================

describe("QueryBuilder — SELECT", () => {
  it("generates SELECT * when no columns specified", async () => {
    await createServerClient().from("words").select();
    expect(nws(lastSql())).toBe('SELECT * FROM "words"');
  });

  it("generates SELECT with specific columns", async () => {
    await createServerClient().from("words").select("id,lemma,pos");
    expect(nws(lastSql())).toBe('SELECT "id", "lemma", "pos" FROM "words"');
  });

  it("generates SELECT with alias expressions", async () => {
    await createServerClient().from("words").select("label:lemma");
    // The alias `label:lemma` produces `lemma AS "label"` (alias is quoted, column is not)
    expect(nws(lastSql())).toBe('SELECT lemma AS "label" FROM "words"');
  });

  it("adds a simple WHERE clause via eq()", async () => {
    await createServerClient().from("words").select().eq("id", "abc-123");
    expect(nws(lastSql())).toBe('SELECT * FROM "words" WHERE "words"."id" = $1');
    expect(lastParams()).toEqual(["abc-123"]);
  });

  it("supports chaining multiple eq() filters", async () => {
    await createServerClient().from("words").select().eq("lang_code", "en").eq("is_published", true);
    expect(nws(lastSql())).toBe(
      'SELECT * FROM "words" WHERE "words"."lang_code" = $1 AND "words"."is_published" = $2',
    );
    expect(lastParams()).toEqual(["en", true]);
  });

  it("returns no rows via empty data when mock resolves to []", async () => {
    const result = await createServerClient().from("words").select();
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("returns mock rows when mock resolves with data", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "1", lemma: "test" }] });
    const result = await createServerClient().from("words").select();
    expect(result.data).toEqual([{ id: "1", lemma: "test" }]);
  });
});

// =========================================================================
// FILTERS — EQUALITY & COMPARISON
// =========================================================================

describe("QueryBuilder — eq / neq", () => {
  it("eq generates IS NULL for null value", async () => {
    await createServerClient().from("words").select().eq("deleted_at", null);
    expect(nws(lastSql())).toContain('"words"."deleted_at" IS NULL');
  });

  it("neq generates IS NOT NULL for null value", async () => {
    await createServerClient().from("words").select().neq("deleted_at", null);
    expect(nws(lastSql())).toContain('"words"."deleted_at" IS NOT NULL');
  });

  it("eq with undefined also generates IS NULL", async () => {
    await createServerClient().from("words").select().eq("col", undefined);
    expect(nws(lastSql())).toContain('"words"."col" IS NULL');
  });

  it("neq with undefined generates IS NOT NULL", async () => {
    await createServerClient().from("words").select().neq("col", undefined);
    expect(nws(lastSql())).toContain('"words"."col" IS NOT NULL');
  });
});

describe("QueryBuilder — comparison operators", () => {
  it("gt generates > filter", async () => {
    await createServerClient().from("words").select().gt("review_count", 5);
    expect(nws(lastSql())).toContain('"words"."review_count" > $1');
    expect(lastParams()).toEqual([5]);
  });

  it("gte generates >= filter", async () => {
    await createServerClient().from("words").select().gte("review_count", 5);
    expect(nws(lastSql())).toContain('"words"."review_count" >= $1');
  });

  it("lt generates < filter", async () => {
    await createServerClient().from("words").select().lt("review_count", 5);
    expect(nws(lastSql())).toContain('"words"."review_count" < $1');
  });

  it("lte generates <= filter", async () => {
    await createServerClient().from("words").select().lte("review_count", 5);
    expect(nws(lastSql())).toContain('"words"."review_count" <= $1');
  });

  it("chains multiple comparison operators", async () => {
    await createServerClient()
      .from("words")
      .select()
      .gt("review_count", 3)
      .lt("review_count", 10);
    const sql = nws(lastSql());
    expect(sql).toContain('"words"."review_count" > $1');
    expect(sql).toContain('"words"."review_count" < $2');
  });
});

describe("QueryBuilder — is()", () => {
  it("is with null generates IS NULL", async () => {
    await createServerClient().from("words").select().is("deleted_at", null);
    expect(nws(lastSql())).toContain('"words"."deleted_at" IS NULL');
  });

  it("is with a truthy value generates IS filter", async () => {
    await createServerClient().from("words").select().is("is_published", true);
    expect(nws(lastSql())).toContain('"words"."is_published" IS $1');
    expect(lastParams()).toEqual([true]);
  });

  it("is with undefined generates IS NULL", async () => {
    await createServerClient().from("words").select().is("deleted_at", undefined);
    expect(nws(lastSql())).toContain('"words"."deleted_at" IS NULL');
  });
});

// =========================================================================
// FILTERS — IN / CONTAINS
// =========================================================================

describe("QueryBuilder — in()", () => {
  it("generates IN clause with placeholders", async () => {
    await createServerClient().from("words").select().in("id", ["a", "b", "c"]);
    expect(nws(lastSql())).toContain('"words"."id" IN ($1, $2, $3)');
    expect(lastParams()).toEqual(["a", "b", "c"]);
  });

  it("generates FALSE for an empty array", async () => {
    await createServerClient().from("words").select().in("id", []);
    expect(nws(lastSql())).toContain("WHERE FALSE");
  });

  it("handles a single-element array", async () => {
    await createServerClient().from("words").select().in("id", ["only"]);
    expect(nws(lastSql())).toContain('"words"."id" IN ($1)');
    expect(lastParams()).toEqual(["only"]);
  });
});

describe("QueryBuilder — contains()", () => {
  it("generates @> (JSONB contains) operator", async () => {
    await createServerClient().from("words").select().contains("metadata", { key: "val" });
    expect(nws(lastSql())).toContain('"words"."metadata" @> $1');
    expect(lastParams()).toEqual(['{"key":"val"}']);
  });

  it("generates @> with an array value", async () => {
    await createServerClient().from("words").select().contains("aliases", ["foo", "bar"]);
    expect(nws(lastSql())).toContain('"words"."aliases" @> $1');
    expect(lastParams()).toEqual(['["foo","bar"]']);
  });
});

// =========================================================================
// FILTERS — LIKE / ILIKE / TextSearch
// =========================================================================

describe("QueryBuilder — like / ilike", () => {
  it("generates LIKE clause", async () => {
    await createServerClient().from("words").select().like("lemma", "test%");
    expect(nws(lastSql())).toContain('"words"."lemma" LIKE $1');
    expect(lastParams()).toEqual(["test%"]);
  });

  it("generates ILIKE clause", async () => {
    await createServerClient().from("words").select().ilike("lemma", "Test%");
    expect(nws(lastSql())).toContain('"words"."lemma" ILIKE $1');
    expect(lastParams()).toEqual(["Test%"]);
  });
});

describe("QueryBuilder — textSearch()", () => {
  it("generates ILIKE with %query% wrapping", async () => {
    await createServerClient().from("words").select().textSearch("lemma", "fox");
    expect(nws(lastSql())).toContain('"words"."lemma" ILIKE $1');
    expect(lastParams()).toEqual(["%fox%"]);
  });
});

// =========================================================================
// FILTERS — OR / MATCH
// =========================================================================

describe("QueryBuilder — or()", () => {
  it("generates OR group from comma-separated conditions", async () => {
    await createServerClient()
      .from("words")
      .select()
      .or("lemma.eq.fox,pos.eq.verb");
    const sql = nws(lastSql());
    expect(sql).toContain('("words"."lemma" = $1 OR "words"."pos" = $2)');
    expect(lastParams()).toEqual(["fox", "verb"]);
  });

  it("supports neq operator inside or()", async () => {
    await createServerClient()
      .from("words")
      .select()
      .or("lang_code.neq.en,lang_code.neq.fr");
    const sql = nws(lastSql());
    expect(sql).toContain("!=");
    expect(lastParams()).toEqual(["en", "fr"]);
  });

  it("supports like operator inside or()", async () => {
    await createServerClient()
      .from("words")
      .select()
      .or("lemma.like.test%");
    const sql = nws(lastSql());
    expect(sql).toContain("LIKE");
    expect(lastParams()).toEqual(["test%"]);
  });

  it("combines or() with AND filters via eq()", async () => {
    await createServerClient()
      .from("words")
      .select()
      .eq("lang_code", "en")
      .or("lemma.eq.fox,lemma.eq.cat");
    const sql = nws(lastSql());
    expect(sql).toContain('"words"."lang_code" = $1');
    expect(sql).toContain('("words"."lemma" = $2 OR "words"."lemma" = $3)');
  });
});

describe("QueryBuilder — match()", () => {
  it("converts object to multiple eq() filters", async () => {
    await createServerClient()
      .from("words")
      .select()
      .match({ lang_code: "en", is_published: true });
    const sql = nws(lastSql());
    expect(sql).toContain('"words"."lang_code" = $1');
    expect(sql).toContain('"words"."is_published" = $2');
  });

  it("match with empty object generates no extra filters", async () => {
    await createServerClient().from("words").select().match({});
    expect(nws(lastSql())).toBe('SELECT * FROM "words"');
  });
});

// =========================================================================
// ORDER / LIMIT / RANGE
// =========================================================================

describe("QueryBuilder — order()", () => {
  it("generates ORDER BY ASC by default", async () => {
    await createServerClient().from("words").select().order("lemma");
    expect(nws(lastSql())).toBe('SELECT * FROM "words" ORDER BY "lemma" ASC');
  });

  it("generates ORDER BY DESC when ascending: false", async () => {
    await createServerClient()
      .from("words")
      .select()
      .order("created_at", { ascending: false });
    expect(nws(lastSql())).toBe('SELECT * FROM "words" ORDER BY "created_at" DESC');
  });

  it("generates NULLS FIRST", async () => {
    await createServerClient()
      .from("words")
      .select()
      .order("due_at", { ascending: true, nullsFirst: true });
    expect(nws(lastSql())).toContain("NULLS FIRST");
  });

  it("generates NULLS LAST", async () => {
    await createServerClient()
      .from("words")
      .select()
      .order("due_at", { ascending: true, nullsFirst: false });
    expect(nws(lastSql())).toContain("NULLS LAST");
  });

  it("chains multiple order clauses", async () => {
    await createServerClient()
      .from("words")
      .select()
      .order("lang_code")
      .order("lemma", { ascending: false });
    const sql = nws(lastSql());
    expect(sql).toBe('SELECT * FROM "words" ORDER BY "lang_code" ASC, "lemma" DESC');
  });

  it("quotes qualified identifiers correctly", async () => {
    await createServerClient().from("words").select().order("words.lemma");
    expect(nws(lastSql())).toContain('"words"."lemma"');
  });
});

describe("QueryBuilder — limit() / range()", () => {
  it("adds LIMIT clause", async () => {
    await createServerClient().from("words").select().limit(10);
    expect(nws(lastSql())).toContain("LIMIT 10");
  });

  it("adds LIMIT and OFFSET via range()", async () => {
    await createServerClient().from("words").select().range(10, 19);
    const sql = nws(lastSql());
    expect(sql).toContain("LIMIT 10");
    expect(sql).toContain("OFFSET 10");
  });

  it("range(0, N) adds LIMIT but no OFFSET", async () => {
    await createServerClient().from("words").select().range(0, 9);
    const sql = nws(lastSql());
    expect(sql).toContain("LIMIT 10");
    expect(sql).not.toContain("OFFSET");
  });

  it("combines order, limit, and where", async () => {
    await createServerClient()
      .from("words")
      .select("id,lemma")
      .eq("lang_code", "en")
      .order("lemma")
      .limit(5);
    const sql = nws(lastSql());
    expect(sql).toContain('"words"."lang_code" = $1');
    expect(sql).toContain('ORDER BY "lemma" ASC');
    expect(sql).toContain("LIMIT 5");
  });
});

// =========================================================================
// INSERT
// =========================================================================

describe("QueryBuilder — insert()", () => {
  it("generates INSERT with RETURNING", async () => {
    await createServerClient()
      .from("words")
      .insert({ lemma: "test", pos: "noun" });
    expect(nws(lastSql())).toBe(
      'INSERT INTO "words" ("lemma", "pos") VALUES ($1, $2) RETURNING *',
    );
    expect(lastParams()).toEqual(["test", "noun"]);
  });

  it("inserts multiple rows", async () => {
    await createServerClient()
      .from("words")
      .insert([{ lemma: "a" }, { lemma: "b" }]);
    expect(nws(lastSql())).toBe(
      'INSERT INTO "words" ("lemma") VALUES ($1), ($2) RETURNING *',
    );
    expect(lastParams()).toEqual(["a", "b"]);
  });

  it("insert with select() specifies RETURNING columns", async () => {
    await createServerClient()
      .from("words")
      .insert({ lemma: "test" })
      .select("id,lemma");
    // RETURNING columns are passed through without individual quoting
    expect(nws(lastSql())).toContain("RETURNING id,lemma");
  });

  it("stringifies object arrays for jsonb columns", async () => {
    await createServerClient()
      .from("words")
      .insert({ lemma: "test", examples: [{ text: "hello" }] });
    expect(lastParams()).toEqual(["test", '[{"text":"hello"}]']);
  });

  it("leaves primitive arrays as-is for text[] columns", async () => {
    await createServerClient()
      .from("words")
      .insert({ lemma: "test", aliases: ["alias1", "alias2"] });
    expect(lastParams()).toEqual(["test", ["alias1", "alias2"]]);
  });
});

// =========================================================================
// UPSERT
// =========================================================================

describe("QueryBuilder — upsert()", () => {
  it("generates ON CONFLICT ... DO UPDATE for upsert", async () => {
    await createServerClient()
      .from("words")
      .upsert({ slug: "test-word", lemma: "test" }, { onConflict: "slug" });
    const sql = nws(lastSql());
    expect(sql).toContain('ON CONFLICT (slug)');
    expect(sql).toContain('DO UPDATE SET "lemma" = EXCLUDED."lemma"');
  });

  it("upsert with multiple columns on conflict key", async () => {
    await createServerClient()
      .from("word_tags")
      .upsert({ word_id: "w1", tag_id: "t1" }, { onConflict: "word_id,tag_id" });
    const sql = nws(lastSql());
    expect(sql).toContain("ON CONFLICT (word_id,tag_id)");
    // When all columns are conflict keys, DO NOTHING
    expect(sql).toContain("DO NOTHING");
  });

  it("upsert with ignoreDuplicates: true generates ON CONFLICT DO NOTHING", async () => {
    await createServerClient()
      .from("words")
      .upsert({ slug: "dup", lemma: "test" }, { ignoreDuplicates: true });
    const sql = nws(lastSql());
    expect(sql).toContain("ON CONFLICT DO NOTHING");
  });

  it("upsert with multiple rows", async () => {
    await createServerClient()
      .from("words")
      .upsert([{ slug: "a", lemma: "A" }, { slug: "b", lemma: "B" }], { onConflict: "slug" });
    const sql = nws(lastSql());
    expect(sql).toContain("VALUES ($1, $2), ($3, $4)");
    expect(sql).toContain("ON CONFLICT (slug)");
    expect(lastParams()).toEqual(["a", "A", "b", "B"]);
  });
});

describe("QueryBuilder — insert() with onConflict", () => {
  it("insert with onConflict generates UPSERT semantics", async () => {
    await createServerClient()
      .from("words")
      .insert({ slug: "test", lemma: "test" }, { onConflict: "slug" });
    const sql = nws(lastSql());
    expect(sql).toContain("ON CONFLICT (slug)");
    expect(sql).toContain("DO UPDATE SET");
  });

  it("insert with ignoreDuplicates generates ON CONFLICT DO NOTHING", async () => {
    await createServerClient()
      .from("words")
      .insert({ slug: "dup", lemma: "test" }, { ignoreDuplicates: true });
    expect(nws(lastSql())).toContain("ON CONFLICT DO NOTHING");
  });
});

// =========================================================================
// UPDATE
// =========================================================================

describe("QueryBuilder — update()", () => {
  it("generates UPDATE with SET and WHERE RETURNING", async () => {
    await createServerClient()
      .from("words")
      .update({ lemma: "updated" })
      .eq("id", "abc");
    const sql = nws(lastSql());
    // WHERE params are numbered before SET params: $1 = WHERE value, $2 = SET value
    expect(sql).toContain('UPDATE "words" SET "lemma" = $2');
    expect(sql).toContain('WHERE "words"."id" = $1');
    expect(sql).toContain("RETURNING *");
  });

  it("update with multiple columns", async () => {
    await createServerClient()
      .from("words")
      .update({ lemma: "new", pos: "adj" })
      .eq("id", "abc");
    expect(lastParams()).toEqual(["abc", "new", "adj"]);
  });

  it("update stringifies object arrays for jsonb", async () => {
    await createServerClient()
      .from("words")
      .update({ examples: [{ text: "hi" }] })
      .eq("id", "abc");
    expect(lastParams()).toEqual(["abc", '[{"text":"hi"}]']);
  });

  it("update with no WHERE updates all rows", async () => {
    await createServerClient()
      .from("words")
      .update({ is_published: false });
    const sql = nws(lastSql());
    expect(sql).toContain("UPDATE");
    expect(sql).toContain("RETURNING");
    expect(sql).not.toContain("WHERE");
  });

  it("update with select() restricts RETURNING columns", async () => {
    await createServerClient()
      .from("words")
      .update({ lemma: "new" })
      .eq("id", "abc")
      .select("id,lemma");
    expect(nws(lastSql())).toContain("RETURNING id,lemma");
  });
});

// =========================================================================
// DELETE
// =========================================================================

describe("QueryBuilder — delete()", () => {
  it("generates DELETE with WHERE RETURNING", async () => {
    await createServerClient()
      .from("words")
      .delete()
      .eq("id", "abc");
    const sql = nws(lastSql());
    expect(sql).toContain('DELETE FROM "words"');
    expect(sql).toContain('"words"."id" = $1');
    expect(sql).toContain("RETURNING *");
  });

  it("delete with no WHERE deletes all rows", async () => {
    await createServerClient().from("words").delete();
    const sql = nws(lastSql());
    expect(sql).toContain('DELETE FROM "words"');
    expect(sql).not.toContain("WHERE");
  });
});

// =========================================================================
// EMBEDS / JOINS
// =========================================================================

describe("QueryBuilder — embeds (JOINs)", () => {
  it("generates INNER JOIN via !inner marker", async () => {
    await createServerClient()
      .from("user_word_progress")
      .select("*, words!inner(id, lemma, slug)");
    const sql = nws(lastSql());
    expect(sql).toContain("INNER JOIN");
    expect(sql).toContain('jsonb_build_object(');
    expect(sql).toContain('AS "words"');
  });

  it("generates LEFT JOIN when no marker is specified", async () => {
    await createServerClient()
      .from("user_word_progress")
      .select("*, words(id,lemma)");
    const sql = nws(lastSql());
    expect(sql).toContain("LEFT JOIN");
  });

  it("handles alias expressions inside embeds", async () => {
    await createServerClient()
      .from("user_word_progress")
      .select("*, words!inner(id, level:metadata->>cefr)");
    const sql = nws(lastSql());
    expect(sql).toContain("jsonb_build_object");
    expect(sql).toContain("->>'cefr'");
  });

  it("throws for unknown FK relations", async () => {
    const result = createServerClient()
      .from("words")
      .select("*, nonexistent!inner(id)")
      .then((r) => r, (e) => e);
    await expect(
      createServerClient().from("words").select("*, nonexistent!inner(id)"),
    ).rejects.toThrow("No FK relation defined for words -> nonexistent");
  });

  it("handles word_tags → tags embed via FK", async () => {
    await createServerClient()
      .from("word_tags")
      .select("*, tags!inner(id, label)");
    const sql = nws(lastSql());
    expect(sql).toContain("INNER JOIN");
    expect(sql).toContain('"tags"');
    expect(sql).toContain('jsonb_build_object');
  });

  it("handles review_logs → words embed via FK", async () => {
    await createServerClient()
      .from("review_logs")
      .select("*, words!inner(id, lemma)");
    const sql = nws(lastSql());
    expect(sql).toContain("INNER JOIN");
    expect(sql).toContain('"words"."id" = "review_logs"."word_id"');
  });
});

// =========================================================================
// COUNT / HEAD
// =========================================================================

describe("QueryBuilder — count / head", () => {
  it("select with count: exact generates a COUNT query", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "42" }] });
    const result = await createServerClient()
      .from("words")
      .select("*", { count: "exact" });
    expect(result.count).toBe(42);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("select with head: true skips data rows", async () => {
    const result = await createServerClient()
      .from("words")
      .select("*", { head: true });
    expect(result.data).toEqual([]);
    expect(result.count).toBeUndefined();
  });

  it("select with count + head: true returns only count", async () => {
    // head: true skips the data query; only the COUNT runs.
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "7" }] });
    const result = await createServerClient()
      .from("words")
      .select("*", { count: "exact", head: true });
    // data defaults to [] when head skips the row query
    expect(result.data).toEqual([]);
    expect(result.count).toBe(7);
  });

  it("count query uses the same filters as the data query", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "3" }] });
    await createServerClient()
      .from("words")
      .select("*", { count: "exact" })
      .eq("lang_code", "en");
    // Second call should be the COUNT query with the same WHERE
    const countSql = mockQuery.mock.calls[1][0] as string;
    expect(countSql).toContain("COUNT(*)");
    expect(countSql).toContain('"words"."lang_code"');
  });
});

// =========================================================================
// TERMINATORS — single / maybeSingle
// =========================================================================

describe("QueryBuilder — single()", () => {
  it("returns the single row when exactly one row matches", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "a", lemma: "test" }] });
    const { data, error } = await createServerClient()
      .from("words")
      .select()
      .eq("id", "a")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ id: "a", lemma: "test" });
  });

  it("returns PGRST116 error when no rows match", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { data, error } = await createServerClient()
      .from("words")
      .select()
      .eq("id", "nonexistent")
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("PGRST116");
  });

  it("returns PGRST116 error when multiple rows match", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "a" }, { id: "b" }] });
    const { data, error } = await createServerClient()
      .from("words")
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("PGRST116");
  });
});

describe("QueryBuilder — maybeSingle()", () => {
  it("returns the first row when rows match", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "a", lemma: "test" }] });
    const { data, error } = await createServerClient()
      .from("words")
      .select()
      .eq("id", "a")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toEqual({ id: "a", lemma: "test" });
  });

  it("returns null (not an error) when no rows match", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { data, error } = await createServerClient()
      .from("words")
      .select()
      .eq("id", "nonexistent")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("returns only the first row even when multiple match", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "a" }, { id: "b" }] });
    const { data, error } = await createServerClient()
      .from("words")
      .select()
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toEqual({ id: "a" });
  });
});

// =========================================================================
// RPC
// =========================================================================

describe("QueryBuilder — rpc()", () => {
  it("calls undo_review_log with the correct argument format", async () => {
    await createServerClient().rpc("undo_review_log", {
      p_review_log_id: "log-1",
      p_user_id: "user-1",
      p_session_id: "session-1",
    });
    expect(nws(lastSql())).toContain("SELECT * FROM undo_review_log($1::uuid, $2::uuid, $3::uuid)");
    expect(lastParams()).toEqual(["log-1", "user-1", "session-1"]);
  });

  it("calls upsert_profile_review_setting with correct params", async () => {
    mockQuery.mockResolvedValue({ rows: [{ upsert_profile_review_setting: { ok: true } }] });
    const result = await createServerClient().rpc("upsert_profile_review_setting", {
      p_user_id: "user-1",
      p_key: "fsrs_weights",
      p_value: JSON.stringify({ w: [1, 2, 3] }),
      p_now: "2026-01-01T00:00:00.000Z",
    });
    expect(result.data).toEqual({ ok: true });
  });

  it("falls back to generic SELECT * FROM fn() for unknown functions", async () => {
    await createServerClient().rpc("get_word_stats", { word_id: "w1" });
    expect(nws(lastSql())).toContain("SELECT * FROM get_word_stats($1)");
    expect(lastParams()).toEqual(["w1"]);
  });

  it("handles parameterless RPC calls", async () => {
    await createServerClient().rpc("refresh_materialized_view");
    expect(nws(lastSql())).toContain("SELECT * FROM refresh_materialized_view()");
  });

  it("handles RPC errors gracefully", async () => {
    mockQuery.mockRejectedValueOnce(new Error("function does not exist"));
    const { data, error } = await createServerClient().rpc("bad_fn");
    expect(data).toBeNull();
    expect(error?.message).toBe("function does not exist");
  });
});

// =========================================================================
// EDGE CASES
// =========================================================================

describe("QueryBuilder — edge cases", () => {
  it("handles special characters in table names", async () => {
    // The quote() method escapes double-quotes in identifiers
    await createServerClient().from("user_word_progress").select();
    expect(lastSql()).toContain('FROM "user_word_progress"');
  });

  it("handles column names that contain dots (qualified identifiers)", async () => {
    // Already-qualified columns are left untouched
    await createServerClient().from("words").select().eq("words.id", "abc");
    expect(nws(lastSql())).toContain('"words"."id"');
  });

  it("handles select() on update to set RETURNING columns", async () => {
    await createServerClient()
      .from("words")
      .update({ lemma: "new" })
      .eq("id", "abc")
      .select("id");
    expect(nws(lastSql())).toContain("RETURNING id");
  });

  it("error in SQL execution returns { data: null, error }", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const { data, error } = await createServerClient().from("words").select();
    expect(data).toBeNull();
    expect(error?.message).toBe("connection refused");
  });

  it("error in insert execution returns { data: null, error }", async () => {
    mockQuery.mockRejectedValueOnce(new Error("unique violation"));
    const { data, error } = await createServerClient()
      .from("words")
      .insert({ lemma: "dup" });
    expect(data).toBeNull();
    expect(error?.message).toBe("unique violation");
  });

  it("error in update execution returns { data: null, error }", async () => {
    mockQuery.mockRejectedValueOnce(new Error("not found"));
    const { data, error } = await createServerClient()
      .from("words")
      .update({ lemma: "nope" })
      .eq("id", "missing");
    expect(data).toBeNull();
    expect(error?.message).toBe("not found");
  });

  it("error in delete execution returns { data: null, error }", async () => {
    mockQuery.mockRejectedValueOnce(new Error("constraint violation"));
    const { data, error } = await createServerClient().from("words").delete().eq("id", "refd");
    expect(data).toBeNull();
    expect(error?.message).toBe("constraint violation");
  });

  it("resolves via then() with data even on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("some error"));
    const { error } = await createServerClient().from("words").select();
    expect(error?.message).toBe("some error");
  });
});

// =========================================================================
// FILTER COMBINATIONS (complex scenarios)
// =========================================================================

describe("QueryBuilder — filter combinations", () => {
  it("combines eq, gt, lt, and order in a realistic query", async () => {
    await createServerClient()
      .from("user_word_progress")
      .select("id,due_at,state")
      .eq("user_id", "user-1")
      .gt("review_count", 0)
      .lte("due_at", "2026-05-01T00:00:00.000Z")
      .neq("state", "suspended")
      .order("due_at", { ascending: true })
      .limit(100);
    const sql = nws(lastSql());
    expect(sql).toContain('"user_word_progress"."user_id" = $1');
    expect(sql).toContain('"user_word_progress"."review_count" > $2');
    expect(sql).toContain('"user_word_progress"."state" != $4');
    expect(sql).toContain('ORDER BY "due_at" ASC');
    expect(sql).toContain("LIMIT 100");
    expect(lastParams()).toEqual(["user-1", 0, "2026-05-01T00:00:00.000Z", "suspended"]);
  });

  it("combines contains with eq for JSONB + scalar filtering", async () => {
    await createServerClient()
      .from("words")
      .select()
      .eq("lang_code", "en")
      .contains("metadata", { semantic_field: "science" });
    const sql = nws(lastSql());
    expect(sql).toContain('"words"."lang_code" = $1');
    expect(sql).toContain('"words"."metadata" @> $2');
    expect(lastParams()).toEqual(["en", '{"semantic_field":"science"}']);
  });

  it("combines in with order and limit for batch lookup", async () => {
    await createServerClient()
      .from("words")
      .select("id,lemma,slug")
      .in("id", ["w1", "w2", "w3", "w4", "w5"])
      .order("lemma")
      .limit(5);
    const sql = nws(lastSql());
    expect(sql).toContain("IN ($1, $2, $3, $4, $5)");
    expect(sql).toContain('ORDER BY "lemma" ASC');
    expect(sql).toContain("LIMIT 5");
  });

  it("combines textSearch with eq and range for paginated search", async () => {
    await createServerClient()
      .from("words")
      .select("id,lemma")
      .eq("is_published", true)
      .textSearch("lemma", "bio")
      .order("lemma")
      .range(0, 9);
    const sql = nws(lastSql());
    expect(sql).toContain('"words"."is_published" = $1');
    expect(sql).toContain('"words"."lemma" ILIKE $2');
    expect(lastParams()).toEqual([true, "%bio%"]);
  });
});

// =========================================================================
// SQL INJECTION PREVENTION
// =========================================================================

describe("QueryBuilder — SQL injection prevention", () => {
  it("treats user input as parameterised values, not raw SQL in eq()", async () => {
    const malicious = "'; DROP TABLE words; --";
    await createServerClient().from("words").select().eq("lemma", malicious);
    // SQL should contain a parameter placeholder, not raw injection
    expect(nws(lastSql())).toContain("$1");
    expect(lastParams()).toEqual([malicious]);
    // The value is passed as a parameter, not interpolated
    expect(lastSql()).not.toContain("DROP TABLE");
  });

  it("treats user input in ilike as parameterised", async () => {
    const malicious = "'; DROP TABLE words; --";
    await createServerClient().from("words").select().ilike("lemma", malicious);
    expect(lastParams()).toEqual([malicious]);
    expect(lastSql()).not.toContain("DROP TABLE");
  });

  it("treats user input in or() as parameterised", async () => {
    const malicious = "'; DROP TABLE words; --";
    await createServerClient().from("words").select().or(`lemma.eq.${malicious}`);
    expect(lastParams()).toEqual([malicious]);
    expect(lastSql()).not.toContain("DROP TABLE");
  });
});
