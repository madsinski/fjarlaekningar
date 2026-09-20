-- ============================================================================
-- Fjarlækningar — Árangursmælingar (service performance, month by month)
--
-- Ein röð á hverja stöð á hverjum mánuði. Tölurnar koma úr þremur áttum og
-- dálkarnir eru flokkaðir eftir því hvaðan þær koma, því það ræður því hver
-- slær þær inn og hvenær þær liggja fyrir:
--
--   1. Medalia        — teljarinn. Okkar eigin erindi, útflutt mánaðarlega.
--   2. Samskiptaskrá  — nefnarinn. Samskipti stöðvarinnar í SÖMU greiningar-
--      HSU              kóðum. Kemur frá stofnuninni, ekki frá okkur, og það
--                       er einmitt þess vegna sem talan er trúverðug.
--   3. Könnun + frávik — röddin og öryggisgólfið.
--
-- Nefnarinn er lykillinn: án hans eru allar okkar tölur sjálfvísandi („við
-- afgreiddum 400 erindi“ segir engum neitt). Með honum getum við sagt hvaða
-- hlutdeild við tökum af raunverulegu erindaflæði stöðvarinnar.
--
-- Allar tölur eru samantekt á þjónustustigi — engar persónuupplýsingar, ekkert
-- sem rekja má til einstaklings. Það er meðvitað og það er þess vegna sem þessi
-- tafla fellur undir gæðaeftirlit en ekki vísindarannsókn.
--
-- Keyrist einu sinni í Supabase SQL editor. Idempotent. Krefst Phase-1 hjálpara
-- public.is_active_staff() og public.touch_updated_at().
-- ============================================================================

