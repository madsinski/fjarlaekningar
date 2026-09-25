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

### 1.1 · `intro-all`

Skýringartexti

> Þú lýsir vandamálinu, læknir les og svarar þér skriflega innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22. Læknirinn getur ekki skoðað þig og gæti því vísað þér í skoðun eða hafnað erindinu. Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu.
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
> Hringdu í 112 ef ástandið er brátt, 1700 til að fá ráðgjöf strax, eða farðu á næstu bráðamóttöku. Sjálfsvígshugsanir: 1717 eða 112.
>
> Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

### 2.5 · `rf-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta erindi kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

---

## Síða 3 · Hentar erindið fjarþjónustu?

**Sýnd öllum.**

### 3.1 · `reg-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu skráð eða skráður á heilsugæslu þar sem þjónustan er í boði?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

*Hjálpartexti:* Þjónustan er enn sem komið er aðeins í boði fyrir fólk sem er skráð á: Heilsugæslan í Vestmannaeyjum. Ertu ekki viss? Þú sérð á hvaða heilsugæslu þú ert skráð eða skráður á Mínum síðum á island.is.

### 3.2 · `reg-stop`

Skýringartexti

> ⛔ Þjónustan er ekki enn opin á þinni heilsugæslu.
>
> Fjarlækningar opna fyrir þjónustuna eina heilsugæslu í einu og fleiri heilsugæslur á Suðurlandi bætast við á næstunni. Þangað til skaltu hafa samband við heilsugæsluna þína, eða hringja í 1700 ef þú þarft ráð strax.
>
> Þú þarft ekki að senda erindið. Ef þú merktir við þetta fyrir mistök, breyttu svarinu í „Já“ til að halda áfram.

**Birtist ef:** `reg-gate` = `no`

### 3.3 · `scope-intro`

Skýringartexti

> Sumt er ekki hægt að leysa í skriflegri fjarþjónustu, sama hversu vel því er lýst. Lestu listann og svaraðu svo spurningunni fyrir neðan. Þannig sparar þú þér bið eftir svari sem getur ekki hjálpað þér.
>
> • Erindið snýst um einhvern annan en þig, til dæmis barnið þitt, maka eða foreldri.
> • Þú vilt fá beiðni um blóðprufu eða aðra rannsókn, til dæmis þvag- eða hormónamælingu.
> • Þú vilt fá beiðni um myndgreiningu (röntgen, tölvusneiðmynd, segulómun eða ómun) eða speglun (til dæmis maga- eða ristilspeglun).
> • Þú vilt fá tilvísun til sérfræðings vegna vandamáls sem þarf nánari sögu og skoðun.
> • Vandamálið þarf skoðun, til dæmis að hlusta á hjarta eða lungu, skoða eyru eða háls, þreifa á kvið eða meta áverka, hnút eða fyrirferð.
> • Þú vilt fá lyfseðil fyrir lyf sem þú færð skömmtuð í lyfjarúllu frá apóteki, eða breytingu á skömmtuninni.

**Birtist ef:** `reg-gate` = `yes`

### 3.4 · `scope-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Á eitthvað af ofangreindu við um erindið þitt?

**Birtist ef:** `reg-gate` = `yes`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

*Hjálpartexti:* Viltu aðeins fá útskýringu á niðurstöðum sem þú hefur þegar fengið, eða endurnýjun á lyfi sem þú sækir sjálf eða sjálfur í apótek? Það getum við gert. Svaraðu þá „Nei“.

### 3.5 · `scope-stop`

Skýringartexti

> ⛔ Við getum ekki afgreitt þetta erindi í fjarþjónustu.
>
> Það er ekki vegna þess að erindið skipti ekki máli, heldur vegna þess að það þarf þjónustu sem ekki er hægt að veita skriflega. Merktu við hvað á við og þá sérðu hvert þú getur leitað.
>
> Þú þarft ekki að senda erindið. Ef þú merktir við þetta fyrir mistök, breyttu svarinu í „Nei“ til að halda áfram.

**Birtist ef:** `scope-gate` = `yes`

### 3.6 · `scope-which`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hvað af þessu á við? Merktu við allt sem á við.

