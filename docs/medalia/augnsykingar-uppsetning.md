# Augnsýkingar og augnlokavandamál — uppsetningarblað fyrir Medalia

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

> Þetta erindi er fyrir væg augnvandamál sem eru ekki bráð.
>
> Þú lýsir einkennunum, sendir mynd og læknir metur málið og leggur til meðferð. Læknirinn getur ekki skoðað augað í smásjá, mælt augnþrýsting eða litað hornhimnuna.

### 1.2 · `intro-emergency`

Skýringartexti

> ⚠️ Fjarlækningar eru ekki bráðaþjónusta.
>
> Hringdu í 112 vegna bráðra veikinda eða slysa.
> Hringdu í 1700 (Læknavaktin) til að fá ráðgjöf strax.
> Hringdu í 543 2222 (Eitrunarmiðstöð) vegna eitrunar.

### 1.3 · `intro-scope`

Skýringartexti

> Gott að vita:
>
> • Hentar: hvarmabólga, vogrís og hvarmakýli á augnloki, og óbrotin tárubólga.
> • Hentar ekki: sjónskerðing, augnverkur, ljósfælni, áverki á auga, efni í auga, og rautt auga hjá þeim sem nota augnlinsur.
> • Þurfir þú skoðun eða frekari rannsókn vísar læknir aftur í hefðbundna þjónustu. Mat læknis ræður alltaf.
> • Leggi læknir til lyfjameðferð fer lyfseðill rafrænt í lyfjagátt og er tilbúinn í því apóteki sem þú velur.
> • Svar berst innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22.
> • Læknirinn sér aðeins það sem þú skrifar og sendir hér.

### 1.4 · `intro-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég hef lesið ofangreint og skil að þetta er ekki bráðaþjónusta.

---

## Síða 2 · Öryggisskimun

**Sýnd öllum.**

### 2.1 · `rf-intro`

Skýringartexti

> Fyrst þurfum við að útiloka einkenni sem þola enga bið. Lestu listann og svaraðu svo spurningunni fyrir neðan:
>
> • Sjónin hefur versnað, orðið þokukennd eða þú sérð skugga eða bletti
> • Verulegur verkur í auganu, ekki bara sviði eða aðskotatilfinning
> • Þú þolir illa ljós
> • Áverki á auga, eða þú færð ekki aðskotahlut úr auganu
> • Efni, sápa eða hreinsivökvi fór í augað
> • Hvítur eða skýjaður blettur á sjáaldrinu eða hornhimnunni
> • Blöðruútbrot á enni, augnloki eða nefbroddi
> • Augað stendur út, þú sérð tvöfalt, eða þú getur ekki hreyft augað eðlilega
> • Roði og bólga sem breiðist út í kringum augað ásamt hita
> • Ógleði eða uppköst ásamt augnverk og þokusýn
> • Barn yngra en eins mánaðar með rautt auga eða útferð

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
| `vision` | Sjónin hefur versnað eða orðið þokukennd |
| `pain` | Verulegur verkur í auganu |
| `photophobia` | Ég þoli illa ljós |
| `trauma` | Áverki eða aðskotahlutur í auga |
| `chemical` | Efni fór í augað |
| `corneal` | Hvítur eða skýjaður blettur á auganu |
| `zoster` | Blöðruútbrot á enni, augnloki eða nefi |
| `orbital` | Augað stendur út, tvísýni eða skert augnhreyfing |
| `periorbital` | Útbreiddur roði og bólga með hita |
| `glaucoma` | Ógleði eða uppköst með augnverk og þokusýn |
| `neonate` | Barn yngra en eins mánaðar |

### 2.4 · `rf-warning`

Skýringartexti

> ⚠️ Stöðvaðu hér og leitaðu aðstoðar strax.
>
> Einkennin sem þú merktir við þola ekki bið eftir skriflegu svari.
>
> • Hringdu í 112 ef ástandið er bráðt.
> • Hringdu í 1700 til að fá ráðgjöf strax.
> • Farðu á næstu bráðamóttöku eða heilsugæslu.
>
> Efni í auga: skolaðu augað strax með rennandi vatni í minnst fimmtán mínútur og hringdu í 112 eða Eitrunarmiðstöð í 543 2222 á meðan.
>
> Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu og gæti verið afgreitt of seint.

