-- Add skip_count to user_word_progress so the /api/review/skip endpoint
-- can persist skip actions server-side instead of being a no-op.

alter table public.user_word_progress
  add column if not exists skip_count integer not null default 0;
