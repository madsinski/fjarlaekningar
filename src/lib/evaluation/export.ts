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

export type ExportContext = { t: Totals; roster: Roster; a: Assumptions };

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

  lines.push(`# Service evaluation — ${opts.station}`);
  lines.push("");
  lines.push(`${opts.period} · ${ctx.t.months} month${ctx.t.months === 1 ? "" : "s"} of data · ${enabledModules(programme).length} modules`);
  lines.push("");
  lines.push(
    "> All figures are aggregates at service level. No row in the underlying data is a person, " +
    "which is what keeps this quality assurance under the Directorate of Health Act rather than research.",
  );
  lines.push("");

  for (const { category, modules } of groups) {
    lines.push(`## ${category.name}`);
    lines.push("");
    lines.push(`*${category.question}*${category.gate ? " — a gate, not a scale." : ""}`);
    lines.push("");
    for (const { module, values } of modules) {
      const head = values.find((v) => v.metric.headline) ?? values[0];
      lines.push(`### ${module.name}`);
      lines.push("");
      lines.push(`**${head.metric.name}: ${head.value.value ?? "not yet reporting"}** — ${head.value.detail}`);
      lines.push("");
      if (head.value.assumption) lines.push(`*${head.value.assumption}*`, "");
      const rest = values.filter((v) => v !== head && v.value.value);
      if (rest.length) {
        for (const r of rest) lines.push(`- ${r.metric.name}: **${r.value.value}** — ${r.value.detail}`);
        lines.push("");
      }
      lines.push(`*Limitation:* ${module.caveat}`);
      lines.push("");
    }
  }

  const withData = rows.filter((r) => r.c.total);
  if (withData.length) {
    lines.push("## By case type", "");
    lines.push("| Case type | Total | Resolved | Referred | Rate |");
    lines.push("|---|---:|---:|---:|---:|");
    for (const r of withData) {
      lines.push(`| ${r.name} | ${r.c.total} | ${r.c.resolved} | ${r.c.referred} | ${r.rate === null ? "—" : `${r.rate}%`}${r.c.total < 5 ? " ⚠︎" : ""} |`);
    }
    lines.push("");
    lines.push("⚠︎ fewer than five cases — suppress or combine before this leaves the building.");
    lines.push("");
  }

  lines.push("## Limitations", "");
  lines.push(
    "This is a feasibility and service evaluation at a small number of sites, not a randomised trial. " +
    "The population is too small to say anything about rare events, and the strength of the work is that " +
    "every case is traceable — not the number of them. Self-reported figures are labelled as such wherever " +
    "they appear.",
  );
  lines.push("");

  if (opts.documents.length) {
    lines.push("## Supporting documents", "");
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
    if (!first) return "the 24 months before the service started";
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() - opts.monthsBefore);
    return `${d.toISOString().slice(0, 7)} to ${first.slice(0, 7)}`;
  })();

  const L: string[] = [];
  L.push(`# Data request — evaluation of the remote service`);
  L.push("");
  L.push(`To: ${opts.institution}`);
  L.push("");
  L.push(
    "We are evaluating the remote service as a quality-assurance project and would like to compare it against " +
    "how things were beforehand. Everything below already exists in Saga — this is a request to run a query " +
    "over records you already hold, not to collect anything new.",
  );
  L.push("");
  L.push("## What we are asking for");
  L.push("");
  L.push(`**Period:** ${from}, and then the same figures each month going forward.`);
  L.push("");
  L.push(
    "**Monthly, please — not a yearly total.** This is the one thing that matters most in how the request is " +
    "filled. With a year lumped together we can only say \"it was X before and Y after\". Month by month we can " +
    "see whether your numbers were already moving before we arrived, and separate the two. A total cannot be " +
    "broken back down afterwards.",
  );
  L.push("");
  L.push("**Stations:**");
  for (const st of opts.liveStations) L.push(`- ${st.name}${st.goLive ? ` — service started ${st.goLive}` : ""}`);
  if (opts.comparisonStations.length) {
    L.push("");
    L.push(
      "And, importantly, the same figures for stations **not** running the service. They act as a comparison: " +
      "if our numbers move and theirs do not over the same months, the service is the likeliest explanation. " +
      "A station stops being useful for this the day it gets the service, so the sooner these start the better:",
    );
    for (const st of opts.comparisonStations) L.push(`- ${st}`);
  }
  L.push("");
  L.push("## The figures, per station per month");
  L.push("");
  L.push("1. **Number of contacts** in the diagnosis codes listed below — the core figure.");
  L.push("2. **Prescriptions issued** in those same codes, and **how many were antibiotics**. This lets us show our prescribing against yours rather than against nothing.");
  L.push("3. **Did-not-attend rate** for comparable appointments.");
  L.push("4. **Telephone contacts** to the station, if that is recorded.");
  L.push("5. **Spend on locum and temporary cover**, monthly.");
  L.push("");
  L.push("## Diagnosis codes");
  L.push("");
  L.push(
    "The agreed ICD-10 code set for each of our case types is attached separately. If it is easier at your end, " +
    "a count per individual code is more useful to us than a count per case type — we can group them ourselves, " +
    "and having the detail means we can answer questions later without coming back to you.",
  );
  L.push("");
  L.push("## What we are not asking for");
  L.push("");
  L.push(
    "**Counts only. No patient-level data of any kind** — no ID numbers, no dates of birth, no free text, and " +
    "nothing finer than a month. A date at a station of a few thousand people can identify someone; a monthly " +
    "count cannot. That is deliberate: it keeps this within quality assurance under the Directorate of Health " +
    "Act rather than turning it into research, which is why it needs neither patient consent nor an ethics " +
    "committee. Please suppress or combine any cell with fewer than five cases.",
  );
  L.push("");
  L.push("## One query we would ask you to run yourselves");
  L.push("");
  L.push(
    "For patients seen by the remote service, how many returned to you within seven days with a related problem. " +
    "This is the single best safety measure available to us, but matching the two sets of records would mean " +
    "linking identifiable data across two organisations. If you run the query at your end and send us only the " +
    "count, nothing identifiable crosses between us and the project stays quality assurance.",
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
  if (!data.length) return svgShell(900, 420, `<text x="450" y="210" text-anchor="middle" fill="#94a3b8" font-size="18">No data yet</text>`);

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
  body += `<rect x="${padL}" y="${H - 22}" width="11" height="11" rx="2" fill="${PALETTE[0]}"/><text x="${padL + 17}" y="${H - 12}" fill="#475569" font-size="12">Resolved remotely</text>`;
  body += `<rect x="${padL + 150}" y="${H - 22}" width="11" height="11" rx="2" fill="#cbd5e1"/><text x="${padL + 167}" y="${H - 12}" fill="#475569" font-size="12">Referred onward</text>`;
  return svgShell(W, H, body);
}

