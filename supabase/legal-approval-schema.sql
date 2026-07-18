-- ============================================================================
-- Fjarlækningar admin — Legal approval workflow
--
-- Adds an approval lifecycle to legal_documents (draft → in_review → approved,
-- with changes_requested) + a review history table. Powers the green-tick
-- "what's left to approve" view. Run once in the Supabase SQL editor.
-- Idempotent. Requires legal-schema.sql (migration #2) to have run first.
-- ============================================================================

alter table public.legal_documents
  add column if not exists approval_status text not null default 'draft',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.staff(id) on delete set null;

-- constrain approval_status (drop-then-add so it's idempotent, no plpgsql/DO
-- block — this SQL editor's splitter trips on ';' inside dollar-quoted bodies).
alter table public.legal_documents drop constraint if exists legal_documents_approval_status_chk;
alter table public.legal_documents add constraint legal_documents_approval_status_chk
  check (approval_status in ('draft','in_review','approved','changes_requested'));

create table if not exists public.legal_document_reviews (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid        not null references public.legal_documents(id) on delete cascade,
  action        text        not null
                  check (action in ('submitted','approved','changes_requested','comment','reopened')),
  comment       text,
  reviewer_id   uuid        references public.staff(id) on delete set null,
  reviewer_name text,
  created_at    timestamptz not null default now()
);

create index if not exists legal_document_reviews_doc_idx
  on public.legal_document_reviews (document_id, created_at desc);

alter table public.legal_document_reviews enable row level security;

drop policy if exists legal_reviews_staff_read on public.legal_document_reviews;
create policy legal_reviews_staff_read on public.legal_document_reviews
  for select to authenticated
  using (public.is_active_staff());
