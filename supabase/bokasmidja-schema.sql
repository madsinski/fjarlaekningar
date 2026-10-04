-- ============================================================================
-- Bókasmiðjan — barnabókagerð fjölskyldunnar (einkamál, ekki hluti af
-- þjónustu Fjarlækninga og ekki opið almenningi).
--
-- Börn skrá sig inn með fjögurra stafa kóða á tæki sem fullorðinn hefur opnað
-- með foreldrakóða. Sögur eru skrifaðar og myndskreyttar af Claude, lesnar
-- upphátt og fluttar út á PDF.
--
-- Allar töflur eru læstar fyrir vafra (RLS: using false). Allt fer um
-- þjónustulykil í /api/bokasmidja/*, sem sannreynir lotu barns eða foreldris.
--
-- Keyrist einu sinni í SQL-ritli Supabase. Idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Börn ────────────────────────────────────────────────────────────────────
create table if not exists public.bk_children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar text not null default 'fox',
  color text not null default '#f97316',
  lang text not null default 'is' check (lang in ('en', 'is', 'nb', 'hu')),
  age int check (age between 2 and 17),
  pin_hash text not null,
  pin_failures int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Traust tæki: opnað einu sinni með foreldrakóða ──────────────────────────
create table if not exists public.bk_devices (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_agent text,
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── Lotur. child_id er null í foreldralotu ──────────────────────────────────
create table if not exists public.bk_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  role text not null check (role in ('kid', 'parent')),
  child_id uuid references public.bk_children(id) on delete cascade,
  user_agent text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists bk_sessions_child_idx on public.bk_sessions (child_id);

-- ── Bækur ───────────────────────────────────────────────────────────────────
-- title/subtitle: { "en": "...", "is": "...", "nb": "...", "hu": "..." }
-- concept: lýsing á hugmynd bókarinnar á ensku, handa höfundinum (Claude).
-- planned_stories: fjöldi sagna sem bókin á að hafa (auð sæti sjást í hillunni).
create table if not exists public.bk_books (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title jsonb not null default '{}'::jsonb,
  subtitle jsonb not null default '{}'::jsonb,
  concept text not null default '',
  color text not null default '#6366f1',
  emoji text not null default '📖',
  planned_stories int not null default 1 check (planned_stories between 1 and 30),
  created_by uuid references public.bk_children(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Sögur ───────────────────────────────────────────────────────────────────
-- idea: { kind: "prompt", text } eða { kind: "wizard", answers: {...}, extra }
-- art: { characters: [{ name, look }], setting, palette } — myndlýsing á ensku
create table if not exists public.bk_stories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.bk_books(id) on delete cascade,
  position int not null default 1,
  status text not null default 'idea' check (status in ('idea', 'written', 'ready')),
  source_lang text not null default 'is' check (source_lang in ('en', 'is', 'nb', 'hu')),
  idea jsonb not null default '{}'::jsonb,
  art jsonb not null default '{}'::jsonb,
  created_by uuid references public.bk_children(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bk_stories_book_idx on public.bk_stories (book_id, position);

-- Titill og samantekt á hverju máli fyrir sig (engin jsonb-samkeppni).
create table if not exists public.bk_story_texts (
  story_id uuid not null references public.bk_stories(id) on delete cascade,
  lang text not null check (lang in ('en', 'is', 'nb', 'hu')),
  title text not null,
  summary text not null default '',
  primary key (story_id, lang)
);

-- ── Síður ───────────────────────────────────────────────────────────────────
-- scene: lýsing á myndinni (á ensku) handa myndskreytinum.
-- svg: hreinsuð SVG-mynd (sjá src/lib/bokasmidja/svg.ts).
create table if not exists public.bk_pages (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.bk_stories(id) on delete cascade,
  position int not null,
  scene text not null default '',
  svg text,
  created_at timestamptz not null default now(),
  unique (story_id, position)
);

create table if not exists public.bk_page_texts (
  page_id uuid not null references public.bk_pages(id) on delete cascade,
  lang text not null check (lang in ('en', 'is', 'nb', 'hu')),
  text text not null,
  primary key (page_id, lang)
);

-- ── Upplestur: mp3 í lokaðri geymslu, lykluð á tætigildi textans ────────────
create table if not exists public.bk_audio (
  page_id uuid not null references public.bk_pages(id) on delete cascade,
  lang text not null check (lang in ('en', 'is', 'nb', 'hu')),
  text_hash text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  primary key (page_id, lang)
);

insert into storage.buckets (id, name, public)
values ('bokasmidja', 'bokasmidja', false)
on conflict (id) do nothing;

-- ── Lokað vöfrum ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['bk_children','bk_devices','bk_sessions','bk_books','bk_stories','bk_story_texts','bk_pages','bk_page_texts','bk_audio']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_none', t);
    execute format('create policy %I on public.%I for all using (false) with check (false)', t || '_none', t);
  end loop;
end $$;

-- ── Fyrsta bókin: sjö sögur sem verða til í smiðjunni ───────────────────────
insert into public.bk_books (slug, title, subtitle, concept, color, emoji, planned_stories)
values (
  'tough-kids',
  '{"en": "Bedtime Stories for Tough Kids", "is": "Kvöldsögur fyrir hörkutól", "nb": "Godnatthistorier for tøffe barn", "hu": "Esti mesék vagány gyerekeknek"}'::jsonb,
  '{"en": "Seven brave tales for the end of the day", "is": "Sjö hugrakkar sögur fyrir svefninn", "nb": "Sju modige fortellinger før natten", "hu": "Hét bátor mese elalvás előtt"}'::jsonb,
  'A collection of seven bedtime stories for kids who think they are too tough for bedtime stories. Each story is a real adventure with courage, humour and something genuinely at stake, starring a tough kid (or creature) who is brave, stubborn and kind underneath. Every story winds down in its last pages to a calm, safe, sleepy ending, because even the toughest heroes need their rest. The seven stories should feel like one book but differ in hero, place and kind of adventure.',
  '#4338ca',
  '🌙',
  7
)
on conflict (slug) do nothing;

-- ── Ritstjórn og teikningar barna (2026-10-04) ──────────────────────────────
-- layout: hvort myndin eða textinn kemur á undan á síðunni.
-- auto_art: má smiðjan mála síðuna sjálfkrafa ef mynd vantar? Slökkt á síðum
--   sem barnið bætti við eða færði myndina af, svo ekkert sé málað óumbeðið.
-- drawing_path: upprunaleg teikning barnsins í lokuðu geymslunni.
alter table public.bk_pages add column if not exists layout text not null default 'art-first';
alter table public.bk_pages add column if not exists auto_art boolean not null default true;
alter table public.bk_pages add column if not exists drawing_path text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bk_pages_layout_check') then
    alter table public.bk_pages add constraint bk_pages_layout_check check (layout in ('art-first', 'text-first'));
  end if;
end $$;
-- Síðum er endurraðað í ritlinum; röðin þarf því ekki að vera einkvæm á miðri leið.
alter table public.bk_pages drop constraint if exists bk_pages_story_id_position_key;
create index if not exists bk_pages_story_idx on public.bk_pages (story_id, position);

-- ── Bók búin til fyrst, nafnið valið strax eða síðar (2026-10-04) ───────────
-- title_auto: bókin fékk ekki nafn við stofnun; hún tekur nafn fyrstu sögunnar
--   (á öllum málum) þar til einhver gefur henni nafn sjálfur.
alter table public.bk_books add column if not exists title_auto boolean not null default false;
-- Bækur sem urðu til utan um eina sögu áður en þetta kom fylgja áfram sögunni.
update public.bk_books set title_auto = true where slug is null and created_at < '2026-10-05' and title_auto = false and planned_stories = 1;

-- ── Yfirlestur íslensku (2026-10-04) ────────────────────────────────────────
-- polished_at: hvenær íslenski textinn fór síðast í gegnum yfirlestur
--   (GreynirCorrect + ritstjórn með netleit í barnaefni). Aðeins notað á 'is'.
alter table public.bk_story_texts add column if not exists polished_at timestamptz;

-- ── Bókarkápur (2026-10-04) ─────────────────────────────────────────────────
-- cover_svg: kápumynd teiknuð af myndskreytinum (úr efni bókarinnar eða
--   teikningu barns). cover_image_path: tilbúin kápa sem hlaðið var upp, í
--   lokuðu geymslunni. Sé hvorugt til sýnir hillan lit og tákn bókarinnar.
alter table public.bk_books add column if not exists cover_svg text;
alter table public.bk_books add column if not exists cover_image_path text;

-- ── Stutt, miðlungs og löng útgáfa sögu (2026-10-04) ────────────────────────
-- Útgáfurnar eru hreiðraðar: löng inniheldur allar síður miðlungs, miðlungs
-- allar síður stuttrar. level á síðu segir í hvaða útgáfu hún birtist fyrst
-- (1 = stutt, 2 = miðlungs, 3 = löng). Texti síðu getur verið ólíkur eftir
-- útgáfu: bk_page_texts.length; vanti texta á lengd er notaður sá næsti fyrir
-- neðan. bk_stories.lengths = hæsta útgáfa sem sagan á (1 eða 3).
-- art_key: heiti myndar í handgerðu sögunum (p01, n03 …), svo innflutningur
-- finni síðuna aftur þótt röð breytist.
alter table public.bk_pages add column if not exists level smallint not null default 1;
alter table public.bk_pages add column if not exists art_key text;
alter table public.bk_stories add column if not exists lengths smallint not null default 1;
alter table public.bk_page_texts add column if not exists length smallint not null default 1;
alter table public.bk_audio add column if not exists length smallint not null default 1;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bk_pages_level_check') then
    alter table public.bk_pages add constraint bk_pages_level_check check (level between 1 and 3);
  end if;
  -- Aðallyklarnir fá lengdina með.
  if (select count(*) from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = 'public.bk_page_texts'::regclass and i.indisprimary) < 3 then
    alter table public.bk_page_texts drop constraint bk_page_texts_pkey;
    alter table public.bk_page_texts add primary key (page_id, lang, length);
  end if;
  if (select count(*) from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = 'public.bk_audio'::regclass and i.indisprimary) < 3 then
    alter table public.bk_audio drop constraint bk_audio_pkey;
    alter table public.bk_audio add primary key (page_id, lang, length);
  end if;
end $$;
