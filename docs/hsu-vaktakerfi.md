# HSU vaktakerfi — Heilsugæslan í Vestmannaeyjum

Vaktakerfi lækna HSU, hýst á fjarlaekningar.is en án vörumerkis Fjarlækninga.

| Slóð | Fyrir hvern |
|---|---|
| **`fjarlaekningar.is/hsu`** | Innskráning (lykilorð eða 4 stafa kóði) |
| `/hsu/min-sida` | Mín síða læknis: yfirlit, mínar vaktir, óskir, vaktamarkaður, vaktaplan og stillingar (dagatal + aðgangur) |
| `/hsu/stjorn` | Vaktaskipulag: yfirlæknir HSU, eða stjórnandi Fjarlækninga (hnappur „HSU vaktakerfi“ í stjórnborðinu) |
| `/hsu/virkja/<hlekkur>` | Virkjun aðgangs / nýtt lykilorð |

Gagnagrunnur: `supabase/hsu-schema.sql` (keyrt 2026-09-15). Allar `hsu_*` töflur eru
lokaðar vöfrum; allt fer um `/api/hsu/*`.

## Aðgangur

- **Notandanafn = @hsu.is netfang.** Nóg að skrifa fyrri hlutann („jon.jonsson“).
  Önnur lén aðeins ef `HSU_EXTRA_EMAIL_DOMAINS` leyfir (t.d. til prófana).
- **Lykilorð** (minnst 10 stafir, bókstafir + tölustafir), scrypt.
  8 rangar tilraunir → 15 mín lás.
- **Aðgangskóði (4 stafir)** virkar aðeins á tæki þar sem læknirinn hefur áður skráð
  sig inn með lykilorði (httpOnly-kaka, 90 dagar). 5 röng gisk → tækið missir traust.
- **Engin tvíþátta auðkenning** fyrir lækna HSU. Stjórnandi Fjarlækninga kemst inn
  með sinni starfsmannalotu og aðeins ef hún hefur staðist MFA (aal2).
- Lota: 12 klst. Læknar HSU eru **ekki** í `staff`/`auth.users` og fá ekkert úr
  RLS-reglum Fjarlækninga.

### Nýr læknir

Yfirlæknir eða stjórnandi → Vaktaskipulag → **Læknar → Bæta við lækni**:

1. **Senda boð** — læknir fær tölvupóst, velur lykilorð og kóða. Hlekkur gildir 14 daga.
2. **Fylla út sjálf(ur)** — velur upphafslykilorð; læknir skiptir um það við fyrstu innskráningu.

Póstur fer frá `HSU vaktakerfi <vaktir@fjarlaekningar.is>` (Resend; breytanlegt með
`HSU_FROM_EMAIL`). Yfirlæknir er læknir með hlutverkið *Yfirlæknir*.

## Mánaðarplan í fjórum skrefum

1. **Óskir lækna** — opna mánuð (skilafrestur, skilaboð, tölvupóstur). Læknar mála
   dagatal: *Get ekki* (hörð regla) / *Vil gjarnan* (ósk), vikudagareglur, lágmark/hámark,
   athugasemd, og „nota líka fyrir næsta mánuð“. Yfirlæknir getur skráð fyrir hönd læknis.
2. **Samþykkja óskir** — samþykkja, biðja um breytingar (læknir fær póst), breyta.
3. **Vaktaplan** — sjálfvirk skipting (`src/lib/hsu/plan.ts`): í hlutfalli við
   starfshlutfall innan lágmarks/hámarks, *get ekki* og hvíld eftir vakt aldrei brotin,
   helgar og almennir frídagar jafnt dreifðir, óskadagar virtir þegar hægt er.
   Síðan lagfært með því að **draga lækna á vaktir / vaktir hver ofan á aðra**
   (skipti), smella á lækni og svo vaktir (snertiskjár), eða smella á vakt og velja.
   Árekstrar merktir; afturkalla.
4. **Birta** — planið birtist á síðum lækna og í dagatölum. Eftir birtingu fara
   breytingar strax út og læknarnir sem þær snerta fá tölvupóst.

Vaktategundir (sjálfgefið: *Bakvakt 08–08 alla daga*) og hvort yfirlæknir samþykki
vaktaskipti eru undir **Stillingar**.

