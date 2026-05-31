-- 0024_wordbook_isolated_settings.sql
--
-- Migrate desired_retention and fsrs_weights from profiles.settings (global)
-- to wordbooks.settings (per-wordbook), enabling different retention targets
-- and trained models per wordbook (e.g. 考研 94% vs 雅思 85%).

/* ── 1. Add settings JSONB to wordbooks ────────────────────────────── */

ALTER TABLE wordbooks
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT NULL;

/* ── 2. Migrate existing global settings into the default wordbook ─── */

UPDATE wordbooks w
SET settings = p.settings
FROM profiles p
WHERE w.user_id = p.id
  AND w.is_default = TRUE
  AND w.settings IS NULL;

/* ── 3. Create helper function to update a wordbook setting atomically ─ */

CREATE OR REPLACE FUNCTION upsert_wordbook_setting(
  p_wordbook_id UUID,
  p_key TEXT,
  p_value JSONB,
  p_now TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing JSONB;
  v_result JSONB;
BEGIN
  SELECT settings INTO v_existing
  FROM wordbooks
  WHERE id = p_wordbook_id
  FOR UPDATE;

  IF v_existing IS NULL THEN
    v_existing := '{}'::JSONB;
  END IF;

  v_result := jsonb_set(
    v_existing,
    ARRAY['review', p_key],
    p_value,
    true
  );

  UPDATE wordbooks
  SET settings = v_result, updated_at = p_now
  WHERE id = p_wordbook_id;

  RETURN v_result;
END;
$$;
