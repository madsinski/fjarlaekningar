# Húðvandamál og útbrot — uppsetningarblað fyrir Medalia

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

> Þetta erindi er fyrir húðvandamál og útbrot sem eru ekki bráð.
>
> Þú lýsir vandamálinu, sendir mynd og læknir metur málið og leggur til meðferð. Læknirinn getur ekki skoðað þig eða þreifað húðina — myndin og lýsingin þín eru það sem hann hefur.

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
> • Hentar: útbrot, exem, psoriasis, unglingabólur, rósroði, sveppasýking, frunsur, ofnæmisútbrot, skordýrabit, vörtur og önnur afmörkuð húðvandamál.
> • Hentar ekki: fæðingarblettir og húðbreytingar sem þarf að skoða, sár sem gróa ekki, brunasár, bit sem hafa sýkst, og útbreidd bráð útbrot.
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
> • Útbrot sem hverfa EKKI þegar þrýst er á þau, ásamt hita, slappleika eða stífum hnakka
> • Bólga í andliti, vörum, tungu eða hálsi, eða öndunarerfiðleikar
> • Roði sem breiðist hratt út, ásamt hita og hrolli
> • Mun meiri verkur í húðinni en útlitið gefur til kynna, eða dökk eða blásvört svæði í roðanum
> • Blöðrur eða flögnun í munni, á augum eða á kynfærum
> • Húðin flagnar af í flekkjum, sérstaklega eftir að nýtt lyf var byrjað
> • Útbrot með blöðrum á enni eða nefbroddi, eða nálægt auga
> • Útbreidd ný útbrot ásamt háum hita

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
| `purpura` | Útbrot sem hverfa ekki við þrýsting, með hita |
| `angioedema` | Bólga í andliti, vörum, tungu eða hálsi |
| `cellulitis` | Roði sem breiðist hratt út, með hita |
| `necrotising` | Mun meiri verkur en útlitið gefur til kynna, eða dökk svæði |
| `mucosal` | Blöðrur eða sár í munni, augum eða á kynfærum |
| `peeling` | Húðin flagnar af, sérstaklega eftir nýtt lyf |
| `zoster-eye` | Blöðruútbrot á enni, nefi eða nálægt auga |
| `febrile-rash` | Útbreidd ný útbrot með háum hita |

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
> Útbrot sem hverfa ekki við þrýsting ásamt hita geta verið merki um heilahimnubólgu. Það þolir enga bið.
>
> Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu og gæti verið afgreitt of seint.

**Birtist ef:** `rf-gate` = `yes`

### 2.5 · `rf-ack`

Gátreitur — já/nei · **SKYLDA**

**Spurning:** Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta erindi kemur ekki í stað bráðaþjónustu.

**Birtist ef:** `rf-gate` = `yes`

---

## Síða 3 · Hentar þetta fjarþjónustu?

**Sýnd öllum.**

### 3.1 · `suit-intro`

Skýringartexti

> Sumt er ekki bráðatilfelli en verður samt ekki metið af mynd. Lestu listann og svaraðu spurningunni fyrir neðan:
>
> • Fæðingarblettur eða húðbreyting sem hefur stækkað, breytt um lit eða lögun, blæðir eða veldur kláða
> • Sár sem hefur ekki gróið á fjórum vikum
> • Sár á fæti hjá einstaklingi með sykursýki
> • Brunasár
> • Bit eftir dýr eða menn
> • Húðvandamál sem þarf að skera í, taka sýni úr eða frysta

### 3.2 · `suit-gate`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Á eitthvað af ofangreindu við um erindið þitt?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

### 3.3 · `suit-which`

Fjölval — gátreitir

**Spurning:** Hvað af þessu á við?

**Birtist ef:** `suit-gate` = `yes`

| kóði | það sem sjúklingurinn sér |
|---|---|
| `mole` | Fæðingarblettur eða húðbreyting sem hefur breyst |
| `chronic-wound` | Sár sem hefur ekki gróið á fjórum vikum |
| `diabetic-foot` | Sár á fæti og ég er með sykursýki |
| `burn` | Brunasár |
| `bite` | Bit eftir dýr eða menn |
| `procedure` | Þarf sýnatöku, frystingu eða aðgerð |

### 3.4 · `suit-note`

