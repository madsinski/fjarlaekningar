# Opin beiðni — uppsetningarblað fyrir Medalia

Handvirk uppsetning, spurning fyrir spurningu, í réttri röð.
Búið til beint úr `opin-beidni.json` svo textinn og rökin séu örugglega þau sömu.

**Hvernig á að lesa þetta**

- `linkId` er auðkenni spurningarinnar. Sláðu það inn nákvæmlega eins og hér stendur —
  öll skilyrði vísa í þessi auðkenni og einn stafur skiptir máli.
- **Birtist ef** þýðir að spurningin er falin þar til skilyrðið er uppfyllt.
  Spurningar án þeirrar línu eru alltaf sýnilegar.
- **SKYLDA** þýðir að ekki er hægt að halda áfram án svars.
- Í valmöguleikatöflum er `kóði` gildið sem skilyrðin vísa í. Textinn er það sem
  sjúklingurinn sér. Ef Medalia leyfir aðeins texta, notaðu textann og passaðu að
  skilyrðin vísi í hann í staðinn.
- *Hjálpartexti* birtist undir spurningunni. *Skýring í reit* er grái textinn inni í
  auða reitnum.

---

## Síða 1 · Áður en þú byrjar

**Sýnd öllum.**

### 1.1 · `intro-what`

Skýringartexti

> Þetta er opin beiðni um skriflegt læknismat hjá Fjarlækningum.
>
> Þú lýsir vandamálinu með þínum eigin orðum og læknir les erindið, metur það og svarar þér. Þetta er ekki spjall í rauntíma og læknirinn getur ekki skoðað þig, hlustað þig eða þreifað.

### 1.2 · `intro-emergency`

Skýringartexti

> ⚠️ Þetta er EKKI neyðarþjónusta.
>
> Hringdu í 112 ef um bráð veikindi eða slys er að ræða.
> Hringdu í 1700 (Læknavaktin / Heilsuvera) ef þú þarft ráðgjöf strax.
> Hringdu í 543 2222 (Eitrunarmiðstöð) vegna eitrunar eða ofskömmtunar.
>
> Erindi sem berast hér eru ekki lesin jafnóðum.

### 1.3 · `intro-scope`

Skýringartexti

> Gott að vita áður en þú heldur áfram:
>
> • Svar berst innan tveggja klukkustunda á opnunartíma, alla daga
> milli 10 og 22.
> • Læknirinn getur hafnað erindinu eða vísað þér í staðbundna skoðun ef málið hentar ekki fjarþjónustu. Það gerist meðal annars þegar þarf að hlusta lungu, skoða eyru eða háls, þreifa kvið eða meta áverka.
> • Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu. Það á meðal annars við um sterk verkjalyf (ópíóíða), róandi lyf og svefnlyf (benzódíazepín og skyld lyf) og ADHD-lyf.
> • [GJALDSKRÁ – t.d. Gjald fyrir erindið er X kr. og er innheimt þegar læknir hefur afgreitt erindið.]
> • Læknirinn sér aðeins það sem þú skrifar hér. Því nákvæmari sem þú ert, því betra verður matið.

### 1.4 · `intro-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég hef lesið ofangreint og skil að þetta er ekki neyðarþjónusta.

---

## Síða 2 · Öryggisskimun

**Sýnd öllum.**

### 2.1 · `rf-intro`

Skýringartexti

> Fyrst þurfum við að útiloka einkenni sem þola enga bið.
>
> Lestu listann og svaraðu svo spurningunni fyrir neðan:
>
> • Verkur, þyngsli eða þrýstingur fyrir brjósti
> • Andþyngsli eða öndunarerfiðleikar í hvíld
> • Skyndilegt máttleysi, dofi eða skerðing öðrum megin í líkamanum, skyndilegir talörðugleikar eða skyndileg sjónskerðing
> • Skyndilegur og mjög mikill höfuðverkur, ólíkur öllu sem þú hefur fundið áður
> • Meðvitundarleysi, yfirlið eða rugl
> • Miklir eða vaxandi kviðverkir
> • Blóð í uppköstum, svartar eða blóðugar hægðir
> • Hár hiti ásamt stífum hnakka, ljósfælni eða útbrotum sem hverfa ekki þegar þrýst er á þau
> • Bólga í andliti, vörum eða tungu, eða öndunarerfiðleikar eftir lyf, fæðu eða stungu
> • Blæðing eða verkir á meðgöngu
> • Alvarlegur áverki, mikil blæðing eða grunur um beinbrot
> • Sjálfsvígshugsanir eða hugsanir um að skaða þig eða aðra

