-- ============================================================================
-- Service evaluation — match the export Medalia can actually produce.
--
-- The agreed template drops the referral destinations, the urgency flag and
-- the entry-route detail. Rather than leave those columns in place always
-- reading zero — which is a trap, because sooner or later somebody reports
-- "0 referrals to specialists" as a finding — they are removed.
--
-- Two things are recovered rather than lost:
--   · Urgent escalation now comes from the exclusion-reasons file, where it is
--     gate = clinician with reason = acute. Reason-coded is better than a bare
--     flag anyway.
--   · Entry route collapses to direct vs via staff, which still carries the
--     workload point: a patient who arrives directly costs the health centre
--     nothing.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- ============================================================================

alter table public.evaluation_months
  drop column if exists referred_primary_care,
  drop column if exists referred_specialist,
  drop column if exists referred_other,
  drop column if exists referred_urgent,
  drop column if exists entry_reception,
  drop column if exists entry_records,
  drop column if exists entry_other;

-- entry_nurse covered only nurses; the export cannot separate nurses from
-- reception and records staff, so the column is renamed to say what it holds.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'evaluation_months' and column_name = 'entry_nurse')
     and not exists (select 1 from information_schema.columns
                     where table_name = 'evaluation_months' and column_name = 'entry_via_staff')
  then
    alter table public.evaluation_months rename column entry_nurse to entry_via_staff;
  end if;
end $$;
