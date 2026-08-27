"use client";

// Vaktaóskir læknisins — það sem sjálfvirka skiptingin á að taka mið af.
//
// Óskirnar hafa ólíkt vægi og viðmótið segir það hreint út: frí er ófrávíkjanlegt,
// hitt er ósk sem víkur fyrir jafnri skiptingu. Læknir sem heldur að hann hafi
// bókað frí þegar hann skráði ósk er verri niðurstaða en enginn reitur.

import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal, Plus, Trash2, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { WEEKDAY_LABELS_IS, WEEKDAY_ORDER, weekdaySummary } from "@/lib/roster-assign";

interface Prefs {
  max_shifts_per_month: number | null;
  allowed_weekdays: number[] | null;
  preferred_run_length: number | null;
  shift_note: string;
}
interface Absence { id: string; starts_on: string; ends_on: string; note: string }

const fmtDate = (d: string) => `${Number(d.slice(8, 10))}.${Number(d.slice(5, 7))}.${d.slice(0, 4)}`;

export default function ShiftPrefs({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/vaktir/${token}/prefs`);
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { setErr(j.error ?? "Gat ekki sótt óskir"); return; }
    setPrefs(j.prefs);
    setAbsences(j.absences ?? []);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const save = async (patch: Partial<Prefs>) => {
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    setBusy(true); setErr(null);
    const r = await fetch(`/api/vaktir/${token}/prefs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!j.ok) { setErr(j.error ?? "Vistun mistókst"); return; }
    setPrefs(j.prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const addAbsence = async () => {
    if (!from || busy) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/vaktir/${token}/prefs/absences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starts_on: from, ends_on: to || from, note }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!j.ok) { setErr(j.error ?? "Gat ekki skráð frí"); return; }
    setAbsences((a) => [...a, j.absence].sort((x, y) => x.starts_on.localeCompare(y.starts_on)));
    setFrom(""); setTo(""); setNote("");
  };

  const removeAbsence = async (id: string) => {
    setBusy(true);
    await fetch(`/api/vaktir/${token}/prefs/absences/${id}`, { method: "DELETE" });
    setAbsences((a) => a.filter((x) => x.id !== id));
    setBusy(false);
  };

  if (!prefs) return null;

  const days = prefs.allowed_weekdays ?? [];
  const toggleDay = (d: number) =>
    save({ allowed_weekdays: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b) });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
      >
        <SlidersHorizontal className="h-4 w-4 text-[var(--primary-dark)]" />
        <span className="text-sm font-semibold text-slate-900">Vaktaóskir</span>
        <span className="ml-auto truncate text-[11px] text-slate-500">
          {weekdaySummary(days)}
          {prefs.max_shifts_per_month ? ` · mest ${prefs.max_shifts_per_month}` : ""}
          {prefs.preferred_run_length ? ` · ${prefs.preferred_run_length} í röð` : ""}
          {absences.length ? ` · ${absences.length} frí` : ""}
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">
            Sjálfvirka skiptingin tekur mið af þessu. Frí er ófrávíkjanlegt — þú færð aldrei vakt á
            fríi. Hitt eru óskir: þær ráða þegar hægt er, en jöfn skipting milli lækna gengur fyrir.
          </p>

          {/* ── Frí: the hard rule, so it comes first ── */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Frí</div>
            {absences.length > 0 && (
              <ul className="mt-2 space-y-1">
                {absences.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                    <span className="truncate text-slate-700">
                      {a.starts_on === a.ends_on ? fmtDate(a.starts_on) : `${fmtDate(a.starts_on)} – ${fmtDate(a.ends_on)}`}
                      {a.note ? <span className="text-slate-400"> · {a.note}</span> : null}
                    </span>
                    <button onClick={() => removeAbsence(a.id)} disabled={busy}
                      aria-label="Eyða fríi" className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-40">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-slate-500">
                Frá
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="mt-0.5 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-[11px] text-slate-500">
                Til <span className="text-slate-400">(sami dagur ef autt)</span>
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
                  className="mt-0.5 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-[11px] text-slate-500">
                Skýring
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="valfrjálst"
                  className="mt-0.5 block w-40 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </label>
              <button onClick={addAbsence} disabled={!from || busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-dark)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> Skrá frí
              </button>
            </div>
          </div>

          {/* ── Vaktir í röð ── */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Helst margar vaktir í röð
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="range" min={0} max={10} step={1}
                value={prefs.preferred_run_length ?? 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setPrefs((p) => (p ? { ...p, preferred_run_length: n === 0 ? null : n } : p));
                }}
                onMouseUp={(e) => {
                  const n = Number((e.target as HTMLInputElement).value);
                  void save({ preferred_run_length: n === 0 ? null : n });
                }}
                onTouchEnd={(e) => {
                  const n = Number((e.target as HTMLInputElement).value);
                  void save({ preferred_run_length: n === 0 ? null : n });
                }}
                className="h-1.5 w-48 cursor-pointer"
              />
              <span className="text-sm text-slate-700">
                {prefs.preferred_run_length ? `${prefs.preferred_run_length} í röð` : "Engin ósk"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Vaktir hafa tilhneigingu til að raðast saman í svona langar lotur — aldrei lengri.
            </p>
          </div>

          {/* ── Hámark og vikudagar ── */}
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Mest á mánuði
              </label>
              <input
                type="number" min={0} placeholder="ótakmarkað"
                value={prefs.max_shifts_per_month ?? ""}
                onChange={(e) => setPrefs((p) => (p ? { ...p, max_shifts_per_month: e.target.value === "" ? null : Number(e.target.value) } : p))}
                onBlur={(e) => void save({ max_shifts_per_month: e.target.value === "" ? null : Number(e.target.value) })}
                className="mt-1 block w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vikudagar</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {WEEKDAY_ORDER.map((d) => (
                  <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={days.includes(d)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      days.length === 0 || days.includes(d)
                        ? "bg-[var(--primary-dark)] text-white"
                        : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}>
                    {WEEKDAY_LABELS_IS[d]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Enginn valinn = allir dagar.</p>
            </div>
          </div>

          {/* ── Frjáls athugasemd ── */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Annað sem vert er að vita
            </label>
            <textarea
              rows={2}
              value={prefs.shift_note ?? ""}
              onChange={(e) => setPrefs((p) => (p ? { ...p, shift_note: e.target.value } : p))}
              onBlur={(e) => void save({ shift_note: e.target.value })}
              placeholder="t.d. „ekki fyrstu vikuna í júlí“"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Þetta les stjórnandinn — það er ekki keyrt sjálfvirkt.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            {saved && <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3.5 w-3.5" /> Vistað</span>}
            {err && <span className="text-red-600">{err}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