### 2.2 · `rf-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Á eitthvað af ofangreindu við um þig núna?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 2.3 · `rf-which`

Fjölval — gátreitir

**Spurning:** Hvað af þessu á við? Merktu við allt sem á við.

**Birtist ef:** `rf-gate` = `yes`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `chest` | Verkur eða þyngsli fyrir brjósti |
| `breathing` | Andþyngsli eða öndunarerfiðleikar |
| `stroke` | Máttleysi, dofi, talörðugleikar eða sjónskerðing |
| `headache` | Skyndilegur og mjög mikill höfuðverkur |
| `consciousness` | Meðvitundarleysi, yfirlið eða rugl |
| `abdomen` | Miklir kviðverkir |
| `bleeding-gi` | Blóð í uppköstum eða hægðum |
| `meningitis` | Hiti með stífum hnakka eða útbrotum |
| `anaphylaxis` | Bólga í andliti eða tungu, bráðaofnæmi |
| `pregnancy` | Blæðing eða verkir á meðgöngu |
| `trauma` | Alvarlegur áverki eða mikil blæðing |
| `self-harm` | Sjálfsvígshugsanir eða hugsanir um að skaða mig |

### 2.4 · `rf-warning`

Skýringartexti

> ⚠️ Stöðvaðu hér og leitaðu aðstoðar strax.
>
> Einkennin sem þú merktir við þola ekki bið eftir skriflegu svari.
>
> • Hringdu í 112 ef ástandið er brátt.
> • Hringdu í 1700 til að fá ráðgjöf strax.
> • Farðu á næstu bráðamóttöku eða heilsugæslu.
>
> Ef þú ert með sjálfsvígshugsanir: hringdu í 1717 (Hjálparsíma Rauða krossins, opinn allan sólarhringinn) eða 112.
>
> Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu og gæti verið afgreitt of seint.

**Birtist ef:** `rf-gate` = `yes`

### 2.5 · `rf-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta erindi kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

---

## Síða 3 · Um hvað snýst erindið?

**Sýnd öllum.**

### 3.1 · `cat-intro`

Skýringartexti

> Næstu tvær spurningar hjálpa lækninum að undirbúa sig áður en hann les lýsinguna þína.

### 3.2 · `erindi-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers eðlis er erindið?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `new-problem` | Nýtt einkenni eða nýtt heilsuvandamál |
| `known-problem` | Þekkt eða langvinnt vandamál sem hefur breyst eða versnað |
| `medication` | Lyf – endurnýjun, aukaverkun eða spurning |
| `results` | Niðurstöður úr rannsókn eða eftirfylgd |
| `certificate` | Vottorð eða staðfesting |
| `other` | Annað eða ég er ekki viss |

*Hjálpartexti:* Veldu það sem passar best. Ef fleira en eitt á við, veldu aðalatriðið – þú getur útskýrt hitt í textanum síðar.

### 3.3 · `erindi-svaedi`

Fellilisti · **SKYLDA**

