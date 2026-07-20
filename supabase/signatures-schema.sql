-- ============================================================================
-- Fjarlækningar admin — Email signatures (ported from lifeline-website)
--
-- Powers /admin/signatures — the team's Gmail signature builder. One row per
-- signature "card", keyed by a short slug. Editing is admin-only; reads are
-- open to any active staff so anyone can pull their own up-to-date signature.
--
-- Not FK'd to `staff` on purpose — we want to pre-seed slots for people who
-- don't have a staff row yet, and a signature "title" can differ from the
-- operational role stored on staff.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers
-- (public.is_active_staff()).
-- ============================================================================

create table if not exists public.email_signatures (
  key         text        primary key,
  name        text        not null,
  title       text        not null default '',
  phone       text        not null default '',
  email       text        not null default '',
  sort_order  smallint    not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references auth.users(id) on delete set null
);

alter table public.email_signatures enable row level security;

-- Any active staff may read.
drop policy if exists email_signatures_staff_read on public.email_signatures;
create policy email_signatures_staff_read on public.email_signatures
  for select to authenticated
  using (public.is_active_staff());

-- Writes go through the API (service role). Explicitly block client writes.
drop policy if exists email_signatures_block_client_writes on public.email_signatures;
create policy email_signatures_block_client_writes on public.email_signatures
  for all using (false) with check (false);

-- Seed: Mads only (ON CONFLICT preserves any later edits).
insert into public.email_signatures (key, name, title, phone, email, sort_order)
values (
  'mads',
  'Mads Christian Aanesen',
  'Medical doctor / co-founder',
  '+354 7674393',
  'mads@fjarlaekningar.is',
  1
)
on conflict (key) do nothing;
