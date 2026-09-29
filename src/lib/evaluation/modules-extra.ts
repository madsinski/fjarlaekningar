// The second wave of research modules.
//
// Kept in their own file so the first eighteen stay readable, but they are the
// same kind of thing and appear in the same catalogue. Several are marked
// `horizon: "later"` — they need groundwork the pilot year does not have, and
// an advisor should be able to see that without reading the whole card.
//
// Three of these answer questions the pilot cannot currently answer at all and
// that the next institution will certainly ask: how long does it take to open
// a site, how many more cases could you take, and are you only reaching the
// digitally confident.

import type { Module } from "./types";
import { pct } from "./totals";

const n = (v: number) => v.toLocaleString("is-IS");
const p = (v: number | null) => (v === null ? null : `${v}%`);
// Icelandic takes the singular after numbers ending in 1 (except 11).
const pl = (v: number, one: string, many: string) => (v % 10 === 1 && v % 100 !== 11 ? one : many);

export const EXTRA_MODULES: Module[] = [
  // ── Scalability ───────────────────────────────────────────────────────────
  {
    id: "implementation",
    name: "Kostnaður við innleiðingu",
    question: "Hve langan tíma tekur að opna nýja stöð og hvað kostar það stofnunina?",
    claim: "Við opnuðum stöðina á N dögum og það tók H klukkustundir af tíma starfsfólks þeirra. Þetta fékkst í staðinn.",
    category: "scalability",
    benefit: "Svarar fyrstu spurningunni sem næsta stofnun spyr.",
    horizon: "now",
    effort: "low",
    sources: ["internal"],
    rationale:
      "Tilraunaverkefnið snýst um hvort þjónustan sé yfirfæranleg. Samt mælir enginn innleiðinguna sjálfa. Allir mæla árangurinn í staðinn. Tvær tölur, skráðar einu sinni fyrir hverja stöð, breyta „þetta gekk vel“ í tillögu sem önnur stofnun getur skipulagt út frá. Þær gera líka svarið í útboði áþreifanlegt: ekki „við getum stækkað“ heldur „fjórar vikur og tólf klukkustundir af tíma starfsfólks ykkar“.",
    caveat:
      "Ein stöð er einn gagnapunktur og fyrsta stöðin er alltaf sú hægasta. Settu töluna fram sem efri mörk, ekki meðaltal, þar til önnur stöð bætist við.",
    protocol: [
      { text: "Skráðu daginn sem samningurinn var undirritaður og daginn sem fyrsta erindið barst", detail: "Skráð einu sinni, í mánuðinum sem þjónustan hefst. Ódýrt núna en ómögulegt að endurgera heiðarlega ári síðar.", timeCritical: true },
      { text: "Skráðu hve margar klukkustundir starfsfólk stofnunarinnar varði í þjálfun og uppsetningu", link: { href: "/admin/onboarding", label: "Innleiðing stöðva" } },
      { text: "Skráðu hvað þurfti að gera aftur og hvers vegna", detail: "Allur sparnaðurinn við næstu stöð liggur í því sem fór úrskeiðis á þeirri fyrstu." },
    ],
    fields: [
      { key: "implementation_days", label: "Dagar frá samningi að fyrsta erindi", nullable: true, source: "internal" },
      { key: "training_hours", label: "Klukkustundir starfsfólks stofnunarinnar", unit: "hours", nullable: true, source: "internal" },
    ],
    documents: [
      { id: "rollout-log", name: "Innleiðingardagbók", why: "Hvað var gert, í hvaða röð og hvað þurfti að gera aftur. Þetta verður handbókin fyrir næstu stöð." },
    ],
    metrics: [
      {
        id: "days_to_open", name: "Dagar að opna stöð", headline: true,
        why: "Lokaorðin í hverri kynningu um frekari útbreiðslu. Þau gera allt hitt trúverðugt.",
        compute: ({ t }) => ({
          value: t.implementation_days === null ? null : `${t.implementation_days} ${pl(t.implementation_days, "dagur", "dagar")}`,
          detail: t.training_hours !== null
            ? `og ${t.training_hours} ${pl(t.training_hours, "klukkustund", "klukkustundir")} af tíma starfsfólks stofnunarinnar`
            : "Frá undirritun samnings að fyrsta erindi",
          missing: t.implementation_days === null ? "Upphafsdagar skráðir" : undefined,
        }),
      },
    ],
  },

  {
    id: "capacity",
    name: "Svigrúm í afkastagetu",
    question: "Hve mörgum erindum til viðbótar gætum við sinnt án þess að bæta við fólki?",
    claim: "Núverandi mönnun ber N erindi á mánuði og er nú nýtt að X%.",
    category: "scalability",
    benefit: "Segir þér hvort þú getur sagt já við næstu stöð án þess að ráða fleiri.",
    horizon: "now",
    effort: "medium",
    requires: ["clinician-effort"],
    sources: ["derived", "internal"],
    rationale:
      "Sá sem metur tilboð í útboði spyr hve mikið magn þið ráðið við, og „heilmikið“ er ekki svar. Talan er reiknuð út frá mínútum læknis á hvert erindi og þeim vöktum sem eru raunverulega á vaktaplani. Hún kostar því ekkert umfram rannsóknarþáttinn um vinnutíma lækna. Hún svarar líka spurningunni innanhúss, áður en þú skuldbindur þig til annarrar stöðvar og kemst að því að vaktaplanið ber hana ekki.",
    caveat:
      "Svigrúm á blaði er ekki svigrúm í raun. Takmörkunin er oftast hver er fús til að taka kvöldvakt, ekki reikningurinn. Lestu töluna með vaktaþekju og hlutfalli vaktaskipta.",
    protocol: [
      { text: "Staðfestu að vaktatímarnir í vaktaplaninu séu réttir", link: { href: "/admin/roster", label: "Vaktaplan" } },
      { text: "Ákveddu hvaða nýting telst sjálfbær", detail: "90% nýting á vaktaplani sem byggir nánast á sjálfboðavinnu er ekki það sama og 90% nýting á launuðu vaktaplani." },
    ],
    fields: [],
    documents: [],
    metrics: [
      {
        id: "utilisation", name: "Nýting afkastagetu", headline: true,
        why: "Það sem þú getur lofað annarri stöð án þess að ráða fleiri. „Heilmikið“ er ekki svar í útboði.",
        compute: ({ t, roster }) => {
          const mins = t.clinician_minutes_median;
          if (!mins || !roster.shifts) {
            return { value: null, detail: "Þarf mínútur læknis á hvert erindi og mannaðar vaktir", missing: mins ? "Vaktir í vaktaplaninu" : "Rannsóknarþátturinn um vinnutíma lækna" };
          }
          // A shift is 10:00–22:00 in the rota's own defaults.
          const capacity = Math.floor((roster.covered * 12 * 60) / mins);
          return {
            value: p(pct(t.cases_total, capacity)),
            detail: `${n(t.cases_total)} erindi af um ${n(capacity)} sem vaktatímarnir gætu borið`,
            assumption: `Reiknað: ${roster.covered} ${pl(roster.covered, "mönnuð vakt", "mannaðar vaktir")} × 12 klst. ÷ ${mins} mín. á erindi. Svigrúm á blaði. Raunverulega takmörkunin er oftast hver vill taka kvöldvakt.`,
          };
        },
      },
    ],
  },

  {
    id: "demand-pattern",
    name: "Hvenær erindin berast",
    question: "Hvenær berast erindin í raun?",
    claim: "X% erinda berast utan opnunartíma heilsugæslunnar. Það er einmitt bilið sem þjónustan fyllir.",
    category: "scalability",
    benefit: "Mótar vaktaplanið eftir raunverulegri eftirspurn og rökstyður þörfina utan dagvinnutíma.",
    horizon: "now",
    effort: "low",
    sources: ["medalia"],
    rationale:
      "Fæst án aukakostnaðar úr tímastimplum sem eru þegar í útdrættinum og gerir tvennt. Það sýnir hvar vaktirnar eiga að vera. Og það setur tölu á þann hluta röksemdanna sem allir fullyrða en enginn sýnir fram á: að stór hluti eftirspurnar berist þegar heilsugæslan er lokuð. Ef það reynist rangt viltu vita það áður en þú byggir tillögu á því.",
    caveat:
      "Tíminn sem erindi berst er sá tími sem sjúklingurinn valdi að senda það. Hann mótast af því hvenær sjúklingnum var sagt frá þjónustunni. Fyrstu tölurnar endurspegla því hvernig sjúklingum er vísað á þjónustuna ekki síður en raunverulega þörf.",
    protocol: [
      { text: "Biddu Medalia um hlutfall erinda sem berast eftir kl. 17:00 og um helgar", detail: "Hlutföll, ekki tímastimpla. Á lítilli stöð getur tímastimpill verið persónugreinanlegur." },
      { text: "Berðu saman við opnunartíma heilsugæslunnar" },
    ],
    fields: [
      { key: "demand_evening_pct", label: "Sent eftir kl. 17:00", unit: "percent", nullable: true, source: "medalia" },
      { key: "demand_weekend_pct", label: "Sent um helgar", unit: "percent", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "evening", name: "Barst eftir kl. 17:00", headline: true,
        why: "Rök fyrir þörfinni utan dagvinnutíma og vísbending um hvernig vaktaplanið á að líta út.",
        compute: ({ t }) => ({
          value: p(t.demand_evening_pct),
          detail: t.demand_weekend_pct !== null ? `${t.demand_weekend_pct}% um helgar` : "Borið saman við opnunartíma heilsugæslunnar",
          missing: t.demand_evening_pct === null ? "Skipting eftir tíma í útdrættinum" : undefined,
        }),
      },
    ],
  },

  // ── Workload ──────────────────────────────────────────────────────────────
  {
    id: "clinician-effort",
    name: "Vinnutími læknis á erindi",
    question: "Hve lengi er læknir með hvert erindi?",
    claim: "Hvert erindi tekur að miðgildi M mínútur af tíma læknis. Talan er mæld, ekki áætluð.",
    category: "system",
    benefit: "Breytir kostnaði við hvert erindi úr ágiskun í mælda tölu.",
    horizon: "now",
    effort: "medium",
    sources: ["internal", "medalia"],
    rationale:
      "Innri rannsókn, eins og ráðgjafinn orðaði það. Allt um afkastagetu og kostnað á erindi hvílir á þessari einu tölu. Erindi sem tekur fjörutíu mínútur af tíma læknis er önnur þjónusta en erindi sem tekur átta. Þetta vill næsta stöð líka vita áður en hún spyr hve marga lækna hún þarf.",
    caveat:
      "Tími í sjúkraskrá er ekki sami tími og unninn er. Læknir getur haft skrána opna meðan hann sinnir öðru. Líttu á tölu úr kerfinu sem efri mörk og taktu úrtaksmælinguna fram yfir hana.",
    protocol: [
      { text: "Spyrðu Medalia hvort hægt sé að flytja út tíma á hvert erindi", detail: "Virkan tíma ef hann er skráður, annars tímann sem skráin var opin. Merktu hvort er." },
      { text: "Gerðu innri tímamælingu: læknar skrá mínútur á hvert erindi í tvær vikur", detail: "Tuttugu erindi á hvern lækni duga fyrir miðgildi sem hægt er að skipuleggja út frá. Einu sinni snemma og aftur um níunda mánuð." },
    ],
    fields: [{ key: "clinician_minutes_median", label: "Miðgildi mínútna læknis á erindi", unit: "minutes", nullable: true, source: "internal" }],
    documents: [],
    metrics: [
      {
        id: "minutes_per_case", name: "Mínútur læknis á erindi", headline: true,
        why: "Talan undir hverri fullyrðingu um afkastagetu og kostnað.",
        compute: ({ t }) => {
          const hours = t.clinician_minutes_median && t.cases_total
            ? Math.round((t.clinician_minutes_median * t.cases_total) / 60)
            : null;
          return {
            value: t.clinician_minutes_median === null ? null : `${t.clinician_minutes_median} mín.`,
            detail: hours !== null
              ? `Um ${hours} ${pl(hours, "klukkustund", "klukkustundir")} læknis á tímabilinu`
              : "Miðgildi yfir öll erindi",
            missing: t.clinician_minutes_median === null ? "Innri tímamæling eða tími í útdrættinum" : undefined,
          };
        },
      },
    ],
  },

  {
    id: "dna-avoidance",
    name: "Tímar sem fara ekki til spillis",
    question: "Hve mikið af sóaðri afkastagetu endurheimtist?",
    claim: "Sjúklingur í fjarþjónustu getur ekki skrópað. Miðað við skróphlutfall stofnunarinnar sjálfrar jafngildir það N tímum sem nýtast.",
    category: "system",
    benefit: "Breytir innbyggðum kosti fjarþjónustu í tölu.",
    horizon: "now",
    effort: "low",
    requires: ["code-volume"],
    sources: ["institution"],
    rationale:
      "Þetta er einn fárra raunverulegra innbyggðra kosta fjarþjónustu, og hann er nánast aldrei mældur. Hvert erindi sem er afgreitt í fjarþjónustu er tími sem gat ekki farið til spillis. Heilsugæslur finna mikið fyrir skrópum, því kostnaðurinn er þegar fallinn til þegar sjúklingur mætir ekki. Ein tala frá stofnuninni breytir þessu í mælanlega stærð.",
    caveat:
      "Gert er ráð fyrir að erindið hefði annars orðið að bókuðum tíma, en það á ekki við um öll erindi. Settu töluna fram með tölunni um hvert sjúklingurinn hefði annars leitað, ekki eina og sér.",
    protocol: [
      { text: "Biddu stofnunina um skróphlutfall í sambærilegum tímum", timeCritical: true },
      { text: "Notaðu það aðeins á erindi sem hefðu líklega orðið að bókuðum tíma" },
    ],
    fields: [{ key: "institution_dna_pct", label: "Skróphlutfall stofnunarinnar", unit: "percent", nullable: true, source: "institution" }],
    documents: [],
    metrics: [
      {
        id: "dna", name: "Tímar sem nýtast", headline: true,
        why: "Innbyggður kostur fjarþjónustu sem enginn nennir að setja tölu á.",
        compute: ({ t }) => ({
          value: t.institution_dna_pct === null ? null : n(Math.round((t.cases_resolved * t.institution_dna_pct) / 100)),
          detail: t.institution_dna_pct === null
            ? "Þarf skróphlutfall stofnunarinnar sjálfrar"
            : `Miðað við ${t.institution_dna_pct}% skróphlutfall þeirra, af ${n(t.cases_resolved)} erindum sem voru afgreidd í fjarþjónustu`,
          missing: t.institution_dna_pct === null ? "Skróphlutfall frá stofnuninni" : undefined,
          assumption: "Gert er ráð fyrir að hvert afgreitt erindi hefði annars orðið að bókuðum tíma. Það á við um sum, ekki öll.",
        }),
      },
    ],
  },

  {
    id: "out-of-hours",
    name: "Minna álag á vaktþjónustu",
    question: "Léttum við álagi af vaktþjónustu og bráðamóttöku?",
    claim: "X% sögðust annars hafa leitað til vaktþjónustu eða hringt í 112.",
    category: "system",
    benefit: "Sýnir að áhrifin ná út fyrir heilsugæsluna, til þeirrar þjónustu sem kostar mest.",
    horizon: "later",
    effort: "low",
    requires: ["access-gain"],
    sources: ["survey"],
    rationale:
      "Það er ekki bara heilsugæslan sem léttir á. Vaktþjónusta og bráðaþjónusta kosta miklu meira á hverja komu. Þetta er einn svarmöguleiki til viðbótar í spurningu sem þú spyrð nú þegar. Hann nær líka til hóps sem tölur heilsugæslunnar ná ekki til: þeirra sem fjármagna bráðaþjónustu.",
    caveat:
      "Byggt á svörum sjúklinga, og fólk ofmetur að það hefði leitað bráðaþjónustu. Merktu töluna sem yfirlýstan ásetning. Breyttu henni aldrei í sparnað án þess að segja það berum orðum.",
    protocol: [
      { text: "Bættu vaktþjónustu og 112 við sem svarmöguleikum í spurningunni „Hvert hefðir þú annars leitað?“" },
      { text: "Birtu töluna sem yfirlýstan ásetning, aldrei sem komur sem færðust til" },
    ],
    fields: [{ key: "ooh_alternative_pct", label: "Hefði leitað til vaktþjónustu eða hringt í 112", unit: "percent", nullable: true, source: "survey" }],
    documents: [],
    metrics: [
      {
        id: "ooh", name: "Hefði annars leitað til vaktþjónustu", headline: true,
        why: "Nær til þeirra sem fjármagna bráðaþjónustu, ekki bara heilsugæslunnar.",
        compute: ({ t }) => ({
          value: p(t.ooh_alternative_pct),
          detail: "Svör sjúklinga um ásetning, ekki komur sem færðust til",
          missing: t.ooh_alternative_pct === null ? "Svarmöguleiki í könnun" : undefined,
        }),
      },
    ],
  },

  // ── Effectiveness ─────────────────────────────────────────────────────────
  {
    id: "home-tests",
    name: "Heimapróf",
    question: "Gat sjúklingurinn nálgast prófið og framkvæmt það?",
    claim: "Heimapróf voru notuð í N erindum. X% áttu auðvelt með að nálgast prófið og Y% með að framkvæma það.",
    category: "patient",
    benefit: "Sýnir hvort heimaprófin virka í höndum sjúklingsins, og hvar þau bregðast.",
    horizon: "now",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["medalia", "survey"],
    rationale:
      "Heimapróf gagnast aðeins ef sjúklingurinn getur nálgast það og framkvæmt það. Ráðgjafinn spyr um hvort tveggja í þjónustukönnuninni á degi 0: hvernig gekk að fá prófið í hendur og hvernig gekk að framkvæma það. Þetta bregst á ólíkum stöðum. Að nálgast prófið snýst um birgðir og dreifingu á stöðinni. Að framkvæma það snýst um leiðbeiningarnar. Þess vegna er spurningunum haldið aðskildum.",
    caveat:
      "Aðeins þeir sem notuðu próf geta svarað, svo tölurnar eru litlar. Treystu stefnunni en taktu nákvæmu töluna með fyrirvara.",
    protocol: [
      { text: "Skráðu „heimapróf notað“ sem kóðaðan reit í Medalia" },
      { text: "Spyrðu prófspurninganna tveggja í þjónustukönnuninni á degi 0, aðeins þá sem notuðu próf" },
      { text: "Berðu saman við birgðir á hverri stöð", link: { href: "/admin/onboarding", label: "Innleiðing stöðva" } },
    ],
    fields: [
      { key: "home_tests_used", label: "Erindi þar sem heimapróf var notað", nullable: true, source: "medalia" },
      { key: "survey_test_obtain_pct", label: "Auðvelt að nálgast prófið", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_test_perform_pct", label: "Auðvelt að framkvæma prófið", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "test_perform", name: "Auðvelt að framkvæma", headline: true,
        why: "Próf sem sjúklingurinn getur ekki framkvæmt er ekkert próf.",
        compute: ({ t }) => ({
          value: p(t.survey_test_perform_pct),
          detail: t.home_tests_used ? `Heimapróf var notað í ${n(t.home_tests_used)} ${pl(t.home_tests_used, "erindi", "erindum")}` : "Af þeim sem notuðu próf",
          missing: t.survey_test_perform_pct === null ? "Þjónustukönnun á degi 0" : undefined,
          status: t.survey_test_perform_pct === null ? undefined : t.survey_test_perform_pct >= 80 ? "good" : "fair",
        }),
      },
      {
        id: "test_obtain", name: "Auðvelt að nálgast",
        why: "Birgðir og dreifing á stöðinni.",
        compute: ({ t }) => ({ value: p(t.survey_test_obtain_pct), detail: "Af þeim sem notuðu próf", missing: t.survey_test_obtain_pct === null ? "Þjónustukönnun á degi 0" : undefined }),
      },
    ],
  },

  {
    id: "image-quality",
    name: "Nothæfar myndir",
    question: "Geta sjúklingar í raun tekið nothæfa ljósmynd?",
    claim: "X% innsendra mynda dugðu til ákvörðunar án þess að biðja þyrfti um nýja mynd.",
    category: "patient",
    benefit: "Sýnir hvort erindaflokkar sem varða húð og augu ganga upp eins og þeir eru hannaðir.",
    horizon: "later",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "Fjórir af ellefu erindaflokkum byggja á ljósmynd sem sjúklingurinn tekur á eigin síma. Ef verulegur hluti myndanna er ónothæfur bera þessir flokkar falinn kostnað: aðra beiðni, töf og sjúkling sem hefur þegar beðið. Þessi rannsóknarþáttur staðfestir annaðhvort myndaflokkana eða segir þér að endurskrifa leiðbeiningarnar.",
    caveat:
      "Hvort mynd sé nothæf er mat læknis og það er breytilegt milli lækna. Talan gagnast sem leitni og sem hvatning til að bæta leiðbeiningarnar, ekki sem nákvæmt hlutfall.",
    protocol: [
      { text: "Skráðu innsendar myndir og hvort beðið var um nýja mynd" },
      { text: "Farðu yfir ónothæfu myndirnar ársfjórðungslega og endurskrifaðu leiðbeiningar um myndatöku", detail: "Allt gildi þessa rannsóknarþáttar liggur í endurskoðun leiðbeininganna sem hann kallar á." },
    ],
    fields: [
      { key: "images_submitted", label: "Innsendar myndir", nullable: true, source: "medalia" },
      { key: "images_inadequate", label: "Ónothæfar, beðið um nýja mynd", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "image_ok", name: "Nothæfar í fyrstu tilraun", headline: true,
        why: "Fjórir erindaflokkar byggja á mynd sem sjúklingurinn tekur sjálfur. Þetta sýnir hvort sú forsenda stenst.",
        compute: ({ t }) => ({
          value: t.images_submitted && t.images_inadequate !== null
            ? p(pct(t.images_submitted - t.images_inadequate, t.images_submitted))
            : null,
          detail: t.images_submitted ? `${n(t.images_submitted)} ${pl(t.images_submitted, "innsend mynd", "innsendar myndir")}` : "Þarf fjölda mynda í útdrættinum",
          missing: t.images_submitted === null ? "Myndareitir í útdrættinum" : undefined,
        }),
      },
    ],
  },

  // ── Experience ────────────────────────────────────────────────────────────
  {
    id: "equity",
    name: "Til hverra þjónustan nær",
    question: "Þjónum við aðeins þeim sem eru vanir stafrænni tækni?",
    claim: "Þjónustan náði til fólks yfir sjötugt og þeirra sem tala ekki íslensku í sama hlutfalli og í þýðinu sem hún þjónar.",
    category: "patient",
    benefit: "Svarar spurningunni um sanngirni áður en eftirlitsaðili eða blaðamaður spyr hennar.",
    horizon: "now",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "Algengasta gagnrýnin á stafræna heilbrigðisþjónustu er að hún þjóni í kyrrþey þeim sem síst þurftu á henni að halda. Þjónusta sem eykur ójöfnuð en mælist með frábæra ánægju er raunveruleg hætta, ekki fræðileg. Þrjú hlutföll, borin saman við íbúa svæðisins, svara þessu. Ef svarið er óþægilegt er miklu betra að komast að því í þriðja mánuði og bregðast við en að heyra það á fundi í tólfta mánuði.",
    caveat:
      "Hlutföll í litlu þýði sveiflast mikið. Munur er ástæða til að skoða málið, ekki sönnun um útilokun. Haltu þessu í aldursbilum. Aldur eða tungumál má aldrei geyma eða birta fyrir einstaklinga.",
    protocol: [
      { text: "Biddu Medalia um aldursbil og tungumál sem HLUTFÖLL, aldrei sem færslur", detail: "Hlutföll eftir aldursbilum eru ekki persónuupplýsingar. Fæðingardagur á lítilli stöð er það.", timeCritical: true },
      { text: "Fáðu íbúasamsetningu svæðisins frá Hagstofu Íslands til samanburðar" },
      { text: "Farðu yfir þetta ársfjórðungslega og brugðstu við viðvarandi mun", detail: "Að finna mun og gera ekkert er verra en að mæla ekki. Nú er hann skjalfestur." },
    ],
    fields: [
      { key: "reach_under40_pct", label: "Yngri en 40 ára", unit: "percent", nullable: true, source: "medalia" },
      { key: "reach_over70_pct", label: "Eldri en 70 ára", unit: "percent", nullable: true, source: "medalia" },
      { key: "reach_other_language_pct", label: "Annað mál en íslenska", unit: "percent", nullable: true, source: "medalia" },
    ],
    documents: [
      { id: "population-profile", name: "Íbúasamsetning svæðisins", why: "Samanburðurinn frá Hagstofu Íslands. Án hans segja hlutföllin ekkert." },
    ],
    metrics: [
      {
        id: "older", name: "Náði til fólks yfir sjötugt", headline: true,
        why: "Algengasta gagnrýnin á stafræna heilbrigðisþjónustu, svarað með gögnum en ekki fullyrðingum.",
        compute: ({ t }) => ({
          value: p(t.reach_over70_pct),
          detail: t.reach_other_language_pct !== null
            ? `${t.reach_other_language_pct}% notuðu annað mál en íslensku`
            : "Berðu saman við íbúasamsetningu svæðisins",
          missing: t.reach_over70_pct === null ? "Aldursbil í útdrættinum" : undefined,
        }),
      },
      {
        id: "language", name: "Annað mál en íslenska",
        why: "Tungumál er hinn ásinn þar sem fjarþjónusta getur útilokað fólk án þess að nokkur taki eftir því.",
        compute: ({ t }) => ({
          value: p(t.reach_other_language_pct),
          detail: "Hlutfall erinda, borið saman við íbúa svæðisins",
          missing: t.reach_other_language_pct === null ? "Hlutfall tungumála í útdrættinum" : undefined,
        }),
      },
    ],
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  {
    id: "diagnostic-concordance",
    name: "Rétt greining",
    question: "Var greiningin rétt hjá þeim sem leituðu annað innan 7 daga?",
    claim: "Farið var yfir sjúkraskrár N sjúklinga sem komu aftur innan 7 daga. Greiningin í fjarþjónustu stóðst í X% tilvika.",
    category: "safety",
    benefit: "Beinasta prófið á klínísku matinu sjálfu.",
    horizon: "now",
    effort: "high",
    requires: ["revisits"],
    sources: ["survey", "institution"],
    rationale:
      "Allir aðrir öryggismælikvarðar hér eru óbeinir: engin atvik, fáar endurkomur, skimunin virkaði. Þessi ber greininguna saman við það sem fannst þegar sjúklingurinn var skoðaður aftur. Ráðgjafinn spyr á tvo vegu. Þjónustukönnunin á degi 7 spyr hvort sjúklingurinn hafi fengið aðra greiningu annars staðar. Og í sömu handvirku yfirferð á sjúkraskrám HSU og telur endurkomur innan 7 daga er skráð hvort greiningin stóðst.",
    caveat:
      "Aðeins er hægt að athuga þá sem voru skoðaðir aftur. Úrtakið er því skekkt frá upphafi: erindin sem gengu vel koma aldrei fram í því. Þessa valskekkju verður að nefna í sömu andrá og niðurstöðuna, í hvert skipti.",
    protocol: [
      { text: "Ákveddu með lækni hvað telst að greiningin hafi staðist", detail: "Sami sjúkdómur eða sama meðferð? Það gefur ólíkar tölur, og valið verður að liggja fyrir áður en farið er yfir fyrstu sjúkraskrána." },
      { text: "Skráðu þetta í sömu yfirferð HSU og endurkomur innan 7 daga", detail: "HSU fer yfir og skilar talningum. Ein yfirferð, tvö svör." },
      { text: "Spyrðu í þjónustukönnuninni á degi 7 hvort sjúklingurinn hafi fengið aðra greiningu annars staðar" },
      { text: "Nefndu valskekkjuna alltaf með tölunni" },
    ],
    fields: [
      { key: "survey_other_diagnosis_pct", label: "Fékk aðra greiningu annars staðar (könnun)", unit: "percent", nullable: true, source: "survey" },
      { key: "concordance_checked", label: "Endurkomur þar sem greiningin var skoðuð", nullable: true, source: "institution" },
      { key: "concordance_agreed", label: "þar af stóðst greiningin", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "concordance-protocol", name: "Verklag við yfirferð", why: "Skilgreiningin á réttri greiningu, skrifuð áður en farið var yfir fyrstu sjúkraskrána.", required: true },
    ],
    metrics: [
      {
        id: "concordance", name: "Greiningin stóðst", headline: true,
        why: "Eini mælikvarðinn hér sem ber klínískt mat saman við það sem fannst síðar.",
        compute: ({ t }) => ({
          value: t.concordance_checked && t.concordance_agreed !== null
            ? p(pct(t.concordance_agreed, t.concordance_checked))
            : null,
          detail: t.concordance_checked
            ? `${n(t.concordance_agreed ?? 0)} af ${n(t.concordance_checked)} sem farið var yfir. Aðeins er hægt að athuga þá sem voru skoðaðir aftur`
            : "Þarf yfirferð á sjúkraskrám HSU",
          missing: t.concordance_checked === null ? "Yfirferð hjá HSU" : undefined,
          assumption: "Valskekkja frá upphafi: aðeins er hægt að athuga sjúklinga sem voru skoðaðir aftur. Nefndu þetta með tölunni í hvert skipti.",
        }),
      },
      {
        id: "other_diagnosis", name: "Fékk aðra greiningu annars staðar",
        why: "Hlið sjúklingsins, þar með talin þjónusta utan HSU.",
        compute: ({ t }) => ({
          value: p(t.survey_other_diagnosis_pct),
          detail: "Af þeim sem svöruðu á degi 7",
          missing: t.survey_other_diagnosis_pct === null ? "Þjónustukönnun á degi 7" : undefined,
        }),
      },
    ],
  },

  {
    id: "follow-up",
    name: "Ráðleggingum fylgt",
    question: "Gerðu sjúklingar í raun það sem þeim var ráðlagt?",
    claim: "X% staðfestu að þeir hefðu fylgt ráðleggingunum. Hlutfall afgreiddra erinda endurspeglar því þjónustu sem var þegin, ekki bara þjónustu sem var boðin.",
    category: "safety",
    benefit: "Brúar bilið milli ráða sem voru gefin og þjónustu sem var raunverulega þegin.",
    horizon: "later",
    effort: "medium",
    requires: ["patient-survey"],
    sources: ["survey"],
    rationale:
      "Þegar erindi er lokað sem afgreitt þýðir það að ráð voru gefin, ekki að þeim hafi verið fylgt. Ef fáir fylgja ráðunum mælir hlutfall afgreiddra erinda eitthvað þrengra en virðist. Það er gott að vita áður en talan er varin opinberlega. Þetta sýnir líka hvort skrifleg ráð í fjarþjónustu skila sér jafn vel og ráð sem eru gefin augliti til auglitis. Það er raunveruleg, ósvöruð spurning.",
    caveat:
      "Fólk ofmetur kerfisbundið hve vel það fylgir ráðum. Talan nýtist til samanburðar milli erindaflokka og yfir tíma, ekki sem algild tala.",
    protocol: [
      { text: "Bættu spurningu um hvort ráðum var fylgt við eftirfylgdarkönnunina" },
      { text: "Skiptu niðurstöðunni eftir erindaflokkum", detail: "Áhugaverða niðurstaðan verður að sumir erindaflokkar henta illa í fjarþjónustu, ekki heildartalan." },
    ],
    fields: [
      { key: "followup_contacted", label: "Sjúklingar spurðir hvort þeir fylgdu ráðum", nullable: true, source: "survey" },
      { key: "followup_adhered", label: "þar af fylgdu ráðunum", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "adherence", name: "Fylgdu ráðunum", headline: true,
        why: "Afgreiðsla þýðir að ráð voru gefin. Þetta sýnir hvort þau voru þegin.",
        compute: ({ t }) => ({
          value: t.followup_contacted && t.followup_adhered !== null
            ? p(pct(t.followup_adhered, t.followup_contacted))
            : null,
          detail: t.followup_contacted ? `${n(t.followup_contacted)} ${pl(t.followup_contacted, "sjúklingur spurður", "sjúklingar spurðir")}` : "Þarf spurningu um þetta í könnuninni",
          missing: t.followup_contacted === null ? "Spurning í könnun" : undefined,
          assumption: "Byggt á svörum sjúklinga og kerfisbundið ofmetið. Nýtist til samanburðar, ekki sem algild tala.",
        }),
      },
    ],
  },
];
