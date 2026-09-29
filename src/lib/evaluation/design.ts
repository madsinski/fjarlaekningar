// Study design — the decisions that determine what the figures are allowed to
// mean, and which have to be made before the data arrives rather than after.
//
// The measurement system had no stated design. That is not a cosmetic gap: an
// unstated design defaults to the weakest one — an uncontrolled before-and-after
// at a single site — and quietly inherits every threat that comes with it.
// Secular trend, seasonality, regression to the mean and the Hawthorne effect
// are all live here, and none of them can be dealt with afterwards.
//
// Two things in this file are worth more than everything else in it:
//
//   1. Ask for the baseline MONTH BY MONTH, not as one annual total. A monthly
//      series supports interrupted time series, which separates the effect of
//      the service from a trend that was already running. A single total
//      cannot, and cannot be un-aggregated afterwards.
//
//   2. Ask for the same monthly figures at stations that are NOT yet live.
//      A staged rollout is a stepped wedge waiting to happen: later sites are
//      comparisons for earlier ones, concurrently, which controls for anything
//      that changed nationally.
//
// Note what is and is not recoverable. The baseline itself is NOT lost by
// going live — it sits in Saga and can be extracted retrospectively whenever
// somebody runs the query. What expires is the goodwill to run it and the
// institutional memory of what else was happening that year. The comparison
// stations expire for real: a station stops being a comparison the day it
// goes live, and that is the clock actually running.
//
// What cannot be recovered at all is anything that had to be asked of a
// person at the time — how long staff spent per case before, what they
// thought of the service, what patients would otherwise have done. Those have
// no record in any system, and a question asked a year late gets a year-late
// answer.

import type { Module } from "./types";
import { codeVolume, type CodeVolume, type MonthRow } from "./totals";

// ── Designs ─────────────────────────────────────────────────────────────────

export type DesignId = "before-after" | "its" | "controlled" | "stepped-wedge";

export type Design = {
  id: DesignId;
  /**
   * The proper name. These are real terms from health-services research, not
   * labels invented here, so they stay — an ethics committee and a journal
   * both expect them. They are shown as a small secondary label rather than
   * as the heading, because nobody should have to recognise "stepped wedge"
   * to choose between four options.
   */
  name: string;
  /** What you read first: what you actually do, in words anyone can follow. */
  plainName: string;
  /** The procedure itself, in a sentence or two. */
  whatYouDo: string;
  /** What it does, in one sentence. */
  summary: string;
  /** What it lets you claim that the weaker options do not. */
  claim: string;
  /** What has to be true for it to be available. */
  requires: string[];
  /** What it does not protect against. */
  threats: string[];
  /** Effort beyond what is already planned. */
  cost: string;
  /** Roughly where it sits for a clinical or academic audience. */
  strength: 1 | 2 | 3 | 4;
  /** Can it still be chosen once the pilot has been running a while? */
  decideBy: string;
};

// Icelandic takes the singular after numbers ending in 1 (except 11).
const pl = (v: number, one: string, many: string) => (v % 10 === 1 && v % 100 !== 11 ? one : many);

