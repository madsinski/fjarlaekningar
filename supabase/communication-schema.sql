-- ============================================================================
-- Fjarlækningar admin — Phase 3: Communication (general-inquiry inbox)
--
-- General, NON-medical inquiries submitted from the public contact form
-- (/fyrirspurn) land here for staff triage. Medical erindi never touch this —
-- they go through Medalia. Run once in the Supabase SQL editor. Idempotent.
-- Requires Phase 1 helpers (is_active_staff()).
-- ============================================================================

create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  email        text        not null,
  subject      text        not null default '',
  message      text        not null,
  status       text        not null default 'new' check (status in ('new','handled')),
  staff_notes  text,
  handled_by   uuid        references public.staff(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc);

-- RLS: staff read only. Inserts (public form) + updates (triage) go through
-- the API using the service-role key, which bypasses RLS. No anon policies.
alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_staff_read on public.contact_messages;
create policy contact_messages_staff_read on public.contact_messages
  for select to authenticated
  using (public.is_active_staff());