**Birtist ef:** `scope-gate` = `yes`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `other-person` | Erindið snýst um barn eða annan einstakling |
| `lab-tests` | Beiðni um blóðprufu eða aðra rannsókn |
| `imaging` | Beiðni um myndgreiningu eða speglun |
| `referral` | Tilvísun sem þarf nánari sögu og skoðun |
| `exam` | Vandamál sem þarf að skoða |
| `dose-dispensed` | Lyf í lyfjarúllu (lyfjaskömmtun) |

### 3.7 · `scope-why-other-person`

Skýringartexti

> Erindi fyrir aðra
>
> Læknir getur aðeins metið þann sem sendir erindið sjálfur, skráður inn með eigin rafrænum skilríkjum. Við getum ekki metið barn eða annan einstakling út frá lýsingu þinni.
>
> • Fullorðnir geta sent eigið erindi hingað.
> • Vegna barna: hafðu samband við heilsugæslu barnsins, eða hringdu í 1700 til að fá ráðgjöf.
> • Veikist barn skyndilega eða alvarlega: farðu á næstu bráðamóttöku eða hringdu í 112.

**Birtist ef:** `scope-which` = `other-person`

### 3.8 · `scope-why-lab-tests`

Skýringartexti

> Blóðprufur og aðrar rannsóknir
>
> Við biðjum ekki um rannsóknir í fjarþjónustu. Læknirinn sem biður um rannsókn ber ábyrgð á að fylgja niðurstöðunum eftir og það er best gert þar sem þú ert í reglulegri eftirfylgd.
>
> • Hafðu samband við heilsugæsluna þína eða heimilislækni.
> • Viltu aðeins fá útskýringu á niðurstöðum sem þú hefur þegar fengið? Það getum við gert. Breyttu þá svarinu hér fyrir ofan í „Nei“.

**Birtist ef:** `scope-which` = `lab-tests`

### 3.9 · `scope-why-imaging`

Skýringartexti

> Myndgreining og speglanir
>
> Beiðni um myndgreiningu eða speglun þarf að byggja á viðtali og skoðun, og niðurstöðunum þarf að fylgja eftir. Það er ekki hægt í skriflegri fjarþjónustu.
>
> • Hafðu samband við heilsugæsluna þína eða heimilislækni.
> • Eftir slys eða áverka: farðu á slysa- og bráðamóttöku.

**Birtist ef:** `scope-which` = `imaging`

### 3.10 · `scope-why-referral`

Skýringartexti

> Tilvísanir
>
> Góð tilvísun byggir á ítarlegri sögu og skoðun svo sérfræðingurinn fái þær upplýsingar sem hann þarf. Það getum við ekki veitt skriflega.
>
> • Hafðu samband við heilsugæsluna þína eða heimilislækni.
> • Fullorðnir geta oft bókað tíma beint hjá sérfræðilækni án tilvísunar.

**Birtist ef:** `scope-which` = `referral`

### 3.11 · `scope-why-exam`

Skýringartexti

> Vandamál sem þarf að skoða
>
> Læknirinn getur ekki hlustað, þreifað eða horft í eyru og háls í gegnum skriflegt erindi. Þegar skoðun ræður greiningunni er ekki öruggt að meta vandamálið hér.
>
> • Hafðu samband við heilsugæsluna þína.
> • Utan opnunartíma heilsugæslunnar: Læknavaktin, sími 1700.
> • Eftir slys eða áverka: farðu á slysa- og bráðamóttöku.

**Birtist ef:** `scope-which` = `exam`

### 3.12 · `scope-why-dose-dispensed`

Skýringartexti

> Lyf í lyfjarúllu
>
> Skömmtuð lyf eru afgreidd eftir skömmtunarkorti sem læknirinn þinn heldur utan um. Til að öll lyfin skili sér rétt í rúlluna þarf sá læknir að gera breytingarnar.
>
> • Hafðu samband við heilsugæsluna þína eða heimilislækni.
> • Apótekið sem skammtar lyfin getur leiðbeint þér um næstu skref.

**Birtist ef:** `scope-which` = `dose-dispensed`

---

## Síða 4 · Hvað er að?

**Öll síðan birtist ef:** `scope-gate` = `no`

### 4.1 · `erindi-type`

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

### 4.2 · `free-guide`

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

### 4.3 · `free-text`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Lýsing á vandamálinu

*Skýring í reit:* Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.

### 4.4 · `free-worry`

Langur texti — textareitur

**Spurning:** Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti verið?