## Dagvakt, forvakt og bakvakt

| Tegund | Hólf | Dagar | Mönnun |
|---|---|---|---|
| **FM** flýtimóttaka (08–16) | Dagvakt | alla daga, líka frídaga | alltaf |
| **FV1** forvakt | Kvöld/nótt | virkir dagar, aldrei á frídögum | alltaf |
| **FV2** forvakt | Kvöld/nótt | helgar og almennir frídagar | alltaf |
| **BV1** bakvakt | Kvöld/nótt | virkir dagar, aldrei á frídögum | aðeins þegar forvaktarlæknir þarf bakvakt |
| **BV2** bakvakt | Kvöld/nótt | helgar og almennir frídagar | aðeins þegar forvaktarlæknir þarf bakvakt |

Hver dagur á vaktaplani skiptist í hólfin **Dagur** og **Kvöld/nótt**. Tegund
(*Forvakt / Bakvakt / Almenn vakt*), hólf og frídagaregla eru stilltar á hverri vaktategund
undir **Stillingar**. Á hverjum lækni undir **Læknar**:

- **Bakvaktarréttindi** — reyndur læknir; aðeins þeir fá bakvakt (geta líka tekið forvakt).
  Óreyndur læknir er stöðvaður bæði í viðmóti og á þjóni, líka á vaktamarkaði.
- **Þarf bakvakt á forvakt** — þá daga sem hann er á forvakt verður reyndur læknir á bakvakt.

Tóm bakvakt sem enginn þarf er ekki gat í planinu og sést ekki á síðu lækna.

### Fleiri en einn á vakt og skipting um hádegi

Á hverri vaktategund undir **Stillingar**:

- **Læknar á vakt (1–6)** — hve margir eru samtímis á vaktinni. Tveir á
  flýtimóttöku gefa tvær FM-vaktir hvern dag.
- **Skipta um hádegi** — vaktinni er skipt í tvennt á völdum tíma (sjálfgefið
  12:00). Þá verða til *FM f.h.* (08–12) og *FM e.h.* (12–16) og einn læknir
  getur tekið fyrri hlutann og annar þann síðari — eða sami læknir báða.

Breytingar á vaktategund skila sér í mánuð sem þegar hefur verið raðað með
hnappinum **Uppfæra vaktir** á vaktaplaninu (eða þegar „Fylla í tómar“ /
„Búa til vaktaplan“ er keyrt). Tómar vaktir sem passa ekki lengur eru þá
fjarlægðar og nýjar búnar til — líka í birtum mánuði. Vakt sem læknir er á er
aldrei snert, og ný hálf vakt er ekki búin til ofan á heila vakt sem læknir er
þegar á.

Reglan um vaktir sama dag miðast við **tíma, ekki hólf**: læknir má taka fyrir
og eftir hádegi, og dagvakt og svo kvöldvakt, en aldrei tvær vaktir sem skarast.
Forvakt og bakvakt sama dag eru því áfram tveir ólíkir læknar.

### Hálfur dagur: ósk læknis um f.h. eða e.h.

Óskirnar eru í fimm skrefum: 1 mánuður · 2 **kvöld- og næturvaktir** (dagatal
með Get ekki / Vil vinna / Laus, og vikudagsreglur efst) · 3 **flýtimóttaka** ·
4 fjöldi og athugasemd · 5 senda. „Get ekki“ í skrefi 2 gildir um allar vaktir
dagsins.

Í skrefi 3 velur læknirinn föstu vikudagana sína á flýtimóttöku og hvort hann
vinnur **allan daginn, fyrir hádegi eða eftir hádegi**. Undir því er dagatal
virkra daga: smellt á dag fer **Allan → f.h. → e.h. → Ekki → eftir reglu**. Dagur
sem er valinn sérstaklega gildir líka utan föstu vikudaganna, og „Ekki“ tekur
daginn út þótt vikudagurinn gildi (`hsu_preferences.day_part_marks`, gildin
`all`/`am`/`pm`/`none`; `worksDayShiftOn` í `src/lib/hsu/plan.ts`). Dagar merktir
„Get ekki“ í skrefi 2 eru læstir í dagatalinu.

