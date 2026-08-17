// Editable content model for the Fjarlækningar × HSU print collateral.
//
// The collateral is a DYNAMIC LIST of A4 documents (docs.tsx renders each from
// its fields). Each document has a layout `type` (poster / referral / advert),
// an editable tab name + tagline, and per-document sharing (web address +
// portal link; the QR encodes the portal link). Documents can be
// duplicated, deleted and reordered in the studio (page.tsx / CollateralStudio).
// Persisted as one JSONB blob in a single-row Supabase table.

export type Step = { title: string; body: string };
export type Service = { icon: string; label: string };
export type Safety = { bold: string; text: string };
export type AfterItem = { k: string; bold: string; text: string; icon?: string };

export type DocType = "poster" | "referral" | "advert" | "lifelinecheck";

// Vendor-provisioned portal address. Kept verbatim: it is where patients
// actually land, so it is a real URL rather than a brand reference.
export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";

// Sheet the poster is printed on. A4 is the reception hand-out; the rest are
// standard Nordic frame sizes, for a poster someone hangs on a wall. Framed
// sizes keep the A4 artwork exactly as designed and scale it into the sheet,
// leaving a wide white mat — `margin` is the SMALLEST white edge in mm; the
// axis that doesn't bind gets more, because the aspect ratios differ from A4.
export type PosterFrame = "a4" | "a4print" | "30x40" | "40x50" | "50x60";

export const POSTER_FRAMES: Record<PosterFrame, { label: string; w: number; h: number; margin: number }> = {
  a4: { label: "A4 — stafrænt (heilflötur)", w: 210, h: 297, margin: 0 },
  a4print: { label: "A4 — til prentunar (spássía)", w: 210, h: 297, margin: 12 },
  "30x40": { label: "Rammi 30×40 cm", w: 300, h: 400, margin: 26 },
  "40x50": { label: "Rammi 40×50 cm", w: 400, h: 500, margin: 34 },
  "50x60": { label: "Rammi 50×60 cm", w: 500, h: 600, margin: 44 },
};

// White the artwork itself carries at its top and bottom edge, in A4 mm. The
// hero header bleeds to the top edge (no white); the veggspjald header opens
// with an 11mm white strip. Both close with a 10mm footer padding.
const ART_EDGE_WHITE = {
  hero: { top: 0, bottom: 10 },
  poster: { top: 11, bottom: 10 },
};

/**
 * Sheet, scale and vertical nudge for a frame. Centring the artwork BOX is not
 * the same as centring what you see: the artwork's own top and bottom white
 * differ, so on a big sheet that gap is magnified (17mm at 50×60 with the hero
 * header). `shiftY` moves the artwork so the INK sits optically centred.
 */
/** A stored frame that no longer exists (a retired size) falls back to A4. */
export function normalizeFrame(frame: string | undefined): PosterFrame {
  return frame && frame in POSTER_FRAMES ? (frame as PosterFrame) : "a4";
}

export function frameGeometry(frame: PosterFrame | undefined, headerLayout: "hero" | "poster" = "poster") {
  const key = normalizeFrame(frame);
  const f = POSTER_FRAMES[key];
  const scale = f.margin === 0 ? 1 : Math.min((f.w - 2 * f.margin) / 210, (f.h - 2 * f.margin) / 297);
  const edge = ART_EDGE_WHITE[headerLayout] ?? ART_EDGE_WHITE.poster;
  const framed = key !== "a4";
  return {
    ...f,
    scale,
    framed,
    shiftY: framed ? ((edge.bottom - edge.top) * scale) / 2 : 0,
  };
}