export const DESIGNS: Design[] = [
  {
    id: "before-after",
    name: "Samanburður fyrir og eftir (án samanburðarhóps)",
    plainName: "Bera saman við hvernig staðan var áður",
    whatYouDo:
      "Taktu baseline úr Sögu, allt að 36 mánuði áður en þjónustan hófst á stöðinni, og berðu saman við fyrstu 6 og 12 mánuðina á eftir úr Medalia. Engin önnur stöð kemur við sögu.",
    summary: "Samanburður á baseline úr Sögu fyrir upphaf þjónustu og fyrstu 6 og 12 mánuðunum eftir, á sömu stöð.",
    claim: "Starfsemin breyttist eftir að við komum. En það er engin leið að sýna að það hafi verið okkar vegna.",
    requires: ["Baseline úr Sögu fyrir tímabilið á undan", "6 og 12 mánaða gögn úr Medalia"],
    threats: [
      "Hlutirnir voru hvort eð er að breytast. Heilsugæslan á Íslandi stóð ekki í stað þetta ár, og það sem breyttist á landsvísu er þakkað þjónustunni (undirliggjandi þróun).",
      "Veturinn vinnur verkið fyrir þig. Fjórir erindaflokkar sveiflast mikið eftir árstíðum. Ef upphaf að hausti er borið saman við baseline að vori geta komið fram mikil áhrif sem eru eingöngu dagatalið (árstíðasveiflur).",
      "Slæm tímabil lagast af sjálfu sér. Þjónusta er gjarnan sett á fót þar sem ástandið var óvenju slæmt, og óvenju slæm tímabil batna án þess að nokkur geri neitt (aðhvarf að meðaltali).",
      "Fólk leggur sig meira fram þegar fylgst er með því. Stöð sem veit að verið er að meta hana hegðar sér öðruvísi, og það rennur líka inn í niðurstöðuna (Hawthorne-áhrif).",
    ],
    cost: "Enginn. Þetta færðu sjálfkrafa ef þú ákveður ekkert.",
    strength: 1,
    decideBy: "Alltaf í boði. Þetta er þrautalendingin, ekki val.",
  },
  {
    id: "its",
    name: "Rofin tímaröð (interrupted time series)",
    plainName: "Fylgjast með þróun milli mánaða og leita að þrepi",
    whatYouDo:
      "Í stað tveggja stórra heildartalna skoðarðu töluna fyrir hvern einasta mánuð, fyrir og eftir. Síðan leitarðu að þrepi upp eða niður í nákvæmlega þeim mánuði sem þjónustan hófst, og að breyttri stefnu.",
    summary: "Mánaðarleg tímaröð fyrir og eftir upphaf þjónustu er greind. Prófað er hvort bæði stig og leitni breytist á þeim tímapunkti.",
    claim: "Starfsemin breyttist um X umfram þá þróun sem þegar var í gangi. Það er fullyrðing um orsök sem samanburður fyrir og eftir getur ekki staðið undir.",
    requires: [
      "Mánaðartölur fyrir tímabilið áður en þjónustan hófst. Tólf mánuðir eru þægilegt, átta eru raunhæft lágmark. Gögnin eru þegar í Sögu, það þarf bara einhver að keyra fyrirspurnina.",
      "Mánaðartölur eftir upphaf líka, ekki eina heildartölu",
      "Nákvæmur dagur sem þjónustan hófst",
    ],
    threats: [
      "Allt annað sem breyttist í sama mánuði. Ef heilsugæslan endurskipulagði líka símaráðgjöfina þegar þjónustan hófst er engin leið að greina þetta tvennt í sundur.",
      "Enn er bara um eina stöð að ræða. Allt sem er sérstakt við Vestmannaeyjar lítur nákvæmlega út eins og þjónustan sé að virka.",
    ],
    cost: "Ein setning í beiðninni til HSU: mánaðartölur í stað heildartölu fyrir árið. Gögnin eru þegar til.",
    strength: 2,
    decideBy: "Hvenær sem þú biður um gögnin. Eldri gögn hverfa ekki. En biddu um mánuði, ekki ár: eina heildartölu er ekki hægt að brjóta aftur niður.",
  },
  {
    id: "controlled",
    name: "Samanburður fyrir og eftir, með samanburðarstöð",
    plainName: "Bera saman við stöð sem er ekki byrjuð",
    whatYouDo:
      "Þú mælir það sama á annarri heilsugæslustöð sem er ekki með þjónustuna. Ef þínar tölur breytast en þeirra ekki yfir sömu mánuði er þjónustan líklegasta skýringin.",
    summary: "Sömu mælingar gerðar á sambærilegri stöð sem er ekki enn komin með þjónustuna.",
    claim: "Starfsemin breyttist á okkar stöð en ekki á sambærilegri stöð yfir sama tímabil.",
    requires: [
      "Sambærileg stöð án þjónustunnar",
      "Sömu mánaðartölum safnað þar allan tímann",
      "Samþykki stofnunarinnar fyrir að afhenda hvort tveggja",
    ],
    threats: [
      "Engar tvær heilsugæslustöðvar eru í raun eins. Stærð, mönnun og samsetning sjúklinga eru ólík.",
      "Fréttir berast. Í svona litlu landi geta sjúklingar á samanburðarstöðinni frétt af þjónustunni og notað hana samt. Það gerir samanburðinn óskýrari.",
    ],
    cost: "Stofnunin afhendir sömu mánaðartölur fyrir eina stöð í viðbót. Engin vinna á samanburðarstöðinni sjálfri.",
    strength: 3,
    decideBy: "Áður en sú stöð fær þjónustuna. Daginn sem hún fær hana hættir hún að vera samanburðarstöð. Það er klukkan sem raunverulega tifar.",
  },
  {
    id: "stepped-wedge",
    name: "Þrepaskipt innleiðing (stepped wedge)",
    plainName: "Opna eina stöð í einu, hver ber sig saman við hinar",
    whatYouDo:
      "Stöðvarnar hefja þjónustu í fyrir fram ákveðinni röð. Þar til röðin kemur að henni er hver stöð sem ekki er byrjuð samanburður fyrir þær sem eru byrjaðar. Sama breytingin þarf því að koma fram á hverri stöð, á ólíkum árstíma.",
    summary: "Stöðvar hefja þjónustu ein í einu í fyrir fram ákveðinni röð. Hver þeirra er samanburðarstöð fyrir hinar þar til röðin kemur að henni.",
    claim: "Sama breyting fylgdi þjónustunni á hverri stöð fyrir sig, á ólíkum tímum árs. Það útilokar allt sem gerðist á landsvísu.",
    requires: [
      "Innleiðing í áföngum á fleiri en tveimur stöðvum. Það er þegar áætlunin.",
      "Mánaðartölum safnað á öllum stöðvum frá því áður en fyrsta stöðin hóf þjónustu",
      "Upphafsdagar skráðir nákvæmlega",
    ],
    threats: [
      "Þarf fleiri en tvær stöðvar og nógu marga mánuði. Með tveimur er þetta einfaldlega kosturinn hér á undan.",
      "Fréttir berast milli stöðva innan sömu stofnunar.",
      "Síðari stöðvar fá betri útgáfu af þjónustunni, því þú lærðir af þeim fyrri. Áhrifin geta því vaxið eftir því sem á líður. Það er rétt að segja frá þessu frekar en fela það: þetta eru rök með innleiðingu, ekki á móti.",
    ],
    cost:
      "Að safna sömu mánaðartölum á stöðvum áður en þær fá þjónustuna. Það er ein lína í beiðni sem þú sendir hvort eð er, og innleiðingin er í áföngum hvort sem er.",
    strength: 4,
    decideBy:
      "Áður en önnur stöðin hefur þjónustu. Þjónustan hófst í Vestmannaeyjum 17. ágúst 2026 og engin önnur stöð er byrjuð, svo þetta er enn að fullu í boði. En hver stöð sem opnar tekur burt einn samanburð.",
  },
];