Þetta stýrir þrennu:

1. **Skiptingin virðir óskina skilyrðislaust.** Læknir sem vill hálfan dag fær
   aldrei heila dagvakt.
2. **Vaktir skiptast sjálfkrafa.** Þegar plan er búið til er ein tóm
   FM-vakt tekin í tvennt fyrir hvern lækni dagsins sem vill hálfan dag, svo til
   sé vakt sem passar honum. Hinn helmingurinn stendur opinn og læknir sem
   vinnur allan daginn getur tekið hann. Hætti læknirinn við óskina renna tómir
   helmingar aftur saman í heila vakt við næstu keyrslu á **Uppfæra vaktir**.
   Vakt sem læknir er á er aldrei snert.
3. **Yfirlæknir má samt setja hann á heila vakt** — hún verður þá beiðni sem
   læknirinn samþykkir, eins og vakt umfram hámark.

Í vaktaglugganum (smellt á vakt) sést óskin við hvern lækni. Sé smellt á lækni
sem vill hálfan dag þegar vaktin er heil er vaktinni **skipt sjálfkrafa** og
hann settur á sinn helming; glugginn segir „Skiptir vaktinni um hádegi“.

### Kvöldvaktir aðeins tiltekna vikudaga

Sérstakt skref fyrir kvöldvikudaga var fellt út (2026-09-18): það endurtók
vikudagsreglurnar efst í skrefi 2. Eldri gildi í `evening_weekdays` eru enn virt
af skiptingunni, en viðmótið skrifar ekki ný.

Sjálfvirka skiptingin virðir þetta skilyrðislaust; þurfi yfirlæknir lækninn á
kvöldvakt annan vikudag verður vaktin beiðni sem læknirinn samþykkir.

### Dagvinnudagar læknis

Sumir læknar vinna dagvinnu aðeins hluta vikunnar (t.d. mánudaga og þriðjudaga).
Það er skráð á lækninn: **Læknar → Dagvaktir (flýtimóttaka)**, eða af lækninum
sjálfum undir **Óskir → Dagvinnudagar**. Skiptingin setur hann þá aðeins á
dagvaktir þá vikudaga; kvöld- og næturvaktir eru óháðar þessu.

Þurfi yfirlæknir hann á dagvakt annan vikudag verður vaktin **beiðni** sem
læknirinn samþykkir eða hafnar. Sama gildir um vakt á degi sem hann merkti
„get ekki“, og um vakt umfram hámarkið sem hann skráði: sjálfvirka skiptingin
snertir þá daga aldrei, en yfirlæknir má biðja um þá. Breyti læknir
dagvinnudögum sínum fá yfirlæknar tölvupóst.

### Ein dagvakt og ein kvöldvakt á dag

Sami læknir má taka **dagvakt og kvöld-/næturvakt sama dag** (flýtimóttaka og svo
forvakt) — það er forsenda mönnunar. Tvær vaktir í sama hólfi sama dag eru hins vegar
útilokaðar, svo forvakt og bakvakt sama dag eru alltaf tveir ólíkir læknar. Reglan
gildir alls staðar: í sjálfvirku skiptingunni, í árekstramerkingum og á vaktamarkaði.

Athugið að um helgar og frídaga skarast FM (08–16) og FV2 (08–08) í tíma. Kerfið
leyfir sama lækni báðar, enda er það val yfirlæknis; sé það ekki ætlunin má fella
FM niður á þeim dögum (taka helgar af vikudögum tegundarinnar) eða breyta tímunum.

## Vaktaplanið: hvernig dagurinn er settur upp

Hver dagur í mánaðarplaninu sýnir **eina röð á hverja vaktategund** (FM, FV1,
BV1 …) og læknana hlið við hlið í röðinni. Dagurinn lengist því ekki þótt fleiri
læknar séu á flýtimóttöku eða vakt sé skipt um hádegi — hann þéttist til hliðar.

- Séu fleiri en einn í röðinni sýnir spjaldið **upphafsstafi** og lit læknisins;
  fullt nafn er í smáglugganum þegar bendillinn stöðvast á spjaldinu.
