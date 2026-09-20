// Everything the interface shows is derived from the enabled module set.
//
// Nothing here is a second list that has to be kept in step with the modules:
// the data-entry fields, the documents you are asked for, the setup steps and
// the dashboard metrics are all projections of the same source. Switch a
// module off and its fields, its documents, its steps and its numbers all go.

import { ALL_MODULES, MODULE_BY_ID, CORE_MODULE_IDS } from "./modules";
import type { Assumptions, Category, DocSpec, Field, MetricValue, Module, Programme, Source, Step } from "./types";
import { CATEGORIES } from "./types";
import type { Roster, Totals } from "./totals";

export type UploadedDoc = {
  id: string;
  module_id: string;
  doc_id: string;
  filename: string;
  path: string;
  size_bytes: number;
  uploaded_by_name: string;
  created_at: string;
};

/** Core modules are always on, whatever is stored. */
export function enabledModules(p: Programme): Module[] {
  const ids = new Set([...CORE_MODULE_IDS, ...p.enabled]);
  const order = p.enabled.length ? p.enabled : [];
  return ALL_MODULES.filter((m) => ids.has(m.id)).sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return ALL_MODULES.indexOf(a) - ALL_MODULES.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Modules that govern how the evaluation is run rather than measuring the
 *  service. Shown on their own rather than inside an outcome category. */
export function metaModules(p: Programme): Module[] {
  return enabledModules(p).filter((m) => m.meta);
}

export function availableModules(p: Programme): Module[] {
  const on = new Set(enabledModules(p).map((m) => m.id));
  return ALL_MODULES.filter((m) => !on.has(m.id));
}

/** A module whose prerequisite is switched off. Worth surfacing rather than
 *  silently producing an empty metric. */
export function unmetDependencies(p: Programme): { module: Module; missing: Module[] }[] {
  const on = new Set(enabledModules(p).map((m) => m.id));
  return enabledModules(p)
    .map((m) => ({
      module: m,
      missing: (m.requires ?? []).filter((r) => !on.has(r)).map((r) => MODULE_BY_ID.get(r)!).filter(Boolean),
    }))
    .filter((x) => x.missing.length);
}

/** Monthly fields, grouped by where the number comes from — because that is
 *  who you have to ask, and that is the order the work actually happens in. */
export function fieldsBySource(p: Programme): { source: Source; fields: (Field & { moduleId: string; moduleName: string })[] }[] {
  const bySource = new Map<Source, (Field & { moduleId: string; moduleName: string })[]>();
  const seen = new Set<string>();
  for (const m of enabledModules(p)) {
    for (const f of m.fields) {
      if (seen.has(f.key as string)) continue;   // a field can belong to two modules
      seen.add(f.key as string);
      const list = bySource.get(f.source) ?? [];
      list.push({ ...f, moduleId: m.id, moduleName: m.name });
      bySource.set(f.source, list);
    }
  }
  const order: Source[] = ["medalia", "institution", "survey", "internal", "study", "derived"];
  return order.filter((s) => bySource.get(s)?.length).map((s) => ({ source: s, fields: bySource.get(s)! }));
}

export function requiredDocuments(p: Programme): { module: Module; doc: DocSpec }[] {
  return enabledModules(p).flatMap((m) => m.documents.map((doc) => ({ module: m, doc })));
}

export type SetupTask = { moduleId: string; moduleName: string; index: number; step: Step; key: string };

export function setupTasks(p: Programme): SetupTask[] {
  return enabledModules(p).flatMap((m) =>
    m.protocol.map((step, index) => ({ moduleId: m.id, moduleName: m.name, index, step, key: `${m.id}:${index}` })),
  );
}

/** Not recoverable later, and not yet done. A baseline not collected while
 *  goodwill is fresh is not collected at all. */
export function timeCriticalOutstanding(p: Programme): SetupTask[] {
  return setupTasks(p).filter((t) => t.step.timeCritical && !p.done[t.key]);
}

export type ModuleReadiness = {
  module: Module;
  /** Setup steps completed. */
  steps: { done: number; total: number };
  /** Required documents uploaded. */
  docs: { done: number; total: number };
  /** Metrics that have a value right now. */
  metrics: { live: number; total: number };
  /** Everything in place and reporting. */
  ready: boolean;
  /** Nothing in place at all. */
  blocked: boolean;
};

export function readiness(p: Programme, docs: UploadedDoc[], ctx: { t: Totals; roster: Roster; a: Assumptions }): ModuleReadiness[] {
  const have = new Set(docs.map((d) => `${d.module_id}:${d.doc_id}`));
  return enabledModules(p).map((m) => {
    const stepsDone = m.protocol.filter((_, i) => p.done[`${m.id}:${i}`]).length;
    const required = m.documents.filter((d) => d.required);
    const docsDone = required.filter((d) => have.has(`${m.id}:${d.id}`)).length;
    const values = m.metrics.map((x) => x.compute(ctx));
    const live = values.filter((v) => v.value !== null).length;
    return {
      module: m,
      steps: { done: stepsDone, total: m.protocol.length },
      docs: { done: docsDone, total: required.length },
      metrics: { live, total: m.metrics.length },
      ready: live === m.metrics.length && docsDone === required.length && stepsDone === m.protocol.length,
      blocked: live === 0,
    };
  });
}

export type CategoryResult = {
  category: (typeof CATEGORIES)[number];
  modules: { module: Module; values: { metric: Module["metrics"][number]; value: MetricValue }[] }[];
};

/** The dashboard, grouped by what each figure proves. Data entry is grouped by
 *  where the number comes from; these are different orderings of the same set
 *  and neither is wrong in its place. */
export function results(p: Programme, ctx: { t: Totals; roster: Roster; a: Assumptions }): CategoryResult[] {
  const on = enabledModules(p);
  return CATEGORIES.map((category) => ({
    category,
    modules: on
      // Meta modules govern how the evaluation is run rather than measuring
      // the service. Leaving them in put "Design" at the top of Effectiveness
      // and pushed the resolution rate out of sight.
      .filter((m) => m.category === category.id && !m.meta)
      .map((module) => ({ module, values: module.metrics.map((metric) => ({ metric, value: metric.compute(ctx) })) })),
  })).filter((c) => c.modules.length);
}

/** Headline figure per category — the one that goes on the wall. */
export function headlines(p: Programme, ctx: { t: Totals; roster: Roster; a: Assumptions }) {
  return results(p, ctx).map((c) => {
    const first = c.modules.flatMap((m) => m.values.map((v) => ({ ...v, module: m.module }))).find((v) => v.metric.headline);
    return { category: c.category, top: first };
  });
}

export type Progress = { steps: number; docs: number; metrics: number };

export function progress(r: ModuleReadiness[]): Progress {
  const s = r.reduce((a, x) => ({ d: a.d + x.steps.done, t: a.t + x.steps.total }), { d: 0, t: 0 });
  const d = r.reduce((a, x) => ({ d: a.d + x.docs.done, t: a.t + x.docs.total }), { d: 0, t: 0 });
  const m = r.reduce((a, x) => ({ d: a.d + x.metrics.live, t: a.t + x.metrics.total }), { d: 0, t: 0 });
  const rate = (x: { d: number; t: number }) => (x.t ? Math.round((x.d / x.t) * 100) : 100);
  return { steps: rate(s), docs: rate(d), metrics: rate(m) };
}

export const EFFORT_LABEL: Record<Module["effort"], string> = {
  low: "Low effort",
  medium: "Some setup",
  high: "Significant work",
};

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<Category, (typeof CATEGORIES)[number]>;