export const DESIGN_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d])) as Record<DesignId, Design>;

// ── Cohort ──────────────────────────────────────────────────────────────────
//
// Who counts as "in" is currently implicit, and different answers give
// materially different resolution rates. It has to be stated once and then
// never quietly changed.

export type CohortId = "offered" | "entered" | "reached-clinician";

export type Cohort = {
  id: CohortId;
  name: string;
  definition: string;
  /** Why you might choose it. */
  argument: string;
  /** Why you might not. */
  problem: string;
  measurable: boolean;
};

export const COHORTS: Cohort[] = [
  {
    id: "offered",
    name: "Allir sem var boðin þjónustan",
    definition: "Allir sjúklingar sem starfsmaður íhugaði að vísa til okkar, hvort sem þeir skiluðu sér eða ekki.",
    argument:
      "Eini nefnarinn sem svarar spurningunni sem stofnun spyr í raun: af erindunum sem koma til okkar, hve mörgum gætuð þið sinnt?",
    problem:
      "Ekki mælanlegt. Sjúklingar koma í þjónustuna eftir fjórum leiðum: beint, gegnum hjúkrunarfræðing, móttöku eða ritara. Enginn telur þá sem er vísað frá strax í upphafi. Tilraun til að telja þá gefur skekkta tölu sem sýnist nákvæm, og það er verra en engin tala.",
    measurable: false,
  },
  {
    id: "entered",
    name: "Allir sem hófu spurningalista",
    definition: "Allir sjúklingar sem opnuðu gáttina og sendu inn, líka þeir sem skimun fyrir rauðum flöggum stöðvaði.",
    argument:
      "Kemst næst því að vera þýði samkvæmt upphaflegri ætlan (intention-to-treat). Það tekur með fólkið sem þjónustan gat ekki hjálpað, og það er heiðarlegi nefnarinn fyrir fullyrðingu um öryggi.",
    problem:
      "Þynnir hlutfall afgreiddra erinda út með erindum sem áttu aldrei heima í þjónustunni. Lykiltalan vanmetur því árangurinn í því starfi sem þjónustan er hönnuð fyrir.",
    measurable: true,
  },
  {
    id: "reached-clinician",
    name: "Allir sem komust til læknis",
    definition: "Sjúklingar sem komust í gegnum skimun spurningalistans og fengu þjónustu læknis.",
    argument:
      "Mælir þjónustuna á því starfi sem hún er hönnuð fyrir. Passar við hvernig klínískir lesendur lesa hlutfall afgreiddra erinda.",
    problem:
      "Sleppir þeim sem skimunin stöðvaði, svo alltaf verður að birta hlutfall stöðvaðra erinda með. Ein og sér er þetta hagstæðari talan og verður lesin þannig.",
    measurable: true,
  },
];

export const COHORT_BY_ID = Object.fromEntries(COHORTS.map((c) => [c.id, c])) as Record<CohortId, Cohort>;

// ── Decisions that have to be pre-specified ─────────────────────────────────