- **f** og **e** framan við stafina merkja fyrri og síðari hluta dags.
- Þunn brotalína skilur að dagvaktir (efri hluti) og kvöld-/næturvaktir (neðri).
- **+** er laus vakt sem vantar lækni á.

Þrjár leiðir til að setja lækni á vakt:

1. **Draga lækni úr listanum á vakt.** Nýtt: læknir sem er dreginn á **daginn
   sjálfan** (ekki á tiltekna vakt) fer á fyrstu lausu vaktina þann dag —
   dagvakt fyrst. Sé engin laus opnast gluggi til að bæta við vakt með lækninn
   þegar valinn.
2. **Smella á lækni og svo á vaktir** — hentar snertiskjá.
3. **Smella á vakt** og velja lækni af lista sem raðar eftir því hver á helst að
   fá hana.

Vakt má líka draga ofan á aðra vakt: læknarnir skipta þá á dögum.

## Innleiðing: yfirlæknir og nýir læknar

**Yfirlæknir skráður.** Undir *Læknar* → Bæta við lækni → hlutverk *Yfirlæknir*
(og tungumál). Boðspósturinn er skrifaður fyrir hlutverkið: hvað yfirlæknir gerir,
fyrstu skrefin og tengiliður Fjarlækninga (`gatt_settings.emergency_contact`).
Eftir virkjun lendir hann á `/hsu/stjorn`.

**Læknir gerður að yfirlækni.** Hlutverki breytt í *Yfirlæknir*: læknir með virkan
aðgang fær tölvupóst og tilkynningu á „Mínar vaktir“; læknir sem hefur ekki virkjað
fær nýtt boð með texta yfirlæknis. Kynning og leiðarvísir yfirlæknis núllstillast.

**Kynning á kerfinu (walkthrough).** Í fyrsta sinn sem notandi opnar kerfið eftir
virkjun (og eftir að hafa skipt um lykilorð ef þess var krafist) fer sjálfkrafa af
stað kynning sem lýsir upp hvern hluta og skiptir um flipa:
læknar á `/hsu/min-sida` (10 skref), yfirlæknir á `/hsu/stjorn` (9 skref). Hún
opnast aftur úr valmyndinni undir nafninu („Kynning á kerfinu“). Íhlutur:
`src/app/hsu/_components/Tour.tsx`; mörk eru `data-tour="…"`.

**Fyrstu skref yfirlæknis.** Gátlisti efst á Mánaðarplani (`HeadGuide.tsx`) sem
merkir sig sjálfur: læknar skráðir og boðnir, vaktategundir, dagatal tengt, opnað
fyrir óskir, plan búið til, plan birt. „Fela leiðarvísi“ lokar honum; hann opnast
aftur úr valmyndinni.

**Hvað hefur verið séð:** `hsu_doctors.onboarding` (`{"tour:doctor", "tour:head",
"guide:head"}` → tími), skráð með `POST /api/hsu/onboarding`. Stjórnandi
Fjarlækninga sér hvorugt sjálfkrafa en getur opnað bæði úr valmyndinni (vistað í vafranum).

**Tungumál.** Allt kerfið er á íslensku og ensku — sjá `docs/hsu-i18n.md`.

## Byrja upp á nýtt (Stillingar)

Neðst í *Stillingum* í `/hsu/stjorn` er „Byrja upp á nýtt“: hreinsar **einn mánuð**
eða **allt vaktakerfið** (`/api/hsu/admin/reset`, aðeins yfirlæknir/stjórnandi).
Fjöldinn sem verður eytt birtist fyrst og staðfesta þarf með orðinu `HREINSA`.

- **Eytt:** vaktir (og vaktaskipti þeirra), óskir, staða mánaðar (`hsu_months`),
  tilkynningar til lækna sem varða mánuðinn og áminningalás (`remind:<mánuður>:*`).
  Tilkynning telst varða mánuðinn ef hún nefnir hann („október 2026“, `2026-10`) eða
  dag í honum („5. okt.“) og er frá síðustu sex mánuðum fyrir lok hans.
- **Haldið:** læknar og innskráning þeirra, vaktategundir, stillingar,
  dagatalstengingar og breytingaskrá (`month.reset` / `system.reset` bætist við,
  með fjöldanum sem var eytt). Eldri áminningar birtast ekki eftir hreinsun.
