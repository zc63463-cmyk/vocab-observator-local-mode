-- Pre-rendered HTML cache columns for the word detail page.
--
-- Background. The detail page renders markdown → HTML on every ISR
-- revalidation (body_md, definition_md, synonym section, antonym section).
-- For long entries this costs 50-200 ms of CPU inside the Vercel Function.
-- When the word is not in the SSG pre-build set (the common case for
-- ~5000 words) the first visitor pays that cost plus cold-start latency,
-- resulting in 6-8 s page loads.
--
-- Fix. Render the four HTML blocks once during the GitHub import sync and
-- store them alongside the markdown source. The detail query then reads
-- them directly, reducing per-request render cost to near zero.

alter table public.words
  add column if not exists body_html text,
  add column if not exists definition_html text,
  add column if not exists synonym_html text,
  add column if not exists antonym_html text;

comment on column public.words.body_html is
  'Pre-rendered Obsidian markdown → HTML for the full body. Regenerated on every import sync.';
comment on column public.words.definition_html is
  'Pre-rendered markdown → HTML for the definition block. Regenerated on every import sync.';
comment on column public.words.synonym_html is
  'Pre-rendered markdown → HTML for the synonym section (used when structured synonym_items is empty). Regenerated on every import sync.';
comment on column public.words.antonym_html is
  'Pre-rendered markdown → HTML for the antonym section (used when structured antonym_items is empty). Regenerated on every import sync.';
