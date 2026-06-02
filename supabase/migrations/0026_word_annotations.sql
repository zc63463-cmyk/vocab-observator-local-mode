-- User-generated annotations (批注) on word cards.
-- One annotation per word per user per wordbook.

CREATE TABLE IF NOT EXISTS word_annotations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_id     uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  wordbook_id uuid NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  content     text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enforce one annotation per word per user per wordbook
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_annotations_unique
  ON word_annotations(user_id, wordbook_id, word_id);

CREATE INDEX IF NOT EXISTS idx_word_annotations_lookup
  ON word_annotations(user_id, wordbook_id, word_id);