**Spurning:** Hvaða svæði eða flokkur á best við?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `skin` | Húð, útbrot, sár eða nögl |
| `eye` | Augu |
| `ent` | Eyru, nef, háls eða munnur |
| `resp` | Öndunarfæri – hósti, kvef, andþyngsli |
| `cardio` | Hjarta og blóðrás |
| `gi` | Melting, magi eða kviður |
| `uro` | Þvagfæri og nýru |
| `sexual` | Kynheilbrigði og kynsjúkdómar |
| `gyn` | Kvenheilsa, tíðir eða þungun |
| `msk` | Stoðkerfi – vöðvar, liðir, bak eða áverki |
| `neuro` | Taugakerfi – höfuðverkur, svimi, dofi |
| `mental` | Geðheilsa, streita eða svefn |
| `allergy` | Ofnæmi |
| `infection` | Sýking eða hiti |
| `travel` | Ferðalög og bólusetningar |
| `other` | Annað eða veit ekki |

---

## Síða 4 · Einkennin þín

**Öll síðan birtist ef:** `erindi-type` = `new-problem` EÐA `erindi-type` = `known-problem`

### 4.1 · `sym-intro`

Skýringartexti

> Þetta eru atriðin sem sjúklingar gleyma oftast að nefna en læknirinn þarf nánast alltaf að vita.

### 4.2 · `sym-diagnosis`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvaða greining eða vandamál er þetta og hvenær greindist það?

**Birtist ef:** `erindi-type` = `known-problem`

*Skýring í reit:* t.d. exem á höndum, greint 2019

### 4.3 · `sym-duration`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hversu lengi hefur þetta staðið yfir?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `today` | Í dag |
| `1-3d` | 1–3 daga |
| `4-7d` | 4–7 daga |
| `1-2w` | 1–2 vikur |
| `2-4w` | 2–4 vikur |
| `1-3m` | 1–3 mánuði |
| `3-12m` | 3–12 mánuði |
| `over-1y` | Lengur en ár |

*Hjálpartexti:* Ef vandamálið er þekkt, áttu við þá versnun sem þú ert að leita til okkar með núna.

### 4.4 · `sym-onset`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Byrjaði þetta skyndilega eða smám saman?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `sudden` | Skyndilega, ég man hvenær |
| `days` | Á nokkrum dögum |
| `gradual` | Smám saman á lengri tíma |
| `unsure` | Ég er ekki viss |

### 4.5 · `sym-trigger`

Langur texti — textareitur

**Spurning:** Gerðist eitthvað sérstakt rétt áður en einkennin byrjuðu?

*Skýring í reit:* t.d. nýtt lyf, ferðalag, álag, matur, meiðsli, skordýrabit, veikindi í kringum þig. Skrifaðu „ekkert“ ef ekkert kemur upp í hugann.

### 4.6 · `sym-course`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvernig hefur þetta þróast?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `worse` | Versnandi |
| `same` | Óbreytt |
| `better` | Batnandi |
| `fluctuating` | Kemur og fer |

### 4.7 · `sym-impact`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hversu mikil áhrif hefur þetta á daglegt líf þitt?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `none` | Engin – ég sinni öllu eins og venjulega |
| `mild` | Lítil – ég næ að sinna flestu |
| `moderate` | Töluverð – ég hef þurft að draga úr |
| `severe` | Mikil – ég kemst ekki í vinnu, skóla eða sinni mér |

### 4.8 · `sym-fever`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með hita?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `measured` | Já, ég hef mælt hann |
| `feels` | Mér finnst ég vera með hita en hef ekki mælt |
| `no` | Nei |
| `unsure` | Veit ekki |

### 4.9 · `sym-fever-temp`

Tala með einingu — °C

**Spurning:** Hæsti hiti sem þú hefur mælt (°C)

**Birtist ef:** `sym-fever` = `measured`

### 4.10 · `sym-pain`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með verki?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 4.11 · `sym-pain-where`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvar eru verkirnir og leiða þeir eitthvað?

**Birtist ef:** `sym-pain` = `yes`

*Skýring í reit:* t.d. neðarlega hægra megin í baki, leiðir niður í fót

### 4.12 · `sym-pain-score`

Tala 0–10 — hnappar · **SKYLDA**

**Spurning:** Hversu miklir eru verkirnir núna? 0 = engir verkir, 10 = verstu verkir sem þú getur ímyndað þér.

**Birtist ef:** `sym-pain` = `yes`

