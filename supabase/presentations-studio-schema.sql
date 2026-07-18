-- ============================================================================
-- Fjarlækningar admin — Presentation deck studio + print collateral
--
-- Ported from lifeline-website's presentation builder. Backs:
--   • /admin/presentations            — deck editor (list/create/edit/publish)
--   • /present/[slug]                 — public, chrome-free deck viewer
--   • /admin/presentations/collateral — A4 print-collateral studio
--   • /present/collateral             — public collateral viewer
--   • /present/collateral/edit/[token]— token-gated external editor
--
-- NOTE: Fjarlækningar ALREADY has a `public.presentations` table with a
-- different schema (see presentations-schema.sql — the markdown library that
-- feeds /kynning/<slug>). This studio deliberately uses `presentation_decks`
-- so the two never collide. Do NOT touch `public.presentations` here.
--
-- All reads/writes go through /api/(admin/)presentations* using the service
-- role (supabaseAdmin), which bypasses RLS. The RLS policies below are a
-- defence-in-depth mirror of how lifeline gates the same data.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers
-- (public.is_active_staff() / public.is_admin_staff() from schema.sql).
--
-- Any plpgsql body is kept on ONE line on purpose: the Supabase SQL editor's
-- statement splitter breaks on an end-of-line ';' inside a dollar-quoted body.
-- ============================================================================

-- ── 1. Deck instances ───────────────────────────────────────────────────────
-- One row per deck; `data` jsonb holds the full slide deck (shape lives in
-- src/lib/presentations/types.ts). The public /present/[slug] route only
-- serves rows where is_published = true.
create table if not exists public.presentation_decks (
  id                uuid        primary key default gen_random_uuid(),
  slug              text        not null unique,
  title             text        not null default 'Untitled presentation',
  template_version  text        not null default 'standard-v2',
  data              jsonb       not null default '{"slides":[]}'::jsonb,
  is_published      boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid        references public.staff(id) on delete set null,
  updated_by        uuid        references public.staff(id) on delete set null
);

create index if not exists idx_presentation_decks_slug       on public.presentation_decks (slug);
create index if not exists idx_presentation_decks_published  on public.presentation_decks (is_published);
create index if not exists idx_presentation_decks_updated_at on public.presentation_decks (updated_at desc);

-- Reuse the shared updated_at helper (create-or-replace so order doesn't matter).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;

drop trigger if exists trg_presentation_decks_updated_at on public.presentation_decks;
create trigger trg_presentation_decks_updated_at
  before update on public.presentation_decks
  for each row execute function public.touch_updated_at();

alter table public.presentation_decks enable row level security;

-- Active staff may read every deck (incl. drafts) directly.
drop policy if exists presentation_decks_staff_read on public.presentation_decks;
create policy presentation_decks_staff_read on public.presentation_decks
  for select to authenticated
  using (public.is_active_staff());

-- The PUBLIC (anon) may read only PUBLISHED decks — the shareable /present link.
drop policy if exists presentation_decks_public_read_published on public.presentation_decks;
create policy presentation_decks_public_read_published on public.presentation_decks
  for select to anon, authenticated
  using (is_published);

-- All writes go through the service role (bypasses RLS); no write policy.

-- ── 2. Print collateral (singleton content blob) ────────────────────────────
-- A single JSONB blob (CollateralContent, see
-- src/app/admin/presentations/collateral/content.ts). One row, id = 1.
create table if not exists public.presentation_collateral (
  id          integer     primary key default 1,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  constraint presentation_collateral_singleton check (id = 1)
);

alter table public.presentation_collateral enable row level security;

-- The collateral is public print marketing material (rendered at
-- /present/collateral). Active staff and anon may read the singleton.
drop policy if exists presentation_collateral_staff_read on public.presentation_collateral;
create policy presentation_collateral_staff_read on public.presentation_collateral
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists presentation_collateral_public_read on public.presentation_collateral;
create policy presentation_collateral_public_read on public.presentation_collateral
  for select to anon, authenticated
  using (true);

-- All writes go through the service role (admin API, or token-gated public save
-- in /api/present/collateral which validates the token in app code); no write policy.

-- Seed the singleton row (empty → API falls back to DEFAULT_CONTENT).
insert into public.presentation_collateral (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ── 3. External edit tokens (hashed) ────────────────────────────────────────
-- Unguessable, revocable tokens that let an external editor save the collateral
-- via /api/present/collateral without a login. token_hash = sha256(hex) of the
-- plaintext; the plaintext is shown to the admin once at mint time, never stored.
create table if not exists public.presentation_collateral_tokens (
  token_hash   text        primary key,
  label        text,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  expires_at   timestamptz,
  revoked      boolean     not null default false,
  last_used_at timestamptz
);

alter table public.presentation_collateral_tokens enable row level security;

-- Never client-readable (holds token hashes). Service role only — no policy is
-- an implicit deny; keep an explicit block for clarity.
drop policy if exists presentation_collateral_tokens_block on public.presentation_collateral_tokens;
create policy presentation_collateral_tokens_block on public.presentation_collateral_tokens
  for all using (false) with check (false);

-- ── 4. Storage bucket for uploaded deck imagery ─────────────────────────────
-- PUBLIC bucket so the shareable /present/[slug] deck can load images by URL
-- with no auth. Uploads happen client-side from the admin editor (ImagePicker)
-- using the staff session, so writes are gated to admin staff.
insert into storage.buckets (id, name, public)
values ('presentation-assets', 'presentation-assets', true)
on conflict (id) do nothing;

drop policy if exists "admin manage presentation assets" on storage.objects;
create policy "admin manage presentation assets" on storage.objects
  for all using (bucket_id = 'presentation-assets' and public.is_admin_staff())
  with check (bucket_id = 'presentation-assets' and public.is_admin_staff());

drop policy if exists "public read presentation assets" on storage.objects;
create policy "public read presentation assets" on storage.objects
  for select using (bucket_id = 'presentation-assets');

notify pgrst, 'reload schema';
