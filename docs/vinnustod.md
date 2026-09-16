# Vinnustöð Fjarlækninga

Vinnusvæði hjúkrunarfræðinga og annars starfsfólks heilsugæslunnar sem svarar
sjúklingum í síma og skilaboðum og vísar þeim á Fjarlækningar. Opið allan
vinnudaginn.

| Slóð | Fyrir hvern |
|---|---|
| `/vinnustod` | Innskráning og vinnustöðin sjálf |
| `/vinnustod/virkja/<tákn>` | Virkjun aðgangs úr boði eða nýskráningu, og nýtt lykilorð |
| `/admin/vinnustod` | Stjórnun: spurningar, notendur, tilkynningar, stillingar (aðeins stjórnandi) |
| `/sms` | Vísar áfram á `/vinnustod?t=sms` |

## Hverjir komast inn

Þrjár leiðir að sömu vinnustöð (`src/lib/sms-actor.ts`):

1. **Notandi vinnustöðvar** — hjúkrunarfræðingar o.fl. Eigin innskráning, eins og
   í HSU-vaktakerfinu: netfang og lykilorð, eða 4 stafa aðgangskóði á tölvu sem
   hefur áður skráð sig inn með lykilorði. Engin tveggja þrepa auðkenning. Þetta
   fólk er hvorki í `staff`-töflunni né í `auth.users`.
2. **Starfsfólk Fjarlækninga** — með sinni venjulegu innskráningu í stjórnborðið.
   Hlekkurinn „Vinnustöð“ er í valmyndinni hjá öllum nema lögfræðingum.
3. **Læknar í HSU-vaktakerfinu** — með sinni innskráningu; hlekkur í valmynd
   læknisins á *Mín síða*.

Allir þrír hópar geta sent stjórnanda Fjarlækninga spurningu (tvíhliða samtal).
Stjórnandi (með `aal2`) sér í staðinn innhólfið og er sá eini sem breytir textum.
Aðeins notendur vinnustöðvar (1) hafa *Stillingar*.

### Nýir notendur

- **Nýskráning:** starfsmaður með netfang á leyfðu léni (sjálfgefið `hsu.is`) skráir
  sig á `/vinnustod` → „Nýskráning“. Staðfestingarhlekkur fer í pósthólfið og þar
  velur hann lykilorð. Pósthólfið er sönnunin; svarið er alltaf það sama hvort sem
  netfangið er þegar skráð eða ekki.
- **Boð:** stjórnandi setur inn nafn og netfang undir *Notendur* — hvaða lén sem er.
  Hlekkurinn birtist líka stjórnandanum til að senda beint ef pósturinn skilar sér ekki.
- Leyfð lén eru stillt undir *Stillingar*. Almenn póstlén (gmail.com o.fl.) eru ekki
  leyfð þar, því þá gæti hver sem er skráð sig.
- *Óvirkja* lokar aðganginum strax: allar lotur og traust tæki hverfa.

## Skjárinn

Einn skjár, engir flipar — hjúkrunarfræðingurinn er í símanum og þarf allt strax:

- **Efst:** stór leit (flýtilykill `/`, skilur texta án íslenskra stafa), staða
  þjónustunnar (opið/lokað, kl. 10–22) og erindin sem flýtihnappar.
- **Vinstra megin:** niðurstöður leitar eða valið erindi — *hentar* (grænt) /
  *hentar ekki* (rautt) og texti til sjúklings **með hlekk á gáttina**, á íslensku
  eða ensku. Þar fyrir neðan: meginreglurnar (græn / rauð spjöld), almennur texti
  með hlekk, sjálfspróf með leiðbeiningum og hlekk á `/thjonusta#tests`, tilbúin
  svör og lyf sem eru ekki endurnýjuð. Tilkynningar birtast efst.
- **Hægra megin (fast):** SMS, spurningar til Fjarlækninga (stjórnandi: innhólf) og
  QR-kóði. Í síma kemur þetta fyrst og stika neðst (Leita / SMS / Spurningar).
- Samtal, ný spurning, innhólf, stillingar og stór QR-kóði opnast í skúffu.
- `?t=sms` (og gamla `/sms`) fer beint í símanúmerið.

## Textar til að afrita