create table if not exists public.arangur_manudir (
  id           uuid primary key default gen_random_uuid(),

  -- ── Hvaða stöð, hvaða mánuður ──────────────────────────────────────────
  -- institution er stutta heitið ("hsu"), station er stöðin eins og
  -- stofnunin skrifar hana ("Vestmannaeyjar"). month er alltaf 1. dagur.
  institution  text not null default 'hsu',
  station      text not null,
  month        date not null,

  -- ── 1. Úr Medalia ──────────────────────────────────────────────────────
  -- A. VIRKNI — leysast erindin?
  erindi_alls      integer not null default 0,  -- erindi sem bárust
  erindi_leyst     integer not null default 0,  -- kláruðust alfarið í fjarþjónustu
  erindi_visad     integer not null default 0,  -- læknir vísaði áfram (alls)
  erindi_endurtekin integer not null default 0, -- sami sjúklingur, sama erindi, aftur

  -- Hvert var vísað. Tilvísun er ekki bilun — en HVERT skiptir öllu máli.
  visad_heilsugaesla integer not null default 0,
  visad_serfraedi    integer not null default 0,
  visad_annad        integer not null default 0,
  -- Sér: vísað á bráðamóttöku eða hringt í 112 EFTIR að sjúklingur komst í
  -- gegnum spurningalistann. Þetta er ekki venjuleg tilvísun heldur næstum-
  -- atvik síunarinnar, og skarpasti öryggismælikvarðinn sem við eigum sjálf.
  visad_brad         integer not null default 0,

  -- Erindi utan væntanlegs kóðasetts — fyrsta merki um að umfangið sé að reka.
  kodar_utan_setts integer not null default 0,

  -- B. ÖRYGGI
  listi_stodvadur  integer not null default 0,  -- spurningalisti stöðvaði (rautt flagg)
  -- Sundurliðun stöðvana: [{ "flagg": "…", "fjoldi": n }]
  stodvun_flokkar  jsonb not null default '[]'::jsonb,
  lyfsedlar    integer not null default 0,      -- erindi með lyfseðli
  syklalyf     integer not null default 0,      -- þar af sýklalyf

  -- D. UPPLIFUN — okkar hlið: loforðið
  svartimi_midgildi_min integer,                -- miðgildi svartíma, mínútur
  svartimi_p95_min      integer,                -- 95. hlutfallsmark

  -- Sundurliðun eftir erindi: { "<slug>": { "alls": n, "leyst": n, "visad": n } }
  -- Lykillinn er slug úr src/erindi.ts, svo taflan fylgir erindalistanum sjálf.
  erindi_sundurlidun jsonb not null default '{}'::jsonb,

  -- C. ÁLAGSLÉTTING — aðkomuleiðir.
  -- Sjúklingur sem kemur BEINT kostar stöðina núll mínútur. Þetta er því ekki
  -- markaðstala heldur álagsmælikvarði, og vaxandi hlutfall beinna koma er
  -- sagan sjálf: þjónustan verður sjálfstæð og léttir æ meira á.
  adkoma_beint       integer not null default 0,
  adkoma_hjukrunarfr integer not null default 0,
  adkoma_mottaka     integer not null default 0,
  adkoma_gagnafr     integer not null default 0,
  adkoma_annad       integer not null default 0,

  -- „Almenn læknisþjónusta“ sérstaklega: ruslakistan er þar sem næstu erindi
  -- fela sig. Hlutfallið sem leysist EKKI er vegvísirinn að erindi 12, 13, 14.
  almenn_alls   integer not null default 0,
  almenn_leyst  integer not null default 0,
  -- Flokkun á þeim sem leystust ekki: [{ "flokkur": "…", "fjoldi": n }]
  almenn_oleyst_flokkar jsonb not null default '[]'::jsonb,

  -- ── 2. Frá stofnuninni ─────────────────────────────────────────────────
  -- Samskipti stöðvarinnar í sömu greiningarkóðum og erindin okkar ná yfir,
  -- sama mánuð. Þetta er nefnarinn og hann kemur FRÁ STOFNUNINNI — þeirra
  -- gögn, í þeirra kerfi, samræmd á landsvísu. Enginn efast um samskiptaskrá.
  samskipti_kodar   integer,
  -- Endurkomur innan 7 daga eftir fjarþjónustuerindi. Stofnunin keyrir
  -- fyrirspurnina sín megin og afhendir bara töluna — þá fer engin
  -- persónugreinanleg samkeyrsla fram og þetta helst gæðaeftirlit.
  endurkomur_7d     integer,
  -- Rekstrarlínan sem við erum í raun að keppa við.
  afleysingakostn_isk bigint,
  simtol_stofnun      integer,
  -- Hlutfall daga þar sem þjónustan var mönnuð allan opnunartíma.
  monnun_hlutfall     integer,

  -- ── 3. Könnun, starfsfólk og öryggi ────────────────────────────────────
  konnun_svor          integer not null default 0,  -- fjöldi svara
  konnun_send          integer not null default 0,  -- sendar kannanir (svarhlutfall)
  konnun_einfalt       integer,                     -- % sem sagði ferlið einfalt
  konnun_aftur         integer,                     -- % sem myndi nota aftur
  konnun_annars_hvergi integer,                     -- % sem hefði annars sleppt því að leita
  -- Heildartími sem sjúklingur upplifir: frá fyrstu tilraun til úrlausnar.
  -- Miklu stærri tala en okkar svartími og þar liggur raunverulegi ávinningurinn.
  heildartimi_midgildi_klst integer,
  ferdir_felldar       integer,                     -- ferðir sem féllu niður

  -- Starfsfólk stofnunarinnar. Hjúkrunarfræðingar og læknar SITT HVOR:
  -- læknar ráða meiru um framhaldið en virðist, því læknir á næstu stofnun
  -- spyr ekki stjórnendur hvernig gekk — hann spyr lækni á staðnum.
  starfsm_hjukr_jakvaett integer,                   -- % jákvæð af hjúkrunarfr.
  starfsm_laeknar_jakvaett integer,                 -- % jákvæð af læknum

  frvik           integer not null default 0,       -- skráð frávik
  frvik_naermiss  integer not null default 0,       -- þar af næstum-atvik
  alvarleg_atvik  integer not null default 0,       -- alvarleg atvik

  -- ── 4. Yfirfæranleiki — úr okkar eigin kerfum ──────────────────────────
  laeknar_virkir      integer not null default 0,   -- læknar sem tóku vaktir
  laeknar_haettu      integer not null default 0,   -- hættu í mánuðinum
  studningsspurningar integer not null default 0,   -- frá stöðinni til okkar
  uppitimi_hlutfall   integer,                      -- % opnunartíma án truflana

  -- ── Skráning ───────────────────────────────────────────────────────────
  note            text not null default '',
  -- Hvaða heimildir eru komnar inn: medalia | samskiptaskra | konnun
  heimildir       jsonb not null default '[]'::jsonb,
  entered_by      uuid references public.staff(id) on delete set null,
  entered_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Ein röð á stöð á mánuði. Innsláttur er upsert á þennan lykil.
create unique index if not exists arangur_manudir_uidx
  on public.arangur_manudir (institution, station, month);
create index if not exists arangur_manudir_month_idx
  on public.arangur_manudir (month desc);

alter table public.arangur_manudir enable row level security;

-- Starfsfólk les; öll skrif fara um þjónustulykil í /api/admin/arangur.
drop policy if exists arangur_manudir_staff_read on public.arangur_manudir;
create policy arangur_manudir_staff_read on public.arangur_manudir
  for select to authenticated using (public.is_active_staff());

drop policy if exists arangur_manudir_block_writes on public.arangur_manudir;
create policy arangur_manudir_block_writes on public.arangur_manudir
  for all using (false) with check (false);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $fn$ begin new.updated_at = now(); return new; end $fn$;
drop trigger if exists trg_arangur_manudir_updated_at on public.arangur_manudir;
create trigger trg_arangur_manudir_updated_at
  before update on public.arangur_manudir
  for each row execute function public.touch_updated_at();

-- ── Forsendur mælikvarða ────────────────────────────────────────────────────
-- „Frigjörð vinna“ er AFLEIDD tala: leyst erindi × mínútur á erindi. Forsendan
-- er því hluti af fullyrðingunni og verður að vera sýnileg, stillanleg og
-- skjalfest — ekki grafin í kóða. Hún er líka það fyrsta sem verður dregið í
-- efa, svo hún á að vera auðvelt að verja.
insert into public.site_settings (key, value)
values ('arangur_forsendur', '{"min_a_erindi": 20, "min_kostnadur_a_erindi": 0, "klst_i_laeknisdegi": 7, "svartimi_markmid_min": 120, "timamaeling_gerd": false}'::jsonb)
on conflict (key) do nothing;
