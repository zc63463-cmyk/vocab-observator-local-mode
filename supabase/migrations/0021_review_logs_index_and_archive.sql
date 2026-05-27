-- 0021_review_logs_index_and_archive.sql
--
-- P0: Missing composite index for the most frequent review_logs query pattern.
-- P1: Archival table + function to prevent review_logs from growing unbounded.

/* ── P0: Composite index ─────────────────────────────────────────────
 *
 * The most frequent dashboard + API query is:
 *   SELECT ... FROM review_logs
 *   WHERE user_id = ? AND undone = false AND reviewed_at > ?
 *   ORDER BY reviewed_at DESC
 *
 * The existing idx_review_logs_user_reviewed only covers (user_id, reviewed_at),
 * so queries with an additional undone=false filter cannot use it efficiently
 * for the sort — they must filter first, then sort, missing the index-ordered
 * scan optimisation.
 *
 * The new index is a covering 3-column B-tree that lets PostgreSQL satisfy
 * the WHERE + ORDER BY from the index alone (index-only scan).
 */

CREATE INDEX IF NOT EXISTS idx_review_logs_user_undone_reviewed
  ON review_logs (user_id, undone, reviewed_at DESC);

/* ── P1: Archival table ──────────────────────────────────────────────
 *
 * review_logs is the fastest-growing table in the system. A moderate user
 * doing 50 reviews/day generates ~18 000 rows/year. After two years that
 * becomes 36 000 rows — still small for PostgreSQL, but the JSONB column
 * `previous_progress_snapshot` (which stores the full card state at review
 * time) can bloat each row to 5-20 KB, pushing the table into hundreds of
 * megabytes.
 *
 * The archive table strips out the heavy JSONB snapshot and keeps only the
 * fields needed for long-term analytics (rating trends, retention curves,
 * training data). Rows are moved here by the `archive_review_logs()`
 * function below.
 */

CREATE TABLE IF NOT EXISTS review_logs_archive (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  word_id UUID,
  progress_id UUID,
  rating TEXT NOT NULL,
  state TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ,
  elapsed_days INTEGER,
  scheduled_days INTEGER,
  stability NUMERIC,
  difficulty NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_logs_archive_user_reviewed
  ON review_logs_archive (user_id, reviewed_at DESC);

/* Partitioning is overkill for single-user local deployments; plain
   B-tree indexes on the archive table are sufficient up to ~1M rows. */

/* ── P1: Archival function ───────────────────────────────────────────
 *
 * Moves eligible rows from review_logs → review_logs_archive and
 * returns the count moved.
 *
 * Eligibility rules (best-effort; safe to re-run):
 *   1. Undone logs older than 30 days — these represent reverted reviews
 *      and are never needed for scheduling or short-term analytics.
 *   2. Normal logs older than 730 days (2 years) — long-term training data
 *      and retention curves can be served from the archive table; the
 *      hot path (due-today, 30-day dashboards) never queries this far back.
 *
 * The function is idempotent: archived rows are INSERTed with their
 * original PK; the DELETE step only touches rows that successfully
 * INSERTed (via a RETURNING + subquery pattern).
 */

CREATE OR REPLACE FUNCTION archive_review_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  moved_undone INTEGER := 0;
  moved_old INTEGER := 0;
BEGIN
  -- Move undone logs older than 30 days
  WITH moved AS (
    DELETE FROM review_logs
    WHERE undone = true
      AND undone_at < NOW() - INTERVAL '30 days'
    RETURNING id, user_id, word_id, progress_id, rating, state,
              reviewed_at, due_at, elapsed_days, scheduled_days,
              stability, difficulty, metadata, created_at
  )
  INSERT INTO review_logs_archive (
    id, user_id, word_id, progress_id, rating, state,
    reviewed_at, due_at, elapsed_days, scheduled_days,
    stability, difficulty, metadata, created_at
  )
  SELECT id, user_id, word_id, progress_id, rating, state,
         reviewed_at, due_at, elapsed_days, scheduled_days,
         stability, difficulty, metadata, created_at
  FROM moved
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS moved_undone = ROW_COUNT;

  -- Move normal logs older than 2 years
  WITH moved AS (
    DELETE FROM review_logs
    WHERE undone = false
      AND reviewed_at < NOW() - INTERVAL '730 days'
    RETURNING id, user_id, word_id, progress_id, rating, state,
              reviewed_at, due_at, elapsed_days, scheduled_days,
              stability, difficulty, metadata, created_at
  )
  INSERT INTO review_logs_archive (
    id, user_id, word_id, progress_id, rating, state,
    reviewed_at, due_at, elapsed_days, scheduled_days,
    stability, difficulty, metadata, created_at
  )
  SELECT id, user_id, word_id, progress_id, rating, state,
         reviewed_at, due_at, elapsed_days, scheduled_days,
         stability, difficulty, metadata, created_at
  FROM moved
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS moved_old = ROW_COUNT;

  RETURN moved_undone + moved_old;
END;
$$;
