#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fjarlækningar — "Augnsýkingar og augnlokavandamál (ekki bráð)".

Scope: hvarmabólga (blepharitis), vogrís og hvarmakýli (hordeolum/chalazion)
and óbrotin tárubólga (uncomplicated conjunctivitis).

Clinical shape of this form:

  1. Safety screen for the red eye that is not conjunctivitis: vision loss,
     real pain, photophobia, trauma or chemical exposure, a corneal opacity,
     zoster on the forehead or nose tip, orbital signs (proptosis, double
     vision, restricted movement, fever), and the nausea-plus-blurring of
     acute angle-closure glaucoma.
  2. A contact-lens gate of its own. A red eye in a lens wearer is microbial
     keratitis until proven otherwise, needs a slit lamp the same day, and is
     the single most important thing to catch in a remote eye form — so it is
     asked separately rather than buried in a checklist.
  3. An infant gate — a red or discharging eye under one month is referred.
  4. Focused history: which eye, discharge character, morning crusting,
     lid lump vs lid margin inflammation, itch, contacts, recent URTI.
  5. Free text, then a REQUIRED photograph.

Output: augnsykingar.json
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
    "Þetta erindi er fyrir væg augnvandamál sem eru ekki bráð.\n\n"
    "Þú lýsir einkennunum, sendir mynd og læknir metur málið og leggur til "
    "meðferð. Læknirinn getur ekki skoðað augað í smásjá, mælt augnþrýsting "
    "eða litað hornhimnuna.",
    [
        "Hentar: hvarmabólga, vogrís og hvarmakýli á augnloki, og óbrotin "
        "tárubólga.",
        "Hentar ekki: sjónskerðing, augnverkur, ljósfælni, áverki á auga, "
        "efni í auga, og rautt auga hjá þeim sem nota augnlinsur.",
    ],
)

# ---------------------------------------------------------------- 2 · red flags
P2 = redflag_page(
    [
        "Sjónin hefur versnað, orðið þokukennd eða þú sérð skugga eða bletti",
        "Verulegur verkur í auganu, ekki bara sviði eða aðskotatilfinning",
        "Þú þolir illa ljós",
        "Áverki á auga, eða þú færð ekki aðskotahlut úr auganu",
        "Efni, sápa eða hreinsivökvi fór í augað",
        "Hvítur eða skýjaður blettur á sjáaldrinu eða hornhimnunni",
        "Blöðruútbrot á enni, augnloki eða nefbroddi",
        "Augað stendur út, þú sérð tvöfalt, eða þú getur ekki hreyft augað "
        "eðlilega",
        "Roði og bólga sem breiðist út í kringum augað ásamt hita",
        "Ógleði eða uppköst ásamt augnverk og þokusýn",
        "Barn yngra en eins mánaðar með rautt auga eða útferð",
    ],
    opts(
        ("vision", "Sjónin hefur versnað eða orðið þokukennd"),
        ("pain", "Verulegur verkur í auganu"),
        ("photophobia", "Ég þoli illa ljós"),
        ("trauma", "Áverki eða aðskotahlutur í auga"),
        ("chemical", "Efni fór í augað"),
        ("corneal", "Hvítur eða skýjaður blettur á auganu"),
        ("zoster", "Blöðruútbrot á enni, augnloki eða nefi"),
        ("orbital", "Augað stendur út, tvísýni eða skert augnhreyfing"),
        ("periorbital", "Útbreiddur roði og bólga með hita"),
        ("glaucoma", "Ógleði eða uppköst með augnverk og þokusýn"),
        ("neonate", "Barn yngra en eins mánaðar"),
    ),
    extra_note="Efni í auga: skolaðu augað strax með rennandi vatni í minnst "
               "fimmtán mínútur og hringdu í 112 eða Eitrunarmiðstöð í 543 2222 "
               "á meðan.",
)

# ---------------------------------------------------------------- 3 · lenses
P3 = page("p3-linsur", "Augnlinsur", [
    q("cl-use", "Notar þú augnlinsur?", "choice", required=True, ext=RADIO,
      options=opts(("yes", "Já, ég nota linsur"),
                   ("stopped", "Já, en ég tók þær úr vegna einkennanna"),
                   ("no", "Nei")),
      help_text="Þessi spurning ræður úrslitum um hvort erindið hentar "
                "fjarþjónustu."),
    gated(display("cl-warning",
                  "⚠️ Rautt auga hjá linsunotanda þarf skoðun samdægurs.\n\n"
                  "Sýking í hornhimnu er algengari hjá þeim sem nota linsur og "
                  "getur skaðað sjónina á fáum dögum. Hana er ekki hægt að "
                  "greina af mynd — það þarf smásjárskoðun.\n\n"
                  "• Taktu linsurnar úr strax og notaðu þær ekki aftur fyrr en "
                  "augað hefur verið skoðað.\n"
                  "• Hafðu samband við augnlækni, Læknavaktina í 1700 eða "
                  "bráðamóttöku augndeildar samdægurs.\n"
                  "• Hentu linsunum og hylkinu sem voru í notkun.\n\n"
                  "Þú mátt senda erindið, en læknir mun að öllum líkindum vísa "
                  "þér í skoðun frekar en að leggja til meðferð."),
          "cl-use", "yes", "stopped"),
    gated(q("cl-ack",
            "Ég skil að ég á að taka linsurnar úr og leita skoðunar samdægurs.",
            "boolean", required=True, ext=CHECK),
          "cl-use", "yes", "stopped"),
])

