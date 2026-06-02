-- ═══════════════════════════════════════════════════════════
-- Fix invalid scheduler_payload for IELTS wordbook progress rows
-- ═══════════════════════════════════════════════════════════
-- Problem: seed script used wrong payload format {"s":0,"d":0,"r":0.9,"stability":0}
-- Fix:     rebuild to proper StoredSchedulerCard shape (ts-fsrs createEmptyCard)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  v_wordbook_id UUID;
  v_now_iso     TEXT := to_json(CURRENT_TIMESTAMP)::text;
BEGIN
  SELECT id INTO v_wordbook_id
  FROM wordbooks
  WHERE name = '雅思词汇';

  IF v_wordbook_id IS NULL THEN
    RAISE NOTICE 'Wordbook 雅思词汇 not found, nothing to fix';
    RETURN;
  END IF;

  -- Re-seed user_word_progress with correct scheduler_payload format.
  -- StoredSchedulerCard shape from lib/review/types.ts:
  --   difficulty, due, elapsed_days, lapses, learning_steps,
  --   last_review, reps, scheduled_days, stability, state
  --
  -- ts-fsrs createEmptyCard() produces state=0 (New), stability=0, etc.
  UPDATE user_word_progress
  SET
    scheduler_payload = jsonb_build_object(
      'difficulty', 0,
      'due', v_now_iso,
      'elapsed_days', 0,
      'lapses', 0,
      'learning_steps', 0,
      'last_review', null,
      'reps', 0,
      'scheduled_days', 0,
      'stability', 0,
      'state', 0
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE wordbook_id = v_wordbook_id
    AND state = 'new';

  RAISE NOTICE 'Fixed scheduler_payload for IELTS wordbook (%)', v_wordbook_id;
END $$;
