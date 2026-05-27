/**
 * Local PostgreSQL client that mimics the supabase-js Postgrest API
 * so the rest of the codebase needs minimal changes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool, types } from "pg";

// Parse numeric/int8 as JS numbers instead of strings
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val));
types.setTypeParser(types.builtins.INT8, (val) => parseInt(val, 10));

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not configured.");
    }
    _pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return _pool;
}

export { getPool as pool };

export interface DbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

export interface DbArrayResult<T> {
  data: T[] | null;
  error: DbError | null;
  count?: number | null;
}

/** Compatible type shim — accepts a generic for backward compat with old code. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SupabaseClient<T = any> = ReturnType<typeof createServerClient>;
export type User = typeof LOCAL_OWNER;

/** Fixed local owner �?no real auth needed. */
import { LOCAL_OWNER } from "./local-owner";
export { LOCAL_OWNER };

/** Run a raw SQL query through the pool. */
export async function sql<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<DbArrayResult<T>> {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + strings[i + 1];
  }
  try {
    const { rows } = await getPool().query(text, values);
    return { data: rows, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: (err as Error).message,
        code: (err as any).code,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

type OpType = "select" | "insert" | "update" | "delete" | "rpc";

interface CountOption {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

class FilterState {
  filters: string[] = [];
  params: any[] = [];
  paramIndex = 1;

  clone(): FilterState {
    const f = new FilterState();
    f.filters = [...this.filters];
    f.params = [...this.params];
    f.paramIndex = this.paramIndex;
    return f;
  }

  quote(id: string) {
    return `"${id.replace(/"/g, '""')}"`;
  }

  nextParam() {
    return `$${this.paramIndex++}`;
  }

  addRaw(sql: string) {
    this.filters.push(sql);
  }

  addFilter(column: string, op: string, value: any) {
    if (value === null || value === undefined) {
      if (op === "=") {
        this.filters.push(`${this.quote(column)} IS NULL`);
      } else {
        this.filters.push(`${this.quote(column)} IS NOT NULL`);
      }
      return;
    }
    this.filters.push(`${this.quote(column)} ${op} ${this.nextParam()}`);
    this.params.push(value);
  }
}

class PostgrestBuilder<T = any> {
  private op: OpType = "select";
  private table: string;
  private filter: FilterState = new FilterState();
  private orderClauses: string[] = [];
  private limitValue?: number;
  private rangeFrom?: number;
  private rangeTo?: number;
  private selectColumns = "*";
  private countOpt?: CountOption;
  private insertValues?: any[];
  private insertOptions?: { onConflict?: string; ignoreDuplicates?: boolean };
  private updateValues?: Record<string, any>;
  private rpcName?: string;
  private rpcParams?: Record<string, any>;

  constructor(table: string, op: OpType = "select") {
    this.table = table;
    this.op = op;
  }

  // ---- filter methods ----

  eq(column: string, value: any): this {
    this.filter.addFilter(column, "=", value);
    return this;
  }

  neq(column: string, value: any): this {
    if (value === null || value === undefined) {
      this.filter.addRaw(`${this.filter.quote(column)} IS NOT NULL`);
    } else {
      this.filter.addFilter(column, "!=", value);
    }
    return this;
  }

  gt(column: string, value: any): this {
    this.filter.addFilter(column, ">", value);
    return this;
  }

  gte(column: string, value: any): this {
    this.filter.addFilter(column, ">=", value);
    return this;
  }

  lt(column: string, value: any): this {
    this.filter.addFilter(column, "<", value);
    return this;
  }

  lte(column: string, value: any): this {
    this.filter.addFilter(column, "<=", value);
    return this;
  }

  is(column: string, value: any): this {
    if (value === null || value === undefined) {
      this.filter.addRaw(`${this.filter.quote(column)} IS NULL`);
    } else {
      this.filter.addFilter(column, "IS", value);
    }
    return this;
  }

  in(column: string, values: any[]): this {
    if (!values || values.length === 0) {
      this.filter.addRaw("FALSE");
      return this;
    }
    const placeholders = values.map(() => this.filter.nextParam()).join(", ");
    this.filter.filters.push(`${this.filter.quote(column)} IN (${placeholders})`);
    this.filter.params.push(...values);
    return this;
  }

  contains(column: string, value: any): this {
    this.filter.filters.push(`${this.filter.quote(column)} @> ${this.filter.nextParam()}`);
    this.filter.params.push(JSON.stringify(value));
    return this;
  }

  or(conditions: string): this {
    // Parse "col.op.val,col2.op2.val2" format used by supabase-js
    const parts = conditions.split(",").map((p) => p.trim());
    const clauses: string[] = [];
    for (const part of parts) {
      const match = part.match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike)\.(.*)$/);
      if (match) {
        const [, col, opStr, val] = match;
        const opMap: Record<string, string> = {
          eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=",
          like: "LIKE", ilike: "ILIKE",
        };
        const op = opMap[opStr] || "=";
        clauses.push(`${this.filter.quote(col)} ${op} ${this.filter.nextParam()}`);
        this.filter.params.push(val);
      }
    }
    if (clauses.length > 0) {
      this.filter.addRaw(`(${clauses.join(" OR ")})`);
    }
    return this;
  }

  like(column: string, pattern: string): this {
    this.filter.filters.push(`${this.filter.quote(column)} LIKE ${this.filter.nextParam()}`);
    this.filter.params.push(pattern);
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.filter.filters.push(`${this.filter.quote(column)} ILIKE ${this.filter.nextParam()}`);
    this.filter.params.push(pattern);
    return this;
  }

  textSearch(column: string, query: string, _options?: { type?: "plain" | "phrase" | "websearch" }): this {
    // Simple ILIKE fallback for text search
    this.filter.filters.push(`${this.filter.quote(column)} ILIKE ${this.filter.nextParam()}`);
    this.filter.params.push(`%${query}%`);
    return this;
  }

  order(column: string, { ascending = true, nullsFirst }: { ascending?: boolean; nullsFirst?: boolean } = {}): this {
    let clause = `${this.filter.quote(column)} ${ascending ? "ASC" : "DESC"}`;
    if (nullsFirst !== undefined) {
      clause += ` NULLS ${nullsFirst ? "FIRST" : "LAST"}`;
    }
    this.orderClauses.push(clause);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    this.limitValue = to - from + 1;
    return this;
  }

  match(query: Record<string, any>): this {
    for (const [key, value] of Object.entries(query)) {
      this.eq(key, value);
    }
    return this;
  }

  // ---- operation config ----

  select(columns?: string, options?: CountOption): this {
    // When chained after insert/update/delete, select() only sets the
    // RETURNING / result columns; it must NOT overwrite the operation.
    this.selectColumns = columns || "*";
    this.countOpt = options;
    return this;
  }

  insert(values: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.op = "insert";
    this.insertValues = Array.isArray(values) ? values : [values];
    this.insertOptions = options;
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.op = "insert";
    this.insertValues = Array.isArray(values) ? values : [values];
    this.insertOptions = { onConflict: options?.onConflict, ignoreDuplicates: options?.ignoreDuplicates };
    return this;
  }

  update(values: Record<string, any>): this {
    this.op = "update";
    this.updateValues = values;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  // ---- terminators ----

  async single(): Promise<DbResult<T>> {
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
    if (!result.data || result.data.length === 0) {
      return {
        data: null,
        error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
      };
    }
    if (result.data.length > 1) {
      return {
        data: null,
        error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
      };
    }
    return { data: result.data[0], error: null };
  }

  async maybeSingle(): Promise<DbResult<T>> {
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data?.[0] ?? null, error: null };
  }

  async then<TResult1 = DbArrayResult<T>, TResult2 = never>(
    onfulfilled?: ((value: DbArrayResult<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const result = await this.execute();
      // Supabase-js resolves even when result.error is present; callers
      // destructure { data, error } instead of catching.
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result as unknown as TResult1;
    } catch (reason) {
      if (onrejected) {
        return onrejected(reason);
      }
      throw reason;
    }
  }

  // ---- execution ----

  private buildWhere() {
    return this.filter.filters.length > 0 ? `WHERE ${this.filter.filters.join(" AND ")}` : "";
  }

  private buildOrder() {
    return this.orderClauses.length > 0 ? `ORDER BY ${this.orderClauses.join(", ")}` : "";
  }

  private buildLimit() {
    const parts: string[] = [];
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`);
    }
    if (this.rangeFrom !== undefined && this.rangeFrom > 0) {
      parts.push(`OFFSET ${this.rangeFrom}`);
    }
    return parts.join(" ");
  }

  private buildSelectWithEmbeds(): { sql: string; joinSql?: string } {
    const f = this.filter;
    const embedPattern = /(\w+)(!inner)?\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    const embeds: Array<{ table: string; joinType: "inner" | "left"; columns: string[] }> = [];
    let plainCols = this.selectColumns;

    while ((match = embedPattern.exec(this.selectColumns)) !== null) {
      const [, table, innerMarker, colList] = match;
      embeds.push({
        table,
        joinType: innerMarker ? "inner" : "left",
        columns: colList.split(",").map((c) => c.trim()),
      });
      plainCols = plainCols.replace(match[0], "");
    }

    if (embeds.length === 0) {
      const cols = this.selectColumns.split(",").map((c) => c.trim());
      const parsedCols = cols.map((c) => {
        const aliasMatch = c.match(/^([^:]+):(.+)$/);
        if (aliasMatch) {
          let expr = aliasMatch[2];
          // Convert PostgREST JSON-path shorthand to PostgreSQL syntax.
          // PostgREST allows `metadata->>key`; native SQL needs `metadata->>'key'`.
          expr = expr.replace(/->>(\w+)/g, "->>'$1'");
          expr = expr.replace(/->(\w+)/g, "->'$1'");
          return `${expr} AS ${f.quote(aliasMatch[1])}`;
        }
        if (c === "*") return c;
        return f.quote(c);
      });
      return { sql: `SELECT ${parsedCols.join(", ")} FROM ${f.quote(this.table)}` };
    }

    // Foreign-key heuristics for known local tables
    const fkMap: Record<string, Record<string, { fk: string; pk: string }>> = {
      user_word_progress: { words: { fk: "word_id", pk: "id" } },
      review_logs: { words: { fk: "word_id", pk: "id" } },
      notes: { words: { fk: "word_id", pk: "id" } },
      word_tags: { words: { fk: "word_id", pk: "id" }, tags: { fk: "tag_id", pk: "id" } },
    };

    // Clean up plain columns
    plainCols = plainCols.replace(/,\s*,/g, ",").replace(/,\s*$/, "").replace(/^\s*,/, "").trim();
    if (!plainCols) plainCols = `${f.quote(this.table)}.*`;

    const joins: string[] = [];
    const selectParts: string[] = plainCols
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        if (c === "*" || c === `${f.quote(this.table)}.*`) {
          return `${f.quote(this.table)}.*`;
        }
        return `${f.quote(this.table)}.${f.quote(c)}`;
      });

    for (const embed of embeds) {
      const rel = fkMap[this.table]?.[embed.table];
      if (!rel) {
        throw new Error(`No FK relation defined for ${this.table} -> ${embed.table}`);
      }
      const joinKeyword = embed.joinType === "inner" ? "INNER JOIN" : "LEFT JOIN";
      joins.push(
        `${joinKeyword} ${f.quote(embed.table)} ON ${f.quote(embed.table)}.${f.quote(rel.pk)} = ${f.quote(this.table)}.${f.quote(rel.fk)}`,
      );
      const jsonCols = embed.columns
        .map((c) => `'${c}', ${f.quote(embed.table)}.${f.quote(c)}`)
        .join(", ");
      selectParts.push(`jsonb_build_object(${jsonCols}) AS ${f.quote(embed.table)}`);
    }

    return {
      sql: `SELECT ${selectParts.join(", ")} FROM ${f.quote(this.table)} ${joins.join(" ")}`,
      joinSql: joins.join(" "),
    };
  }

  private async execute(): Promise<DbArrayResult<T>> {
    const f = this.filter;

    if (this.op === "rpc") {
      return this.runRpc();
    }

    if (this.op === "select") {
      const embedResult = this.buildSelectWithEmbeds();
      const sql = `${embedResult.sql} ${this.buildWhere()} ${this.buildOrder()} ${this.buildLimit()}`;
      try {
        const result: DbArrayResult<T> = { data: [], error: null };
        if (!this.countOpt?.head) {
          const { rows } = await getPool().query(sql, f.params);
          result.data = rows;
        }
        if (this.countOpt?.count) {
          const countSql = `SELECT COUNT(*) FROM ${f.quote(this.table)} ${embedResult.joinSql ?? ""} ${this.buildWhere()}`;
          const { rows: countRows } = await getPool().query(countSql, [...f.params]);
          result.count = parseInt(countRows[0].count, 10);
        }
        return result;
      } catch (err) {
        return { data: null, error: { message: (err as Error).message, code: (err as any).code } };
      }
    }

    if (this.op === "insert" && this.insertValues) {
      const cols = Object.keys(this.insertValues[0]);
      const placeholders = this.insertValues
        .map((_, rowIdx) => {
          const offset = rowIdx * cols.length;
          return `(${cols.map((_, colIdx) => `$${offset + colIdx + 1}`).join(", ")})`;
        })
        .join(", ");

      const flatValues = this.insertValues.flatMap((row) =>
        cols.map((c) => {
          const v = row[c];
          // pg sends JS arrays as PostgreSQL array literals, which breaks
          // jsonb columns that expect a JSON string. Arrays containing
          // objects must be stringified; arrays of primitives are left as-is
          // so text[] columns continue to work.
          if (Array.isArray(v) && v.some((item) => typeof item === "object" && item !== null)) {
            return JSON.stringify(v);
          }
          return v;
        }),
      );
      let conflictClause = "";
      if (this.insertOptions?.ignoreDuplicates) {
        conflictClause = ` ON CONFLICT DO NOTHING`;
      } else if (this.insertOptions?.onConflict) {
        // Upsert semantics: update all columns except the conflict key
        const conflictCols = this.insertOptions.onConflict.split(",").map((c) => c.trim());
        const updateCols = cols.filter((c) => !conflictCols.includes(c));
        const updateClause = updateCols.length > 0
          ? ` DO UPDATE SET ${updateCols.map((c) => `${f.quote(c)} = EXCLUDED.${f.quote(c)}`).join(", ")}`
          : ` DO NOTHING`;
        conflictClause = ` ON CONFLICT (${this.insertOptions.onConflict})${updateClause}`;
      }
      const sql = `INSERT INTO ${f.quote(this.table)} (${cols.map((c) => f.quote(c)).join(", ")}) VALUES ${placeholders}${conflictClause} RETURNING ${this.selectColumns}`;
      try {
        const { rows } = await getPool().query(sql, flatValues);
        return { data: rows, error: null };
      } catch (err) {
        return { data: null, error: { message: (err as Error).message, code: (err as any).code } };
      }
    }

    if (this.op === "update" && this.updateValues) {
      const cols = Object.keys(this.updateValues);
      const whereParamCount = f.params.length;
      const setClauses = cols.map((c, i) => `${f.quote(c)} = $${whereParamCount + i + 1}`);
      const setParams = cols.map((c) => {
        const v = this.updateValues![c];
        if (Array.isArray(v) && v.some((item) => typeof item === "object" && item !== null)) {
          return JSON.stringify(v);
        }
        return v;
      });
      const sql = `UPDATE ${f.quote(this.table)} SET ${setClauses.join(", ")} ${this.buildWhere()} RETURNING ${this.selectColumns}`;
      try {
        const { rows } = await getPool().query(sql, [...f.params, ...setParams]);
        return { data: rows, error: null };
      } catch (err) {
        return { data: null, error: { message: (err as Error).message, code: (err as any).code } };
      }
    }

    if (this.op === "delete") {
      const sql = `DELETE FROM ${f.quote(this.table)} ${this.buildWhere()} RETURNING ${this.selectColumns}`;
      try {
        const { rows } = await getPool().query(sql, f.params);
        return { data: rows, error: null };
      } catch (err) {
        return { data: null, error: { message: (err as Error).message, code: (err as any).code } };
      }
    }

    return { data: null, error: { message: "Unknown operation" } };
  }

  private async runRpc(): Promise<DbArrayResult<T>> {
    try {
      const fn = this.rpcName!;
      const p = this.rpcParams || {};

      if (fn === "undo_review_log") {
        const sql = `SELECT * FROM undo_review_log($1::uuid, $2::uuid, $3::uuid)`;
        const { rows } = await getPool().query(sql, [p.p_review_log_id, p.p_user_id, p.p_session_id]);
        return { data: rows, error: null };
      }

      if (fn === "upsert_profile_review_setting") {
        const sql = `SELECT * FROM upsert_profile_review_setting($1::uuid, $2::text, $3::jsonb, $4::timestamptz)`;
        const { rows } = await getPool().query(sql, [
          p.p_user_id,
          p.p_key,
          typeof p.p_value === "string" ? p.p_value : JSON.stringify(p.p_value),
          p.p_now,
        ]);
        // Scalar-returning RPC: supabase-js unwraps the single value.
        return {
          data: rows[0]?.upsert_profile_review_setting ?? null,
          error: null,
        } as any;
      }

      // Fallback: try calling as a regular function
      const paramKeys = Object.keys(p);
      if (paramKeys.length === 0) {
        const sql = `SELECT * FROM ${fn}()`;
        const { rows } = await getPool().query(sql);
        return { data: rows, error: null };
      }
      const placeholders = paramKeys.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `SELECT * FROM ${fn}(${placeholders})`;
      const { rows } = await getPool().query(sql, Object.values(p));
      return { data: rows, error: null };
    } catch (err) {
      return { data: null, error: { message: (err as Error).message, code: (err as any).code } };
    }
  }
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

function makeClient() {
  return {
    from<T = any>(table: string) {
      return new PostgrestBuilder<T>(table, "select");
    },

    rpc<T = any>(fn: string, params?: Record<string, any>) {
      const builder = new PostgrestBuilder<T>("", "rpc");
      (builder as any).rpcName = fn;
      (builder as any).rpcParams = params;
      return builder;
    },

    auth: {
      async getUser() {
        return { data: { user: LOCAL_OWNER }, error: null };
      },
      async getSession() {
        return { data: { session: { user: LOCAL_OWNER } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      onAuthStateChange(callback: (event: string, session: { user: typeof LOCAL_OWNER } | null) => void) {
        // Local mode: auth never changes, but fire once so UI initializes
        callback("SIGNED_IN", { user: LOCAL_OWNER });
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      admin: {
        async listUsers() {
          return { data: { users: [LOCAL_OWNER] }, error: null };
        },
        async createUser(_opts: { email: string; email_confirm?: boolean }) {
          return { data: { user: LOCAL_OWNER }, error: null };
        },
        async generateLink(_opts: { type: string; email: string }) {
          return {
            data: {
              properties: { action_link: "http://localhost:3000/auth/callback?code=local" },
            },
            error: null,
          };
        },
      },
    },

    storage: {
      from(_bucket: string) {
        return {
          upload: async () => ({ data: null, error: { message: "Storage not implemented in local mode" } }),
          download: async () => ({ data: null, error: { message: "Storage not implemented in local mode" } }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        };
      },
    },
  };
}

/** Server-side client (drop-in for createServerClient). */
export function createServerClient() {
  return makeClient();
}

/** Browser client (drop-in for createBrowserClient). */
export function createBrowserClient() {
  return makeClient();
}

/** Route-handler client (drop-in for createRouteHandlerSupabaseClient). */
export function createRouteHandlerClient() {
  return makeClient();
}

/** Admin client (drop-in for createAdminSupabaseClient). */
export function createAdminClient() {
  return makeClient();
}
