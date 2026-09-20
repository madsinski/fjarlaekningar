// Árangursmælingar — hvaða fullyrðingar verða að standast, og hvaða tölur bera þær.
//
// ── Auditið ────────────────────────────────────────────────────────────────
// Markmiðin eru sögð tvö — bæta þjónustuna fyrir skjólstæðinga, létta á
// heilsugæslunni — en þau klofna við skoðun í fimm flokka sem hver hefur sitt
// sönnunarstig og sinn bilunarhátt:
//
//   A. VIRKNI          Leysast erindin? Þetta er grunnfullyrðingin.
//   B. ÖRYGGI          Skaðast enginn? Þetta er HLIÐ, ekki kvarði: frábært
//                      lausnarhlutfall með einu alvarlegu atviki er fallið
//                      verkefni. Þess vegna sér flokkur.
//   C. ÁLAGSLÉTTING    Léttir þetta raunverulega á? Markmið 2. Verður að
//                      mælast NETTÓ — brúttótalan „við tókum 400 erindi af
//                      ykkur“ er forsenda sem enginn hefur prófað.
//   D. UPPLIFUN        Var þetta betra fyrir manneskjuna? Ekki sama og A:
//                      kerfið getur virkað og upplifunin samt verið verri.
//   E. YFIRFÆRANLEIKI  Er þetta endurtakanlegt? Vantaði í bæði markmiðin en
//                      er hvatinn að öllu verkefninu — þetta er tilraunastöð.
//
// A+B+D svara markmiði 1, C svarar markmiði 2, E svarar því af hverju við
// erum að mæla yfirleitt. B og E eru HLIÐ: þau leyfa hinum að vera til.
//
// Markmiðin geta rekið í sundur án þess að nokkur taki eftir — hægt er að
// létta álagi með því að afgreiða hraðar og verr, og bæta þjónustu með því að
// hlaða verkum á hjúkrunarfræðinginn. Þess vegna ber mælaborðið alla flokka á
// sömu síðu. Það er agi, ekki framsetning.

import { erindi } from "@/erindi";

// ── Gögnin ──────────────────────────────────────────────────────────────────

export type ErindiTolur = { alls: number; leyst: number; visad: number };
export type NefndFjoldi = { flokkur: string; fjoldi: number };

export const HEIMILDIR = ["medalia", "stofnun", "konnun", "okkar"] as const;
export type Heimild = (typeof HEIMILDIR)[number];

export const HEIMILD_HEITI: Record<Heimild, string> = {
  medalia: "Medalia",
  stofnun: "Stofnunin",
  konnun: "Kannanir",
  okkar: "Okkar kerfi",
};

/** Ein stöð, einn mánuður. Speglar arangur_manudir. */
export type Manudur = {
  id?: string;
  institution: string;
  station: string;
  /** yyyy-mm-01 */
  month: string;

  // 1. Úr Medalia
  erindi_alls: number;
  erindi_leyst: number;
  erindi_visad: number;
  erindi_endurtekin: number;
  visad_heilsugaesla: number;
  visad_serfraedi: number;
  visad_annad: number;
  visad_brad: number;
  kodar_utan_setts: number;
  listi_stodvadur: number;
  stodvun_flokkar: NefndFjoldi[];
  lyfsedlar: number;
  syklalyf: number;
  svartimi_midgildi_min: number | null;
  svartimi_p95_min: number | null;
  erindi_sundurlidun: Record<string, ErindiTolur>;
  adkoma_beint: number;
  adkoma_hjukrunarfr: number;
  adkoma_mottaka: number;
  adkoma_gagnafr: number;
  adkoma_annad: number;
  almenn_alls: number;
  almenn_leyst: number;
  almenn_oleyst_flokkar: NefndFjoldi[];

  // 2. Frá stofnuninni
  samskipti_kodar: number | null;
  endurkomur_7d: number | null;
  afleysingakostn_isk: number | null;
  simtol_stofnun: number | null;
  monnun_hlutfall: number | null;

  // 3. Kannanir og frávik
  konnun_svor: number;
  konnun_send: number;
  konnun_einfalt: number | null;
  konnun_aftur: number | null;
  konnun_annars_hvergi: number | null;
  heildartimi_midgildi_klst: number | null;
  ferdir_felldar: number | null;
  starfsm_hjukr_jakvaett: number | null;
  starfsm_laeknar_jakvaett: number | null;
  frvik: number;
  frvik_naermiss: number;
  alvarleg_atvik: number;

  // 4. Okkar kerfi
  laeknar_virkir: number;
  laeknar_haettu: number;
  studningsspurningar: number;
  uppitimi_hlutfall: number | null;

  note: string;
  heimildir: Heimild[];
  entered_by_name?: string;
  updated_at?: string;
};