export type PosterFields = {
  badge: string;
  /** Print sheet — A4 by default, so existing saved posters are unaffected. */
  frame?: PosterFrame;
  // "poster" = logos on a white strip + inset hero; "hero" = full-bleed dark hero.
  headerLayout: "hero" | "poster";
  cobrandLines: "1" | "2" | "3";
  // On the "hero" header, frame the HSU logo with a white stroke.
  cobrandStroke: boolean;
  eyebrow: string;
  // Free-form heading: ==double equals== colours words blue; newlines break lines.
  heading: string;
  lead: string;
  servicesTitle: string;
  services: Service[];
  stepsTitle: string;
  steps: Step[];
  ctaLabel: string;
  url: string;
  portalUrl: string;
  footerNote: string;
  safety: Safety;
};

// Back side of the referral guide: the medication classes Fjarlækningar does
// not renew. A category (A–D) holds groups; an item line reads
// "Virka efnið: sérlyfjaheiti" — the part before the colon is bolded on print.
export type MedGroup = { title: string; items: string[] };
export type MedCategory = {
  key: string;              // A / B / C / D badge
  title: string;
  tone?: "warn" | "info";   // warn = ávanabindandi (magenta), info = eftirlit (blue)
  groups: MedGroup[];
};

export type ReferralFields = {
  badge: string;
  cobrandLabel: string;
  cobrandLines: "1" | "2" | "3";
  eyebrow: string;
  heading: string;
  headingAccent: string;
  intro: string;
  yesTitle: string;
  yes: string[];
  noTitle: string;
  no: string[];
  referTitle: string;
  referSteps: Step[];
  afterTitle: string;
  after: AfterItem[];
  shareTitle: string;
  url: string;
  portalUrl: string;
  safety: Safety;
  contactLabel: string;
  contactEmail: string;
  // ── back side (page 2) — medication exclusion list ─────────────────────
  medsEnabled: boolean;
  medsEyebrow: string;
  medsHeading: string;
  medsHeadingAccent: string;
  medsIntro: string;
  medsCategories: MedCategory[];
  medsFooter: string;
};

export type AdvertFields = {
  badge: string;
  cobrandLabel: string;
  // "poster" = veggspjald-style header (logos on a white strip, inset hero);
  // "hero"   = full-bleed dark hero with the logos inside it.
  headerLayout: "hero" | "poster";
  cobrandLines: "1" | "2" | "3";
  // On the "hero" header, frame the HSU logo with a white stroke.
  cobrandStroke: boolean;
  headingA: string;
  headingAccent: string;
  lead: string;
  servicesTitle: string;
  services: Service[];
  steps: Step[];
  ctaLabel: string;
  url: string;
  portalUrl: string;
  partnerNote: string;
  safety: Safety;
};

export type Benefit = { icon: string; label: string; detail?: string };

// Lifeline × Lyfja health-check poster (own brand: emerald + Lyfja co-brand).
export type LifelineFields = {
  cobrandLabel: string;
  eyebrow: string;
  heading: string;   // ==double equals== accents in emerald; newlines break lines
  lead: string;
  benefitsTitle: string;
  benefits: Benefit[];
  whyTitle: string;
  why: string;
  stepsTitle: string;
  steps: Step[];
  ctaHeading: string;
  ctaLabel: string;
  url: string;
  portalUrl: string;
  footerNote: string;
};

export type Doc =
  | { id: string; type: "poster"; name: string; sub: string; poster: PosterFields }
  | { id: string; type: "referral"; name: string; sub: string; referral: ReferralFields }
  | { id: string; type: "advert"; name: string; sub: string; advert: AdvertFields }
  | { id: string; type: "lifelinecheck"; name: string; sub: string; lifeline: LifelineFields };

export type ArchivedDoc = Doc & { archivedAt?: string };
export type CollateralContent = { docs: Doc[]; archived?: ArchivedDoc[] };

// The nine services from the portal menu „Hvernig getum við aðstoðað þig?“.
// `icon` maps to /public/fjarlaekningar-icons/portal/<icon>.png — the fixed set.
export const SERVICE_ICONS = [
  "kvef-hosti-halsbolga",
  "thvagfaera-leggangasykingar",
  "frunsa",
  "ristill",
  "frjokornaofnaemi",
  "getnadarvorn",
  "risvandamal",
  "njalgur",
  "lyfjuendurnyjun",
] as const;

