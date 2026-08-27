-- ============================================================================
-- Verktakagreiðslur: greiðsluupplýsingar verktaka og mánaðarlegir reikningar.
-- Keyrist einu sinni í SQL-ritli Supabase. Idempotent.
--
-- Af hverju sér tafla en ekki dálkar á public.staff:
--   staff er lesin úr vafranum (staff_read_self_or_admin hleypir hverjum
--   starfsmanni í sína eigin röð). Það er í lagi fyrir nafn og símanúmer en
--   óþarft fyrir kennitölu og bankareikning. Þessar töflur eru API-miðlaðar:
--   vafrinn kemst aldrei í þær, allt fer um þjónustulykil í API-leiðum.
-- ============================================================================

-- ── staff_billing ───────────────────────────────────────────────────────────
create table if not exists public.staff_billing (
  staff_id       uuid primary key references public.staff(id) on delete cascade,
  kennitala      text,
  phone          text,
  bank_account   text,                      -- reikningsnúmer
  -- Hver er verktakinn? Sé greitt til slf-félags er FÉLAGIÐ samningsaðili og
  -- útgefandi reiknings, ekki einstaklingurinn. Fagleg ábyrgð situr eftir sem
  -- áður hjá lækninum sjálfum (3. gr. samnings) — ekki rugla þessu saman.
  invoice_as     text not null default 'person'
                   check (invoice_as in ('person', 'slf')),
  slf_name       text,
  slf_kennitala  text,
  -- Heilbrigðisþjónusta er undanþegin VSK. Geymt frekar en harðkóðað því
  -- verktakar geta verið í ólíkri stöðu.
  vat_status     text not null default 'exempt_healthcare'
                   check (vat_status in ('exempt_healthcare', 'standard')),
  -- Númeraröð ÞESSA verktaka. Reikningsnúmer tilheyra útgefandanum, ekki
  -- Fjarlækningum — ein sameiginleg röð gerði þetta að sjálfsútgáfu.
  invoice_seq    integer not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     text                        -- 'self' eða kennitala/id stjórnanda
);

alter table public.staff_billing enable row level security;
drop policy if exists staff_billing_block_client on public.staff_billing;
create policy staff_billing_block_client on public.staff_billing
  for all using (false) with check (false);

-- ── contractor_invoices ─────────────────────────────────────────────────────
-- Einn reikningur á verktaka á mánuði. Fjöldi sjúklinga er AFLEIDDUR af
-- roster_shifts.patients_seen — hann er hvergi skráður aftur.
create table if not exists public.contractor_invoices (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid    not null references public.staff(id) on delete cascade,
  period_year     integer not null,
  period_month    integer not null check (period_month between 1 and 12),
  invoice_number  text,                       -- úthlutað við útgáfu, ekki fyrr
  patients_total  integer not null default 0,
  -- Taxti og útgefandi eru AFRITAÐIR inn á reikninginn við útgáfu. Reikningur
  -- er skjal um það sem var: breytist taxtinn eða flytji verktaki bankareikning
  -- má reikningur síðasta árs ekki breytast með. Sama regla og
  -- staff_contracts.terms_hash fylgir nú þegar.
  rate            integer not null default 0,
  amount          integer not null default 0,
  issuer_snapshot jsonb,
  lines           jsonb,                      -- vaktirnar að baki tölunni, við útgáfu
  status          text    not null default 'draft'
                    check (status in ('draft', 'issued', 'approved', 'paid', 'void')),
  note            text    not null default '',
  issued_at       timestamptz,
  approved_at     timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (staff_id, period_year, period_month)
);

create index if not exists contractor_invoices_staff_idx
  on public.contractor_invoices (staff_id, period_year desc, period_month desc);
create index if not exists contractor_invoices_status_idx
  on public.contractor_invoices (status);

alter table public.contractor_invoices enable row level security;
drop policy if exists contractor_invoices_block_client on public.contractor_invoices;
create policy contractor_invoices_block_client on public.contractor_invoices
  for all using (false) with check (false);
