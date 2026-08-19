"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2, ExternalLink, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CHECKLIST,
  SELF_TESTS,
  SELF_TEST_FLOW,
  SELF_TEST_PRICE_ISK,
  SELF_TEST_TARGET,
  formatDate,
  institutionProgress,
  mergeOnboarding,
  newInstitution,
  newStation,
  progress,
  timeline,
  type Contact,
  type Institution,
  type OnboardingState,
  type Station,
} from "@/lib/station-onboarding";

// Opening new stations, as a procedure you can work through rather than
// remember. Institution -> stations, because that is how the health service is
// organised: one agreement with HSU, nine heilsugaeslustodvar to open.
//
// Autosaves on change (debounced) like the website editor, so nobody has to
// remember to press a button halfway through a stock count.

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

function ContactFields({
  heading,
  c,
  onChange,
}: {
  heading: string;
  c: Contact;
  onChange: (p: Partial<Contact>) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Nafn" value={c.name} onChange={(e) => onChange({ name: e.target.value })} />
        <input className={input} placeholder="Hlutverk" value={c.role ?? ""} onChange={(e) => onChange({ role: e.target.value })} />
        <input className={input} placeholder="Netfang" value={c.email ?? ""} onChange={(e) => onChange({ email: e.target.value })} />
        <input className={input} placeholder="Sími" value={c.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [state, setState] = useState<OnboardingState>({ institutions: [], supplier: { name: "Heilsa" } });
  const [instId, setInstId] = useState("");
  const [stationId, setStationId] = useState("");
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
      setInstId((cur) => cur || merged.institutions[0]?.id || "");
      setUnavailable(!!j.unavailable);
    }
    setSkipSave(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const inst = useMemo(
    () => state.institutions.find((i) => i.id === instId) ?? state.institutions[0],
    [state.institutions, instId],
  );
  const station = useMemo(
    () => inst?.stations.find((s) => s.id === stationId) ?? inst?.stations[0],
    [inst, stationId],
  );

  const patchInst = (id: string, fn: (i: Institution) => Institution) =>
    setState((prev) => ({ ...prev, institutions: prev.institutions.map((i) => (i.id === id ? fn(i) : i)) }));

  const patchStation = (sid: string, fn: (s: Station) => Station) =>
    inst && patchInst(inst.id, (i) => ({ ...i, stations: i.stations.map((s) => (s.id === sid ? fn(s) : s)) }));

  const addStation = () => {
    if (!inst) return;
    const s = newStation(`Ný stöð ${inst.stations.length + 1}`);
    patchInst(inst.id, (i) => ({ ...i, stations: [...i.stations, s] }));
    setStationId(s.id);
  };

  const removeStation = (sid: string) => {
    if (!inst) return;
    const s = inst.stations.find((x) => x.id === sid);
    if (!confirm(`Fjarlægja ${s?.name || "stöðina"} og gátlistann hennar?`)) return;
    patchInst(inst.id, (i) => ({ ...i, stations: i.stations.filter((x) => x.id !== sid) }));
    setStationId("");
  };

  const addInstitution = () => {
    const i = newInstitution("", "Ný stofnun");
    setState((prev) => ({ ...prev, institutions: [...prev.institutions, i] }));
    setInstId(i.id);
    setStationId("");
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

  const rows = inst ? timeline(inst) : [];
  const instPct = inst ? Math.round(institutionProgress(inst) * 100) : 0;
  const doneCount = inst ? inst.stations.filter((s) => progress(s) === 1).length : 0;
  const pct = station ? Math.round(progress(station) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
            <ClipboardList className="h-6 w-6 text-cyan-600" />
            Innleiðing á nýjum stöðvum
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Ein stofnun, margar heilsugæslustöðvar. Hver stöð fær sína heimsókn, sitt prentefni og sína
            innleiðingardagsetningu. Hakað er við jafnóðum og vistast sjálfkrafa.
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

      {/* Institutions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {state.institutions.map((i) => {
          const on = i.id === inst?.id;
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => { setInstId(i.id); setStationId(""); }}
              aria-pressed={on}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {i.short || i.name || "Ónefnd stofnun"}
              <span className={`ml-2 text-xs ${on ? "text-cyan-100" : "text-slate-400"}`}>
                {i.stations.length} stöðvar
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={addInstitution}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:border-cyan-400 hover:text-cyan-700"
        >
          <Plus className="h-3.5 w-3.5" /> Bæta við stofnun
        </button>
      </div>

      {inst && (
        <>
          {/* Details and contacts, at the top — the things you look up rather
              than work through. */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Heiti stofnunar</span>
                <input
                  className={input}
                  value={inst.name}
                  placeholder="Heilbrigðisstofnun Suðurlands"
                  onChange={(e) => patchInst(inst.id, (i) => ({ ...i, name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Skammstöfun</span>
                <input
                  className={input}
                  value={inst.short}
                  placeholder="HSU"
                  onChange={(e) => patchInst(inst.id, (i) => ({ ...i, short: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <ContactFields
                heading={`Tengiliður hjá ${inst.short || "stofnuninni"}`}
                c={inst.contact}
                onChange={(p) => patchInst(inst.id, (i) => ({ ...i, contact: { ...i.contact, ...p } }))}
              />
              {/* One supplier for every station, so the contact is held once. */}
              <ContactFields
                heading="Birgi sjálfsprófa — Heilsa"
                c={state.supplier}
                onChange={(p) => setState((prev) => ({ ...prev, supplier: { ...prev.supplier, ...p } }))}
              />
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${instPct}%` }} />
              </div>
              <span className="text-sm text-slate-600">
                <b className="tabular-nums">{doneCount}</b> af{" "}
                <b className="tabular-nums">{inst.stations.length}</b> stöðvum tilbúnar
              </span>
            </div>
          </section>

          {/* Timeline */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Innleiðingaráætlun</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Dagsetning innleiðingar á hverri stöð. Raðast sjálfkrafa í tímaröð; stöðvar án dagsetningar
              sitja neðst. Smelltu á stöð til að opna gátlistann hennar.
            </p>

            <ul className="mt-4 divide-y divide-slate-100">
              {rows.map((s) => {
                const p = Math.round(progress(s) * 100);
                const on = s.id === station?.id;
                return (
                  <li key={s.id} className={`flex flex-wrap items-center gap-3 py-2.5 ${on ? "bg-cyan-50/50" : ""}`}>
                    <input
                      type="date"
                      value={s.goLiveAt ?? ""}
                      onChange={(e) => patchStation(s.id, (x) => ({ ...x, goLiveAt: e.target.value || undefined }))}
                      className="w-[9.5rem] shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs tabular-nums text-slate-700"
                      aria-label={`Innleiðing — ${s.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => setStationId(s.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className={`text-sm font-semibold ${on ? "text-cyan-800" : "text-slate-800"}`}>
                        {s.name || "Ónefnd stöð"}
                      </span>
                      {s.goLiveAt && (
                        <span className="ml-2 text-xs text-slate-400">{formatDate(s.goLiveAt)}</span>
                      )}
                      {s.contact.name && (
                        <span className="ml-2 text-xs text-slate-500">· {s.contact.name}</span>
                      )}
                    </button>
                    <div className="flex w-28 shrink-0 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${p === 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      {p === 100 ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500">{p}%</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={addStation}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Bæta við stöð
            </button>
          </section>

          {station && (
            <>
              {/* Station details */}
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Valin stöð</p>
                    <h2 className="mt-0.5 text-xl font-bold text-slate-900">{station.name || "Ónefnd stöð"}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-slate-700">{pct}%</span>
                    <button
                      type="button"
                      onClick={() => removeStation(station.id)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      title="Fjarlægja stöð"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Heiti stöðvar</span>
                    <input
                      className={input}
                      value={station.name}
                      placeholder="Selfoss"
                      onChange={(e) => patchStation(station.id, (s) => ({ ...s, name: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Innleiðing</span>
                    <input
                      type="date"
                      className={input}
                      value={station.goLiveAt ?? ""}
                      onChange={(e) => patchStation(station.id, (s) => ({ ...s, goLiveAt: e.target.value || undefined }))}
                    />
                  </label>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <ContactFields
                    heading={`Tengiliður á staðnum — ${station.name || "stöðin"}`}
                    c={station.contact}
                    onChange={(p) => patchStation(station.id, (s) => ({ ...s, contact: { ...s.contact, ...p } }))}
                  />
                </div>
              </section>

              {/* Checklist */}
              {CHECKLIST.map((sec) => (
                <section key={sec.id} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900">{sec.title}</h2>
                  {sec.blurb && <p className="mt-1.5 max-w-2xl text-sm text-slate-600">{sec.blurb}</p>}
                  <ul className="mt-4 space-y-1">
                    {sec.items.map((it) => {
                      const done = !!station.tasks[it.id]?.done;
                      return (
                        <li key={it.id}>
                          <div className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              id={`${station.id}-${it.id}`}
                              checked={done}
                              onChange={() =>
                                patchStation(station.id, (s) => ({
                                  ...s,
                                  tasks: { ...s.tasks, [it.id]: { ...s.tasks[it.id], done: !s.tasks[it.id]?.done } },
                                }))
                              }
                              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <div className="min-w-0 flex-1">
                              <label
                                htmlFor={`${station.id}-${it.id}`}
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
                <h2 className="text-lg font-bold text-slate-900">
                  Birgðastaða sjálfsprófa — {station.name || "stöðin"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Pakkningar á staðnum. Markmið við opnun er {SELF_TEST_TARGET}× af hverju prófi.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {SELF_TESTS.map((t) => {
                    const n = station.stock[t.key] ?? 0;
                    const low = n < SELF_TEST_TARGET;
                    const setStock = (v: number) =>
                      patchStation(station.id, (s) => ({ ...s, stock: { ...s.stock, [t.key]: Math.max(0, v) } }));
                    return (
                      <div key={t.key} className="rounded-xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-800">{t.label}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStock(n - 1)}
                            className="rounded-md border border-slate-300 p-1 text-slate-500 hover:bg-slate-50"
                            aria-label={`Fækka ${t.label}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={n}
                            onChange={(e) => setStock(Number(e.target.value))}
                            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => setStock(n + 1)}
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

              {/* Flow — the same everywhere, so it sits once at the bottom. */}
              <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
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
            </>
          )}
        </>
      )}
    </div>
  );
}