const DEFAULT_SERVICES: Service[] = [
  { icon: "kvef-hosti-halsbolga", label: "Kvef, hósti og hálsbólga" },
  { icon: "thvagfaera-leggangasykingar", label: "Þvagfæra- og leggangasýkingar" },
  { icon: "getnadarvorn", label: "Getnaðarvörn" },
  { icon: "frjokornaofnaemi", label: "Frjókornaofnæmi" },
  { icon: "frunsa", label: "Frunsa" },
  { icon: "ristill", label: "Ristill" },
  { icon: "risvandamal", label: "Risvandamál" },
  { icon: "njalgur", label: "Njálgur" },
  { icon: "lyfjuendurnyjun", label: "Lyfjaendurnýjun" },
];

// ── Default field sets (team-reviewed HSN presentation language) ──────────
export const DEFAULT_POSTER: PosterFields = {
  badge: "Í samstarfi við HSU",
  frame: "a4",
  headerLayout: "poster",
  cobrandLines: "2",
  cobrandStroke: true,
  eyebrow: "Íslensk fjarlækningaþjónusta",
  heading: "Þarftu að hitta lækni?\nÞú getur gert það ==þar sem þú ert.==",
  lead: "Fjarlækningar leysa einföld og afmörkuð erindi. Þú svarar stuttum spurningalista og læknir metur málið og leggur til meðferð — sama þjónusta og á læknastofu, en skilvirkari leið og styttri biðlistar.",
  servicesTitle: "Við getum meðal annars aðstoðað með:",
  services: DEFAULT_SERVICES,
  stepsTitle: "Svona virkar það",
  steps: [
    { title: "Skráðu þig inn", body: "Á fjarlaekningar.is með rafrænum skilríkjum — í tölvu eða síma." },
    { title: "Veldu vandamál", body: "Svaraðu markvissum spurningalista um einkennin þín." },
    { title: "Fáðu meðferð", body: "Læknir metur og leggur til meðferð. Lyfseðill fer rafrænt í lyfjagátt." },
  ],
  ctaLabel: "Byrjaðu hér",
  url: "fjarlaekningar.is",
  portalUrl: PORTAL_URL,
  footerNote: "Svar innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22.",
  safety: { bold: "Neyðartilfelli?", text: " Hringdu í 112 eða leitaðu á bráðamóttöku." },
};

