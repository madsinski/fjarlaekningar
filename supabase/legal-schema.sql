-- ============================================================================
-- Fjarlækningar admin — Phase 2: Legal documents
--
-- DB-backed legal document manager. Unlike lifeline (text-in-code), the
-- document body lives in the DB so staff can edit + publish the privacy
-- policy / telemedicine terms / patient consent without a code deploy.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires the Phase 1
-- schema (staff + is_active_staff()/is_admin_staff() helpers) to exist first.
-- ============================================================================

-- ── legal_documents ─────────────────────────────────────────────────────────
create table if not exists public.legal_documents (
  id            uuid primary key default gen_random_uuid(),
  slug          text        not null unique,          -- URL slug, e.g. 'personuvernd'
  title         text        not null,
  category      text        not null default 'general'
                  check (category in ('privacy','terms','consent','general')),
  language      text        not null default 'is' check (language in ('is','en')),
  body          text        not null default '',       -- markdown
  version       integer     not null default 1,
  status        text        not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  updated_by    uuid        references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── legal_document_versions ─────────────────────────────────────────────────
-- Append-only history: one snapshot per save, for audit / rollback reference.
create table if not exists public.legal_document_versions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid        not null references public.legal_documents(id) on delete cascade,
  version        integer     not null,
  title          text        not null,
  body           text        not null,
  status         text        not null,
  text_hash      text,                                 -- sha256 of body
  edited_by      uuid        references public.staff(id) on delete set null,
  edited_by_name text,
  created_at     timestamptz not null default now(),
  unique (document_id, version)
);

create index if not exists legal_document_versions_doc_idx
  on public.legal_document_versions (document_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Staff (any active) read everything incl. drafts; the PUBLIC (anon) may read
-- only PUBLISHED documents — that's what the public marketing site renders.
-- All writes go through /api/admin/legal/* using the service-role key.
alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;

drop policy if exists legal_docs_public_read_published on public.legal_documents;
create policy legal_docs_public_read_published on public.legal_documents
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists legal_docs_staff_read_all on public.legal_documents;
create policy legal_docs_staff_read_all on public.legal_documents
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists legal_versions_staff_read on public.legal_document_versions;
create policy legal_versions_staff_read on public.legal_document_versions
  for select to authenticated
  using (public.is_active_staff());

-- keep updated_at fresh
create or replace function public.touch_legal_documents_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$;

drop trigger if exists trg_legal_documents_updated_at on public.legal_documents;
create trigger trg_legal_documents_updated_at
  before update on public.legal_documents
  for each row execute function public.touch_legal_documents_updated_at();
