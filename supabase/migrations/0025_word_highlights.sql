-- User-generated highlights (荧光笔划重点) on word cards.
-- Anchored by text-snippet matching so they survive minor edits
-- to the underlying Obsidian vault content.

CREATE TABLE IF NOT EXISTS word_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  wordbook_id uuid NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  source_field text NOT NULL DEFAULT 'definition_md',
  text_snippet text NOT NULL,
  color text NOT NULL DEFAULT '#eab308',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_word_highlights_lookup
  ON word_highlights(user_id, wordbook_id, word_id);

-- Prevent duplicate highlights for the exact same snippet on the same
-- word / wordbook / source_field.
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_highlights_unique_snippet
  ON word_highlights(user_id, wordbook_id, word_id, source_field, text_snippet);