// Medication classes that are never renewed through the telemedicine service:
// controlled substances, addiction maintenance, drugs requiring blood
// monitoring, and specialist-only prescriptions. Clinician-facing, so the
// listing keeps both the active substance and the Icelandic brand names.
export const DEFAULT_MED_CATEGORIES: MedCategory[] = [
  {
    key: "A",
    title: "Eftirritunarskyld lyf",
    tone: "warn",
    groups: [
      {
        title: "Ópíóíðar og sterk verkjalyf",
        items: [
          "Morfín: Contalgin, Morfin",
          "Oxýkódon: OxyContin, OxyNorm, Targin (oxýkódon + naloxon)",
          "Ketóbemídón: Ketogan",
          "Fentanýl-plástrar: Durogesic, Matrifen, Fentanyl",
          "Tapentadól: Palexia",
          "Petidín og metadon (sjá einnig flokk B)",
          "Tramadól: Tradolan, Nobligan, Tramadol — veikur ópíóíði en ávanabindandi",
        ],
      },
      {
        title: "Kódeín-samsett lyf",
        items: [
          "Parkódín og Parkódín forte (parasetamól + kódeín)",
          "Kódímagnýl (asetýlsalisýlsýra + kódeín)",
        ],
      },
      {
        title: "Benzódíazepín",
        items: [
          "Díazepam: Stesolid, Diazepam",
          "Oxazepam: Sobril",
          "Klónazepam: Rivotril",
          "Alprazólam: Xanax, Tafil, Alprazolam",
          "Lorazepam: Lorazepam, Temesta",
          "Midazólam: Dormicum, Midazolam",
        ],
      },
      {
        title: "Svefnlyf — Z-lyf (benzódíazepínskyld)",
        items: [
          "Zópíklón: Imovane, Zopiclone, Imozop",
          "Zolpidem: Stilnoct, Zolpidem",
        ],
      },
      {
        title: "Örvandi lyf og ADHD-lyf",
        items: [
          "Metýlfenídat: Ritalin, Concerta, Medikinet, Equasym",
          "Lísdexamfetamín: Elvanse",
          "Dexamfetamín: Attentin",
        ],
      },
      {
        title: "Gabapentínóíð — vaxandi misnotkun, oft samhliða ópíóíðum",
        items: [
          "Pregabalín: Lyrica, Pregabalin",
          "Gabapentín: Neurontin, Gabapentin",
        ],
      },
      {
        title: "Barbitúröt — sjaldgæf en ávanabindandi",
        items: ["Fenóbarbital: Fenemal"],
      },
    ],
  },
  {
    key: "B",
    title: "Lyf við fíkn og viðhaldsmeðferð",
    tone: "warn",
    groups: [
      {
        title: "",
        items: [
          "Búprenorfín: Norspan (plástur), Subutex",
          "Búprenorfín + naloxón: Suboxone",
          "Metadon",
          "Naltrexón og disúlfíram (Antabus)",
        ],
      },
    ],
  },
  {
    key: "C",
    title: "Lyf sem þurfa eftirlit með blóðprufum",
    tone: "info",
    groups: [
      {
        title: "",
        items: [
          "Warfarín: Kóvar, Marevan",
          "Litíum — þarf reglulegar sermismælingar",
          "Klózapín: Leponex",
          "Metótrexat",
          "Ísótretínóín: Roaccutan",
          "DOAC-blóðþynningarlyf: Xarelto, Eliquis, Pradaxa",
        ],
      },
    ],
  },
  {
    key: "D",
    title: "Lyf sem einungis sérfræðingar ávísa",
    tone: "info",
    groups: [
      {
        title: "",
        items: [
          "Geðrofslyf",
          "Testósterón",
          "Krabbameinslyf, ónæmisbælandi lyf og líftæknilyf",
        ],
      },
    ],
  },
];