**Birtist ef:** `rf-gate` = `yes`

### 2.5 · `rf-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta erindi kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

---

## Síða 3 · Augnlinsur

**Sýnd öllum.**

### 3.1 · `cl-use`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Notar þú augnlinsur?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já, ég nota linsur |
| `stopped` | Já, en ég tók þær úr vegna einkennanna |
| `no` | Nei |

*Hjálpartexti:* Þessi spurning ræður úrslitum um hvort erindið hentar fjarþjónustu.

### 3.2 · `cl-warning`

Skýringartexti

> ⚠️ Rautt auga hjá linsunotanda þarf skoðun samdægurs.
>
> Sýking í hornhimnu er algengari hjá þeim sem nota linsur og getur skaðað sjónina á fáum dögum. Hana er ekki hægt að greina af mynd — það þarf smásjárskoðun.
>
> • Taktu linsurnar úr strax og notaðu þær ekki aftur fyrr en augað hefur verið skoðað.
> • Hafðu samband við augnlækni, Læknavaktina í 1700 eða bráðamóttöku augndeildar samdægurs.
> • Hentu linsunum og hylkinu sem voru í notkun.
>
> Þú mátt senda erindið, en læknir mun að öllum líkindum vísa þér í skoðun frekar en að leggja til meðferð.

**Birtist ef:** `cl-use` = `yes` EÐA `cl-use` = `stopped`

### 3.3 · `cl-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að ég á að taka linsurnar úr og leita skoðunar samdægurs.

**Birtist ef:** `cl-use` = `yes` EÐA `cl-use` = `stopped`

---

## Síða 4 · Um einkennin

**Sýnd öllum.**

### 4.1 · `ey-side`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvort augað?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `right` | Hægra |
| `left` | Vinstra |
| `both-together` | Bæði, byrjuðu á sama tíma |
| `both-spread` | Byrjaði í öðru og færðist yfir í hitt |

### 4.2 · `ey-duration`

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

### 4.3 · `ey-course`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvernig hefur þetta þróast?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `worse` | Versnandi |
| `same` | Óbreytt |
| `better` | Batnandi |
| `fluctuating` | Kemur og fer |

### 4.4 · `ey-symptoms`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hvaða einkenni ertu með? Merktu við allt sem á við.

| kóði | það sem sjúklingurinn sér |
|---|---|
| `redness` | Roði í auganu |
| `discharge` | Útferð úr auganu |
| `crusting` | Skorpur á augnhárum, sérstaklega á morgnana |
| `itch` | Kláði |
| `grit` | Aðskotatilfinning eða sandtilfinning |
| `watering` | Augað rennur |
| `lid-swelling` | Bólgið augnlok |
| `lump` | Hnútur eða kúla á augnlokinu |
| `lid-margin` | Roði og flögnun á augnlokabrúninni |
| `dryness` | Þurrkur eða sviði |
| `sticky-morning` | Augað er límt aftur á morgnana |

### 4.5 · `ey-discharge`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvernig er útferðin?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `none` | Engin útferð |
| `watery` | Vatnskennd og tær |
| `mucous` | Slímkennd og hvítleit |
| `purulent` | Gulleit eða grænleit og þykk |

*Hjálpartexti:* Litur og þykkt útferðarinnar segir til um hvers konar tárubólga þetta er og hvort sýklalyf eiga við.

### 4.6 · `ey-lump-where`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvar er hnúturinn og hvernig hefur hann breyst?

**Birtist ef:** `ey-symptoms` = `lump`

*Skýring í reit:* t.d. á efra augnloki, á stærð við baun, byrjaði aumur fyrir viku en er núna verkjalaus

### 4.7 · `ey-vision-check`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Sérðu jafn vel og venjulega með auganu?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `normal` | Já, sjónin er óbreytt |
| `blurry-clears` | Þokukennt en skýrist þegar ég blikka |
| `worse` | Nei, ég sé verr |

*Hjálpartexti:* Þoka sem hverfur við blikk stafar oftast af útferð. Sjón sem er raunverulega verri er annað mál.

### 4.8 · `ey-vision-warning`

Skýringartexti

> ⚠️ Sjónskerðing á ekki heima í fjarþjónustu. Hafðu samband við Læknavaktina í 1700 eða augnlækni samdægurs.

**Birtist ef:** `ey-vision-check` = `worse`