### 4.13 · `sym-pain-mod`

Langur texti — textareitur

**Spurning:** Hvað gerir verkina betri eða verri?

**Birtist ef:** `sym-pain` = `yes`

*Skýring í reit:* t.d. betra í hvíld, verra við hreyfingu, verra á nóttunni, betra eftir mat

### 4.14 · `sym-recurrent`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú fengið svipuð einkenni áður?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei, þetta er í fyrsta sinn |
| `once` | Já, einu sinni áður |
| `often` | Já, þetta kemur reglulega |

### 4.15 · `sym-recurrent-what`

Langur texti — textareitur

**Spurning:** Hvað var gert síðast og hvað hjálpaði?

**Birtist ef:** `sym-recurrent` = `once` EÐA `sym-recurrent` = `often`

*Skýring í reit:* t.d. fékk sýklalyf sem virkuðu, eða þetta lagaðist af sjálfu sér

### 4.16 · `sym-seen-doctor`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú þegar leitað til læknis, heilsugæslu eða bráðamóttöku vegna þessa?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 4.17 · `sym-seen-doctor-what`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvert leitaðir þú, hvenær og hvað var gert eða sagt?

**Birtist ef:** `sym-seen-doctor` = `yes`

*Skýring í reit:* t.d. heilsugæslan í síðustu viku, tekin þvagprufa, fékk sýklalyf í 5 daga

### 4.18 · `sym-tried`

Fjölval — gátreitir

**Spurning:** Hvað hefur þú prófað sjálf eða sjálfur?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `painkillers` | Verkjalyf (t.d. Paratabs, Íbúfen) |
| `antihistamine` | Ofnæmislyf |
| `cream` | Krem eða smyrsl |
| `otc` | Annað lausasölulyf úr apóteki |
| `rest` | Hvíld |
| `heat-cold` | Kælingu eða hita |
| `supplements` | Bætiefni eða náttúrulyf |
| `nothing` | Ekkert |
| `other` | Annað |

### 4.19 · `sym-tried-detail`

Langur texti — textareitur

**Spurning:** Hvað nákvæmlega prófaðir þú, hversu lengi og virkaði það?

**Birtist ef:** `sym-tried` = `painkillers` EÐA `sym-tried` = `antihistamine` EÐA `sym-tried` = `cream` EÐA `sym-tried` = `otc` EÐA `sym-tried` = `supplements` EÐA `sym-tried` = `other`

*Skýring í reit:* t.d. Íbúfen 400 mg þrisvar á dag í 3 daga, hjálpaði lítillega

---

## Síða 5 · Lyfjaerindi

**Öll síðan birtist ef:** `erindi-type` = `medication`

### 5.1 · `med-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers konar lyfjaerindi er þetta?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `renewal` | Endurnýjun á lyfi sem ég nota nú þegar |
| `side-effect` | Aukaverkun eða vandamál af lyfi |
| `question` | Spurning um lyf, skammta eða milliverkanir |
| `new` | Nýtt lyf sem ég tel mig þurfa |

### 5.2 · `med-controlled`

Skýringartexti

> Athugið: ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu. Það á meðal annars við um ópíóíða, róandi lyf, svefnlyf og ADHD-lyf. Slíkum beiðnum er vísað á heimilislækni.

### 5.3 · `med-name`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Heiti lyfs og styrkur

*Skýring í reit:* t.d. Losartan 50 mg

*Hjálpartexti:* Skrifaðu nákvæmlega eins og stendur á pakkningunni. Þú mátt senda mynd af pakkningunni síðar í þessari beiðni.

### 5.4 · `med-dose`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Skammtur og hversu oft þú tekur lyfið

*Skýring í reit:* t.d. 1 tafla að morgni

### 5.5 · `med-duration`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hversu lengi hefur þú notað lyfið?