export const DEFAULT_REFERRAL: ReferralFields = {
  badge: "Innanhússleiðbeiningar",
  cobrandLabel: "Í samstarfi við HSU",
  cobrandLines: "2",
  eyebrow: "Fyrir heilbrigðisstarfsfólk HSU",
  heading: "Að vísa sjúklingi í ",
  headingAccent: "Fjarlækningar",
  intro: "Fjarlækningar er íslensk fjarlækningaþjónusta fyrir einföld og afmörkuð erindi, nú í tilraunasamstarfi til eins árs við Heilbrigðisstofnun Suðurlands. Sjúklingur svarar spurningalista sem sérhannaður er í samstarfi við íslenska sérfræðilækna, og læknir metur svörin og leggur til meðferð. Þjónustan léttir álagi af móttöku fyrir væg, algeng erindi og styttir biðlista.",
  yesTitle: "Hentar vel fyrir",
  yes: [
    "Kvef, hósti og hálsbólga",
    "Þvagfærasýkingar",
    "Sveppa- og bakteríusýkingar í leggöngum",
    "Frjókornaofnæmi",
    "Frunsa",
    "Ristill á húð",
    "Getnaðarvörn",
    "Njálgur",
    "Risvandamál",
    "Lyfjaendurnýjun",
    "Læknisvottorð tengt sinntu vandamáli",
  ],
  noTitle: "Vísaðu ekki í fjarþjónustu",
  no: [
    "Bráð eða alvarleg einkenni — hringdu í 112 eða Læknavaktina 1700",
    "Erindi sem krefjast skoðunar eða áþreifingar",
    "Frumgreining nýrra vandamála (metin og vísað í annan farveg)",
    "Ung börn og flókin fjölveikindi",
    "Óstöðugir langvinnir sjúkdómar",
  ],
  referTitle: "Hvernig þú vísar sjúklingi",
  referSteps: [
    { title: "Beindu á gáttina", body: "Bentu sjúklingi á fjarlaekningar.is — innskráning með rafrænum skilríkjum." },
    { title: "Sjúklingur velur erindi", body: "Velur vandamál af lista og svarar markvissum spurningalista um einkennin." },
    { title: "Læknir lýkur máli", body: "Fer yfir svörin, leggur til meðferð og gefur vottorð eða tilvísun eftir þörfum." },
  ],
  afterTitle: "Hvað gerist svo",
  after: [
    { k: "2h", icon: "clock", bold: "Innan tveggja klukkustunda.", text: " Læknir svarar erindum á opnunartíma, alla daga milli 10 og 22." },
    { k: "Rx", icon: "pill", bold: "Lyfseðill fer rafrænt í lyfjagátt", text: " og er tilbúinn í því apóteki sem sjúklingur velur." },
    { k: "←", icon: "undo", bold: "Tilvísun til baka.", text: " Þurfi sjúklingur skoðun eða frekari rannsókn vísar læknir aftur í hefðbundna þjónustu HSU." },
    { k: "lás", icon: "lock", bold: "Öruggt.", text: " Öll samskipti fara um sjúklingagátt Fjarlækninga — dulkóðuð og eingöngu aðgengileg sjúklingi og lækni." },
  ],
  shareTitle: "Þrjár leiðir til að deila þjónustunni með sjúklingi",
  url: "fjarlaekningar.is",
  portalUrl: PORTAL_URL,
  safety: { bold: "Neyðartilfelli:", text: " Fjarlækningar eru ekki fyrir bráðaþjónustu. Hringdu í 112 eða Læknavaktina 1700." },
  contactLabel: "Spurningar?",
  contactEmail: "info@fjarlaekningar.is",
  medsEnabled: true,
  medsEyebrow: "Bakhlið — fyrir heilbrigðisstarfsfólk HSU",
  medsHeading: "Lyf sem eru ",
  medsHeadingAccent: "ekki endurnýjuð hér",
  medsIntro: "Fjarlækningar endurnýja algeng viðhaldslyf við stöðugum, langvinnum sjúkdómum. Lyfin hér að neðan eru ekki endurnýjuð í fjarþjónustu — sjúklingi er vísað til heimilislæknis eða þess læknis sem ávísar lyfinu.",
  medsCategories: DEFAULT_MED_CATEGORIES,
  medsFooter: "Listinn er ekki tæmandi og mat læknis ræður alltaf. Óski sjúklingur eftir endurnýjun á lyfi úr þessum flokkum lýkur læknir erindinu með skýringu og vísar á rétta þjónustu.",
};

export const DEFAULT_ADVERT: AdvertFields = {
  badge: "Ný þjónusta á Íslandi",
  cobrandLabel: "Í samstarfi við HSU",
  headerLayout: "poster",
  cobrandLines: "2",
  cobrandStroke: true,
  headingA: "Læknishjálp —",
  headingAccent: "þar sem þú ert.",
  lead: "Þú svarar stuttum spurningalista og læknir metur málið og leggur til meðferð. Sama þjónusta og á læknastofu — svar innan tveggja klukkustunda á opnunartíma, án biðstofu og biðlista.",
  servicesTitle: "Við aðstoðum meðal annars með",
  services: DEFAULT_SERVICES,
  steps: [
    { title: "Skráðu þig inn", body: "Með rafrænum skilríkjum á fjarlaekningar.is." },
    { title: "Veldu vandamál", body: "Svaraðu markvissum spurningalista um einkennin." },
    { title: "Fáðu meðferð", body: "Læknir leggur til meðferð; lyfseðill fer rafrænt í lyfjagátt." },
  ],
  ctaLabel: "Byrjaðu í dag",
  url: "fjarlaekningar.is",
  portalUrl: PORTAL_URL,
  partnerNote: "Í tilraunasamstarfi til eins árs við Heilbrigðisstofnun Suðurlands (HSU).",
  safety: { bold: "Neyðartilfelli:", text: " Hringdu í 112. Fjarlækningar eru ekki ætlaðar fyrir bráðaþjónustu." },
};