export type Forsendur = {
  /** Mínútur af vinnu stofnunarinnar sem eitt leyst erindi hefði kostað.
   *  Sjálfgefið er ÁGISKUN þar til tímamælingin liggur fyrir. */
  min_a_erindi: number;
  /** Nettó: mínútur sem stofnunin eyðir Í erindi sem fer til okkar. Dregst frá.
   *  Núll þýðir að tilfærsla vinnu er ómæld — og þá er C-talan brúttó. */
  min_kostnadur_a_erindi: number;
  klst_i_laeknisdegi: number;
  svartimi_markmid_min: number;
  /** Hefur tímamælingin verið framkvæmd? Ræður því hvort C-talan er merkt ágiskun. */
  timamaeling_gerd: boolean;
};

export const FORSENDUR_SJALFGEFID: Forsendur = {
  min_a_erindi: 20,
  min_kostnadur_a_erindi: 0,
  klst_i_laeknisdegi: 7,
  svartimi_markmid_min: 120,
  timamaeling_gerd: false,
};

const TOLUR: (keyof Manudur)[] = [
  "erindi_alls", "erindi_leyst", "erindi_visad", "erindi_endurtekin",
  "visad_heilsugaesla", "visad_serfraedi", "visad_annad", "visad_brad",
  "kodar_utan_setts", "listi_stodvadur", "lyfsedlar", "syklalyf",
  "adkoma_beint", "adkoma_hjukrunarfr", "adkoma_mottaka", "adkoma_gagnafr", "adkoma_annad",
  "almenn_alls", "almenn_leyst", "konnun_svor", "konnun_send",
  "frvik", "frvik_naermiss", "alvarleg_atvik",
  "laeknar_virkir", "laeknar_haettu", "studningsspurningar",
];

export function tomurManudur(institution: string, station: string, month: string): Manudur {
  const m = { institution, station, month } as Manudur;
  for (const k of TOLUR) (m as Record<string, unknown>)[k] = 0;
  for (const k of [
    "svartimi_midgildi_min", "svartimi_p95_min", "samskipti_kodar", "endurkomur_7d",
    "afleysingakostn_isk", "simtol_stofnun", "monnun_hlutfall", "konnun_einfalt",
    "konnun_aftur", "konnun_annars_hvergi", "heildartimi_midgildi_klst", "ferdir_felldar",
    "starfsm_hjukr_jakvaett", "starfsm_laeknar_jakvaett", "uppitimi_hlutfall",
  ]) (m as Record<string, unknown>)[k] = null;
  m.erindi_sundurlidun = {};
  m.stodvun_flokkar = [];
  m.almenn_oleyst_flokkar = [];
  m.note = "";
  m.heimildir = [];
  return m;
}

// ── Samlagning ──────────────────────────────────────────────────────────────

const sum = (rows: Manudur[], pick: (m: Manudur) => number) => rows.reduce((a, m) => a + (pick(m) || 0), 0);

/** Meðaltal vegið með fjölda — rétta leiðin að sameina hlutföll og miðgildi yfir
 *  mánuði. Ómerkt gildi draga mánuðinn einfaldlega út í stað þess að telja sem núll. */
function vegid(rows: Manudur[], gildi: (m: Manudur) => number | null, vigt: (m: Manudur) => number): number | null {
  let t = 0, v = 0;
  for (const m of rows) {
    const g = gildi(m), w = vigt(m) || 0;
    if (g === null || g === undefined || !w) continue;
    t += g * w; v += w;
  }
  return v ? Math.round(t / v) : null;
}

const summaEda = (rows: Manudur[], pick: (m: Manudur) => number | null): number | null => {
  const med = rows.filter((m) => pick(m) !== null && pick(m) !== undefined);
  return med.length ? med.reduce((a, m) => a + (pick(m) || 0), 0) : null;
};

export const hlutfall = (hluti: number, heild: number): number | null =>
  heild > 0 ? Math.round((hluti / heild) * 100) : null;

function safnaNefndum(rows: Manudur[], pick: (m: Manudur) => NefndFjoldi[]): NefndFjoldi[] {
  const map = new Map<string, number>();
  for (const m of rows) for (const f of pick(m) || []) {
    const k = f?.flokkur?.trim();
    if (k) map.set(k, (map.get(k) ?? 0) + (f.fjoldi || 0));
  }
  return [...map.entries()].map(([flokkur, fjoldi]) => ({ flokkur, fjoldi })).sort((a, b) => b.fjoldi - a.fjoldi);
}

