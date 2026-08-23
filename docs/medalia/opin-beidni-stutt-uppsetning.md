# Opin beiðni, stutt útgáfa — uppsetningarblað fyrir Medalia

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

### 1.1 · `intro-all`

Skýringartexti

> Þú lýsir vandamálinu, læknir les og svarar þér skriflega [SVARTÍMI – t.d. innan 24 klst. á virkum dögum]. Læknirinn getur ekki skoðað þig og gæti því vísað þér í skoðun eða hafnað erindinu. Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu.
>
> ⚠️ Þetta er ekki neyðarþjónusta. Hringdu í 112 vegna bráðra veikinda eða slysa, 1700 til að fá ráðgjöf strax, 543 2222 vegna eitrunar.
>
> [GJALDSKRÁ – t.d. Gjald fyrir erindið er X kr.]
>
> Læknirinn sér aðeins það sem þú skrifar hér.

### 1.2 · `intro-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég hef lesið ofangreint og skil að þetta er ekki neyðarþjónusta.

---

## Síða 2 · Öryggisskimun

**Sýnd öllum.**

### 2.1 · `rf-intro`

Skýringartexti

> Lestu listann og svaraðu svo spurningunni fyrir neðan:
>
> • Verkur eða þyngsli fyrir brjósti
> • Andþyngsli eða öndunarerfiðleikar í hvíld
> • Skyndilegt máttleysi, dofi, talörðugleikar eða sjónskerðing
> • Skyndilegur og mjög mikill höfuðverkur, ólíkur öllu fyrri
> • Meðvitundarleysi, yfirlið eða rugl
> • Miklir eða vaxandi kviðverkir
> • Blóð í uppköstum, svartar eða blóðugar hægðir
> • Hiti með stífum hnakka, ljósfælni eða útbrotum sem hverfa ekki við þrýsting
> • Bólga í andliti, vörum eða tungu eftir lyf, fæðu eða stungu
> • Blæðing eða verkir á meðgöngu
> • Alvarlegur áverki eða mikil blæðing
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

**Spurning:** Hvað af þessu á við?

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
| `self-harm` | Sjálfsvígshugsanir |

### 2.4 · `rf-warning`

Skýringartexti

> ⚠️ Stöðvaðu hér og leitaðu aðstoðar strax.
>
> Hringdu í 112 ef ástandið er bráðt, 1700 til að fá ráðgjöf strax, eða farðu á næstu bráðamóttöku. Sjálfsvígshugsanir: 1717 eða 112.
>
> Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

### 2.5 · `rf-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta erindi kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

---

## Síða 3 · Hvað er að?

**Sýnd öllum.**

### 3.1 · `erindi-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers eðlis er erindið?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `new-problem` | Nýtt einkenni eða nýtt heilsuvandamál |
| `known-problem` | Þekkt vandamál sem hefur breyst eða versnað |
| `medication` | Lyf – endurnýjun, aukaverkun eða spurning |
| `results` | Niðurstöður úr rannsókn eða eftirfylgd |
| `certificate` | Vottorð eða staðfesting |
| `other` | Annað eða ég er ekki viss |

### 3.2 · `free-guide`

Skýringartexti

> Skrifaðu eins og þú værir að segja lækninum frá þessu. Reyndu að koma þessu að:
>
> 1. Hvað er að og hvar á líkamanum?
> 2. Hvenær byrjaði það, byrjaði það skyndilega, og gerðist eitthvað sérstakt á undan?
> 3. Hvernig lýsir þetta sér — hvernig lítur það út eða hvernig finnst þér það?
> 4. Hvað gerir það betra eða verra?
> 5. Hvað hefur þú prófað sjálf eða sjálfur og virkaði það?
> 6. Hefur þú fengið þetta áður og hvað var gert þá?
>
> Engin þörf á læknisfræðilegum orðum. Skrifaðu frekar of mikið en of lítið.

### 3.3 · `free-text`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Lýsing á vandamálinu

*Skýring í reit:* Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.

### 3.4 · `free-worry`

Langur texti — textareitur

**Spurning:** Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti verið?

