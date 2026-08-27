-- ============================================================================
-- Vaktaóskir lækna + jöfn skipting vakta.
-- Keyrist einu sinni í SQL-ritli Supabase. Idempotent.
-- ============================================================================

-- Hámarksfjöldi vakta á mánuði. NULL = ekkert þak.
alter table public.roster_doctors
  add column if not exists max_shifts_per_month integer;

-- Leyfilegir vikudagar, 0 = sunnudagur … 6 = laugardagur.
-- Tómt fylki (sjálfgefið) = allir dagar leyfðir. Geymt sem fylki frekar en sjö
-- boolean-dálkar svo hægt sé að spyrja "hvaða dagar?" í einni umferð.
alter table public.roster_doctors
  add column if not exists allowed_weekdays smallint[] not null default '{}';

-- Frjáls athugasemd um óskir sem reglurnar ná ekki utan um ("ekki fyrstu vikuna
-- í júlí"). Sýnd þeim sem raðar niður; hún er ekki keyrð sjálfvirkt.
alter table public.roster_doctors
  add column if not exists shift_note text not null default '';

alter table public.roster_doctors
  add column if not exists prefs_updated_at timestamptz;

comment on column public.roster_doctors.allowed_weekdays is
  '0=sun … 6=lau. Tómt = allir dagar.';
