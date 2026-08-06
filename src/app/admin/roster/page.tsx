"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, CalendarPlus, Users, Link2, Check } from "lucide-react";
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
  type RosterSwap,
} from "@/lib/roster";

export default function RosterPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [doctors, setDoctors] = useState<RosterDoctor[]>([]);
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [swaps, setSwaps] = useState<RosterSwap[]>([]);
  const [settings, setSettings] = useState<RosterSettings>({ per_patient_salary: 3000, currency: "kr." });
  const [salaryDraft, setSalaryDraft] = useState("3000");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

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
      setSwaps(j.swaps ?? []);
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
  const patchDoctor = async (id: string, patch: Partial<RosterDoctor>) => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    await fetch(`/api/admin/roster/doctors/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(patch) });
  };
  const copyDoctorLink = async (d: RosterDoctor) => {
    let token = d.access_token ?? undefined;
    if (!token) {
      const res = await fetch(`/api/admin/roster/doctors/${d.id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ regenerate_token: true }) });
      const j = await res.json().catch(() => ({}));
      token = j?.doctor?.access_token as string | undefined;
      if (token) setDoctors((p) => p.map((x) => (x.id === d.id ? { ...x, access_token: token } : x)));
    }
    if (!token) { flash("err", "Mistókst að búa til hlekk"); return; }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/vaktir/${token}`);
      setCopiedDoc(d.id);
      setTimeout(() => setCopiedDoc((c) => (c === d.id ? null : c)), 2000);
    } catch {
      flash("err", "Ekki tókst að afrita");
    }
  };

  const saveSalary = async () => {
    const n = Number(salaryDraft);
    if (!Number.isFinite(n) || n < 0) return;
    const res = await fetch("/api/admin/roster/settings", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ per_patient_salary: n }) });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) { setSettings(j.settings); flash("ok", "Vistað"); }
  };

  const cancelSwap = async (id: string) => {
    setSwaps((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/admin/roster/swaps/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ action: "cancel" }) });
    load();
  };
  const docName = (id: string | null) => doctors.find((d) => d.id === id)?.name ?? "óþekktur";

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
          {/* Doctors — derived from staff with the 'doctor' role */}
          {isAdmin && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Læknar</h2>
              {doctors.length === 0 ? (
                <p className="text-sm text-slate-500">Engir læknar. Gefðu starfsmanni hlutverkið „Læknir“ í <a href="/admin/team" className="text-cyan-700 underline">Starfsfólki</a>.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {doctors.map((d) => (
                    <div key={d.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
                      <input type="color" value={d.color} onChange={(e) => patchDoctor(d.id, { color: e.target.value })} title="Litur" className="h-4 w-4 rounded-full border-0 bg-transparent p-0 cursor-pointer" />
                      <span className="font-medium text-slate-800">{d.name}</span>
                      <button onClick={() => copyDoctorLink(d)} title="Afrita persónulegan hlekk læknis" className="text-slate-300 hover:text-cyan-600">{copiedDoc === d.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-slate-400">Læknar koma úr <a href="/admin/team" className="underline">Starfsfólki</a> (hlutverk „Læknir“). 🔗 afritar persónulegan hlekk læknis.</p>
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

          {/* Pending swaps / market */}
          {swaps.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Beiðnir um vaktaskipti ({swaps.length})</h2>
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {swaps.map((sw) => (
                  <div key={sw.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                    <div>
                      <span className="text-slate-900 font-medium">
                        {sw.shift ? `${weekdayShort(sw.shift.shift_date)} ${Number(sw.shift.shift_date.slice(-2))}. — ${hhmm(sw.shift.starts)}–${hhmm(sw.shift.ends)}` : "—"}
                      </span>
                      <span className="text-slate-500"> · {docName(sw.from_doctor)} → {sw.to_doctor ? docName(sw.to_doctor) : <span className="text-amber-600">markaður</span>}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => cancelSwap(sw.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Afturkalla</button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

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
