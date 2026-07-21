-- ============================================================================
-- Fjarlækningar — site settings (key/value)
--
-- Currently holds the coming-soon gate so it can be flipped from
-- /admin/website without a redeploy. The proxy reads this (cached ~30s) and
-- falls back to the COMING_SOON env var when the row/table is missing, so
-- behaviour is unchanged until this migration is run.
--
-- The gate state is NOT secret (it's observable by just visiting the site), so
-- anon may read it — the proxy runs before auth and needs it on every request.
-- All writes go through /api/admin/site-settings using the service role.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers.
-- ============================================================================

create table if not exists public.site_settings (
  key        text        primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid        references public.staff(id) on delete set null
);

alter table public.site_settings enable row level security;

-- Readable by anyone (the proxy reads it unauthenticated on every request).
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (true);

-- Writes only via the service role (admin API). Block client writes.
drop policy if exists site_settings_block_writes on public.site_settings;
create policy site_settings_block_writes on public.site_settings
  for all using (false) with check (false);

-- Seed the gate as ON, matching the current COMING_SOON=true production state.
insert into public.site_settings (key, value)
values ('gate', '{"coming_soon": true}'::jsonb)
on conflict (key) do nothing;