# ---------------------------------------------------------------- 4 · history
P4 = page("p4-saga", "Um einkennin", [
    q("ey-side", "Hvort augað?", "choice", required=True, ext=RADIO,
      options=opts(("right", "Hægra"), ("left", "Vinstra"),
                   ("both-together", "Bæði, byrjuðu á sama tíma"),
                   ("both-spread", "Byrjaði í öðru og færðist yfir í hitt"))),
    q("ey-duration", "Hversu lengi hefur þetta staðið yfir?", "choice",
      required=True, options=DURATION, ext=RADIO),
    q("ey-course", "Hvernig hefur þetta þróast?", "choice", required=True,
      ext=RADIO,
      options=opts(("worse", "Versnandi"), ("same", "Óbreytt"),
                   ("better", "Batnandi"), ("fluctuating", "Kemur og fer"))),
    q("ey-symptoms", "Hvaða einkenni ertu með? Merktu við allt sem á við.",
      "choice", repeats=True, required=True, ext=CHECK,
      options=opts(
          ("redness", "Roði í auganu"),
          ("discharge", "Útferð úr auganu"),
          ("crusting", "Skorpur á augnhárum, sérstaklega á morgnana"),
          ("itch", "Kláði"),
          ("grit", "Aðskotatilfinning eða sandtilfinning"),
          ("watering", "Augað rennur"),
          ("lid-swelling", "Bólgið augnlok"),
          ("lump", "Hnútur eða kúla á augnlokinu"),
          ("lid-margin", "Roði og flögnun á augnlokabrúninni"),
          ("dryness", "Þurrkur eða sviði"),
          ("sticky-morning", "Augað er límt aftur á morgnana"),
      )),
    q("ey-discharge", "Hvernig er útferðin?", "choice", required=True,
      ext=RADIO,
      options=opts(
          ("none", "Engin útferð"),
          ("watery", "Vatnskennd og tær"),
          ("mucous", "Slímkennd og hvítleit"),
          ("purulent", "Gulleit eða grænleit og þykk"),
      ),
      help_text="Litur og þykkt útferðarinnar segir til um hvers konar "
                "tárubólga þetta er og hvort sýklalyf eiga við."),
    gated(q("ey-lump-where", "Hvar er hnúturinn og hvernig hefur hann breyst?",
            "text", required=True,
            ext=placeholder("t.d. á efra augnloki, á stærð við baun, byrjaði "
                            "aumur fyrir viku en er núna verkjalaus")),
          "ey-symptoms", "lump"),
    q("ey-vision-check",
      "Sérðu jafn vel og venjulega með auganu?", "choice", required=True,
      ext=RADIO,
      options=opts(("normal", "Já, sjónin er óbreytt"),
                   ("blurry-clears", "Þokukennt en skýrist þegar ég blikka"),
                   ("worse", "Nei, ég sé verr")),
      help_text="Þoka sem hverfur við blikk stafar oftast af útferð. Sjón sem "
                "er raunverulega verri er annað mál."),
    gated(display("ey-vision-warning",
                  "⚠️ Sjónskerðing á ekki heima í fjarþjónustu. Hafðu samband "
                  "við Læknavaktina í 1700 eða augnlækni samdægurs."),
          "ey-vision-check", "worse"),
    q("ey-eyepain", "Ertu með verk í auganu?", "choice", required=True,
      ext=RADIO,
      options=opts(("none", "Nei"),
                   ("burning", "Sviði eða óþægindi"),
                   ("real-pain", "Já, raunverulegan verk í auganu"))),
    q("ey-contacts-sick",
      "Er einhver í kringum þig með rautt auga, kvef eða hálsbólgu?", "choice",
      required=True, options=YES_NO_UNSURE, ext=RADIO,
      help_text="Veirutárubólga smitast auðveldlega og fylgir oft kvefi."),
    q("ey-urti", "Ertu með kvef, hálsbólgu eða hita núna?", "choice",
      required=True, options=YES_NO, ext=RADIO),
    q("ey-allergy-season",
      "Ertu með frjókornaofnæmi eða koma einkennin á sama árstíma og áður?",
      "choice", required=True, options=YES_NO_UNSURE, ext=RADIO),
    q("ey-history", "Hefur þú fengið þetta áður?", "choice", required=True,
      ext=RADIO,
      options=opts(("no", "Nei, þetta er í fyrsta sinn"),
                   ("once", "Já, einu sinni áður"),
                   ("recurrent", "Já, þetta kemur endurtekið"))),
    gated(q("ey-history-what", "Hvað var gert síðast og hvað hjálpaði?", "text",
            ext=placeholder("t.d. fékk augndropa með sýklalyfi, lagaðist á "
                            "þremur dögum")),
          "ey-history", "once", "recurrent"),
    q("ey-eyedisease",
      "Ertu með þekktan augnsjúkdóm eða hefur farið í augnaðgerð?", "choice",
      required=True, options=YES_NO_UNSURE, ext=RADIO,
      help_text="t.d. gláka, augnþurrkur, sjónlagsaðgerð eða dreraðgerð."),
    gated(q("ey-eyedisease-what", "Hvað og hvenær?", "string", required=True,
            ext=placeholder("t.d. dreraðgerð á hægra auga 2023")),
          "ey-eyedisease", "yes"),
    q("ey-tried", "Hvað hefur þú prófað?", "choice", repeats=True, ext=CHECK,
      options=opts(
          ("warm", "Heita bakstra á augnlokið"),
          ("lid-hygiene", "Hreinsun á augnlokabrún"),
          ("artificial-tears", "Gervitár eða rakadropa"),
          ("antihistamine-drops", "Ofnæmisdropa"),
          ("antibiotic-drops", "Sýklalyfjadropa"),
          ("old-drops", "Augndropa sem ég átti frá fyrri tíð"),
          ("nothing", "Ekkert"),
          ("other", "Annað"),
      )),
    gated(q("ey-tried-detail", "Hvað nákvæmlega, hversu lengi og virkaði það?",
            "text",
            ext=placeholder("t.d. heitir bakstrar tvisvar á dag í fimm daga, "
                            "kúlan minnkaði lítillega")),
          "ey-tried", "warm", "lid-hygiene", "artificial-tears",
          "antihistamine-drops", "antibiotic-drops", "old-drops", "other"),
])

