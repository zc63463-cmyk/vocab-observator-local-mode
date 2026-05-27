-- Local-only auth shim for self-hosted PostgreSQL (no Supabase).
-- Creates the auth schema and uid() function so existing migrations
-- that reference auth.users / auth.uid() work unchanged.

create extension if not exists pgcrypto;

create schema if not exists auth;

-- Supabase default roles referenced by later migrations
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Local mode: always return the fixed owner id so RLS policies work
-- without any per-session setup.
create or replace function auth.uid() returns uuid
language plpgsql security definer stable
as $$
begin
  return '00000000-0000-0000-0000-000000000001'::uuid;
end;
$$;
