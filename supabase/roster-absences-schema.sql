-- ============================================================================
-- Vaktaóskir, seinni hluti: samfelldar vaktir og frí.
-- Framhald af roster-preferences-schema.sql. Idempotent.
-- ============================================================================

-- Hve margar vaktir í röð læknirinn kýs að taka. NULL = engin ósk.
-- Þetta er ÓSK, ekki regla: skiptingin reynir að virða hana en jöfn dreifing
-- gengur fyrir. Þakið (10) er þarna svo einn læknir geti ekki óskað eftir
-- öllum mánuðinum í einni lotu.
alter table public.roster_doctors
  add column if not exists preferred_run_length integer
    check (preferred_run_length is null or preferred_run_length between 1 and 10);

comment on column public.roster_doctors.preferred_run_length is
  'Ósk um fjölda vakta í röð (1–10). NULL = engin ósk. Mjúk regla.';

-- ── Frí ─────────────────────────────────────────────────────────────────────
-- Ólíkt vikudögum og hámarki er þetta HÖRÐ regla: læknir í fríi fær ekki vakt.
-- Sér tafla frekar en dálkur því fríin eru mörg, hvert með sitt tímabil, og
-- eiga að lifa af breytingar á öðrum óskum.
--
-- Einn dagur er tímabil þar sem starts_on = ends_on. Þannig þarf hvorki
-- sérstaka meðhöndlun né aukadálk fyrir stakan dag.
create table if not exists public.roster_doctor_absences (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.roster_doctors(id) on delete cascade,
  starts_on  date not null,
  ends_on    date not null,
  note       text not null default '',
  created_at timestamptz not null default now(),
  -- Öfugt tímabil er innsláttarvilla, ekki gilt frí.
  constraint roster_absence_order check (ends_on >= starts_on)
);

create index if not exists roster_absences_doctor_idx
  on public.roster_doctor_absences (doctor_id, starts_on);
create index if not exists roster_absences_range_idx
  on public.roster_doctor_absences (starts_on, ends_on);

-- Starfsfólk les (svo stjórnandi sjái hver er í fríi); skrif fara um
-- þjónustulykil eins og annað í vaktakerfinu.
alter table public.roster_doctor_absences enable row level security;
drop policy if exists roster_absences_staff_read on public.roster_doctor_absences;
create policy roster_absences_staff_read on public.roster_doctor_absences
  for select to authenticated using (public.is_active_staff());