export type Samtala = ReturnType<typeof leggjaSaman>;

export function leggjaSaman(rows: Manudur[]) {
  const sundurlidun: Record<string, ErindiTolur> = {};
  for (const m of rows) for (const [slug, t] of Object.entries(m.erindi_sundurlidun || {})) {
    const nu = sundurlidun[slug] ?? { alls: 0, leyst: 0, visad: 0 };
    sundurlidun[slug] = { alls: nu.alls + (t?.alls || 0), leyst: nu.leyst + (t?.leyst || 0), visad: nu.visad + (t?.visad || 0) };
  }

  const adkoma = {
    beint: sum(rows, (m) => m.adkoma_beint),
    hjukrunarfr: sum(rows, (m) => m.adkoma_hjukrunarfr),
    mottaka: sum(rows, (m) => m.adkoma_mottaka),
    gagnafr: sum(rows, (m) => m.adkoma_gagnafr),
    annad: sum(rows, (m) => m.adkoma_annad),
    alls: 0,
  };
  adkoma.alls = adkoma.beint + adkoma.hjukrunarfr + adkoma.mottaka + adkoma.gagnafr + adkoma.annad;

  const tala = (k: keyof Manudur) => sum(rows, (m) => (m[k] as number) || 0);

  return {
    manudir: rows.length,
    erindi_alls: tala("erindi_alls"),
    erindi_leyst: tala("erindi_leyst"),
    erindi_visad: tala("erindi_visad"),
    erindi_endurtekin: tala("erindi_endurtekin"),
    visad_heilsugaesla: tala("visad_heilsugaesla"),
    visad_serfraedi: tala("visad_serfraedi"),
    visad_annad: tala("visad_annad"),
    visad_brad: tala("visad_brad"),
    kodar_utan_setts: tala("kodar_utan_setts"),
    listi_stodvadur: tala("listi_stodvadur"),
    lyfsedlar: tala("lyfsedlar"),
    syklalyf: tala("syklalyf"),
    almenn_alls: tala("almenn_alls"),
    almenn_leyst: tala("almenn_leyst"),
    konnun_svor: tala("konnun_svor"),
    konnun_send: tala("konnun_send"),
    frvik: tala("frvik"),
    frvik_naermiss: tala("frvik_naermiss"),
    alvarleg_atvik: tala("alvarleg_atvik"),
    laeknar_virkir: Math.max(0, ...rows.map((m) => m.laeknar_virkir || 0)),
    laeknar_haettu: tala("laeknar_haettu"),
    studningsspurningar: tala("studningsspurningar"),

    samskipti_kodar: summaEda(rows, (m) => m.samskipti_kodar),
    endurkomur_7d: summaEda(rows, (m) => m.endurkomur_7d),
    afleysingakostn_isk: summaEda(rows, (m) => m.afleysingakostn_isk),
    simtol_stofnun: summaEda(rows, (m) => m.simtol_stofnun),
    ferdir_felldar: summaEda(rows, (m) => m.ferdir_felldar),

    svartimi_midgildi_min: vegid(rows, (m) => m.svartimi_midgildi_min, (m) => m.erindi_alls),
    svartimi_p95_min: vegid(rows, (m) => m.svartimi_p95_min, (m) => m.erindi_alls),
    heildartimi_midgildi_klst: vegid(rows, (m) => m.heildartimi_midgildi_klst, (m) => m.konnun_svor),
    konnun_einfalt: vegid(rows, (m) => m.konnun_einfalt, (m) => m.konnun_svor),
    konnun_aftur: vegid(rows, (m) => m.konnun_aftur, (m) => m.konnun_svor),
    konnun_annars_hvergi: vegid(rows, (m) => m.konnun_annars_hvergi, (m) => m.konnun_svor),
    monnun_hlutfall: vegid(rows, (m) => m.monnun_hlutfall, () => 1),
    uppitimi_hlutfall: vegid(rows, (m) => m.uppitimi_hlutfall, () => 1),
    starfsm_hjukr_jakvaett: vegid(rows, (m) => m.starfsm_hjukr_jakvaett, () => 1),
    starfsm_laeknar_jakvaett: vegid(rows, (m) => m.starfsm_laeknar_jakvaett, () => 1),

    adkoma,
    erindi_sundurlidun: sundurlidun,
    stodvun_flokkar: safnaNefndum(rows, (m) => m.stodvun_flokkar),
    oleyst_flokkar: safnaNefndum(rows, (m) => m.almenn_oleyst_flokkar),
  };
}

