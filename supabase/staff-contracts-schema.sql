-- ============================================================================
-- In-app e-signed contracts. An admin creates a contract (canonical text) for a
-- staff member; the member type-signs it on Mín síða. On signing, the server
-- verifies the text hash is unchanged, generates an audited PDF, stores it in
-- the private 'staff-documents' bucket, and files a staff_documents row so the
-- signed copy shows in both the team view and Mín skjöl.
-- Modeled on lifeline-website employment_contracts. Requires is_admin_staff()
-- and the staff-documents bucket (staff-documents-schema.sql). Run once.
-- ============================================================================

create table if not exists public.staff_contracts (
  id                  uuid primary key default gen_random_uuid(),
  staff_id            uuid        not null references public.staff(id) on delete cascade,
  token               text        not null unique,
  title               text        not null default 'Ráðningarsamningur',
  body                text        not null,                 -- canonical text that is signed
  version             text        not null default 'v1',
  terms_hash          text        not null,                 -- sha256 of body at send
  status              text        not null default 'sent' check (status in ('sent','signed','void')),
  signatory_name      text,
  signatory_kennitala text,
  signatory_ip        text,
  signatory_user_agent text,
  signed_at           timestamptz,
  pdf_storage_path    text,
  pdf_sha256          text,
  created_by          uuid        references public.staff(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists staff_contracts_staff_idx on public.staff_contracts (staff_id);

alter table public.staff_contracts enable row level security;
drop policy if exists staff_contracts_read on public.staff_contracts;
create policy staff_contracts_read on public.staff_contracts
  for select to authenticated
  using (staff_id = auth.uid() or public.is_admin_staff());
