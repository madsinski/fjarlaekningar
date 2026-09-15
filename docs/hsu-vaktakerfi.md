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

### Dagvinnudagar læknis

Sumir læknar vinna dagvinnu aðeins hluta vikunnar (t.d. mánudaga og þriðjudaga).
Það er skráð á lækninn: **Læknar → Dagvaktir (flýtimóttaka)**, eða af lækninum
sjálfum undir **Óskir → Dagvinnudagar**. Skiptingin setur hann þá aðeins á
dagvaktir þá vikudaga; kvöld- og næturvaktir eru óháðar þessu.

Þurfi yfirlæknir hann á dagvakt annan vikudag verður vaktin **beiðni** sem
læknirinn samþykkir eða hafnar — sama leið og vakt umfram hámark. Breyti læknir
dagvinnudögum sínum fá yfirlæknar tölvupóst.

### Ein dagvakt og ein kvöldvakt á dag

Sami læknir má taka **dagvakt og kvöld-/næturvakt sama dag** (flýtimóttaka og svo
forvakt) — það er forsenda mönnunar. Tvær vaktir í sama hólfi sama dag eru hins vegar
útilokaðar, svo forvakt og bakvakt sama dag eru alltaf tveir ólíkir læknar. Reglan
gildir alls staðar: í sjálfvirku skiptingunni, í árekstramerkingum og á vaktamarkaði.

Athugið að um helgar og frídaga skarast FM (08–16) og FV2 (08–08) í tíma. Kerfið
leyfir sama lækni báðar, enda er það val yfirlæknis; sé það ekki ætlunin má fella
FM niður á þeim dögum (taka helgar af vikudögum tegundarinnar) eða breyta tímunum.

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

## Tölvupóstar til lækna

| Atburður | Hver fær póst |
|---|---|
| Opnað fyrir óskir / áminning | læknar (val yfirlæknis) |
| Óskir samþykktar / beðið um breytingar | læknirinn |
| Vaktaplan birt | allir læknar, með fjölda vakta |
| Eftir birtingu: læknir færður á eða af vakt (draga, velja, hreinsa, endurraða) | hver læknir sem missti eða fékk vakt |
| Eftir birtingu: tími, heiti eða athugasemd vaktar breytist | læknirinn á vaktinni |
| Eftir birtingu: vakt eytt / aukavakt bætt við | læknirinn |
| Vaktaplan tekið úr birtingu | læknar með vaktir í mánuðinum |
| Beiðni um aukavakt | læknirinn (líka fyrir birtingu); svar fer til yfirlækna |
| Vaktamarkaður: boð, tekin vakt, höfnun, afturkallað boð, samþykkt/hafnað af yfirlækni, boð fellt niður | þeir sem málið varðar |
| Lykilorði breytt (af lækni eða stjórnanda) | læknirinn (öryggistilkynning) |

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