export type DecisionId =
  | "primary-outcome" | "run-in" | "season" | "analysis-plan" | "missing-data" | "small-cells";

export type Decision = {
  id: DecisionId;
  /** Plain heading. The technical name, where there is one, lives in `why`. */
  name: string;
  question: string;
  why: string;
  /** What happens if it is left until the data is in. */
  ifLate: string;
  /** Sensible default, offered rather than imposed. */
  suggestion: string;
  timeCritical: boolean;
};

export const DECISIONS: Decision[] = [
  {
    id: "primary-outcome",
    name: "Talan sem allt stendur og fellur með",
    question: "Ef þú mættir aðeins birta eina tölu, hver væri hún?",
    why:
      "Þetta kallast aðalendapunktur. Kerfið getur framleitt yfir fjörutíu tölur. Ef þú birtir þær allar og bendir á þá sem kom best út er matið orðið að veiðiferð, og allir sem þekkja fagið sjá það. Að nefna eina fyrir fram, skriflega, er ódýrasti trúverðugleiki sem þú færð.",
    ifLate:
      "Ef hún er valin eftir að gögnin liggja fyrir er hún ekki lengur niðurstaða. Allt annað verður aukaendapunktar og könnunargreining, hvort sem þú merkir það svo eða ekki.",
    suggestion:
      "Hlutfall erinda sem eru afgreidd í fjarþjónustu, innan umsaminna greiningarkóða. Það er grunnfullyrðingin, það er það sem stofnun spyr fyrst um og það er ekki háð því að aðrir afhendi gögn.",
    timeCritical: true,
  },
  {
    id: "run-in",
    name: "Fyrstu vikurnar",
    question: "Teljast fyrstu vikurnar á stöð með í aðalniðurstöðunni?",
    why:
      "Þetta kallast aðlögunartímabil. Fyrsti mánuðurinn á nýrri stöð er óvenjulegur í báðar áttir. Starfsfólk er enn að læra hvaða erindi eiga heima í þjónustunni og flestir sjúklingar vita ekki af henni. Ef hann er tekinn með dregur hann niðurstöðuna niður. Ef honum er sleppt án þess að það hafi verið ákveðið fyrir fram lítur það út eins og valið hafi verið það sem hentaði.",
    ifLate:
      "Ef þú ákveður að sleppa fyrstu sex vikunum eftir að hafa séð að þær komu illa út er ekki hægt að verja það, jafnvel þótt það sé rétt greiningarlega.",
    suggestion:
      "Sleppa fyrstu fjórum vikunum í aðalgreiningunni, birta alla tímaröðina með og setja regluna fram áður en fyrsta erindið berst.",
    timeCritical: true,
  },
  {
    id: "season",
    name: "Að veturinn fái ekki heiðurinn",
    question: "Hvernig tryggir þú að árstíðin vinni ekki verkið sem þjónustan átti að vinna?",
    why:
      "Þetta kallast árstíðasveiflur. Fjórir af ellefu erindaflokkum eru öndunarfærasýkingar eða aðrar sýkingar og sveiflast mikið eftir árstíðum. Tilraunaverkefni sem stendur frá ágúst til desember, borið saman við baseline frá janúar til maí, getur sýnt mikil áhrif sem eru eingöngu dagatalið.",
    ifLate:
      "Eftir á er ekkert hægt að gera nema setja fyrirvara við niðurstöðuna. Og fyrirvari er ekki leiðrétting.",
    suggestion:
      "Bera saman sömu almanaksmánuði, sem krefst að minnsta kosti tólf mánaða starfsemi. Eða biðja um tuttugu og fjögurra mánaða baseline, mánuð fyrir mánuð, svo árstíðamynstrið sjálft sé þekkt.",
    timeCritical: true,
  },
  {
    id: "analysis-plan",
    name: "Að skrifa áætlunina niður fyrst",
    question: "Hvað nákvæmlega ætlarðu að bera saman, og hvernig? Ákveðið áður en nokkur sér tölu.",
    why:
      "Þetta kallast greiningaráætlun. Dagsett skjal, skrifað áður en tölurnar eru til, er það eina sem skilur á milli mats og sögu sem er sögð eftir á. Það kostar eitt síðdegi, og það er það sem siðanefnd, fræðitímarit og matsaðili í útboði leita öll eftir.",
    ifLate:
      "Eftir á er engin leið að sýna að niðurstaðan hafi ekki mótað greininguna.",
    suggestion:
      "Tvær síður: rannsóknarsnið, rannsóknarþýði, aðalendapunktur og aukaendapunktar, hvernig samanburðurinn er gerður og hvernig farið er með mánuði sem vantar. Dagsettu skjalið og hladdu því upp hér.",
    timeCritical: true,
  },
  {
    id: "missing-data",
    name: "Þegar mánuð vantar",
    question: "Hvað gerir þú þegar útdráttur mistekst eða HSU sendir ekki tölurnar sínar?",
    why:
      "Það mun gerast. Ef reglan er búin til á staðnum verður hún búin til í þá átt sem hentar þeim mánuði.",
    ifLate: "Ekki er hægt að greina bil sem var fyllt eftir á frá bili sem var fyllt eftir smekk.",
    suggestion:
      "Sleppa mánuðinum frekar en að áætla gildi fyrir hann, tilgreina fjölda mánaða sem vantar í hverri skýrslu og aldrei flytja tölu áfram úr fyrri mánuði.",
    timeCritical: false,
  },
  {
    id: "small-cells",
    name: "Tölur sem eru of litlar til að birta",
    question: "Hverju er haldið eftir í öllu sem fer út fyrir stofnunina?",
    why:
      "Erindaflokkur með þremur erindum á stöð með fjögur þúsund íbúa getur gert einstakling persónugreinanlegan. Og hlutfall sem er reiknað af þremur erindum segir hvort eð er ekkert.",
    ifLate: "Minni skaði en af hinum, en regla sem er beitt misjafnlega milli skýrslna er vandamál út af fyrir sig.",
    suggestion:
      "Tölur undir fimm eru ekki birtar, eða þeim er slegið saman. Mælaborðið sýnir þau hlutföll nú þegar í gráu til áminningar.",
    timeCritical: false,
  },
];

