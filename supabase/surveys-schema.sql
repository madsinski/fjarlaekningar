-- ============================================================================
-- Fjarlækningar admin — Phase 3: Surveys
--
-- Staff build surveys; the public fills them in anonymously at
-- /kannanir/<slug>. Run once in the Supabase SQL editor. Idempotent.
-- Requires Phase 1 helpers (is_active_staff / is_admin_staff).
-- ============================================================================

-- questions jsonb shape (see src/lib/survey-types.ts):
--   [{ id, label, type: 'text'|'textarea'|'single_choice', options?, required? }]
create table if not exists public.surveys (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  title       text        not null,
  description text        not null default '',
  questions   jsonb       not null default '[]',
  status      text        not null default 'draft' check (status in ('draft','published')),
  created_by  uuid        references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid        not null references public.surveys(id) on delete cascade,
  answers      jsonb       not null default '{}',
  ip           text,
  submitted_at timestamptz not null default now()
);

create index if not exists survey_responses_survey_idx on public.survey_responses (survey_id);

alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- Public may read PUBLISHED surveys (to render the form); staff read all.
drop policy if exists surveys_public_read_published on public.surveys;
create policy surveys_public_read_published on public.surveys
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists surveys_staff_read_all on public.surveys;
create policy surveys_staff_read_all on public.surveys
  for select to authenticated
  using (public.is_active_staff());

-- Responses: staff read only; inserts happen via the service-role API.
drop policy if exists survey_responses_staff_read on public.survey_responses;
create policy survey_responses_staff_read on public.survey_responses
  for select to authenticated
  using (public.is_active_staff());

-- Single line on purpose (SQL-editor splitter breaks on end-of-line ';' in a
-- dollar-quoted body).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;

drop trigger if exists trg_surveys_updated_at on public.surveys;
create trigger trg_surveys_updated_at
  before update on public.surveys
  for each row execute function public.touch_updated_at();
