-- ============================================================================
-- Fjarlækningar admin — Fréttabréf (outreach / marketing email)
--
-- `subscribers`        — people who opted in on the public site to hear about
--                        Fjarlækningar news, new heilsugæsla cooperations and
--                        new services. Every row carries an unguessable
--                        unsubscribe_token so each email can link straight to
--                        a one-click opt-out (legally required).
-- `outreach_campaigns` — the newsletters themselves, drafted in
--                        /admin/outreach and rendered in the Fjarlækningar
--                        look before sending.
--
-- Public signup + unsubscribe go through /api/subscribe and /api/unsubscribe
-- using the service-role key, so there are NO anon policies here.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers
-- (is_active_staff()).
-- ============================================================================

create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text        not null unique,
  name              text,
  source            text        not null default 'website',
  unsubscribe_token text        not null unique,
  unsubscribed_at   timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists subscribers_created_idx
  on public.subscribers (created_at desc);
create index if not exists subscribers_active_idx
  on public.subscribers (unsubscribed_at);

create table if not exists public.outreach_campaigns (
  id          uuid        primary key default gen_random_uuid(),
  subject     text        not null,
  preheader   text        not null default '',
  body        text        not null default '',
  status      text        not null default 'draft' check (status in ('draft','sent')),
  sent_at     timestamptz,
  sent_count  integer     not null default 0,
  created_by  uuid        references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists outreach_campaigns_updated_idx
  on public.outreach_campaigns (updated_at desc);

-- Single-line body on purpose (the SQL editor's splitter breaks on an
-- end-of-line ';' inside a dollar-quoted body).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;

drop trigger if exists trg_outreach_campaigns_updated_at on public.outreach_campaigns;
create trigger trg_outreach_campaigns_updated_at
  before update on public.outreach_campaigns
  for each row execute function public.touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Staff may READ both tables (the admin lists them directly). Every write —
-- public signup, unsubscribe, campaign edits, sends — goes through the API
-- using the service-role key, which bypasses RLS.
alter table public.subscribers        enable row level security;
alter table public.outreach_campaigns enable row level security;

drop policy if exists subscribers_staff_read on public.subscribers;
create policy subscribers_staff_read on public.subscribers
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists subscribers_block_writes on public.subscribers;
create policy subscribers_block_writes on public.subscribers
  for all using (false) with check (false);

drop policy if exists outreach_campaigns_staff_read on public.outreach_campaigns;
create policy outreach_campaigns_staff_read on public.outreach_campaigns
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists outreach_campaigns_block_writes on public.outreach_campaigns;
create policy outreach_campaigns_block_writes on public.outreach_campaigns
  for all using (false) with check (false);
