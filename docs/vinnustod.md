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

Aðeins notendur vinnustöðvar (1) spyrja spurninga og hafa *Stillingar*. Stjórnandi
Fjarlækninga (með `aal2`) sér í staðinn innhólfið og getur breytt textum fyrir alla.

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

## Textar sem má breyta

Allir afritanlegir textar (erindi, almenni textinn, sjálfspróf, tilbúin svör) hafa
**Breyta**. Textinn leysist upp í þessari röð:

1. **Eigin útgáfa** — „Vista hjá mér“; geymd í vafranum (t.d. með nafni stöðvar).
   „Nota sameiginlega textann“ afturkallar.
2. **Útgáfa Fjarlækninga** — „Vista fyrir alla“ (aðeins stjórnandi, `aal2`);
   `gatt_settings`, lykill `text:<auðkenni>`, ein röð á texta. „Upprunalegur texti“
   eyðir henni.
3. **Sjálfgefinn texti** í `src/lib/nurse-guide.ts` (`defaultText`).

„Afrita“ í breytiham notar breytinguna aðeins í þetta sinn. Texti til sjúklings
verður að innihalda slóð — viðmótið varar við og þjónninn neitar að vista án hennar.
Auðkenni: `problem:<slug>:<is|en>`, `access:<is|en>`, `selftest:<key>:<is|en>`,
`answer:<key>`.

## Efnið í *Upplýsingar*

`src/lib/nurse-guide.ts`. **Allt er endursögn** á því sem Fjarlækningar segja
sjúklingum annars staðar — vefnum, algengum spurningum, prentefni og skilmálum —
auk reglna sem tæknistjóri gaf beint (18 ára, aðeins fyrir sig sjálfan, engar
blóðprufur né myndgreiningar, engin líkamsskoðun). **Breytist efnið á vefnum þarf að
breyta því hér líka.**

Erindi sem eru falin á vefnum (húðvandamál, augnsýkingar, almenn
læknisþjónusta) eru ekki í leiðarvísinum.

## Spurningar og svör

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
