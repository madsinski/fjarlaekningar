// Medalia-útflutningur — sniðið, og leiðin úr skrá í mánaðartölur.
//
// ── Af hverju samantekt en ekki erindaskrá ─────────────────────────────────
// Skráin sem fer INN Í þetta kerfi inniheldur engar persónuupplýsingar og getur
// það ekki, því hún er þegar talin: hver lína er FJÖLDI, ekki manneskja. Engin
// kennitala, engin dagsetning, enginn frjáls texti, ekkert aldursbil, ekkert
// kyn. Það er ekki varúð heldur hönnun — mælaborðið þarf talningu og hún er
// það eina sem það fær. Þá er engin spurning um hvað gerist ef einhver fær
// aðgang að töflunni.
//
// Þetta þýðir líka að þessi tafla fellur hreinlega undir gæðaeftirlit: hún
// geymir ekkert sem rekja má til einstaklings og því er ekkert að vernda.
//
// ── Kornastærðin ───────────────────────────────────────────────────────────
// Ein lína á STÖÐ × MÁNUÐ × ERINDI. Það er fínasta kornið sem er enn alveg
// ópersónugreinanlegt, og það gefur hvort tveggja í einni skrá: sundurliðun
// eftir erindi (fullyrðing 1 og 2) og heildartölur á stöð (allt hitt).
// Níu stöðvar × þrettán erindi = 117 línur á mánuði. Ekkert mál fyrir neinn.
//
// Grófara korn — ein lína á stöð — sparar ekkert og eyðileggur sundurliðunina.
// Fínna korn — ein lína á erindi — er persónuupplýsingar og á ekki heima hér.
//
// ── Það sem er EKKI í þessari skrá ─────────────────────────────────────────
// Fyrir árlega dýpri greiningu (kóðadreifing, krosstöflur, aldursmunur) þarf
// erindaskrá með einni línu á erindi. Hún er annað mál og fer ALDREI inn í
// þetta kerfi. Sjá docs/arangur.md — þar er hún skilgreind sérstaklega, ásamt
// því hvers vegna dulkóðaður sjúklingalykill er ENN persónuupplýsingar þótt
// hann sé ekki kennitala.

import { erindi } from "@/erindi";
import { type Manudur, tomurManudur, type ErindiTolur } from "@/lib/arangur";

export type Dalkur = {
  nafn: string;
  lysing: string;
  /** Tegund gildis — texti eða heil tala. */
  tala?: boolean;
  /** Má vanta (auður reitur = ómælt, ekki núll). */
  valfrjals?: boolean;
};

/** Sniðið, nákvæmlega eins og það á að berast. Þetta er skjalið sem fer
 *  til Medalia — ekki lýsing á því heldur listinn sjálfur. */
export const DALKAR: Dalkur[] = [
  { nafn: "stod", lysing: "Heilsugæslustöð, skrifuð eins og stofnunin skrifar hana — „Vestmannaeyjar“, „Vík í Mýrdal“." },
  { nafn: "manudur", lysing: "Mánuðurinn, yyyy-mm. Aldrei dagsetning — dagsetning á lítilli stöð er persónugreinandi." },
  { nafn: "erindi", lysing: "Erindisauðkenni (slug) úr lista Fjarlækninga, t.d. kvef-hosti-halsbolga." },
  { nafn: "erindi_alls", lysing: "Erindi sem bárust í þessum flokki.", tala: true },
  { nafn: "erindi_leyst", lysing: "Kláruðust alfarið í fjarþjónustu, engin tilvísun.", tala: true },
  { nafn: "erindi_visad", lysing: "Læknir vísaði áfram. Á að vera summa visad_* dálkanna.", tala: true },
  { nafn: "visad_heilsugaesla", lysing: "Vísað á heilsugæslu.", tala: true },
  { nafn: "visad_serfraedi", lysing: "Vísað á sérfræðing eða sérsvið.", tala: true },
  { nafn: "visad_brad", lysing: "Vísað á bráðamóttöku eða 112 — EFTIR að sjúklingur komst gegnum spurningalistann. Sér dálkur því þetta er næstum-atvik síunarinnar, ekki venjuleg tilvísun.", tala: true },
  { nafn: "visad_annad", lysing: "Annað.", tala: true },
  { nafn: "endurtekin", lysing: "Sami sjúklingur, sama erindi, aftur innan mánaðarins. Talning — engin auðkenni.", tala: true },
  { nafn: "listi_stodvadur", lysing: "Spurningalisti stöðvaði sjúkling (rautt flagg); komst aldrei til læknis. Ef þetta skráist ekki í dag er það brýnasta lagfæringin.", tala: true },
  { nafn: "lyfsedlar", lysing: "Erindi þar sem lyfseðill var gefinn.", tala: true },
  { nafn: "syklalyf", lysing: "Þar af sýklalyf. Stewardship-talan.", tala: true },
  { nafn: "kodar_utan_setts", lysing: "Erindi sem lentu á greiningarkóða utan þess setts sem erindið á að ná yfir.", tala: true },
  { nafn: "svartimi_midgildi_min", lysing: "Miðgildi svartíma í MÍNÚTUM — lengd, ekki tímastimpill.", tala: true, valfrjals: true },
  { nafn: "svartimi_p95_min", lysing: "95. hlutfallsmark svartíma í mínútum.", tala: true, valfrjals: true },
  { nafn: "adkoma_beint", lysing: "Kom beint í þjónustuna.", tala: true, valfrjals: true },
  { nafn: "adkoma_hjukrunarfr", lysing: "Hjúkrunarfræðingur vísaði.", tala: true, valfrjals: true },
  { nafn: "adkoma_mottaka", lysing: "Móttökuritari vísaði.", tala: true, valfrjals: true },
  { nafn: "adkoma_gagnafr", lysing: "Heilbrigðisgagnafræðingur vísaði.", tala: true, valfrjals: true },
  { nafn: "adkoma_annad", lysing: "Önnur eða óþekkt leið.", tala: true, valfrjals: true },
];

