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

// Team members are a fixed set of numbered slots (like the pillars/values
// above), so the existing flat CMS pipeline handles them with no new machinery
// beyond the "image" field type. Empty slots simply don't render on the page.
// Name + photo are a single value each (a person's name and portrait don't
// change per language); role and flag are per-locale like any other copy.
export const TEAM_MEMBER_SLOTS = 8;

const teamMemberFields: SiteField[] = Array.from({ length: TEAM_MEMBER_SLOTS }, (_, k) => {
  const i = k + 1;
  const group = `Teymi — meðlimur ${i}`;
  return [
    { key: `t${i}_name`, label: "Nafn", group, type: "text" },
    { key: `t${i}_role`, label: "Titill", group, type: "text" },
    { key: `t${i}_flag`, label: "Merki (t.d. Stofnandi)", group, type: "text" },
    { key: `t${i}_photo`, label: "Mynd", group, type: "image" },
  ] as SiteField[];
}).flat();


export const UM_OKKUR_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_eyebrow", label: "Merki (lítill borði)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },

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
