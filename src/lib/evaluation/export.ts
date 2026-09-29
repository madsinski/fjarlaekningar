// Getting the evaluation out of the system.
//
// Three shapes, because three different people ask for it:
//
//   CSV       the raw monthly rows, for anyone who wants to check the working
//             or do their own analysis. Every claim should be traceable to it.
//   Report    a quarterly markdown draft with the figures already filled in.
//             Written quarterly on purpose — four of these plus a summary ARE
//             the annual report, and each one is a rehearsal at defending the
//             numbers in front of people who know the service. The one written
//             in a single sitting at the end is always worse.
//   Deck      slides generated into the presentations module, charts included,
//             then edited there like any other deck.
//
// Charts are drawn as SVG here rather than pulled from a library: they are
// small, they have to survive being uploaded as a file and rendered inside a
// slide, and a dependency that renders to canvas cannot do that on a server.

import type { Slide } from "@/lib/presentations/types";
import { results, enabledModules, type UploadedDoc } from "./programme";
import type { Assumptions, Programme } from "./types";
import { caseTypeRows, monthName, pct, type MonthRow, type Roster, type Totals } from "./totals";

/** Icelandic plural: singular after numbers ending in 1, except 11. */
const pl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

export type ExportContext = {
  t: Totals; roster: Roster; a: Assumptions;
  design?: import("./design").DesignState;
  codes?: import("./totals").CodeVolume;
};

// ── CSV ─────────────────────────────────────────────────────────────────────

/** Every stored column, in a stable order. Deliberately everything rather than
 *  the enabled modules' fields — the point of the raw export is that somebody
 *  can check a figure you did not think to include. */
export function toCSV(rows: MonthRow[]): string {
  if (!rows.length) return "station,month\n";
  const skip = new Set(["id", "entered_by", "created_at", "updated_at"]);
  const keys = Object.keys(rows[0]).filter((k) => !skip.has(k));
  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => cell((r as Record<string, unknown>)[k])).join(","))].join("\n") + "\n";
}

// ── Quarterly report ────────────────────────────────────────────────────────