### 4.9 · `ey-eyepain`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með verk í auganu?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `none` | Nei |
| `burning` | Sviði eða óþægindi |
| `real-pain` | Já, raunverulegan verk í auganu |

### 4.10 · `ey-contacts-sick`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Er einhver í kringum þig með rautt auga, kvef eða hálsbólgu?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

*Hjálpartexti:* Veirutárubólga smitast auðveldlega og fylgir oft kvefi.

### 4.11 · `ey-urti`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með kvef, hálsbólgu eða hita núna?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 4.12 · `ey-allergy-season`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með frjókornaofnæmi eða koma einkennin á sama árstíma og áður?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 4.13 · `ey-history`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú fengið þetta áður?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei, þetta er í fyrsta sinn |
| `once` | Já, einu sinni áður |
| `recurrent` | Já, þetta kemur endurtekið |

### 4.14 · `ey-history-what`

Langur texti — textareitur

**Spurning:** Hvað var gert síðast og hvað hjálpaði?

**Birtist ef:** `ey-history` = `once` EÐA `ey-history` = `recurrent`

*Skýring í reit:* t.d. fékk augndropa með sýklalyfi, lagaðist á þremur dögum

### 4.15 · `ey-eyedisease`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með þekktan augnsjúkdóm eða hefur farið í augnaðgerð?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

*Hjálpartexti:* t.d. gláka, augnþurrkur, sjónlagsaðgerð eða dreraðgerð.

### 4.16 · `ey-eyedisease-what`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvað og hvenær?

**Birtist ef:** `ey-eyedisease` = `yes`

*Skýring í reit:* t.d. dreraðgerð á hægra auga 2023

### 4.17 · `ey-tried`

Fjölval — gátreitir

**Spurning:** Hvað hefur þú prófað?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `warm` | Heita bakstra á augnlokið |
| `lid-hygiene` | Hreinsun á augnlokabrún |
| `artificial-tears` | Gervitár eða rakadropa |
| `antihistamine-drops` | Ofnæmisdropa |
| `antibiotic-drops` | Sýklalyfjadropa |
| `old-drops` | Augndropa sem ég átti frá fyrri tíð |
| `nothing` | Ekkert |
| `other` | Annað |

### 4.18 · `ey-tried-detail`

Langur texti — textareitur

**Spurning:** Hvað nákvæmlega, hversu lengi og virkaði það?

**Birtist ef:** `ey-tried` = `warm` EÐA `ey-tried` = `lid-hygiene` EÐA `ey-tried` = `artificial-tears` EÐA `ey-tried` = `antihistamine-drops` EÐA `ey-tried` = `antibiotic-drops` EÐA `ey-tried` = `old-drops` EÐA `ey-tried` = `other`

*Skýring í reit:* t.d. heitir bakstrar tvisvar á dag í fimm daga, kúlan minnkaði lítillega

---

## Síða 5 · Um heilsu þína

**Sýnd öllum.**

### 5.1 · `bg-intro`

Skýringartexti

> Þessar spurningar ráða því hvaða meðferð er örugg fyrir þig. Svaraðu þeim jafnvel þótt þér finnist þær ótengdar erindinu.

### 5.2 · `bg-meds`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Notar þú lyf að staðaldri?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 5.3 · `bg-meds-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða lyf, styrk og skammt?

**Birtist ef:** `bg-meds` = `yes`

*Skýring í reit:* Líka getnaðarvarnir, bætiefni og lyf án lyfseðils. Eitt lyf í hverja línu.

### 5.4 · `bg-allergy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með lyfjaofnæmi eða annað ofnæmi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

### 5.5 · `bg-allergy-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða ofnæmi og hvernig lýsir það sér?

**Birtist ef:** `bg-allergy` = `yes`

*Skýring í reit:* t.d. penisillín – útbrot

### 5.6 · `bg-chronic`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með langvinna sjúkdóma eða greiningar?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

*Hjálpartexti:* Sérstaklega sykursýki, ónæmisbælingu, krabbameinsmeðferð eða sjúkdóm sem hefur áhrif á ónæmiskerfið.

### 5.7 · `bg-chronic-list`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Hvaða sjúkdómar eða greiningar?

**Birtist ef:** `bg-chronic` = `yes`

