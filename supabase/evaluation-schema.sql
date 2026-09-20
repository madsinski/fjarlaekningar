-- ============================================================================
-- Service evaluation — monthly figures, documents and programme configuration.
--
-- Replaces the Icelandic-named `arangur_manudir` from 2026-09-20. That table
-- never held a row, so it is dropped rather than renamed: column names are
-- read far more often than they are written, and `visad_brad` is not a name
-- an English-reading reviewer can act on.
--
-- Every figure here is an aggregate. One row is a COUNT, never a person: no
-- national ID, no dates finer than a month, no free text describing a case,
-- no age band, no sex. That is a design decision rather than a precaution —
-- the dashboard needs counts and counts are all it is given, so there is
-- nothing here to protect and the table falls plainly under quality assurance
-- rather than research.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- Safety rail: only drop the old table if it is genuinely empty. If somebody
-- entered data between the two migrations this raises instead of destroying it.
do $$
begin
  if to_regclass('public.arangur_manudir') is not null then
    if (select count(*) from public.arangur_manudir) > 0 then
      raise exception 'arangur_manudir has rows — migrate them before dropping';
    end if;
    drop table public.arangur_manudir;
  end if;
end $$;

create table if not exists public.evaluation_months (
  id           uuid primary key default gen_random_uuid(),

  institution  text not null default 'hsu',
  station      text not null,
  month        date not null,

  -- ── From Medalia ───────────────────────────────────────────────────────
  cases_total       integer not null default 0,
  cases_resolved    integer not null default 0,
  cases_referred    integer not null default 0,
  cases_repeat      integer not null default 0,

  referred_primary_care integer not null default 0,
  referred_specialist   integer not null default 0,
  referred_other        integer not null default 0,
  -- Sent to emergency care or 112 AFTER the patient passed the questionnaire.
  -- Kept apart from ordinary referral because it is a near miss of the screen
  -- itself, and it is the sharpest safety signal we hold in our own data.
  referred_urgent       integer not null default 0,

  codes_outside_set integer not null default 0,

  screening_stops   integer not null default 0,
  screening_reasons jsonb not null default '[]'::jsonb,

  prescriptions integer not null default 0,
  antibiotics   integer not null default 0,

  response_median_min integer,
  response_p95_min    integer,

  -- { "<case-type slug>": { "total": n, "resolved": n, "referred": n } }
  cases_by_type jsonb not null default '{}'::jsonb,

  -- Entry route. A patient who arrives directly costs the health centre zero
  -- minutes, so this is a workload measure and not a marketing one.
  entry_direct    integer not null default 0,
  entry_nurse     integer not null default 0,
  entry_reception integer not null default 0,
  entry_records   integer not null default 0,
  entry_other     integer not null default 0,

  -- The catch-all, measured separately: it is where the next case types hide.
  general_total      integer not null default 0,
  general_resolved   integer not null default 0,
  general_unresolved_reasons jsonb not null default '[]'::jsonb,

  -- ── From the institution ───────────────────────────────────────────────
  -- Their contact register, in the same diagnostic codes, same month. This is
  -- the denominator, and it is better than anything we could have counted:
  -- their data, their system, nationally standardised.
  institution_contacts integer,
  -- Return visits within 7 days. The institution runs the query at their end
  -- and hands over the count only, so no identifiable linkage takes place and
  -- the project stays quality assurance.
  revisits_7d          integer,
  locum_cost_isk       bigint,
  institution_calls    integer,

  -- ── From surveys and incident reporting ────────────────────────────────
  survey_sent      integer not null default 0,
  survey_responses integer not null default 0,
  survey_easy_pct  integer,
  survey_reuse_pct integer,
  -- Would not have sought care at all. Pure access gain, and the strongest
  -- argument the patient side has.
  survey_would_not_have_sought_pct integer,
  -- From the patient's FIRST attempt to get help, not from submission. Much
  -- larger than our own response time, and where the real gain sits.
  time_to_resolution_median_h integer,
  trips_avoided               integer,

  staff_nurses_positive_pct  integer,
  staff_doctors_positive_pct integer,

  deviations        integer not null default 0,
  near_misses       integer not null default 0,
  serious_incidents integer not null default 0,

  -- ── From our own systems ───────────────────────────────────────────────
  -- Staffing itself is derived live from roster_* and is not stored here.
  -- Only what the rota does not record is entered by hand.
  doctors_left      integer not null default 0,
  support_questions integer not null default 0,
  uptime_pct        integer,

  note            text not null default '',
  sources_present jsonb not null default '[]'::jsonb,
  entered_by      uuid references public.staff(id) on delete set null,
  entered_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists evaluation_months_uidx
  on public.evaluation_months (institution, station, month);
create index if not exists evaluation_months_month_idx
  on public.evaluation_months (month desc);

alter table public.evaluation_months enable row level security;
drop policy if exists evaluation_months_staff_read on public.evaluation_months;
create policy evaluation_months_staff_read on public.evaluation_months
  for select to authenticated using (public.is_active_staff());
drop policy if exists evaluation_months_block_writes on public.evaluation_months;
create policy evaluation_months_block_writes on public.evaluation_months
  for all using (false) with check (false);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;
drop trigger if exists trg_evaluation_months_updated_at on public.evaluation_months;
create trigger trg_evaluation_months_updated_at
  before update on public.evaluation_months
  for each row execute function public.touch_updated_at();

-- ── Documents ───────────────────────────────────────────────────────────────
-- The paperwork is what actually blocks an evaluation: the agreed code set,
-- the ethics ruling, the data-sharing agreement, the survey instrument. It has
-- nowhere else to live, so a module that needs one says so and the file is
-- attached to that module.
create table if not exists public.evaluation_documents (
  id          uuid primary key default gen_random_uuid(),
  module_id   text not null,
  doc_id      text not null,
  filename    text not null,
  path        text not null,          -- object path in the research-docs bucket
  size_bytes  bigint not null default 0,
  mime        text not null default '',
  note        text not null default '',
  uploaded_by uuid references public.staff(id) on delete set null,
  uploaded_by_name text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists evaluation_documents_module_idx
  on public.evaluation_documents (module_id, doc_id);

alter table public.evaluation_documents enable row level security;
drop policy if exists evaluation_documents_staff_read on public.evaluation_documents;
create policy evaluation_documents_staff_read on public.evaluation_documents
  for select to authenticated using (public.is_active_staff());
drop policy if exists evaluation_documents_block_writes on public.evaluation_documents;
create policy evaluation_documents_block_writes on public.evaluation_documents
  for all using (false) with check (false);

-- Private bucket; all access goes through the admin API with the service role,
-- which issues short-lived signed URLs. These files can contain an agreement
-- with a named contact, so they are not public.
insert into storage.buckets (id, name, public)
values ('research-docs', 'research-docs', false)
on conflict (id) do nothing;

-- ── Programme configuration ─────────────────────────────────────────────────
-- Which modules are switched on, in what order, the advisor's notes and the
-- setup steps ticked off. One small document edited by one or two admins, so
-- it lives in site_settings and adding a module needs no migration.
insert into public.site_settings (key, value)
values ('evaluation_programme', '{"enabled": [], "notes": {}, "done": {}}'::jsonb)
on conflict (key) do nothing;

-- Assumptions behind derived figures. Workload relief is resolved cases times
-- minutes, so the assumption is part of the claim and has to be visible,
-- adjustable and written down rather than buried in code.
insert into public.site_settings (key, value)
values ('evaluation_assumptions',
        '{"minutesSaved": 20, "minutesSpent": 0, "hoursPerClinicDay": 7, "responseTargetMinutes": 120, "studyDone": false}'::jsonb)
on conflict (key) do nothing;

delete from public.site_settings where key in ('arangur_forsendur', 'arangur_gatlisti');