// ── Site roles ──────────────────────────────────────────────────────────────
//
// A station is not simply on or off. A station that has not gone live yet is a
// CONTROL, and it is only a control while that remains true — which is why the
// data has to start flowing before it gets the service, not after.

export type SiteRole = "live" | "pre-live" | "excluded";

export const SITE_ROLES: { id: SiteRole; name: string; note: string }[] = [
  { id: "live", name: "Þjónusta hafin", note: "Þjónustan er í gangi. Leggur til gögn um áhrif þjónustunnar." },
  {
    id: "pre-live",
    name: "Samanburðarstöð (ekki byrjuð)",
    note:
      "Þjónustan er ekki hafin. Leggur til baseline og samanburðargögn, en aðeins meðan hún er ekki byrjuð. Þess vegna þarf gagnasöfnun að hefjast núna.",
  },
  { id: "excluded", name: "Ekki með", note: "Engum gögnum safnað." },
];

export type SiteConfig = { role: SiteRole; goLive?: string; note?: string };

export type DesignState = {
  design: DesignId;
  cohort: CohortId;
  /**
   * Decision id → what was decided, and when.
   *
   * A decision can be cleared or edited — you have to be able to fix a typo or
   * change your mind. But an edit records `revisedAt` alongside the original
   * date and both are shown, because the entire value of deciding in advance
   * is lost if the text can be quietly rewritten once the numbers are in.
   * Clearing it removes the entry outright, which reads honestly as "not
   * decided" rather than as a decision that was never made.
   */
  decisions: Record<string, { text: string; decidedAt?: string; revisedAt?: string }>;
  sites: Record<string, SiteConfig>;
  /** Months of monthly baseline requested from the institution. */
  baselineMonths: number;
};

export const DEFAULT_DESIGN_STATE: DesignState = {
  design: "before-after",
  cohort: "reached-clinician",
  decisions: {},
  sites: {},
  baselineMonths: 12,
};

// ── Feasibility ─────────────────────────────────────────────────────────────

export type DesignCheck = { ok: boolean; label: string; detail: string };

/**
 * Whether the chosen design is actually supported by what is being collected.
 *
 * Deliberately blunt. A design chosen in the interface but not backed by data
 * is worse than no design at all, because it will be described in a report as
 * though it were real.
 */
