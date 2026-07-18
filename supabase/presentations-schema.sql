-- ============================================================================
-- Fjarlækningar admin — Phase 2: Presentations & printables
--
-- A shareable content library: presentation decks (link-outs to Figma/Medalia/
-- PDF or an inline markdown page) and printable A4 collateral. Published items
-- render at /kynning/<slug> (print-friendly). DB-backed like the legal module.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers.
-- ============================================================================

create table if not exists public.presentations (
  id            uuid primary key default gen_random_uuid(),
  slug          text        not null unique,
  title         text        not null,
  kind          text        not null default 'kynning'
                  check (kind in ('kynning','prentefni')),   -- presentation | printable
  summary       text        not null default '',
  body          text        not null default '',              -- markdown (optional)
  external_url  text,                                          -- link-out (Figma/PDF/Medalia)
  status        text        not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  updated_by    uuid        references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.presentations enable row level security;

drop policy if exists presentations_public_read_published on public.presentations;
create policy presentations_public_read_published on public.presentations
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists presentations_staff_read_all on public.presentations;
create policy presentations_staff_read_all on public.presentations
  for select to authenticated
  using (public.is_active_staff());

-- Self-contained updated_at trigger (create-or-replace so migration order
-- doesn't matter).
-- Single line on purpose (SQL-editor splitter breaks on end-of-line ';' in a
-- dollar-quoted body).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;

drop trigger if exists trg_presentations_updated_at on public.presentations;
create trigger trg_presentations_updated_at
  before update on public.presentations
  for each row execute function public.touch_updated_at();
