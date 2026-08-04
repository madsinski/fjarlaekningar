// Editable content model for /um-okkur.
// Defaults are verbatim from the original hard-coded page.

import { emptyDefaults, type LocaleContent, type SiteField, type SiteSection } from "./types";
// Reorderable bands, in their built-in order. The hero/page header is not
// listed: it is structural and always renders first.
export const UM_OKKUR_SECTIONS: SiteSection[] = [
  { id: "faces", label: "Hópmynd" },
  { id: "pillars", label: "Stoðir" },
  { id: "values", label: "Gildin" },
  { id: "team", label: "Teymið" },
  { id: "cta", label: "Ákall (CTA)" },
];

// The group photo ("Hópmynd") and the team grid ("Teymið") are two takes on the
// same subject, so the page offers several arrangements and the CMS switches
// between them. Every combined arrangement merges the two bands into one, takes
// the "Hópmynd" slot in the section order, and makes the separate "Teymið" band
// disappear; they differ only in composition:
//
//   split    — the built-in behaviour: two separate bands, wherever they are
//              ordered, each with its own background.
//   overlap  — lead copy, the group photo as a wide banner, then a white panel
//              of portraits pulled up over the banner's lower edge.
//   panel    — the whole section inside one bordered white card, the same
//              idiom as the forsíða's samstarf card: copy and photo side by
//              side up top, a hairline, portraits below. The quietest option.
//   banner   — the copy set *on* the photo behind a scrim, with the team cards
//              on the band below it. The boldest, and the only place on the
//              site where a heading sits over an image.
export const TEAM_LAYOUTS = {
  split: "split",
  // "combined" (rather than "combined-overlap") is the value the first version
  // of this switch shipped with; renaming it would silently reset any page
  // already saved with it.
  overlap: "combined",
  panel: "combined-panel",
  banner: "combined-banner",
} as const;

export type TeamLayout = (typeof TEAM_LAYOUTS)[keyof typeof TEAM_LAYOUTS];

/** The stored layout, defaulting to split and tolerating an unknown value. */
export function teamLayout(c: LocaleContent): TeamLayout {
  const v = c.team_layout as TeamLayout;
  return Object.values(TEAM_LAYOUTS).includes(v) ? v : TEAM_LAYOUTS.split;
}

export function isCombinedTeam(c: LocaleContent): boolean {
  return teamLayout(c) !== TEAM_LAYOUTS.split;
}

/**
 * The sections that actually render for the given content. In combined mode the
 * two team bands merge, so only one of them is a real, movable section — the
 * CMS order list must show one entry, not two, or moving "Teymið" would appear
 * to do nothing.
 */
export function umOkkurSections(c: LocaleContent): SiteSection[] {
  if (!isCombinedTeam(c)) return UM_OKKUR_SECTIONS;
  return UM_OKKUR_SECTIONS.filter((s) => s.id !== "team").map((s) =>
    s.id === "faces" ? { ...s, label: "Teymið (hópmynd + fólk)" } : s,
  );
}

// Team members are a fixed set of numbered slots (like the pillars/values
// above), so the existing flat CMS pipeline handles them with no new machinery
// beyond the "image" field type. Name + photo are a single value each (a
// person's name and portrait don't change per language); role and flag are
// per-locale like any other copy.
//
// The slots are edited as a roster (add / duplicate / hide / delete / reorder)
// by a custom control in the admin — see `editor: "team-members"` below.
export const TEAM_MEMBER_SLOTS = 8;

/** The editor group the roster control renders after. */
export const TEAM_ROSTER_GROUP = "Teymið";

/**
 * How many slots are live.
 *
 * Deleting a member cannot simply blank its fields: an empty override means
 * "use the built-in default" everywhere else in this CMS, so a blanked slot
 * would resurrect the default member on the next render. An explicit count is
 * what makes deletion stick — slots past it are never read.
 *
 * Content saved before the roster editor existed has no count, so fall back to
 * the last slot that actually holds someone. That keeps a sixth member added
 * through the old numbered field list from vanishing the moment this shipped.
 */
export function teamSize(c: LocaleContent): number {
  const n = Number.parseInt(c.team_size ?? "", 10);
  if (Number.isInteger(n) && n >= 0 && n <= TEAM_MEMBER_SLOTS) return n;
  let last = 0;
  for (let i = 1; i <= TEAM_MEMBER_SLOTS; i++) {
    if ((c[`t${i}_name`] ?? "").trim() && (c[`t${i}_photo`] ?? "").trim()) last = i;
  }
  return last;
}

