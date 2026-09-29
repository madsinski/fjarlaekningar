"use client";

// The dashboard.
//
// Grouped by what each figure PROVES, where data entry is grouped by where the
// number comes from. Same underlying set, two orderings, neither wrong in its
// place.
//
// Two categories are marked as gates rather than scales: safety and
// scalability. They do not average out against a good number somewhere else,
// and the page says so rather than leaving it to be inferred from the colour.

import { Info, TriangleAlert } from "lucide-react";
import { results } from "@/lib/evaluation/programme";
import type { MetricContext, Programme } from "@/lib/evaluation/types";
import { caseTypeRows, pct } from "@/lib/evaluation/totals";
import { GATES } from "@/lib/evaluation/exclusions";
import { ACCENT, Chip, STATUS_RING, card, Plain, pl } from "./ui";

export default function Results({ programme, ctx }: { programme: Programme; ctx: MetricContext }) {
  // The whole context, not just the totals: diagnosis codes against the Saga
  // baseline and the design live outside `t`.
  const { t } = ctx;
  const groups = results(programme, ctx);
  const showCaseTypes = groups.some((g) => g.modules.some((m) => m.module.id === "case-mix" || m.module.id === "resolution"));
  const showGeneral = groups.some((g) => g.modules.some((m) => m.module.id === "scope-discovery"));
  const rows = caseTypeRows(t);

  return (
    <div className="space-y-6">
      {groups.map(({ category, modules }) => {
        const accent = ACCENT[category.id];
        return (
          <section key={category.id}>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-bold text-slate-900">{category.name}</h2>
              <span className="text-sm text-slate-500">{category.question}</span>
              {category.gate && <Chip className="bg-slate-800 text-white">Skilyrði</Chip>}
            </div>
            <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500"><Plain>{category.note}</Plain></p>

            <div className="space-y-3">
              {modules.map(({ module, values }) => {
                const head = values.find((v) => v.metric.headline) ?? values[0];
                const rest = values.filter((v) => v !== head);
                return (
                  <div key={module.id} className={`relative overflow-hidden ${card}`}>
                    <div className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
                    <div className="grid gap-4 py-4 pl-5 pr-4 lg:grid-cols-[minmax(0,250px)_1fr]">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {module.name}
                        </p>
                        <div className={`rounded-lg border p-3 ${head.value.status ? STATUS_RING[head.value.status] : "border-slate-200 bg-slate-50"}`}>
                          <p className="text-xs font-medium text-slate-600">{head.metric.name}</p>
                          <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">
                            {head.value.value ?? <span className="text-lg font-medium text-slate-400">Bíður gagna</span>}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-slate-600"><Plain>{head.value.detail}</Plain></p>
                          {head.value.missing && (
                            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-cyan-700">
                              <Info className="h-3 w-3" /> Vantar: {head.value.missing}
                            </p>
                          )}
                        </div>
                        {head.value.assumption && (
                          <p className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
                            head.value.assumption.startsWith("ESTIMATE")
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}>
                            <Plain>{head.value.assumption}</Plain>
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs leading-relaxed text-slate-600"><Plain>{head.metric.why}</Plain></p>
                        {rest.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {rest.map(({ metric, value }) => (
                              <div key={metric.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                <p className="text-xs font-medium text-slate-600">{metric.name}</p>
                                <p className="text-lg font-semibold text-slate-900">
                                  {value.value ?? <span className="text-sm font-medium text-slate-400">—</span>}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-snug text-slate-500"><Plain>{value.detail}</Plain></p>
                                {value.missing && <p className="mt-1 text-[11px] font-medium text-cyan-700">Vantar: {value.missing}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {!groups.length && (
        <div className={`${card} flex items-center gap-3 p-6`}>
          <TriangleAlert className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-slate-600">Engir rannsóknarþættir valdir. Byrjaðu í skrefinu <strong>Rannsóknarþættir</strong>.</p>
        </div>
      )}

      {showCaseTypes && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">Erindaflokkarnir ellefu</h2>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Heildarhlutfallið getur falið veika flokka ef þrír sterkir bera hina átta. Markmiðið er ekki ellefu
            flokkar yfir 95%, því það trúir enginn. Markmiðið er tafla sem stenst skoðun: veiku flokkarnir sjást og
            þú getur sagt hvað var gert til að bæta þá.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-semibold">Erindaflokkur</th>
                  <th className="px-2 py-2 text-right font-semibold">Alls</th>
                  <th className="px-2 py-2 text-right font-semibold">Afgreitt</th>
                  <th className="px-2 py-2 text-right font-semibold">Vísað áfram</th>
                  <th className="py-2 pl-2 text-right font-semibold">Afgreiðsluhlutfall</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 text-slate-800">{r.name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.c.total || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.c.resolved || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.c.referred || "—"}</td>
                    <td className="py-1.5 pl-2 text-right">
                      {r.rate === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          r.c.total < 5 ? "bg-slate-100 text-slate-500"
                            : r.rate >= 80 ? "bg-emerald-100 text-emerald-800"
                            : r.rate >= 60 ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {r.rate}%{r.c.total < 5 && " · fá"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Grá hlutföll byggja á færri en fimm erindum. Tölur undir fimm eru ekki birtar: sameinaðu flokka eða
            slepptu tölunum í öllu sem fer út fyrir stofnunina.
          </p>
        </section>
      )}

      {showGeneral && t.generalUnresolved.length > 0 && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">Almenn læknisþjónusta: hvað var ekki afgreitt</h2>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Hér leynast næstu erindaflokkar, númer tólf, þrettán og fjórtán. Þessi listi vísar veginn: <em>við
            byrjuðum með ellefu og gögnin sögðu okkur hverjir næstu þrír ættu að vera.</em>
          </p>
          <ul className="space-y-1">
            {t.generalUnresolved.map((f) => (
              <li key={f.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="text-slate-700">{f.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{f.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {t.exclusions.total > 0 && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">Vísað frá vegna rauðra flagga</h2>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Síurnar tvær segja ólíka hluti. Spurningalistinn kostar lítið og er alltaf eins. Þegar læknir vísar
            frá er það dýrt, því sjúklingurinn hefur þegar beðið. Spurningalistinn hefði líklega átt að grípa hvert
            slíkt erindi.
          </p>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {GATES.map((g) => {
              const count = g.id === "form" ? t.exclusions.form : t.exclusions.clinician;
              return (
                <div key={g.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-600">{g.name}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {count} <span className="text-sm font-medium text-slate-400">({pct(count, t.exclusions.total)}%)</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500"><Plain>{g.note}</Plain></p>
                </div>
              );
            })}
          </div>

          {t.exclusions.leaks.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                {t.exclusions.leaks.length} {pl(t.exclusions.leaks.length, "ástæða", "ástæður")} sem spurningalistinn hefði átt að grípa
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                Hver þeirra er gat í spurningalistanum, ekki matsatriði. Lagaðu listann og þá styttist þessi listi
                í næsta mánuði. Til þess er ástæðunum safnað.
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-amber-900">
                {t.exclusions.leaks.map((l) => (
                  <li key={l.reason.id}>
                    <strong>{l.reason.name}</strong> — {l.count} {pl(l.count, "komst", "komust")} alla leið til læknis. <Plain>{l.reason.note}</Plain>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-semibold">Ástæða</th>
                  <th className="px-2 py-2 text-right font-semibold">Spurningalisti</th>
                  <th className="px-2 py-2 text-right font-semibold">Læknir</th>
                  <th className="py-2 pl-2 text-right font-semibold">Alls</th>
                </tr>
              </thead>
              <tbody>
                {t.exclusions.byReason.map((r) => {
                  const leaking = r.reason.expected === "form" && r.clinician > 0;
                  return (
                    <tr key={r.reason.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-2 text-slate-800">
                        {r.reason.name}
                        {leaking && <Chip className="ml-1.5 bg-amber-100 text-amber-800">lekur</Chip>}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.form || "—"}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${leaking ? "font-semibold text-amber-700" : "text-slate-600"}`}>
                        {r.clinician || "—"}
                      </td>
                      <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-slate-900">{r.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Hér teljast aðeins þeir sem komust inn í gáttina. Þeir sem hjúkrunarfræðingur eða móttökuritari vísaði
            frá áður sjást ekki hér og munu aldrei sjást. Leiðirnar inn eru fjórar og enginn telur við dyrnar.
          </p>
        </section>
      )}

      {t.entry.total > 0 && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">Hvernig sjúklingar komu til okkar</h2>
          <p className="mb-3 max-w-3xl text-sm text-slate-600">
            Sjúklingur sem kemur beint í þjónustuna kostar heilsugæsluna ekkert: ekkert símtal, engar útskýringar,
            engin tilvísun. Því lengri sem græna súlan verður, því betur stendur þjónustan á eigin fótum.
          </p>
          <div className="flex h-4 overflow-hidden rounded-full">
            <div className="bg-emerald-500" style={{ width: `${(t.entry.direct / t.entry.total) * 100}%` }} />
            <div className="bg-cyan-500" style={{ width: `${(t.entry.viaStaff / t.entry.total) * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Komu beint: {pct(t.entry.direct, t.entry.total)}% ({t.entry.direct})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              Vísað af starfsfólki heilsugæslunnar: {pct(t.entry.viaStaff, t.entry.total)}% ({t.entry.viaStaff})
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