- Læknar fá ekki tilkynningu. Dagatöl eru samstillt strax á eftir, svo eyddar vaktir
  hverfa úr Google-dagatölum; .ics-áskriftir uppfærast við næstu sókn.

## Hámark og beiðnir um aukavakt

- „Fylla í tómar“ og sjálfvirk skipting setja engan lækni á fleiri vaktir en **hámarkið
  sem hann skráði** í óskum. Hafi hann ekki skráð hámark gildir **sanngjarn hlutur hans
  eftir starfshlutfalli** (rúnnað upp). Frekar stendur vakt tóm en að læknir sé ofhlaðinn.
- Setji yfirlæknir lækni handvirkt á vakt umfram skráð hámark verður vaktin **beiðni**:
  merkt með brotinni appelsínugulri útlínu og klukku á vaktaplani, læknirinn fær póst
  og samþykkir eða hafnar undir *Mínar vaktir*. Hún fer ekki í dagatal fyrr en hann
  samþykkir; höfnun losar vaktina og yfirlæknir fær póst.
- Samþykkt beiðni telst ekki árekstur þótt læknirinn sé þá yfir hámarki.

## Staða skrefa

Hringurinn á hverju skrefi er **fylltur grænn aðeins þegar allt í skrefinu er búið**
(allir sent / allar óskir samþykktar / plan fullmannað án árekstra og án beiðna í bið /
birt). Hálfnað skref fær appelsínugula útlínu og stutta stöðu (t.d. „3 af 5 sent“).

## Tilkynningar og tölvupóstar til lækna

Allar tilkynningar birtast á **Mínar vaktir**: ólesnar efst með „Merkja lesið“, og
tala á flipanum. Lesnar tilkynningar síðustu 30 daga má opna undir „Eldri breytingar“.
**Kerfið sjálft sýnir alltaf allt** — stillingarnar hér að neðan ráða aðeins póstinum.

### Stillingar: *Stillingar → Tilkynningar í tölvupósti*

Hver flokkur er **Strax**, **Samantekt** eða **Slökkt** (`hsu_settings.email_prefs`,
`src/lib/hsu/email-prefs.ts`). Samantekt safnast saman og fer í **einum pósti** þegar
ekkert nýtt hefur bæst við í 10 mín. (cron `/api/cron/hsu-digest` á 5 mín. fresti,
`src/lib/hsu/digest.ts`); einn póstur getur borið fleiri en einn flokk, með millifyrirsögn
fyrir hvern.

| Flokkur | Hvað | Sjálfgefið |
|---|---|---|
| `shifts` | vakt færð, tímum breytt, vakt felld niður, plan tekið úr birtingu, endurröðun | samantekt |
| `requests` | beiðni um aukavakt (gegn óskum eða umfram hámark) | samantekt |
| `market` | ný vakt á vaktamarkaði — fór áður á **alla** lækna við hverja vakt | slökkt |
| `marketMine` | vaktaskipti sem snerta lækninn sjálfan (tekin, hafnað, dregin til baka) | strax |
| `prefs` | opnað fyrir óskir, óskir samþykktar, breytinga óskað | strax |
| `publish` | vaktaplan birt — aðeins til þeirra sem eiga vakt í mánuðinum | strax |
| `head` | til yfirlæknis: svör við beiðnum, vaktaskipti í bið, breyttir dagvinnudagar | samantekt |

**Alltaf sent, óháð stillingum:** boð um aðgang, nýtt lykilorð, tilkynning um breytt
lykilorð — og áminning um óskir, sem yfirlæknir sendir sjálfur með hnappi.

Í kóðanum: `notifyDoctors({ category })` er eini staðurinn sem ákveður póst; flokkurinn
er skráður á tilkynninguna (`hsu_notifications.category`) og `email_pending` sett ef
samantekt á við. `notifyHeads` fer sömu leið og skilar yfirlæknum líka tilkynningu í
kerfinu. Beinir póstar (opnað fyrir óskir, birt, markaðurinn) spyrja `emailMode(flokkur)`
áður en þeir senda. Áminning um óskir er skráð í `hsu_audit` (`month.remind`) og síðustu
fimm sjást í skrefi 1; sami læknir fær ekki tvær áminningar innan mínútu.

