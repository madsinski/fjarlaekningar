-- ============================================================================
-- Staff documents — signed employment contracts (and other HR files) stored per
-- staff member. Modeled on lifeline-website's staff_documents. Files live in a
-- PRIVATE storage bucket; all access goes through the service-role admin API
-- (upload + short-lived signed download URLs), so there are no client storage
-- policies. Run once in the Supabase SQL editor. Requires is_admin_staff().
-- ============================================================================

create table if not exists public.staff_documents (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid        not null references public.staff(id) on delete cascade,
  kind         text        not null default 'employment_contract',
  title        text        not null default '',
  filename     text        not null,
  storage_path text        not null,
  content_type text,
  size_bytes   integer,
  signer_name  text,
  signed_at    date,
  note         text        not null default '',
  uploaded_by  uuid        references public.staff(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);
create index if not exists staff_documents_staff_idx on public.staff_documents (staff_id);

alter table public.staff_documents enable row level security;
-- A member may see the metadata of their OWN documents; admins see all. The
-- files themselves are only reachable via signed URLs minted by the admin API.
drop policy if exists staff_documents_read on public.staff_documents;
create policy staff_documents_read on public.staff_documents
  for select to authenticated
  using (staff_id = auth.uid() or public.is_admin_staff());

-- Private bucket for the actual files.
insert into storage.buckets (id, name, public)
values ('staff-documents', 'staff-documents', false)
on conflict (id) do nothing;