export const SKYLDU_DALKAR = DALKAR.filter((d) => !d.valfrjals).map((d) => d.nafn);
const TALNA_DALKAR = new Set(DALKAR.filter((d) => d.tala).map((d) => d.nafn));
const GILD_ERINDI = new Set(erindi.map((e) => e.slug));

/** Sniðmát með haus og einni sýnilínu — það sem er sent Medalia. */
export function sniðmat(): string {
  const haus = DALKAR.map((d) => d.nafn).join(",");
  const daemi = DALKAR.map((d) => {
    if (d.nafn === "stod") return "Vestmannaeyjar";
    if (d.nafn === "manudur") return "2026-09";
    if (d.nafn === "erindi") return "kvef-hosti-halsbolga";
    return "0";
  }).join(",");
  return `${haus}\n${daemi}\n`;
}

// ── Lesturinn ───────────────────────────────────────────────────────────────

export type InnflutningsVilla = { lina: number; texti: string };

export type InnflutningsNidurstada = {
  manudir: Manudur[];
  villur: InnflutningsVilla[];
  /** Línur sem voru lesnar án athugasemda. */
  linur: number;
};

/** Klýfur CSV-línu og virðir gæsalappir. Excel á íslensku skrifar oft
 *  semíkommu, svo hvort tveggja er tekið gilt. */
function kljufa(lina: string, skil: string): string[] {
  const út: string[] = [];
  let nu = "";
  let ig = false;
  for (let i = 0; i < lina.length; i++) {
    const c = lina[i];
    if (c === '"') {
      if (ig && lina[i + 1] === '"') { nu += '"'; i++; }
      else ig = !ig;
    } else if (c === skil && !ig) { út.push(nu); nu = ""; }
    else nu += c;
  }
  út.push(nu);
  return út.map((s) => s.trim());
}