// How the row of people sits in its section. Left matches the section heading
// and every other grid on the site, which is right while the row is full; a
// short row left-aligned just reads as a hole on the right. Auto switches at
// exactly that point.
export const TEAM_ALIGNS = { auto: "auto", left: "left", center: "center" } as const;
export type TeamAlign = (typeof TEAM_ALIGNS)[keyof typeof TEAM_ALIGNS];

export function teamAlign(c: LocaleContent): TeamAlign {
  const v = c.team_align as TeamAlign;
  return Object.values(TEAM_ALIGNS).includes(v) ? v : TEAM_ALIGNS.auto;
}

/** Hidden members stay in the CMS with all their content, but leave the page. */
export function isMemberHidden(c: LocaleContent, slot: number): boolean {
  return (c[`t${slot}_hidden`] ?? "") === "1";
}

const teamMemberFields: SiteField[] = Array.from({ length: TEAM_MEMBER_SLOTS }, (_, k) => {
  const i = k + 1;
  const group = `Teymi — meðlimur ${i}`;
  return [
    { key: `t${i}_name`, label: "Nafn", group, type: "text", editor: "team-members" },
    { key: `t${i}_role`, label: "Titill", group, type: "text", editor: "team-members" },
    { key: `t${i}_flag`, label: "Merki (t.d. Stofnandi)", group, type: "text", editor: "team-members" },
    { key: `t${i}_photo`, label: "Mynd", group, type: "image", editor: "team-members" },
    { key: `t${i}_hidden`, label: "Falin", group, type: "internal", editor: "team-members" },
  ] as SiteField[];
}).flat();