export function toReport(
  programme: Programme,
  ctx: ExportContext,
  opts: { station: string; period: string; documents: UploadedDoc[] },
): string {
  const groups = results(programme, ctx);
  const rows = caseTypeRows(ctx.t);
  const lines: string[] = [];

  lines.push(`# Árangursmat þjónustunnar: ${opts.station}`);
  lines.push("");
  const nMods = enabledModules(programme).length;
  lines.push(`${opts.period} · gögn úr ${ctx.t.months} ${pl(ctx.t.months, "mánuði", "mánuðum")} · ${nMods} ${pl(nMods, "rannsóknarþáttur", "rannsóknarþættir")}`);
  lines.push("");
  lines.push(
    "> Allar tölur eru samantektartölur fyrir þjónustuna í heild. Engin lína í gögnunum á við einstakling. " +
    "Þess vegna er þetta gæðaverkefni samkvæmt lögum nr. 41/2007 en ekki vísindarannsókn.",
  );
  lines.push("");

  for (const { category, modules } of groups) {
    lines.push(`## ${category.name}`);
    lines.push("");
    lines.push(`*${category.question}*${category.gate ? " Skilyrði, ekki kvarði." : ""}`);
    lines.push("");
    for (const { module, values } of modules) {
      const head = values.find((v) => v.metric.headline) ?? values[0];
      lines.push(`### ${module.name}`);
      lines.push("");
      lines.push(`**${head.metric.name}: ${head.value.value ?? "Bíður gagna"}** — ${head.value.detail}`);
      lines.push("");
      if (head.value.assumption) lines.push(`*${head.value.assumption}*`, "");
      const rest = values.filter((v) => v !== head && v.value.value);
      if (rest.length) {
        for (const r of rest) lines.push(`- ${r.metric.name}: **${r.value.value}** — ${r.value.detail}`);
        lines.push("");
      }
      lines.push(`*Takmörkun:* ${module.caveat}`);
      lines.push("");
    }
  }

  const withData = rows.filter((r) => r.c.total);
  if (withData.length) {
    lines.push("## Eftir tegund erindis", "");
    lines.push("| Tegund erindis | Alls | Afgreitt | Vísað áfram | Hlutfall |");
    lines.push("|---|---:|---:|---:|---:|");
    for (const r of withData) {
      lines.push(`| ${r.name} | ${r.c.total} | ${r.c.resolved} | ${r.c.referred} | ${r.rate === null ? "—" : `${r.rate}%`}${r.c.total < 5 ? " ⚠︎" : ""} |`);
    }
    lines.push("");
    lines.push("⚠︎ Færri en fimm erindi. Tölur undir fimm eru ekki birtar: fella þarf þær út eða sameina áður en skýrslan fer út.");
    lines.push("");
  }

  lines.push("## Takmarkanir", "");
  lines.push(
    "Þetta er mat á þjónustu og framkvæmanleika á fáum stöðvum, ekki slembiröðuð rannsókn. " +
    "Þýðið er of lítið til að segja nokkuð um sjaldgæfa atburði. Styrkur verksins felst í því að hægt er " +
    "að rekja hvert erindi, ekki í fjölda þeirra. Tölur sem byggja á svörum fólks sjálfs eru merktar sem slíkar " +
    "hvar sem þær birtast.",
  );
  lines.push("");

  if (opts.documents.length) {
    lines.push("## Fylgiskjöl", "");
    for (const d of opts.documents) lines.push(`- ${d.filename} (${d.module_id}/${d.doc_id})`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Baseline request ────────────────────────────────────────────────────────

/**
 * The letter to send the institution asking for the "before" figures.
 *
 * Going live did not cost you the baseline: every contact the health centre
 * recorded is in Saga, coded, going back years, and can be pulled out
 * retrospectively whenever somebody runs the query. What expires is the
 * goodwill to run it and the memory of what else was happening that year.
 *
 * The one thing this asks for that people routinely get wrong is MONTHLY
 * counts rather than an annual total. A year lumped together can only say
 * "it was X before and Y after". Month by month shows whether the numbers
 * were already moving before you arrived — and a total cannot be broken back
 * down afterwards.
 */
export function baselineRequest(opts: {
  institution: string;
  liveStations: { name: string; goLive?: string }[];
  comparisonStations: string[];
  monthsBefore: number;
}): string {
  const first = opts.liveStations.map((s) => s.goLive).filter(Boolean).sort()[0];
  const from = (() => {
    if (!first) return "24 mánuðir áður en þjónustan hófst";
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() - opts.monthsBefore);
    return `${d.toISOString().slice(0, 7)} til ${first.slice(0, 7)}`;
  })();

  const L: string[] = [];
  L.push(`# Beiðni um gögn: árangursmat fjarþjónustunnar`);
  L.push("");
  L.push(`Til: ${opts.institution}`);
  L.push("");
  L.push(
    "Við metum fjarþjónustuna sem gæðaverkefni og viljum bera hana saman við stöðuna áður en hún hófst. " +
    "Allt sem hér er beðið um er þegar til í Sögu. Beiðnin snýst um að keyra fyrirspurn á gögn sem þið hafið " +
    "nú þegar, ekki að safna neinu nýju.",
  );
  L.push("");
  L.push("## Um hvað við biðjum");
  L.push("");
  L.push(`**Tímabil:** ${from}. Síðan sömu tölur í hverjum mánuði framvegis.`);
  L.push("");
  L.push(
    "**Eftir mánuðum, ekki samtala fyrir árið.** Þetta skiptir mestu. Með samtölu fyrir árið getum við aðeins " +
    "sagt „það var X fyrir og Y eftir“. Eftir mánuðum sjáum við hvort tölurnar voru þegar á hreyfingu áður en " +
    "við komum, og getum greint þar á milli. Samtölu er ekki hægt að brjóta niður eftir á.",
  );
  L.push("");
  L.push("**Stöðvar:**");
  for (const st of opts.liveStations) L.push(`- ${st.name}${st.goLive ? `: þjónustan hófst ${st.goLive}` : ""}`);
  if (opts.comparisonStations.length) {
    L.push("");
    L.push(
      "Einnig, og það er mikilvægt, sömu tölur fyrir stöðvar sem **ekki** eru með þjónustuna. Þær eru samanburðarstöðvar. " +
      "Ef tölurnar okkar breytast en þeirra ekki á sömu mánuðum er þjónustan líklegasta skýringin. " +
      "Stöð nýtist ekki lengur til samanburðar um leið og hún fær þjónustuna. Því fyrr sem þetta byrjar, því betra:",
    );
    for (const st of opts.comparisonStations) L.push(`- ${st}`);
  }
  L.push("");
  L.push("## Tölurnar, fyrir hverja stöð í hverjum mánuði");
  L.push("");
  L.push("1. **Fjöldi koma** með greiningarkóðana sem taldir eru upp hér að neðan. Þetta er aðaltalan.");
  L.push("2. **Útgefnir lyfseðlar** með sömu kóðum, og **hve margir voru fyrir sýklalyf**. Þá getum við borið ávísanir okkar saman við ykkar ávísanir.");
  L.push("3. **Hlutfall bókaðra tíma þar sem sjúklingur mætti ekki**, í sambærilegum tímum.");
  L.push("4. **Símtöl** til stöðvarinnar, ef þau eru skráð.");
  L.push("5. **Kostnaður við afleysingar**, eftir mánuðum.");
  L.push("");
  L.push("## Greiningarkóðar");
  L.push("");
  L.push(
    "Umsamdir ICD-10 kóðar fyrir hverja tegund erindis fylgja í sérstöku skjali. Ef það hentar ykkur er " +
    "fjöldi fyrir hvern kóða gagnlegri fyrir okkur en fjöldi fyrir hverja tegund erindis. Við getum flokkað kóðana sjálf. " +
    "Með nákvæmari tölum getum við svarað spurningum síðar án þess að leita aftur til ykkar.",
  );
  L.push("");
  L.push("## Það sem við biðjum ekki um");
  L.push("");
  L.push(
    "**Við biðjum aðeins um fjölda, engin gögn um einstaka sjúklinga.** Engar kennitölur, engir fæðingardagar, " +
    "enginn frjáls texti og ekkert nákvæmara en mánuður. Á stöð með nokkur þúsund íbúa getur dagsetning bent á einstakling, " +
    "fjöldi í mánuði ekki. Þetta er með vilja gert. Þannig er verkið gæðaverkefni samkvæmt lögum nr. 41/2007 " +
    "en ekki vísindarannsókn, og þarf því hvorki upplýst samþykki sjúklinga né leyfi Vísindasiðanefndar. " +
    "Tölur undir fimm eru ekki birtar: fellið út eða sameinið hvern reit með færri en fimm erindum.",
  );
  L.push("");
  L.push("## Ein fyrirspurn sem við biðjum ykkur að keyra sjálf");
  L.push("");
  L.push(
    "Hve margir sjúklingar fjarþjónustunnar komu til ykkar innan sjö daga með skyldan vanda. " +
    "Þetta er besti öryggismælikvarðinn sem við höfum. En til að para saman skrárnar tvær þyrfti að tengja " +
    "persónugreinanleg gögn milli tveggja stofnana. Ef þið keyrið fyrirspurnina hjá ykkur og sendið okkur aðeins " +
    "fjöldann fer ekkert persónugreinanlegt á milli og verkið helst gæðaverkefni.",
  );
  L.push("");
  return L.join("\n");
}

// ── Charts ──────────────────────────────────────────────────────────────────

const PALETTE = ["#0891b2", "#7c3aed", "#e11d48", "#d97706", "#059669"];

function svgShell(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="system-ui,-apple-system,Segoe UI,sans-serif"><rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;
}

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

/** Monthly case volume with the resolved share stacked inside it. One chart
 *  answering both "is it growing" and "is it working", which is what a reader
 *  actually wants from the first slide. */
export function volumeChart(rows: MonthRow[]): string {
  const byMonth = new Map<string, { total: number; resolved: number }>();
  for (const r of rows) {
    const m = byMonth.get(r.month) ?? { total: 0, resolved: 0 };
    m.total += r.cases_total; m.resolved += r.cases_resolved;
    byMonth.set(r.month, m);
  }
  const data = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (!data.length) return svgShell(900, 420, `<text x="450" y="210" text-anchor="middle" fill="#94a3b8" font-size="18">Engin gögn enn</text>`);

  const W = 900, H = 420, padL = 60, padB = 56, padT = 32, padR = 24;
  const max = Math.max(...data.map(([, v]) => v.total), 1);
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const bw = Math.min(64, (plotW / data.length) * 0.62);

  let body = "";
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH / 4) * i;
    const value = Math.round(max - (max / 4) * i);
    body += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    body += `<text x="${padL - 10}" y="${y + 4}" text-anchor="end" fill="#94a3b8" font-size="12">${value}</text>`;
  }
  data.forEach(([month, v], i) => {
    const cx = padL + (plotW / data.length) * (i + 0.5);
    const x = cx - bw / 2;
    const th = (v.total / max) * plotH;
    const rh = (v.resolved / max) * plotH;
    body += `<rect x="${x}" y="${padT + plotH - th}" width="${bw}" height="${th}" rx="4" fill="#cbd5e1"/>`;
    body += `<rect x="${x}" y="${padT + plotH - rh}" width="${bw}" height="${rh}" rx="4" fill="${PALETTE[0]}"/>`;
    body += `<text x="${cx}" y="${H - padB + 20}" text-anchor="middle" fill="#64748b" font-size="12">${esc(monthName(month).slice(0, 3))}</text>`;
    body += `<text x="${cx}" y="${padT + plotH - th - 8}" text-anchor="middle" fill="#334155" font-size="12" font-weight="600">${v.total}</text>`;
  });
  body += `<rect x="${padL}" y="${H - 22}" width="11" height="11" rx="2" fill="${PALETTE[0]}"/><text x="${padL + 17}" y="${H - 12}" fill="#475569" font-size="12">Afgreitt í fjarþjónustu</text>`;
  body += `<rect x="${padL + 190}" y="${H - 22}" width="11" height="11" rx="2" fill="#cbd5e1"/><text x="${padL + 207}" y="${H - 12}" fill="#475569" font-size="12">Vísað áfram</text>`;
  return svgShell(W, H, body);
}