*Skýring í reit:* Það er í lagi að segja það hreint út. Læknirinn svarar því sérstaklega.

*Hjálpartexti:* Áhyggjur sjúklings eru oft besta vísbendingin um hvað þarf að útiloka.

---

## Síða 4 · Nokkur atriði sem gleymast oft

**Öll síðan birtist ef:** `erindi-type` = `new-problem` EÐA `erindi-type` = `known-problem`

### 4.1 · `sym-duration`

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

### 4.2 · `sym-course`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvernig hefur þetta þróast?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `worse` | Versnandi |
| `same` | Óbreytt |
| `better` | Batnandi |
| `fluctuating` | Kemur og fer |

### 4.3 · `sym-impact`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hversu mikil áhrif hefur þetta á daglegt líf þitt?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `none` | Engin |
| `mild` | Lítil – ég næ að sinna flestu |
| `moderate` | Töluverð – ég hef þurft að draga úr |
| `severe` | Mikil – ég kemst ekki í vinnu eða skóla |

### 4.4 · `sym-fever`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með hita?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `measured` | Já, ég hef mælt hann |
| `feels` | Mér finnst það en hef ekki mælt |
| `no` | Nei |
| `unsure` | Veit ekki |

### 4.5 · `sym-fever-temp`

Tala með einingu — °C

**Spurning:** Hæsti mældur hiti (°C)

**Birtist ef:** `sym-fever` = `measured`

### 4.6 · `sym-pain-score`

Tala 0–10 — hnappar

**Spurning:** Verkir núna? 0 = engir verkir, 10 = verstu verkir sem þú getur ímyndað þér.

### 4.7 · `sym-seen-doctor`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú þegar leitað til læknis eða heilsugæslu vegna þessa?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 4.8 · `sym-seen-doctor-what`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvert leitaðir þú, hvenær og hvað var gert?

**Birtist ef:** `sym-seen-doctor` = `yes`

*Skýring í reit:* t.d. heilsugæslan í síðustu viku, tekin þvagprufa, fékk sýklalyf í 5 daga

---

## Síða 5 · Lyfið

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

> Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu — meðal annars ópíóíðum, róandi lyfjum, svefnlyfjum og ADHD-lyfjum.

### 5.3 · `med-name`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Heiti lyfs og styrkur

*Skýring í reit:* t.d. Losartan 50 mg

*Hjálpartexti:* Skrifaðu nákvæmlega eins og stendur á pakkningunni, eða sendu mynd af henni aftar í þessari beiðni.

### 5.4 · `med-dose`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Skammtur og hversu oft þú tekur lyfið

*Skýring í reit:* t.d. 1 tafla að morgni

### 5.5 · `med-supply`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvenær klárast lyfið hjá þér?

**Birtist ef:** `med-type` = `renewal`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `out` | Það er þegar búið |
| `week` | Innan viku |
| `month` | Innan mánaðar |
| `later` | Seinna en eftir mánuð |

### 5.6 · `med-side-effect-what`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða aukaverkun finnur þú fyrir og hvenær byrjaði hún?

**Birtist ef:** `med-type` = `side-effect`

*Skýring í reit:* Segðu líka hvort þú hefur breytt skammti eða hætt að taka lyfið

### 5.7 · `med-monitoring`

Einn valkostur — radio

**Spurning:** Hefur þú farið í eftirlit eða blóðprufu vegna þessa lyfs síðustu 12 mánuði?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

---

## Síða 6 · Rannsóknin

**Öll síðan birtist ef:** `erindi-type` = `results`

### 6.1 · `res-what`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvaða rannsókn eða niðurstöður snýst erindið um?

*Skýring í reit:* t.d. blóðprufa, röntgen, sýnataka

### 6.2 · `res-where`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvar og hvenær var hún gerð?

*Skýring í reit:* t.d. Heilsugæslan Árbæ, 12. mars

---

## Síða 7 · Vottorðið

**Öll síðan birtist ef:** `erindi-type` = `certificate`

### 7.1 · `cert-policy`

Skýringartexti