export function feasibility(state: DesignState, opts: { preLiveWithData: number; monthsOfData: number }): DesignCheck[] {
  const live = Object.values(state.sites).filter((s) => s.role === "live").length;
  const preLive = Object.values(state.sites).filter((s) => s.role === "pre-live").length;
  const goLives = Object.values(state.sites).filter((s) => s.role === "live" && s.goLive).length;

  const checks: DesignCheck[] = [
    {
      ok: state.baselineMonths >= 8,
      label: `HSU beðin um ${state.baselineMonths} ${pl(state.baselineMonths, "mánuð", "mánuði")} af baseline, mánuð fyrir mánuð`,
      detail:
        state.baselineMonths >= 8
          ? "Nógu margir stakir mánuðir áður en þjónustan hófst til að sjá hvert þróunin stefndi. Þá geturðu greint áhrif þjónustunnar frá breytingu sem hefði orðið hvort sem er."
          : "Biddu um tölurnar mánuð fyrir mánuð, ekki sem eina heildartölu fyrir árið. Með árið í einni tölu geturðu bara sagt „þetta var X áður og Y á eftir“. Með mánaðartölum sérðu hvort tölurnar voru þegar á hreyfingu áður en þjónustan kom. Átta mánuðir eru lágmark, tólf eru þægilegt. Gögnin eru í Sögu hvort sem er. Þetta snýst bara um hvernig þú biður um þau.",
    },
    {
      ok: goLives === live && live > 0,
      label: `Upphafsdagur skráður fyrir ${goLives} af ${live} ${pl(live, "stöð", "stöðvum")} þar sem þjónusta er hafin`,
      detail:
        goLives === live && live > 0
          ? "Þú veist nákvæmlega hvenær þjónustan hófst á hverri stöð. Allt er mælt út frá þeim degi."
          : "Allur samanburður hér er „fyrir þennan dag“ á móti „eftir þennan dag“. Án nákvæms upphafsdags á stöð er ekkert til að bera saman.",
    },
    {
      ok: preLive > 0,
      label: `${preLive} ${pl(preLive, "stöð merkt sem samanburðarstöð", "stöðvar merktar sem samanburðarstöðvar")}`,
      detail:
        preLive > 0
          ? "Stöðvar án þjónustunnar eru samanburður. Ef þínar tölur breytast en þeirra ekki er þjónustan líklegasta skýringin."
          : "Án samanburðar er allt sem breyttist á landsvísu á árinu þakkað þjónustunni. Merktu þær stöðvar HSU sem eru ekki byrjaðar. Þær eru samanburðarhópurinn þinn, og hver þeirra dettur út daginn sem hún fær þjónustuna.",
    },
    {
      ok: opts.preLiveWithData > 0,
      label: `${opts.preLiveWithData} ${pl(opts.preLiveWithData, "samanburðarstöð sendir", "samanburðarstöðvar senda")} í raun tölur`,
      detail:
        opts.preLiveWithData > 0
          ? "Samanburðartölur eru að berast, ekki bara á áætlun."
          : "Það gerir ekkert eitt og sér að merkja stöð sem samanburðarstöð. HSU þarf líka að senda þér mánaðartölur fyrir þá stöð. Annars er ekkert til að bera saman við.",
    },
    {
      ok: opts.monthsOfData >= 12,
      label: `${opts.monthsOfData} ${pl(opts.monthsOfData, "mánuður", "mánuðir")} af eigin tölum hingað til`,
      detail:
        opts.monthsOfData >= 12
          ? "Heilt ár, svo þú getur borið september saman við september en ekki september við mars. Það skiptir máli, því fjórir erindaflokkar eru miklu algengari á veturna."
          : "Á styttri tíma en ári berðu saman ólíkar árstíðir, og veturinn getur unnið verkið sem þjónustan átti að vinna. Fjórir af ellefu erindaflokkum sveiflast mikið eftir árstíðum.",
    },
    {
      ok: !!state.decisions["primary-outcome"]?.text,
      label: "Búið að velja töluna sem allt stendur og fellur með",
      detail: state.decisions["primary-outcome"]?.text
        ? "Nefnd fyrir fram, svo allt annað er opinberlega aukaniðurstaða."
        : "Kerfið getur framleitt yfir fjörutíu tölur. Ef þú ákveður eftir á hver þeirra skipti máli velurðu, í fullri einlægni, þá sem kom vel út. Allir sem þekkja fagið sjá það. Að nefna eina núna kostar ekkert og er ódýrasti trúverðugleiki sem til er.",
    },
    {
      ok: !!state.decisions["analysis-plan"]?.text,
      label: "Búið að skrifa niður hvað verður borið saman, áður en litið er á tölur",
      detail: state.decisions["analysis-plan"]?.text
        ? "Skrifað og dagsett áður en tölurnar bárust. Enginn getur því haldið fram að samanburðurinn hafi verið valinn til að passa við niðurstöðuna."
        : "Um tvær síður, dagsettar: hvaða tölur þú berð saman við hverjar, yfir hvaða mánuði, og hvað þú gerir ef mánuð vantar. Ef þú skrifar þetta áður en þú sérð tölur velurðu ekki, alveg ómeðvitað, þann samanburð sem lítur best út. Þetta er líka fyrsta skjalið sem siðanefnd eða matsaðili í útboði biður um.",
    },
  ];

  return checks;
}

/** The best design the current setup could actually support. Shown next to the
 *  chosen one, because the interesting case is when they differ. */