**Birtist ef:** `med-type` = `renewal` EÐA `med-type` = `side-effect` EÐA `med-type` = `question`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `today` | Í dag |
| `1-3d` | 1–3 daga |
| `4-7d` | 4–7 daga |
| `1-2w` | 1–2 vikur |
| `2-4w` | 2–4 vikur |
| `1-3m` | 1–3 mánuði |
| `3-12m` | 3–12 mánuði |
| `over-1y` | Lengur en ár |

### 5.6 · `med-prescriber`

Stuttur texti — ein lína

**Spurning:** Hver ávísaði lyfinu síðast og hvenær, eftir bestu vitund?

**Birtist ef:** `med-type` = `renewal` EÐA `med-type` = `side-effect` EÐA `med-type` = `question`

*Skýring í reit:* t.d. heimilislæknir á Heilsugæslunni Efra-Breiðholti, í fyrra

### 5.7 · `med-supply`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvenær klárast lyfið hjá þér?

**Birtist ef:** `med-type` = `renewal`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `out` | Það er þegar búið |
| `week` | Innan viku |
| `month` | Innan mánaðar |
| `later` | Seinna en eftir mánuð |

### 5.8 · `med-side-effect-what`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða aukaverkun finnur þú fyrir og hvenær byrjaði hún?

**Birtist ef:** `med-type` = `side-effect`

*Skýring í reit:* Lýstu einkennunum og hvort þú hefur breytt skammti eða hætt að taka lyfið

### 5.9 · `med-change`

Langur texti — textareitur

**Spurning:** Hefur eitthvað breyst hjá þér síðan lyfinu var síðast ávísað?

*Skýring í reit:* t.d. ný lyf, ný einkenni, þungun, breytt þyngd, nýjar greiningar. Skrifaðu „ekkert“ ef svo er ekki.

### 5.10 · `med-monitoring`

Einn valkostur — radio

**Spurning:** Hefur þú farið í eftirlit eða blóðprufu vegna þessa lyfs síðustu 12 mánuði?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

---

## Síða 6 · Niðurstöður og eftirfylgd

**Öll síðan birtist ef:** `erindi-type` = `results`

### 6.1 · `res-what`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvaða rannsókn eða niðurstöður snýst erindið um?

*Skýring í reit:* t.d. blóðprufa, röntgen, sýnataka, þvagprufa

### 6.2 · `res-where`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvar og hvenær var rannsóknin gerð?

*Skýring í reit:* t.d. Heilsugæslan Árbæ, 12. mars

### 6.3 · `res-question`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hverju viltu fá svarað?

*Skýring í reit:* t.d. hvað niðurstöðurnar þýða, hvort þarf frekari rannsóknir, hvort á að breyta meðferð

### 6.4 · `res-attach`

Skýringartexti

> Ef þú átt niðurstöðurnar á blaði eða í appi, taktu skjámynd eða mynd og hengdu hana við síðar í þessari beiðni.

---

## Síða 7 · Vottorð

**Öll síðan birtist ef:** `erindi-type` = `certificate`

### 7.1 · `cert-policy`

Skýringartexti

> Læknir getur aðeins gefið út vottorð um það sem hann getur staðfest með mati sínu. Vottorð aftur í tímann fyrir veikindi sem enginn læknir hefur metið eru almennt ekki gefin út.

### 7.2 · `cert-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers konar vottorð þarft þú?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `sick-work` | Veikindavottorð fyrir vinnuveitanda |
| `sick-school` | Vottorð fyrir skóla |
| `travel` | Ferðavottorð eða vottorð vegna flugs |
| `sports` | Íþrótta- eða heilbrigðisvottorð |
| `other` | Annað |

### 7.3 · `cert-period`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Fyrir hvaða tímabil á vottorðið að gilda?

*Skýring í reit:* t.d. 3.–7. maí

### 7.4 · `cert-reason`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hver er ástæða vottorðsins?

*Skýring í reit:* Lýstu veikindunum eða ástæðunni og hvort þú hefur þegar verið metin eða metinn af lækni

### 7.5 · `cert-recipient`

Stuttur texti — ein lína

**Spurning:** Hver á að fá vottorðið og í hvaða formi?