> Læknir getur aðeins vottað það sem hann getur staðfest með mati sínu. Vottorð aftur í tímann fyrir veikindi sem enginn læknir hefur metið eru almennt ekki gefin út.

### 7.2 · `cert-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers konar vottorð þarft þú?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `sick-work` | Veikindavottorð fyrir vinnuveitanda |
| `sick-school` | Vottorð fyrir skóla |
| `travel` | Ferðavottorð |
| `sports` | Íþrótta- eða heilbrigðisvottorð |
| `other` | Annað |

### 7.3 · `cert-period`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Fyrir hvaða tímabil?

*Skýring í reit:* t.d. 3.–7. maí

---

## Síða 8 · Öryggisatriði og myndir

**Sýnd öllum.**

### 8.1 · `bg-intro`

Skýringartexti

> Þessar fjórar spurningar ráða því hvaða meðferð er örugg fyrir þig. Svaraðu þeim jafnvel þótt þér finnist þær ótengdar.

### 8.2 · `bg-meds`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Notar þú lyf að staðaldri?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 8.3 · `bg-meds-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða lyf, styrk og skammt?

**Birtist ef:** `bg-meds` = `yes`

*Skýring í reit:* Líka getnaðarvarnir, bætiefni og lyf án lyfseðils. Eitt lyf í hverja línu.

### 8.4 · `bg-allergy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með lyfjaofnæmi eða annað ofnæmi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 8.5 · `bg-allergy-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða ofnæmi og hvernig lýsir það sér?

**Birtist ef:** `bg-allergy` = `yes`

*Skýring í reit:* t.d. penisillín – útbrot

### 8.6 · `bg-chronic`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með langvinna sjúkdóma eða greiningar?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 8.7 · `bg-chronic-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða sjúkdómar eða greiningar?

**Birtist ef:** `bg-chronic` = `yes`

*Skýring í reit:* t.d. sykursýki, astmi, háþrýstingur, skjaldkirtilssjúkdómur

### 8.8 · `bg-pregnancy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu þunguð eða með barn á brjósti?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei |
| `pregnant` | Já, ég er þunguð |
| `breastfeeding` | Já, með barn á brjósti |
| `possible` | Möguleiki er á þungun |
| `na` | Á ekki við |

### 8.9 · `img-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Er eitthvað sýnilegt sem myndi hjálpa lækninum að sjá?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

*Hjálpartexti:* t.d. útbrot, sár, bólga, auga, lyfjapakkning eða niðurstöður úr rannsókn.

### 8.10 · `img-tips`

Skýringartexti

> Góð mynd: dagsbirta og ekkert flass, ein nærmynd og ein þar sem sést hvar á líkamanum þetta er, fingur eða mynt við hliðina svo stærðin sjáist, og krem eða farði þurrkað af.

**Birtist ef:** `img-gate` = `yes`

### 8.11 · `img-files`

Viðhengi — mynd

**Spurning:** Hengdu myndir við hér

**Birtist ef:** `img-gate` = `yes`

---

## Síða 9 · Staðfesting

**Sýnd öllum.**

### 9.1 · `exp-wish`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hverju vonast þú eftir?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `advice` | Mati og ráðgjöf |
| `prescription` | Lyfseðli |
| `referral` | Tilvísun til sérfræðings |
| `tests` | Beiðni um rannsókn |
| `certificate` | Vottorði |
| `unsure` | Veit ekki, vil bara láta meta þetta |

*Hjálpartexti:* Læknirinn metur sjálfstætt hvað á við, en það er gott að vita hvað þú vonaðist eftir.

### 9.2 · `final-all`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég staðfesti að upplýsingarnar eru réttar eftir minni bestu vitund, að ég skil að læknirinn getur ekki skoðað mig og gæti þurft að vísa mér áfram eða hafna erindinu, og ég samþykki að Fjarlækningar vinni þessar heilsufarsupplýsingar samkvæmt persónuverndarstefnu félagsins.

### 9.3 · `final-thanks`

Skýringartexti

> Takk fyrir. Læknir les erindið og svarar þér. Ef þér versnar á meðan þú bíður, hringdu í 1700 eða 112.