Allir afrita; **aðeins stjórnandi** (starfsmaður með hlutverkið admin og tveggja
þrepa auðkenningu) sér **Breyta** og vistar fyrir alla — `gatt_settings`, lykill
`text:<auðkenni>`, ein röð á texta. „Upprunalegur texti“ eyðir breytingunni.
Þjónninn (`/api/admin/vinnustod/texts`) framfylgir sömu reglu.

Hver texti til sjúklings endar á tveimur merktum hlekkjum:

    Sjúklingagátt (innskráning): https://app.medalia.is/fjarlaekningar-hsu
    Nánari upplýsingar: https://www.fjarlaekningar.is/thjonusta/<erindi>

(`/thjonusta` ef síða erindisins er ekki opin á vefnum). Texti til sjúklings verður
að innihalda slóð — viðmótið varar við og þjónninn neitar að vista án hennar.
Auðkenni: `problem:<slug>:<is|en>`, `access:<is|en>`, `selftest:<key>:<is|en>`,
`answer:faq<n>`.

## Algengar spurningar — af vefnum

Svörin eru lesin úr „Algengum spurningum“ á `/thjonusta` í vefumsjóninni
(`src/lib/vinnustod/guide-content.ts`), svo orðalagið er alltaf það sama og á vefnum.
**Verð er ekki nefnt í vinnustöðinni:** spurningunni um kostnað er sleppt og
setningar um komugjald teknar út. Breyting á spurningu á vefnum birtist hér strax.

## Gervigreindarmat — „Hentar erindið Fjarlækningum?“

Efst í vinstri dálki (fyrst í síma). Hjúkrunarfræðingur límir inn skilaboð frá
sjúklingi; `/api/vinnustod/triage` fjarlægir kennitölur, símanúmer og netföng
(`src/lib/vinnustod/redact.ts`), sendir textann til OpenAI (`gpt-5.4`,
`store: false`) með reglunum og erindalistanum úr `nurse-guide.ts`
(`src/lib/vinnustod/triage.ts`) og skilar: hentar / hentar ekki / óljóst,
erindi, viðvörunum, næsta skrefi og spurningum. Hnappur opnar erindið með texta og
hlekk. Ekkert er vistað; takmörk 30 möt á klst. á notanda.

- Viðvörun um persónuupplýsingar birtist alltaf, og lifandi ábending ef kennitala,
  símanúmer eða netfang sést. **Nöfn finnast ekki sjálfkrafa.**
- Líkanið er beðið um að velja „óljóst“ í vafa. Prufusett: 9 dæmigerð skilaboð
  (þvagfærasýking, Stesolid, brjóstverkur, barn, útbrot, frunsa, blóðprufa,
  innskotsárás) — 8 rétt, eitt varfærnara en vænst var.
- **Persónuvernd sjúklinga:** textinn er lýsing á erindi án tengingar við
  einstakling — engin nöfn, kennitölur eða aðrar auðkennandi upplýsingar fylgja —
  og telst því ekki til persónuupplýsinga (ákvörðun persónuverndarfulltrúa
  16.9.2026). Viðvörunin og sjálfvirk hreinsun eru til að halda því þannig.

## Má endurnýja lyfið?

Í erindinu *Lyfjaendurnýjun* er lyfjaleit (`checkMedication`): **rautt** ef heiti
lyfs, virkt efni eða flokkur er á listanum yfir lyf sem eru ekki endurnýjuð,
annars **grænt** — sem þýðir aðeins „ekki á listanum“; læknir metur alltaf.
Hvert leitarorð verður að vera upphaf orðs í heitinu (svo „Magnýl“ finni ekki
„Kódímagnýl“) og innihald í sviga telst ekki með. Algeng sérlyfjaheiti í flokkum
sem eru aðeins lýst almennt (geðrofslyf, testósterón, líftæknilyf) eru í `keywords`.
Listinn sjálfur birtist líka opinn í erindinu.

## Leit

`searchGuide` í `src/lib/nurse-guide-search.ts` leitar í erindum, sjálfsprófum,
algengum spurningum, meginreglum (spjöldunum), lyfjaflokkum og aðgangstextanum.
Broddstafir skipta ekki máli og löng orð finnast líka í annarri beygingu
(„blóðprufur“ → „blóðprufa“). Lyfjaflokkur finnst á heiti eða samheiti
(„benzó“, „róandi“, „ADHD“) og sýnir þá öll lyfin í flokknum. **Bættu við samheitum
(`keywords`) í `nurse-guide.ts` þegar starfsfólk finnur ekki eitthvað.**

