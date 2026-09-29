-- Which HSU station a survey response belongs to.
--
-- The link sent after a case carries ?stod=<station>. Without it the
-- evaluation cannot split survey answers by station, and the next station's
-- figures would be mixed into the pilot's. Validated against HSU_STATIONS in
-- the respond route; null when the link had no station. Idempotent.

alter table public.survey_responses add column if not exists station text;
create index if not exists survey_responses_survey_station_idx
  on public.survey_responses (survey_id, station, submitted_at);
