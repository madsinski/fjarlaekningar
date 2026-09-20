-- ============================================================================
-- Service evaluation — columns for the second wave of research modules.
--
-- Added rather than folded into evaluation-schema.sql so the first migration
-- stays a record of what was actually run on 2026-09-20. Every column is
-- nullable: a module that is switched off never asks for its field, and an
-- unmeasured field must read as unmeasured rather than as zero.
--
-- Still aggregates only. Nothing here identifies a person: age reach is a
-- percentage band, not a date of birth, and language is a share, not a name.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- ============================================================================

alter table public.evaluation_months
  -- Our own clinicians' time. Drives unit economics and, with the rota,
  -- how much headroom the service actually has.
  add column if not exists clinician_minutes_median integer,

  -- Home tests (CRP, urine dipstick). Worth separating "used" from "changed
  -- the decision": a test that never changes anything is stock on a shelf.
  add column if not exists home_tests_used integer,
  add column if not exists home_tests_changed_decision integer,

  -- Photographs submitted for skin and eye presentations.
  add column if not exists images_submitted integer,
  add column if not exists images_inadequate integer,

  -- Who the service actually reaches, as shares. The question behind this is
  -- whether remote care quietly serves only the digitally confident.
  add column if not exists reach_under40_pct integer,
  add column if not exists reach_over70_pct integer,
  add column if not exists reach_other_language_pct integer,

  -- When demand arrives. Shapes the rota rather than the clinic's opening hours.
  add column if not exists demand_evening_pct integer,
  add column if not exists demand_weekend_pct integer,

  -- Displacement from out-of-hours care, self-reported in the survey.
  add column if not exists ooh_alternative_pct integer,

  -- Did-not-attend. A remote case cannot be a no-show; the comparison is the
  -- institution's own rate for the appointments it replaces.
  add column if not exists institution_dna_pct integer,

  -- Diagnostic concordance: of referred cases later seen in person, how often
  -- the remote working diagnosis agreed. Publication-grade, high effort.
  add column if not exists concordance_checked integer,
  add column if not exists concordance_agreed integer,

  -- Follow-up adherence: did patients do what was advised.
  add column if not exists followup_contacted integer,
  add column if not exists followup_adhered integer,

  -- Implementation cost of opening this site. Entered once, in the go-live
  -- month. This is the figure the next institution asks for first.
  add column if not exists implementation_days integer,
  add column if not exists training_hours integer;