## Efnið í *Upplýsingar*

`src/lib/nurse-guide.ts`. **Allt er endursögn** á því sem Fjarlækningar segja
sjúklingum annars staðar — vefnum, algengum spurningum, prentefni og skilmálum —
auk reglna sem tæknistjóri gaf beint (18 ára, aðeins fyrir sig sjálfan, engar
blóðprufur né myndgreiningar, engin líkamsskoðun). **Breytist efnið á vefnum þarf að
breyta því hér líka.**

Öll 13 erindin eru í leiðarvísinum, líka húðvandamál, augnsýkingar og almenn
læknisþjónusta (sem voru falin á vefnum 16.9.2026). Hlekkurinn „Á vefnum“ vísar á
síðu erindisins aðeins þegar hún er opin, annars á `/thjonusta`.

## Samtöl — spurningar og skilaboð

Starfsfólk spyr stjórnanda, og **stjórnandi getur hafið samtal við hvern sem er**
sem kemst inn í vinnustöðina (notendur hennar, starfsfólk Fjarlækninga sem er ekki
stjórnandi, læknar vaktakerfisins): *Samtöl → Ný skilaboð* í stjórnborðinu eða
innhólfinu í vinnustöðinni. Viðtakandinn sér skilaboðin í vinnustöðinni, fær
tölvupóst og svarar þar. Viðtakendalisti: `/api/admin/vinnustod/recipients`.

Þráður á einn eiganda (`gatt_threads.owner_kind`: `vs`, `staff` eða `hsu`, með
`user_id` / `owner_staff` / `owner_hsu`); nafn, netfang og vinnustaður eru afrituð
í þráðinn. Hver sér aðeins sína þræði.

- Ný spurning eða svar frá starfsmanni → póstur á netföngin undir *Stillingar*
  (sjálfgefið `fjarlaekningar@fjarlaekningar.is`), með hlekk á `/admin/vinnustod`.
- Svar Fjarlækninga → póstur til starfsmannsins og ólesið-merki í vinnustöðinni.
- Svaraðu alltaf í stjórnborðinu, ekki í tölvupósti, svo svarið fylgi samtalinu.
- Starfsmenn eru beðnir um að setja ekki persónuupplýsingar sjúklinga í spurningar.

## Tilkynningar

Undir *Tilkynningar* í stjórnborði: fyrirsögn, texti, tegund (upplýsingar eða gul
viðvörun) og valkvæð gildistími. Birtast efst í vinnustöðinni hjá öllum.

## Öryggi

Sama hönnun og vaktakerfi HSU (`src/lib/hsu/auth.ts`, grunnföllin eru sameiginleg):
scrypt, tákn aðeins geymd sem SHA-256, httpOnly-kökur (`vs_session`, `vs_device`),
læsing eftir 8 rangar tilraunir, aðgangskóði bundinn tæki og fellur eftir 5 rangar,
takmörkun á tilraunum eftir IP-tölu, `sameOrigin` á öllum breytingum. Nýtt lykilorð
fellir allar aðrar lotur og traust tæki. Stjórnunarleiðir krefjast stjórnanda með
tveggja þrepa auðkenningu (`aal2`).

Allar `gatt_*` töflur eru lokaðar vöfrum (RLS `using (false)`); aðgangur eingöngu um
þjónustulykil í `/api/vinnustod/*` og `/api/admin/vinnustod/*`.

## Skrár

- `supabase/vinnustod-schema.sql` — töflur (#20 í `MIGRATIONS.md`)
- `src/lib/vinnustod/` — innskráning, þjónn, stjórnun, samtöl
- `src/lib/nurse-guide.ts`, `nurse-guide-search.ts` — efni og leit
- `src/app/vinnustod/` — viðmót (`_components/Workstation.tsx` skjárinn, `Guide.tsx` efnið, `Texts.tsx` breytanlegir textar)
- `src/app/api/vinnustod/`, `src/app/api/admin/vinnustod/` — API
- `src/app/admin/vinnustod/page.tsx` — stjórnun
