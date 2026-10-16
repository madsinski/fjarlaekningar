// Hjálparsafnið: titlar, skýring og skref fyrir hverja leiðbeiningu.
// Uppbyggingin (flokkar, flipar, myndir) er í src/lib/hsu/help/articles.ts.
//
// Lyklar hverrar leiðbeiningar:
//   <id>.t  titill
//   <id>.w  hvenær þetta á við — ein setning
//   <id>.s  skrefin, eitt í hverri línu (\n)
//   <id>.k  leitarorð sem koma ekki fyrir í textanum sjálfum

import { defineMessages } from "../core";

export const help = defineMessages(
  {
    "title": "Hjálp",
    "subtitle": "Hvernig á að gera hlutina í vaktakerfinu.",
    "search": "Leitaðu að því sem þú vilt gera",
    "searchHint": "Leitaðu t.d. að „skipta“, „óskir“ eða „dagatal“.",
    "noResults": "Ekkert fannst um „{q}“. Prófaðu annað orð, eða flettu flokkunum hér fyrir neðan.",
    "back": "Til baka",
    "show": "Sýna mér",
    "startTour": "Byrja kynninguna",
    "steps": "Svona gerirðu",
    "when": "Hvenær",
    "close": "Loka",
    "open": "Opna hjálp",
    "all": "Allar leiðbeiningar",
    "hits_one": "{n} leiðbeining",
    "hits_other": "{n} leiðbeiningar",

    // ── Sprettigluggar: nýjungar og ráð ──
    "news.badge": "Nýtt í kerfinu",
    "news.more": "Sjá leiðbeiningar",
    "news.ok": "Takk, ég sá þetta",
    "news.dagvinna.t": "Dagvinnan: þrjár tegundir",
    "news.dagvinna.b": "Skref 3 í óskum heitir nú Dagvinna. Þú merkir ekki bara hvaða daga heldur líka hvers konar vinna það er: flýtimóttaka, móttaka eða deild. Vaktaskipulagið setur eingöngu dagvakt á flýtimóttökudaga.",
    "news.help.t": "Hjálpin er komin í hausinn",
    "news.help.b": "Spurningarmerkið efst til hægri opnar leiðbeiningar um allt sem þú gerir í kerfinu — með leit. Kynningin á kerfinu er þar líka.",
    "news.swap.t": "Þú getur nú skipt á vöktum",
    "news.swap.b": "Í Vaktaplani dregurðu þína vakt á vakt annars læknis og býður skipti. Hinn læknirinn eða yfirlæknir samþykkir, og þá skipta vaktirnar um hendur.",
    "news.weeknos.t": "Vikunúmer í dagatölunum",
    "news.weeknos.b": "Vikunúmerið stendur nú lengst til vinstri í öllum dagatölum og á prentaða vaktaplaninu — sama tal og í Outlook og Google.",

    "tip.badge": "Ráð",
    "tip.title": "Gott að vita",
    "tip.off": "Ekki sýna ráð aftur",
    "tip.ok": "Loka",
    "tip.offDone": "Allt í lagi — ráðin birtast ekki aftur. Þú finnur þau öll undir spurningarmerkinu.",

    // Ráð yfirlæknis — hann hefur ekki hjálparsafn og fær því eigin texta.
    "tip.head.dagvinna.t": "Dagvinnan hefur þrjár tegundir",
    "tip.head.dagvinna.b": "Læknar merkja nú hvers konar dagvinnu þeir eru í — flýtimóttöku, móttöku eða deild. Vaktaskipulagið setur dagvakt eingöngu á flýtimóttökudaga.",
    "tip.head.review.t": "Sjáðu dagvinnu allra í einu",
    "tip.head.review.b": "Í „Samþykkja óskir“ er rofi milli kvöldvakta og dagvinnu. Rofinn efst stillir öll kortin og hvert kort má víkja frá honum.",
    "tip.head.swap.t": "Læknar geta skipt á vöktum",
    "tip.head.swap.b": "Læknir dregur sína vakt á vakt annars í Vaktaplani. Beiðnin kemur í Vaktamarkað hjá þér og þú mátt samþykkja hana sjálfur.",
    "tip.head.late.t": "Óskir geta borist eftir að þú byrjar að raða",
    "tip.head.late.b": "Læknir sem á eftir að senda kemst enn að meðan vaktaplanið er í smíðum, og þú færð tilkynningu um óskirnar. Sendar og samþykktar óskir eru læstar eins og áður.",
    "tip.head.weeknos.t": "Vikunúmer í vaktaplaninu",
    "tip.head.weeknos.b": "Vikunúmerið stendur lengst til vinstri í borðinu og á prentaða blaðinu — sama tal og í Outlook og Google.",
    "tip.head.period.t": "Læknir í afmarkaðan tíma",
    "tip.head.period.b": "Skráðu upphaf og lok í „Læknar“. Hann hverfur þá sjálfkrafa úr næstu mánuðum, bæði úr óskum og vaktaskipulagi, án þess að eldri plön hreyfist.",
    "tip.head.exclude.t": "Taka lækni úr einum mánuði",
    "tip.head.exclude.b": "Í „Óskir lækna“ má undanskilja lækni þann mánuðinn — hann fellur úr sjálfvirku skiptingunni án þess að ráðningin breytist.",
    "cat.start": "Fyrstu skref",
    "cat.oskir": "Óskir",
    "cat.vaktir": "Vaktirnar þínar",
    "cat.skipti": "Vaktaskipti og markaður",
    "cat.dagatal": "Dagatal og tilkynningar",

    // ── Fyrstu skref ──
    "tour.t": "Kynning á kerfinu",
    "tour.w": "Þegar þú vilt sjá kerfið í heild, eins og við fyrstu innskráningu.",
    "tour.s": "Smelltu á „Byrja kynninguna“ hér fyrir neðan.\nKynningin fer með þig um alla flipana og bendir á það sem skiptir máli.\nÞú mátt hætta hvenær sem er og byrja aftur héðan.",
    "tour.k": "leiðsögn, kennsla, byrja, nýr",

    "login.t": "Lykilorð og PIN",
    "login.w": "Þegar þú vilt breyta lykilorðinu eða nota PIN í símanum.",
    "login.s": "Farðu í Stillingar.\nUndir „Aðgangur“ breytirðu lykilorði.\nPIN er fjögurra stafa tala sem kemur í staðinn fyrir lykilorðið í símanum þínum.\nGleymirðu lykilorðinu notarðu „Gleymt lykilorð“ á innskráningarsíðunni.",
    "login.k": "aðgangur, gleymt, öryggi, sími",

    "lang.t": "Skipta um tungumál",
    "lang.w": "Kerfið er á íslensku og ensku.",
    "lang.s": "Smelltu á IS eða EN efst til hægri.\nValið fylgir þér milli tækja og gildir líka um tölvupósta frá kerfinu.",
    "lang.k": "enska, icelandic, english, mál",

    "overview.t": "Yfirlitið: hvað þarf ég að gera?",
    "overview.w": "Þegar þú vilt sjá stöðuna í einu auga.",
    "overview.s": "Yfirlit er fyrsti flipinn.\nÞar sérðu næstu vaktir þínar, það sem bíður þín og tilkynningar.\nRauð eða gul merking á flipa þýðir að eitthvað bíði svars frá þér.",
    "overview.k": "forsíða, staða, hvað er ógert",

    // ── Óskir ──
    "prefs.t": "Skrá óskir fyrir mánuðinn",
    "prefs.w": "Áður en yfirlæknir raðar vöktum — alltaf fyrir skilafrest.",
    "prefs.s": "Farðu í Óskir.\nVeldu mánuðinn efst (skref 1).\nMerktu dagana sem þú getur ekki tekið kvöld- og næturvaktir (skref 2).\nMerktu dagvaktir á flýtimóttöku (skref 3).\nSkráðu fjölda vakta og athugasemd ef þú vilt (skref 4).\nSmelltu á „Senda“. Þú getur vistað drög og klárað síðar.",
    "prefs.k": "óskir, vaktaóskir, skrá, senda, mánuður, vaktabeiðni",

    "brush.t": "Pensillinn: merkja marga daga í einu",
    "brush.w": "Þegar þú vilt merkja heila viku eða allan mánuðinn hratt.",
    "brush.s": "Veldu pensil: „get ekki“, „vil gjarnan“ eða „hreinsa“.\nSmelltu á dag, eða haltu niðri og dragðu yfir marga daga.\nSmelltu á vikudag efst (MÁN, ÞRI …) til að setja sömu reglu á alla þá daga mánaðarins.\n„Sækja frá síðasta mánuði“ afritar óskir síðasta mánaðar yfir.",
    "brush.k": "mála, draga, vikudagur, regla, afrita",

    "evening.t": "„Get ekki“ — hvað nær það yfir?",
    "evening.w": "Þegar þú ert ekki til taks á kvöldin eða um nætur.",
    "evening.s": "Merkingin í skrefi 2 á við forvakt og bakvakt — vaktir utan dagvinnutíma.\nHún lokar EKKI á dagvinnu á flýtimóttöku; hana velurðu sjálfstætt í skrefi 3.\nViltu hvorugt þann daginn skaltu líka sleppa honum í skrefi 3.",
    "evening.k": "forvakt, bakvakt, frí, veikindi, kvöld",

    "fm.t": "Dagvinna: hvaða daga og hvers konar",
    "fm.w": "Þegar þú vilt skrá dagvinnuna þína fyrir mánuðinn.",
    "fm.s": "Opnaðu skref 3, Dagvinna, í Óskum.\nVeldu fyrst hvers konar vinna það er: flýtimóttaka, móttaka eða deild.\nVeldu svo hvaða hluta dagsins — allan daginn, fyrir hádegi eða eftir hádegi.\nSmelltu á dag eða dragðu yfir marga.\nÓmerktur dagur telst engin dagvinna.\nVaktaskipulagið setur aðeins dagvakt á flýtimóttökudaga, og aðeins á föstu dagana þína séu þeir skráðir. Móttöku og deild má skrá hvaða virka dag sem er.",
    "fm.k": "dagvinna, FM, flýtimóttaka, flýtimóttöku, dagvakt, dagvaktir, móttaka, deild, hálfur dagur, fyrir hádegi, eftir hádegi",

    "fmcap.t": "Hámark flýtimóttöku í viku og mánuði",
    "fmcap.w": "Þegar þú vilt setja þak á fjölda dagvakta.",
    "fmcap.s": "Þakið er í skrefi 3, neðan við dagatalið.\nSkráðu hámark á viku og hámark í mánuði.\nVaktaskipulagið fer aldrei yfir þessar tölur.\nStillingin er föst og gildir alla mánuði þar til þú breytir henni.",
    "fmcap.k": "þak, hámark, fjöldi, vika, mánuður, flýtimóttaka, dagvaktir",

    "maxshifts.t": "Fjöldi vakta og athugasemd",
    "maxshifts.w": "Þegar þú vilt takmarka heildarfjölda vakta eða koma skilaboðum áleiðis.",
    "maxshifts.s": "Skref 4 í Óskum.\nSkráðu hámarksfjölda vakta í mánuðinum.\nAthugasemdin fer beint til yfirlæknis — t.d. ferðalag eða námskeið.",
    "maxshifts.k": "hámark, fjöldi, skilaboð, athugasemd",

    "deadline.t": "Skilafrestur og áminningar",
    "deadline.w": "Þegar þú vilt vita hvenær óskir þurfa að vera komnar.",
    "deadline.s": "Skilafresturinn stendur efst í Óskum þegar yfirlæknir hefur sett hann.\nÁminning kemur í tölvupósti og SMS viku fyrir, þrem dögum fyrir, daginn fyrir og á frestdeginum.\nÞú færð aðeins áminningu um það sem er ógert hjá þér.",
    "deadline.k": "skilafrestur, frestur, 25., áminning, sms",

    "afterprefs.t": "Hvað gerist eftir að ég sendi óskir?",
    "afterprefs.w": "Þegar þú vilt vita hvar óskirnar þínar eru staddar.",
    "afterprefs.s": "Yfirlæknir fer yfir óskirnar og samþykkir þær.\nBiðji hann um breytingar opnast þær aftur og þú færð tilkynningu.\nSé hann byrjaður að raða vöktum getur þú enn skráð óskir ef þú hefur ekki sent — hann fær boð um þær.\nÞegar vaktaplanið er birt færðu tölvupóst með vöktunum þínum og PDF-skjali.",
    "afterprefs.k": "samþykkt, yfirferð, breytingar, staða",

    // ── Vaktir ──
    "roster.t": "Lesa vaktaplanið",
    "roster.w": "Þegar þú vilt sjá hver er á vakt hvenær.",
    "roster.s": "Farðu í Vaktaplan.\nVikunúmerið stendur lengst til vinstri í hverri röð.\nÞínar vaktir eru í þínum lit; aðrir eru hvítir með litaða rönd.\n„Aðeins mínar vaktir“ felur hina og „Sýna dagvinnu“ bætir dagvinnunni við.\nÖrvarnar efst fletta milli mánaða.",
    "roster.k": "vaktaplan, dagatal, mánuður, vikunúmer, vika, hver er á vakt",

    "myshifts.t": "Mínar vaktir",
    "myshifts.w": "Þegar þú vilt lista yfir þínar eigin vaktir.",
    "myshifts.s": "Farðu í Mínar vaktir.\nÞar eru birtar vaktir frá byrjun þessa mánaðar.\nHver vakt sýnir tegund, tíma og það sem bíður svars.",
    "myshifts.k": "listi, mínar, næstu vaktir",

    "vinnustund.t": "Skrá útköll í Vinnustund",
    "vinnustund.w": "Eftir forvakt eða bakvakt þar sem kom til útkalls.",
    "vinnustund.s": "Útköllin sjálf skráirðu í Vinnustund, ekki hér.\nMerktu svo við vaktina í Mínum vöktum þegar því er lokið.\nMerkingin er fyrir þig — þá sérðu hvað er eftir óskráð.",
    "vinnustund.k": "vinnustund, útkall, útköll, laun, skráning, merkja",

    "request.t": "Svara beiðni um aukavakt",
    "request.w": "Þegar yfirlæknir biður þig um að taka vakt.",
    "request.s": "Beiðnin birtist í Yfirliti og í Mínum vöktum, og þú færð tölvupóst.\nSmelltu á „Taka vaktina“ eða „Hafna“.\nSamþykkt vakt fer strax í vaktalistann þinn og dagatalið.\nVaktin telst ekki með í hámarkinu þínu, því þú samþykktir hana sérstaklega.",
    "request.k": "beiðni, aukavakt, samþykkja, hafna",

    "print.t": "Prenta vaktaplan",
    "print.w": "Þegar þú vilt plan mánaðarins á blaði.",
    "print.s": "Smelltu á „Prenta vaktaplan“ í Vaktaplani eða Mínum vöktum.\nSkjalið opnast sem PDF: allur mánuðurinn á einni síðu, þínar vaktir í lit.\nSama skjal fylgir tölvupóstinum þegar plan er birt.",
    "print.k": "prenta, prentun, pdf, blað, á vegg, vaktaplan",

    // ── Vaktaskipti og markaður ──
    "swap.t": "Skipta á vakt við annan lækni",
    "swap.w": "Þegar þú vilt losna við vakt en taka aðra í staðinn.",
    "swap.s": "Farðu í Vaktaplan.\nDragðu þína vakt yfir á vakt hins læknisins — eða smelltu á þína vakt og svo á hans.\nFarðu yfir hvað þú lætur og hvað þú færð, skrifaðu skilaboð ef þú vilt og sendu beiðnina.\nHinn læknirinn samþykkir hana, eða yfirlæknir.\nÞegar hún er samþykkt skipta vaktirnar um hendur og bæði dagatöl uppfærast.",
    "swap.k": "vaktaskipti, skipti, skipta, drag, draga, víxla, trade, swap",

    "swapanswer.t": "Svara beiðni um vaktaskipti",
    "swapanswer.w": "Þegar einhver vill skipta við þig.",
    "swapanswer.s": "Beiðnin birtist efst í Vaktamarkaði og þú færð tilkynningu.\nÞar sést hvað þú lætur og hvað þú færð.\nSmelltu á „Samþykkja skipti“ eða „Hafna“.\nYfirlæknir getur líka samþykkt skiptin fyrir ykkur.",
    "swapanswer.k": "vaktaskipti, samþykkja, hafna, skipti, beiðni",

    "tomarket.t": "Setja vakt á vaktamarkað",
    "tomarket.w": "Þegar þú vilt losna við vakt og hver sem er má taka hana.",
    "tomarket.s": "Farðu í Mínar vaktir.\nSmelltu á „Á vaktamarkað“ við vaktina.\nSkrifaðu skilaboð ef þú vilt og staðfestu.\nVaktin er áfram þín þar til einhver tekur hana.\nÞú getur dregið hana til baka í Vaktamarkaði.",
    "tomarket.k": "vaktamarkaður, markaður, losna, gefa, auglýsa, laus vakt",

    "offer.t": "Bjóða tilteknum lækni vakt",
    "offer.w": "Þegar þú veist hver gæti tekið vaktina.",
    "offer.s": "Farðu í Mínar vaktir og veldu „Á vaktamarkað“.\nVeldu lækni í stað þess að setja hana á markaðinn fyrir alla.\nHann einn fær boðið og getur tekið hana eða hafnað.\nHafni hann færðu tilkynningu og getur boðið öðrum.",
    "offer.k": "boð, einn, beint, velja lækni",

    "take.t": "Taka vakt af vaktamarkaði",
    "take.w": "Þegar þú vilt bæta við þig vakt.",
    "take.s": "Farðu í Vaktamarkað.\nÞar eru vaktir sem aðrir vilja láta, og boð sem þér eru send.\nSmelltu á „Taka vakt“.\nSé samþykki yfirlæknis áskilið fer hún í bið þar til hann staðfestir.\nVaktin fer í vaktalistann þinn og dagatalið um leið og hún er þín.",
    "take.k": "vaktamarkaður, taka, bæta við, laus vakt",

    // ── Dagatal og tilkynningar ──
    "calendar.t": "Setja vaktirnar í dagatalið þitt",
    "calendar.w": "Þegar þú vilt sjá vaktirnar í símanum eða Outlook.",
    "calendar.s": "Farðu í Stillingar → Dagatal.\nTengdu Google-dagatal með einum smelli — þá uppfærast vaktirnar sjálfkrafa.\nAnnars geturðu afritað áskriftarslóð og límt hana í Outlook eða Apple-dagatal.\nDagvinnan þín fylgir með, og breytingar skila sér án þess að þú gerir neitt.",
    "calendar.k": "dagatal, google, outlook, apple, ics, áskrift, sími, samstilling",

    "daywork.t": "Skrá dagvinnudagana þína",
    "daywork.w": "Þegar þú vinnur fasta daga og vilt að þeir sjáist.",
    "daywork.s": "Dagvinnudagar eru í Óskum, neðst í skrefi 3.\nVeldu vikudaga og hvers konar vinna það er: flýtimóttaka, móttaka eða deild.\nStillingin er föst og gildir alla mánuði.\nDagvinnan sést í Vaktaplani og fer í dagatalið þitt.",
    "daywork.k": "dagvinna, dagvinnudagar, móttaka, deild, fastir dagar, vikudagar",

    "emails.t": "Ráða hvaða tölvupósta þú færð",
    "emails.w": "Þegar þér finnst pósturinn of mikill eða of lítill.",
    "emails.s": "Farðu í Stillingar → Tilkynningar í tölvupósti.\nHver flokkur hefur þrjá kosti: strax, ein samantekt eða enginn póstur.\nÖryggispóstar fara alltaf: boð um aðgang og breytt lykilorð.\nTilkynningar birtast áfram í kerfinu þótt þú slökkvir á póstinum.",
    "emails.k": "tölvupóstur, póstur, samantekt, slökkva, tilkynningar",

    "sms.t": "SMS-áminningar",
    "sms.w": "Þegar þú vilt (eða vilt ekki) skilaboð í símann.",
    "sms.s": "Farðu í Stillingar → Tilkynningar.\nKveiktu eða slökktu á SMS-áminningum.\nSMS fer aðeins um skilafrest óska og krefst þess að símanúmerið þitt sé skráð.\nYfirlæknir skráir númerið; láttu hann vita ef það vantar.",
    "sms.k": "sms, sími, númer, áminning",
  },
  {
    en: {
      "title": "Help",
      "subtitle": "How to do things in the shift system.",
      "search": "Search for what you want to do",
      "searchHint": "Try “swap”, “requests” or “calendar”.",
      "noResults": "Nothing found for “{q}”. Try another word, or browse the categories below.",
      "back": "Back",
      "show": "Show me",
      "startTour": "Start the tour",
      "steps": "How to do it",
      "when": "When",
      "close": "Close",
      "open": "Open help",
      "all": "All guides",
      "hits_one": "{n} guide",
      "hits_other": "{n} guides",

      "news.badge": "New in the system",
      "news.more": "See the guide",
      "news.ok": "Thanks, got it",
      "news.dagvinna.t": "Day work: three kinds",
      "news.dagvinna.b": "Step 3 in your requests is now called Day work. You mark not only which days but what kind of work it is: day clinic, reception or ward. The planner only assigns day shifts on day-clinic days.",
      "news.help.t": "Help now lives in the header",
      "news.help.b": "The question mark at the top right opens guides for everything you do here — with search. The tour of the system is in there too.",
      "news.swap.t": "You can now swap shifts",
      "news.swap.b": "In the Schedule, drag your shift onto another doctor's shift to offer a swap. They or the chief physician approve it, and the shifts change hands.",
      "news.weeknos.t": "Week numbers in the calendars",
      "news.weeknos.b": "The week number now sits on the far left of every calendar and on the printed schedule — the same numbering as Outlook and Google.",

      "tip.badge": "Tip",
      "tip.title": "Worth knowing",
      "tip.off": "Don't show tips again",
      "tip.ok": "Close",
      "tip.offDone": "That's fine — tips won't appear again. You'll find them all under the question mark.",

      "tip.head.dagvinna.t": "Day work now has three kinds",
      "tip.head.dagvinna.b": "Doctors now mark what kind of day work they do: day clinic, reception or ward. The planner only assigns day shifts on day-clinic days.",
      "tip.head.review.t": "See everyone's day work at once",
      "tip.head.review.b": "In Approve requests there is a switch between evening shifts and day work. The one at the top sets every card, and each card can differ.",
      "tip.head.swap.t": "Doctors can swap shifts",
      "tip.head.swap.b": "A doctor drags their shift onto another's in the Schedule. The request appears in your Shift market and you can approve it yourself.",
      "tip.head.late.t": "Requests can arrive after you start planning",
      "tip.head.late.b": "A doctor who hasn't submitted can still do so while the schedule is being built, and you are notified. Submitted and approved requests stay locked as before.",
      "tip.head.weeknos.t": "Week numbers in the schedule",
      "tip.head.weeknos.b": "The week number is on the far left of the board and on the printed sheet — the same numbering as Outlook and Google.",
      "tip.head.period.t": "A doctor for a limited period",
      "tip.head.period.b": "Set a start and end date under Doctors. They then drop out of later months automatically, from both requests and planning, without touching earlier schedules.",
      "tip.head.exclude.t": "Leave a doctor out of one month",
      "tip.head.exclude.b": "In Doctors' requests you can exclude a doctor for that month — they fall out of the automatic split without changing their employment.",
      "cat.start": "Getting started",
      "cat.oskir": "Requests",
      "cat.vaktir": "Your shifts",
      "cat.skipti": "Swaps and the market",
      "cat.dagatal": "Calendar and notifications",

      "tour.t": "Tour of the system",
      "tour.w": "When you want to see the whole system, as at first sign-in.",
      "tour.s": "Click “Start the tour” below.\nIt walks you through every tab and points out what matters.\nYou can stop at any time and start again from here.",
      "tour.k": "guide, intro, walkthrough, new",

      "login.t": "Password and PIN",
      "login.w": "When you want to change your password or use a PIN on your phone.",
      "login.s": "Go to Settings.\nUnder “Account” you can change your password.\nThe PIN is a four-digit code that replaces your password on your phone.\nIf you forget your password, use “Forgot password” on the sign-in page.",
      "login.k": "access, forgot, security, phone",

      "lang.t": "Change language",
      "lang.w": "The system is in Icelandic and English.",
      "lang.s": "Click IS or EN at the top right.\nYour choice follows you between devices and applies to emails from the system too.",
      "lang.k": "english, icelandic, language",

      "overview.t": "The overview: what do I need to do?",
      "overview.w": "When you want the whole picture at a glance.",
      "overview.s": "Overview is the first tab.\nIt shows your next shifts, what is waiting for you and your notifications.\nA red or amber badge on a tab means something is waiting for your answer.",
      "overview.k": "home, status, what is pending",

      "prefs.t": "Enter your requests for the month",
      "prefs.w": "Before the chief physician builds the schedule — always before the deadline.",
      "prefs.s": "Go to Requests.\nChoose the month at the top (step 1).\nMark the days you cannot take evening or night shifts (step 2).\nMark your walk-in clinic day shifts (step 3).\nSet the number of shifts and add a note if you want (step 4).\nClick “Send”. You can save a draft and finish later.",
      "prefs.k": "shift requests, submit, send, month",

      "brush.t": "The brush: mark many days at once",
      "brush.w": "When you want to mark a whole week or month quickly.",
      "brush.s": "Choose a brush: “can't work”, “would like to” or “clear”.\nClick a day, or hold and drag across several days.\nClick a weekday at the top (MON, TUE …) to apply the same rule to all those days of the month.\n“Copy from last month” brings last month's requests over.",
      "brush.k": "paint, drag, weekday, rule, copy",

      "evening.t": "“Can't work” — what does it cover?",
      "evening.w": "When you are not available in the evening or at night.",
      "evening.s": "The mark in step 2 applies to first and second on call — shifts outside day-work hours.\nIt does NOT block walk-in clinic day work; you choose that separately in step 3.\nIf you want neither that day, leave it unmarked in step 3 as well.",
      "evening.k": "on call, time off, sick, evening",

      "fm.t": "Day work: which days and what kind",
      "fm.w": "When you want to record your day work for the month.",
      "fm.s": "Open step 3, Day work, in Requests.\nFirst choose the kind of work: day clinic, reception or ward.\nThen choose the part of the day — all day, morning or afternoon.\nClick a day or drag across several.\nAn unmarked day counts as no day work.\nThe planner only assigns day shifts on day-clinic days, and only on your fixed days if you have any. Reception and ward can go on any weekday.",
      "fm.k": "day work, walk-in, day clinic, reception, ward, half day, morning, afternoon",

      "fmcap.t": "Weekly and monthly cap on walk-in shifts",
      "fmcap.w": "When you want a limit on the number of day shifts.",
      "fmcap.s": "The cap is in step 3, below the calendar.\nSet a weekly maximum and a monthly maximum.\nThe planner never goes above those numbers.\nThe setting is permanent and applies to every month until you change it.",
      "fmcap.k": "cap, maximum, limit, week, month",

      "maxshifts.t": "Number of shifts and a note",
      "maxshifts.w": "When you want to limit your total shifts or pass on a message.",
      "maxshifts.s": "Step 4 in Requests.\nSet the maximum number of shifts for the month.\nThe note goes straight to the chief physician — travel, a course, and so on.",
      "maxshifts.k": "maximum, total, message, note",

      "deadline.t": "Deadline and reminders",
      "deadline.w": "When you want to know when requests are due.",
      "deadline.s": "The deadline is shown at the top of Requests once the chief physician sets it.\nReminders arrive by email and SMS a week before, three days before, the day before and on the day.\nYou are only reminded about what you have left undone.",
      "deadline.k": "deadline, 25th, reminder, sms",

      "afterprefs.t": "What happens after I send my requests?",
      "afterprefs.w": "When you want to know where your requests stand.",
      "afterprefs.s": "The chief physician reviews and approves them.\nIf he asks for changes they reopen and you get a notification.\nIf he has started building the schedule you can still enter requests if you haven't sent them — he is notified.\nWhen the schedule is published you get an email with your shifts and a PDF.",
      "afterprefs.k": "approved, review, changes, status",

      "roster.t": "Reading the schedule",
      "roster.w": "When you want to see who is on when.",
      "roster.s": "Go to Schedule.\nThe week number is on the far left of each row.\nYour shifts are in your colour; others are white with a coloured edge.\n“Only my shifts” hides the rest and “Show day work” adds your day work.\nThe arrows at the top move between months.",
      "roster.k": "calendar, month, week number, who is on",

      "myshifts.t": "My shifts",
      "myshifts.w": "When you want a list of your own shifts.",
      "myshifts.s": "Go to My shifts.\nIt lists published shifts from the start of this month.\nEach shift shows its type, times and anything awaiting an answer.",
      "myshifts.k": "list, mine, next shifts",

      "vinnustund.t": "Logging call-outs in Vinnustund",
      "vinnustund.w": "After a first or second on-call shift where you were called out.",
      "vinnustund.s": "You register the call-outs themselves in Vinnustund, not here.\nThen tick the shift in My shifts when that is done.\nThe tick is for you — so you can see what is still unlogged.",
      "vinnustund.k": "call-out, pay, logging, tick",

      "request.t": "Answering a request for an extra shift",
      "request.w": "When the chief physician asks you to take a shift.",
      "request.s": "The request appears in Overview and My shifts, and you get an email.\nClick “Take the shift” or “Decline”.\nAn accepted shift goes straight into your shift list and calendar.\nIt does not count towards your maximum, since you agreed to it separately.",
      "request.k": "request, extra shift, accept, decline",

      "print.t": "Printing the schedule",
      "print.w": "When you want the month on paper.",
      "print.s": "Click “Print schedule” in Schedule or My shifts.\nIt opens as a PDF: the whole month on one page, your shifts in colour.\nThe same document is attached to the email when a schedule is published.",
      "print.k": "pdf, print, paper, wall",

      "swap.t": "Swapping a shift with another doctor",
      "swap.w": "When you want to give up a shift but take another instead.",
      "swap.s": "Go to Schedule.\nDrag your shift onto the other doctor's shift — or tap yours, then theirs.\nCheck what you give and what you get, add a message if you want, and send the request.\nThe other doctor approves it, or the chief physician does.\nOnce approved the shifts change hands and both calendars update.",
      "swap.k": "swap, drag, trade, exchange",

      "swapanswer.t": "Answering a swap request",
      "swapanswer.w": "When someone wants to swap with you.",
      "swapanswer.s": "The request appears at the top of the Shift market and you get a notification.\nIt shows what you give and what you get.\nClick “Accept swap” or “Decline”.\nThe chief physician can also approve the swap for you.",
      "swapanswer.k": "accept, decline, swap, request",

      "tomarket.t": "Putting a shift on the market",
      "tomarket.w": "When you want to give up a shift and anyone may take it.",
      "tomarket.s": "Go to My shifts.\nClick “To the market” on the shift.\nAdd a message if you want and confirm.\nThe shift stays yours until someone takes it.\nYou can withdraw it from the Shift market.",
      "tomarket.k": "market, give away, advertise",

      "offer.t": "Offering a shift to one doctor",
      "offer.w": "When you know who might take the shift.",
      "offer.s": "Go to My shifts and choose “To the market”.\nPick a doctor instead of offering it to everyone.\nOnly they get the offer and can take it or decline.\nIf they decline you are notified and can offer it to someone else.",
      "offer.k": "offer, direct, choose doctor",

      "take.t": "Taking a shift from the market",
      "take.w": "When you want to take on an extra shift.",
      "take.s": "Go to Shift market.\nIt lists shifts others want to give up, and offers sent to you.\nClick “Take shift”.\nIf approval is required it waits until the chief physician confirms.\nThe shift goes into your list and calendar as soon as it is yours.",
      "take.k": "take, pick up, free shift",

      "calendar.t": "Getting your shifts into your calendar",
      "calendar.w": "When you want your shifts on your phone or in Outlook.",
      "calendar.s": "Go to Settings → Calendar.\nConnect Google Calendar in one click — your shifts then update automatically.\nOtherwise copy the subscription link and paste it into Outlook or Apple Calendar.\nYour day work is included, and changes follow without you doing anything.",
      "calendar.k": "google, outlook, apple, ics, subscribe, phone",

      "daywork.t": "Registering your day-work days",
      "daywork.w": "When you work fixed days and want them to show.",
      "daywork.s": "Day-work days are in Requests, at the bottom of step 3.\nChoose the weekdays and the kind of work: walk-in clinic, clinic or ward.\nThe setting is permanent and applies to every month.\nDay work shows in the Schedule and goes into your calendar.",
      "daywork.k": "clinic, ward, fixed days, weekdays",

      "emails.t": "Choosing which emails you get",
      "emails.w": "When there is too much email, or too little.",
      "emails.s": "Go to Settings → Email notifications.\nEach category has three options: immediately, one summary, or no email.\nSecurity emails always go out: access invitations and password changes.\nNotifications still appear in the system even if you turn email off.",
      "emails.k": "email, summary, turn off, notifications",

      "sms.t": "SMS reminders",
      "sms.w": "When you do (or don't) want texts on your phone.",
      "sms.s": "Go to Settings → Notifications.\nTurn SMS reminders on or off.\nSMS is only used for the request deadline and needs your phone number on file.\nThe chief physician records the number; tell him if it is missing.",
      "sms.k": "sms, phone, number, reminder",
    },
  },
);