/** Resolution rate per case type. The table that stops anyone claiming a single
 *  aggregate rate means the service works across the board. */
export function caseTypeChart(t: Totals): string {
  const rows = caseTypeRows(t).filter((r) => r.c.total > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  if (!rows.length) return svgShell(900, 420, `<text x="450" y="210" text-anchor="middle" fill="#94a3b8" font-size="18">No case data yet</text>`);

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
    ["Came directly", t.entry.direct],
    ["Sent by health centre staff", t.entry.viaStaff],
  ];
  const total = t.entry.total;
  if (!total) return svgShell(900, 200, `<text x="450" y="100" text-anchor="middle" fill="#94a3b8" font-size="18">No entry-route data yet</text>`);

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
    kicker: "Service evaluation",
    heading: `Fjarlækningar at ==${opts.station}==`,
    lead: `${opts.period} · ${ctx.t.months} month${ctx.t.months === 1 ? "" : "s"} of data`,
    notes: "Every figure is an aggregate at service level. Nothing in the underlying data identifies a patient — that is what keeps this quality assurance rather than research.",
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
      kicker: "Headline", heading: "What we can say today",
      stats: tops.slice(0, 4),
      footnote: "One figure per category. Safety and scalability are gates, not scales — they do not average out against a good number elsewhere.",
    });
  }

  if (opts.charts.volume) {
    slides.push({
      id: id("volume"), type: "hero-image", theme: "light", brand: "fjarlaekningar",
      kicker: "Volume", heading: "Cases per month, resolved and referred",
      image: opts.charts.volume,
      lead: "The coloured part of each bar closed entirely in the remote service.",
    });
  }

  if (opts.charts.caseTypes) {
    slides.push({
      id: id("types"), type: "hero-image", theme: "light", brand: "fjarlaekningar",
      kicker: "By case type", heading: "Resolution rate, case type by case type",
      image: opts.charts.caseTypes,
      lead: "The aggregate rate hides it when three case types carry the rest. Bars marked n<5 are too thin to read anything into.",
    });
  }

  if (opts.charts.entry) {
    slides.push({
      id: id("entry"), type: "hero-image", theme: "light", brand: "fjarlaekningar",
      kicker: "Entry routes", heading: "How patients reached the service",
      image: opts.charts.entry,
      lead: "A patient who arrives directly costs the health centre nothing. A growing direct share is the service becoming self-sufficient.",
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
      notes: modules.map((m) => `${m.module.name} — limitation: ${m.module.caveat}`).join("\n\n"),
    });
  }

  slides.push({
    id: id("limits"), type: "checklist", theme: "light", brand: "fjarlaekningar",
    kicker: "Read this first", heading: "What this evaluation ==cannot== show",
    items: [
      "A feasibility and service evaluation at a small number of sites — not a randomised trial.",
      "The population is too small to say anything about rare events.",
      "Self-reported figures are what people say they would have done, not what they would have done.",
      "Its strength is that every case is traceable, not the number of cases.",
    ],
    footnote: "Stated first, on purpose. Whoever names the limitations owns the discussion that follows.",
    columns: 1,
  });

  slides.push({
    id: id("closing"), type: "closing", theme: "dark", brand: "fjarlaekningar",
    heading: "Next",
    tagline: "The question is not whether it worked here. It is whether it repeats.",
    notes: "Close on transferability: days to open a site, hours of their staff's time, and what the second site would not have to repeat.",
  });

  return slides;
}