*Skýring í reit:* t.d. sykursýki, exem, psoriasis, ónæmisbæling, líftæknilyf

### 5.8 · `bg-pregnancy`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu þunguð eða með barn á brjósti?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei |
| `pregnant` | Já, ég er þunguð |
| `breastfeeding` | Já, með barn á brjósti |
| `possible` | Möguleiki er á þungun |
| `na` | Á ekki við |

*Hjálpartexti:* Mörg lyf, líka krem og augndropar, eru ekki örugg á meðgöngu eða við brjóstagjöf.

---

## Síða 6 · Lýstu vandamálinu með þínum eigin orðum

**Sýnd öllum.**

### 6.1 · `free-guide`

Skýringartexti

> Skrifaðu eins og þú værir að segja lækninum frá þessu. Reyndu að koma þessu að:
>
> 1. Hvenær byrjaði þetta og í hvoru auganu byrjaði það?
> 2. Hvernig lítur augað út og hvernig finnst þér það?
> 3. Er útferð, og hvernig er hún á morgnana miðað við á kvöldin?
> 4. Hvað hefur þú prófað og hvað gerðist?
> 5. Hefur þetta áhrif á vinnu, skjánotkun eða akstur?
>
> Engin þörf á læknisfræðilegum orðum. Skrifaðu frekar of mikið en of lítið.

### 6.2 · `free-text`

Langur texti — textareitur · **SKYLDA**

**Spurning:** Lýsing á vandamálinu

*Skýring í reit:* Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.

### 6.3 · `free-worry`

Langur texti — textareitur

**Spurning:** Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti verið?

*Skýring í reit:* Það er í lagi að segja það hreint út. Læknirinn svarar því sérstaklega.

*Hjálpartexti:* Áhyggjur sjúklings eru oft besta vísbendingin um hvað þarf að útiloka.

---

## Síða 7 · Myndir

**Sýnd öllum.**

### 7.1 · `img-intro`

Skýringartexti

> Læknirinn getur ekki skoðað þig. Myndin kemur í stað skoðunarinnar, svo hún skiptir öllu máli.

### 7.2 · `img-tips`

Skýringartexti

> Svona verður myndin gagnleg:
>
> • Taktu myndirnar í góðri dagsbirtu, ekki með flassi.
> • Sendu tvær myndir: eina beint framan á augað með augað opið, og eina þar sem þú dregur neðra augnlokið varlega niður svo innra borðið sjáist.
> • Sértu með hnút á augnloki, taktu líka mynd frá hlið.
> • Haltu símanum í um 20 cm fjarlægð og passaðu að myndin sé í fókus.
> • Fáðu einhvern til að taka myndina fyrir þig ef það er hægt — það verður skýrari mynd en sjálfsmynd.
> • Ekki nota augndropa rétt áður en myndin er tekin.

### 7.3 · `img-files`

Viðhengi — mynd · **SKYLDA**

**Spurning:** Hengdu myndir við hér

---

## Síða 8 · Væntingar og staðfesting

**Sýnd öllum.**

### 8.1 · `exp-wish`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hverju vonast þú eftir frá þessu erindi?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `advice` | Mati og ráðgjöf um hvað ég á að gera |
| `prescription` | Lyfseðli, t.d. augndropum eða smyrsli |
| `referral` | Tilvísun til augnlæknis |
| `certificate` | Vottorði |
| `unsure` | Veit ekki, vil bara láta meta þetta |

*Hjálpartexti:* Læknirinn metur sjálfstætt hvað á við, en það er gott að vita hvað þú vonaðist eftir.

### 8.2 · `final-intro`

Skýringartexti

> Að lokum, staðfestu eftirfarandi:

### 8.3 · `final-truth`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Upplýsingarnar sem ég hef gefið eru réttar eftir minni bestu vitund.

### 8.4 · `final-noexam`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að læknirinn getur ekki skoðað mig og gæti þurft að vísa mér í hefðbundna þjónustu eða hafna erindinu.

### 8.5 · `final-privacy`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég samþykki að Fjarlækningar vinni þessar heilsufarsupplýsingar í samræmi við persónuverndarstefnu félagsins.

### 8.6 · `final-thanks`

Skýringartexti

> Takk fyrir. Læknir les erindið og svarar þér. Svar berst innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22. Versni þér á meðan þú bíður, hringdu í 1700 eða 112.

