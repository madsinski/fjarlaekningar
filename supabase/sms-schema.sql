-- SMS-sendingar: hlekkur á þjónustuna sendur sjúklingi í samtali.
--
-- Skeytin eru send af starfsmanni til eins sjúklings í einu. Símanúmer er
-- persónuupplýsing, svo hver sending er skráð: hver sendi, hvenær, á hvaða
-- númer og hvað varð um skeytið. Taflan er lokuð vöfrum — aðgangur eingöngu um
-- þjónustulykil í /api/admin/sms/*.

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Hver sendi. staff_id er null hafi sendandinn verið HSU-læknir.
  sent_by_staff uuid references public.staff (id) on delete set null,
  sent_by_name text not null default '',

  -- Viðtakandi og innihald.
  to_number text not null,                 -- alltaf E.164, t.d. +3545551234
  sender_id text not null default '',      -- nafnasendandi, t.d. Fjarlaeknir
  body text not null,
  template text not null default '',       -- hvaða sniðmát var notað
  segments integer not null default 1,
  encoding text not null default 'GSM-7',

  -- Svar Twilio.
  provider text not null default 'twilio',
  provider_sid text not null default '',   -- SM…
  status text not null default 'queued',   -- queued|sent|delivered|undelivered|failed|dry-run
  error_code integer,                      -- 30007 = síað af símafyrirtæki
  error_text text not null default '',
  delivered_at timestamptz,
  updated_at timestamptz not null default now(),

  note text not null default ''
);

create index if not exists sms_messages_created_idx on public.sms_messages (created_at desc);
create index if not exists sms_messages_sid_idx on public.sms_messages (provider_sid) where provider_sid <> '';
create index if not exists sms_messages_staff_idx on public.sms_messages (sent_by_staff, created_at desc);

-- Lokað: engin vafraleið að töflunni, hvorki lestur né skrif.
alter table public.sms_messages enable row level security;
drop policy if exists sms_messages_none on public.sms_messages;
create policy sms_messages_none on public.sms_messages for all using (false) with check (false);
