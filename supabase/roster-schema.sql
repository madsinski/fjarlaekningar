-- ============================================================================
-- Fjarlækningar admin — Vaktakerfi (doctor roster / shifts / payroll)
--
-- The service is open every day 10–22. This schedules which doctor covers each
-- shift, records how many patients each shift saw, and totals per doctor per
-- month for payment (patients × per-patient salary).
--
--   roster_doctors  — the doctors that can be rostered (decoupled from auth;
--                     staff_id links to a staff login once the doctor portal
--                     lands in a later phase).
--   roster_shifts   — one row per shift (date + time window), assigned doctor,
--                     patients seen, status (assigned / open on the market).
--   roster_settings — single row: editable per-patient salary.
--
-- Staff read everything; all writes go through the service-role admin API. Run
-- once in the Supabase SQL editor. Requires public.is_active_staff().
-- ============================================================================

create table if not exists public.roster_doctors (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null default '',
  color      text        not null default '#00a8cc',
  active     boolean     not null default true,
  staff_id   uuid        references public.staff(id) on delete set null,
  access_token text,                 -- personal token for the doctor's /vaktir page + calendar feed
  created_at timestamptz not null default now()
);

-- Phase 2: personal access token (for DBs created before it existed).
alter table public.roster_doctors add column if not exists access_token text;
create unique index if not exists roster_doctors_token_idx on public.roster_doctors (access_token) where access_token is not null;

create table if not exists public.roster_settings (
  id                 integer primary key default 1 check (id = 1),
  per_patient_salary integer not null default 3000,
  currency           text    not null default 'kr.',
  updated_at         timestamptz not null default now()
);
insert into public.roster_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.roster_shifts (
  id            uuid primary key default gen_random_uuid(),
  shift_date    date        not null,
  starts        time        not null default '10:00',
  ends          time        not null default '22:00',
  doctor_id     uuid        references public.roster_doctors(id) on delete set null,
  status        text        not null default 'assigned' check (status in ('assigned','open','swap')),
  patients_seen integer     not null default 0,
  note          text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists roster_shifts_date_idx on public.roster_shifts (shift_date);
create index if not exists roster_shifts_doctor_idx on public.roster_shifts (doctor_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;
drop trigger if exists trg_roster_shifts_updated_at on public.roster_shifts;
create trigger trg_roster_shifts_updated_at before update on public.roster_shifts for each row execute function public.touch_updated_at();

-- ── RLS: staff read; writes via service-role API only ───────────────────────
alter table public.roster_doctors  enable row level security;
alter table public.roster_settings enable row level security;
alter table public.roster_shifts   enable row level security;

drop policy if exists roster_doctors_staff_read on public.roster_doctors;
create policy roster_doctors_staff_read on public.roster_doctors for select to authenticated using (public.is_active_staff());

drop policy if exists roster_settings_staff_read on public.roster_settings;
create policy roster_settings_staff_read on public.roster_settings for select to authenticated using (public.is_active_staff());

drop policy if exists roster_shifts_staff_read on public.roster_shifts;
create policy roster_shifts_staff_read on public.roster_shifts for select to authenticated using (public.is_active_staff());