// ── Mælikvarðarnir ──────────────────────────────────────────────────────────

export type FlokkurId = "virkni" | "oryggi" | "alag" | "upplifun" | "yfirfaeranleiki";

export type Flokkur = {
  id: FlokkurId;
  titill: string;
  /** Spurningin sem flokkurinn svarar, orðuð eins og sá sem spyr hana. */
  spurning: string;
  /** Hlið leyfa hinum flokkunum að vera til — þau eru ekki kvarðar. */
  hlid?: boolean;
  /** Hvaða markmið þetta þjónar. */
  markmid: string;
};

export const FLOKKAR: Flokkur[] = [
  { id: "virkni", titill: "Virkni", spurning: "Leysast erindin?", markmid: "Markmið 1 — betri þjónusta" },
  { id: "oryggi", titill: "Öryggi", spurning: "Skaðast enginn?", hlid: true, markmid: "Markmið 1 — gólfið" },
  { id: "alag", titill: "Álagslétting", spurning: "Léttir þetta raunverulega á?", markmid: "Markmið 2 — salan" },
  { id: "upplifun", titill: "Upplifun", spurning: "Var þetta betra fyrir manneskjuna?", markmid: "Markmið 1 — röddin" },
  { id: "yfirfaeranleiki", titill: "Yfirfæranleiki", spurning: "Er þetta endurtakanlegt?", hlid: true, markmid: "Af hverju við mælum" },
];

export type Stada = "godur" | "midlungs" | "slakur";

export type Maelikvardi = {
  id: string;
  heiti: string;
  gildi: string | null;
  /** Nákvæmlega hvað talan er. */
  undir: string;
  heimild: Heimild | "afleitt";
  /** Hvað vantar, þegar gildi er null. */
  vantar?: string;
  stada?: Stada;
};

export type FlokkurNidurstada = Flokkur & {
  /** Höfuðmælikvarðinn — talan á vegginn. */
  haus: Maelikvardi;
  /** Það sem ber hann þegar spurt er nánar. */
  undir: Maelikvardi[];
  /** Af hverju hausinn er þessi tala en ekki önnur. */
  afHverju: string;
  /** Forsenda sem talan hvílir á og verður að sjást með henni. */
  forsenda?: string;
};

const pct = (n: number | null) => (n === null ? null : `${n}%`);
const isk = (n: number | null) => (n === null ? null : `${Math.round(n / 1000).toLocaleString("is-IS")} þús.`);
const num = (n: number) => n.toLocaleString("is-IS");

