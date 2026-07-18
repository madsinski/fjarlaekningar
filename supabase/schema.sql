-- ============================================================================
-- Fjarlækningar admin — base schema (Phase 1: staff auth + onboarding)
--
-- Run this ONCE in the new Supabase project's SQL editor (Dashboard → SQL).
-- This project is STAFF-ONLY: the only accounts that exist are admin + team
-- members. There are no patient/client accounts and no public signup — the
-- public marketing site is fully static.
--
-- Idempotent: safe to re-run. Later phases add their own migration files.
-- ============================================================================

-- ── staff ───────────────────────────────────────────────────────────────────
-- One row per person who can log into /admin. id == auth.users.id so that
-- RLS policies can compare staff.id = auth.uid() directly.
create table if not exists public.staff (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text        not null,
  email          text        not null unique,
  phone          text,
  -- 'admin' = full access incl. inviting staff. Everyone else is a team
  -- member with module access but no staff management.
  role           text        not null default 'member'
                   check (role in ('admin','member','doctor','nurse','psychologist','lawyer')),
  title          text,
  active         boolean     not null default true,
  invited        boolean     not null default false,
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now()
);

-- ── staff_agreement_acceptances ─────────────────────────────────────────────
-- Audit trail for onboarding: which staff accepted which agreement version.
-- The list of REQUIRED agreements lives in code (src/lib/staff-agreements.ts);
-- a staff member is "onboarded" once they've accepted the current version of
-- every required agreement (which also stamps staff.onboarded_at).
create table if not exists public.staff_agreement_acceptances (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid        not null references public.staff(id) on delete cascade,
  agreement_key  text        not null,
  version        text        not null,
  accepted_at    timestamptz not null default now(),
  ip             text,
  user_agent     text,
  unique (staff_id, agreement_key, version)
);

create index if not exists staff_agreement_acceptances_staff_idx
  on public.staff_agreement_acceptances (staff_id);

-- ── SECURITY DEFINER helpers ────────────────────────────────────────────────
-- These break the RLS recursion trap: a policy ON public.staff must NOT inline
-- a sub-select against public.staff (infinite recursion). These helpers run as
-- the definer (bypassing RLS) so policies can call them safely.
create or replace function public.is_active_staff()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.staff where id = auth.uid() and active)
$$;

create or replace function public.is_admin_staff()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.staff where id = auth.uid() and active and role = 'admin')
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- All privileged WRITES go through /api/admin/* using the service-role key,
-- which bypasses RLS entirely. RLS here governs what the browser (anon key +
-- the signed-in user's JWT) may READ. Deny-by-default: no write policies for
-- the anon/authenticated role, so the client can only read.
alter table public.staff enable row level security;
alter table public.staff_agreement_acceptances enable row level security;

drop policy if exists staff_read_self_or_admin on public.staff;
create policy staff_read_self_or_admin on public.staff
  for select to authenticated
  using (id = auth.uid() or public.is_admin_staff());

drop policy if exists staff_agreements_read_self_or_admin on public.staff_agreement_acceptances;
create policy staff_agreements_read_self_or_admin on public.staff_agreement_acceptances
  for select to authenticated
  using (staff_id = auth.uid() or public.is_admin_staff());

-- ── handle_new_user: no-op for this project ─────────────────────────────────
-- This project has NO clients/patients table, so — unlike lifeline — we do NOT
-- auto-create any row when an auth user is created. Staff rows are created
-- explicitly by /api/admin/staff/create (and scripts/seed-admin.mjs for the
-- very first admin). No trigger is installed here on purpose.
