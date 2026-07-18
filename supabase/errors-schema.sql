-- ============================================================================
-- Fjarlækningar admin — Phase 3: Error logging
--
-- Captures server errors (via src/instrumentation.ts onRequestError) and,
-- optionally, client errors (POST /api/errors). /admin/errors triages them.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires the Phase 1
-- schema (staff + is_active_staff()/is_admin_staff() helpers) to exist first.
-- ============================================================================

create table if not exists public.app_errors (
  id           uuid primary key default gen_random_uuid(),
  message      text        not null,
  stack        text,
  source       text        not null default 'server' check (source in ('server','client')),
  url          text,
  user_agent   text,
  status       text        not null default 'new' check (status in ('new','resolved')),
  created_at   timestamptz not null default now()
);

create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
create index if not exists app_errors_status_idx on public.app_errors (status);

-- RLS: staff may READ; all writes go through the service-role key
-- (instrumentation + /api/errors), so no anon/authenticated write policy.
alter table public.app_errors enable row level security;

drop policy if exists app_errors_staff_read on public.app_errors;
create policy app_errors_staff_read on public.app_errors
  for select to authenticated
  using (public.is_active_staff());