## Útköll í Vinnustund

Útköll af forvakt og bakvakt eru skráð í **Vinnustund** (<https://heima.orri.is/>).
Kerfið geymir engin gögn um útköllin — aðeins hvort læknirinn hafi merkt við að
þau séu komin inn:

- Hver forvakt og bakvakt í *Mínar vaktir* og *Næstu vaktir* fær línu með hnappi
  **Opna** (Vinnustund í nýjum flipa) og **Skráð**. Eftir merkingu stendur þar
  „Útköll skráð í Vinnustund“ og smellur afmerkir aftur.
- Liðin vakt sem á eftir að merkja við er í appelsínugulu og daufnar ekki eins og
  aðrar liðnar vaktir; framundan vaktir fá aðeins hljóðláta áminningu.
- *Yfirlit* sýnir „N vaktir án útkallaskráningar“ þegar eitthvað stendur út af.
- Hnappur á Vinnustund er líka í haus *Mínar vaktir* og við *Næstu vaktir*.

## Litakóðun

Hver vaktategund hefur lit (stillanlegur undir Stillingar). Sami litur er
notaður á vaktaplani yfirlæknis og á *Mínar vaktir* hjá lækninum, þar sem
litaskýring efst segir hvaða skammstöfun er hvað. Sjálfgefið: flýtimóttaka
gul, forvaktir bláar, bakvaktir grænblár.

## Vaktamarkaður

Læknir setur vakt **á vaktamarkað** (allir fá póst) eða býður ákveðnum lækni. Vaktin
er hans þar til annar tekur hana. Læknir getur ekki tekið vakt á degi sem hann er
þegar á vakt.

## Dagatöl — staða

| Leið | Stefna | Hraði | Staða |
|---|---|---|---|
| **.ics-áskrift** (iPhone/Mac, Outlook, Google) | kerfi → dagatal | Apple 5–60 mín, Outlook/Google klst. | ✅ virkar núna |
| **Google Calendar API** (push) | kerfi → dagatal | samstundis | ⏳ kóði tilbúinn, uppsetning eftir |
| **Microsoft 365 / Outlook (Graph)** | kerfi ↔ dagatal | samstundis | ✗ ekki smíðað |

**hsu.is er á Microsoft 365** (MX → outlook.com). Vinnudagatal læknanna er því Outlook,
ekki Google.

### Til að Google-push virki fyrir HSU
Sami OAuth-biðlari og Fjarlækningar nota (sjá `docs/google-dagatal.md`), en:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` eru enn ekki í Vercel.
- Samþykktarskjárinn var ákveðinn **Internal** (aðeins @fjarlaekningar.is). Læknar HSU
  eru utan þess léns og komast ekki inn. Þarf **External + staðfestingu hjá Google**
  (`calendar.app.created` er *sensitive*: dagar–vikur, engin öryggisúttekt), eða sér
  OAuth-biðlara fyrir HSU. `External + Testing` virkar fyrir ≤100 notendur en lyklar
  deyja á 7 daga fresti.

### Hvað „tvíátta“ myndi þýða
Vaktaplanið á að vera eina uppsprettan: breyting í dagatali á ekki að færa vakt. Það
sem skilar raunverulegu gagni í hina áttina er **að lesa upptekna daga** úr dagatali
læknis og merkja þá sjálfkrafa sem *get ekki* þegar hann skráir óskir:
- Outlook: Microsoft Graph `Calendars.Read` / `getSchedule` — krefst app-skráningar í
  Entra ID HSU og samþykkis kerfisstjóra HSU. Sama tenging gæti skrifað vaktirnar
  beint í Outlook-dagatalið (samstundis, í stað .ics).
- Google: heimildin `calendar.freebusy`.
- Apple/iCloud hefur ekkert opinbert API; aðeins .ics (eða CalDAV með app-lykilorði).

## Skrár

- `src/lib/hsu/` — auth, plan, prefs, market, shift-edit, calendar, portal, server
- `src/lib/calendar-sync.ts` — sameiginleg Google-samstilling (Fjarlækningar + HSU)
- `src/app/api/hsu/` — auth, me, admin, calendar
- `src/app/hsu/` — viðmót
