# Árangursmælingar

`/admin/arangur` — mánaðarlegar tölur á hverja heilsugæslustöð, fimm flokkar
mælikvarða, og gátlistinn yfir það sem þarf að vera komið upp.

| Hluti | Hvar |
|---|---|
| Mælaborð, innflutningur, skráning, gátlisti | `/admin/arangur` (stjórnandi) |
| Taflan | `supabase/arangur-schema.sql` — keyrist einu sinni |
| Mælikvarðarnir | `src/lib/arangur.ts` |
| Útflutningssnið og lestur | `src/lib/arangur-innflutningur.ts` |
| Gátlistinn | `src/lib/arangur-gatlisti.ts` |

Stöðvalistinn kemur úr innleiðingarmódúlnum (`site_settings.station_onboarding`)
svo það er einn sannleikur um hvaða stöðvar eru til. Sé hann ótekinn í notkun er
fallið aftur á starfsstöðvalista HSU.

## Flokkarnir fimm

Markmiðin eru sögð tvö — bæta þjónustuna, létta á heilsugæslunni — en þau klofna
við skoðun í fimm flokka sem hver hefur sitt sönnunarstig og sinn bilunarhátt.

| Flokkur | Spurning | Höfuðmælikvarði | Markmið |
|---|---|---|---|
| **Virkni** | Leysast erindin? | Lausnarhlutfall | 1 |
| **Öryggi** *(hlið)* | Skaðast enginn? | Alvarleg atvik | 1 — gólfið |
| **Álagslétting** | Léttir þetta raunverulega á? | Frigjörð vinna (nettó) | 2 — salan |
| **Upplifun** | Var þetta betra fyrir manneskjuna? | Sögðu ferlið einfalt | 1 — röddin |
| **Yfirfæranleiki** *(hlið)* | Er þetta endurtakanlegt? | Mönnun | Af hverju við mælum |

Öryggi er sér flokkur en ekki undirmælikvarði af því það er **hlið en ekki
kvarði**: frábært lausnarhlutfall með einu alvarlegu atviki er fallið verkefni.
Yfirfæranleiki vantaði í bæði markmiðin en er hvatinn að öllu verkefninu —
Vestmannaeyjar eru tilraunastöð og spurningin er hvort þetta sé endurtakanlegt.

Hver flokkur ber einn höfuðmælikvarða og fjóra til sex undirmælikvarða sem bera
hann þegar spurt er nánar. Höfuðtölurnar eru það sem fer á vegginn;
undirmælikvarðarnir eru það sem þú átt tilbúið þegar einhver ýtir á.

### Tvær röðunarreglur

Innsláttur er flokkaður eftir **heimild** — hver gefur þér töluna — því það er
vinnuflæðið. Mælaborðið er flokkað eftir **fullyrðingu** — hvað talan sannar —
því það er samtalið. Sami gagnagrunnur, tvær röðunarreglur, hvorug röng á sínum
stað.

### Auður reitur er ekki núll

„Engin alvarleg atvik“ og „við mældum ekki atvik“ eru ólíkar fullyrðingar.
Ómældir reitir eru `null` og mælaborðið sýnir þá sem **Bíður** með því hvaða
heimild vantar, frekar en að sýna núll sem lítur út eins og mæling.

### Afleiddar tölur bera forsendu sína

Frigjörð vinna er `leyst erindi × nettó mínútur`. Forsendan er því hluti af
fullyrðingunni og birtist alltaf með tölunni. Þar til `timamaeling_gerd` er
hakað er talan merkt **ágiskun** og á ekki heima í kynningu.

---

## Útflutningurinn frá Medalia

Þetta er kaflinn sem fer til Medalia. Sniðmát með haus má sækja beint í
viðmótinu undir *Innflutningur*.

### Kornastærðin

**Ein lína á stöð × mánuð × erindi.** Níu stöðvar × þrettán erindi = 117 línur á
mánuði fyrir allt HSU.

Þetta er fínasta kornið sem er enn alveg ópersónugreinanlegt, og það gefur hvort
tveggja í einni skrá: sundurliðun eftir erindi (fullyrðing 1 og 2 í listanum
þínum) og heildartölur á stöð (allt hitt). Grófara korn — ein lína á stöð —
sparar ekkert og eyðileggur sundurliðunina. Fínna korn er persónuupplýsingar.

### Engar persónuupplýsingar, og það er hönnun

Hver lína er **fjöldi, ekki manneskja**. Skráin getur því ekki innihaldið
persónuupplýsingar, sama hvað gerist:

- **Engin kennitala**, ekkert nafn, engin auðkenni.
- **Engin dagsetning** — mánuður er nógu nákvæmt, og dagsetning á lítilli stöð
  er persónugreinandi.