export function greina(s: Samtala, f: Forsendur): FlokkurNidurstada[] {
  const lausn = hlutfall(s.erindi_leyst, s.erindi_alls);
  const heildarflaedi = s.samskipti_kodar !== null ? s.samskipti_kodar + s.erindi_alls : null;
  const hlutdeild = heildarflaedi ? hlutfall(s.erindi_alls, heildarflaedi) : null;

  const nettoMin = f.min_a_erindi - f.min_kostnadur_a_erindi;
  const klst = (s.erindi_leyst * nettoMin) / 60;
  const dagar = f.klst_i_laeknisdegi > 0 ? klst / f.klst_i_laeknisdegi : 0;

  const svartimi = s.svartimi_midgildi_min;
  const stodvunHlutf = hlutfall(s.listi_stodvadur, s.erindi_alls + s.listi_stodvadur);
  const endurkomur = s.endurkomur_7d !== null ? hlutfall(s.endurkomur_7d, s.erindi_leyst) : null;

  return [
    // ── A. VIRKNI ──────────────────────────────────────────────────────────
    {
      ...FLOKKAR[0],
      afHverju:
        "Grunnfullyrðingin: að þessi erindi séu leysanleg í fjarþjónustu. Markmiðið er ekki hæsta mögulega tala heldur tala sem stenst skoðun erindi fyrir erindi — ellefu grænir hakar yfir 95% trúir enginn. Níu sterk, tvö á mörkunum og skýring á því hverju var breytt er miklu trúverðugra og sýnir lærdómsfyrirtæki.",
      haus: {
        id: "lausnarhlutfall",
        heiti: "Leyst í fjarþjónustu",
        gildi: pct(lausn),
        undir: `${num(s.erindi_leyst)} af ${num(s.erindi_alls)} erindum kláruðust alfarið — öll erindi talin, líka almenn þjónusta og vottorð`,
        heimild: "medalia",
        vantar: lausn === null ? "Medalia-útflutningur" : undefined,
        stada: lausn === null ? undefined : lausn >= 80 ? "godur" : lausn >= 60 ? "midlungs" : "slakur",
      },
      undir: [
        {
          id: "magn", heiti: "Erindi alls", gildi: num(s.erindi_alls),
          undir: `Yfir ${s.manudir} ${s.manudir === 1 ? "mánuð" : "mánuði"}. Hátt hlutfall á litlu magni er ekki niðurstaða.`,
          heimild: "medalia",
        },
        {
          id: "visad_hvert", heiti: "Vísað áfram", gildi: num(s.erindi_visad),
          undir: `Heilsugæsla ${s.visad_heilsugaesla} · sérfræðingur ${s.visad_serfraedi} · annað ${s.visad_annad}. Tilvísun er ekki bilun — en hvert skiptir máli.`,
          heimild: "medalia",
        },
        {
          id: "utan_setts", heiti: "Utan kóðasetts", gildi: num(s.kodar_utan_setts),
          undir: "Erindi sem lentu á greiningarkóða utan þess sem erindið átti að ná yfir. Fyrsta merki um að umfangið sé að reka.",
          heimild: "medalia",
          stada: s.erindi_alls ? (hlutfall(s.kodar_utan_setts, s.erindi_alls)! <= 5 ? "godur" : "midlungs") : undefined,
        },
        {
          id: "endurtekin", heiti: "Endurtekin erindi", gildi: num(s.erindi_endurtekin),
          undir: "Sami sjúklingur, sama vandamál, aftur innan tímabils. Lausn sem heldur ekki er ekki lausn.",
          heimild: "medalia",
        },
        {
          id: "almenn", heiti: "Almenn þjónusta — óleyst",
          gildi: s.almenn_alls ? num(s.almenn_alls - s.almenn_leyst) : null,
          undir: s.almenn_alls
            ? `Af ${num(s.almenn_alls)} almennum erindum. Ruslakistan er þar sem erindi 12, 13 og 14 fela sig — þetta er vegvísirinn að næstu erindum.`
            : "Engin almenn erindi skráð",
          heimild: "medalia",
        },
      ],
    },

    // ── B. ÖRYGGI ──────────────────────────────────────────────────────────
    {
      ...FLOKKAR[1],
      afHverju:
        "Þetta er hlið en ekki kvarði: frábært lausnarhlutfall með einu alvarlegu atviki er fallið verkefni. Og talan núll er aðeins trúverðug ef sýnilegt er að einhver hafi verið að telja — þess vegna standa frávikin og næstum-atvikin við hliðina á henni, ekki falin.",
      haus: {
        id: "alvarleg_atvik",
        heiti: "Alvarleg atvik",
        gildi: num(s.alvarleg_atvik),
        undir: `${num(s.frvik)} skráð frávik alls, þar af ${num(s.frvik_naermiss)} næstum-atvik`,
        heimild: "konnun",
        stada: s.alvarleg_atvik > 0 ? "slakur" : s.frvik > 0 ? "godur" : "midlungs",
      },
      undir: [
        {
          id: "endurkomur", heiti: "Endurkomur innan 7 daga", gildi: pct(endurkomur),
          undir: endurkomur === null
            ? "Stofnunin keyrir fyrirspurnina sín megin og afhendir bara töluna — þá fer engin persónugreinanleg samkeyrsla fram og verkefnið helst gæðaeftirlit."
            : `${num(s.endurkomur_7d!)} endurkomur af ${num(s.erindi_leyst)} leystum. Besti öryggismælikvarðinn sem völ er á.`,
          heimild: "stofnun",
          vantar: endurkomur === null ? "Fyrirspurn keyrð hjá stofnun" : undefined,
        },
        {
          id: "visad_brad", heiti: "Brátt eftir síun", gildi: num(s.visad_brad),
          undir: "Vísað á bráðamóttöku eða 112 EFTIR að sjúklingur komst gegnum spurningalistann. Ekki venjuleg tilvísun heldur næstum-atvik síunarinnar — skarpasti öryggismælikvarðinn sem við eigum sjálf.",
          heimild: "medalia",
          stada: s.visad_brad === 0 ? "godur" : "midlungs",
        },
        {
          id: "stodvun", heiti: "Spurningalisti stöðvaði", gildi: pct(stodvunHlutf),
          undir: `${num(s.listi_stodvadur)} stöðvuð. Enginn síar sjúklinga klínískt fyrir fram og það er meðvitað — listinn gerir það, eins fyrir alla, í hvert skipti. Stöðvunartíðnin er sönnunin fyrir því að netið virki.`,
          heimild: "medalia",
          vantar: stodvunHlutf === null ? "Stöðvuð eyðublöð í útflutning" : undefined,
        },
        {
          id: "syklalyf", heiti: "Sýklalyf", gildi: pct(hlutfall(s.syklalyf, s.erindi_leyst)),
          undir: `${num(s.syklalyf)} af ${num(s.erindi_leyst)} leystum erindum. Fyrsta árásin á fjarþjónustu verður alltaf sú að þetta sé lyfseðlaafgreiðsla í dulargervi.`,
          heimild: "medalia",
        },
        {
          id: "lyfsedlar", heiti: "Lyfseðlar alls", gildi: pct(hlutfall(s.lyfsedlar, s.erindi_leyst)),
          undir: `${num(s.lyfsedlar)} erindi með lyfseðli. Víðari en sýklalyfin og sá samanburður sem heilsugæslan á sjálf.`,
          heimild: "medalia",
        },
      ],
    },

    // ── C. ÁLAGSLÉTTING ────────────────────────────────────────────────────
    {
      ...FLOKKAR[2],
      afHverju:
        "Talan sem borgar — stofnanir kaupa ekki betri þjónustu heldur mönnun. En hún verður að vera NETTÓ. Raunverulega áhættan er að þjónustan FÆRI vinnu frekar en að fjarlægja hana: hjúkrunarfræðingurinn þarf nú að meta erindið, útskýra nýja þjónustu, senda hlekk og taka við sjúklingnum aftur ef eitthvað fór úrskeiðis. Það er algengasta niðurstaðan í fjarþjónusturannsóknum og hún er ósýnileg í öllum gögnum sem byrja eftir að sjúklingur er kominn í Medalia.",
      forsenda: f.timamaeling_gerd
        ? `Nettó ${nettoMin} mín á erindi (${f.min_a_erindi} sparaðar − ${f.min_kostnadur_a_erindi} kostaðar), úr tímamælingu.`
        : `ÁGISKUN: ${f.min_a_erindi} mín á erindi og enginn mældur kostnaður á móti. Talan er brúttó þar til tímamælingin hefur verið framkvæmd — ekki nota hana í kynningu fyrr en.`,
      haus: {
        id: "frigjord_vinna",
        heiti: "Frigjörð vinna",
        gildi: s.erindi_leyst ? `${num(Math.round(klst))} klst` : null,
        undir: s.erindi_leyst
          ? `Um ${dagar.toFixed(1).replace(".", ",")} læknisdagar — ${(dagar / Math.max(s.manudir, 1)).toFixed(1).replace(".", ",")} á mánuði`
          : "Krefst leystra erinda",
        heimild: "afleitt",
        vantar: s.erindi_leyst ? undefined : "Medalia-útflutningur",
        stada: f.timamaeling_gerd ? undefined : "midlungs",
      },
      undir: [
        {
          id: "hlutdeild", heiti: "Hlutdeild í erindaflæði", gildi: pct(hlutdeild),
          undir: heildarflaedi === null
            ? "Nefnarinn er ekki hjá okkur og verður það aldrei — hann er í samskiptaskrá stofnunarinnar. Það er betra: þeirra gögn, samræmd á landsvísu, og enginn efast um þau."
            : `${num(s.erindi_alls)} af ${num(heildarflaedi)} samskiptum í sömu greiningarkóðum. Talan sem gerir allar hinar samanburðarhæfar.`,
          heimild: "stofnun",
          vantar: hlutdeild === null ? "Samskiptatölur frá stofnun" : undefined,
        },
        {
          id: "beinar", heiti: "Komu beint", gildi: pct(hlutfall(s.adkoma.beint, s.adkoma.alls)),
          undir: `${num(s.adkoma.beint)} af ${num(s.adkoma.alls)}. Sjúklingur sem kemur beint kostar stöðina núll mínútur — vaxandi hlutfall er sagan sjálf: þjónustan verður sjálfstæð og léttir æ meira á.`,
          heimild: "medalia",
          vantar: s.adkoma.alls ? undefined : "Sérslóðir á aðkomuleiðir",
        },
        {
          id: "afleysing", heiti: "Afleysingakostnaður", gildi: isk(s.afleysingakostn_isk),
          undir: "Rekstrarlínan sem við erum í raun að keppa við. Krefst sömu talna fyrir tímabilið á undan.",
          heimild: "stofnun",
          vantar: s.afleysingakostn_isk === null ? "Rekstrartölur frá stofnun" : undefined,
        },
        {
          id: "starfsm_hjukr", heiti: "Hjúkrunarfræðingar jákvæðir", gildi: pct(s.starfsm_hjukr_jakvaett),
          undir: "Þægindi eru ekki sami hlutur og álag. Þjónusta getur aukið þægindi OG álag — það er góð niðurstaða, en hana má ekki selja sem álagsléttingu.",
          heimild: "konnun",
          vantar: s.starfsm_hjukr_jakvaett === null ? "Starfsmannakönnun" : undefined,
        },
        {
          id: "starfsm_laeknar", heiti: "Læknar stofnunar jákvæðir", gildi: pct(s.starfsm_laeknar_jakvaett),
          undir: "Sérstakur hópur og ræður meiru um framhaldið en virðist: læknir á næstu stofnun spyr ekki stjórnendur hvernig gekk — hann spyr lækni á staðnum.",
          heimild: "konnun",
          vantar: s.starfsm_laeknar_jakvaett === null ? "Starfsmannakönnun" : undefined,
        },
      ],
    },

    // ── D. UPPLIFUN ────────────────────────────────────────────────────────
    {
      ...FLOKKAR[3],
      afHverju:
        "Ekki sama og virkni: kerfið getur virkað fullkomlega og upplifunin samt verið verri. Áreynsla er betur staðfest mælitæki en almenn ánægja og hún er áhugaverðari fyrir kaupanda — enginn kaupir „fólki fannst þetta ágætt“.",
      haus: {
        id: "einfaldleiki",
        heiti: "Sögðu ferlið einfalt",
        gildi: pct(s.konnun_einfalt),
        undir: s.konnun_svor
          ? `Af ${num(s.konnun_svor)} svörum` + (s.konnun_send ? ` (${hlutfall(s.konnun_svor, s.konnun_send)}% svarhlutfall)` : "")
          : "Engin svör enn",
        heimild: "konnun",
        vantar: s.konnun_einfalt === null ? "Þjónustukönnun" : undefined,
        stada: s.konnun_einfalt === null ? undefined : s.konnun_einfalt >= 85 ? "godur" : s.konnun_einfalt >= 70 ? "midlungs" : "slakur",
      },
      undir: [
        {
          id: "svartimi", heiti: "Svartími (miðgildi)",
          gildi: svartimi === null ? null : `${svartimi} mín`,
          undir: s.svartimi_p95_min !== null
            ? `95% svarað innan ${s.svartimi_p95_min} mín — loforðið er ${f.svartimi_markmid_min} mín`
            : `Loforðið er ${f.svartimi_markmid_min} mín. Það verður prófað upphátt á hverjum fundi.`,
          heimild: "medalia",
          vantar: svartimi === null ? "Medalia-útflutningur" : undefined,
          stada: svartimi === null ? undefined : svartimi <= f.svartimi_markmid_min / 2 ? "godur" : svartimi <= f.svartimi_markmid_min ? "midlungs" : "slakur",
        },
        {
          id: "heildartimi", heiti: "Heildartími til úrlausnar",
          gildi: s.heildartimi_midgildi_klst === null ? null : `${s.heildartimi_midgildi_klst} klst`,
          undir: "Frá því sjúklingur reyndi FYRST að ná sambandi. Inniheldur biðina í símanum og dagana þar til tími fannst — þar liggur raunverulegi ávinningurinn, og hann er margfalt stærri en okkar tvær klukkustundir.",
          heimild: "konnun",
          vantar: s.heildartimi_midgildi_klst === null ? "Spurning í könnun" : undefined,
        },
        {
          id: "annars_hvergi", heiti: "Hefðu annars sleppt því", gildi: pct(s.konnun_annars_hvergi),
          undir: "Hreinn aðgengisávinningur og sterkasta röksemdin fyrir markmiði 1. Verður að vera fastur svarmöguleiki, ekki frítexti — annars finnst hann aldrei.",
          heimild: "konnun",
          vantar: s.konnun_annars_hvergi === null ? "Spurning í könnun" : undefined,
        },
        {
          id: "aftur", heiti: "Myndu nota aftur", gildi: pct(s.konnun_aftur),
          undir: "Einfaldasta traustsmælingin og sú sem rataði alltaf í glærurnar.",
          heimild: "konnun",
          vantar: s.konnun_aftur === null ? "Þjónustukönnun" : undefined,
        },
        {
          id: "ferdir", heiti: "Ferðir sem féllu niður",
          gildi: s.ferdir_felldar === null ? null : num(s.ferdir_felldar),
          undir: "Í eyjabyggð er þetta áþreifanleg tala sem situr eftir í hausnum á fólki. Sett fram sem það sem sjúklingar sögðu sjálfir, aldrei sem staðreynd.",
          heimild: "konnun",
          vantar: s.ferdir_felldar === null ? "Spurning í könnun" : undefined,
        },
      ],
    },

    // ── E. YFIRFÆRANLEIKI ──────────────────────────────────────────────────
    {
      ...FLOKKAR[4],
      afHverju:
        "Vantaði í bæði markmiðin en er hvatinn að öllu verkefninu — Vestmannaeyjar eru tilraunastöð og spurningin er hvort þetta sé endurtakanlegt á næstu stöð. Þjónusta sem enginn nennir að manna er ekki yfirfæranleg, hversu góðar sem sjúklingatölurnar eru. Þetta er síðasta setningin í kynningunni og hún er sú sem selur.",
      haus: {
        id: "monnun",
        heiti: "Mönnun",
        gildi: pct(s.monnun_hlutfall),
        undir: s.monnun_hlutfall === null
          ? "Hlutfall daga þar sem þjónustan var mönnuð allan opnunartímann"
          : `${s.laeknar_virkir} læknar tóku vaktir${s.laeknar_haettu ? `, ${s.laeknar_haettu} hættu` : ""}`,
        heimild: "okkar",
        vantar: s.monnun_hlutfall === null ? "Vaktakerfi — hsu_shifts" : undefined,
        stada: s.monnun_hlutfall === null ? undefined : s.monnun_hlutfall >= 98 ? "godur" : s.monnun_hlutfall >= 90 ? "midlungs" : "slakur",
      },
      undir: [
        {
          id: "velta", heiti: "Starfsmannavelta lækna",
          gildi: s.laeknar_virkir ? pct(hlutfall(s.laeknar_haettu, s.laeknar_virkir)) : null,
          undir: `${num(s.laeknar_haettu)} af ${num(s.laeknar_virkir)} virkum. Alvöru mælikvarði á yfirfæranleika, ekki mjúkur.`,
          heimild: "okkar",
        },
        {
          id: "studningur", heiti: "Stuðningsspurningar frá stöð",
          gildi: num(s.studningsspurningar),
          undir: "Fallandi tala yfir tímabilið er beinlínis mælikvarði á að stöðin hafi orðið sjálfbjarga — nákvæmlega sagan sem næsta stofnun vill heyra.",
          heimild: "okkar",
        },
        {
          id: "uppitimi", heiti: "Uppitími", gildi: pct(s.uppitimi_hlutfall),
          undir: "Hlutfall opnunartíma án truflana. Í útboði er þetta ekki kostur heldur skilyrði.",
          heimild: "okkar",
          vantar: s.uppitimi_hlutfall === null ? "Vöktun" : undefined,
        },
        {
          id: "simtol", heiti: "Símtöl til stofnunar",
          gildi: s.simtol_stofnun === null ? null : num(s.simtol_stofnun),
          undir: "Þróun símtalamagns hjá stofnuninni sjálfri. Óbeinn en óháður mælikvarði á hvort eitthvað hafi raunverulega breyst.",
          heimild: "stofnun",
          vantar: s.simtol_stofnun === null ? "Rekstrartölur frá stofnun" : undefined,
        },
      ],
    },
  ];
}

/** Erindin ellefu með skilgreint umfang — ruslakistan og vottorð eru mæld sér.
 *  Röðin fylgir src/erindi.ts svo listinn getur ekki rekið frá vefnum. */
export const MAELD_ERINDI = erindi.filter((e) => e.slug !== "almenn-laeknisthjonusta" && e.slug !== "laeknisvottord");

export function erindiRadir(s: Samtala) {
  return MAELD_ERINDI.map((e) => {
    const t = s.erindi_sundurlidun[e.slug] ?? { alls: 0, leyst: 0, visad: 0 };
    return { slug: e.slug, titill: e.title, t, hlutfall: hlutfall(t.leyst, t.alls) };
  });
}

// ── Mánuðir ─────────────────────────────────────────────────────────────────

const MANADANOFN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];

export function manudurHeiti(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MANADANOFN[(m || 1) - 1]} ${y}`;
}

export function manudurISO(offset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
}

export function sidustuManudir(n: number): string[] {
  return Array.from({ length: n }, (_, i) => manudurISO(-(n - 1 - i)));
}