export const DEFAULT_LIFELINE: LifelineFields = {
  cobrandLabel: "Í samstarfi við",
  eyebrow: "Heilsumat frá Lifeline",
  heading: "Taktu stöðuna á\n==heilsunni þinni.==",
  lead: "Ítarleg mæling á líkamssamsetningu og blóðþrýstingi, markviss blóðprufa og heilsumat yfirfarið af lækni með persónulegum ráðleggingum.",
  benefitsTitle: "Hvað færðu?",
  benefits: [
    { icon: "list", label: "Ítarleg heilsuskimun", detail: "Sérhæfður spurningalisti frá Lifeline Health" },
    { icon: "leaf", label: "Heildræn heilsa", detail: "Áhersla á svefn, hreyfingu, næringu og andlega vellíðan" },
    { icon: "body", label: "Líkamsmælingar", detail: "Líkamssamsetning (vöðvamassi, fituprósenta, vökvajafnvægi) og blóðþrýstingur" },
    { icon: "drop", label: "Blóðprufur", detail: "Til að meta efnaskiptaheilsu" },
    { icon: "stethoscope", label: "Læknisviðtal og heilsuplan", detail: "Læknir fer yfir skýrsluna og útbýr sérsniðið heilsuplan fyrir þig" },
    { icon: "calendar", label: "Eftirfylgni", detail: "Hvenær sem þér hentar" },
  ],
  whyTitle: "Af hverju Lifeline?",
  why: "Ólíkt hefðbundnum mælingum byggjum við á undirstöðum heilsunnar — svefni, næringu, hreyfingu og andlegri vellíðan — og styðjum þær með mælingum og blóðprufum. Læknir tengir allt saman, útskýrir kjarna málsins á mannamáli og útbýr markvissa aðgerðaáætlun sem skilar mestum árangri með minnstri fyrirhöfn.",
  stepsTitle: "Svona virkar það",
  steps: [
    { title: "Skannaðu og bókaðu", body: "Skannaðu QR-kóðann, skráðu þig inn með rafrænum skilríkjum og bókaðu tíma." },
    { title: "Komdu í mælingu", body: "Líkamssamsetning og blóðþrýstingur eru mæld hér í Lyfju." },
    { title: "Farðu í blóðprufu", body: "Einföld blóðprufa er tekin á næstu Sameind-stöð." },
    { title: "Fáðu heilsumatið", body: "Læknir yfirfer niðurstöður og þú færð persónulegt heilsumat og ráðleggingar." },
  ],
  ctaHeading: "Byrjaðu heilsuferðina í dag",
  ctaLabel: "Skannaðu til að byrja",
  url: "lifelinehealth.is",
  portalUrl: "https://app.medalia.is/7ca0ca21-8947-46cb-afbd-2e2d15efef6e",
  footerNote: "Mæling fer fram hér í Lyfju. Blóðprufa er tekin hjá Sameind.",
};

export const DEFAULT_CONTENT: CollateralContent = {
  docs: [
    { id: "poster", type: "poster", name: "Veggspjald", sub: "Fyrir móttöku HSU — fyrir sjúklinga", poster: DEFAULT_POSTER },
    { id: "referral", type: "referral", name: "Tilvísunarleiðbeiningar", sub: "A4 — fyrir heilbrigðisstarfsfólk", referral: DEFAULT_REFERRAL },
    { id: "advert", type: "advert", name: "Blaðaauglýsing", sub: "A4 — dagblaðsauglýsing", advert: DEFAULT_ADVERT },
  ],
};

