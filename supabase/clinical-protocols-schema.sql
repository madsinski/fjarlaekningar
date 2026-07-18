-- ============================================================================
-- Fjarlækningar admin — Clinical protocols / algorithm change log
--
-- Medical-device-oriented version control for the clinical algorithm behind
-- each medical problem (erindi: frjókornaofnæmi, getnaðarvörn, …) and any new
-- ones. EVERY change to an algorithm creates an immutable, append-only change
-- record (version snapshot + mandatory change summary + rationale + author +
-- timestamp) — the audit trail you'd need for MDR / ISO 13485 readiness.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers.
-- ============================================================================

create table if not exists public.clinical_protocols (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,             -- matches an erindi slug (or a new one)
  title       text        not null,
  summary     text        not null default '',
  algorithm   text        not null default '',          -- markdown: the current clinical logic
  version     integer     not null default 1,
  status      text        not null default 'draft' check (status in ('draft','active','retired')),
  risk_class  text        not null default 'unclassified'
                check (risk_class in ('unclassified','I','IIa','IIb','III')),
  updated_by  uuid        references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Append-only audit log. One row per version; snapshots are never edited.
create table if not exists public.clinical_protocol_changes (
  id                 uuid        primary key default gen_random_uuid(),
  protocol_id        uuid        not null references public.clinical_protocols(id) on delete cascade,
  version            integer     not null,
  change_type        text        not null
                       check (change_type in ('created','algorithm_change','clarification','correction','retired','reactivated')),
  summary            text        not null,               -- WHAT changed (mandatory)
  rationale          text,                               -- WHY
  algorithm_snapshot text        not null,               -- full algorithm text at this version
  title_snapshot     text        not null,
  changed_by         uuid        references public.staff(id) on delete set null,
  changed_by_name    text,
  created_at         timestamptz not null default now(),
  unique (protocol_id, version)
);

create index if not exists clinical_protocol_changes_idx
  on public.clinical_protocol_changes (protocol_id, version desc);

alter table public.clinical_protocols enable row level security;
alter table public.clinical_protocol_changes enable row level security;

drop policy if exists clinical_protocols_staff_read on public.clinical_protocols;
create policy clinical_protocols_staff_read on public.clinical_protocols
  for select to authenticated using (public.is_active_staff());

drop policy if exists clinical_protocol_changes_staff_read on public.clinical_protocol_changes;
create policy clinical_protocol_changes_staff_read on public.clinical_protocol_changes
  for select to authenticated using (public.is_active_staff());

-- Single-line body on purpose (SQL-editor splitter safety).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;
drop trigger if exists trg_clinical_protocols_updated_at on public.clinical_protocols;
create trigger trg_clinical_protocols_updated_at before update on public.clinical_protocols
  for each row execute function public.touch_updated_at();
