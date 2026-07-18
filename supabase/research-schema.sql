-- ============================================================================
-- Fjarlækningar admin — Phase 3: Research (internal notes / library)
--
-- Lightweight internal research repository: studies, protocols and findings as
-- markdown notes with source links. NOTE: lifeline's research module (Medalia
-- longitudinal cohort ingest, clinical-flag dashboard, AI trends, Excel export)
-- is intentionally OUT OF SCOPE here.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers
-- (is_active_staff()/is_admin_staff()). Internal only — no anon access.
-- ============================================================================

create table if not exists public.research_notes (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  category     text        not null default 'general',
  body         text        not null default '',            -- markdown
  source_url   text,
  created_by   uuid        references public.staff(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.research_notes enable row level security;

-- Any active staff may read research notes. All writes go through
-- /api/admin/research/* using the service-role key.
drop policy if exists research_notes_staff_read on public.research_notes;
create policy research_notes_staff_read on public.research_notes
  for select to authenticated
  using (public.is_active_staff());

-- Self-contained updated_at trigger (create-or-replace so migration order
-- doesn't matter).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$;

drop trigger if exists trg_research_notes_updated_at on public.research_notes;
create trigger trg_research_notes_updated_at
  before update on public.research_notes
  for each row execute function public.touch_updated_at();
