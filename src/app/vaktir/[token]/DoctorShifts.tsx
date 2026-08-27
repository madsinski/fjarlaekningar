"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarPlus, Copy, Check, ArrowLeftRight, X } from "lucide-react";
import GoogleCalendarCard from "./GoogleCalendarCard";
import {
  monthKey,
  monthLabel,
  weekdayShort,
  hhmm,
  formatIsk,
  type RosterShift,
  type RosterSettings,
  type RosterDoctor,
  type RosterSwap,
} from "@/lib/roster";

export default function DoctorShifts({
  token,
  doctorId,
  doctorName,
  initialShifts,
  doctors,
  initialSwaps,
  settings,
  calendarUrl,
  layout = "stack",
  sidebar,
}: {
  token: string;
  doctorId: string;
  doctorName: string;
  initialShifts: RosterShift[];
  doctors: RosterDoctor[];
  initialSwaps: RosterSwap[];
  settings: RosterSettings;
  calendarUrl: string;
  /**
   * "stack" — one column, top to bottom (the standalone /vaktir page).
   * "split" — shifts on the left, swaps and whatever `sidebar` holds on the
   *           right. Used inside Mín síða, where there is room for two columns.
   */
  layout?: "stack" | "split";
  /** Extra right-column content in split layout. Ignored when stacked. */
  sidebar?: ReactNode;
}) {
  const [shifts, setShifts] = useState<RosterShift[]>(initialShifts);
  const [copied, setCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  // Which shift's popup is open. Held by id, not by the row object, so the
  // dialog follows the shift if the list re-renders underneath it.
  const [editId, setEditId] = useState<string | null>(null);
  const [offerTarget, setOfferTarget] = useState(""); // "" = market, else doctor id
  const [busy, setBusy] = useState(false);

  const thisMonth = monthKey(new Date());
  const webcal = calendarUrl.replace(/^https?:/, "webcal:");
  // Google's own add-by-URL screen. The webcal: button below depends on the
  // machine having a calendar app registered for that scheme — on Windows
  // without Outlook nothing happens at all, which reads as a broken button.
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const docName = (id: string | null) => doctors.find((d) => d.id === id)?.name ?? "óþekktur";
  const fmtSwap = (s?: RosterSwap["shift"]) => (s ? `${weekdayShort(s.shift_date)} ${Number(s.shift_date.slice(-2))}. — ${hhmm(s.starts)}–${hhmm(s.ends)}` : "");

  const byMonth = useMemo(() => {
    const m: Record<string, RosterShift[]> = {};
    for (const s of shifts) (m[s.shift_date.slice(0, 7)] ||= []).push(s);
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  const summary = useMemo(() => {
    const own = shifts.filter((s) => s.shift_date.slice(0, 7) === thisMonth && s.status !== "open");
    const patients = own.reduce((n, s) => n + (s.patients_seen || 0), 0);
    return { days: own.length, patients, pay: patients * settings.per_patient_salary };
  }, [shifts, thisMonth, settings.per_patient_salary]);

  // Swap buckets. Outgoing offers need no bucket: a shift on the market keeps
  // its row in the doctor's own table, so pendingFor() finds the offer there.
  const incoming = initialSwaps.filter((s) => s.to_doctor === doctorId);
  const market = initialSwaps.filter((s) => !s.to_doctor && s.from_doctor !== doctorId);

  const savePatients = async (shift: RosterShift, value: number) => {
    if (value === shift.patients_seen) return;
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, patients_seen: value } : s)));
    const res = await fetch(`/api/vaktir/${token}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shift.id, patients_seen: value }),
    });
    if (res.ok) {
      setSavedId(shift.id);
      setTimeout(() => setSavedId((c) => (c === shift.id ? null : c)), 1500);
    }
  };

  const createOffer = async (shiftId: string) => {
    if (!shiftId || busy) return;
    setBusy(true);
    const res = await fetch(`/api/vaktir/${token}/swaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, to_doctor: offerTarget || null }),
    });
    if (res.ok) location.reload();
    else setBusy(false);
  };

  const swapAction = async (id: string, action: "accept" | "decline" | "cancel") => {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/vaktir/${token}/swaps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) location.reload();
    else setBusy(false);
  };

  useEffect(() => {
    if (!editId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setEditId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editId]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-dark)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50";
  const btnGhost = "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  const header = (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--primary-dark)]">Fjarlækningar</div>
      <h1 className="text-2xl font-bold text-slate-900">Mínar vaktir</h1>
      <p className="text-sm text-slate-600">{doctorName}</p>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-3 gap-3">
      {[
        ["Vaktir í mánuðinum", String(summary.days)],
        ["Sjúklingar", String(summary.patients)],
        ["Laun", formatIsk(summary.pay, settings.currency)],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</div>
          <div className="text-[11px] text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );

  const googleCard = <GoogleCalendarCard token={token} />;

  const calendarBox = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <CalendarPlus className="w-4 h-4 text-[var(--primary-dark)]" /> Bæta vöktum í dagatal
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Gerðu áskrift í Google eða Apple dagatali — vaktirnar uppfærast sjálfkrafa.
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Áskrift sækir breytingar þegar dagatalinu hentar: Apple á klukkustundarfresti (stillanlegt
        niður í 5 mín), Google á nokkurra klukkustunda fresti. Viltu fá breytingar samstundis skaltu
        nota beinu Google-tenginguna hér fyrir ofan. Nýjustu vaktirnar sérðu alltaf í
        vaktalistanum sjálfum.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={googleUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-dark)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
          Google dagatal
        </a>
        <a href={webcal}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Apple dagatal
        </a>
        <button onClick={copyUrl} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          {copied ? "Afritað!" : "Afrita hlekk"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        „Apple dagatal“ opnar dagatalsforrit tölvunnar. Gerist ekkert þegar smellt er á hann er ekkert
        slíkt forrit uppsett — notaðu þá „Google dagatal“, eða afritaðu hlekkinn og límdu hann inn í
        dagatalið þitt (Outlook: „Bæta við dagatali → Gerast áskrifandi af vefnum“).
      </p>
    </div>
  );

  // Wrapped so the months keep their own spacing wherever the block is placed.
  // Wrapped so the months keep their own spacing wherever the block is placed.
  /** A live offer on this shift, if the doctor has already put one out. */
  const pendingFor = (shiftId: string) =>
    initialSwaps.find((sw) => sw.shift_id === shiftId && sw.status === "pending") ?? null;

  // Wrapped so the months keep their own spacing wherever the block is placed.
  const monthsBlock = (
    <div className="space-y-6">
      {byMonth.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Engar vaktir framundan.</div>
      ) : (
        byMonth.map(([m, rows]) => (
          <div key={m}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 capitalize">{monthLabel(m)}</h2>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-2 font-medium">Dagur</th>
                    <th className="px-4 py-2 font-medium">Tími</th>
                    <th className="px-4 py-2 font-medium w-28">Sjúklingar</th>
                    <th className="px-4 py-2 font-medium">Staða</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap"><span className="text-slate-500">{weekdayShort(s.shift_date)}</span> {Number(s.shift_date.slice(-2))}.</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-600">{hhmm(s.starts)}–{hhmm(s.ends)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <input type="number" min={0} defaultValue={s.patients_seen} onBlur={(e) => savePatients(s, Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-cyan-200 outline-none" />
                          {savedId === s.id && <Check className="w-4 h-4 text-emerald-600" />}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {s.status === "open" ? <span className="text-amber-600">Á markaði</span> : s.status === "swap" ? <span className="text-purple-600">Í boði</span> : <span className="text-slate-400">Úthlutað</span>}
                      </td>
                      {/* Swap controls live on the shift they act on, rather than in
                          a separate panel with its own "which shift?" dropdown. */}
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setEditId(s.id)} className={btnGhost} aria-label={`Breyta vakt ${s.shift_date}`}>
                          Breyta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Offers from other doctors. These are shifts the doctor does NOT hold, so
  // they have no row of their own to sit in and keep a list of their own.
  const marketBlock = (incoming.length > 0 || market.length > 0) ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ArrowLeftRight className="w-4 h-4 text-[var(--primary-dark)]" /> Í boði fyrir þig
      </div>
      <ul className="space-y-1.5">
        {incoming.map((sw) => (
          <li key={sw.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-700">{fmtSwap(sw.shift)} · frá {docName(sw.from_doctor)}</span>
            <span className="flex gap-2">
              <button onClick={() => swapAction(sw.id, "accept")} disabled={busy} className={btnPrimary}>Taka</button>
              <button onClick={() => swapAction(sw.id, "decline")} disabled={busy} className={btnGhost}>Hafna</button>
            </span>
          </li>
        ))}
        {market.map((sw) => (
          <li key={sw.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-700">{fmtSwap(sw.shift)} · á markaði (frá {docName(sw.from_doctor)})</span>
            <button onClick={() => swapAction(sw.id, "accept")} disabled={busy} className={btnPrimary}>Taka vakt</button>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  const editShift = shifts.find((s) => s.id === editId) ?? null;
  const editOffer = editShift ? pendingFor(editShift.id) : null;

  const editModal = editShift && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Breyta vakt"
      onClick={() => setEditId(null)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
    >
      {/* Clicks inside must not reach the backdrop's close handler. */}
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold capitalize text-slate-900">
              {weekdayShort(editShift.shift_date)} {Number(editShift.shift_date.slice(-2))}. {monthLabel(editShift.shift_date.slice(0, 7))}
            </div>
            <div className="text-xs text-slate-500">{hhmm(editShift.starts)}–{hhmm(editShift.ends)}</div>
          </div>
          <button onClick={() => setEditId(null)} aria-label="Loka" className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {editOffer ? (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {editOffer.to_doctor
                ? <>Vaktin er í boði til <span className="font-medium">{docName(editOffer.to_doctor)}</span>.</>
                : "Vaktin er á markaði — hvaða læknir sem er getur tekið hana."}
            </p>
            <button onClick={() => swapAction(editOffer.id, "cancel")} disabled={busy} className={btnGhost}>
              Afturkalla boð
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-slate-500">
              Bjóða vaktina
              <select
                value={offerTarget}
                onChange={(e) => setOfferTarget(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Á markað (allir læknar)</option>
                {doctors.filter((d) => d.id !== doctorId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <button onClick={() => createOffer(editShift.id)} disabled={busy} className={btnPrimary}>
              Bjóða vakt
            </button>
            <p className="text-[11px] text-slate-400">
              Vaktin er áfram þín þar til annar læknir tekur hana.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const footNote = (
    <p className="text-center text-xs text-slate-400">Skráðu fjölda sjúklinga eftir hverja vakt. Stjórnandi sér yfirlitið.</p>
  );

  // Two columns only where there is room. The header, totals and calendar boxes
  // run full width; the split starts at the month list so Vaktaplan sits level
  // with it — the two are read against each other, so they should line up.
  if (layout === "split") {
    return (
      <>
        <div className="space-y-6">
          {header}
          {stats}
          {googleCard}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {monthsBlock}
              {marketBlock}
            </div>
            <aside className="space-y-6">{sidebar}</aside>
          </div>
          {/* Subscription is the fallback for anyone not connected directly, so
              it sits under the shifts rather than above them. */}
          {calendarBox}
          {footNote}
        </div>
        {editModal}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {header}
        {stats}
        {googleCard}
        {monthsBlock}
        {marketBlock}
        {calendarBox}
        {footNote}
      </div>
      {editModal}
    </>
  );
}