*Skýring í reit:* Það er í lagi að segja það hreint út. Læknirinn svarar því sérstaklega.

*Hjálpartexti:* Áhyggjur sjúklings eru oft besta vísbendingin um hvað þarf að útiloka.

---

## Síða 5 · Nokkur atriði sem gleymast oft

**Öll síðan birtist ef:** `erindi-type` = `new-problem` EÐA `erindi-type` = `known-problem`

### 5.1 · `sym-duration`

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

### 5.2 · `sym-course`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvernig hefur þetta þróast?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `worse` | Versnandi |
| `same` | Óbreytt |
| `better` | Batnandi |
| `fluctuating` | Kemur og fer |

### 5.3 · `sym-impact`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hversu mikil áhrif hefur þetta á daglegt líf þitt?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `none` | Engin |
| `mild` | Lítil – ég næ að sinna flestu |
| `moderate` | Töluverð – ég hef þurft að draga úr |
| `severe` | Mikil – ég kemst ekki í vinnu eða skóla |

### 5.4 · `sym-fever`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með hita?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `measured` | Já, ég hef mælt hann |
| `feels` | Mér finnst það en hef ekki mælt |
| `no` | Nei |
| `unsure` | Veit ekki |

### 5.5 · `sym-fever-temp`

Tala með einingu — °C

**Spurning:** Hæsti mældur hiti (°C)

**Birtist ef:** `sym-fever` = `measured`

### 5.6 · `sym-pain-score`

Tala 0–10 — hnappar

**Spurning:** Verkir núna? 0 = engir verkir, 10 = verstu verkir sem þú getur ímyndað þér.

### 5.7 · `sym-seen-doctor`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú þegar leitað til læknis eða heilsugæslu vegna þessa?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 5.8 · `sym-seen-doctor-what`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvert leitaðir þú, hvenær og hvað var gert?

**Birtist ef:** `sym-seen-doctor` = `yes`

*Skýring í reit:* t.d. heilsugæslan í síðustu viku, tekin þvagprufa, fékk sýklalyf í 5 daga

---

## Síða 6 · Lyfið

**Öll síðan birtist ef:** `erindi-type` = `medication`

### 6.1 · `med-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers konar lyfjaerindi er þetta?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `renewal` | Endurnýjun á lyfi sem ég nota nú þegar |
| `side-effect` | Aukaverkun eða vandamál af lyfi |
| `question` | Spurning um lyf, skammta eða milliverkanir |
| `new` | Nýtt lyf sem ég tel mig þurfa |

### 6.2 · `med-controlled`

Skýringartexti

> Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu — meðal annars ópíóíðum, róandi lyfjum, svefnlyfjum og ADHD-lyfjum.

### 6.3 · `med-name`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Heiti lyfs og styrkur

*Skýring í reit:* t.d. Losartan 50 mg

*Hjálpartexti:* Skrifaðu nákvæmlega eins og stendur á pakkningunni, eða sendu mynd af henni aftar í þessari beiðni.

### 6.4 · `med-dose`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Skammtur og hversu oft þú tekur lyfið

*Skýring í reit:* t.d. 1 tafla að morgni

### 6.5 · `med-supply`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvenær klárast lyfið hjá þér?

**Birtist ef:** `med-type` = `renewal`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `out` | Það er þegar búið |
| `week` | Innan viku |
| `month` | Innan mánaðar |
| `later` | Seinna en eftir mánuð |

### 6.6 · `med-side-effect-what`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða aukaverkun finnur þú fyrir og hvenær byrjaði hún?

**Birtist ef:** `med-type` = `side-effect`

*Skýring í reit:* Segðu líka hvort þú hefur breytt skammti eða hætt að taka lyfið

### 6.7 · `med-monitoring`

Einn valkostur — radio

**Spurning:** Hefur þú farið í eftirlit eða blóðprufu vegna þessa lyfs síðustu 12 mánuði?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

---

## Síða 7 · Rannsóknin

**Öll síðan birtist ef:** `erindi-type` = `results`

### 7.1 · `res-what`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvaða rannsókn eða niðurstöður snýst erindið um?

*Skýring í reit:* t.d. blóðprufa, röntgen, sýnataka

### 7.2 · `res-where`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvar og hvenær var hún gerð?

*Skýring í reit:* t.d. Heilsugæslan Árbæ, 12. mars

---

## Síða 8 · Vottorðið

