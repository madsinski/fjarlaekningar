// The module catalogue.
//
// Each entry is one decision a medical advisor can make on its own merits, and
// it carries everything that decision needs: the question, the claim it earns,
// how to run it, what it costs, what it cannot show, and what must exist on
// paper first.
//
// Three are marked `core` — resolution, incidents and response time. Without
// them there is no evaluation, only anecdote.
//
// Order here is the order they are offered. Cheap and load-bearing first.

import type { Module } from "./types";
import { EXTRA_MODULES } from "./modules-extra";
import { DESIGN_MODULE } from "./design";
import { pct } from "./totals";

const n = (v: number) => v.toLocaleString("is-IS");
const p = (v: number | null) => (v === null ? null : `${v}%`);
// Icelandic number agreement: singular after numbers ending in 1, except 11.
const pl = (v: number, one: string, many: string) => (v % 10 === 1 && v % 100 !== 11 ? one : many);
// One decimal with an Icelandic decimal comma.
const d1 = (v: number) => v.toLocaleString("is-IS", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const MODULES: Module[] = [
  // ── Effectiveness ─────────────────────────────────────────────────────────
  {
    id: "resolution",
    name: "Afgreiðsla erinda",
    question: "Eru erindin í raun afgreidd í fjarþjónustu?",
    claim: "X% erinda voru afgreidd að fullu í fjarþjónustu og við getum sýnt það fyrir hverja tegund erindis.",
    category: "system",
    lead: true,
    core: true,
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Sýnir, fyrir hverja tegund erindis, hvort þjónustan gerir það sem hún segist gera.",
    horizon: "now",
    rationale:
      "Þetta er grunnfullyrðingin. Allt annað er annaðhvort skilyrði fyrir henni eða afleiðing af henni. Markmiðið er ekki hæsta mögulega tala. Ellefu græn gátmerki yfir 95% sannfæra engan. Tafla þar sem níu tegundir standa vel, tvær eru á mörkunum og þú getur sagt hverju þú breyttir er mun trúverðugri. Hún sýnir stofnun sem lærir.",
    caveat:
      "Hlutfall án fjölda segir ekkert. 95% af tuttugu erindum er ekki niðurstaða. Lestu það alltaf með fjölda erinda.",
    protocol: [
      { text: "Skilgreindu hvað „afgreitt“ þýðir og festu skilgreininguna", detail: "Afgreitt, vísað áfram, stöðvað í skimun. Orðin verða að þýða nákvæmlega það sama í fyrsta mánuði og þeim tólfta. Skilgreiningar sem breytast á miðri leið fella fleiri gæðaverkefni en nokkuð annað.", timeCritical: true },
      { text: "Gerðu niðurstöðu erindis að kóðuðum skyldureit í Medalia", detail: "Ef niðurstaðan er aðeins í frjálsum texta í bréfi læknisins bjargar enginn gagnaútdráttur þér. Þá þarftu að lesa þúsund færslur í lokin.", timeCritical: true },
      { text: "Semdu um mánaðarlegan gagnaútdrátt og gakktu úr skugga um að vinnslusamningurinn nái yfir hann" },
      { text: "Lestu inn fyrsta mánuðinn og athugaðu hvort afgreidd og vísað áfram gefi heildina", detail: "Innlesturinn bendir á mismuninn. Ef tölurnar stemma ekki er niðurstöðureiturinn oftast ekki enn orðinn skyldureitur." },
    ],
    fields: [
      { key: "cases_total", label: "Erindi móttekin", source: "medalia" },
      { key: "cases_resolved", label: "Afgreidd í fjarþjónustu", source: "medalia" },
      { key: "cases_referred", label: "Vísað áfram", source: "medalia" },
      { key: "cases_repeat", label: "Endurtekin erindi", help: "Sami sjúklingur, sami vandi, aftur.", source: "medalia" },
    ],
    documents: [
      { id: "definitions", name: "Fastar skilgreiningar", why: "Ein síða sem segir hvað afgreitt, vísað áfram og stöðvað þýða. Allt sem á eftir kemur byggir á því að hún haggist ekki.", required: true },
    ],
    metrics: [
      {
        id: "resolution_rate", name: "Afgreitt í fjarþjónustu", headline: true,
        why: "Grunnfullyrðingin. Lestu hana með fjölda erinda. Hátt hlutfall af fáum erindum er ekki niðurstaða.",
        compute: ({ t }) => {
          // Cases with neither outcome recorded mean the outcome field is not
          // in the export — that is "missing", never "0% resolved".
          const recorded = t.cases_total > 0 && t.cases_resolved + t.cases_referred > 0;
          return {
            value: recorded ? p(pct(t.cases_resolved, t.cases_total)) : null,
            detail: recorded
              ? `${n(t.cases_resolved)} af ${n(t.cases_total)} ${pl(t.cases_total, "erindi", "erindum")} lokið án tilvísunar`
              : t.cases_total ? `${n(t.cases_total)} erindi, en niðurstaða þeirra er ekki skráð` : "Engin erindi enn",
            missing: !t.cases_total ? "Gagnaútdráttur úr Medalia" : recorded ? undefined : "Niðurstaða erinda í Medalia",
            status: !recorded ? undefined : pct(t.cases_resolved, t.cases_total)! >= 80 ? "good" : pct(t.cases_resolved, t.cases_total)! >= 60 ? "fair" : "poor",
          };
        },
      },
      {
        id: "volume", name: "Erindi móttekin",
        why: "Nefnarinn fyrir allt hér að ofan. Lítill fjöldi er heiðarleg takmörkun, ekki brestur. En hann verður að sjást.",
        compute: ({ t }) => ({ value: n(t.cases_total), detail: `Á ${t.months} ${pl(t.months, "mánuði", "mánuðum")}` }),
      },
      {
        id: "referral_mix", name: "Sent annað",
        why: "Tilvísun er ekki brestur. Hún sýnir að þjónustan þekkir takmörk sín. Lestu hana með fjölda þeirra sem var vísað frá, því aðeins sá hluti er öryggismerki.",
        compute: ({ t }) => ({
          value: n(t.cases_referred),
          detail: `${n(Math.max(0, t.cases_referred - t.excluded_by_doctor))} vísað áfram til aðila sem gat hjálpað, ${n(t.excluded_by_doctor)} vísað frá þar sem erindið hentaði ekki`,
        }),
      },
      {
        id: "repeat", name: "Endurtekin erindi",
        why: "Afgreiðsla sem heldur ekki er engin afgreiðsla.",
        compute: ({ t }) => ({ value: n(t.cases_repeat), detail: "Sami sjúklingur, sami vandi, innan tímabilsins" }),
      },
    ],
  },

  {
    id: "response-time",
    name: "Biðtími sjúklinga",
    question: "Hve lengi bíða sjúklingar eftir svari, og stöndum við loforðið um svar innan tveggja klukkustunda?",
    claim: "Miðgildi svartíma var T mínútur og 95% fengu svar innan P. Loforðið er tvær klukkustundir.",
    category: "system",
    core: true,
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Breytir loforðinu um tvær klukkustundir í tölu sem má setja á glæru.",
    horizon: "now",
    rationale:
      "Þetta loforð er prófað upphátt á hverjum einasta fundi. Talan fæst ókeypis úr tímastimplum sem eru þegar í Medalia. Hún er því sterkasta einstaka talan í safninu miðað við vinnu.",
    caveat:
      "Hún mælir aðeins okkar hluta. Sjúklingurinn upplifir alla biðina, og um hana fjallar rannsóknarþátturinn um aðgengi.",
    protocol: [
      { text: "Staðfestu að Medalia geti skilað svartíma sem TÍMALENGD í mínútum", detail: "Aldrei sem tímastimpli. Tímastimpill og lítil stöð geta saman gert sjúkling persónugreinanlegan. Tímalengd gerir það ekki." },
      { text: "Semdu um hvernig tíminn er mældur: frá innsendingu að fyrsta svari læknis" },
    ],
    fields: [
      { key: "response_median_min", label: "Miðgildi svartíma", unit: "minutes", nullable: true, source: "medalia" },
      { key: "response_p95_min", label: "95. hundraðsmark", unit: "minutes", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "response", name: "Miðgildi svartíma", headline: true,
        why: "Loforðið, prófað. Ódýrt að fá og erfitt að andmæla.",
        compute: ({ t, a }) => ({
          value: t.response_median_min === null ? null : `${t.response_median_min} mín.`,
          detail: t.response_p95_min !== null
            ? `95% fengu svar innan ${t.response_p95_min} mín. Loforðið er ${a.responseTargetMinutes} mín.`
            : `Loforðið er ${a.responseTargetMinutes} mín.`,
          missing: t.response_median_min === null ? "Gagnaútdráttur úr Medalia" : undefined,
          status: t.response_median_min === null ? undefined
            : t.response_median_min <= a.responseTargetMinutes / 2 ? "good"
            : t.response_median_min <= a.responseTargetMinutes ? "fair" : "poor",
        }),
      },
    ],
  },

  {
    id: "incidents",
    name: "Atvikaskráning",
    question: "Verður einhver fyrir skaða?",
    claim: "Engin alvarleg atvik, N frávik skráð og þeim lokað, og hér er kerfið sem hefði gripið alvarlegt atvik.",
    category: "safety",
    lead: true,
    core: true,
    effort: "low",
    sources: ["survey"],
    benefit:
      "Gerir þér kleift að segja „engin alvarleg atvik“ og að fólk trúi því.",
    horizon: "now",
    rationale:
      "Þetta er skilyrði, ekki kvarði. Frábært hlutfall afgreiddra erinda ásamt einu alvarlegu atviki er misheppnað verkefni. Engin góð tala annars staðar vegur það upp. Núll er aðeins trúverðugt ef sést að einhver var að telja. Þess vegna eru frávik og næstum-atvik sýnd við hliðina, ekki falin.",
    caveat:
      "Ein stöð með fjögur þúsund íbúa fær aldrei nógu háar tölur til að segja neitt um sjaldgæfa atburði. Taktu það fram strax á fyrstu glærunni, áður en einhver í salnum gerir það.",
    protocol: [
      { text: "Taktu frávikseyðublað í notkun", detail: "Eitt eyðublað dugar. En „engin alvarleg atvik“ er aðeins trúverðugt ef til var kerfi sem hefði gripið slíkt atvik.", timeCritical: true },
      { text: "Semdu við HSU um hvað telst atvik og hvernig það er skráð", detail: "Ein skrifleg skilgreining sem báðar stofnanir nota. Þá er atvik á heilsugæslunni og atvik í fjarþjónustunni talið á sama hátt.", timeCritical: true },
      { text: "Gefðu sjúklingum og starfsfólki HSU leið til að tilkynna atvik", detail: "Sína leiðina fyrir hvorn hóp. Sjúklingur á ekki að þurfa að fara í gegnum þjónustuna sem hann kvartar undan. Starfsfólk HSU þarf leið sem er óháð okkur.", timeCritical: true },
      { text: "Semdu um hver fer yfir frávik og hversu oft" },
      { text: "Ákveddu með yfirlækni stofnunarinnar hvert alvarlegum málum er vísað" },
    ],
    fields: [
      { key: "deviations", label: "Skráð frávik", source: "survey" },
      { key: "near_misses", label: "þar af næstum-atvik", source: "survey" },
      { key: "serious_incidents", label: "Alvarleg atvik", source: "survey" },
    ],
    documents: [
      { id: "incident-procedure", name: "Verklag um atvik", why: "Hvað telst atvik, hvernig sjúklingar og starfsfólk HSU tilkynna það, hver fer yfir það og hvernig því er vísað áfram og lokað.", required: true },
    ],
    metrics: [
      {
        id: "serious", name: "Alvarleg atvik", headline: true,
        why: "Skilyrðið. Núll er aðeins trúverðugt ef sýnt er að talið var.",
        compute: ({ t }) => ({
          value: n(t.serious_incidents),
          detail: `${n(t.deviations)} frávik skráð, þar af ${n(t.near_misses)} næstum-atvik`,
          status: t.serious_incidents > 0 ? "poor" : t.deviations > 0 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "case-mix",
    name: "Samsetning erinda og greiningarkóðar",
    question: "Hverjar af ellefu tegundum erinda virka í raun, og höldum við okkur innan ramma þjónustunnar?",
    claim: "Hér er hlutfall afgreiddra erinda fyrir hverja tegund, með kóðum og sambærilegt við landstölur heilsugæslunnar.",
    category: "system",
    effort: "medium",
    sources: ["medalia"],
    benefit:
      "Gerir tölurnar sambærilegar við heilsugæsluna á landsvísu, í stað þess að þær séu aðeins bornar saman við sjálfar sig.",
    horizon: "now",
    rationale:
      "Vanmetinn, og verðmætasti einstaki þátturinn í allri rannsóknaráætluninni. Ekki vegna kóðunarinnar sjálfrar heldur vegna samanburðarins. Án kóða standa tölurnar okkar einar. „400 erindi“ segja áheyrendum ekkert. Með ICD-10 kóðum má bera þær saman við landsskrá um samskipti við heilsugæslu og segja hve stóran hluta við önnuðumst af þeim fjölda sem búast mátti við í svo stóru þýði. Það er allt önnur fullyrðing. Kóðarnir eru líka lykillinn sem tengir okkar tölur við nefnara stofnunarinnar.",
    caveat:
      "Heildarhlutfallið felur það þegar þrjár tegundir erinda bera hinar átta uppi. Einmitt þess vegna er þessi rannsóknarþáttur til. Gerðu ráð fyrir að sumar af tegundunum ellefu komi illa út. Það er niðurstaða, ekki mistök.",
    protocol: [
      { text: "Veldu 3–5 ICD-10 kóða fyrir hverja af ellefu tegundum erinda", detail: "Í samráði við lækni. Hafðu safnið þröngt og skriflegt. Ef erindi fara síðar að falla utan þess er það sjálfstætt merki um að rammi þjónustunnar sé að færast.", timeCritical: true },
      { text: "Athugaðu hvort Medalia styðji líka ICPC-2", detail: "Alþjóðlega flokkunarkerfið fyrir heilsugæslu. Ef það er í boði opnar það fyrir samanburð við önnur lönd." },
      { text: "Gerðu greiningarkóða að skyldureit", timeCritical: true },
      { text: "Tryggðu að erindi sem er vísað áfram eða eru stöðvuð fái líka kóða", detail: "Annars hverfur nefnarinn aftur." },
    ],
    fields: [{ key: "codes_outside_set", label: "Erindi utan umsamins kóðasafns", source: "medalia" }],
    documents: [
      { id: "code-sets", name: "Umsamin kóðasöfn", why: "Þrír til fimm ICD-10 kóðar fyrir hverja tegund erindis, samþykktir af lækni. Þeir tengja okkar tölur við nefnara stofnunarinnar. Mikilvægasta skjalið í rannsóknaráætluninni.", required: true },
    ],
    metrics: [
      {
        id: "scope_drift", name: "Utan kóðasafns", headline: true,
        why: "Fyrsta merki þess að rammi þjónustunnar sé að færast, löngu áður en nokkur tekur eftir því á stöðinni.",
        compute: ({ t }) => ({
          value: n(t.codes_outside_set),
          detail: t.cases_total ? `${pct(t.codes_outside_set, t.cases_total)}% allra erinda` : "Engin erindi enn",
          status: !t.cases_total ? undefined : pct(t.codes_outside_set, t.cases_total)! <= 5 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "scope-discovery",
    name: "Nýir erindaflokkar",
    question: "Með hvað kemur fólk sem við ráðum ekki enn við?",
    claim: "Við byrjuðum með ellefu tegundir erinda. Gögnin sögðu okkur hverjar næstu þrjár ættu að vera.",
    category: "system",
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Sýnir hvaða tegundir erinda á að byggja upp næst, út frá gögnum en ekki tilfinningu.",
    horizon: "now",
    rationale:
      "Í almenna flokknum leynast tegundir tólf, þrettán og fjórtán. Lítil vinna, því fjöldinn er nógu lítill til að flokka í höndunum einu sinni í mánuði. Út kemur glæran sem selur sig sjálf: hún sýnir þjónustu sem vex með stofnuninni, ekki fullmótaða vöru sem breytist ekki.",
    caveat:
      "Að flokka frjálsan texta er matsatriði. Líttu á niðurstöðuna sem vísbendingu til að skoða nánar, aldrei sem tölu til birtingar.",
    protocol: [
      { text: "Farðu mánaðarlega yfir almenn erindi sem voru ekki afgreidd" },
      { text: "Flokkaðu þau eftir því um hvað erindið snerist í raun", detail: "Í höndunum. Fjöldinn leyfir það. Tillaga frá gervigreind er í lagi hér, því mistök kosta lítið og ekkert er birt." },
      { text: "Athugaðu ársfjórðungslega hvort einhver flokkur sé orðinn nógu stór til að verða sérstök tegund erindis" },
    ],
    fields: [
      { key: "general_total", label: "Almenn erindi", source: "medalia" },
      { key: "general_resolved", label: "þar af afgreidd", source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "unresolved_general", name: "Óafgreidd almenn erindi", headline: true,
        why: "Vegvísirinn að næstu tegundum erinda, og glæran sem selur sig sjálf.",
        compute: ({ t }) => ({
          value: t.general_total ? n(t.general_total - t.general_resolved) : null,
          detail: t.general_total ? `af ${n(t.general_total)} ${pl(t.general_total, "almennu erindi", "almennum erindum")}` : "Engin almenn erindi skráð",
          missing: t.general_total ? undefined : "Gagnaútdráttur úr Medalia",
        }),
      },
    ],
  },

  {
    id: "cross-count",
    name: "Óháð talning til samanburðar",
    question: "Eru tölurnar okkar um fjölda erinda réttar?",
    claim: "Tvær óháðar talningar stemma innan X%. Fjöldi erinda er því ekki afurð eins kerfis.",
    category: "system",
    effort: "low",
    sources: ["internal"],
    benefit:
      "Grípur ranga talningu áður en hún ratar í skýrslu.",
    // Checks whether our own numbers are right rather than measuring the
    // service, so it stays off the outcome dashboard like the study design.
    meta: true,
    horizon: "now",
    rationale:
      "Læknar skrá nú þegar fjölda sjúklinga á hverri vakt í vaktaskránni. Það er önnur talning á því sama og Medalia telur, úr öðru kerfi og frá annarri manneskju. Tvær óháðar talningar sem stemma eru mun sterkari en ein sem ekki er hægt að sannreyna. Ef þeim ber ekki saman er önnur röng, og það þarf að koma í ljós áður en talan fer í skýrslu.",
    caveat:
      "Þetta virkar aðeins ef læknar halda áfram að fylla út reitinn. Ef skráning fellur niður sést það hér sem skyndilegt núll, og það er í sjálfu sér vert að fylgjast með.",
    protocol: [
      { text: "Biddu lækna að skrá fjölda sjúklinga á hverri vakt", detail: "Smá agi í vaktaskránni sem borgar sig í fyrsta sinn sem einhver efast um fjölda erinda.", link: { href: "/admin/roster", label: "Vaktaskrá" } },
      { text: "Berðu saman við fjölda erinda í Medalia í hverjum mánuði" },
      { text: "Kannaðu allan mun yfir 10% áður en talan fer í skýrslu" },
    ],
    fields: [],
    documents: [],
    metrics: [
      {
        id: "cross_check", name: "Skráð af læknum", headline: true,
        why: "Óháð athugun á fjölda erinda. Ef tölunum ber ekki saman er önnur talningin röng.",
        compute: ({ t, roster }) => ({
          value: roster.patientsLogged ? n(roster.patientsLogged) : null,
          detail: roster.patientsLogged && t.cases_total
            ? `Medalia telur ${n(t.cases_total)}. Munurinn er ${Math.abs(Math.round(((roster.patientsLogged - t.cases_total) / t.cases_total) * 100))}%`
            : "Læknar skrá fjölda sjúklinga á eigin vöktum",
          missing: roster.patientsLogged ? undefined : "Skráning lækna á fjölda sjúklinga á vakt",
          status: roster.patientsLogged && t.cases_total
            ? (Math.abs(roster.patientsLogged - t.cases_total) / t.cases_total <= 0.1 ? "good" : "fair")
            : undefined,
        }),
      },
    ],
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  {
    id: "screening",
    name: "Skimun fyrir rauðum flöggum",
    question: "Hve mörgum er vísað frá, á hvaða stigi og af hvaða ástæðu?",
    claim: "N sjúklingum var vísað frá vegna rauðs flaggs, M af spurningalistanum og K af lækni, og hér er ástæðan fyrir hverju tilviki.",
    category: "safety",
    benefit:
      "Svarar spurningunni „hver ákveður að sjúklingurinn henti?“ með gögnum, og sýnir nákvæmlega hvað sleppur fram hjá spurningalistanum.",
    horizon: "now",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "Þessi spurning er borin fram af þunga á hverjum klínískum fundi. Sjúklingar koma eftir fjórum leiðum og tvær þeirra, móttaka og ritarar, eru ekki klínískar. Þú getur ekki svarað „reyndur hjúkrunarfræðingur mat það“, því það á ekki við um flesta sem koma. Þess þarf heldur ekki. Kerfisbundin skimun sem er eins í hvert sinn er betri en mannlegt mat sem sveiflast eftir vöktum. En það svar stendur og fellur með því að geta sýnt hve margir stöðvast. Tvö stig skipta máli og þau segja ólíka hluti. Spurningalistinn er ódýr og alltaf eins. Þegar læknir vísar sjúklingi frá er það dýrt, því sjúklingurinn hefur þegar beðið, og hvert slíkt tilvik er líklega erindi sem spurningalistinn hefði átt að grípa. Skiptingin milli stiganna, og ástæðan að baki hverju tilviki, er gagnlegasta öryggisniðurstaðan í allri rannsóknaráætluninni.",
    caveat:
      "Telur aðeins þá sem komust inn. Þeir sem hjúkrunarfræðingur eða móttaka vísaði frá áður en þeir komust í gáttina sjást ekki hér og munu aldrei sjást. Leiðirnar inn eru fjórar og enginn telur við dyrnar. Lág heildartala getur líka þýtt tvennt: að rammi þjónustunnar sé vel kynntur eða að enginn sé að athuga. Skiptingin eftir ástæðum greinir þar á milli.",
    protocol: [
      {
        text: "Staðfestu að Medalia skrái stöðvaða spurningalista og að þeir komi með í gagnaútdrættinum",
        detail:
          "Brýnasta spurningin til Medalia. Ef stöðvanir eru ekki skráðar þarf að laga það áður en talning hefst. Það er ekki hægt að endurgera þær eftir á.",
        timeCritical: true,
      },
      {
        text: "Aðgreindu „vísað frá“ og „vísað áfram“ í niðurstöðureit læknisins",
        detail:
          "Sjúklingur sem þarf að hitta húðlækni sýnir að þjónustan virkar rétt. Sjúklingur sem var barnshafandi, yngri en 18 ára eða bráðveikur hefði ekki átt að vera hér. Ef hvort tveggja er skráð sem ein tala hverfur öryggismerkið inn í tilvísanirnar.",
        timeCritical: true,
      },
      {
        text: "Notaðu fastan lista yfir ástæður á báðum stigum",
        detail:
          "Ellefu flokkar, teknir úr flokkunarreglum þjónustunnar svo þeir fylgi klínísku rökunum. Frjáls texti hér þýðir að lesa þúsund færslur í lok tímabilsins.",
        timeCritical: true,
      },
      {
        text: "Farðu yfir götin í hverjum mánuði",
        detail:
          "Ástæða sem spurningalistinn átti að grípa en læknir greip í staðinn er gat í rökum spurningalistans. Þessi mánaðarlegi listi er allt gildi rannsóknarþáttarins. Lagaðu spurningalistann og listinn styttist næsta mánuð.",
      },
    ],
    fields: [
      { key: "screening_stops", label: "Stöðvað af spurningalista", source: "medalia" },
      { key: "excluded_by_doctor", label: "Vísað frá af lækni", help: "Hentaði ekki vegna rauðs flaggs. Ekki venjuleg tilvísun áfram.", source: "medalia" },
    ],
    documents: [
      { id: "screen-spec", name: "Rök skimunarinnar", why: "Hvaða rauð flögg stöðva sjúkling og hvers vegna. Þetta skjal svarar spurningunni „hver ákveður að sjúklingurinn henti?“", required: true },
    ],
    metrics: [
      {
        id: "excluded_total", name: "Vísað frá vegna rauðs flaggs", headline: true,
        why: "Samanlagt á báðum stigum. Án skiptingarinnar hér fyrir neðan er þetta bara tala. Með henni sýnir hún að skimunin virkar.",
        compute: ({ t }) => {
          const entered = t.cases_total + t.screening_stops;
          const total = t.screening_stops + t.excluded_by_doctor;
          return {
            value: entered ? `${n(total)}` : null,
            detail: entered
              ? `${p(pct(total, entered))} af ${n(entered)} sem komu inn: ${n(t.screening_stops)} af spurningalistanum, ${n(t.excluded_by_doctor)} af lækni`
              : "Þarf innkomur og frávísanir í gagnaútdrættinum",
            missing: entered ? undefined : "Stöðvaðir spurningalistar og frávísanir lækna í gagnaútdrættinum",
          };
        },
      },
      {
        id: "stop_rate", name: "Gripið af spurningalistanum",
        why: "Einu gögnin um að öryggisnetið virki. Án þeirra er „spurningalistinn skimar þá“ bara fullyrðing.",
        compute: ({ t }) => ({
          value: p(pct(t.screening_stops, t.cases_total + t.screening_stops)),
          detail: `${n(t.screening_stops)} stöðvuð áður en læknir kom að málinu. Kerfisbundið og eins í hvert sinn`,
          missing: t.screening_stops || t.cases_total ? undefined : "Stöðvaðir spurningalistar í gagnaútdrættinum",
        }),
      },
      {
        id: "clinician_rate", name: "Gripið af lækni í staðinn",
        why: "Dýrt, því sjúklingurinn hefur þegar beðið, og hvert tilvik er líklega erindi sem spurningalistinn hefði átt að grípa. Ef hlutfallið hækkar þarf að herða spurningalistann.",
        compute: ({ t }) => {
          const total = t.screening_stops + t.excluded_by_doctor;
          return {
            value: total ? p(pct(t.excluded_by_doctor, total)) : null,
            detail: total ? `${n(t.excluded_by_doctor)} af ${n(total)} ${pl(total, "frávísun", "frávísunum")} komust fyrst til læknis` : "Engar frávísanir skráðar",
            status: !total ? undefined : pct(t.excluded_by_doctor, total)! <= 25 ? "good" : "fair",
          };
        },
      },
      {
        id: "leaks", name: "Göt í spurningalistanum",
        why: "Ástæður sem spurningalistinn átti að grípa en læknir greip. Þessi mánaðarlegi listi er tilgangur rannsóknarþáttarins. Hver færsla er lagfæring.",
        compute: ({ t }) => ({
          value: t.exclusions.leaks.length ? n(t.exclusions.leaks.reduce((a, l) => a + l.count, 0)) : t.exclusions.total ? "0" : null,
          detail: t.exclusions.leaks.length
            ? t.exclusions.leaks.slice(0, 3).map((l) => `${l.reason.name} (${l.count})`).join(", ")
            : t.exclusions.total
            ? "Ekkert sem spurningalistinn átti að grípa slapp fram hjá honum"
            : "Þarf skrána með ástæðum frávísana",
          missing: t.exclusions.total ? undefined : "Skrá með ástæðum frávísana",
          status: !t.exclusions.total ? undefined : t.exclusions.leaks.length ? "fair" : "good",
        }),
      },
      {
        id: "clinical_referral", name: "Vísað áfram í venjulega þjónustu",
        why: "Aðrar tilvísanir, þar sem þjónustan virkar rétt. Haldið aðskildum svo þær blási ekki upp öryggistölurnar.",
        compute: ({ t }) => ({
          value: n(Math.max(0, t.cases_referred - t.excluded_by_doctor)),
          detail: `Af ${n(t.cases_referred)} ${pl(t.cases_referred, "tilvísun", "tilvísunum")} ${pl(t.excluded_by_doctor, "var", "voru")} ${n(t.excluded_by_doctor)} ${pl(t.excluded_by_doctor, "frávísun", "frávísanir")}, ekki tilvísun áfram`,
        }),
      },
      {
        id: "urgent", name: "Bráð tilvik sem sluppu fram hjá spurningalistanum",
        why: "Skarpasta öryggismerkið sem við höfum: bráðveikur einstaklingur svaraði spurningalistanum, listinn hleypti honum í gegn og læknir þurfti að grípa inn í. Talan kemur úr skránni með ástæðum frávísana, ekki mánaðarlega gagnaútdrættinum. Það er betra, því þar er tilvikið skráð með ástæðu en ekki bara sem flagg.",
        compute: ({ t }) => {
          const acute = t.exclusions.byReason.find((r) => r.reason.id === "acute");
          return {
            value: acute ? n(acute.clinician) : t.exclusions.total ? "0" : null,
            detail: acute
              ? `${n(acute.form)} stöðvuð af spurningalistanum, ${n(acute.clinician)} komust fyrst til læknis`
              : t.exclusions.total
              ? "Engin bráð tilvik sluppu fram hjá spurningalistanum"
              : "Kemur úr skránni með ástæðum frávísana",
            missing: t.exclusions.total ? undefined : "Skrá með ástæðum frávísana",
            status: !t.exclusions.total ? undefined : acute?.clinician ? "fair" : "good",
          };
        },
      },
    ],
  },

  {
    id: "stewardship",
    name: "Lyfjaávísanir og sýklalyf",
    question: "Er ávísun sýklalyfja sambærileg við hefðbundna þjónustu?",
    claim: "Sýklalyfjum var ávísað í X% erinda, á móti Y% hjá HSU fyrir sömu greiningarkóða.",
    category: "safety",
    effort: "medium",
    requires: ["code-volume"],
    sources: ["medalia", "institution"],
    benefit:
      "Svarar ásökuninni um lyfseðlaverksmiðju, með tölur HSU sjálfrar til samanburðar.",
    horizon: "now",
    rationale:
      "Fyrsta gagnrýnin á fjarþjónustu verður alltaf sú að hún sé lyfseðlaverksmiðja í hvítum slopp. Svar ráðgjafans er baseline úr hefðbundinni þjónustu: hve oft HSU ávísar sýklalyfjum fyrir sömu greiningarkóða. Ef hlutfallið í fjarþjónustunni stenst þann samanburð er umræðunni lokið áður en hún hefst.",
    caveat:
      "Samanburðurinn gildir aðeins fyrir sambærileg erindi. Hann er því gerður innan umsamins kóðasafns og skipt eftir tegund erindis þar sem fjöldinn leyfir. Ákveddu samanburðartöluna áður en þú sérð okkar tölur, ekki eftir á.",
    protocol: [
      { text: "Skráðu lyfjaávísanir og sýklalyf sem kóðaða reiti á hvert erindi í Medalia", timeCritical: true },
      { text: "Biddu um sýklalyfjaávísanir í sömu kóðum í gagnaútdrættinum úr Sögu", detail: "Sömu kóðadagar og í talningu greiningarkóða, ásamt fjöldanum þar sem sýklalyfi var ávísað. Bæði fyrir baseline og mánuði tilraunaverkefnisins." },
      { text: "Skiptu hlutfallinu eftir tegund erindis, ekki bara í heild" },
    ],
    fields: [
      { key: "prescriptions", label: "Erindi með lyfjaávísun", source: "medalia" },
      { key: "antibiotics", label: "þar af sýklalyf", source: "medalia" },
      { key: "institution_antibiotics", label: "Kóðadagar hjá HSU með sýklalyfi (Saga)", help: "Innan umsamins kóðasafns, með sömu talningarreglu og greiningarkóðarnir.", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "comparator", name: "Skilgreining samanburðar", why: "Hvernig samanburðartala HSU er sótt í Sögu. Ákveðin áður en okkar tölur lágu fyrir.", required: true },
    ],
    metrics: [
      {
        id: "abx", name: "Hlutfall sýklalyfja", headline: true,
        why: "Fyrirsjáanleg gagnrýni, svarað með tölum HSU sjálfrar.",
        compute: ({ t, codes }) => {
          // The comparator is HSU's traditional service before go-live, not
          // HSU during the pilot, whose case mix the service itself changes.
          const hsu = codes?.baselineAbxPct ?? null;
          const ours = pct(t.antibiotics, t.cases_resolved);
          return {
            value: p(ours),
            detail: `${n(t.antibiotics)} af ${n(t.cases_resolved)} ${pl(t.cases_resolved, "afgreiddu erindi", "afgreiddum erindum")}${hsu !== null ? ` · HSU ${hsu}% í sömu kóðum fyrir upphaf þjónustu` : " · baseline HSU vantar"}`,
            missing: t.cases_resolved ? undefined : "Gagnaútdráttur úr Medalia",
            status: ours === null || hsu === null ? undefined : ours <= hsu ? "good" : ours <= hsu + 5 ? "fair" : "poor",
          };
        },
      },
      {
        id: "rx", name: "Einhver lyfjaávísun",
        why: "Víðara en sýklalyf.",
        compute: ({ t }) => ({
          value: p(pct(t.prescriptions, t.cases_resolved)),
          detail: `${n(t.prescriptions)} af ${n(t.cases_resolved)} ${pl(t.cases_resolved, "afgreiddu erindi", "afgreiddum erindum")}`,
        }),
      },
    ],
  },

  {
    id: "adverse-reactions",
    name: "Alvarlegar aukaverkanir lyfja",
    question: "Fékk einhver alvarlega aukaverkun eða ofnæmi fyrir lyfi sem við ávísuðum?",
    claim: "N alvarlegar aukaverkanir eða ofnæmi meðal M sjúklinga sem fengu lyfjaávísun. Farið var yfir hvert tilvik.",
    category: "safety",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["survey"],
    benefit:
      "Sýnir að lyfjaávísun án skoðunar veldur ekki skaða.",
    horizon: "now",
    rationale:
      "Í fjarþjónustu er ávísað án skoðunar. Ráðgjafinn spyr því beint um skaða af lyfinu sjálfu. Þjónustukönnunin á degi 7 grípur það sem sjúklingurinn tók eftir. Atvikaskráningin grípur það sem starfsfólk HSU sá. Farið er yfir hvert tilvik sem atvik, svo talning og yfirferð fara saman.",
    caveat:
      "Sjaldgæfir atburðir á einni stöð. Búast má við núlli og það segir lítið eitt og sér. Það verður trúverðugt af því að bæði spurningin í könnuninni og tilkynningarleiðin voru til og voru notaðar.",
    protocol: [
      { text: "Spurðu í þjónustukönnuninni á degi 7 um alvarlega aukaverkun eða ofnæmi fyrir ávísuðu lyfi", timeCritical: true },
      { text: "Sendu hverja tilkynnta aukaverkun í gegnum verklag um atvik", detail: "Læknir fer yfir hana og skráir lyfið og afleiðingarnar." },
    ],
    fields: [
      { key: "adverse_drug_reactions", label: "Alvarleg aukaverkun eða ofnæmi", help: "Úr þjónustukönnun á degi 7 og atvikatilkynningum, talið einu sinni á hvern sjúkling.", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "adr", name: "Alvarlegar aukaverkanir lyfja", headline: true,
        why: "Skaði af meðferðinni sjálfri. Beina öryggisspurningin um lyfjaávísanir í fjarþjónustu.",
        compute: ({ t }) => ({
          value: t.adverse_drug_reactions === null ? null : n(t.adverse_drug_reactions),
          detail: `Meðal ${n(t.prescriptions)} ${pl(t.prescriptions, "erindis", "erinda")} með lyfjaávísun`,
          missing: t.adverse_drug_reactions === null ? "Þjónustukönnun á degi 7 og atvikatilkynningar" : undefined,
          status: t.adverse_drug_reactions === null ? undefined : t.adverse_drug_reactions === 0 ? "good" : "poor",
        }),
      },
    ],
  },

  {
    id: "decision-tree",
    name: "Samræmi við ákvörðunartré",
    question: "Staðfestir læknirinn niðurstöðu ákvörðunartrésins, eða breytir hann henni?",
    claim: "Læknar staðfestu niðurstöðu ákvörðunartrésins í X% erinda, og hver breyting skilaði sér inn í klínískt verklag.",
    category: "safety",
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Sýnir hve vel má treysta ákvörðunartrjánum og hvar þarf að breyta þeim.",
    horizon: "now",
    rationale:
      "Hver tegund erindis fer í gegnum ákvörðunartré áður en læknir sér erindið. Það kostar nánast ekkert að skrá hvort læknirinn staðfestir niðurstöðuna eða breytir henni, og það er beinasta athugunin á reikniritinu sjálfu. Tré sem læknar breyta aftur og aftur af sömu ástæðu þarf að laga. Lagfæringin fer í breytingaskrá klínísks verklags, svo rökin og breytingin fylgjast að.",
    caveat:
      "Hátt samræmi getur líka þýtt að læknar samþykki tillöguna án þess að skoða hana vel. Lestu það með endurkomum innan 7 daga og atvikaskráningunni. Þær grípa tilvikin þar sem rangt var að samþykkja.",
    protocol: [
      { text: "Gerðu „staðfest / breytt“ að kóðuðum reit á hverju erindi í Medalia", timeCritical: true },
      { text: "Skráðu flokk ástæðu þegar læknirinn breytir niðurstöðunni" },
      { text: "Farðu mánaðarlega yfir breytingarnar og skráðu allar breytingar á trjánum í klínísku breytingaskrána", link: { href: "/admin/clinical", label: "Klínískt verklag" } },
    ],
    fields: [
      { key: "tree_cases", label: "Erindi með niðurstöðu úr ákvörðunartré", nullable: true, source: "medalia" },
      { key: "tree_overridden", label: "þar af breytt af lækni", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "tree_agree", name: "Læknir staðfesti tréð", headline: true,
        why: "Bein athugun á reikniritinu. Ef samræmið fellur í einni tegund erindis þarf að laga það tré.",
        compute: ({ t }) => ({
          value: t.tree_cases ? p(pct(t.tree_cases - (t.tree_overridden ?? 0), t.tree_cases)) : null,
          detail: t.tree_cases ? `Læknir breytti ${n(t.tree_overridden ?? 0)} af ${n(t.tree_cases)}` : "Þarf reitinn staðfest/breytt í Medalia",
          missing: t.tree_cases ? undefined : "Reiturinn staðfest/breytt í gagnaútdrættinum",
          status: !t.tree_cases ? undefined : pct(t.tree_cases - (t.tree_overridden ?? 0), t.tree_cases)! >= 90 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "revisits",
    name: "Leitaði aftur til heilbrigðisþjónustu innan 7 daga",
    question: "Þurfti sjúklingurinn að leita aftur til heilbrigðisþjónustu vegna sama vanda?",
    claim: "X% sögðust hafa leitað annarrar þjónustu innan 7 daga, og yfirferð sjúkraskráa hjá HSU fann N endurkomur vegna sama vanda.",
    category: "safety",
    effort: "high",
    sources: ["survey", "institution"],
    benefit:
      "Sýnir að vandinn var leystur, ekki bara að erindinu var lokað. Sjúklingurinn er spurður og athugað er í sjúkraskrám HSU.",
    horizon: "now",
    rationale:
      "Besti öryggismælikvarði sem til er fyrir þjónustu af þessu tagi. Hann grípur erindin sem virtust afgreidd en voru það ekki. Ráðgjafinn spyr á tvo vegu og hvor aðferð sannreynir hina. A: Þjónustukönnunin á degi 7 spyr hvort sjúklingurinn hafi þurft að fara á bráðamóttöku, sjúkrahús eða heilsugæslu. B: Harðar tölur. HSU finnur sjúklinga sem eiga skráð samskipti í Sögu innan 7 daga frá erindi hjá Fjarlækningum og fer yfir sjúkraskrár þeirra í höndunum. Búist er við 50–100 einstaklingum. Könnunin er ódýr og nær til allra sem svara. Yfirferðin er lítil og áreiðanleg.",
    caveat:
      "Aðeins samskipti við HSU sjást í Sögu. Sjúklingur sem fór á Landspítala eða einkastofu sést aðeins í könnuninni. Könnunin heyrir svo aðeins í þeim sem svara. Birtu hvort tveggja hlið við hlið og segðu hvað er hvað.",
    protocol: [
      { text: "Settu spurninguna um 7 daga í þjónustukönnunina á degi 7", detail: "Bráðamóttaka, sjúkrahús eða heilsugæsla. Fastir svarmöguleikar, auk „nei“.", timeCritical: true },
      {
        text: "Semdu um að HSU sjái sjálf um samkeyrsluna og yfirferðina",
        detail: "HSU ber lista yfir erindi Fjarlækninga saman við samskipti í Sögu innan 7 daga og fer yfir sjúkraskrárnar í höndunum. Aðeins fjöldatölur koma til baka. Engin persónugreinanleg gögn fara frá HSU og verkefnið er áfram gæðaverkefni. Hvernig HSU fær listann yfir erindin er hluti af samningnum um miðlun gagna.",
        timeCritical: true,
      },
      { text: "Ákveddu skilgreininguna fyrir yfirferðina: sami sjúklingur, sami vandi, innan 7 daga frá erindinu", detail: "Ákveðið fyrir fram, áður en nokkur skoðar sjúkraskrá." },
      { text: "Framkvæmdu yfirferðina eftir 6 og 12 mánuði" },
    ],
    fields: [
      { key: "survey_sought_care_7d_pct", label: "Leitaði annarrar þjónustu innan 7 daga (könnun)", unit: "percent", nullable: true, source: "survey" },
      { key: "revisits_7d", label: "Sjúklingar með samskipti við HSU innan 7 daga (Saga)", nullable: true, source: "institution" },
      { key: "revisits_related", label: "þar af vegna sama vanda (handvirk yfirferð)", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "data-agreement", name: "Samningur um miðlun gagna", why: "Skriflegt samkomulag um að HSU sjái um samkeyrslu og yfirferð og deili fjöldatölum. Án hans er ekki hægt að framkvæma þennan rannsóknarþátt með lögmætum hætti sem gæðaverkefni.", required: true },
    ],
    metrics: [
      {
        id: "revisit_rate", name: "Endurkoma vegna sama vanda", headline: true,
        why: "Harða talan, úr sjúkraskrám HSU sjálfrar. Sú sem klínískir áheyrendur spyrja fyrst um.",
        compute: ({ t }) => ({
          value: t.revisits_related === null ? null : p(pct(t.revisits_related, t.cases_resolved)),
          detail: t.revisits_related === null
            ? "HSU fer yfir sjúkraskrárnar og deilir aðeins fjöldanum"
            : `${n(t.revisits_related)} af ${n(t.cases_resolved)} ${pl(t.cases_resolved, "afgreiddu erindi", "afgreiddum erindum")}${t.revisits_7d !== null ? ` · ${n(t.revisits_7d)} ${pl(t.revisits_7d, "átti", "áttu")} einhver samskipti við HSU innan 7 daga` : ""}`,
          missing: t.revisits_related === null ? "Yfirferð hjá HSU" : undefined,
          status: t.revisits_related === null || !t.cases_resolved ? undefined : pct(t.revisits_related, t.cases_resolved)! <= 5 ? "good" : pct(t.revisits_related, t.cases_resolved)! <= 10 ? "fair" : "poor",
        }),
      },
      {
        id: "sought_7d", name: "Sögðust hafa leitað aftur",
        why: "Hlið sjúklingsins á sömu spurningu, þar á meðal þjónusta utan HSU sem sést ekki í Sögu.",
        compute: ({ t }) => ({
          value: p(t.survey_sought_care_7d_pct),
          detail: t.survey_7d_responses ? `Af ${n(t.survey_7d_responses)} ${pl(t.survey_7d_responses, "svari", "svörum")} á degi 7` : "Spurt í þjónustukönnun á degi 7",
          missing: t.survey_sought_care_7d_pct === null ? "Þjónustukönnun á degi 7" : undefined,
        }),
      },
    ],
  },

  // ── Workload ──────────────────────────────────────────────────────────────
  {
    id: "code-volume",
    name: "Greiningarkóðar hjá HSU",
    question: "Berast færri slík vandamál til HSU en eigin leitni stofnunarinnar spáir fyrir um?",
    claim: "HSU skráði N greiningarkóða á mánuði fyrir þessi vandamál á tíma tilraunaverkefnisins, á móti M sem búast mátti við út frá eigin leitni síðustu þriggja ára.",
    category: "system",
    effort: "high",
    requires: ["case-mix"],
    sources: ["institution", "medalia"],
    benefit:
      "Mælir með hörðum tölum hvort þjónustan létti vinnu af HSU, úr gögnum HSU sjálfrar.",
    horizon: "now",
    rationale:
      "Helsti mælikvarði ráðgjafans fyrir heilbrigðiskerfið. Taldir eru greiningarkóðar úr umsömdu kóðasafni í Sögu síðustu þrjú árin áður en þjónustan hófst, og svo fyrsta árið samhliða erindunum í Medalia. Ef þjónustan tekur verkefnin til sín ætti talan hjá HSU að fara niður fyrir það sem eigin leitni stefndi í. Þriggja ára baseline svarar því hvernig vöxtur milli ára er metinn. Leitnin er reiknuð úr baseline sjálfu. Tilraunatímabilið er því borið saman við þá stefnu sem HSU var þegar á, ekki við flata línu. Gögnin eru HSU sjálfrar, úr þeirra eigin kerfi, og þess vegna deilir enginn um þau.",
    caveat:
      "Fækkun samræmist því að þjónustan taki verkefnin til sín, en sannar það ekki ein og sér. Breytt mönnun hjá HSU, farsóttatímabil eða breyttar venjur við kóðun geta allt hreyft töluna. Notkun ræðst líka af því hvort fólk viti af þjónustunni, svo lestu töluna með fjölda erinda. Stöð þar sem þjónustan er ekki enn hafin, talin á sama hátt, er samanburðarstöðin sem útilokar flest af þessu.",
    protocol: [
      { text: "Semdu um kóðasafnið við læknisfræðilegan ráðgjafa", detail: "Það er geymt í rannsóknarþættinum um samsetningu erinda. Það tengir Sögu og Medalia saman. Án þess er ekkert að telja.", timeCritical: true },
      {
        text: "Biddu um 36 mánaða baseline úr Sögu, mánuð fyrir mánuð, fyrir hverja stöð",
        detail: "Hver greiningarkóði í safninu talinn einu sinni á sjúkling á dag. Dagsetningin þarf til að beita þeirri reglu og til að sjá marga kóða í einni komu. HSU beitir reglunni í Sögu og sendir mánaðarlegar fjöldatölur, svo engar dagsetningar eða kennitölur fara frá HSU. Mánaðarlega, aldrei sem ársheildartölu. Heildartölu er ekki hægt að brjóta upp aftur og leitnin þarf mánuðina.",
        timeCritical: true,
      },
      { text: "Fáðu sömu talningu fyrir hvern mánuð tilraunaverkefnisins, með sömu reglu" },
      { text: "Skráðu baseline-mánuðina jafnt sem mánuði tilraunaverkefnisins", detail: "Þeir eru samanburðurinn. Mánuður fyrir upphafsdag hefur aðeins tölu HSU og ekkert annað." },
      { text: "Ákveddu hvernig fylgst er með því hvort fólk viti af þjónustunni", detail: "Ráðgjafinn bendir á að það skipti máli. Lestu töluna að minnsta kosti með fjölda erinda og dagsetningum kynninga." },
    ],
    fields: [
      { key: "institution_contacts", label: "Greiningarkóðar HSU í umsömdu kóðasafni (Saga)", help: "Hver kóði talinn einu sinni á sjúkling á dag. Skráðu líka baseline-mánuðina.", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "baseline", name: "Beiðni um baseline úr Sögu", why: "36 mánaða fjöldatölur, mánuð fyrir mánuð, í umsömdum kóðum fyrir hverja stöð, með talningarreglunni skrifaðri inn. Tímaháð: það verður erfiðara að fá þetta með hverjum mánuði sem líður.", required: true },
    ],
    metrics: [
      {
        id: "vs_trend", name: "Kóðar HSU miðað við leitni", headline: true,
        why: "Svar með hörðum tölum við því hvort þjónustan létti vinnu af heilsugæslunni.",
        compute: ({ codes }) => {
          const c = codes;
          if (!c || c.pilotPerMonth === null || c.expectedPerMonth === null) {
            return {
              value: null,
              detail: !c || !c.baselineMonths ? "Þarf baseline úr Sögu" : "Þarf tölur HSU fyrir mánuði tilraunaverkefnisins",
              missing: !c || !c.baselineMonths ? "Baseline úr Sögu" : "Tölur úr Sögu eftir upphafsdag",
            };
          }
          const change = c.expectedPerMonth ? Math.round(((c.pilotPerMonth - c.expectedPerMonth) / c.expectedPerMonth) * 100) : 0;
          return {
            value: `${change > 0 ? "+" : ""}${change}%`,
            detail: `${n(c.pilotPerMonth)} á mánuði á ${c.pilotMonths} ${pl(c.pilotMonths, "mánuði", "mánuðum")} tilraunaverkefnisins, á móti ${n(c.expectedPerMonth)} væntum`,
            status: change <= -5 ? "good" : change <= 5 ? "fair" : "poor",
            assumption: `Vænt tala = mánaðarmeðaltal síðasta baseline-árs${c.trendPerYear !== null ? `, hækkað um meðalbreytingu milli ára í baseline (${Math.round(c.trendPerYear * 100)}%)` : ""}. Samanburður á einni stöð án samanburðarhóps, þar til stöð þar sem þjónustan er ekki hafin er talin á sama hátt.`,
          };
        },
      },
      {
        id: "baseline_years", name: "Baseline eftir árum",
        why: "Hvernig talan þróaðist áður en þjónustan hófst. Svarið við því hvernig vöxtur milli ára er metinn.",
        compute: ({ codes }) => ({
          value: codes?.baselinePerMonth != null ? `${n(codes.baselinePerMonth)} á mán.` : null,
          detail: codes?.baselineYears.length
            ? `Ársheildir, elsta ár fyrst: ${codes.baselineYears.map(n).join(" → ")}`
            : `${codes?.baselineMonths ?? 0} ${pl(codes?.baselineMonths ?? 0, "baseline-mánuður skráður", "baseline-mánuðir skráðir")}. Leitni þarf að minnsta kosti tvö heil ár`,
          missing: codes?.baselineMonths ? undefined : "Baseline úr Sögu",
        }),
      },
      {
        id: "share", name: "Hlutfall í fjarþjónustu",
        why: "Af öllum erindum í þessum kóðum á tíma tilraunaverkefnisins, sá hluti sem við tókum.",
        compute: ({ codes }) => {
          const c = codes;
          const remote = c?.remoteInSetPerMonth ?? null;
          // With HSU's own count for the pilot months: our share of the whole.
          if (c && c.pilotPerMonth !== null && remote !== null) {
            const flow = c.pilotPerMonth + remote;
            return {
              value: flow ? p(pct(remote, flow)) : null,
              detail: `${n(remote)} af ${n(Math.round(flow * 10) / 10)} erindum í sömu kóðum á mánuði`,
            };
          }
          // Baseline from Saga and our cases from Medalia only — the simple
          // before/after: our monthly volume against what HSU would have seen.
          if (c && c.expectedPerMonth && remote !== null) {
            return {
              value: p(pct(remote, c.expectedPerMonth)),
              detail: `${n(remote)} erindi á mánuði í fjarþjónustu, borið saman við ${n(c.expectedPerMonth)} sem baseline HSU spáir fyrir`,
              assumption: "Án talna úr Sögu fyrir sömu mánuði sést ekki hvort komum á HSU fækkaði, aðeins hve stór hluti af væntu magni fór í fjarþjónustu.",
            };
          }
          return {
            value: null,
            detail: "Þarf baseline úr Sögu og erindi úr Medalia",
            missing: !c?.baselineMonths ? "Baseline úr Sögu" : "Gagnaútdráttur úr Medalia",
          };
        },
      },
    ],
  },

  {
    id: "time-study",
    name: "Tímamæling starfsfólks",
    question: "Léttir þetta vinnu af starfsfólki, eða færist hún bara til?",
    claim: "Hvert erindi sem var sent til okkar sparaði heilsugæslunni N mínútur nettó, mælt tvisvar.",
    category: "system",
    effort: "high",
    sources: ["study", "derived"],
    benefit:
      "Sýnir hvort vinnan minnkar eða færist bara til, á meðan enn er hægt að bregðast við.",
    horizon: "now",
    rationale:
      "Raunverulega áhættan í öllu verkefninu, og sú eina sem ekkert annað sér. Hjúkrunarfræðingurinn þarf nú að meta hvort erindið henti, útskýra þjónustu sem sjúklingurinn hefur aldrei heyrt um, senda hlekk og taka við sjúklingnum aftur ef eitthvað fer úrskeiðis. Það er vel mögulegt að hvert erindi kosti heilsugæsluna fleiri mínútur en það sparar. Þá liti þjónustan frábærlega út á öllum mælikvörðum sjúklinga en bætti samt við álagið sem hún átti að létta. Þetta er algengasta niðurstaðan í rannsóknum á fjarþjónustu, og hún sést ekki í neinni tölu sem byrjar eftir að sjúklingurinn er kominn í Medalia.",
    caveat:
      "Mældu í byrjun, ekki í lokin. Mæling sem hefst eftir að fólk hefur vanist þjónustunni mælir ekki lengur það sem hún átti að mæla. Snemmbúin niðurstaða gefur þér níu mánuði til að laga það sem hún sýnir, í stað dóms sem ekkert er hægt að gera við.",
    protocol: [
      { text: "Tvær vikur, núna: mínútur á hvert erindi sem sent er til okkar, á móti sambærilegu erindi sem er afgreitt á staðnum", detail: "Um 40 erindi í hvorum hópi duga til að sjá hvort talan er jákvæð eða neikvæð. Tveggja vikna ónæði fyrir svarið við mikilvægustu spurningu verkefnisins.", timeCritical: true },
      { text: "Taktu aðeins með erindi sem fara í gegnum starfsfólk stofnunarinnar", detail: "Þeir sem koma beint kosta ekkert og eiga ekki heima í nettóútreikningnum." },
      { text: "Skráðu niðurstöðuna sem forsendu fyrir útreikningi á vinnuléttinum" },
      { text: "Endurtaktu mælinguna í kringum níunda mánuð", detail: "Tvær mælingar sýna þróun. Ein gefur fullyrðingu sem enginn getur sannreynt." },
    ],
    fields: [],
    documents: [
      { id: "study-protocol", name: "Verklýsing tímamælingar", why: "Hvernig mínútur eru taldar, af hverjum og fyrir hvaða erindi. Nauðsynlegt til að niðurstaðan segi eitthvað.", required: true },
      { id: "study-results", name: "Niðurstöður tímamælingar", why: "Mælda talan sem kemur í stað sjálfgefnu forsendunnar.", required: true },
    ],
    metrics: [
      {
        id: "relief", name: "Vinnuléttir", headline: true,
        why: "Talan sem skiptir máli fyrir kaupandann. Stofnanir eru ekki að leita að betri þjónustu. Þær eru að leita að leið til að manna vaktirnar.",
        compute: ({ t, a }) => {
          const net = a.minutesSaved - a.minutesSpent;
          const hours = (t.cases_resolved * net) / 60;
          const days = a.hoursPerClinicDay > 0 ? hours / a.hoursPerClinicDay : 0;
          return {
            value: t.cases_resolved ? `${n(Math.round(hours))} klst.` : null,
            detail: t.cases_resolved
              ? `Jafngildir um ${d1(days)} starfsdögum, ${d1(days / Math.max(t.months, 1))} á mánuði`
              : "Þarf afgreidd erindi",
            missing: t.cases_resolved ? undefined : "Gagnaútdráttur úr Medalia",
            assumption: a.studyDone
              ? `Nettó ${net} mín. á erindi (${a.minutesSaved} sparaðar − ${a.minutesSpent} notaðar), samkvæmt tímamælingunni.`
              : `ÁÆTLUN: ${a.minutesSaved} mín. á erindi, án mælds kostnaðar á móti. Þetta er brúttótala þar til tímamælingin hefur farið fram. Ekki setja hana í kynningu fyrir þann tíma.`,
            status: a.studyDone ? undefined : "fair",
          };
        },
      },
    ],
  },

  {
    id: "entry-routes",
    name: "Leiðir inn í þjónustuna",
    question: "Hvernig komast sjúklingar í raun til okkar, og er það að breytast?",
    claim: "Hlutfall þeirra sem komu beint jókst úr X% í Y%. Þjónustan varð sjálfbær og álagið á starfsfólk minnkaði um leið.",
    category: "system",
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Sýnir þjónustuna standa á eigin fótum eftir því sem fleiri koma beint.",
    horizon: "now",
    rationale:
      "Sjúklingur sem kemur beint kostar heilsugæsluna núll mínútur. Skipting eftir leiðum inn er því mælikvarði á vinnuálag, ekki markaðsmál. Hækkandi hlutfall þeirra sem koma beint er sagan sjálf: þjónustan stendur á eigin fótum. Skiptingin ákvarðar líka vægið í tímamælingunni, sem á aðeins að ná til erinda sem fara í gegnum starfsfólk.",
    caveat:
      "Hún segir ekkert um þá sem komu aldrei. Það er hlutverk nefnarans, ekki þessa rannsóknarþáttar.",
    protocol: [
      { text: "Gefðu hverri leið sinn eigin hlekk inn í gáttina", detail: "Að lágmarki einn hlekk sem fólk notar sjálft og einn sem heilsugæslan afhendir. Engin spurning fyrir sjúklinginn og ekkert sem neinn þarf að muna. Leiðin skráir sig sjálf. Ein breyting í kóða: slóð gáttarinnar er harðkóðuð á sex stöðum.", timeCritical: true },
      { text: "Staðfestu við Medalia að leiðin skili sér í gagnaútdráttinn", detail: "Aðskildar slóðir í gáttinni eða færibreyta í slóðinni, hvort sem Medalia kýs." },
      { text: "Tengdu leiðirnar við þjónustuslóð hvers samstarfsaðila", link: { href: "/admin/stofnanir", label: "Samstarfsstofnanir" } },
    ],
    fields: [
      { key: "entry_direct", label: "Kom beint", source: "medalia" },
      { key: "entry_via_staff", label: "Sent af starfsfólki heilsugæslunnar", help: "Hjúkrunarfræðingur, móttaka eða ritari. Gagnaútdrátturinn greinir ekki þar á milli.", source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "direct_share", name: "Kom beint", headline: true,
        why: "Núll mínútur af tíma stofnunarinnar. Hækkandi hlutfall sýnir þjónustu sem er að verða sjálfbær.",
        compute: ({ t }) => ({
          value: p(pct(t.entry.direct, t.entry.total)),
          detail: `${n(t.entry.direct)} af ${n(t.entry.total)} sem komu inn`,
          missing: t.entry.total ? undefined : "Sérstakur hlekkur inn í gáttina fyrir hverja leið",
        }),
      },
    ],
  },

  {
    id: "economics",
    name: "Kostnaður við afleysingar",
    question: "Hvað greiðir heilsugæslan nú fyrir að manna þessa vinnu?",
    claim: "Kostnaður við afleysingar og tímabundna mönnun fyrir og eftir, á móti erindunum sem við tókum af heilsugæslunni.",
    category: "system",
    effort: "medium",
    sources: ["institution"],
    benefit:
      "Setur kostnað á erindi við hlið afleysingakostnaðarins sem þjónustan kemur í staðinn fyrir.",
    horizon: "later",
    rationale:
      "Afleysingar og tímabundin mönnun eru útgjaldaliðurinn sem við keppum raunverulega við, og sá sem kaupandi skoðar fyrst. Athugaðu hvað þetta gerir EKKI: það gefur ekki kostnað á erindi. Til þess þarf líka okkar eigin kostnað á erindi og honum er ekki safnað hér. Settu tölurnar hlið við hlið og láttu lesandann deila sjálfan. Kostnaður á erindi sem við reiknuðum sjálf yrði hvort eð er dreginn í efa.",
    caveat:
      "Settu það aldrei fram sem staðreynd að þjónustan hafi komið í stað annarrar. Sjálfsmat á því hvað hefði annars gerst og kostnaður sem var forðað eru það fyrsta sem gagnrýninn lesandi rífur í sundur. Merktu þau sem áætlun og þá standast þau.",
    protocol: [
      { text: "Biddu um afleysingakostnað, fjölda símtala og opnunartíma fyrir 12 mánuðina á undan", timeCritical: true },
      { text: "Semdu um mánaðarlega afhendingu sömu talna" },
      { text: "Sýndu kostnað á erindi, ekki heildarsparnað" },
    ],
    fields: [
      { key: "locum_cost_isk", label: "Kostnaður við afleysingar", unit: "isk", nullable: true, source: "institution" },
      { key: "institution_calls", label: "Símtöl til stofnunarinnar", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "finance-baseline", name: "Baseline fyrir fjármál", why: "Afleysingakostnaður og fjöldi símtala fyrir tímabilið á undan, frá stofnuninni.", required: true },
    ],
    metrics: [
      {
        id: "locum", name: "Kostnaður við afleysingar", headline: true,
        why: "Útgjaldaliðurinn sem við keppum við.",
        compute: ({ t }) => ({
          value: t.locum_cost_isk === null ? null : `${n(Math.round(t.locum_cost_isk / 1000))} þús. kr.`,
          detail: "Þarf sömu tölur fyrir tímabilið á undan til að segja eitthvað",
          missing: t.locum_cost_isk === null ? "Fjárhagstölur frá stofnuninni" : undefined,
        }),
      },
    ],
  },

  // ── Experience ────────────────────────────────────────────────────────────
  {
    id: "patient-survey",
    name: "Þjónustukönnun og eftirfylgd",
    question: "Virkar þjónustan fyrir sjúklinginn?",
    claim: "X% voru ánægð með þjónustuna, Y% sögðu viku síðar að vandinn hefði verið leystur og Z% myndu nota hana aftur.",
    category: "patient",
    effort: "medium",
    sources: ["survey"],
    benefit:
      "Mat sjúklingsins sjálfs, spurt tvisvar: strax eftir erindið og viku síðar.",
    lead: true,
    horizon: "now",
    rationale:
      "Einfaldasta leið læknisfræðilegs ráðgjafa að sjónarhorni sjúklingsins: stutt könnun sem er send sjálfkrafa eftir hvert erindi. Með því að spyrja tvisvar má greina upplifunina frá árangrinum. Strax á eftir getur fólk metið þjónustuna. Viku síðar getur það sagt hvort vandinn hvarf í raun og hvort það þurfti að leita annað. Hafðu báðar umferðir stuttar. Ef spurningarnar verða fleiri en örfáar hrynur svarhlutfallið og þú situr uppi með ekkert.",
    caveat:
      "Svarhlutfall í könnunum eftir viðtal er lágt og svörin hallast í jákvæða átt. Færri svara á degi 7 en á degi 0. Birtu alltaf svarhlutfall hvorrar umferðar við hlið niðurstöðunnar.",
    protocol: [
      {
        text: "Festu spurningalistana tvo",
        detail:
          "Dagur 0: ánægja með þjónustuna, hvort sjúklingurinn myndi nota hana aftur við svipuðum vanda, hvað hann hefði líklegast gert án hennar og, ef heimapróf var notað, hve auðvelt var að nálgast það og framkvæma. Dagur 7: hvort vandinn var leystur, hvort sjúklingurinn þurfti að leita annarrar heilbrigðisþjónustu vegna hans innan 7 daga og þá hvert, hvort hann fékk aðra greiningu þar og hvort hann fékk alvarlega aukaverkun eða ofnæmi fyrir lyfi sem honum var ávísað.",
        timeCritical: true,
        link: { href: "/admin/surveys", label: "Kannanir" },
      },
      {
        text: "Láttu Medalia senda báðar kannanir sjálfkrafa, með stöðinni í hlekknum",
        detail: "Dagur 0 þegar erindinu er lokað: fjarlaekningar.is/kannanir/thjonustukonnun-dagur-0?stod=Vestmannaeyjar. Dagur 7 viku síðar: fjarlaekningar.is/kannanir/eftirfylgd-dagur-7?stod=Vestmannaeyjar. Skiptu um nafn stöðvar í hlekknum fyrir hverja stöð. Án hennar er ekki hægt að skipta svörum eftir stöðvum. Sömu tímapunktar allan tímann, annars er tímaröðin einskis virði.",
        timeCritical: true,
        link: { href: "/admin/surveys", label: "Kannanir" },
      },
      { text: "Ekki breyta orðalaginu á miðju tímabili", detail: "Samanburður milli skýrslnanna eftir 6 og 12 mánuði er helmingurinn af gildinu." },
      { text: "Birtu kannanirnar tvær í Könnunum", detail: "Svörin reiknast sjálfkrafa inn í matið. Þar sem könnunin er send eftir hvert erindi telst fjöldi sendra kannana sá sami og fjöldi erinda." },
    ],
    fields: [
      { key: "survey_sent", label: "Kannanir sendar á degi 0", source: "survey" },
      { key: "survey_responses", label: "Svör á degi 0", source: "survey" },
      { key: "survey_satisfied_pct", label: "Ánægð með þjónustuna", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_reuse_pct", label: "Myndu nota hana aftur við svipuðum vanda", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_7d_sent", label: "Kannanir sendar á degi 7", source: "survey" },
      { key: "survey_7d_responses", label: "Svör á degi 7", source: "survey" },
      { key: "survey_resolved_pct", label: "Vandinn leystur (dagur 7)", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [
      { id: "instrument", name: "Spurningalisti könnunarinnar", why: "Nákvæmt orðalag beggja umferða, fest. Ef því er breytt á miðju tímabili rofnar tímaröðin.", required: true },
    ],
    metrics: [
      {
        id: "satisfied", name: "Ánægð með þjónustuna", headline: true,
        why: "Fyrsta mat sjúklingsins, spurt daginn sem erindinu var lokað.",
        compute: ({ t }) => ({
          value: p(t.survey_satisfied_pct),
          detail: t.survey_responses
            ? `Úr ${n(t.survey_responses)} ${pl(t.survey_responses, "svari", "svörum")} á degi 0${t.survey_sent ? ` (svarhlutfall ${pct(t.survey_responses, t.survey_sent)}%)` : ""}`
            : "Engin svör enn",
          missing: t.survey_satisfied_pct === null ? "Þjónustukönnun á degi 0" : undefined,
          status: t.survey_satisfied_pct === null ? undefined : t.survey_satisfied_pct >= 85 ? "good" : t.survey_satisfied_pct >= 70 ? "fair" : "poor",
        }),
      },
      {
        id: "resolved_7d", name: "Leyst, viku síðar",
        why: "Árangurinn eins og sjúklingurinn sér hann, þegar vandinn hefur haft tíma til að koma aftur.",
        compute: ({ t }) => ({
          value: p(t.survey_resolved_pct),
          detail: t.survey_7d_responses
            ? `Úr ${n(t.survey_7d_responses)} ${pl(t.survey_7d_responses, "svari", "svörum")} á degi 7${t.survey_7d_sent ? ` (svarhlutfall ${pct(t.survey_7d_responses, t.survey_7d_sent)}%)` : ""}`
            : "Engin svör á degi 7 enn",
          missing: t.survey_resolved_pct === null ? "Þjónustukönnun á degi 7" : undefined,
          status: t.survey_resolved_pct === null ? undefined : t.survey_resolved_pct >= 80 ? "good" : t.survey_resolved_pct >= 65 ? "fair" : "poor",
        }),
      },
      {
        id: "reuse", name: "Myndu nota hana aftur",
        why: "Einfaldasti mælikvarðinn á traust, og sá sem endar alltaf á glærunum.",
        compute: ({ t }) => ({ value: p(t.survey_reuse_pct), detail: "Við svipuðum vanda, af þeim sem svöruðu á degi 0", missing: t.survey_reuse_pct === null ? "Þjónustukönnun á degi 0" : undefined }),
      },
    ],
  },

  {
    id: "access-gain",
    name: "Kemur í stað annarrar þjónustu eða ný eftirspurn",
    question: "Hvað hefði sjúklingurinn líklegast gert ef þjónustan hefði ekki verið til?",
    claim: "X% hefðu annars farið á heilsugæslu eða bráðaþjónustu, svo þjónustan kom í stað annarrar. Y% hefðu ekkert gert.",
    category: "patient",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["survey"],
    benefit:
      "Fyrsta vísbendingin um hvort þjónustan kemur í stað annarrar þjónustu eða skapar nýja eftirspurn.",
    horizon: "now",
    rationale:
      "Spurningin sem ráðgjafinn lagði sérstaka áherslu á. Ein spurning í könnuninni skiptir sjúklingunum í tvo hópa, og hóparnir þýða ólíka hluti fyrir HSU. Þeir sem hefðu annars farið á heilsugæsluna, bráðamóttöku eða vaktþjónustu fengu þjónustu í stað annarrar. Það er vinnan sem þjónustan tekur af HSU. Þeir sem hefðu ekkert gert eru ný eftirspurn. Það er betra aðgengi fyrir sjúklinginn, en það léttir ekki á heilsugæslunni og má aldrei telja eins og það geri það.",
    caveat:
      "Svörin sýna hvað fólk segist mundu hafa gert, ekki hvað það hefði gert. Merktu þau þannig í hvert sinn og þá standast þau. Settu þau fram sem staðreynd og þau eru það fyrsta sem er rifið niður. Samanburður greiningarkóða við baseline úr Sögu er prófið með hörðum tölum á sömu spurningu.",
    protocol: [
      {
        text: "Notaðu fasta svarmöguleika, þar á meðal „ekkert“",
        detail: "Heilsugæsla, bráðamóttaka eða vaktþjónusta, apótek, einkastofa, ekkert (ég hefði beðið). Frjálsan texta er ekki hægt að telja. Spurningin er einskis virði ef henni er bætt við á miðju tímabili.",
        timeCritical: true,
      },
      { text: "Merktu allar tölur um hvað sjúklingurinn hefði annars gert sem sjálfsmat, í sniðmáti skýrslunnar" },
    ],
    fields: [
      { key: "survey_substituted_pct", label: "Hefðu annars leitað annarrar heilbrigðisþjónustu", help: "Heilsugæsla, bráðamóttaka, vaktþjónusta eða önnur stofa.", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_would_not_have_sought_pct", label: "Hefðu annars ekkert gert", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "substituted", name: "Kom í stað annarrar þjónustu", headline: true,
        why: "Hefðu annars leitað annarrar heilbrigðisþjónustu. Þessi hópur er vinnan sem þjónustan tekur af HSU.",
        compute: ({ t }) => ({
          value: p(t.survey_substituted_pct),
          detail: "Sjálfsmat. Merktu það þannig hvar sem það birtist",
          missing: t.survey_substituted_pct === null ? "Þjónustukönnun á degi 0" : undefined,
        }),
      },
      {
        id: "new_demand", name: "Ný eftirspurn",
        why: "Hefðu annars ekkert gert. Betra aðgengi fyrir sjúklinginn en enginn léttir fyrir heilsugæsluna. Haltu þessu aðskildu.",
        compute: ({ t }) => ({
          value: p(t.survey_would_not_have_sought_pct),
          detail: "Sjálfsmat",
          missing: t.survey_would_not_have_sought_pct === null ? "Þjónustukönnun á degi 0" : undefined,
        }),
      },
    ],
  },

  // ── Scalability ───────────────────────────────────────────────────────────
  {
    id: "staffing",
    name: "Mönnun þjónustunnar",
    question: "Getum við í raun mannað þetta, mánuð eftir mánuð?",
    claim: "Þjónustan var mönnuð N% af opnunartíma í tólf mánuði, með M lækna.",
    category: "scalability",
    effort: "low",
    sources: ["internal"],
    benefit:
      "Sýnir að hægt er að reka þjónustuna mánuð eftir mánuð.",
    lead: true,
    horizon: "now",
    rationale:
      "Þjónusta sem enginn mannar flyst ekki á næstu stöð, sama hve góðar tölur sjúklinga eru. Þetta er það sem næsta stofnun er í raun að kaupa. Og það kostar ekkert: vaktaskráin geymir þetta þegar, svo ekkert þarf að slá inn.",
    caveat:
      "Mönnun gildir fyrir alla þjónustuna, ekki einstakar stöðvar. Sami læknir sinnir öllum stöðvum, svo þessar tölur breytast ekki þegar stöð er valin. Taktu það fram á síðunni, annars les einhver flipa einnar stöðvar og heldur annað.",
    protocol: [
      { text: "Haltu vaktaskránni uppfærðri. Tölurnar koma sjálfkrafa þaðan", link: { href: "/admin/roster", label: "Vaktaskrá" } },
      { text: "Skráðu þegar læknir hættir", detail: "Vaktaskráin geymir ekki starfslokadag. Starfsmannavelta er því eina talan hér sem er slegin inn í höndunum." },
    ],
    fields: [
      { key: "doctors_left", label: "Læknar sem hættu", source: "internal" },
      { key: "uptime_pct", label: "Uppitími kerfis", unit: "percent", nullable: true, source: "internal" },
    ],
    documents: [],
    metrics: [
      {
        id: "coverage", name: "Mannaðar vaktir", headline: true,
        why: "Það sem næsta stofnun er í raun að kaupa. Gildir fyrir alla þjónustuna, ekki einstakar stöðvar.",
        compute: ({ roster }) => ({
          value: roster.shifts ? p(pct(roster.covered, roster.shifts)) : null,
          detail: roster.shifts
            ? `${n(roster.covered)} af ${n(roster.shifts)} ${pl(roster.shifts, "vakt", "vöktum")} · ${roster.doctors} ${pl(roster.doctors, "læknir tók", "læknar tóku")} vakt`
            : "Engar vaktir á tímabilinu",
          missing: roster.shifts ? undefined : "Vaktir skráðar í vaktaskrána",
          status: !roster.shifts ? undefined : pct(roster.covered, roster.shifts)! >= 98 ? "good" : pct(roster.covered, roster.shifts)! >= 90 ? "fair" : "poor",
        }),
      },
      {
        id: "turnover", name: "Starfsmannavelta lækna",
        why: "Harður mælikvarði á hvort þjónustan er yfirfæranleg, ekki mjúkur.",
        compute: ({ t, roster }) => ({
          value: roster.activeDoctors ? p(pct(t.doctors_left, roster.activeDoctors)) : null,
          detail: `${n(t.doctors_left)} ${pl(t.doctors_left, "hætti", "hættu")} af ${n(roster.activeDoctors)} á skrá`,
        }),
      },
      {
        id: "swaps", name: "Vaktaskipti",
        why: "Mönnun sem næst aðeins með stöðugum vaktaskiptum flyst ekki á næstu stöð.",
        compute: ({ roster }) => ({
          value: roster.shifts ? p(pct(roster.swaps, roster.shifts)) : null,
          detail: `${n(roster.swaps)} vaktaskipti á ${n(roster.shifts)} ${pl(roster.shifts, "vakt", "vöktum")}`,
          status: !roster.shifts ? undefined : pct(roster.swaps, roster.shifts)! <= 10 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "self-sufficiency",
    name: "Sjálfbærni stöðvar",
    question: "Hætti stöðin að þurfa á okkur að halda?",
    claim: "Spurningum um aðstoð fækkaði úr N á viku í M. Stöðin varð sjálfbær á innan við ársfjórðungi.",
    category: "scalability",
    effort: "low",
    sources: ["internal"],
    benefit:
      "Sýnir stöð sem lærir að reka þjónustuna án okkar.",
    horizon: "now",
    rationale:
      "Ef spurningum um aðstoð fækkar yfir árið sýnir það beint að stöðin lærði að reka þjónustuna án okkar. Það er einmitt sagan sem næsta stofnun vill heyra. Ólíkt mönnun á hún við hverja stöð fyrir sig.",
    caveat:
      "Lág tala getur líka þýtt að enginn noti þjónustuna. Lestu hana með fjölda erinda.",
    protocol: [
      { text: "Teldu spurningar frá stöðinni til okkar í hverjum mánuði", link: { href: "/admin/vinnustod", label: "Innhólf vinnustöðvar" } },
      { text: "Skráðu um hvað endurteknu spurningarnar snúast. Þær sýna hvað vantar í kennsluefnið við afhendingu" },
    ],
    fields: [{ key: "support_questions", label: "Spurningar frá stöðinni um aðstoð", source: "internal" }],
    documents: [],
    metrics: [
      {
        id: "support", name: "Spurningar um aðstoð", headline: true,
        why: "Lækkandi ferill er skýrasta vísbending um yfirfæranleika sem völ er á.",
        compute: ({ t }) => ({
          value: n(t.support_questions),
          detail: `Á ${t.months} ${pl(t.months, "mánuði", "mánuðum")}. Það er þróunin sem skiptir máli, ekki fjöldinn`,
        }),
      },
    ],
  },

  {
    id: "staff-experience",
    name: "Starfsmannakönnun HSU",
    question: "Er starfsfólk HSU ánægt, hjálpar þjónustan því og á hún að halda áfram?",
    claim: "X% starfsfólks HSU voru ánægð, Y% sögðu að þjónustan hjálpi þeim og Z% vilja að hún haldi áfram.",
    category: "system",
    effort: "medium",
    sources: ["survey"],
    benefit:
      "Gefur þér setninguna sem læknir á næstu stöð mun biðja um.",
    horizon: "now",
    rationale:
      "Þrjár spurningar ráðgjafans til starfsfólks heilsugæslunnar, lagðar fyrir í lok tímabilsins: ánægja, gagn og hvort þjónustan eigi að halda áfram. Þær skipta meira máli en virðist. Læknir á næstu stöð spyr ekki stjórnendur hvernig gekk. Hann spyr lækninn hér. Athugaðu að hjálp og vinnuálag er ekki það sama. Að hafa svar í stað þess að segja „ég veit það ekki“ er raunverulegur léttir sem heldur fólki í starfi. En hann sést ekki í mínútum og má ekki selja hann sem vinnuléttir.",
    caveat:
      "Fáir svarendur á einni stöð. Líttu á þetta sem vitnisburð, ekki tölfræði, og segðu frá hve margir svöruðu.",
    protocol: [
      { text: "Festu spurningarnar þrjár og bættu við einni opinni", detail: "Ánægja með þjónustuna, hvort hún hjálpi í starfi og hvort hún eigi að halda áfram. Og sú opna: „Ef þetta yrði tekið af á morgun, hvað myndi breytast?“ Svörin við henni eru það sem þú lest upp fyrir næstu stöð." },
      { text: "Sendu könnunina í lok tímabilsins til allra hjá HSU sem senda erindi áfram eða taka við þeim", detail: "Hjúkrunarfræðinga, lækna og móttökustarfsfólks: fjarlaekningar.is/kannanir/starfsfolk-hsu-lok-timabils?stod=Vestmannaeyjar. Starfsstétt er spurð í könnuninni og svörin reiknast sjálfkrafa inn í matið.", link: { href: "/admin/surveys", label: "Kannanir" } },
      { text: "Fáðu einn af læknum HSU til að fara yfir öryggistölurnar", detail: "Sá sem tók þátt í að skoða gögnin ver þau síðar." },
    ],
    fields: [
      { key: "staff_satisfied_pct", label: "Starfsfólk ánægt", unit: "percent", nullable: true, source: "survey", when: "end" },
      { key: "staff_helps_pct", label: "Starfsfólk segir þjónustuna hjálpa", unit: "percent", nullable: true, source: "survey", when: "end" },
      { key: "staff_continue_pct", label: "Starfsfólk vill að hún haldi áfram", unit: "percent", nullable: true, source: "survey", when: "end" },
    ],
    documents: [
      { id: "staff-survey", name: "Starfsmannakönnun", why: "Fast orðalag könnunarinnar í lok tímabils.", required: true },
    ],
    metrics: [
      {
        id: "continue", name: "Vilja að hún haldi áfram", headline: true,
        why: "Mat þeirra sem vinna með þjónustunni á hverjum degi.",
        compute: ({ t }) => ({
          value: p(t.staff_continue_pct),
          detail: "Starfsmannakönnun HSU í lok tímabils",
          missing: t.staff_continue_pct === null ? "Starfsmannakönnun" : undefined,
          status: t.staff_continue_pct === null ? undefined : t.staff_continue_pct >= 75 ? "good" : t.staff_continue_pct >= 50 ? "fair" : "poor",
        }),
      },
      {
        id: "helps", name: "Segja að hún hjálpi",
        why: "Hjálp er ekki það sama og vinnuléttir. Haltu þessu tvennu aðskildu í skýrslunni.",
        compute: ({ t }) => ({ value: p(t.staff_helps_pct), detail: "Af starfsfólki HSU sem svaraði", missing: t.staff_helps_pct === null ? "Starfsmannakönnun" : undefined }),
      },
      {
        id: "staff_satisfied", name: "Ánægð",
        why: "Almenna matið.",
        compute: ({ t }) => ({ value: p(t.staff_satisfied_pct), detail: "Af starfsfólki HSU sem svaraði", missing: t.staff_satisfied_pct === null ? "Starfsmannakönnun" : undefined }),
      },
    ],
  },
];

/** The catalogue, in offer order: the eighteen the pilot was designed around,
 *  then the second wave. Order inside a category is cheap-and-load-bearing
 *  first, which is also the order a reviewer should work down. */
export const ALL_MODULES: Module[] = [DESIGN_MODULE, ...MODULES, ...EXTRA_MODULES];

export const MODULE_BY_ID = new Map(ALL_MODULES.map((m) => [m.id, m]));
export const CORE_MODULE_IDS = ALL_MODULES.filter((m) => m.core).map((m) => m.id);
