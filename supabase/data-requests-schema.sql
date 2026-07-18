-- ============================================================================
-- Fjarlækningar admin — Phase 3: Privacy requests (GDPR data-subject requests)
--
-- Public intake at /personuverndarbeidni writes here (via service role); staff
-- triage in /admin/data-requests. Run once in the Supabase SQL editor.
-- Idempotent. Requires Phase 1 helpers (is_active_staff / is_admin_staff).
-- ============================================================================

create table if not exists public.data_requests (
  id            uuid primary key default gen_random_uuid(),
  request_type  text        not null
                  check (request_type in ('access','rectification','erasure','restriction','portability','objection','other')),
  full_name     text        not null,
  email         text        not null,
  details       text        not null default '',
  status        text        not null default 'new'
                  check (status in ('new','in_progress','completed','rejected')),
  staff_notes   text,
  handled_by    uuid        references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists data_requests_status_idx on public.data_requests (status);
create index if not exists data_requests_created_idx on public.data_requests (created_at desc);

-- Self-contained updated_at trigger (create-or-replace so migration order
-- doesn't matter).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$;

drop trigger if exists trg_data_requests_updated_at on public.data_requests;
create trigger trg_data_requests_updated_at
  before update on public.data_requests
  for each row execute function public.touch_updated_at();

-- RLS: staff read (any active); all writes via the service-role key (public
-- intake API + admin triage API). No anon/authenticated write policies.
alter table public.data_requests enable row level security;

drop policy if exists data_requests_staff_read on public.data_requests;
create policy data_requests_staff_read on public.data_requests
  for select to authenticated
  using (public.is_active_staff());
