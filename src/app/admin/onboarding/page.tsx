"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2, ExternalLink, Minus, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CHECKLIST,
  SELF_TESTS,
  SELF_TEST_FLOW,
  SELF_TEST_PRICE_ISK,
  SELF_TEST_TARGET,
  mergeOnboarding,
  newStation,
  progress,
  type Contact,
  type OnboardingState,
  type Station,
} from "@/lib/station-onboarding";

// Opening a new station, as a procedure you can work through rather than
// remember. One tab per station: HSU today, HSN and others later.
//
// Autosaves on change (debounced) like the website editor, so nobody has to
// remember to press a button halfway through a stock count.

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export default function OnboardingPage() {
  const [state, setState] = useState<OnboardingState>({ stations: [] });
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [denied, setDenied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [skipSave, setSkipSave] = useState(true);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/onboarding", { headers: await authHeaders() });
    if (res.status === 403) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const merged = mergeOnboarding(j.state);
      setState(merged);
      setActiveId((cur) => cur || merged.stations[0]?.id || "");
      setUnavailable(!!j.unavailable);
    }
    setSkipSave(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced autosave.
  useEffect(() => {
    if (loading || denied) return;
    if (skipSave) {
      setSkipSave(false);
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ state }),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const active = useMemo(
    () => state.stations.find((s) => s.id === activeId) ?? state.stations[0],
    [state.stations, activeId],
  );

  const patch = (id: string, fn: (s: Station) => Station) =>
    setState((prev) => ({ stations: prev.stations.map((s) => (s.id === id ? fn(s) : s)) }));

  const toggle = (itemId: string) =>
    active &&
    patch(active.id, (s) => ({
      ...s,
      tasks: { ...s.tasks, [itemId]: { ...s.tasks[itemId], done: !s.tasks[itemId]?.done } },
    }));

  const setStock = (key: string, n: number) =>
    active && patch(active.id, (s) => ({ ...s, stock: { ...s.stock, [key]: Math.max(0, n) } }));

  const setContact = (which: "station" | "supplier", p: Partial<Contact>) =>
    active &&
    patch(active.id, (s) => ({
      ...s,
      contacts: { ...s.contacts, [which]: { ...s.contacts[which], ...p } },
    }));

  const addStation = () => {
    const n = state.stations.length + 1;
    const s = newStation(`station-${Date.now()}`, "", `Stöð ${n}`);
    setState((prev) => ({ stations: [...prev.stations, s] }));
    setActiveId(s.id);
  };

  const removeStation = (id: string) => {
    const s = state.stations.find((x) => x.id === id);
    if (!confirm(`Fjarlægja ${s?.short || s?.name || "stöðina"} og gátlistann hennar?`)) return;
    setState((prev) => ({ stations: prev.stations.filter((x) => x.id !== id) }));
    setActiveId((cur) => (cur === id ? "" : cur));
  };

  if (denied) {
    return (
      <div className="p-8">
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Þessi síða er einungis fyrir stjórnendur.
        </p>
      </div>
    );
  }
  if (loading) return <div className="p-8 text-sm text-slate-500">Sæki…</div>;

  const pct = active ? Math.round(progress(active) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
            <ClipboardList className="h-6 w-6 text-cyan-600" />
            Ný stöð — verkferli
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Allt sem þarf til að opna þjónustuna á nýrri heilbrigðisstofnun, í þeirri röð sem það er gert.
            Hakað er við jafnóðum og vistast sjálfkrafa.
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {saveState === "saving" ? "Vista…" : saveState === "saved" ? "Vistað" : saveState === "error" ? "Vistun mistókst" : ""}
        </span>
      </header>

      {unavailable && (
        <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Taflan <code className="font-mono">site_settings</code> fannst ekki, svo ekkert vistast. Keyrðu
          <code className="mx-1 font-mono">supabase/site-settings-schema.sql</code> til að virkja síðuna.
        </p>
      )}

      {/* Stations */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {state.stations.map((s) => {
          const on = s.id === active?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              aria-pressed={on}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s.short || s.name || "Ónefnd stöð"}
              <span className={`ml-2 text-xs ${on ? "text-cyan-100" : "text-slate-400"}`}>
                {Math.round(progress(s) * 100)}%
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={addStation}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:border-cyan-400 hover:text-cyan-700"
        >
          <Plus className="h-3.5 w-3.5" /> Bæta við stöð
        </button>
      </div>

      {active && (
        <>
          {/* Identity + progress */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Heiti stofnunar</span>
                <input
                  className={input}
                  value={active.name}
                  placeholder="Heilbrigðisstofnun Suðurlands"
                  onChange={(e) => patch(active.id, (s) => ({ ...s, name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Skammstöfun</span>
                <input
                  className={input}
                  value={active.short}
                  placeholder="HSU"
                  onChange={(e) => patch(active.id, (s) => ({ ...s, short: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Staðsetning</span>
                <input
                  className={input}
                  value={active.place ?? ""}
                  placeholder="Vestmannaeyjar"
                  onChange={(e) => patch(active.id, (s) => ({ ...s, place: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-12 text-right text-sm font-semibold tabular-nums text-slate-700">{pct}%</span>
              {state.stations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStation(active.id)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  title="Fjarlægja stöð"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>

          {/* Checklist */}
          {CHECKLIST.map((sec) => (
            <section key={sec.id} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">{sec.title}</h2>
              {sec.blurb && <p className="mt-1.5 max-w-2xl text-sm text-slate-600">{sec.blurb}</p>}
              <ul className="mt-4 space-y-1">
                {sec.items.map((it) => {
                  const done = !!active.tasks[it.id]?.done;
                  return (
                    <li key={it.id}>
                      <div className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          id={`${active.id}-${it.id}`}
                          checked={done}
                          onChange={() => toggle(it.id)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`${active.id}-${it.id}`}
                            className={`cursor-pointer text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}
                          >
                            {it.qty && (
                              <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                {it.qty}
                              </span>
                            )}
                            {it.label}
                          </label>
                          {it.detail && <p className="mt-0.5 text-xs text-slate-500">{it.detail}</p>}
                          {it.link && (
                            <a
                              href={it.link}
                              target={it.link.startsWith("http") ? "_blank" : undefined}
                              rel="noopener"
                              className="mt-1 flex w-fit items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
                            >
                              {it.linkLabel ?? "Opna"}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* Stock */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Birgðastaða sjálfsprófa</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Pakkningar á staðnum. Markmið við opnun er {SELF_TEST_TARGET}× af hverju prófi.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {SELF_TESTS.map((t) => {
                const n = active.stock[t.key] ?? 0;
                const low = n < SELF_TEST_TARGET;
                return (
                  <div key={t.key} className="rounded-xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-800">{t.label}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStock(t.key, n - 1)}
                        className="rounded-md border border-slate-300 p-1 text-slate-500 hover:bg-slate-50"
                        aria-label={`Fækka ${t.label}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={n}
                        onChange={(e) => setStock(t.key, Number(e.target.value))}
                        className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setStock(t.key, n + 1)}
                        className="rounded-md border border-slate-300 p-1 text-slate-500 hover:bg-slate-50"
                        aria-label={`Fjölga ${t.label}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className={`mt-2 text-xs font-medium ${low ? "text-amber-700" : "text-emerald-700"}`}>
                      {low ? `Vantar ${SELF_TEST_TARGET - n} til að ná ${SELF_TEST_TARGET}` : "Fullar birgðir"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Flow */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Ferli sjálfsprófa</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Verð til sjúklings er {SELF_TEST_PRICE_ISK.toLocaleString("is-IS")} kr. fyrir hverja pakkningu, óháð prófi.
            </p>
            <ol className="mt-4 space-y-3">
              {SELF_TEST_FLOW.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Contacts */}
          <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Tengiliðir</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {(["station", "supplier"] as const).map((which) => {
                const c = active.contacts[which];
                const heading = which === "station" ? `Tengiliður hjá ${active.short || "stöðinni"}` : "Tengiliður hjá birgja";
                return (
                  <div key={which}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">{heading}</h3>
                    <div className="space-y-2">
                      <input
                        className={input}
                        placeholder="Nafn"
                        value={c.name}
                        onChange={(e) => setContact(which, { name: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder="Hlutverk"
                        value={c.role ?? ""}
                        onChange={(e) => setContact(which, { role: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder="Netfang"
                        value={c.email ?? ""}
                        onChange={(e) => setContact(which, { email: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder="Sími"
                        value={c.phone ?? ""}
                        onChange={(e) => setContact(which, { phone: e.target.value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