export function supportedDesign(state: DesignState, opts: { preLiveWithData: number }): DesignId {
  const live = Object.values(state.sites).filter((s) => s.role === "live" && s.goLive).length;
  const monthly = state.baselineMonths >= 8;
  if (live >= 3 && opts.preLiveWithData > 0 && monthly) return "stepped-wedge";
  if (opts.preLiveWithData > 0) return "controlled";
  if (monthly && live >= 1) return "its";
  return "before-after";
}

// ── The module ──────────────────────────────────────────────────────────────

export const DESIGN_MODULE: Module = {
  id: "study-design",
  name: "Rannsóknarsnið",
  question: "Hvers konar gögn eru þetta og hvaða ályktanir má draga af þeim?",
  claim: "Þrepaskipt innleiðing (stepped wedge) með greiningu á rofinni tímaröð (interrupted time series) yfir innleiðinguna hjá HSU. Ákveðið fyrir fram, dagsett og leiðrétt fyrir undirliggjandi þróun.",
  category: "system",
  // Filed under effectiveness for the library only. `meta` keeps it off the
  // results dashboard: the design is a property of the whole evaluation, not a
  // measure of the service, and as an outcome card it displaced the resolution
  // rate — which is the one claim that category exists to make.
  meta: true,
  benefit: "Ákveður fyrir fram hvað tölurnar þínar mega þýða, í stað þess að komast að því eftir á að þær þýða minna en þú vonaðir.",
  horizon: "now",
  core: true,
  effort: "low",
  sources: ["institution", "internal"],
  rationale:
    "Án tilgreinds rannsóknarsniðs lendir verkefnið sjálfkrafa í veikasta sniðinu: samanburði fyrir og eftir á einni stöð, án samanburðarhóps. Þá fylgja með undirliggjandi þróun, árstíðasveiflur og aðhvarf að meðaltali, án þess að nokkur taki eftir því. Úrbótin er nánast ókeypis og er í tveimur hlutum. Báðir þurfa að gerast áður en gögnin berast. Biddu um baseline mánuð fyrir mánuð, ekki sem heildartölu fyrir árið. Og byrjaðu að safna sömu tölum á stöðvum sem eru ekki byrjaðar. Innleiðing í áföngum er í raun þrepaskipt innleiðing sem bíður eftir að verða að veruleika: síðari stöðvar eru samanburður fyrir þær fyrri, á sama tíma. Það útilokar allt sem breyttist á landsvísu á því ári. Hvorugt er hægt að gera eftir á.",
  caveat:
    "Rannsóknarsnið sem er valið í viðmóti er ekki rannsóknarsnið. Það heldur aðeins ef gögnin að baki því berast í raun. Þess vegna gerir raunhæfismatið skýran greinarmun á stöð sem er merkt sem samanburðarstöð og stöð sem sendir í raun tölur.",
  protocol: [
    {
      text: "Biddu stofnunina um baseline MÁNUÐ FYRIR MÁNUÐ, ekki sem heildartölu fyrir árið",
      detail:
        "Sama beiðni, sama velvild, sama vinna. Mánaðarleg tímaröð gerir greiningu á rofinni tímaröð mögulega, og hún greinir áhrif þjónustunnar frá þróun sem var þegar í gangi. Ein heildartala leyfir ekkert umfram einfaldan samanburð fyrir og eftir. Átta mánuðir eru raunhæft lágmark, tólf eru þægilegt og tuttugu og fjórir sýna líka árstíðamynstrið.",
      timeCritical: true,
    },
    {
      text: "Byrjaðu að safna sömu mánaðartölum á stöðvum sem eru ekki byrjaðar",
      detail:
        "Þetta er skrefið sem rennur út. Stöð er aðeins samanburðarstöð meðan hún er ekki með þjónustuna, og innleiðingin er hvort sem er í áföngum. Þrepaskipt innleiðing kostar því eina línu í tölvupósti í dag. En hún er úr sögunni um leið og önnur stöðin hefur þjónustu.",
      timeCritical: true,
    },
    {
      text: "Skráðu nákvæman upphafsdag fyrir hverja stöð",
      detail: "Án dagsetts upphafs er ekkert rof til að greina og engin þrep til að bera saman.",
      timeCritical: true,
    },
    {
      text: "Tilgreindu aðalendapunktinn skriflega, áður en nokkur gögn berast",
      detail:
        "Fjörutíu mælikvarðar án tilgreinds aðalendapunkts eru veiðiferð. Endapunktur sem er valinn eftir á er ekki niðurstaða, sama hve vel hann lítur út.",
      timeCritical: true,
    },
    {
      text: "Skrifaðu tveggja síðna greiningaráætlun og dagsettu hana",
      detail: "Rannsóknarsnið, rannsóknarþýði, aðal- og aukaendapunktar, hvernig samanburður er gerður og hvernig farið er með mánuði sem vantar. Hladdu henni upp hér.",
      timeCritical: true,
    },
    {
      text: "Ákveddu fyrir fram reglu um aðlögunartímabil og hvaða mánuði á að bera saman vegna árstíðasveiflna",
      detail: "Ef þú sleppir slæmum fyrsta mánuði eftir að hafa séð hann er ekki hægt að verja það, jafnvel þótt það sé rétt greiningarlega.",
      timeCritical: true,
    },
  ],
  fields: [],
  documents: [
    {
      id: "protocol",
      name: "Verklýsing og greiningaráætlun",
      why:
        "Dagsett áður en gögnin eru til. Þetta eina skjal er það sem siðanefnd, fræðitímarit og matsaðili í útboði leita öll eftir. Það skilur á milli mats og sögu sem er sögð eftir á.",
      required: true,
    },
    {
      id: "baseline-series",
      name: "Baseline, mánuð fyrir mánuð",
      why: "Mánaðartölur stofnunarinnar fyrir tímabilið áður en þjónustan hófst, fyrir hverja stöð. Þær gera greiningu á rofinni tímaröð mögulega.",
      required: true,
    },
  ],
  metrics: [
    {
      id: "design_strength",
      name: "Rannsóknarsnið",
      headline: true,
      why:
        "Hvaða ályktanir matið má draga. Allt annað í kerfinu framleiðir tölur. Þetta ákveður hvað þær þýða.",
      compute: ({ design }) => {
        if (!design) return { value: null, detail: "Valið og athugað í skrefinu um rannsóknarsnið", missing: "Ákvarðanir um rannsóknarsnið skráðar" };
        const chosen = DESIGN_BY_ID[design.design];
        const preLive = Object.values(design.sites).filter((x) => x.role === "pre-live").length;
        const best = supportedDesign(design, { preLiveWithData: preLive });
        const gap = DESIGNS.findIndex((d) => d.id === best) < DESIGNS.findIndex((d) => d.id === design.design);
        return {
          value: chosen.name,
          // The interesting case is when the chosen design is stronger than the
          // data supports — that is a claim the evaluation cannot back.
          detail: gap
            ? `Valið, en gögnin styðja nú aðeins þetta snið: ${DESIGN_BY_ID[best].name.toLowerCase()}`
            : `${COHORT_BY_ID[design.cohort].name.toLowerCase()} · ${design.baselineMonths} ${pl(design.baselineMonths, "mánaðar", "mánaða")} baseline, mánuð fyrir mánuð`,
          status: gap ? "poor" : chosen.strength >= 3 ? "good" : chosen.strength === 2 ? "fair" : "poor",
          assumption: gap
            ? "Rannsóknarsnið sem er valið í viðmóti er ekki rannsóknarsnið. Annaðhvort safnarðu því sem það þarf eða birtir veikara sniðið."
            : undefined,
        };
      },
    },
  ],
};

