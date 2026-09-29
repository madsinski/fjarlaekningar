-- ============================================================================
-- Service evaluation — columns for the medical advisor's programme (2026-09-29).
--
-- The advisor set three questions for the Vestmannaeyjar pilot: does it work
-- for the patient, does it work for the health system, is it safe. Data come
-- from a patient survey at day 0 and day 7, a Saga baseline from HSU (CSV)
-- and Medalia exports at 6 and 12 months (JSON).
--
-- Still aggregates only. Survey answers are shares, Saga figures are monthly
-- counts that HSU produces on its own side — no ID numbers, no dates.
--
-- Every column nullable except the two survey counts, which weight the day-7
-- rates and are zero until a survey is sent. Idempotent.
-- ============================================================================

alter table public.evaluation_months
  -- Patient survey, day 0 (weighted by survey_responses) and day 7.
  add column if not exists survey_7d_sent integer not null default 0,
  add column if not exists survey_7d_responses integer not null default 0,
  add column if not exists survey_satisfied_pct integer,
  add column if not exists survey_substituted_pct integer,
  add column if not exists survey_test_obtain_pct integer,
  add column if not exists survey_test_perform_pct integer,
  add column if not exists survey_resolved_pct integer,
  add column if not exists survey_sought_care_7d_pct integer,
  add column if not exists survey_other_diagnosis_pct integer,

  -- Serious adverse reaction or allergy to a prescribed drug: day-7 survey
  -- plus incident reports, counted once per patient.
  add column if not exists adverse_drug_reactions integer,

  -- Decision tree: cases with a tree outcome, and those the doctor changed.
  add column if not exists tree_cases integer,
  add column if not exists tree_overridden integer,

  -- 7-day review in Saga, run by HSU: of revisits_7d, the same problem.
  add column if not exists revisits_related integer,

  -- Traditional-service comparator: HSU code-days in the agreed set with an
  -- antibiotic prescribed. Pairs with institution_contacts.
  add column if not exists institution_antibiotics integer,

  -- HSU staff survey at the end of the period.
  add column if not exists staff_satisfied_pct integer,
  add column if not exists staff_helps_pct integer,
  add column if not exists staff_continue_pct integer;