Skýringartexti

> Þetta þarf skoðun með berum augum og oft áþreifingu, sýnatöku eða aðgerð sem ekki er hægt að framkvæma í fjarþjónustu.
>
> Þú mátt senda erindið og læknir mun lesa það, en líklegast verður niðurstaðan tilvísun í hefðbundna þjónustu þar sem hægt er að skoða húðina. Pantaðu tíma hjá heilsugæslu eða húðlækni samhliða.

**Birtist ef:** `suit-gate` = `yes`

---

## Síða 4 · Um útbrotin

**Sýnd öllum.**

### 4.1 · `sk-where`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hvar á líkamanum eru útbrotin? Merktu við allt sem á við.

| kóði | það sem sjúklingurinn sér |
|---|---|
| `face` | Andlit |
| `scalp` | Hársvörður |
| `neck` | Háls |
| `trunk` | Bolur, bak eða bringa |
| `arms` | Handleggir |
| `hands` | Hendur eða fingur |
| `legs` | Fótleggir |
| `feet` | Fætur eða tær |
| `groin` | Nári eða kynfærasvæði |
| `folds` | Húðfellingar, t.d. undir brjóstum eða handarkrika |
| `nails` | Neglur |
| `widespread` | Útbreitt um allan líkamann |

### 4.2 · `sk-duration`

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

### 4.3 · `sk-course`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hvernig hefur þetta þróast?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `worse` | Versnandi eða breiðist út |
| `same` | Óbreytt |
| `better` | Batnandi |
| `fluctuating` | Kemur og fer |

### 4.4 · `sk-look`

Fjölval — gátreitir · **SKYLDA**

**Spurning:** Hvernig líta útbrotin út? Merktu við allt sem á við.

| kóði | það sem sjúklingurinn sér |
|---|---|
| `red-flat` | Rauð og flöt |
| `raised` | Upphleypt eða hrjúf |
| `scaly` | Flögnun eða hreistur |
| `blisters` | Blöðrur með vökva |
| `pustules` | Graftarbólur |
| `dry-cracked` | Þurrt og sprungið |
| `weeping` | Vessandi eða skorpumyndun |
| `ring` | Hringlaga með skýrari jaðri |
| `lumps` | Hnútar eða kýli |
| `wheals` | Upphleyptar kláðabólur sem koma og fara |

*Hjálpartexti:* Ef þú ert ekki viss, merktu við það sem líkist mest og lýstu því svo með þínum orðum síðar.

### 4.5 · `sk-itch`

Tala 0–10 — hnappar · **SKYLDA**

**Spurning:** Hversu mikill er kláðinn? 0 = enginn kláði, 10 = óbærilegur.

### 4.6 · `sk-pain`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Eru útbrotin sár eða verkjar þig í þeim?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei |
| `mild` | Væg eymsli |
| `moderate` | Töluverðir verkir |
| `severe` | Miklir verkir |

### 4.7 · `sk-fever`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Ertu með hita eða almenn einkenni?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei, mér líður annars vel |
| `mild` | Slappleiki en enginn hiti |
| `fever` | Já, hiti |
| `unsure` | Veit ekki |

### 4.8 · `sk-newdrug`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Byrjaðir þú á nýju lyfi síðustu sex vikur, líka lausasölulyfi eða bætiefni?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

*Hjálpartexti:* Lyfjaútbrot koma oftast fram einni til þremur vikum eftir að nýtt lyf er byrjað. Þess vegna spyrjum við alltaf.

### 4.9 · `sk-newdrug-what`

Stuttur texti — ein lína · **SKYLDA**

**Spurning:** Hvaða lyf og hvenær byrjaðir þú á því?

**Birtist ef:** `sk-newdrug` = `yes`

*Skýring í reit:* t.d. amoxicillín, byrjaði fyrir tíu dögum

### 4.10 · `sk-contact`

Langur texti — textareitur

**Spurning:** Komst húðin í snertingu við eitthvað nýtt áður en útbrotin byrjuðu?

*Skýring í reit:* t.d. ný sápa, þvottaefni, krem, hárvörur, skartgripir, hanskar, plöntur, dýr, efni í vinnu, sól eða ljósabekkur. Skrifaðu „ekkert“ ef ekkert kemur upp í hugann.