# ---------------------------------------------------------------- 5 · background
P5 = background_page()

# ---------------------------------------------------------------- 6 · free text
P6 = freetext_page(
    [
        "Hvenær byrjaði þetta og í hvoru auganu byrjaði það?",
        "Hvernig lítur augað út og hvernig finnst þér það?",
        "Er útferð, og hvernig er hún á morgnana miðað við á kvöldin?",
        "Hvað hefur þú prófað og hvað gerðist?",
        "Hefur þetta áhrif á vinnu, skjánotkun eða akstur?",
    ],
    "Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.",
)

# ---------------------------------------------------------------- 7 · photos
P7 = photo_page([
    "Taktu myndirnar í góðri dagsbirtu, ekki með flassi.",
    "Sendu tvær myndir: eina beint framan á augað með augað opið, og eina þar "
    "sem þú dregur neðra augnlokið varlega niður svo innra borðið sjáist.",
    "Sértu með hnút á augnloki, taktu líka mynd frá hlið.",
    "Haltu símanum í um 20 cm fjarlægð og passaðu að myndin sé í fókus.",
    "Fáðu einhvern til að taka myndina fyrir þig ef það er hægt — það verður "
    "skýrari mynd en sjálfsmynd.",
    "Ekki nota augndropa rétt áður en myndin er tekin.",
])

# ---------------------------------------------------------------- 8 · closing
P8 = closing_page(opts(
    ("advice", "Mati og ráðgjöf um hvað ég á að gera"),
    ("prescription", "Lyfseðli, t.d. augndropum eða smyrsli"),
    ("referral", "Tilvísun til augnlæknis"),
    ("certificate", "Vottorði"),
    ("unsure", "Veit ekki, vil bara láta meta þetta"),
))

QRES = questionnaire(
    "Augnsýkingar og augnlokavandamál",
    "Augnsykingar",
    "Erindi vegna vægra augnvandamála sem eru ekki bráð: hvarmabólga, vogrís "
    "og hvarmakýli, og óbrotin tárubólga. Öryggisskimun, sérstakt hlið fyrir "
    "linsunotendur, markviss forsaga, frjáls lýsing og skyldubundin mynd.",
    [P1, P2, P3, P4, P5, P6, P7, P8],
)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "augnsykingar.json"
    sys.exit(1 if write(QRES, out) else 0)
