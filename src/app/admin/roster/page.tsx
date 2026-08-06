"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  monthKey,
  shiftMonth,
  monthLabel,
  datesInMonth,
  weekdayShort,
  hhmm,
  formatIsk,
  monthlyTotals,
  type RosterDoctor,
  type RosterShift,
  type RosterSettings,
} from "@/lib/roster";

export default function RosterPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [doctors, setDoctors] = useState<RosterDoctor[]>([]);
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [settings, setSettings] = useState<RosterSettings>({ per_patient_salary: 3000, currency: "kr." });
  const [salaryDraft, setSalaryDraft] = useState("3000");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newDoc, setNewDoc] = useState({ name: "", color: "#00a8cc" });

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const res = await fetch(`/api/admin/roster?month=${month}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) {
      setDoctors(j.doctors);
      setShifts(j.shifts);
      setSettings(j.settings);
      setSalaryDraft(String(j.settings.per_patient_salary));
    }
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  // ── Mutations ──
  const patchShift = async (id: string, patch: Partial<RosterShift>) => {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const res = await fetch(`/api/admin/roster/shifts/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(patch) });
    if (!res.ok) flash("err", "Vistun mistókst");
  };
  const deleteShift = async (id: string) => {
    if (!confirm("Eyða vakt?")) return;
    setShifts((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/admin/roster/shifts/${id}`, { method: "DELETE", headers: await authHeaders() });
  };
  const addShift = async (date: string) => {
    const res = await fetch("/api/admin/roster/shifts", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ shift_date: date }) });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setShifts((prev) => [...prev, j.shift].sort((a, b) => a.shift_date.localeCompare(b.shift_date) || a.starts.localeCompare(b.starts)));
  };
  const generateMonth = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/roster/shifts", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "generate", month }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j?.ok) { flash("ok", `${j.created} vaktir búnar til`); load(); }
    else flash("err", j.error || "Mistókst");
  };
  const addDoctor = async () => {
    if (!newDoc.name.trim()) return;
    const res = await fetch("/api/admin/roster/doctors", { method: "POST", headers: await authHeaders(), body: JSON.stringify(newDoc) });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) { setDoctors((p) => [...p, j.doctor]); setNewDoc({ name: "", color: "#00a8cc" }); }
    else flash("err", j.error || "Mistókst");
  };
  const patchDoctor = async (id: string, patch: Partial<RosterDoctor>) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    await fetch(`/api/admin/roster/doctors/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(patch) });
  };
  const deleteDoctor = async (id: string) => {
    if (!confirm("Fjarlægja lækni? Vaktir haldast en verða óúthlutaðar.")) return;
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/admin/roster/doctors/${id}`, { method: "DELETE", headers: await authHeaders() });
    load();
  };
  const saveSalary = async () => {
    const n = Number(salaryDraft);
    if (!Number.isFinite(n) || n < 0) return;
    const res = await fetch("/api/admin/roster/settings", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ per_patient_salary: n }) });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) { setSettings(j.settings); flash("ok", "Vistað"); }
  };

  const shiftsByDate = useMemo(() => {
    const m: Record<string, RosterShift[]> = {};
    for (const s of shifts) (m[s.shift_date] ||= []).push(s);
    return m;
  }, [shifts]);

  const totals = useMemo(
    () => monthlyTotals(doctors, shifts, settings.per_patient_salary),
    [doctors, shifts, settings.per_patient_salary],
  );
  const activeDoctors = doctors.filter((d) => d.active);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Vaktakerfi</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">Skipting vakta milli lækna, talning sjúklinga og mánaðaruppgjör. Opið alla daga 10–22.</p>

      {msg && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>
      )}

      {/* Month nav + settings */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
          <span className="min-w-44 text-center font-semibold text-slate-900 capitalize">{monthLabel(month)}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-500">Laun á sjúkling</label>
            <input value={salaryDraft} onChange={(e) => setSalaryDraft(e.target.value.replace(/[^0-9]/g, ""))} onBlur={saveSalary} className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right" />
            <span className="text-slate-500">{settings.currency}</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Hleð…</p>
      ) : (
        <div className="space-y-8">
          {/* Doctors */}
          {isAdmin && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Læknar</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {doctors.map((d) => (
                  <div key={d.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${d.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                    <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    <span className="font-medium text-slate-800">{d.name}</span>
                    <button onClick={() => patchDoctor(d.id, { active: !d.active })} className="text-[11px] text-slate-400 hover:text-slate-700">{d.active ? "virkur" : "óvirkur"}</button>
                    <button onClick={() => deleteDoctor(d.id)} className="text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={newDoc.name} onChange={(e) => setNewDoc((n) => ({ ...n, name: e.target.value }))} placeholder="Nafn læknis" className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
                <input type="color" value={newDoc.color} onChange={(e) => setNewDoc((n) => ({ ...n, color: e.target.value }))} className="h-9 w-9 rounded border border-slate-200 p-0.5" />
                <button onClick={addDoctor} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"><Plus className="w-4 h-4" /> Bæta við</button>
              </div>
            </section>
          )}

          {/* Schedule */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Vaktaplan</h2>
              {isAdmin && (
                <button onClick={generateMonth} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  <CalendarPlus className="w-4 h-4" /> Búa til vaktir mánaðarins
                </button>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="px-3 py-2 font-medium">Dagur</th>
                    <th className="px-3 py-2 font-medium">Tími</th>
                    <th className="px-3 py-2 font-medium">Læknir</th>
                    <th className="px-3 py-2 font-medium w-24">Sjúklingar</th>
                    <th className="px-3 py-2 font-medium">Staða</th>
                    {isAdmin && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {datesInMonth(month).map((date) => {
                    const rows = shiftsByDate[date] || [];
                    if (rows.length === 0) {
                      return (
                        <tr key={date} className="border-b border-slate-100 last:border-0 text-slate-400">
                          <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-500">{weekdayShort(date)}</span> {Number(date.slice(-2))}.</td>
                          <td className="px-3 py-2" colSpan={isAdmin ? 5 : 4}>
                            {isAdmin ? <button onClick={() => addShift(date)} className="text-xs text-cyan-700 hover:underline">+ vakt</button> : "engin vakt"}
                          </td>
                        </tr>
                      );
                    }
                    return rows.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 whitespace-nowrap"><span className="text-slate-500">{weekdayShort(date)}</span> {Number(date.slice(-2))}.</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{hhmm(s.starts)}–{hhmm(s.ends)}</td>
                        <td className="px-3 py-2">
                          <select
                            value={s.doctor_id ?? ""}
                            disabled={!isAdmin}
                            onChange={(e) => patchShift(s.id, { doctor_id: e.target.value || null })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-transparent disabled:border-transparent max-w-40"
                          >
                            <option value="">— óúthlutað —</option>
                            {activeDoctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            {s.doctor_id && !activeDoctors.some((d) => d.id === s.doctor_id) && (
                              <option value={s.doctor_id}>{doctors.find((d) => d.id === s.doctor_id)?.name ?? "?"}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0}
                            defaultValue={s.patients_seen}
                            disabled={!isAdmin}
                            onBlur={(e) => { const n = Number(e.target.value); if (n !== s.patients_seen) patchShift(s.id, { patients_seen: Math.max(0, Math.floor(n)) }); }}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-right disabled:bg-transparent disabled:border-transparent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {s.status === "open" ? <span className="text-xs font-medium text-amber-600">Á markaði</span> : s.status === "swap" ? <span className="text-xs text-purple-600">Skipti</span> : <span className="text-xs text-slate-400">Úthlutað</span>}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button onClick={() => patchShift(s.id, { status: s.status === "open" ? "assigned" : "open" })} className="text-[11px] text-slate-400 hover:text-amber-600 mr-2">{s.status === "open" ? "af markaði" : "á markað"}</button>
                            <button onClick={() => deleteShift(s.id)} className="text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payroll */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Mánaðaruppgjör — {monthLabel(month)}</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-2 font-medium">Læknir</th>
                    <th className="px-4 py-2 font-medium text-right">Vaktir</th>
                    <th className="px-4 py-2 font-medium text-right">Sjúklingar</th>
                    <th className="px-4 py-2 font-medium text-right">Laun</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.length === 0 ? (
                    <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>Engar úthlutaðar vaktir í þessum mánuði.</td></tr>
                  ) : (
                    totals.map((t) => (
                      <tr key={t.doctor.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2"><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: t.doctor.color }} />{t.doctor.name}</span></td>
                        <td className="px-4 py-2 text-right tabular-nums">{t.daysWorked}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{t.patients}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900">{formatIsk(t.pay, settings.currency)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {totals.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-4 py-2">Samtals</td>
                      <td className="px-4 py-2 text-right tabular-nums">{totals.reduce((s, t) => s + t.daysWorked, 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{totals.reduce((s, t) => s + t.patients, 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-900">{formatIsk(totals.reduce((s, t) => s + t.pay, 0), settings.currency)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Laun = sjúklingar × {formatIsk(settings.per_patient_salary, settings.currency)} á sjúkling.</p>
          </section>
        </div>
      )}
    </div>
  );
}