export const UM_OKKUR_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_eyebrow", label: "Merki (lítill borði)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },

  // Layout switch for the two team bands (see TEAM_LAYOUTS above). Placed in
  // its own group at the top of the team-related fields, because it changes
  // which of the fields below actually appear on the page.
  {
    key: "team_layout",
    label: "Uppsetning",
    group: "Hópmynd & teymi — uppsetning",
    type: "choice",
    help: "Á hópmyndin og teymisspjöldin að vera sinn hvor kaflinn, eða einn sameinaður kafli?",
    options: [
      {
        value: TEAM_LAYOUTS.split,
        label: "Aðskildir kaflar",
        hint: "Sjálfgefið. „Hópmynd“ og „Teymið“ eru tveir sjálfstæðir kaflar sem má raða hvorum í sínu lagi.",
      },
      {
        value: TEAM_LAYOUTS.overlap,
        label: "Sameinað — yfirlögn",
        hint: "Fyrirsögn og texti úr „Hópmynd“ leiða, hópmyndin verður breið mynd og hvítt spjald með andlitsmyndum teymisins liggur yfir neðri brún hennar.",
      },
      {
        value: TEAM_LAYOUTS.panel,
        label: "Sameinað — spjald",
        hint: "Allur kaflinn inni á einu hvítu spjaldi, eins og samstarfsspjaldið á forsíðunni: texti og hópmynd hlið við hlið efst, þunn lína, andlitsmyndir neðst. Rólegasti kosturinn.",
      },
      {
        value: TEAM_LAYOUTS.banner,
        label: "Sameinað — borði",
        hint: "Fyrirsögn og texti úr „Hópmynd“ liggja ofan á hópmyndinni sjálfri (hvítur texti á mjúkri skyggingu) og teymisspjöldin koma fyrir neðan. Áberandi kosturinn — hafðu í huga að myndin þarf að þola texta yfir neðri hlutanum.",
      },
    ],
  },

  // Group photo
  { key: "faces_heading", label: "Fyrirsögn", group: "Hópmynd", type: "heading" },
  { key: "faces_body", label: "Texti", group: "Hópmynd", type: "textarea" },
  { key: "faces_photo", label: "Hópmynd", group: "Hópmynd", type: "image" },
  { key: "faces_caption", label: "Myndatexti (valfrjálst)", group: "Hópmynd", type: "text" },

  // Pillars
  { key: "p1_title", label: "Stoð 1 — titill", group: "Stoðir", type: "text" },
  { key: "p1_body", label: "Stoð 1 — texti", group: "Stoðir", type: "textarea" },
  { key: "p1_icon", label: "Stoð 1 — tákn", group: "Stoðir", type: "icon" },
  { key: "p2_title", label: "Stoð 2 — titill", group: "Stoðir", type: "text" },
  { key: "p2_body", label: "Stoð 2 — texti", group: "Stoðir", type: "textarea" },
  { key: "p2_icon", label: "Stoð 2 — tákn", group: "Stoðir", type: "icon" },
  { key: "p3_title", label: "Stoð 3 — titill", group: "Stoðir", type: "text" },
  { key: "p3_body", label: "Stoð 3 — texti", group: "Stoðir", type: "textarea" },
  { key: "p3_icon", label: "Stoð 3 — tákn", group: "Stoðir", type: "icon" },
  { key: "p4_title", label: "Stoð 4 — titill", group: "Stoðir", type: "text" },
  { key: "p4_body", label: "Stoð 4 — texti", group: "Stoðir", type: "textarea" },
  { key: "p4_icon", label: "Stoð 4 — tákn", group: "Stoðir", type: "icon" },

  // Values
  { key: "values_heading", label: "Fyrirsögn", group: "Gildin", type: "heading" },
  { key: "v1_title", label: "Gildi 1 — titill", group: "Gildin", type: "text" },
  { key: "v1_body", label: "Gildi 1 — texti", group: "Gildin", type: "textarea" },
  { key: "v1_icon", label: "Gildi 1 — tákn", group: "Gildin", type: "icon" },
  { key: "v2_title", label: "Gildi 2 — titill", group: "Gildin", type: "text" },
  { key: "v2_body", label: "Gildi 2 — texti", group: "Gildin", type: "textarea" },
  { key: "v2_icon", label: "Gildi 2 — tákn", group: "Gildin", type: "icon" },
  { key: "v3_title", label: "Gildi 3 — titill", group: "Gildin", type: "text" },
  { key: "v3_body", label: "Gildi 3 — texti", group: "Gildin", type: "textarea" },
  { key: "v3_icon", label: "Gildi 3 — tákn", group: "Gildin", type: "icon" },
  { key: "v4_title", label: "Gildi 4 — titill", group: "Gildin", type: "text" },
  { key: "v4_body", label: "Gildi 4 — texti", group: "Gildin", type: "textarea" },
  { key: "v4_icon", label: "Gildi 4 — tákn", group: "Gildin", type: "icon" },

  // Team
  { key: "team_heading", label: "Fyrirsögn", group: "Teymið", type: "heading" },
  { key: "team_body", label: "Texti", group: "Teymið", type: "textarea" },
  { key: "team_footer", label: "Neðanmálstexti", group: "Teymið", type: "text" },
  {
    key: "team_align",
    label: "Staðsetning andlitsmynda",
    group: "Teymið",
    type: "choice",
    options: [
      {
        value: TEAM_ALIGNS.auto,
        label: "Sjálfvirkt",
        hint: "Mælt með. Raðast frá vinstri á meðan röðin er full (5 eða fleiri), miðjast sjálfkrafa þegar teymið er minna og röðin nær ekki út í kant.",
      },
      {
        value: TEAM_ALIGNS.left,
        label: "Alltaf vinstri",
        hint: "Í takt við fyrirsögnina og allar aðrar spjaldaraðir á vefnum. Fáir meðlimir skilja eftir autt svæði hægra megin.",
      },
      {
        value: TEAM_ALIGNS.center,
        label: "Alltaf miðjað",
        hint: "Myndirnar miðjast í kaflanum, líka síðasta röðin ef hún er ekki full. Sker sig frá vinstristilltri fyrirsögninni fyrir ofan.",
      },
    ],
  },
  // Owned by the roster control; deliberately has no built-in default, so
  // pre-roster content derives its size from the slots instead (see teamSize).
  { key: "team_size", label: "Fjöldi meðlima", group: "Teymið", type: "internal", editor: "team-members" },

  // Team members (one boxed group each in the editor)
  ...teamMemberFields,

  // CTA
  { key: "cta_button", label: "Hnappur", group: "Ákall (CTA)", type: "text" },
];

