-- ============================================================================
-- Google-dagatal: bein samstilling vakta inn í dagatal hvers læknis.
--
-- Áskrift að .ics-slóð er PULL: dagatalið sækir þegar því hentar og Google
-- sækir á nokkurra klukkustunda fresti. Þessi leið er PUSH: um leið og vakt
-- breytist skrifum við hana beint inn í dagatalið gegnum Calendar API.
--
-- Heimildin sem beðið er um er calendar.app.created — hún leyfir EINGÖNGU að
-- búa til nýtt dagatal og sýsla með atburði á því. Við komumst hvorki í
-- einkadagatal læknisins né nokkurt annað dagatal sem hann hefur aðgang að.
-- Þess vegna er búið til sérstakt dagatal ("Fjarlækningar — vaktir") sem
-- læknirinn getur falið, litað eða eytt án þess að snerta neitt annað.
--
-- Taflan geymir refresh_token, sem er lykill að aðgangi. Hún er API-miðluð:
-- vafrinn kemst aldrei í hana, allt fer um þjónustulykil. Sama regla og
-- staff_billing fylgir.
-- ============================================================================

create table if not exists public.roster_google_sync (
  doctor_id     uuid primary key references public.roster_doctors(id) on delete cascade,

  -- Hvaða Google-reikningur var tengdur. sub er varanlegt auðkenni, netfang
  -- getur breyst — geymum bæði, sýnum netfangið.
  google_sub    text,
  google_email  text,

  -- Langlífi lykillinn. Google sendir hann EINU SINNI, við fyrstu samþykkt;
  -- þess vegna má aldrei skrifa null yfir hann í uppfærslu.
  refresh_token text,
  access_token  text,
  access_expires_at timestamptz,

  -- Dagatalið sem VIÐ bjuggum til. Án þess kemst forritið hvergi.
  calendar_id   text,

  -- Læknirinn getur slökkt á samstillingu án þess að aftengja reikninginn.
  enabled       boolean not null default true,

  connected_at  timestamptz,
  last_sync_at  timestamptz,
  -- Síðasta villa, á mannamáli. Sýnd lækninum svo hann sjái sjálfur að tengingin
  -- sé dottin út (t.d. ef aðgangur er afturkallaður hjá Google) í stað þess að
  -- halda að vaktirnar berist meðan ekkert gerist.
  last_error    text,
  last_error_at timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists roster_google_sync_enabled_idx
  on public.roster_google_sync (enabled) where refresh_token is not null;

drop trigger if exists trg_roster_google_sync_updated_at on public.roster_google_sync;
create trigger trg_roster_google_sync_updated_at
  before update on public.roster_google_sync
  for each row execute function public.touch_updated_at();

-- Enginn vafri, hvorki starfsmaður né gestur. Aðeins þjónustulykill.
alter table public.roster_google_sync enable row level security;
drop policy if exists roster_google_sync_block_client on public.roster_google_sync;
create policy roster_google_sync_block_client on public.roster_google_sync
  for all using (false) with check (false);

-- Hvaða vaktir við höfum þegar skrifað í dagatal hvers læknis.
--
-- Auðkenni atburðarins er EKKI geymt hér: það er leitt af auðkenni vaktarinnar
-- (uuid án bandstrika er gilt Google-atburðarauðkenni). Þar með er skrifin
-- sjálfgefið hugröng — sama vakt skrifuð tvisvar verður einn atburður, aldrei
-- tveir, og endurtekin tilraun eftir villu býr ekki til afrit.
--
-- shift_id vísar VILJANDI ekki í roster_shifts: félli lína héðan sjálfkrafa með
-- eyddri vakt vissum við ekki lengur að atburð þyrfti að fjarlægja úr dagatali
-- læknisins, og hann sæti þar eftir að eilífu. Línan lifir vaktina af og er
-- hreinsuð þegar samstillingin sér að vaktin er horfin.
create table if not exists public.roster_google_events (
  doctor_id   uuid not null references public.roster_doctors(id) on delete cascade,
  shift_id    uuid not null,
  -- Afritað hingað svo hreinsun geti unnið á sama tímaglugga og samstillingin.
  -- Án þess vissum við ekki hvort ósamstillt lína tilheyri gamalli vakt utan
  -- gluggans (látum í friði) eða vakt sem var eytt (á að hverfa úr dagatalinu).
  shift_date  date not null,
  calendar_id text not null,
  -- Það sem stóð í atburðinum síðast. Sé vaktin óbreytt sleppum við kallinu.
  synced_hash text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (doctor_id, shift_id)
);

create index if not exists roster_google_events_shift_idx
  on public.roster_google_events (shift_id);

alter table public.roster_google_events enable row level security;
drop policy if exists roster_google_events_block_client on public.roster_google_events;
create policy roster_google_events_block_client on public.roster_google_events
  for all using (false) with check (false);
