-- 0023_wordbook_security.sql
--
-- Security hardening for wordbook isolation:
-- 1. Enable RLS on wordbooks and wordbook_items
-- 2. Complete review_logs_archive schema (FK, NOT NULL, index)

/* ── 1. Enable RLS on wordbooks ────────────────────────────────────── */

ALTER TABLE public.wordbooks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wordbooks' AND policyname = 'wordbooks_own_all'
  ) THEN
    CREATE POLICY "wordbooks_own_all" ON public.wordbooks
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

/* ── 2. Enable RLS on wordbook_items ───────────────────────────────── */

ALTER TABLE public.wordbook_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wordbook_items' AND policyname = 'wordbook_items_via_wordbook'
  ) THEN
    CREATE POLICY "wordbook_items_via_wordbook" ON public.wordbook_items
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.wordbooks w
        WHERE w.id = wordbook_id AND w.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.wordbooks w
        WHERE w.id = wordbook_id AND w.user_id = auth.uid()
      ));
  END IF;
END $$;

/* ── 3. Harden review_logs_archive schema ──────────────────────────── */

/* Backfill any NULL wordbook_id values from the corresponding review_log */
UPDATE review_logs_archive ra
SET wordbook_id = (
  SELECT rl.wordbook_id FROM review_logs rl WHERE rl.id = ra.id
)
WHERE ra.wordbook_id IS NULL;

/* Make wordbook_id NOT NULL */
ALTER TABLE review_logs_archive
  ALTER COLUMN wordbook_id SET NOT NULL;

/* Add FK to wordbooks */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_review_logs_archive_wordbook'
      AND table_name = 'review_logs_archive'
  ) THEN
    ALTER TABLE review_logs_archive
      ADD CONSTRAINT fk_review_logs_archive_wordbook
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE;
  END IF;
END $$;

/* Add index for archive queries scoped by wordbook */
CREATE INDEX IF NOT EXISTS idx_review_logs_archive_wordbook
  ON review_logs_archive (wordbook_id, reviewed_at DESC);
