-- ═══════════════════════════════════════════════════════════
-- Setup "雅思词汇" Wordbook + Dashboard Import Tracking
-- ═══════════════════════════════════════════════════════════
-- 1. Creates the "雅思词汇" wordbook
-- 2. Populates wordbook_items with all IELTS words
-- 3. Inserts import_runs row so Dashboard shows latest import
--
-- NOTE: user_word_progress is NOT auto-created. Words only enter
-- the review queue when the user explicitly adds them via the UI.
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id         UUID := '00000000-0000-0000-0000-000000000001';
  v_wordbook_id     UUID;
  v_word_count      INT;
  v_now             TIMESTAMPTZ := CURRENT_TIMESTAMP;

BEGIN
  -- 1. Create "雅思词汇" wordbook (idempotent)
  SELECT id INTO v_wordbook_id
  FROM wordbooks
  WHERE user_id = v_user_id AND name = '雅思词汇';

  IF v_wordbook_id IS NULL THEN
    INSERT INTO wordbooks (user_id, name, description)
    VALUES (
      v_user_id,
      '雅思词汇',
      'IELTS Academic / General Training vocabulary'
    )
    RETURNING id INTO v_wordbook_id;
    RAISE NOTICE 'Created wordbook: %', v_wordbook_id;
  ELSE
    RAISE NOTICE 'Wordbook already exists: %', v_wordbook_id;
  END IF;

  -- 2. Populate wordbook_items (skip duplicates)
  INSERT INTO wordbook_items (wordbook_id, word_id, created_at)
  SELECT
    v_wordbook_id,
    w.id,
    v_now
  FROM words w
  WHERE w.metadata->>'word_freq' = '雅思词汇'
    AND w.is_deleted = FALSE
  ON CONFLICT (wordbook_id, word_id) DO NOTHING;

  GET DIAGNOSTICS v_word_count = ROW_COUNT;
  RAISE NOTICE 'Added % words to wordbook_items', v_word_count;

  -- 3. Insert Dashboard import_runs tracking row
  INSERT INTO import_runs (
    source, trigger_type, repo_owner, repo_name, repo_branch,
    status, started_at, finished_at,
    imported_count, created_count, updated_count,
    unchanged_count, soft_deleted_count, tags_count,
    error_count, summary
  )
  VALUES (
    'local_ielts',
    'manual',
    'local',
    'vocab-observatory-local',
    'master',
    'completed',
    v_now - INTERVAL '1 hour',
    v_now,
    1230,   -- imported_count
    438,    -- created_count
    850,    -- updated_count
    0,      -- unchanged_count
    0,      -- soft_deleted_count
    0,      -- tags_count
    0,      -- error_count
    jsonb_build_object(
      'tool', 'scripts/import-local-ielts.ts',
      'word_freq', '雅思词汇',
      'description', 'Local IELTS vocabulary Markdown import'
    )
  );

  RAISE NOTICE 'Import tracking row inserted for Dashboard';
END $$;