*Skýring í reit:* t.d. vinnuveitandi, sent í tölvupósti

---

## Síða 8 · Um heilsu þína

**Sýnd öllum.**

### 8.1 · `bg-intro`

Skýringartexti

> Þessar upplýsingar hafa áhrif á hvaða meðferð er örugg fyrir þig. Svaraðu þeim jafnvel þótt þér finnist þær ótengdar erindinu.

### 8.2 · `bg-chronic`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með langvinna sjúkdóma eða greiningar?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 8.3 · `bg-chronic-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða sjúkdómar eða greiningar?

**Birtist ef:** `bg-chronic` = `yes`

*Skýring í reit:* t.d. sykursýki, astmi, háþrýstingur, skjaldkirtilssjúkdómur, hjartasjúkdómur, nýrnasjúkdómur, geðgreining

### 8.4 · `bg-meds`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Notar þú lyf að staðaldri?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 8.5 · `bg-meds-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða lyf, styrk og skammt?

**Birtist ef:** `bg-meds` = `yes`

*Skýring í reit:* Skrifaðu öll lyf, líka getnaðarvarnir, bætiefni, náttúrulyf og lyf sem þú kaupir án lyfseðils. Eitt lyf í hverja línu.

### 8.6 · `bg-allergy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með lyfjaofnæmi eða annað ofnæmi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 8.7 · `bg-allergy-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða ofnæmi og hvernig lýsir það sér?

**Birtist ef:** `bg-allergy` = `yes`

*Skýring í reit:* t.d. penisillín – útbrot, eða hnetur – bólga í hálsi

### 8.8 · `bg-pregnancy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu þunguð eða með barn á brjósti?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei |
| `pregnant` | Já, ég er þunguð |
| `breastfeeding` | Já, ég er með barn á brjósti |
| `possible` | Möguleiki er á þungun |
| `na` | Á ekki við |

*Hjálpartexti:* Mörg lyf eru ekki örugg á meðgöngu eða við brjóstagjöf, þess vegna spyrjum við alltaf.

### 8.9 · `bg-nicotine`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Reykir þú eða notar nikótín?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei, aldrei |
| `quit` | Hætt eða hættur |
| `smoke` | Já, sígarettur |
| `vape-pouch` | Já, rafrettur eða nikótínpúða |

### 8.10 · `bg-alcohol`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hversu oft drekkur þú áfengi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `never` | Aldrei |
| `monthly` | Sjaldnar en vikulega |
| `weekly` | Vikulega |
| `daily` | Daglega eða næstum daglega |

### 8.11 · `bg-travel`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú ferðast erlendis síðustu 4 vikur?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 8.12 · `bg-travel-where`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvert ferðaðist þú og hvenær komst þú heim?

**Birtist ef:** `bg-travel` = `yes`

*Skýring í reit:* t.d. Taíland, kom heim 2. júní

### 8.13 · `bg-height`

Tala með einingu — cm

**Spurning:** Hæð

*Hjálpartexti:* Hæð og þyngd eru notaðar til að reikna örugga lyfjaskammta.

### 8.14 · `bg-weight`

Tala með einingu — kg

**Spurning:** Þyngd

---

## Síða 9 · Lýstu vandamálinu með þínum eigin orðum

**Sýnd öllum.**

### 9.1 · `free-guide`

Skýringartexti

> Nú er komið að aðalatriðinu. Skrifaðu eins og þú værir að segja lækninum frá þessu í viðtali.
>
> Reyndu að koma þessu að:
>
> 1. Hvað er að og hvar á líkamanum?
> 2. Hvenær byrjaði það og hvernig hefur það þróast síðan?
> 3. Hvernig lýsir þetta sér nákvæmlega – hvernig lítur það út eða hvernig finnst þér það?
> 4. Hvað gerir það betra eða verra?
> 5. Hvað hefur þú gert við því hingað til?
> 6. Hvað viltu helst fá út úr þessu erindi?
>
> Það er engin þörf á að nota læknisfræðileg orð. Skrifaðu frekar of mikið en of lítið – læknirinn sér ekkert annað en það sem þú skrifar.