export const UM_OKKUR_DEFAULTS_IS: LocaleContent = {
  hero_eyebrow: "Um okkur",
  hero_heading: "Stofnað af ==læknum== árið 2021",
  hero_body:
    "Fjarlækningar ehf. er íslenskt fyrirtæki, stofnað af læknum árið 2021, sem leysir algeng heilsugæsluerindi í gegnum örugga sjúklingagátt.",

  team_layout: TEAM_LAYOUTS.split,
  team_align: TEAM_ALIGNS.auto,

  faces_heading: "Fólkið á bak við Fjarlækningar",
  faces_body:
    "Þjónustan er ekki ópersónuleg tölvugátt — á bak við hana stendur teymi lækna og sérfræðinga af holdi og blóði sem leggur metnað í hvert einasta erindi.",
  faces_photo: "/team/fjarlaeknar-hopmynd.jpg",
  faces_caption: "",

  p1_title: "Hlutverk okkar",
  p1_body:
    "Fjarlækningar var stofnað til að auka aðgengi að læknisþjónustu á Íslandi. Sama þjónusta og á læknastofu, sömu spurningar og sömu vandamál — en skilvirkari leið til að leysa þau og styttri biðlistar, óháð staðsetningu.",
  p1_icon: "target",
  p2_title: "Örugg sjúklingagátt",
  p2_body:
    "Sjúklingagátt Fjarlækninga er íslensk heilbrigðisgátt, byggð samkvæmt ströngustu kröfum um persónuvernd. Öll samskipti og sjúkraskrár eru dulkóðaðar og eingöngu aðgengilegar þér og þeim lækni sem annast þig.",
  p2_icon: "lock",
  p3_title: "Faglegir og reyndir læknar",
  p3_body:
    "Læknar okkar eru með full réttindi og langa reynslu í almennri læknisþjónustu. Innbyggt öryggisnet í spurningalistunum vísar alvarlegum einkennum strax í rétta þjónustu — við tökum aldrei að okkur erindi sem eiga heima annars staðar.",
  p3_icon: "stethoscope",
  p4_title: "Lyfseðill og eftirfylgni",
  p4_body:
    "Læknir leggur til meðferð út frá svörum þínum og lyfseðill fer rafrænt í lyfjagátt, tilbúinn í næsta apóteki. Þú getur valið heimsendingu í gegnum app apóteksins þar sem það er í boði — svo þú getir lokið erindinu án þess að fara að heiman.",
  p4_icon: "clipboard-plus",

  values_heading: "Gildin okkar",
  v1_title: "Aðgengi",
  v1_body: "Læknisþjónusta á að vera einföld og aðgengileg fyrir alla.",
  v1_icon: "globe",
  v2_title: "Öryggi",
  v2_body: "Persónuvernd og örugg meðhöndlun heilsufarsupplýsinga er forgangsmál.",
  v2_icon: "shield-check",
  v3_title: "Fagmennska",
  v3_body: "Við fylgjum faglegum stöðlum og klínískum leiðbeiningum.",
  v3_icon: "award",
  v4_title: "Einfaldleiki",
  v4_body: "Þjónustan á að vera auðveld í notkun — frá fyrstu spurningu til lyfseðils.",
  v4_icon: "sparkles",

  team_heading: "Teymið á bakvið Fjarlækningar",
  team_body:
    "Tveir læknar stofnuðu Fjarlækningar. Í dag stendur að baki þjónustunni teymi lækna og sérfræðinga — smelltu á mynd til að sjá hana stærri.",
  team_footer: "Auk hóps starfandi lækna sem afgreiða erindi í sjúklingagáttinni.",

  t1_name: "Victor Guðmundsson",
  t1_role: "Framkvæmdastjóri · Læknir",
  t1_flag: "Stofnandi",
  t1_photo: "/team/fjar-victor.jpg",
  t2_name: "Mads Christian Aanesen",
  t2_role: "Tæknistjóri · Læknir",
  t2_flag: "Stofnandi",
  t2_photo: "/team/fjar-mads.jpg",
  t3_name: "Guðbjartur Ólafsson",
  t3_role: "Yfirlæknir",
  t3_flag: "Læknateymi",
  t3_photo: "/team/fjar-gudbjartur.jpg",
  t4_name: "Dagbjört Guðbrandsdóttir",
  t4_role: "Læknir",
  t4_flag: "Læknateymi",
  t4_photo: "/team/fjar-dagbjort.jpg",
  t5_name: "Elvar Páll Sigurðsson",
  t5_role: "Rekstrarstjóri · Markaðsstjóri",
  t5_flag: "Stjórnun",
  t5_photo: "/team/fjar-elvar.jpg",

  cta_button: "Opna sjúklingagátt",
};

export const UM_OKKUR_DEFAULTS_EN: LocaleContent = {
  ...emptyDefaults(UM_OKKUR_FIELDS),
  faces_heading: "The people behind Fjarlækningar",
  faces_body:
    "This is no faceless portal — behind it stands a real team of doctors and specialists who put genuine care into every single case.",
  // Preserve the English role/flag the team grid used to hard-code, so the
  // English page reads correctly before anyone opens the CMS. Names and photos
  // are language-independent and fall back to the Icelandic defaults.
  t1_role: "CEO · Physician",
  t1_flag: "Founder",
  t2_role: "CTO · Physician",
  t2_flag: "Founder",
  t3_role: "Chief Physician",
  t3_flag: "Medical team",
  t4_role: "Physician",
  t4_flag: "Medical team",
  t5_role: "COO · Head of Marketing",
  t5_flag: "Management",
};