### 4.11 · `sk-household`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Er einhver annar á heimilinu eða í kringum þig með svipuð útbrot eða kláða?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |
| `unsure` | Veit ekki |

*Hjálpartexti:* Kláðamaur, kláðaútbrot og sumar sveppasýkingar smitast milli heimilisfólks og breyta meðferðinni.

### 4.12 · `sk-history`

Einn valkostur — radio · **SKYLDA**

**Spurning:** Hefur þú fengið þetta eða svipað áður?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `no` | Nei, þetta er í fyrsta sinn |
| `once` | Já, einu sinni áður |
| `recurrent` | Já, þetta kemur endurtekið |
| `known` | Já, ég er með greindan húðsjúkdóm |

### 4.13 · `sk-history-what`

Langur texti — textareitur

**Spurning:** Hvaða greining eða hvað var gert síðast og hvað hjálpaði?

**Birtist ef:** `sk-history` = `once` EÐA `sk-history` = `recurrent` EÐA `sk-history` = `known`

*Skýring í reit:* t.d. greint exem 2019, sterakrem hjálpaði á nokkrum dögum

### 4.14 · `sk-tried`

Fjölval — gátreitir

**Spurning:** Hvað hefur þú prófað á húðina?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `moisturiser` | Rakakrem eða mýkjandi krem |
| `steroid` | Sterakrem |
| `antifungal` | Sveppakrem |
| `antibiotic-cream` | Sýklalyfjakrem |
| `antihistamine` | Ofnæmistöflur |
| `natural` | Náttúruvörur eða heimilisúrræði |
| `nothing` | Ekkert |
| `other` | Annað |

### 4.15 · `sk-tried-detail`

Langur texti — textareitur

**Spurning:** Hvað nákvæmlega, hversu lengi og virkaði það?

**Birtist ef:** `sk-tried` = `moisturiser` EÐA `sk-tried` = `steroid` EÐA `sk-tried` = `antifungal` EÐA `sk-tried` = `antibiotic-cream` EÐA `sk-tried` = `antihistamine` EÐA `sk-tried` = `natural` EÐA `sk-tried` = `other`

*Skýring í reit:* t.d. hýdrókortisón 1% tvisvar á dag í viku, skánaði lítillega en kom aftur

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

*Skýring í reit:* Skrifaðu líka getnaðarvarnir, bætiefni og lyf sem þú kaupir án lyfseðils. Eitt lyf í hverja línu.

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

### 5.9 · `bg-skin-sun`

Einn valkostur — radio

**Spurning:** Vinnur þú við eitthvað sem reynir á húðina, t.d. bleytu, efni eða hanska allan daginn?

| kóði | það sem sjúklingurinn sér |
|---|---|
| `yes` | Já |
| `no` | Nei |

---

## Síða 6 · Lýstu vandamálinu með þínum eigin orðum

**Sýnd öllum.**

### 6.1 · `free-guide`

Skýringartexti

> Skrifaðu eins og þú værir að segja lækninum frá þessu. Reyndu að koma þessu að:
>
> 1. Hvar byrjuðu útbrotin og hvernig hafa þau breiðst út?
> 2. Hvernig líta þau út og hvernig finnast þau — kláði, sviði, verkur?
> 3. Hvað gerir þau betri eða verri, t.d. sturta, sviti, sól, kuldi eða streita?
> 4. Hvað hefur þú prófað og hvað gerðist?
> 5. Hvað heldur þú sjálf eða sjálfur að valdi þessu?
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
> • Taktu myndina í góðri dagsbirtu, ekki með flassi — flass afmáir roða.
> • Sendu tvær til þrjár myndir: eina nærmynd í um 15 cm fjarlægð og eina þar sem sést hvar á líkamanum útbrotin eru.
> • Leggðu fingur eða mynt við hliðina svo stærðin sjáist.
> • Hreinsaðu krem, farða eða púður af húðinni áður en þú tekur myndina.
> • Haltu myndavélinni kyrri og passaðu að myndin sé í fókus.
> • Breytist útbrotin dag frá degi, sendu líka eldri mynd ef þú átt hana.

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
| `prescription` | Lyfseðli, t.d. kremi eða töflum |
| `referral` | Tilvísun til húðlæknis |
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

