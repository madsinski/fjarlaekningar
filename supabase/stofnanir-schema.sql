-- ============================================================================
-- Fjarlækningar admin — Samstarfsstofnanir (partner-institution access pages)
--
-- Each row is a shareable proposal page for a health institution (HSU, HSN, …)
-- that wants to place a "access Fjarlækningar" section on its own island.is
-- site. Managed in /admin/stofnanir, shared via /samstarf/<slug>.
--
-- Public reads only PUBLISHED rows; staff read everything. All writes go through
-- the service-role API (supabaseAdmin), which bypasses RLS — so no write
-- policies here. Run once in the Supabase SQL editor. Idempotent. Requires the
-- Phase-1 helper public.is_active_staff().
-- ============================================================================

create table if not exists public.partner_pages (
  id            uuid primary key default gen_random_uuid(),
  slug          text        not null unique,
  name          text        not null,
  short_name    text        not null default '',
  logo_url      text,
  eyebrow       text        not null default 'Íslensk fjarlækningaþjónusta',
  title         text        not null default 'Læknishjálp hvar og hvenær sem er',
  intro         text        not null default 'Markmið Fjarlækninga er að leysa einföld og afmörkuð erindi sem ekki þarfnast líkamlegrar skoðunar. Þú svarar stuttum spurningalista, læknir metur erindið og leggur til meðferð. Skilvirk leið sem styttir biðtíma eftir lækni.',
  region        text        not null default '',
  response_time text        not null default 'Svar innan 2 klst.',
  hours         text        not null default 'Opið alla daga 10:00–22:00',
  service_url   text        not null default '',
  info_url      text        not null default 'https://www.fjarlaekningar.is',
  erindi        jsonb       not null default '[]',
  pilot_tag     text        not null default 'Tilraunaverkefni',
  safety_note   text        not null default 'Þjónustan hentar einföldum og afmörkuðum erindum og kemur ekki í stað hefðbundinnar heilsugæslu. Ef um alvarleg eða bráð veikindi er að ræða skaltu hafa samband við heilsugæslu eða hringja í 112.',
  status        text        not null default 'draft' check (status in ('draft','published')),
  created_by    uuid        references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists partner_pages_updated_idx on public.partner_pages (updated_at desc);

alter table public.partner_pages enable row level security;

drop policy if exists partner_pages_public_read_published on public.partner_pages;
create policy partner_pages_public_read_published on public.partner_pages
  for select to anon, authenticated using (status = 'published');

drop policy if exists partner_pages_staff_read_all on public.partner_pages;
create policy partner_pages_staff_read_all on public.partner_pages
  for select to authenticated using (public.is_active_staff());

-- touch_updated_at() already exists globally (single-line body, SQL-editor quirk).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;
drop trigger if exists trg_partner_pages_updated_at on public.partner_pages;
create trigger trg_partner_pages_updated_at
  before update on public.partner_pages
  for each row execute function public.touch_updated_at();

-- ── Seed: HSU (draft) — the first partner. Guarded so re-running won't dup. ──
insert into public.partner_pages (slug, name, short_name, logo_url, intro, region, service_url, erindi)
select
  'hsu',
  'Heilbrigðisstofnun Suðurlands',
  'HSU',
  '/hsu-logo.webp',
  'HSU og Fjarlækningar bjóða skjólstæðingum nýja leið til að leysa algeng og afmörkuð erindi í gegnum örugga sjúklingagátt — hvar og hvenær sem er. Þú svarar markvissum spurningum, líkt og í hefðbundnu læknisviðtali, og færð svar frá lækni.',
  'HSU í Vestmannaeyjum',
  'https://app.medalia.is/fjarlaekningar-hsu',
  '["Kvef, hósti og hálsbólga","Þvagfæra- og leggangasýkingar","Frjókornaofnæmi","Frunsa","Ristill á húð","Getnaðarvarnir","Endurnýjun lyfseðla","… og fleiri afmörkuð erindi"]'::jsonb
where not exists (select 1 from public.partner_pages where slug = 'hsu');