/** Diagnosis codes before and after go-live for one station, or for every
 *  live station from the earliest go-live. Takes every month, not the
 *  selected window — the baseline is the point of the comparison. */
export function codesFor(rows: MonthRow[], station: string, state: DesignState): CodeVolume {
  const live = Object.entries(state.sites).filter(([, x]) => x.role === "live" && x.goLive);
  const goLive = station === "__all"
    ? live.map(([, x]) => x.goLive!).sort()[0]
    : state.sites[station]?.goLive;
  const scoped = station === "__all"
    ? rows.filter((r) => live.some(([name]) => name === r.station))
    : rows.filter((r) => r.station === station);
  return codeVolume(scoped, goLive, state.baselineMonths);
}

/**
 * Whether a monthly row belongs to the service's own figures ("after").
 *
 * Baseline months carry only HSU's count from Saga and belong to the
 * comparison, not to the totals — before this, a twelve-month window that
 * reached back past go-live mixed "before" rows into "after" figures. A
 * station that is not live (a control) never counts. Rows for a station the
 * design does not know (e.g. survey answers without a station) count from
 * the earliest go-live. With no go-live recorded anywhere nothing is
 * filtered, so an unconfigured design still shows its data.
 */
export function isPilotRow(r: MonthRow, state: DesignState): boolean {
  const goLives = Object.values(state.sites).filter((s) => s.role === "live" && s.goLive).map((s) => s.goLive!).sort();
  if (!goLives.length) return true;
  const month = r.month.slice(0, 7);
  const own = state.sites[r.station];
  if (own) return own.role === "live" && !!own.goLive && month >= own.goLive.slice(0, 7);
  return month >= goLives[0].slice(0, 7);
}
