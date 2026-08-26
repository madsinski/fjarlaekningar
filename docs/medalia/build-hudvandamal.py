#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fjarlækningar — "Húðvandamál og útbrot (ekki bráð)".

Clinical shape of this form:

  1. Safety screen for the rashes that kill or scar if they wait: purpura that
     does not blanch with fever (meningococcaemia), angio-oedema, rapidly
     spreading redness with fever and pain out of proportion (erysipelas /
     necrotising infection), mucosal blistering or skin peeling after a new
     drug (SJS/TEN), and shingles at the eye (herpes zoster ophthalmicus).
  2. A separate "not suitable remotely" gate — problems that are not urgent but
     genuinely cannot be judged from a photograph: a changing mole, a wound
     that will not heal, a diabetic foot ulcer, a burn or a bite. These are
     referred rather than warned about.
  3. Focused history built around what actually changes management in
     dermatology: distribution, morphology, itch, new drug in the last six
     weeks, contact exposures, household contacts, and prior skin disease.
  4. Free text, then a REQUIRED photograph — for skin the photograph is the
     examination, so it is not optional.

Output: hudvandamal.json
"""
import sys
from medalia_common import (
    RADIO, CHECK, YES_NO, YES_NO_UNSURE, DURATION,
    opts, q, gated, display, page, placeholder, slider,
    intro_page, redflag_page, background_page, freetext_page, photo_page,
    closing_page, questionnaire, write,
)

# ---------------------------------------------------------------- 1 · intro
P1 = intro_page(
    "Þetta erindi er fyrir húðvandamál og útbrot sem eru ekki bráð.\n\n"
    "Þú lýsir vandamálinu, sendir mynd og læknir metur málið og leggur til "
    "meðferð. Læknirinn getur ekki skoðað þig eða þreifað húðina — myndin og "
    "lýsingin þín eru það sem hann hefur.",
    [
        "Hentar: útbrot, exem, psoriasis, unglingabólur, rósroði, sveppasýking, "
        "frunsur, ofnæmisútbrot, skordýrabit, vörtur og önnur afmörkuð húðvandamál.",
        "Hentar ekki: fæðingarblettir og húðbreytingar sem þarf að skoða, sár "
        "sem gróa ekki, brunasár, bit sem hafa sýkst, og útbreidd bráð útbrot.",
    ],
)

# ---------------------------------------------------------------- 2 · red flags
P2 = redflag_page(
    [
        "Útbrot sem hverfa EKKI þegar þrýst er á þau, ásamt hita, slappleika "
        "eða stífum hnakka",
        "Bólga í andliti, vörum, tungu eða hálsi, eða öndunarerfiðleikar",
        "Roði sem breiðist hratt út, ásamt hita og hrolli",
        "Mun meiri verkur í húðinni en útlitið gefur til kynna, eða dökk eða "
        "blásvört svæði í roðanum",
        "Blöðrur eða flögnun í munni, á augum eða á kynfærum",
        "Húðin flagnar af í flekkjum, sérstaklega eftir að nýtt lyf var byrjað",
        "Útbrot með blöðrum á enni eða nefbroddi, eða nálægt auga",
        "Útbreidd ný útbrot ásamt háum hita",
    ],
    opts(
        ("purpura", "Útbrot sem hverfa ekki við þrýsting, með hita"),
        ("angioedema", "Bólga í andliti, vörum, tungu eða hálsi"),
        ("cellulitis", "Roði sem breiðist hratt út, með hita"),
        ("necrotising", "Mun meiri verkur en útlitið gefur til kynna, eða dökk svæði"),
        ("mucosal", "Blöðrur eða sár í munni, augum eða á kynfærum"),
        ("peeling", "Húðin flagnar af, sérstaklega eftir nýtt lyf"),
        ("zoster-eye", "Blöðruútbrot á enni, nefi eða nálægt auga"),
        ("febrile-rash", "Útbreidd ný útbrot með háum hita"),
    ),
    extra_note="Útbrot sem hverfa ekki við þrýsting ásamt hita geta verið "
               "merki um heilahimnubólgu. Það þolir enga bið.",
)

# ---------------------------------------------------------------- 3 · suitability
P3 = page("p3-hentugleiki", "Hentar þetta fjarþjónustu?", [
    display("suit-intro",
            "Sumt er ekki bráðatilfelli en verður samt ekki metið af mynd. "
            "Lestu listann og svaraðu spurningunni fyrir neðan:\n\n"
            "• Fæðingarblettur eða húðbreyting sem hefur stækkað, breytt um "
            "lit eða lögun, blæðir eða veldur kláða\n"
            "• Sár sem hefur ekki gróið á fjórum vikum\n"
            "• Sár á fæti hjá einstaklingi með sykursýki\n"
            "• Brunasár\n"
            "• Bit eftir dýr eða menn\n"
            "• Húðvandamál sem þarf að skera í, taka sýni úr eða frysta"),
    q("suit-gate", "Á eitthvað af ofangreindu við um erindið þitt?", "choice",
      required=True, options=YES_NO, ext=RADIO),
    gated(q("suit-which", "Hvað af þessu á við?", "choice", repeats=True,
            ext=CHECK,
            options=opts(
                ("mole", "Fæðingarblettur eða húðbreyting sem hefur breyst"),
                ("chronic-wound", "Sár sem hefur ekki gróið á fjórum vikum"),
                ("diabetic-foot", "Sár á fæti og ég er með sykursýki"),
                ("burn", "Brunasár"),
                ("bite", "Bit eftir dýr eða menn"),
                ("procedure", "Þarf sýnatöku, frystingu eða aðgerð"),
            )), "suit-gate", "yes"),
    gated(display("suit-note",
                  "Þetta þarf skoðun með berum augum og oft áþreifingu, "
                  "sýnatöku eða aðgerð sem ekki er hægt að framkvæma í "
                  "fjarþjónustu.\n\n"
                  "Þú mátt senda erindið og læknir mun lesa það, en líklegast "
                  "verður niðurstaðan tilvísun í hefðbundna þjónustu þar sem "
                  "hægt er að skoða húðina. Pantaðu tíma hjá heilsugæslu eða "
                  "húðlækni samhliða."),
          "suit-gate", "yes"),
])

# ---------------------------------------------------------------- 4 · history
P4 = page("p4-saga", "Um útbrotin", [
    q("sk-where", "Hvar á líkamanum eru útbrotin? Merktu við allt sem á við.",
      "choice", repeats=True, required=True, ext=CHECK,
      options=opts(
          ("face", "Andlit"), ("scalp", "Hársvörður"), ("neck", "Háls"),
          ("trunk", "Bolur, bak eða bringa"), ("arms", "Handleggir"),
          ("hands", "Hendur eða fingur"), ("legs", "Fótleggir"),
          ("feet", "Fætur eða tær"), ("groin", "Nári eða kynfærasvæði"),
          ("folds", "Húðfellingar, t.d. undir brjóstum eða handarkrika"),
          ("nails", "Neglur"), ("widespread", "Útbreitt um allan líkamann"),
      )),
    q("sk-duration", "Hversu lengi hefur þetta staðið yfir?", "choice",
      required=True, options=DURATION, ext=RADIO),
    q("sk-course", "Hvernig hefur þetta þróast?", "choice", required=True,
      ext=RADIO,
      options=opts(("worse", "Versnandi eða breiðist út"),
                   ("same", "Óbreytt"), ("better", "Batnandi"),
                   ("fluctuating", "Kemur og fer"))),
    q("sk-look", "Hvernig líta útbrotin út? Merktu við allt sem á við.",
      "choice", repeats=True, required=True, ext=CHECK,
      options=opts(
          ("red-flat", "Rauð og flöt"),
          ("raised", "Upphleypt eða hrjúf"),
          ("scaly", "Flögnun eða hreistur"),
          ("blisters", "Blöðrur með vökva"),
          ("pustules", "Graftarbólur"),
          ("dry-cracked", "Þurrt og sprungið"),
          ("weeping", "Vessandi eða skorpumyndun"),
          ("ring", "Hringlaga með skýrari jaðri"),
          ("lumps", "Hnútar eða kýli"),
          ("wheals", "Upphleyptar kláðabólur sem koma og fara"),
      ),
      help_text="Ef þú ert ekki viss, merktu við það sem líkist mest og lýstu "
                "því svo með þínum orðum síðar."),
    q("sk-itch", "Hversu mikill er kláðinn? 0 = enginn kláði, 10 = óbærilegur.",
      "integer", required=True, ext=slider(0, 10)),
    q("sk-pain", "Eru útbrotin sár eða verkjar þig í þeim?", "choice",
      required=True, ext=RADIO,
      options=opts(("no", "Nei"), ("mild", "Væg eymsli"),
                   ("moderate", "Töluverðir verkir"),
                   ("severe", "Miklir verkir"))),
    q("sk-fever", "Ertu með hita eða almenn einkenni?", "choice", required=True,
      ext=RADIO,
      options=opts(("no", "Nei, mér líður annars vel"),
                   ("mild", "Slappleiki en enginn hiti"),
                   ("fever", "Já, hiti"),
                   ("unsure", "Veit ekki"))),
    q("sk-newdrug",
      "Byrjaðir þú á nýju lyfi síðustu sex vikur, líka lausasölulyfi eða "
      "bætiefni?", "choice", required=True, options=YES_NO_UNSURE, ext=RADIO,
      help_text="Lyfjaútbrot koma oftast fram einni til þremur vikum eftir að "
                "nýtt lyf er byrjað. Þess vegna spyrjum við alltaf."),
    gated(q("sk-newdrug-what", "Hvaða lyf og hvenær byrjaðir þú á því?",
            "string", required=True,
            ext=placeholder("t.d. amoxicillín, byrjaði fyrir tíu dögum")),
          "sk-newdrug", "yes"),
    q("sk-contact",
      "Komst húðin í snertingu við eitthvað nýtt áður en útbrotin byrjuðu?",
      "text",
      ext=placeholder("t.d. ný sápa, þvottaefni, krem, hárvörur, skartgripir, "
                      "hanskar, plöntur, dýr, efni í vinnu, sól eða ljósabekkur. "
                      "Skrifaðu „ekkert“ ef ekkert kemur upp í hugann.")),
    q("sk-household",
      "Er einhver annar á heimilinu eða í kringum þig með svipuð útbrot eða "
      "kláða?", "choice", required=True, options=YES_NO_UNSURE, ext=RADIO,
      help_text="Kláðamaur, kláðaútbrot og sumar sveppasýkingar smitast milli "
                "heimilisfólks og breyta meðferðinni."),
    q("sk-history", "Hefur þú fengið þetta eða svipað áður?", "choice",
      required=True, ext=RADIO,
      options=opts(("no", "Nei, þetta er í fyrsta sinn"),
                   ("once", "Já, einu sinni áður"),
                   ("recurrent", "Já, þetta kemur endurtekið"),
                   ("known", "Já, ég er með greindan húðsjúkdóm"))),
    gated(q("sk-history-what",
            "Hvaða greining eða hvað var gert síðast og hvað hjálpaði?",
            "text",
            ext=placeholder("t.d. greint exem 2019, sterakrem hjálpaði á "
                            "nokkrum dögum")),
          "sk-history", "once", "recurrent", "known"),
    q("sk-tried", "Hvað hefur þú prófað á húðina?", "choice", repeats=True,
      ext=CHECK,
      options=opts(
          ("moisturiser", "Rakakrem eða mýkjandi krem"),
          ("steroid", "Sterakrem"),
          ("antifungal", "Sveppakrem"),
          ("antibiotic-cream", "Sýklalyfjakrem"),
          ("antihistamine", "Ofnæmistöflur"),
          ("natural", "Náttúruvörur eða heimilisúrræði"),
          ("nothing", "Ekkert"),
          ("other", "Annað"),
      )),
    gated(q("sk-tried-detail",
            "Hvað nákvæmlega, hversu lengi og virkaði það?", "text",
            ext=placeholder("t.d. hýdrókortisón 1% tvisvar á dag í viku, "
                            "skánaði lítillega en kom aftur")),
          "sk-tried", "moisturiser", "steroid", "antifungal",
          "antibiotic-cream", "antihistamine", "natural", "other"),
])

# ---------------------------------------------------------------- 5 · background
P5 = background_page([
    q("bg-skin-sun",
      "Vinnur þú við eitthvað sem reynir á húðina, t.d. bleytu, efni eða "
      "hanska allan daginn?", "choice", options=YES_NO, ext=RADIO),
])

# ---------------------------------------------------------------- 6 · free text
P6 = freetext_page(
    [
        "Hvar byrjuðu útbrotin og hvernig hafa þau breiðst út?",
        "Hvernig líta þau út og hvernig finnast þau — kláði, sviði, verkur?",
        "Hvað gerir þau betri eða verri, t.d. sturta, sviti, sól, kuldi eða streita?",
        "Hvað hefur þú prófað og hvað gerðist?",
        "Hvað heldur þú sjálf eða sjálfur að valdi þessu?",
    ],
    "Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.",
)

# ---------------------------------------------------------------- 7 · photos
P7 = photo_page([
    "Taktu myndina í góðri dagsbirtu, ekki með flassi — flass afmáir roða.",
    "Sendu tvær til þrjár myndir: eina nærmynd í um 15 cm fjarlægð og eina "
    "þar sem sést hvar á líkamanum útbrotin eru.",
    "Leggðu fingur eða mynt við hliðina svo stærðin sjáist.",
    "Hreinsaðu krem, farða eða púður af húðinni áður en þú tekur myndina.",
    "Haltu myndavélinni kyrri og passaðu að myndin sé í fókus.",
    "Breytist útbrotin dag frá degi, sendu líka eldri mynd ef þú átt hana.",
])

# ---------------------------------------------------------------- 8 · closing
P8 = closing_page(opts(
    ("advice", "Mati og ráðgjöf um hvað ég á að gera"),
    ("prescription", "Lyfseðli, t.d. kremi eða töflum"),
    ("referral", "Tilvísun til húðlæknis"),
    ("certificate", "Vottorði"),
    ("unsure", "Veit ekki, vil bara láta meta þetta"),
))

QRES = questionnaire(
    "Húðvandamál og útbrot",
    "Hudvandamal",
    "Erindi vegna húðvandamála og útbrota sem eru ekki bráð. Öryggisskimun, "
    "mat á því hvort erindið henti fjarþjónustu, markviss forsaga, frjáls "
    "lýsing og skyldubundin mynd.",
    [P1, P2, P3, P4, P5, P6, P7, P8],
)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "hudvandamal.json"
    sys.exit(1 if write(QRES, out) else 0)
