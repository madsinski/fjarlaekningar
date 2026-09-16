-- ============================================================================
-- Vinnustöð — vinnusvæði hjúkrunarfræðinga og annars starfsfólks samstarfs-
-- stofnana (t.d. HSU) sem vísa sjúklingum á Fjarlækningar.
--
-- Eigin innskráning, eins og í HSU-vaktakerfinu: netfang + lykilorð, 4 stafa
-- aðgangskóði á traustu tæki, engin tveggja þrepa auðkenning. Fólkið hér er
-- EKKI í staff-töflunni og EKKI í auth.users, svo engin RLS-regla Fjarlækninga
-- sem treystir „authenticated“ getur hleypt því inn.
--
-- Allar töflur eru lokaðar vöfrum. Aðgangur eingöngu um þjónustulykil í
-- /api/vinnustod/* og /api/admin/vinnustod/*. Keyrt einu sinni; má keyra aftur.
-- ============================================================================

-- ── Notendur ────────────────────────────────────────────────────────────────
create table if not exists public.gatt_users (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  name                 text not null,
  email                text not null unique,
  workplace            text not null default '',   -- t.d. „HSU Selfossi“
  title                text not null default '',   -- t.d. „Hjúkrunarfræðingur“
  active               boolean not null default true,
  -- Hvernig aðgangurinn varð til: boð frá Fjarlækningum eða nýskráning með
  -- netfangi á leyfðu léni (sjá gatt_settings.allowed_domains).
  source               text not null default 'invite' check (source in ('invite', 'signup')),
  created_by           text not null default '',

  password_hash        text,
  pin_hash             text,
  must_change_password boolean not null default false,
  failed_logins        integer not null default 0,
  locked_until         timestamptz,

  -- Einn virkur hlekkur í senn (boð, staðfesting nýskráningar eða nýtt lykilorð).
  invite_token_hash    text,
  invite_expires_at    timestamptz,
  invited_at           timestamptz,
  activated_at         timestamptz,
  last_login_at        timestamptz
);
create unique index if not exists gatt_users_invite_idx on public.gatt_users (invite_token_hash) where invite_token_hash is not null;

-- ── Lotur og traust tæki ────────────────────────────────────────────────────
create table if not exists public.gatt_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.gatt_users (id) on delete cascade,
  token_hash   text not null unique,
  method       text not null default 'password',
  user_agent   text not null default '',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists gatt_sessions_user_idx on public.gatt_sessions (user_id);

create table if not exists public.gatt_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.gatt_users (id) on delete cascade,
  token_hash   text not null unique,
  user_agent   text not null default '',
  pin_failures integer not null default 0,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists gatt_devices_user_idx on public.gatt_devices (user_id);

-- ── Stillingar ──────────────────────────────────────────────────────────────
create table if not exists public.gatt_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
-- Nýskráning opin netföngum á þessum lénum. Boð frá stjórnanda má senda hvert sem er.
insert into public.gatt_settings (key, value) values ('allowed_domains', '["hsu.is"]'::jsonb)
  on conflict (key) do nothing;
-- Hverjir fá tölvupóst þegar ný spurning berst.
insert into public.gatt_settings (key, value) values ('notify_emails', '["fjarlaekningar@fjarlaekningar.is"]'::jsonb)
  on conflict (key) do nothing;

-- ── Spurningar til Fjarlækninga (tvíhliða) ─────────────────────────────────
create table if not exists public.gatt_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.gatt_users (id) on delete cascade,
  subject         text not null,
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_author     text not null default 'user' check (last_author in ('user', 'staff')),
  -- Ólesið er það sem hin hliðin skrifaði eftir að þessi las síðast.
  user_read_at    timestamptz,
  staff_read_at   timestamptz
);
create index if not exists gatt_threads_user_idx on public.gatt_threads (user_id, last_message_at desc);
create index if not exists gatt_threads_inbox_idx on public.gatt_threads (status, last_message_at desc);

create table if not exists public.gatt_messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references public.gatt_threads (id) on delete cascade,
  author_kind  text not null check (author_kind in ('user', 'staff')),
  author_user  uuid references public.gatt_users (id) on delete set null,
  author_staff uuid references public.staff (id) on delete set null,
  author_name  text not null default '',
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists gatt_messages_thread_idx on public.gatt_messages (thread_id, created_at);

-- ── Tilkynningar frá Fjarlækningum ──────────────────────────────────────────
-- T.d. „Nýtt erindi: augnsýkingar“ eða „Gáttin liggur niðri til kl. 14“.
create table if not exists public.gatt_announcements (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by text not null default '',
  title      text not null,
  body       text not null default '',
  level      text not null default 'info' check (level in ('info', 'warning')),
  active     boolean not null default true,
  expires_at timestamptz
);
create index if not exists gatt_announcements_active_idx on public.gatt_announcements (active, created_at desc);

-- ── SMS: sendandi úr vinnustöðinni ──────────────────────────────────────────
alter table public.sms_messages add column if not exists sent_by_gatt uuid references public.gatt_users (id) on delete set null;
create index if not exists sms_messages_gatt_idx on public.sms_messages (sent_by_gatt, created_at desc);

-- ── Lokað vöfrum ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['gatt_users','gatt_sessions','gatt_devices','gatt_settings','gatt_threads','gatt_messages','gatt_announcements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_none', t);
    execute format('create policy %I on public.%I for all using (false) with check (false)', t || '_none', t);
  end loop;
end $$;
