-- ============================================================================
-- HSU vaktakerfi — Heilsugæslan í Vestmannaeyjum
--
-- Sér vaktakerfi fyrir lækna HSU, hýst í sama Supabase-verkefni og
-- Fjarlækningar en algjörlega aðskilið frá því:
--
--   * Eigin innskráning (hsu_doctors + hsu_sessions). Læknar HSU eru EKKI í
--     staff-töflunni og fá því ekkert út úr RLS-reglum Fjarlækninga.
--   * Engin laun á sjúkling — hér er aðeins skipulag vakta.
--   * Mánaðarplan í skrefum: óskir → samþykkt → vaktaplan → birt.
--
-- Allar töflur eru læstar fyrir vafra (RLS: using false). Allt fer um
-- þjónustulykil í /api/hsu/*, sem sannreynir lotu læknis eða stjórnanda.
--
-- Keyrist einu sinni í SQL-ritli Supabase. Idempotent.
-- ============================================================================

-- ── Stillingar (ein lína) ───────────────────────────────────────────────────
create table if not exists public.hsu_settings (
  id              integer primary key default 1 check (id = 1),
  unit_name       text    not null default 'Heilsugæslan í Vestmannaeyjum',
  -- Vaktamarkaður: þarf yfirlæknir að samþykkja þegar læknir tekur vakt?
  market_requires_approval boolean not null default false,
  updated_at      timestamptz not null default now()
);
insert into public.hsu_settings (id) values (1) on conflict (id) do nothing;

-- ── Vaktategundir ───────────────────────────────────────────────────────────
-- Hver tegund býr til eina vakt á hverjum þeim vikudegi sem hún gildir.
-- rest_days_after: hvíld eftir vaktina. 1 = læknir fær ekki vakt daginn eftir
-- (t.d. eftir sólarhringsbakvakt). Hörð regla í sjálfvirku skiptingunni.
create table if not exists public.hsu_shift_types (
  id              uuid primary key default gen_random_uuid(),
  name            text     not null,
  short           text     not null default '',
  starts          time     not null default '08:00',
  ends            time     not null default '08:00',
  weekdays        smallint[] not null default '{0,1,2,3,4,5,6}',
  -- Gildir líka á almennum frídögum (helgidögum) óháð vikudegi.
  on_holidays     boolean  not null default true,
  rest_days_after integer  not null default 0 check (rest_days_after between 0 and 7),
  color           text     not null default '#1d4f91',
  sort            integer  not null default 0,
  active          boolean  not null default true,
  created_at      timestamptz not null default now()
);

-- Sjálfgefin tegund svo kerfið sé nothæft strax: ein sólarhringsbakvakt á dag.
insert into public.hsu_shift_types (name, short, starts, ends, rest_days_after, sort)
select 'Bakvakt', 'BV', '08:00', '08:00', 0, 0
where not exists (select 1 from public.hsu_shift_types);

-- ── Læknar ──────────────────────────────────────────────────────────────────
create table if not exists public.hsu_doctors (
  id              uuid primary key default gen_random_uuid(),
  name            text    not null,
  email           text    not null,           -- notandanafn, @hsu.is
  phone           text    not null default '',
  title           text    not null default '',
  role            text    not null default 'doctor' check (role in ('doctor','head')),
  color           text    not null default '#1d4f91',
  -- Starfshlutfall í %. Sjálfvirka skiptingin deilir vöktum í hlutfalli við það.
  fte             integer not null default 100 check (fte between 0 and 100),
  active          boolean not null default true,

  password_hash   text,                       -- scrypt$N$r$p$salt$hash
  pin_hash        text,                       -- 4 stafa aðgangskóði, sama snið
  must_change_password boolean not null default false,

  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_at      timestamptz,
  activated_at    timestamptz,

  failed_logins   integer not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,

  -- Leynilykill fyrir .ics-áskrift (Apple/Outlook). Endurnýjanlegur.
  calendar_token  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists hsu_doctors_email_uidx on public.hsu_doctors (lower(email));
create unique index if not exists hsu_doctors_invite_uidx on public.hsu_doctors (invite_token_hash) where invite_token_hash is not null;
create unique index if not exists hsu_doctors_caltoken_uidx on public.hsu_doctors (calendar_token) where calendar_token is not null;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;
drop trigger if exists trg_hsu_doctors_updated_at on public.hsu_doctors;
create trigger trg_hsu_doctors_updated_at before update on public.hsu_doctors for each row execute function public.touch_updated_at();

-- ── Lotur og traust tæki ────────────────────────────────────────────────────
-- Aðeins SHA-256 af lyklunum er geymt; lykillinn sjálfur býr í httpOnly-köku.
create table if not exists public.hsu_sessions (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.hsu_doctors(id) on delete cascade,
  token_hash   text not null unique,
  method       text not null default 'password' check (method in ('password','pin','invite')),
  user_agent   text not null default '',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists hsu_sessions_doctor_idx on public.hsu_sessions (doctor_id);

-- Aðgangskóði (4 stafir) virkar AÐEINS á tæki þar sem læknirinn hefur áður
-- skráð sig inn með lykilorði. Fjórir stafir eru 10.000 möguleikar — það er
-- bara í lagi þegar giskarinn þarf líka tækið og fær fimm tilraunir.
create table if not exists public.hsu_devices (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.hsu_doctors(id) on delete cascade,
  token_hash   text not null unique,
  user_agent   text not null default '',
  pin_failures integer not null default 0,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists hsu_devices_doctor_idx on public.hsu_devices (doctor_id);

-- ── Mánuðir ─────────────────────────────────────────────────────────────────
-- Staða mánaðar stýrir skrefunum í stjórnborðinu:
--   collecting — læknar skrá óskir
--   review     — yfirlæknir fer yfir og samþykkir óskir
--   planning   — vaktaplan í smíðum (læknar sjá það ekki)
--   published  — birt: læknar sjá vaktir, dagatöl samstillast, markaður opinn
create table if not exists public.hsu_months (
  month          text primary key check (month ~ '^\d{4}-\d{2}$'),
  status         text not null default 'collecting' check (status in ('collecting','review','planning','published')),
  prefs_deadline date,
  note           text not null default '',
  opened_at      timestamptz not null default now(),
  published_at   timestamptz,
  updated_at     timestamptz not null default now()
);
drop trigger if exists trg_hsu_months_updated_at on public.hsu_months;
create trigger trg_hsu_months_updated_at before update on public.hsu_months for each row execute function public.touch_updated_at();

-- ── Óskir lækna ─────────────────────────────────────────────────────────────
-- day_marks:     {"2026-10-03": "off" | "want"}   — ákveðnir dagar
-- weekday_marks: {"6": "off" | "want"}            — 0=sun … 6=lau, alla vikuna
-- "off" er hörð regla (fær ekki vakt), "want" er ósk.
create table if not exists public.hsu_preferences (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.hsu_doctors(id) on delete cascade,
  month          text not null check (month ~ '^\d{4}-\d{2}$'),
  day_marks      jsonb not null default '{}'::jsonb,
  weekday_marks  jsonb not null default '{}'::jsonb,
  min_shifts     integer check (min_shifts is null or min_shifts >= 0),
  max_shifts     integer check (max_shifts is null or max_shifts >= 0),
  note           text not null default '',
  status         text not null default 'draft' check (status in ('draft','submitted','approved','changes_requested')),
  submitted_at   timestamptz,
  review_note    text not null default '',
  reviewed_at    timestamptz,
  reviewed_by    text not null default '',
  -- Skráð af öðrum en lækninum sjálfum (yfirlækni/stjórnanda).
  entered_by     text not null default '',
  updated_at     timestamptz not null default now(),
  unique (doctor_id, month)
);
create index if not exists hsu_preferences_month_idx on public.hsu_preferences (month);
drop trigger if exists trg_hsu_preferences_updated_at on public.hsu_preferences;
create trigger trg_hsu_preferences_updated_at before update on public.hsu_preferences for each row execute function public.touch_updated_at();

-- ── Vaktir ──────────────────────────────────────────────────────────────────
create table if not exists public.hsu_shifts (
  id             uuid primary key default gen_random_uuid(),
  shift_date     date not null,
  shift_type_id  uuid references public.hsu_shift_types(id) on delete set null,
  label          text not null default '',   -- afrit af heiti tegundar
  starts         time not null,
  ends           time not null,
  doctor_id      uuid references public.hsu_doctors(id) on delete set null,
  status         text not null default 'assigned' check (status in ('assigned','open','offered')),
  note           text not null default '',
  -- Sýnileg læknum og í dagatölum. Sett þegar mánuður er birtur; vaktaplan í
  -- smíðum er ósýnilegt öllum nema yfirlækni.
  published      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.hsu_shifts add column if not exists published boolean not null default false;
create index if not exists hsu_shifts_date_idx on public.hsu_shifts (shift_date);
create index if not exists hsu_shifts_doctor_idx on public.hsu_shifts (doctor_id);
create unique index if not exists hsu_shifts_slot_uidx on public.hsu_shifts (shift_date, shift_type_id) where shift_type_id is not null;
drop trigger if exists trg_hsu_shifts_updated_at on public.hsu_shifts;
create trigger trg_hsu_shifts_updated_at before update on public.hsu_shifts for each row execute function public.touch_updated_at();

-- ── Vaktamarkaður ───────────────────────────────────────────────────────────
-- to_doctor null = sett á vaktamarkað (allir mega taka); annars beint boð.
-- awaiting_approval: tekin af lækni en bíður samþykkis yfirlæknis.
create table if not exists public.hsu_swaps (
  id           uuid primary key default gen_random_uuid(),
  shift_id     uuid not null references public.hsu_shifts(id) on delete cascade,
  from_doctor  uuid references public.hsu_doctors(id) on delete cascade,
  to_doctor    uuid references public.hsu_doctors(id) on delete set null,
  taken_by     uuid references public.hsu_doctors(id) on delete set null,
  note         text not null default '',
  status       text not null default 'pending' check (status in ('pending','awaiting_approval','accepted','declined','cancelled')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index if not exists hsu_swaps_status_idx on public.hsu_swaps (status);
create index if not exists hsu_swaps_shift_idx on public.hsu_swaps (shift_id);

-- ── Breytingaskrá ───────────────────────────────────────────────────────────
create table if not exists public.hsu_audit (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  actor     text not null default '',
  action    text not null,
  month     text,
  detail    jsonb not null default '{}'::jsonb
);
create index if not exists hsu_audit_at_idx on public.hsu_audit (at desc);

-- ── Google-dagatal (sama hönnun og roster_google_*) ─────────────────────────
create table if not exists public.hsu_google_sync (
  doctor_id     uuid primary key references public.hsu_doctors(id) on delete cascade,
  google_sub    text,
  google_email  text,
  refresh_token text,
  access_token  text,
  access_expires_at timestamptz,
  calendar_id   text,
  enabled       boolean not null default true,
  connected_at  timestamptz,
  last_sync_at  timestamptz,
  last_error    text,
  last_error_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists trg_hsu_google_sync_updated_at on public.hsu_google_sync;
create trigger trg_hsu_google_sync_updated_at before update on public.hsu_google_sync for each row execute function public.touch_updated_at();

create table if not exists public.hsu_google_events (
  doctor_id   uuid not null references public.hsu_doctors(id) on delete cascade,
  shift_id    uuid not null,       -- viljandi án FK, sjá roster_google_events
  shift_date  date not null,
  calendar_id text not null,
  synced_hash text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (doctor_id, shift_id)
);

-- ── RLS: enginn vafri kemst í neitt. Aðeins þjónustulykill. ─────────────────
do $rls$
declare t text;
begin
  foreach t in array array[
    'hsu_settings','hsu_shift_types','hsu_doctors','hsu_sessions','hsu_devices',
    'hsu_months','hsu_preferences','hsu_shifts','hsu_swaps','hsu_audit',
    'hsu_google_sync','hsu_google_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_block_client', t);
    execute format('create policy %I on public.%I for all using (false) with check (false)', t || '_block_client', t);
  end loop;
end
$rls$;

-- ── Takmörkun innskráningartilrauna eftir IP-tölu ───────────────────────────
-- Læsing á reikning stöðvar ekki þann sem prófar eitt lykilorð á marga lækna,
-- né þann sem sendir "gleymt lykilorð" í sífellu. Ein lína á tilraun; gamlar
-- línur eru hreinsaðar jafnóðum í auth.ts.
create table if not exists public.hsu_auth_throttle (
  id   bigserial primary key,
  key  text not null,
  at   timestamptz not null default now()
);
create index if not exists hsu_auth_throttle_key_idx on public.hsu_auth_throttle (key, at desc);
alter table public.hsu_auth_throttle enable row level security;
drop policy if exists hsu_auth_throttle_block_client on public.hsu_auth_throttle;
create policy hsu_auth_throttle_block_client on public.hsu_auth_throttle for all using (false) with check (false);

-- ── Forvakt / bakvakt og beiðnir umfram hámark (2026-09-15) ────────────────
-- kind: forvakt er mönnuð alla daga; bakvakt aðeins af reyndum læknum og
-- aðeins þá daga sem forvaktarlæknirinn þarf bakvakt; other = alltaf mönnuð.
alter table public.hsu_shift_types add column if not exists kind text not null default 'other';
alter table public.hsu_shift_types drop constraint if exists hsu_shift_types_kind_check;
alter table public.hsu_shift_types add constraint hsu_shift_types_kind_check check (kind in ('forvakt','bakvakt','other'));
-- Aldrei á almennum frídögum: FV1/BV1 víkja fyrir FV2/BV2 á frídegi á virkum degi.
alter table public.hsu_shift_types add column if not exists skip_holidays boolean not null default false;

alter table public.hsu_doctors add column if not exists can_bakvakt boolean not null default false;
alter table public.hsu_doctors add column if not exists needs_bakvakt boolean not null default false;

-- Yfirlæknir setti lækni á vakt umfram hámark hans: vaktin er frátekin en
-- ekki staðfest fyrr en læknirinn samþykkir. Fer ekki í dagatal fyrr.
alter table public.hsu_shifts add column if not exists confirm_status text;
alter table public.hsu_shifts drop constraint if exists hsu_shifts_confirm_status_check;
alter table public.hsu_shifts add constraint hsu_shifts_confirm_status_check check (confirm_status is null or confirm_status in ('requested'));
alter table public.hsu_shifts add column if not exists requested_by text not null default '';
alter table public.hsu_shifts add column if not exists requested_at timestamptz;

-- ── Dagvakt og kvöld-/næturvakt (2026-09-16) ────────────────────────────────
-- Hópur á vaktaplani: dagvaktir (t.d. flýtimóttaka) og kvöld-/næturvaktir
-- (forvakt, bakvakt) birtast í sitt hvoru hólfi hvers dags.
alter table public.hsu_shift_types add column if not exists period text not null default 'evening';
alter table public.hsu_shift_types drop constraint if exists hsu_shift_types_period_check;
alter table public.hsu_shift_types add constraint hsu_shift_types_period_check check (period in ('day','evening'));

-- Flýtimóttaka: dagvakt sem er mönnuð alla daga, líka á frídögum.
insert into public.hsu_shift_types (name, short, starts, ends, weekdays, on_holidays, skip_holidays, kind, period, rest_days_after, color, sort)
select 'Flýtimóttaka', 'FM', '08:00', '16:00', '{0,1,2,3,4,5,6}', true, false, 'other', 'day', 0, '#e0a100', 0
where not exists (select 1 from public.hsu_shift_types where short = 'FM' or name ilike 'Flýtimóttaka');

-- ── Dagvaktir aðeins tiltekna vikudaga (2026-09-16) ─────────────────────────
-- Sumir læknar vinna dagvinnu aðeins hluta vikunnar (t.d. mánudaga og
-- þriðjudaga). Þá fá þeir aðeins dagvaktir (flýtimóttöku) þá daga. Tómt fylki
-- = allir dagar. 0 = sunnudagur … 6 = laugardagur. Kvöld- og næturvaktir eru
-- óháðar þessu; þær stýrast af vaktaóskum mánaðarins.
alter table public.hsu_doctors add column if not exists day_weekdays smallint[] not null default '{}';
comment on column public.hsu_doctors.day_weekdays is '0=sun … 6=lau. Tómt = allir dagar. Gildir um dagvaktir (period=day).';
