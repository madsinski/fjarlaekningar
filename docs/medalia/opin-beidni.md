# Opin beiðni — spurningalisti fyrir Medalia

Opinn flokkur fyrir vandamál sem falla ekki undir tilbúnu erindaflokkana.
Sjúklingur lýsir vandamálinu í frjálsum texta; læknir les og metur handvirkt.

**Skrár í þessari möppu**

| Skrá | Hvað |
|---|---|
| `opin-beidni.json` | FHIR R4 `Questionnaire` tilbúið til innflutnings í Medalia |
| `build-opin-beidni.py` | Byggir JSON-skrána. Uppspretta sannleikans meðan spurningalistinn er í smíðum |

```
python3 docs/medalia/build-opin-beidni.py docs/medalia/opin-beidni.json
```

---

## Hönnunarreglan

Frjáls texti einn og sér er versta mögulega innsláttarform í læknisfræði: sjúklingurinn
veit ekki hvað lækninn vantar, og læknirinn fær ekki það sem hann þarf til að taka ákvörðun.
Þess vegna er frjálsi textinn hér **síðastur**, ekki fyrstur.

Fjórar reglur ganga í gegnum allan listann:

1. **Útiloka bráðatilvik fyrst.** Opinn flokkur dregur til sín brjóstverk og heilablóðfall.
   Öryggisskimun kemur á undan öllu öðru.
2. **Spyrja um það sem sjúklingar gleyma.** Tímalengd, ferill, hiti, fyrri lyf, ofnæmi,
   þungun. Þessu er nánast aldrei komið til skila í frjálsum texta að fyrra bragði.
3. **Stýra frjálsa textanum.** Sex tölusettir punktar rétt fyrir ofan textareitinn,
   sýnilegir á meðan skrifað er.
4. **Semja um væntingar.** Sjúklingurinn merkir hverju hann vonast eftir og staðfestir
   að læknirinn geti hafnað erindinu. Þar deyja flest kvörtunarmál.

## Uppbygging — 11 síður, 6 leiðir

Hver sjúklingur sér 7–8 síður og 23–34 spurningar eftir því hvað hann velur á síðu 3.
Meirihlutinn er einn smellur.

| # | Síða | Sýnd | Tilgangur |
|---|---|---|---|
| 1 | Áður en þú byrjar | alltaf | Fyrirvari, 112/1700, umfang, engin ávana- og fíknilyf, staðfesting |
| 2 | Öryggisskimun | alltaf | 12 rauð flögg → hlið → hvaða flögg → stöðvunarskilaboð |
| 3 | Um hvað snýst erindið? | alltaf | Eðli erindis (stýrir greiningunni) + líkamssvæði |
| 4 | Einkennin þín | `new-problem`, `known-problem` | Tímalengd, byrjun, kveikja, ferill, áhrif, hiti, verkir, fyrri saga, hvað var reynt |
| 5 | Lyfjaerindi | `medication` | Tegund erindis, lyf, skammtur, hver ávísaði, birgðir, breytingar, eftirlit |
| 6 | Niðurstöður og eftirfylgd | `results` | Hvaða rannsókn, hvar/hvenær, hverju á að svara |
| 7 | Vottorð | `certificate` | Tegund, tímabil, ástæða, viðtakandi |
| 8 | Um heilsu þína | alltaf | Langvinnir sjúkdómar, lyf, ofnæmi, þungun, nikótín, áfengi, ferðalög, hæð/þyngd |
| 9 | Lýsing með eigin orðum | alltaf | Leiðbeiningar + frjáls texti + áhyggjuspurning |
| 10 | Myndir | alltaf | Hlið + myndatökuráð + viðhengi |
| 11 | Væntingar og staðfesting | alltaf | Hverju er vonast eftir, sími, fjórar staðfestingar |

`other` sleppir síðum 4–7 og fer beint í bakgrunn og frjálsan texta.

## Það sem skiptir mestu máli á hverri síðu

**Síða 1 — fyrirvari.** Þrjú aðskilin blokkir: hvað þjónustan er, hvað hún er ekki
(með símanúmerum), og hvað getur farið öðruvísi en sjúklingurinn vonast eftir. Síðasti
punkturinn — *læknirinn sér aðeins það sem þú skrifar* — er sá sem breytir gæðum textans
sem berst. Krafist er hakað við staðfestingu.

**Síða 2 — öryggisskimun.** Listinn er lesinn sem texti, síðan eitt já/nei hlið. Ef **já**
opnast (a) gátlisti svo læknirinn sjái hvaða flagg, (b) stöðvunarskilaboð með 112, 1700 og
1717, og (c) staðfesting á að erindið komi ekki í stað bráðaþjónustu. Erindinu er ekki
lokað — það myndi bara þýða að sjúklingurinn svaraði nei í annarri tilraun — heldur er það
merkt fyrir lækninn.

**Síða 3 — flokkun.** `erindi-type` er eina spurningin sem stýrir greiningu.
`erindi-svaedi` er 16 valkosta fellilisti sem er eingöngu til að lækninn geti undirbúið sig
og til að hægt sé að telja hvaða flokka ætti að gera að eigin spurningalista síðar.

