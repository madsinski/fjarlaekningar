-- ============================================================================
-- Service evaluation — turning away, separated from referring onward.
--
-- `cases_referred` merged two things that are not alike: a patient who needs
-- something we do not offer (working as intended, not a safety signal) and a
-- patient who should not have been here at all — pregnant, under eighteen,
-- acute symptoms, needs examining. Only the second is a safety measure, and
-- merging them made it disappear.
--
-- Two gates catch those exclusions: the questionnaire, systematically and
-- identically every time, and a clinician afterwards, expensively. Read
-- together they answer what a clinical audience actually asks — does the
-- screen work, and what gets past it.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- ============================================================================

alter table public.evaluation_months
  -- Subset of cases_referred: turned away as unsuitable rather than referred
  -- onward as part of normal care. cases_referred − excluded_by_doctor is
  -- therefore clinical referral, which is not a safety figure.
  add column if not exists excluded_by_doctor integer not null default 0,

  -- Both gates, one place: [{ "gate": "form"|"clinician", "reason": "<id>", "count": n }]
  -- Reason ids are fixed in src/lib/evaluation/exclusions.ts and derive from
  -- the service's own triage rules, so the categories match the clinical logic
  -- rather than sitting beside it.
  add column if not exists exclusion_reasons jsonb not null default '[]'::jsonb;

-- screening_reasons held only the form gate and was never populated. Dropped
-- rather than left as a second place the same thing could live.
alter table public.evaluation_months drop column if exists screening_reasons;
