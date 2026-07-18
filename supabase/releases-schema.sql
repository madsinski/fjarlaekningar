-- ============================================================================
-- Fjarlækningar admin — Phase 3: Version history (Releases / changelog)
--
-- A public changelog. Staff (admin) manage entries; the public timeline lives
-- at /breytingaskra. Useful for medical-device-style version tracking later.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers.
-- ============================================================================

create table if not exists public.releases (
  id           uuid primary key default gen_random_uuid(),
  version      text        not null,
  title        text        not null,
  notes        text        not null default '',            -- markdown
  kind         text        not null default 'feature'
                 check (kind in ('feature','fix','security','compliance')),
  released_on  date        not null default current_date,
  created_by   uuid        references public.staff(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists releases_released_on_idx on public.releases (released_on desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Public changelog: anyone may READ every row. All writes go through
-- /api/admin/releases/* using the service-role key (bypasses RLS).
alter table public.releases enable row level security;

drop policy if exists releases_public_read on public.releases;
create policy releases_public_read on public.releases
  for select to anon, authenticated
  using (true);