**Öll síðan birtist ef:** `erindi-type` = `certificate`

### 8.1 · `cert-policy`

Skýringartexti

> Læknir getur aðeins vottað það sem hann getur staðfest með mati sínu. Vottorð aftur í tímann fyrir veikindi sem enginn læknir hefur metið eru almennt ekki gefin út.

### 8.2 · `cert-type`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvers konar vottorð þarft þú?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `sick-work` | Veikindavottorð fyrir vinnuveitanda |
| `sick-school` | Vottorð fyrir skóla |
| `travel` | Ferðavottorð |
| `sports` | Íþrótta- eða heilbrigðisvottorð |
| `other` | Annað |

### 8.3 · `cert-period`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Fyrir hvaða tímabil?

*Skýring í reit:* t.d. 3.–7. maí

---

## Síða 9 · Öryggisatriði og myndir

**Öll síðan birtist ef:** `scope-gate` = `no`

### 9.1 · `bg-intro`

Skýringartexti

> Þessar fjórar spurningar ráða því hvaða meðferð er örugg fyrir þig. Svaraðu þeim jafnvel þótt þér finnist þær ótengdar.

### 9.2 · `bg-meds`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Notar þú lyf að staðaldri?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 9.3 · `bg-meds-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða lyf, styrk og skammt?

**Birtist ef:** `bg-meds` = `yes`

*Skýring í reit:* Líka getnaðarvarnir, bætiefni og lyf án lyfseðils. Eitt lyf í hverja línu.

### 9.4 · `bg-allergy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með lyfjaofnæmi eða annað ofnæmi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 9.5 · `bg-allergy-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða ofnæmi og hvernig lýsir það sér?

**Birtist ef:** `bg-allergy` = `yes`

*Skýring í reit:* t.d. penisillín – útbrot

### 9.6 · `bg-chronic`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með langvinna sjúkdóma eða greiningar?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 9.7 · `bg-chronic-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða sjúkdómar eða greiningar?

**Birtist ef:** `bg-chronic` = `yes`

*Skýring í reit:* t.d. sykursýki, astmi, háþrýstingur, skjaldkirtilssjúkdómur

### 9.8 · `bg-pregnancy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu þunguð eða með barn á brjósti?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei |
| `pregnant` | Já, ég er þunguð |
| `breastfeeding` | Já, með barn á brjósti |
| `possible` | Möguleiki er á þungun |
| `na` | Á ekki við |

### 9.9 · `img-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Er eitthvað sýnilegt sem myndi hjálpa lækninum að sjá?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

*Hjálpartexti:* t.d. útbrot, sár, bólga, auga, lyfjapakkning eða niðurstöður úr rannsókn.

### 9.10 · `img-tips`

Skýringartexti

> Góð mynd: dagsbirta og ekkert flass, ein nærmynd og ein þar sem sést hvar á líkamanum þetta er, fingur eða mynt við hliðina svo stærðin sjáist, og krem eða farði þurrkað af.

**Birtist ef:** `img-gate` = `yes`

### 9.11 · `img-files`

Viðhengi — mynd

**Spurning:** Hengdu myndir við hér

**Birtist ef:** `img-gate` = `yes`

---

## Síða 10 · Staðfesting

**Öll síðan birtist ef:** `scope-gate` = `no`

### 10.1 · `exp-wish`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hverju vonast þú eftir?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `advice` | Mati og ráðgjöf |
| `prescription` | Lyfseðli |
| `referral` | Tilvísun til sérfræðings |
| `certificate` | Vottorði |
| `unsure` | Veit ekki, vil bara láta meta þetta |

*Hjálpartexti:* Læknirinn metur sjálfstætt hvað á við, en það er gott að vita hvað þú vonaðist eftir.

### 10.2 · `final-all`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég staðfesti að upplýsingarnar eru réttar eftir minni bestu vitund, að ég skil að læknirinn getur ekki skoðað mig og gæti þurft að vísa mér áfram eða hafna erindinu, og ég samþykki að Fjarlækningar vinni þessar heilsufarsupplýsingar samkvæmt persónuverndarstefnu félagsins.

### 10.3 · `final-thanks`

Skýringartexti

> Takk fyrir. Læknir les erindið og svarar þér. Ef þér versnar á meðan þú bíður, hringdu í 1700 eða 112.

