-- 0022_wordbook_isolation.sql
--
-- Add multi-wordbook support: separate study contexts (e.g. IELTS, 考研, custom)
-- with independent progress, notes, review logs, and sessions.
-- Words themselves remain globally shared; wordbook_items links them into collections.

/* ── 1. wordbooks table ────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS wordbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wordbooks_user_default
  ON wordbooks (user_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_wordbooks_user_id
  ON wordbooks (user_id);

/* ── 2. wordbook_items table ───────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS wordbook_items (
  wordbook_id UUID NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wordbook_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_wordbook_items_word_id
  ON wordbook_items (word_id);

/* ── 3. Add wordbook_id columns (nullable first for safe migration) ── */

ALTER TABLE user_word_progress
  ADD COLUMN IF NOT EXISTS wordbook_id UUID;

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS wordbook_id UUID;

ALTER TABLE review_logs
  ADD COLUMN IF NOT EXISTS wordbook_id UUID;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS wordbook_id UUID;

ALTER TABLE note_revisions
  ADD COLUMN IF NOT EXISTS wordbook_id UUID;

ALTER TABLE review_logs_archive
  ADD COLUMN IF NOT EXISTS wordbook_id UUID;

/* ── 4. Create default "Global" wordbook for every profile ─────────── */

INSERT INTO wordbooks (id, user_id, name, is_default)
SELECT gen_random_uuid(), id, 'Global', TRUE
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM wordbooks w2 WHERE w2.user_id = profiles.id AND w2.is_default = TRUE
)
ON CONFLICT DO NOTHING;

/* ── 5. Migrate existing data to default wordbook ──────────────────── */

UPDATE user_word_progress uwp
SET wordbook_id = w.id
FROM wordbooks w
WHERE w.user_id = uwp.user_id AND w.is_default = TRUE
  AND uwp.wordbook_id IS NULL;

UPDATE notes n
SET wordbook_id = w.id
FROM wordbooks w
WHERE w.user_id = n.user_id AND w.is_default = TRUE
  AND n.wordbook_id IS NULL;

UPDATE review_logs rl
SET wordbook_id = w.id
FROM wordbooks w
WHERE w.user_id = rl.user_id AND w.is_default = TRUE
  AND rl.wordbook_id IS NULL;

UPDATE sessions s
SET wordbook_id = w.id
FROM wordbooks w
WHERE w.user_id = s.user_id AND w.is_default = TRUE
  AND s.wordbook_id IS NULL;

UPDATE note_revisions nr
SET wordbook_id = w.id
FROM wordbooks w
WHERE w.user_id = nr.user_id AND w.is_default = TRUE
  AND nr.wordbook_id IS NULL;

/* ── 6. Enforce NOT NULL and add FKs ──────────────────────────────── */

ALTER TABLE user_word_progress
  ALTER COLUMN wordbook_id SET NOT NULL;

ALTER TABLE notes
  ALTER COLUMN wordbook_id SET NOT NULL;

ALTER TABLE review_logs
  ALTER COLUMN wordbook_id SET NOT NULL;

ALTER TABLE sessions
  ALTER COLUMN wordbook_id SET NOT NULL;

ALTER TABLE note_revisions
  ALTER COLUMN wordbook_id SET NOT NULL;

/* FK constraints */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_uwp_wordbook'
      AND table_name = 'user_word_progress'
  ) THEN
    ALTER TABLE user_word_progress
      ADD CONSTRAINT fk_uwp_wordbook
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notes_wordbook'
      AND table_name = 'notes'
  ) THEN
    ALTER TABLE notes
      ADD CONSTRAINT fk_notes_wordbook
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_review_logs_wordbook'
      AND table_name = 'review_logs'
  ) THEN
    ALTER TABLE review_logs
      ADD CONSTRAINT fk_review_logs_wordbook
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sessions_wordbook'
      AND table_name = 'sessions'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT fk_sessions_wordbook
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_note_revisions_wordbook'
      AND table_name = 'note_revisions'
  ) THEN
    ALTER TABLE note_revisions
      ADD CONSTRAINT fk_note_revisions_wordbook
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE;
  END IF;
END $$;

/* ── 7. Update unique constraints ──────────────────────────────────── */

/* user_word_progress */
ALTER TABLE user_word_progress
  DROP CONSTRAINT IF EXISTS user_word_progress_user_id_word_id_key;
DROP INDEX IF EXISTS idx_user_word_progress_user_word;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_word_progress_user_wordbook_word_key'
      AND table_name = 'user_word_progress'
  ) THEN
    ALTER TABLE user_word_progress
      ADD CONSTRAINT user_word_progress_user_wordbook_word_key
      UNIQUE (user_id, wordbook_id, word_id);
  END IF;
END $$;

/* notes */
ALTER TABLE notes
  DROP CONSTRAINT IF EXISTS notes_user_id_word_id_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notes_user_wordbook_word_key'
      AND table_name = 'notes'
  ) THEN
    ALTER TABLE notes
      ADD CONSTRAINT notes_user_wordbook_word_key
      UNIQUE (user_id, wordbook_id, word_id);
  END IF;
END $$;

/* ── 8. New indexes for wordbook-scoped queries ────────────────────── */

CREATE INDEX IF NOT EXISTS idx_uwp_wordbook_due
  ON user_word_progress (wordbook_id, due_at);

CREATE INDEX IF NOT EXISTS idx_review_logs_wordbook
  ON review_logs (wordbook_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_wordbook
  ON sessions (wordbook_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_wordbook
  ON notes (wordbook_id, updated_at DESC);

/* ── 9. Update archive function to carry wordbook_id ───────────────── */

/* Add wordbook_id to archive table (already done in section 3) */

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
    RETURNING id, user_id, word_id, progress_id, wordbook_id, rating, state,
              reviewed_at, due_at, elapsed_days, scheduled_days,
              stability, difficulty, metadata, created_at
  )
  INSERT INTO review_logs_archive (
    id, user_id, word_id, progress_id, wordbook_id, rating, state,
    reviewed_at, due_at, elapsed_days, scheduled_days,
    stability, difficulty, metadata, created_at
  )
  SELECT id, user_id, word_id, progress_id, wordbook_id, rating, state,
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
    RETURNING id, user_id, word_id, progress_id, wordbook_id, rating, state,
              reviewed_at, due_at, elapsed_days, scheduled_days,
              stability, difficulty, metadata, created_at
  )
  INSERT INTO review_logs_archive (
    id, user_id, word_id, progress_id, wordbook_id, rating, state,
    reviewed_at, due_at, elapsed_days, scheduled_days,
    stability, difficulty, metadata, created_at
  )
  SELECT id, user_id, word_id, progress_id, wordbook_id, rating, state,
         reviewed_at, due_at, elapsed_days, scheduled_days,
         stability, difficulty, metadata, created_at
  FROM moved
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS moved_old = ROW_COUNT;

  RETURN moved_undone + moved_old;
END;
$$;