// Return the default field set for a document layout type (used when adding a
// new document in the studio).
export function defaultDoc(type: DocType, id: string): Doc {
  if (type === "poster") return { id, type, name: "Veggspjald", sub: "A4", poster: DEFAULT_POSTER };
  if (type === "referral") return { id, type, name: "Tilvísunarleiðbeiningar", sub: "A4", referral: DEFAULT_REFERRAL };
  if (type === "lifelinecheck") return { id, type, name: "Lifeline × Lyfja", sub: "A4 — heilsufarsmat", lifeline: DEFAULT_LIFELINE };
  return { id, type: "advert", name: "Blaðaauglýsing", sub: "A4", advert: DEFAULT_ADVERT };
}

// Coerce a stored (possibly partial / legacy) blob into a valid CollateralContent.
// Understands both the new { docs: [...] } shape and the legacy
// { poster, referral, advert, docMeta, services } shape.
export function mergeContent(stored: unknown): CollateralContent {
  const s = (stored ?? {}) as Record<string, unknown>;

  const archived: ArchivedDoc[] = (Array.isArray(s.archived) ? (s.archived as Record<string, unknown>[]) : [])
    .map((d, i): ArchivedDoc | null => {
      const c = coerceDoc(d, i);
      if (!c) return null;
      return { ...c, archivedAt: typeof d?.archivedAt === "string" ? (d.archivedAt as string) : undefined };
    })
    .filter((d): d is ArchivedDoc => d !== null);

  if (Array.isArray(s.docs) && s.docs.length) {
    const docs = (s.docs as unknown[])
      .map((d, i) => coerceDoc(d, i))
      .filter((d): d is Doc => d !== null);
    if (docs.length) return { docs, archived };
  }

  // Legacy single-of-each shape → three docs.
  if (s.poster || s.referral || s.advert) {
    const dm = (s.docMeta ?? {}) as Record<string, { name?: string; sub?: string }>;
    const services = Array.isArray(s.services) && s.services.length ? (s.services as Service[]) : DEFAULT_SERVICES;
    return {
      docs: [
        { id: "poster", type: "poster", name: dm.poster?.name ?? "Veggspjald", sub: dm.poster?.sub ?? "", poster: { ...DEFAULT_POSTER, ...(s.poster as object ?? {}), services } },
        { id: "referral", type: "referral", name: dm.referral?.name ?? "Tilvísunarleiðbeiningar", sub: dm.referral?.sub ?? "", referral: { ...DEFAULT_REFERRAL, ...(s.referral as object ?? {}) } },
        { id: "advert", type: "advert", name: dm.advert?.name ?? "Blaðaauglýsing", sub: dm.advert?.sub ?? "", advert: { ...DEFAULT_ADVERT, ...(s.advert as object ?? {}), services } },
      ],
    };
  }

  return DEFAULT_CONTENT;
}

function coerceDoc(raw: unknown, i: number): Doc | null {
  const d = (raw ?? {}) as Record<string, unknown>;
  const type = d.type as DocType;
  const id = typeof d.id === "string" && d.id ? d.id : `doc-${i}`;
  const name = typeof d.name === "string" ? d.name : "";
  const sub = typeof d.sub === "string" ? d.sub : "";
  if (type === "poster") return { id, type, name: name || "Veggspjald", sub, poster: { ...DEFAULT_POSTER, ...(d.poster as object ?? {}) } };
  if (type === "referral") return { id, type, name: name || "Tilvísunarleiðbeiningar", sub, referral: { ...DEFAULT_REFERRAL, ...(d.referral as object ?? {}) } };
  if (type === "advert") return { id, type, name: name || "Blaðaauglýsing", sub, advert: { ...DEFAULT_ADVERT, ...(d.advert as object ?? {}) } };
  if (type === "lifelinecheck") return { id, type, name: name || "Lifeline × Lyfja", sub, lifeline: { ...DEFAULT_LIFELINE, ...(d.lifeline as object ?? {}) } };
  return null;
}
