// Editable content model for /um-okkur.
// Defaults are verbatim from the original hard-coded page.

import { emptyDefaults, type LocaleContent, type SiteField } from "./types";

export const UM_OKKUR_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },

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

  // CTA
  { key: "cta_button", label: "Hnappur", group: "Ákall (CTA)", type: "text" },
];

export const UM_OKKUR_DEFAULTS_IS: LocaleContent = {
  hero_heading: "Um okkur",
  hero_body:
    "Fjarlækningar ehf. er íslenskt fyrirtæki, stofnað af læknum árið 2021, sem leysir algeng heilsugæsluerindi í gegnum örugga sjúklingagátt.",

  p1_title: "Hlutverk okkar",
  p1_body:
    "Fjarlækningar var stofnað til að auka aðgengi að læknisþjónustu á Íslandi. Sama þjónusta og á læknastofu, sömu spurningar og sömu vandamál — en skilvirkari leið til að leysa þau og styttri biðlistar, óháð staðsetningu.",
  p1_icon: "target",
  p2_title: "Örugg þjónusta í gegnum Medalia",
  p2_body:
    "Við notum sjúklingagátt Medalia, íslenska heilbrigðisgátt byggða samkvæmt ströngustu kröfum um persónuvernd. Öll samskipti og sjúkraskrár eru dulkóðaðar og eingöngu aðgengilegar þér og þeim lækni sem annast þig.",
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

  cta_button: "Opna sjúklingagátt",
};

export const UM_OKKUR_DEFAULTS_EN: LocaleContent = emptyDefaults(UM_OKKUR_FIELDS);