/** Resolution rate per case type. The table that stops anyone claiming a single
 *  aggregate rate means the service works across the board. */
export function caseTypeChart(t: Totals): string {
  const rows = caseTypeRows(t).filter((r) => r.c.total > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  if (!rows.length) return svgShell(900, 420, `<text x="450" y="210" text-anchor="middle" fill="#94a3b8" font-size="18">Engin gögn um erindi enn</text>`);

  const rowH = 30, padL = 250, padR = 80, padT = 28;
  const H = padT + rows.length * rowH + 24, W = 900;
  const plotW = W - padL - padR;

  let body = "";
  rows.forEach((r, i) => {
    const y = padT + i * rowH;
    const rate = r.rate ?? 0;
    const thin = r.c.total < 5;
    const colour = thin ? "#cbd5e1" : rate >= 80 ? "#059669" : rate >= 60 ? "#d97706" : "#e11d48";
    body += `<text x="${padL - 12}" y="${y + 16}" text-anchor="end" fill="#334155" font-size="13">${esc(r.name)}</text>`;
    body += `<rect x="${padL}" y="${y + 5}" width="${plotW}" height="16" rx="8" fill="#f1f5f9"/>`;
    body += `<rect x="${padL}" y="${y + 5}" width="${Math.max(2, (rate / 100) * plotW)}" height="16" rx="8" fill="${colour}"/>`;
    body += `<text x="${W - padR + 10}" y="${y + 18}" fill="#475569" font-size="12">${rate}%${thin ? " ·  n<5" : ""} (${r.c.total})</text>`;
  });
  return svgShell(W, H, body);
}

/** Entry route mix. Direct arrivals cost the health centre nothing, so a
 *  growing left-hand band is the workload story in one picture. */
export function entryChart(t: Totals): string {
  const parts: [string, number][] = [
    ["Kom beint", t.entry.direct],
    ["Vísað af starfsfólki heilsugæslu", t.entry.viaStaff],
  ];
  const total = t.entry.total;
  if (!total) return svgShell(900, 200, `<text x="450" y="100" text-anchor="middle" fill="#94a3b8" font-size="18">Engin gögn um leiðir inn enn</text>`);

  const W = 900, H = 200, padL = 40, barY = 56, barH = 48;
  const plotW = W - padL * 2;
  let x = padL, body = "";
  parts.forEach(([label, v], i) => {
    if (!v) return;
    const w = (v / total) * plotW;
    body += `<rect x="${x}" y="${barY}" width="${w}" height="${barH}" fill="${PALETTE[i % PALETTE.length]}"/>`;
    if (w > 70) body += `<text x="${x + w / 2}" y="${barY + 30}" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="600">${pct(v, total)}%</text>`;
    body += `<rect x="${padL + i * 170}" y="${H - 34}" width="11" height="11" rx="2" fill="${PALETTE[i % PALETTE.length]}"/>`;
    body += `<text x="${padL + i * 170 + 17}" y="${H - 24}" fill="#475569" font-size="12">${esc(label)}</text>`;
    x += w;
  });
  return svgShell(W, H, body);
}

// ── Deck ────────────────────────────────────────────────────────────────────

export type ChartUrls = { volume?: string; caseTypes?: string; entry?: string };

/**
 * Slides from the evaluation, ready to edit in the presentations module.
 *
 * Deliberately opinionated about order: the headline claim, then the evidence,
 * then the limitations — with limitations included rather than left out. An
 * audience that hears the limitations from you owns none of the discussion
 * afterwards; one that spots them itself owns all of it.
 */
export function toSlides(
  programme: Programme,
  ctx: ExportContext,
  opts: { station: string; period: string; charts: ChartUrls },
): Slide[] {
  const groups = results(programme, ctx);
  const slides: Slide[] = [];
  const id = (s: string) => `eval-${s}-${Math.random().toString(36).slice(2, 8)}`;

  slides.push({
    id: id("title"), type: "title", theme: "dark", brand: "fjarlaekningar",
    kicker: "Árangursmat",
    heading: `Fjarlækningar: ==${opts.station}==`,
    lead: `${opts.period} · gögn úr ${ctx.t.months} ${pl(ctx.t.months, "mánuði", "mánuðum")}`,
    notes: "Allar tölur eru samantektartölur fyrir þjónustuna í heild. Ekkert í gögnunum bendir á sjúkling. Þess vegna er þetta gæðaverkefni en ekki vísindarannsókn.",
  });

  const tops = groups
    .map((g) => {
      const v = g.modules.flatMap((m) => m.values).find((x) => x.metric.headline && x.value.value);
      return v ? { value: v.value.value!, label: `${g.category.name} · ${v.metric.name}` } : null;
    })
    .filter((x): x is { value: string; label: string } => !!x);

  if (tops.length) {
    slides.push({
      id: id("stats"), type: "stats", theme: "light", brand: "fjarlaekningar",
      kicker: "Lykiltölur", heading: "Það sem við getum sagt í dag",
      stats: tops.slice(0, 4),
      footnote: "Ein tala fyrir hvern flokk. Öryggi er skilyrði, ekki kvarði. Góð tala annars staðar vegur ekki upp á móti því.",
    });
  }

  if (opts.charts.volume) {
    slides.push({
      id: id("volume"), type: "hero-image", theme: "light", brand: "fjarlaekningar",
      kicker: "Fjöldi", heading: "Erindi á mánuði, afgreidd og vísað áfram",
      image: opts.charts.volume,
      lead: "Litaði hluti hverrar súlu sýnir erindi sem voru afgreidd að fullu í fjarþjónustu.",
    });
  }

  if (opts.charts.caseTypes) {
    slides.push({
      id: id("types"), type: "hero-image", theme: "light", brand: "fjarlaekningar",
      kicker: "Eftir tegund erindis", heading: "Hlutfall afgreiddra erinda eftir tegund",
      image: opts.charts.caseTypes,
      lead: "Heildarhlutfallið getur falið það þegar þrjár tegundir erinda bera hinar uppi. Súlur merktar n<5 byggja á of fáum erindum til að lesa í þær.",
    });
  }

  if (opts.charts.entry) {
    slides.push({
      id: id("entry"), type: "hero-image", theme: "light", brand: "fjarlaekningar",
      kicker: "Leiðir inn", heading: "Hvernig sjúklingar komu í þjónustuna",
      image: opts.charts.entry,
      lead: "Sjúklingur sem kemur beint kostar heilsugæsluna ekkert. Vaxandi hlutfall beinna koma sýnir að þjónustan stendur á eigin fótum.",
    });
  }

  for (const { category, modules } of groups) {
    const cards = modules
      .map((m) => {
        const head = m.values.find((v) => v.metric.headline) ?? m.values[0];
        return head?.value.value
          ? { icon: "activity", title: `${m.module.name}: ${head.value.value}`, body: head.value.detail }
          : null;
      })
      .filter((c): c is { icon: string; title: string; body: string } => !!c);
    if (!cards.length) continue;

    slides.push({
      id: id(category.id), type: "cards", theme: "light", brand: "fjarlaekningar",
      kicker: category.name, heading: category.question,
      lead: category.note,
      cards, columns: cards.length > 2 ? 2 : 1,
      notes: modules.map((m) => `${m.module.name}. Takmörkun: ${m.module.caveat}`).join("\n\n"),
    });
  }

  slides.push({
    id: id("limits"), type: "checklist", theme: "light", brand: "fjarlaekningar",
    kicker: "Lestu þetta fyrst", heading: "Það sem matið getur ==ekki== sýnt",
    items: [
      "Mat á þjónustu og framkvæmanleika á fáum stöðvum, ekki slembiröðuð rannsókn.",
      "Þýðið er of lítið til að segja nokkuð um sjaldgæfa atburði.",
      "Svör fólks sýna hvað það telur að það hefði gert, ekki hvað það hefði í raun gert.",
      "Styrkurinn felst í því að hægt er að rekja hvert erindi, ekki í fjölda erinda.",
    ],
    footnote: "Þetta kemur fyrst, með vilja. Sá sem nefnir takmarkanirnar sjálfur stýrir umræðunni á eftir.",
    columns: 1,
  });

  slides.push({
    id: id("closing"), type: "closing", theme: "dark", brand: "fjarlaekningar",
    heading: "Næsta skref",
    tagline: "Spurningin er ekki hvort þetta virkaði hér. Hún er hvort hægt sé að endurtaka það.",
    notes: "Endaðu á yfirfærslu: hve marga daga tekur að opna stöð, hve margar klukkustundir starfsfólk hennar þarf að leggja til, og hvað næsta stöð þarf ekki að endurtaka.",
  });

  return slides;
}
