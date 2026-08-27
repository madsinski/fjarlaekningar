# Google-dagatal — bein samstilling vakta

Vaktir hafa hingað til borist í dagatal gegnum **áskrift** að `.ics`-slóð. Áskrift
er *pull*: dagatalið sækir þegar því hentar. Apple gerir það á
klukkustundarfresti, Google á nokkurra klukkustunda fresti og hunsar allar vísbendingar sem við
sendum. Enginn getur ýtt breytingu inn í áskrift — það er eðli sniðsins.

Þessi leið er *push*: um leið og vakt breytist skrifum við hana beint inn í
dagatal læknisins gegnum Calendar API. Áskriftin er áfram til staðar fyrir þá sem
tengjast ekki.

---

## Það sem þarf að gera einu sinni

### 1. Keyra SQL

`supabase/google-calendar-schema.sql` í SQL-ritli Supabase. Idempotent.

### 2. Búa til OAuth-biðlara hjá Google

Í [Google Cloud Console](https://console.cloud.google.com/):

1. **APIs & Services → Library → Google Calendar API → Enable**
2. **APIs & Services → OAuth consent screen** — sjá kaflann um birtingarstöðu hér að neðan
3. **Credentials → Create credentials → OAuth client ID → Web application**
   - **Authorized redirect URIs** — nákvæmlega, stafrétt:
     ```
     https://www.fjarlaekningar.is/api/google/callback
     ```
     Google ber þessa slóð saman sem TEXTA, ekki sem vefslóð. Vanti `www`, eða sé
     auka skástrik aftast, kemur upp `redirect_uri_mismatch`. Bættu líka við
     forskoðunarslóð Vercel ef prófa á þar.
4. Afritaðu **Client ID** og **Client secret**

### 3. Setja umhverfisbreytur í Vercel

| Breyta | Gildi |
|---|---|
| `GOOGLE_CLIENT_ID` | úr skrefi 2 |
| `GOOGLE_CLIENT_SECRET` | úr skrefi 2 |
| `GOOGLE_REDIRECT_URI` | `https://www.fjarlaekningar.is/api/google/callback` (valfrjálst — þetta er sjálfgefið) |
| `GOOGLE_OAUTH_STATE_SECRET` | valfrjálst; annars er þjónustulykill Supabase notaður til undirritunar |

Án `GOOGLE_CLIENT_ID`/`SECRET` felur viðmótið sig sjálfkrafa og ekkert brotnar —
áskriftin heldur áfram að virka eins og áður.

---

## Birtingarstaða — lestu þetta áður en þú velur

Þetta er eina atriðið sem getur eyðilagt uppsetninguna hljóðlega, og því tekið
sérstaklega fram hér.

**Sé forritið skilið eftir í `Testing` renna endurnýjunarlyklar út á 7 dögum.**
Samstillingin virkar þá í viku og deyr svo, hjá öllum í einu. Læknirinn sér
„Aðgangur að Google-dagatali var afturkallaður“ og þarf að tengja aftur — í
hverri viku. Þetta er ekki villa í kerfinu heldur regla hjá Google.

Þrjár leiðir, í þeirri röð sem mælt er með:

| Leið | Skilyrði | Staðfesting | 7-daga vandinn |
|---|---|---|---|
| **Internal** (Google Workspace) | læknar noti `@fjarlaekningar.is` Google-reikninga | engin | nei |
| **External + staðfest** | hver sem er | umsókn, dagar–vikur | nei |
| **External + Testing** | mest 100 notendur | engin | **já — lyklar deyja vikulega** |

**Internal er langbesta leiðin** ef Fjarlækningar eru með Google Workspace: engin
staðfesting, engin bið og aðeins fólk í ykkar léni kemst að.

Sé farið í staðfestingu: heimildin sem beðið er um, `calendar.app.created`, telst
*sensitive* en ekki *restricted*. Það þýðir yfirferð á samþykktarskjá og vörumerki
— **ekki** árlega öryggisúttekt hjá þriðja aðila, sem breiða `calendar`-heimildin
hefði kallað á. Þess vegna er sú þrengri valin.

`External + Testing` er fín leið til að prófa í dag. Hún er ekki leið til að reka
þetta í mánuð.

---

## Heimildin

Beðið er um **`calendar.app.created`** og ekkert annað:

> Make secondary Google calendars, and see, create, change, and delete events on them.

Það þýðir í reynd:

- ✅ búa til nýtt dagatal (`Fjarlækningar — vaktir`) og sýsla með atburði á því
- ❌ lesa, breyta eða eyða einkadagatali læknisins
- ❌ sjá nokkurt annað dagatal sem hann hefur aðgang að

Læknirinn getur falið dagatalið, litað það eða eytt því án þess að snerta neitt
annað. „Aftengja“ eyðir dagatalinu og afturkallar lykilinn.

---

## Hvernig samstillingin hegðar sér

**Sáttaaðferð, ekki atburðastraumur.** Hvert kall ber saman vaktir læknisins og
það sem við höfum þegar skrifað, og lagfærir muninn. Misheppnað kall lagar sig
sjálft næst þegar eitthvað breytist — öfugt við „sendu breytinguna einu sinni“,
þar sem eitt týnt kall skilur dagatalið eftir rangt þar til einhver tekur eftir.

**Auðkenni atburðar er leitt af auðkenni vaktarinnar.** Sama vakt skrifuð tvisvar
verður einn atburður, aldrei tveir.

**Atburðir eru heilsdagsfærslur** með titlinum `FL: 10-22` og
`transparency: transparent`. Tólf tíma tímasettur blokk fyllir allan daginn í
dagatalinu og felur allt annað — og er ekki einu sinni rétt: læknirinn er á
bakvakt þennan glugga, ekki á fundi í tólf tíma.

**Samstilling keyrir eftir að svar er sent** (`after()` í Next.js), svo aðgerðir
stjórnanda tefjast ekki þótt Google sé hægt.

**Villur fella aldrei aðgerðina.** Þær eru skráðar á `roster_google_sync.last_error`
og birtast bæði lækninum og í vaktatöflunni.

### Hvað ræsir samstillingu

| Aðgerð | Hvaða dagatöl |
|---|---|
| Vakt búin til / breytt / eytt (stjórnandi) | fyrri og nýr læknir |
| „Skipta jafnt“ / fjöldaúthlutun | allir tengdir |
| Vakt boðin á markað | sá sem bauð |
| Vaktaskipti samþykkt | báðir |
| Boði hafnað eða afturkallað | sá sem bauð |
| Kveikt/slökkt á samstillingu | sá læknir |

`patients_seen` ræsir ekki samstillingu — fjöldi sjúklinga breytir ekki
atburðinum.

---

## Bilanaleit

| Einkenni | Skýring |
|---|---|
| `redirect_uri_mismatch` | slóðin í Google er ekki stafrétt eins og `GOOGLE_REDIRECT_URI` |
| Tengingin deyr eftir viku | forritið er í `Testing` — sjá kaflann um birtingarstöðu |
| „Aðgangur var afturkallaður“ | læknirinn tók aðganginn af hjá Google, eða 7-daga reglan; tengja aftur |
| Hnappurinn sést ekki | `GOOGLE_CLIENT_ID`/`SECRET` vantar í umhverfið |
| Dagatalið er tómt | slökkt á samstillingu, eða engar vaktir næstu 30 daga |