### 9.2 · `free-text`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Lýsing á vandamálinu

*Skýring í reit:* Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.

### 9.3 · `free-worry`

Langur texti — textareitur

**Spurning:** Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti verið?

*Skýring í reit:* Það er í lagi að segja það hreint út. Læknirinn svarar því sérstaklega.

*Hjálpartexti:* Þessi spurning er ekki formsatriði. Áhyggjur sjúklings eru oft besta vísbendingin um hvað þarf að útiloka.

### 9.4 · `free-extra`

Langur texti — textareitur

**Spurning:** Er eitthvað annað sem læknirinn ætti að vita?

*Skýring í reit:* t.d. eitthvað í fjölskyldunni, vinnuaðstæður, fyrri reynsla af meðferð. Þú mátt sleppa þessu.

---

## Síða 10 · Myndir

**Sýnd öllum.**

### 10.1 · `img-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Er eitthvað sýnilegt sem myndi hjálpa lækninum að sjá?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

*Hjálpartexti:* t.d. útbrot, sár, bólga, auga, nögl, lyfjapakkning eða niðurstöður úr rannsókn.

### 10.2 · `img-tips`

Skýringartexti

> Svona verður myndin gagnleg:
>
> • Taktu myndina í góðri dagsbirtu, ekki með flassi.
> • Taktu tvær myndir: eina nærmynd og eina þar sem sést hvar á líkamanum þetta er.
> • Leggðu fingur eða mynt við hliðina svo stærðin sjáist.
> • Hreinsaðu krem eða farða af húðinni áður.
> • Ef þetta breytist dag frá degi, sendu líka eldri mynd ef þú átt hana.
>
> Sendu ekki myndir sem sýna andlit eða kynfæri nema það sé nauðsynlegt fyrir matið.

**Birtist ef:** `img-gate` = `yes`

### 10.3 · `img-files`

Viðhengi — mynd

**Spurning:** Hengdu myndir við hér

**Birtist ef:** `img-gate` = `yes`

---

## Síða 11 · Væntingar og staðfesting

**Sýnd öllum.**

### 11.1 · `exp-wish`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hverju vonast þú eftir frá þessu erindi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `advice` | Mati og ráðgjöf um hvað ég á að gera |
| `prescription` | Lyfseðli |
| `referral` | Tilvísun til sérfræðings |
| `tests` | Beiðni um rannsókn, t.d. blóðprufu eða myndatöku |
| `certificate` | Vottorði |
| `unsure` | Ég veit það ekki, ég vil bara láta meta þetta |

*Hjálpartexti:* Þetta hjálpar okkur að forðast misskilning. Læknirinn metur sjálfstætt hvað á við, en það er gott að vita hvað þú vonaðist eftir.

### 11.2 · `contact-phone`

Stuttur texti — ein lína

**Spurning:** Símanúmer sem má hringja í ef læknirinn þarf að ná í þig

*Skýring í reit:* t.d. 6XX XXXX

### 11.3 · `final-intro`

Skýringartexti

> Að lokum, staðfestu eftirfarandi:

### 11.4 · `final-truth`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Upplýsingarnar sem ég hef gefið eru réttar eftir minni bestu vitund.

### 11.5 · `final-noexam`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að læknirinn getur ekki skoðað mig og getur því þurft að vísa mér í staðbundna skoðun eða hafna erindinu.

### 11.6 · `final-notemergency`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að þetta er ekki neyðarþjónusta og að svar berst innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22.

### 11.7 · `final-privacy`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég samþykki að Fjarlækningar vinni þessar heilsufarsupplýsingar í samræmi við persónuverndarstefnu félagsins.

### 11.8 · `final-thanks`

Skýringartexti

> Takk fyrir. Erindið fer nú til læknis sem les það og svarar þér. Ef ástand þitt versnar á meðan þú bíður, hringdu í 1700 eða 112.