function talan(raw: string): number | null {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Les útflutningsskrá og skilar einni Manudur-röð á hverja stöð og mánuð,
 * með erindin lögð saman í erindi_sundurlidun.
 *
 * Svartími er VEGINN með erindafjölda en ekki lagður saman — miðgildi leggjast
 * ekki saman, og einn rólegur erindaflokkur má ekki draga heildina til sín.
 */
export function lesa(texti: string, institution = "hsu"): InnflutningsNidurstada {
  const villur: InnflutningsVilla[] = [];
  const linur = texti.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!linur.length) return { manudir: [], villur: [{ lina: 0, texti: "Skráin er tóm." }], linur: 0 };

  const skil = (linur[0].match(/;/g) || []).length > (linur[0].match(/,/g) || []).length ? ";" : ",";
  const haus = kljufa(linur[0], skil).map((h) => h.toLowerCase());

  const vantar = SKYLDU_DALKAR.filter((d) => !haus.includes(d));
  if (vantar.length) {
    return { manudir: [], linur: 0, villur: [{ lina: 1, texti: `Dálka vantar í hausinn: ${vantar.join(", ")}` }] };
  }

  const vis = (d: string) => haus.indexOf(d);
  // Vegin summa svartíma: { lykill: [summa, vigt] }
  const svar = new Map<string, [number, number]>();
  const p95 = new Map<string, [number, number]>();
  const út = new Map<string, Manudur>();
  let lesnar = 0;

  for (let i = 1; i < linur.length; i++) {
    const reitir = kljufa(linur[i], skil);
    const g = (d: string) => reitir[vis(d)] ?? "";

    const stod = g("stod");
    const manudurRaw = g("manudur");
    const slug = g("erindi").toLowerCase();

    if (!stod) { villur.push({ lina: i + 1, texti: "Stöð vantar." }); continue; }
    const mm = manudurRaw.match(/^(\d{4})-(\d{2})/);
    // Mánaðarnúmerið er athugað sérstaklega: „2026-13“ stenst mynstrið en er
    // ekki mánuður, og næði það í gegn félli innsetningin á gagnagrunninum
    // með villu sem enginn tengir við línu í skrá.
    if (!mm || Number(mm[2]) < 1 || Number(mm[2]) > 12) {
      villur.push({ lina: i + 1, texti: `Ógildur mánuður: „${manudurRaw}“ — á að vera yyyy-mm með mánuði 01–12.` });
      continue;
    }
    const month = `${mm[1]}-${mm[2]}-01`;
    if (!GILD_ERINDI.has(slug)) { villur.push({ lina: i + 1, texti: `Óþekkt erindi: „${slug}“.` }); continue; }

    // Tölur sem eru ekki tölur eru villa, ekki núll — þögult núll er verra en
    // engin lína, því það lítur út eins og mæling.
    const tolur: Record<string, number | null> = {};
    let vitlaus = false;
    for (const d of TALNA_DALKAR) {
      const raw = g(d);
      if (!raw) { tolur[d] = null; continue; }
      const n = talan(raw);
      if (n === null) { villur.push({ lina: i + 1, texti: `„${raw}“ í dálki ${d} er ekki tala.` }); vitlaus = true; break; }
      tolur[d] = n;
    }
    if (vitlaus) continue;

    const t = (d: string) => tolur[d] ?? 0;
    const lykill = `${stod}|${month}`;
    const m = út.get(lykill) ?? tomurManudur(institution, stod, month);

    // Erindi sem eru mæld sér fara ekki í heildartölur virkniflokksins.
    if (slug === "almenn-laeknisthjonusta") {
      m.almenn_alls += t("erindi_alls");
      m.almenn_leyst += t("erindi_leyst");
    }

    m.erindi_alls += t("erindi_alls");
    m.erindi_leyst += t("erindi_leyst");
    m.erindi_visad += t("erindi_visad");
    m.erindi_endurtekin += t("endurtekin");
    m.visad_heilsugaesla += t("visad_heilsugaesla");
    m.visad_serfraedi += t("visad_serfraedi");
    m.visad_brad += t("visad_brad");
    m.visad_annad += t("visad_annad");
    m.listi_stodvadur += t("listi_stodvadur");
    m.lyfsedlar += t("lyfsedlar");
    m.syklalyf += t("syklalyf");
    m.kodar_utan_setts += t("kodar_utan_setts");
    m.adkoma_beint += t("adkoma_beint");
    m.adkoma_hjukrunarfr += t("adkoma_hjukrunarfr");
    m.adkoma_mottaka += t("adkoma_mottaka");
    m.adkoma_gagnafr += t("adkoma_gagnafr");
    m.adkoma_annad += t("adkoma_annad");

    const fyrri: ErindiTolur = m.erindi_sundurlidun[slug] ?? { alls: 0, leyst: 0, visad: 0 };
    m.erindi_sundurlidun[slug] = {
      alls: fyrri.alls + t("erindi_alls"),
      leyst: fyrri.leyst + t("erindi_leyst"),
      visad: fyrri.visad + t("erindi_visad"),
    };

    const vigt = t("erindi_alls");
    if (tolur["svartimi_midgildi_min"] !== null && vigt) {
      const [s0, v0] = svar.get(lykill) ?? [0, 0];
      svar.set(lykill, [s0 + tolur["svartimi_midgildi_min"]! * vigt, v0 + vigt]);
    }
    if (tolur["svartimi_p95_min"] !== null && vigt) {
      const [s0, v0] = p95.get(lykill) ?? [0, 0];
      p95.set(lykill, [s0 + tolur["svartimi_p95_min"]! * vigt, v0 + vigt]);
    }

    if (!m.heimildir.includes("medalia")) m.heimildir.push("medalia");
    út.set(lykill, m);
    lesnar++;
  }

  for (const [lykill, m] of út) {
    const s = svar.get(lykill);
    if (s && s[1]) m.svartimi_midgildi_min = Math.round(s[0] / s[1]);
    const p = p95.get(lykill);
    if (p && p[1]) m.svartimi_p95_min = Math.round(p[0] / p[1]);

    // Innra samræmi: leyst + vísað á að ganga upp í heildina. Ekki villa sem
    // stöðvar innflutning — en það á að sjást, því það þýðir yfirleitt að
    // afgreiðslureiturinn í Medalia sé ekki skyldubundinn ennþá.
    const summa = m.erindi_leyst + m.erindi_visad;
    if (m.erindi_alls && summa !== m.erindi_alls) {
      villur.push({
        lina: 0,
        texti: `${m.station} ${m.month.slice(0, 7)}: leyst (${m.erindi_leyst}) + vísað (${m.erindi_visad}) = ${summa}, en erindi alls eru ${m.erindi_alls}. Mismunur ${m.erindi_alls - summa} — líklega erindi án skráðrar afgreiðslu.`,
      });
    }
  }

  return { manudir: [...út.values()], villur, linur: lesnar };
}