- **Enginn frjáls texti.** Þetta er stærsta lekaleiðin í hvaða útflutningi sem
  er og það er einfaldast að hafa hann ekki með.
- **Ekkert aldursbil, ekkert kyn.** Aldur + kyn + mánuður + 4.100 manna byggð
  getur verið persónugreinandi þótt hvert atriði fyrir sig sé það ekki.
- **Svartími sem lengd í mínútum**, aldrei sem tímastimpill.

Þess vegna fellur þessi tafla hreinlega undir gæðaeftirlit: hún geymir ekkert
sem rekja má til einstaklings og því er ekkert að vernda.

### Dálkarnir

`stod`, `manudur` (yyyy-mm), `erindi` (slug), `erindi_alls`, `erindi_leyst`,
`erindi_visad`, `visad_heilsugaesla`, `visad_serfraedi`, `visad_brad`,
`visad_annad`, `endurtekin`, `listi_stodvadur`, `lyfsedlar`, `syklalyf`,
`kodar_utan_setts`, `svartimi_midgildi_min`, `svartimi_p95_min`,
`adkoma_beint`, `adkoma_hjukrunarfr`, `adkoma_mottaka`, `adkoma_gagnafr`,
`adkoma_annad`.

Nákvæmar lýsingar eru í `DALKAR` í `src/lib/arangur-innflutningur.ts` og
birtast í viðmótinu. Tveir dálkar eiga skilið sérstaka athygli:

- **`visad_brad`** — vísað á bráðamóttöku eða 112 *eftir* að sjúklingur komst
  gegnum spurningalistann. Sér dálkur því þetta er ekki venjuleg tilvísun heldur
  næstum-atvik síunarinnar, og skarpasti öryggismælikvarðinn sem við eigum
  sjálf.
- **`listi_stodvadur`** — stöðvuð eyðublöð. Enginn síar sjúklinga klínískt fyrir
  fram og það er meðvitað; spurningalistinn gerir það, eins fyrir alla, í hvert
  skipti. Stöðvunartíðnin er því eina öryggissönnunin sem við eigum fyrir
  síuninni. **Ef þetta skráist ekki í Medalia í dag er það brýnasta
  lagfæringin** — og hún þarf að vera komin áður en talningin hefst, ekki eftir.

### Innra samræmi

Innflytjandinn athugar að `leyst + vísað = alls` fyrir hverja stöð og mánuð.
Gangi það ekki upp birtist athugasemd en innflutningur stöðvast ekki — mismunur
þýðir yfirleitt að afgreiðslureiturinn í Medalia sé ekki skyldubundinn ennþá.
Þessi einfalda reikniregla er eina vörnin gegn gölluðum útflutningi, og hún er
ástæða þess að skráin má ekki vera „hvað sem er, við reddum því“.

---

## AI eða CSV?

**CSV er samningurinn. AI er millistykki — aldrei á tölurnar sjálfar.**

Þetta eru endurskoðanlegar tölur sem fara í skýrslu til stofnunarinnar, í ágrip
og hugsanlega í útboðsgögn. Ef mállíkan les eina tölu vitlaust kemstu aldrei að
því: það er engin gátsumma, ekkert til að bera saman við, og villan fer beint
inn í birta fullyrðingu. Það er önnur áhættuflokkun en venjulegar hugbúnaðar­villur.

Og hún er ekki verjanleg. Spurningunni *hvernig komst þessi tala í skýrsluna?*
má ekki svara með „mállíkan las útflutninginn“ — hvorki fyrir matsnefnd í útboði
né fyrir Vísindasiðanefnd. Við bætist að sama skráin gæti gefið ólíkar tölur við
endurkeyrslu, sem brýtur það eina sem mælikerfi verður að hafa: endurtakanleika.

**En AI á heima á þremur stöðum í þessu flæði:**

1. **Dálkavörpun við uppsetningu.** Raunverulega núningurinn er ekki lesturinn
   heldur að haus Medalia mun ekki heita það sama og okkar. Þar er mállíkan gott
   í að stinga upp á vörpun, sýna hana, og svo er hún **fryst** — eftir það er
   ekkert AI í mánaðarlega flæðinu. Sama gildir ef Medalia breytir sniðinu.
   Þetta er ekki byggt ennþá, og á ekki að byggja fyrr en við höfum séð
   raunverulegan útflutning frá þeim; vörpun smíðuð á móti ímynduðu sniði er
   ágiskun.
2. **Flokkun á „almenn læknisþjónusta“ sem leystist ekki.** Þarna er mállíkan
   raunverulega gagnlegt: efnið er frjáls texti, verkefnið er málfræðilegt, og
   niðurstaðan er könnunarvinna en ekki birt tala. Þetta er vegvísirinn að
   erindi 12, 13 og 14.
