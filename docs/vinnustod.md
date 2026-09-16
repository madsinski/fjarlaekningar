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

Aðeins notendur vinnustöðvar (1) sjá flipana *Spurningar* og *Stillingar*.

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

## Flipar

- **Yfirlit** — opið/lokað núna (kl. 10–22 alla daga), tilkynningar frá Fjarlækningum,
  ólesin svör, flýtileiðir og það helsta um þjónustuna.
- **Upplýsingar** — hvert erindi með *hentar / hentar ekki* og tilbúnu svari til að
  afrita, algengar spurningar með svörum, hvernig sjúklingur kemst inn og lyf sem
  eru ekki endurnýjuð. Leitin skilur texta án íslenskra stafa („thvag“,
  „blodprufa“). Flýtilykill: `/`.
- **SMS** — senda sjúklingi hlekkinn og sjá hvort hann komst til skila (Twilio; sjá
  `src/lib/sms.ts`). QR-kóði fyrir sjúkling sem stendur við borðið.
- **Spurningar** — starfsmaður spyr Fjarlækningar; svarið birtist hér og í pósti.
- **Stillingar** — lykilorð og aðgangskóði.

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
viðvörun) og valkvæð gildistími. Birtast efst á *Yfirliti* hjá öllum.

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
- `src/app/vinnustod/` — viðmót
- `src/app/api/vinnustod/`, `src/app/api/admin/vinnustod/` — API
- `src/app/admin/vinnustod/page.tsx` — stjórnun