**Síða 4 — einkennin.** Þetta er klíníska kjarnasagan: tímalengd, skyndileg vs. hægfara
byrjun, kveikja, ferill, áhrif á daglegt líf, hiti (með mældu gildi), verkir (staðsetning,
0–10, hvað lagar/versnar), fyrri sömu einkenni, fyrri læknisheimsóknir, hvað hefur verið
reynt og hvort það virkaði. Þetta eru upplýsingarnar sem annars kalla á aukafyrirspurn og
annan sólarhring.

**Síða 8 — bakgrunnur.** Sýnd öllum, líka þeim sem eru bara að biðja um vottorð. Ofnæmi og
þungun eru öryggisspurningar, ekki formsatriði. Hæð og þyngd eru valfrjáls en gera
skammtaútreikning mögulegan án eftirfylgni.

**Síða 9 — frjálsi textinn.** Sex punkta leiðarvísir stendur fyrir ofan reitinn. Þar á
eftir kemur *„Hvað hefur þú mestar áhyggjur af?“* — áhyggjur sjúklingsins eru oft besta
vísbendingin um hvað þarf að útiloka, og ósvöruð áhyggja er algengasta ástæða þess að
sjúklingur er ósáttur við annars rétt svar.

**Síða 10 — myndir.** Myndatökuráðin (dagsbirta, nærmynd + yfirlitsmynd, mynt til
stærðarviðmiðunar, þurrka af krem) eru munurinn á nothæfri og ónothæfri mynd af útbrotum.

**Síða 11 — væntingar.** `exp-wish` gerir misskilning sýnilegan áður en hann verður að
kvörtun: sjúklingur sem merkir „lyfseðli“ við vandamál sem kallar á skoðun fær það svar
strax í stað þess að upplifa höfnun.

## Tæknilegar ákvarðanir

Byggt á sniðinu úr Lifeline `Heilsumat` útflutningnum, svo innflutningur í Medalia gangi
upp án handvirkrar lagfæringar.

- **Síður** eru `group` með `itemControl: page`.
- **Greining notar eingöngu venjulegt `enableWhen` + `answerCoding`. Enginn FHIRPath.**
  `enableWhenExpression` er þekkt uppspretta villna í Medalia (einlínukrafa, `repeat(item)`,
  gildistegundir, tómabreiðsla). ELLEGAR-rökfræði er leyst með `enableBehavior: "any"` og
  mörgum `enableWhen` færslum — ekki með formúlu.
- **Svarmöguleikar** eru `valueCoding` með stöðugum kóðum (`new-problem`, `yes`, `renewal`).
  Kóðarnir eru það sem greiningin vísar í og það sem síðar er hægt að telja.
- **linkId** eru læsileg og með forskeyti (`sym-`, `med-`, `bg-`, `free-`). Stafsetningarmunur
  á linkId er algengasta ástæða þess að spurning birtist aldrei.
- **Hjálpartextar** eru `display` börn með `itemControl: help` og linkId `<foreldri>-help`.
- **Skýringartextar í reitum** nota `entryFormat`.

Byggingarforritið staðfestir sjálft að hvert `enableWhen` vísi á linkId sem er til og á kóða
sem er raunverulega til í valmöguleikum þeirrar spurningar. Núverandi staða: 98 atriði,
0 villur.

## Áður en þetta fer í loftið

**Þrjú gildi þarf að fylla út.** Þau eru merkt með hornklofum í JSON-skránni svo ekki sé
hægt að birta listann óvart óunninn:

| Staður | Hvað vantar |
|---|---|
| `intro-scope` | `[SVARTÍMI]` — raunverulegur svartími |
| `intro-scope` | `[GJALDSKRÁ]` — verð og hvenær innheimt |
| `final-notemergency` | `[SVARTÍMI]` — sama gildi og að ofan |

**Eitt þarf að prófa.** `img-files` er af gerðinni `attachment`. Medalia-útflutningurinn sem
sniðið er byggt á notar ekki þá gerð, svo hún er óstaðfest í þessari uppsetningu. Flyttu
listann inn og opnaðu síðu 10:

- Ef viðhengi virkar — ekkert að gera.
- Ef ekki — fjarlægðu `img-files`, láttu `img-tips` standa, og bættu við texta sem segir
  sjúklingi að senda myndir í skilaboðaþræðinum eftir að erindið er sent.

**Tvennt til að ákveða.** Vottorðastefnan á síðu 7 (`cert-policy`) er skrifuð
íhaldssamt — engin vottorð aftur í tímann án mats — og þarf að passa við raunverulega stefnu.
Sama á við um lyfjatextann á síðu 5 (`med-controlled`).

**Enska útgáfan** er ekki komin. Byggingarforritið er þannig uppbyggt að þýðing er skipti á
strengjum í einni skrá; kóðar og greining haldast óbreytt, sem þýðir að svör úr báðum
útgáfum eru samanburðarhæf.

## Eftir að listinn hefur verið í notkun

`erindi-svaedi` er talningartækið. Sá flokkur sem oftast kemur inn um opna erindið á að fá
sinn eigin spurningalista — opni flokkurinn er bæði öryggisventill og uppgötvunartæki fyrir
hvaða sérhæfða lista vantar næst.