3. **Uppkast að ársfjórðungsskýrslu** úr tölunum sem þegar liggja fyrir — en
   tölurnar koma úr gagnagrunninum, ekki úr líkaninu.

Meginreglan: **notaðu AI þar sem það er ódýrt að hafa rangt fyrir sér og
auðvelt að laga, aldrei þar sem útkoman verður að birtri fullyrðingu sem enginn
athugar aftur.**

---

## Erindaskráin — árleg dýpri greining

Fyrir kóðadreifingu, krosstöflur og aldursmun þarf eina línu á erindi. Hún
**fer aldrei inn í þetta kerfi** og er sérstakt mál.

Mikilvæg leiðrétting á algengum misskilningi: **dulkóðaður sjúklingalykill gerir
skrána ekki ópersónugreinanlega.** Gervigreining (pseudonymisation) er ekki
nafnleysi samkvæmt GDPR — lykill sem gerir kleift að þekkja sömu manneskju
aftur er persónuupplýsing, hversu vel sem hann er hakkaður. Það þýðir ekki að
hann sé bannaður; hann er einmitt rétta lausnin ef telja á endurteknar komur.
En skráin er þá persónuupplýsingar að lögum: hún er ekki send í tölvupósti, hún
liggur ekki í þessu stjórnborði, og hún lýtur sömu reglum og sjúkraskráin
sjálf — sem er í lagi, því við erum hvort eð er ábyrgðaraðili að okkar eigin
sjúkraskrá.

**Smáar tölur:** í öllu sem fer út úr húsi á að fella út eða sameina reiti með
færri en fimm tilvikum. Mælaborðið merkir slík hlutföll grá til áminningar.

---

## Lagalega hliðin í stuttu máli

Að meta og bæta eigin þjónustu er **innra gæðaeftirlit** skv. lögum nr. 41/2007
um landlækni og lýðheilsu. Það krefst hvorki samþykkis sjúklinga né
Vísindasiðanefndar, og það dugar fyrir allt sem þetta kerfi gerir: skýrslur til
stofnunarinnar, mælaborð, kostnaðartölur, útboðsgögn.

Um leið og niðurstöður eru **birtar** fer verkefnið undir lög nr. 44/2014. En
þau heimila Vísindasiðanefnd að veita **undanþágu frá upplýstu samþykki í
gagnarannsóknum**, og slíkar undanþágur eru veittar reglulega fyrir nákvæmlega
svona verkefni. Þetta er því ekki spurning um samþykki heldur um eitt bréf —
sent snemma, ekki þegar ágripsfrestur rennur út.

**Ekki setja upp samþykkishnapp.** Í þjónustusambandi er samþykki veik
vinnsluheimild, því sjúklingurinn er ekki í aðstöðu til að neita. Verra: þá þarf
að útiloka alla sem neita, sem skekkir þýðið, og eftir situr samþykkisskrá sem
þarf að viðhalda að eilífu. Uppfærðu persónuverndaryfirlýsinguna í staðinn —
það er upplýsingaskylda, ekki samþykki.

**Endurkomur innan sjö daga** krefjast þess að tengja saman tvær sjúkraskrár og
sú samkeyrsla er rannsóknarvinnsla. Lausnin er að stofnunin keyri fyrirspurnina
sín megin og afhendi aðeins talninguna. Þá vinnur hvor aðili í eigin gögnum og
ekkert fer á milli nema tala.

---

## Verkferlið

Gátlistinn sjálfur er í viðmótinu undir *Gátlisti*, með haki sem vistast fyrir
alla. Hann skiptist eftir tíðni — einu sinni, mánaðarlega, ársfjórðungslega,
árlega — því það er spurningin sem fólk er raunverulega að spyrja.

Atriði merkt **tímanæm** eru þau sem eru ekki bætanleg eftir á: grunnlína sem
er ekki sótt meðan velviljinn er nýr fæst ekki seinna, og tímamæling sem byrjar
eftir að fólk er vant þjónustunni mælir ekki lengur það sem hún átti að mæla.
Mælaborðið telur þau á forsíðu þar til þau eru kláruð. Allt annað má gera í
næstu viku án þess að tapa neinu.

Ef velja á eitt verkefni úr öllum listanum til að klára fyrst: **ákveða
kóðasettin og fá stofnunina til að keyra grunnlínuna á þeim.** Greiningarkóðarnir
eru tengilykillinn milli okkar teljara og þeirra nefnara, og án þeirra eru allar
tölurnar okkar sjálfvísandi.
