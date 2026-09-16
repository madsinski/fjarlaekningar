"use client";

// Mánaðarplan í fjórum skrefum. Hvert skref segir hvað þarf að gera og býður
// næsta skref þegar það er tilbúið; yfirlæknir getur samt alltaf flett á milli.

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Ban, BellRing, Check, CheckCheck, ClipboardList, Eye, Heart, History, Megaphone, MessageSquareWarning,
  Pencil, RotateCcw, Send, Sparkles, Undo2,
} from "lucide-react";
import PrefsEditor, { PREF_TONE, PrefsMini, draftFrom, type PrefDraft } from "../_components/PrefsEditor";
import { Badge, Button, Card, Field, Modal, Notice, cx, hsuApi, inputCls } from "../_components/ui";
import {
  DAY_PART_IS, PREF_STATUS_IS, WEEKDAY_SHORT_IS, datesInMonth, dayLabel, markFor, monthLabel, type HsuDoctor, type HsuPreference, type MonthStatus,
} from "@/lib/hsu/types";
import { findConflicts, requiredSlots, statsFor, toPlanDoctors, toPlanSlots, type PlanPrefs } from "@/lib/hsu/plan";
import type { PlannerCtx } from "./types";
import PlanBoard from "./PlanBoard";

const STEPS: { title: string; hint: string; icon: React.ReactNode }[] = [
  { title: "Óskir lækna", hint: "Læknar skrá óskir", icon: <ClipboardList className="h-4 w-4" /> },
  { title: "Samþykkja óskir", hint: "Yfirferð yfirlæknis", icon: <CheckCheck className="h-4 w-4" /> },
  { title: "Vaktaplan", hint: "Raða og lagfæra", icon: <Sparkles className="h-4 w-4" /> },
  { title: "Birta", hint: "Læknar fá planið", icon: <Megaphone className="h-4 w-4" /> },
];

const STATUS_STEP: Record<MonthStatus, number> = { collecting: 0, review: 1, planning: 2, published: 3 };

export default function MonthFlow({ ctx }: { ctx: PlannerCtx }) {
  const { data, month } = ctx;
  const status = data.month?.status ?? null;
  const reached = status ? STATUS_STEP[status] : -1;
  // Birtur mánuður opnast á vaktaplaninu sjálfu, ekki á birtingarskrefinu:
  // eftir birtingu er það planið sem unnið er með, en ekki birtingin aftur.
  const landing = Math.max(0, reached === 3 ? 2 : reached);
  const [step, setStep] = useState(landing);

  // Nýr mánuður (eða staða breytist annars staðar): hoppa á skrefið sem á við.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(landing);
  }, [month, landing]);

  const setStatus = async (next: MonthStatus, extra: Record<string, unknown> = {}) => {
    const r = await hsuApi<{ needsConfirm?: string; empty?: number }>(`/api/hsu/admin/months/${month}`, { method: "PUT", body: { status: next, ...extra }, staff: true });
    if (r.ok) await ctx.reload();
    return r;
  };

  const progress = useMemo(() => stepProgress(ctx), [ctx]);

  return (
    <div className="space-y-6">
      <Stepper step={step} progress={progress} onPick={setStep} />
      {step === 0 && <StepCollect ctx={ctx} setStatus={setStatus} goNext={() => setStep(1)} />}
      {step === 1 && <StepReview ctx={ctx} setStatus={setStatus} goNext={() => setStep(2)} />}
      {step === 2 && <StepPlan ctx={ctx} goNext={() => setStep(3)} />}
      {step === 3 && <StepPublish ctx={ctx} setStatus={setStatus} goPlan={() => setStep(2)} />}
      <AuditLog ctx={ctx} />
    </div>
  );
}

type StepState = { state: "done" | "partial" | "todo"; detail: string };

/**
 * Hversu langt hvert skref er komið. Grænt og fyllt aðeins þegar ALLT í skrefinu
 * er búið — ekki bara af því að mánuðurinn hefur verið færður áfram.
 */
function stepProgress(ctx: PlannerCtx): StepState[] {
  const { data } = ctx;
  const doctors = data.doctors.filter((d) => d.active);
  const byDoc = prefsByDoctor(data.preferences);
  const n = doctors.length;
  const sent = doctors.filter((d) => ["submitted", "approved"].includes(byDoc[d.id]?.status ?? "")).length;
  const approved = doctors.filter((d) => byDoc[d.id]?.status === "approved").length;

  const slots = toPlanSlots(data.shifts, data.shiftTypes);
  const planDocs = toPlanDoctors(doctors);
  const prefs: Record<string, PlanPrefs> = Object.fromEntries(data.preferences.map((p) => [p.doctor_id, p]));
  const empty = requiredSlots(slots, planDocs).filter((s) => !s.doctorId).length;
  const conflicts = Object.keys(findConflicts(slots, prefs, planDocs)).length;
  const pending = data.shifts.filter((s) => s.confirm_status === "requested").length;
  const published = data.month?.status === "published";

  const of = (x: number, label: string) => `${x} af ${n} ${label}`;
  return [
    !data.month ? { state: "todo", detail: "Ekki opnað" }
      : n > 0 && sent === n ? { state: "done", detail: "Allir hafa sent" } : { state: "partial", detail: of(sent, "sent") },
    n > 0 && approved === n ? { state: "done", detail: "Allar samþykktar" }
      : approved > 0 ? { state: "partial", detail: of(approved, "samþykktar") } : { state: "todo", detail: of(0, "samþykktar") },
    slots.length === 0 ? { state: "todo", detail: "Ekki búið til" }
      : empty === 0 && conflicts === 0 && pending === 0 ? { state: "done", detail: "Fullmannað" }
      : { state: "partial", detail: [empty && `${empty} tómar`, conflicts && `${conflicts} árekstrar`, pending && `${pending} bíða`].filter(Boolean).join(" · ") },
    published ? { state: "done", detail: "Birt" } : { state: "todo", detail: "Óbirt" },
  ];
}

function Stepper({ step, progress, onPick }: { step: number; progress: StepState[]; onPick: (n: number) => void }) {
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const { state, detail } = progress[i];
        const done = state === "done";
        const partial = state === "partial";
        const active = i === step;
        return (
          <li key={s.title}>
            <button onClick={() => onPick(i)}
              className={cx(
                "group flex w-full flex-col items-start gap-2 rounded-2xl border p-3 text-left transition sm:flex-row sm:items-center",
                active ? "border-[var(--hsu)] bg-white shadow-md ring-2 ring-[var(--hsu)]/15" : "border-slate-200 bg-white/60 hover:bg-white",
              )}>
              {/* Fyllt grænt = allt búið. Útlína = hálfnað. Grátt = ekki hafið. */}
              <span
                title={done ? "Allt búið" : partial ? "Hálfnað" : "Ekki hafið"}
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  done ? "bg-emerald-500 text-white"
                    : partial ? "bg-white text-amber-600 ring-[3px] ring-inset ring-amber-400"
                    : active ? "bg-white text-[var(--hsu)] ring-2 ring-inset ring-[var(--hsu)]" : "bg-slate-100 text-slate-500",
                )}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx("block truncate text-sm font-bold", active ? "text-slate-900" : "text-slate-600")}>{s.title}</span>
                <span className={cx("hidden truncate text-[11px] sm:block", done ? "text-emerald-700" : partial ? "text-amber-700" : "text-slate-500")}>{detail}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

type SetStatus = (next: MonthStatus, extra?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; needsConfirm?: string; empty?: number }>;

function prefsByDoctor(prefs: HsuPreference[]): Record<string, HsuPreference> {
  return Object.fromEntries(prefs.map((p) => [p.doctor_id, p]));
}

// ── Skref 1: óskir ──────────────────────────────────────────────────────────

function StepCollect({ ctx, setStatus, goNext }: { ctx: PlannerCtx; setStatus: SetStatus; goNext: () => void }) {
  const { data, month } = ctx;
  const m = data.month;
  const doctors = data.doctors.filter((d) => d.active);
  const byDoc = prefsByDoctor(data.preferences);
  const sent = doctors.filter((d) => ["submitted", "approved"].includes(byDoc[d.id]?.status ?? "")).length;

  const [deadline, setDeadline] = useState(m?.prefs_deadline ?? "");
  const [note, setNote] = useState(m?.note ?? "");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<HsuDoctor | null>(null);

  const open = async () => {
    setBusy("open"); setMsg(null);
    const r = await hsuApi(`/api/hsu/admin/months/${month}`, { method: "PUT", body: { status: "collecting", prefs_deadline: deadline || null, note, notify }, staff: true });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
    setMsg({ tone: "ok", text: notify ? "Opnað fyrir óskir og læknar látnir vita." : "Opnað fyrir óskir." });
    await ctx.reload();
  };

  const saveMeta = async () => {
    setBusy("meta");
    await hsuApi(`/api/hsu/admin/months/${month}`, { method: "PUT", body: { prefs_deadline: deadline || null, note }, staff: true });
    setBusy(null);
    await ctx.reload();
  };

  const remind = async () => {
    setBusy("remind"); setMsg(null);
    const r = await hsuApi<{ sent: number }>(`/api/hsu/admin/months/${month}`, { body: { action: "remind" }, staff: true });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: `Áminning send á ${r.sent} lækn${r.sent === 1 ? "i" : "a"}.` } : { tone: "err", text: r.error ?? "Mistókst" });
  };

  if (!m) {
    return (
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[1fr_1.2fr]">
          <div className="bg-gradient-to-br from-[var(--hsu)] to-[#2c6cc0] p-6 text-white sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Skref 1</div>
            <h2 className="mt-1 text-2xl font-bold">Byrjaðu á {monthLabel(month)}</h2>
            <ol className="mt-5 space-y-3 text-sm text-white/90">
              <li className="flex gap-2"><span className="font-bold">1.</span> Læknar merkja daga sem þeir geta ekki unnið og óskadaga.</li>
              <li className="flex gap-2"><span className="font-bold">2.</span> Þú ferð yfir og samþykkir óskir hvers og eins.</li>
              <li className="flex gap-2"><span className="font-bold">3.</span> Kerfið raðar vöktum sanngjarnt — þú lagfærir með því að draga lækna til.</li>
              <li className="flex gap-2"><span className="font-bold">4.</span> Þú birtir planið; það fer á síðu lækna og í dagatölin þeirra.</li>
            </ol>
          </div>
          <div className="space-y-4 p-6 sm:p-8">
            <Field label="Skilafrestur óska" hint="Valfrjálst. Kemur fram í tölvupósti og á síðu lækna.">
              <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field label="Skilaboð til lækna" hint="Valfrjálst, t.d. „Munið að Þjóðhátíð er fyrstu helgina“.">
              <textarea rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4" />
              Senda læknum tölvupóst ({doctors.length})
            </label>
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
            <Button size="lg" className="w-full" onClick={open} busy={busy === "open"}><Send className="h-4 w-4" /> Opna fyrir óskir</Button>
            <p className="text-center text-xs text-slate-500">Læknar geta líka skráð óskir fyrir fram, áður en mánuður er opnaður.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold">Óskir lækna</h2>
            <p className="text-sm text-slate-500">{sent} af {doctors.length} hafa sent inn óskir</p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 sm:w-48">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${doctors.length ? (sent / doctors.length) * 100 : 0}%` }} />
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {doctors.map((d) => {
            const p = byDoc[d.id];
            const st = p?.status ?? "none";
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{d.name}</div>
                  <div className="text-xs text-slate-500">
                    {d.fte}% starf{p?.submitted_at ? ` · sent ${dayLabel(p.submitted_at.slice(0, 10))}` : ""}{p?.entered_by ? ` · skráð af ${p.entered_by}` : ""}
                    {!d.activated && " · hefur ekki virkjað aðgang"}
                  </div>
                </div>
                <Badge tone={PREF_TONE[st]}>{PREF_STATUS_IS[st]}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /> {p ? "Skoða/breyta" : "Skrá fyrir hönd"}</Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <Field label="Skilafrestur">
            <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Skilaboð til lækna">
            <textarea rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {(deadline !== (m.prefs_deadline ?? "") || note !== (m.note ?? "")) && (
            <Button size="sm" variant="soft" onClick={saveMeta} busy={busy === "meta"}>Vista</Button>
          )}
        </Card>
        <Card className="space-y-3 p-5">
          <Button variant="ghost" className="w-full" onClick={remind} busy={busy === "remind"} disabled={sent === doctors.length}>
            <BellRing className="h-4 w-4" /> Senda áminningu ({doctors.length - sent})
          </Button>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          {m.status === "collecting" ? (
            <Button size="lg" className="w-full" busy={busy === "next"} onClick={async () => {
              if (sent < doctors.length && !confirm(`${doctors.length - sent} lækn${doctors.length - sent === 1 ? "ir hefur" : "ar hafa"} ekki sent óskir. Loka samt fyrir óskir?\n\nÞú getur skráð óskir fyrir þeirra hönd í næsta skrefi.`)) return;
              setBusy("next");
              const r = await setStatus("review");
              setBusy(null);
              if (r.ok) goNext();
            }}>
              Loka og fara í yfirferð <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button size="lg" className="w-full" onClick={goNext}>Áfram <ArrowRight className="h-4 w-4" /></Button>
              {m.status === "review" && (
                <button className="w-full text-center text-xs font-semibold text-slate-500 hover:underline" onClick={() => setStatus("collecting")}>
                  Opna aftur fyrir óskir
                </button>
              )}
            </>
          )}
        </Card>
      </div>

      {editing && <EditPrefsModal ctx={ctx} doctor={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditPrefsModal({ ctx, doctor, onClose }: { ctx: PlannerCtx; doctor: HsuDoctor; onClose: () => void }) {
  const pref = ctx.data.preferences.find((p) => p.doctor_id === doctor.id) ?? null;
  const initial = useMemo(() => draftFrom(pref), [pref]);
  const save = async (draft: PrefDraft, opts: { submit: boolean; alsoNext: boolean; approve?: boolean }) => {
    const r = await hsuApi<{ copiedTo: string | null }>("/api/hsu/admin/preferences", {
      method: "PUT", staff: true,
      body: { month: ctx.month, doctor_id: doctor.id, ...draft, approve: Boolean(opts.approve), also_next: opts.alsoNext },
    });
    if (r.ok) { await ctx.reload(); onClose(); }
    return r;
  };
  return (
    <Modal open onClose={onClose} title={`Óskir — ${doctor.name}`} wide>
      <PrefsEditor month={ctx.month} initial={initial} status={pref?.status ?? "none"} reviewNote={pref?.review_note} editable mode="admin" onSave={save} />
    </Modal>
  );
}

// ── Skref 2: yfirferð ───────────────────────────────────────────────────────

function StepReview({ ctx, setStatus, goNext }: { ctx: PlannerCtx; setStatus: SetStatus; goNext: () => void }) {
  const { data, month } = ctx;
  const doctors = data.doctors.filter((d) => d.active);
  const byDoc = prefsByDoctor(data.preferences);
  const approved = doctors.filter((d) => byDoc[d.id]?.status === "approved").length;
  const submitted = doctors.filter((d) => byDoc[d.id]?.status === "submitted").length;
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [askNote, setAskNote] = useState("");
  const [editing, setEditing] = useState<HsuDoctor | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dates = datesInMonth(month);

  const review = async (doctorId: string, action: "approve" | "request_changes" | "reopen", note = "") => {
    setBusy(doctorId + action); setErr(null);
    const r = await hsuApi("/api/hsu/admin/preferences/review", { body: { month, doctor_id: doctorId, action, note }, staff: true });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    setAsking(null); setAskNote("");
    await ctx.reload();
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Samþykkja óskir</h2>
          <p className="text-sm text-slate-500">
            {approved} af {doctors.length} samþykktar. „Get ekki“ er hörð regla í skiptingunni — farðu sérstaklega yfir hana.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {submitted > 0 && (
            <Button variant="success" busy={busy === "all"} onClick={async () => {
              setBusy("all");
              await hsuApi("/api/hsu/admin/preferences/review", { body: { month, action: "approve_all" }, staff: true });
              setBusy(null);
              await ctx.reload();
            }}><CheckCheck className="h-4 w-4" /> Samþykkja allar innsendar ({submitted})</Button>
          )}
          <Button busy={busy === "next"} onClick={async () => {
            if (approved < doctors.length && !confirm(`${doctors.length - approved} óskir eru ekki samþykktar. Halda samt áfram í vaktaplan?\n\nÓskir sem hafa verið skráðar gilda í skiptingunni hvort sem er.`)) return;
            if (data.month?.status === "collecting" || data.month?.status === "review") {
              setBusy("next"); await setStatus("planning"); setBusy(null);
            }
            goNext();
          }}>Áfram í vaktaplan <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </Card>
      {err && <Notice tone="err">{err}</Notice>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((d) => {
          const p = byDoc[d.id] ?? null;
          const st = p?.status ?? "none";
          const off = dates.filter((dt) => markFor(p, dt) === "off").length;
          const want = dates.filter((dt) => markFor(p, dt) === "want").length;
          const ok = dates.filter((dt) => !markFor(p, dt) && p?.day_marks?.[dt] === "ok").length;
          const offShare = off / dates.length;
          return (
            <Card key={d.id} className={cx("flex flex-col p-4", st === "approved" && "border-emerald-200")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{d.name}</div>
                    <div className="text-[11px] text-slate-500">{d.fte}% starfshlutfall</div>
                  </div>
                </div>
                <Badge tone={PREF_TONE[st]}>{PREF_STATUS_IS[st]}</Badge>
              </div>

              <div className="mt-3 flex gap-4">
                <PrefsMini month={month} pref={p} />
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5 text-red-500" /> {off} dagar get ekki</div>
                  <div className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-emerald-500" /> {want} óskadagar</div>
                  {ok > 0 && <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--hsu)]" /> {ok} dagar laus</div>}
                  {p?.evening_weekdays?.length ? <div className="font-semibold text-[var(--hsu-dark)]">Kvöldvaktir: {p.evening_weekdays.map((x) => WEEKDAY_SHORT_IS[x]).join(", ")}</div> : null}
                  {p && (p.day_part !== "all" || Object.keys(p.day_part_marks ?? {}).length > 0) ? (
                    <div className="font-semibold text-violet-700">
                      Dagvaktir: {DAY_PART_IS[p.day_part ?? "all"].toLowerCase()}
                      {Object.keys(p.day_part_marks ?? {}).length > 0 ? ` (${Object.keys(p.day_part_marks).length} dagar sér)` : ""}
                    </div>
                  ) : null}
                  <div>Vaktir: {p?.min_shifts ?? "–"} til {p?.max_shifts ?? "–"}</div>
                  {offShare > 0.5 && <div className="flex items-center gap-1 font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Óvenju margir lokaðir dagar</div>}
                </div>
              </div>

              {!p && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Engar óskir skráðar — gert ráð fyrir að læknirinn geti unnið alla daga.</p>}
              {p?.note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-700">„{p.note}“</p>}
              {p?.status === "changes_requested" && p.review_note && <p className="mt-2 text-xs text-red-700">Beðið um: {p.review_note}</p>}

              {asking === d.id ? (
                <div className="mt-3 space-y-2">
                  <textarea rows={2} autoFocus className={inputCls} placeholder="Hvað þarf læknirinn að breyta?" value={askNote} onChange={(e) => setAskNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => review(d.id, "request_changes", askNote)} busy={busy === d.id + "request_changes"} disabled={!askNote.trim()}>Senda beiðni</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>Hætta við</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {st !== "approved" ? (
                    <Button size="sm" variant="success" onClick={() => review(d.id, "approve")} busy={busy === d.id + "approve"}><Check className="h-3.5 w-3.5" /> Samþykkja</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => review(d.id, "reopen")} busy={busy === d.id + "reopen"}><RotateCcw className="h-3.5 w-3.5" /> Afturkalla</Button>
                  )}
                  {p && st !== "changes_requested" && (
                    <Button size="sm" variant="ghost" onClick={() => { setAsking(d.id); setAskNote(""); }}><MessageSquareWarning className="h-3.5 w-3.5" /> Biðja um breytingu</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /> Breyta</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {editing && <EditPrefsModal ctx={ctx} doctor={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── Skref 3: vaktaplan ──────────────────────────────────────────────────────

function StepPlan({ ctx, goNext }: { ctx: PlannerCtx; goNext: () => void }) {
  return <PlanBoard ctx={ctx} goNext={goNext} />;
}

// ── Skref 4: birta ──────────────────────────────────────────────────────────

function StepPublish({ ctx, setStatus, goPlan }: { ctx: PlannerCtx; setStatus: SetStatus; goPlan: () => void }) {
  const { data, month } = ctx;
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const published = data.month?.status === "published";

  const slots = toPlanSlots(data.shifts, data.shiftTypes);
  const planDocs = toPlanDoctors(data.doctors.filter((d) => d.active));
  const prefs: Record<string, PlanPrefs> = Object.fromEntries(data.preferences.map((p) => [p.doctor_id, p]));
  const conflicts = Object.keys(findConflicts(slots, prefs, planDocs)).length;
  const empty = requiredSlots(slots, planDocs).filter((s) => !s.doctorId).length;
  const pending = data.shifts.filter((s) => s.confirm_status === "requested").length;
  const stats = statsFor(slots, planDocs, prefs);

  const publish = async (allowGaps = false) => {
    setBusy("pub"); setErr(null);
    const r = await setStatus("published", { notify, allow_gaps: allowGaps });
    setBusy(null);
    if (r.needsConfirm === "gaps") {
      if (confirm(`${r.empty} vakt${r.empty === 1 ? " er" : "ir eru"} án læknis. Birta samt?`)) return publish(true);
      return;
    }
    if (!r.ok) setErr(r.error ?? "Mistókst");
  };

  return (
    <div className="space-y-5">
      {published ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 bg-emerald-50 p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-6 w-6" /></span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-900">Vaktaplan {monthLabel(month)} er birt</h2>
              <p className="text-sm text-emerald-800">
                Birt {data.month?.published_at ? dayLabel(data.month.published_at.slice(0, 10)) : ""} Læknar sjá planið á sinni síðu og í tengdum dagatölum.
                Breytingar héðan í frá birtast strax og læknarnir sem breytingin snertir fá tölvupóst.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={goPlan}><Eye className="h-4 w-4" /> Opna vaktaplan</Button>
              <Button variant="ghost" busy={busy === "unpub"} onClick={async () => {
                if (!confirm("Taka vaktaplan úr birtingu? Vaktirnar hverfa af síðum lækna og úr dagatölum þar til þú birtir aftur.")) return;
                setBusy("unpub"); await setStatus("planning"); setBusy(null);
              }}><Undo2 className="h-4 w-4" /> Taka úr birtingu</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-bold">Birta vaktaplan {monthLabel(month)}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Vaktir", data.shifts.length, "slate"],
              ["Án læknis", empty, empty ? "red" : "green"],
              ["Árekstrar", conflicts, conflicts ? "amber" : "green"],
              ["Læknar", data.doctors.filter((d) => d.active).length, "slate"],
            ].map(([l, v, tone]) => (
              <div key={String(l)} className={cx("rounded-2xl p-4 text-center", tone === "red" ? "bg-red-50" : tone === "amber" ? "bg-amber-50" : tone === "green" ? "bg-emerald-50" : "bg-slate-50")}>
                <div className="text-2xl font-bold tabular-nums">{v}</div>
                <div className="text-xs text-slate-600">{l}</div>
              </div>
            ))}
          </div>
          {data.shifts.length === 0 && <div className="mt-4"><Notice tone="warn">Ekkert vaktaplan er til. <button className="font-semibold underline" onClick={goPlan}>Búa það til</button></Notice></div>}
          {conflicts > 0 && <div className="mt-4"><Notice tone="warn">Það eru {conflicts} árekstrar við óskir, hvíld eða bakvaktarreglur. <button className="font-semibold underline" onClick={goPlan}>Skoða</button></Notice></div>}
          {pending > 0 && <div className="mt-4"><Notice tone="warn">{pending} vakt{pending === 1 ? " bíður" : "ir bíða"} samþykkis læknis (umfram hámark). Þær fara ekki í dagatal fyrr en læknirinn samþykkir.</Notice></div>}
          <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4" />
            Senda læknum tölvupóst með fjölda vakta sinna
          </label>
          {err && <div className="mt-3"><Notice tone="err">{err}</Notice></div>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => publish()} busy={busy === "pub"} disabled={data.shifts.length === 0}><Megaphone className="h-4 w-4" /> Birta vaktaplan</Button>
            <Button size="lg" variant="ghost" onClick={goPlan}>Til baka í vaktaplan</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Læknir</th>
              <th className="px-4 py-2.5 text-right">Vaktir</th>
              <th className="px-4 py-2.5 text-right">Markmið</th>
              <th className="px-4 py-2.5 text-right">Helgar/frídagar</th>
              <th className="px-4 py-2.5 text-right">Bakvaktir</th>
              <th className="px-4 py-2.5 text-right">Óskadagar uppfylltir</th>
            </tr>
          </thead>
          <tbody>
            {data.doctors.filter((d) => d.active).map((d) => {
              const s = stats[d.id];
              if (!s) return null;
              return (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{s.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{s.target.toLocaleString("is-IS")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.weekend}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.can_bakvakt ? s.bakvakt : "–"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.wantTotal ? `${s.wantHit} / ${s.wantTotal}` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Breytingaskrá ───────────────────────────────────────────────────────────

const ACTION_IS: Record<string, string> = {
  "month.collecting": "opnaði fyrir óskir",
  "month.review": "lokaði fyrir óskir",
  "month.planning": "færði mánuð í vaktaplan",
  "month.published": "birti vaktaplan",
  "month.remind": "sendi áminningu",
  "prefs.submit": "sendi inn óskir",
  "prefs.enter": "skráði óskir fyrir lækni",
  "prefs.approve": "samþykkti óskir",
  "prefs.approve_all": "samþykkti allar innsendar óskir",
  "prefs.request_changes": "bað um breytingar á óskum",
  "prefs.reopen": "afturkallaði samþykki",
  "plan.generate": "bjó til vaktaplan",
  "plan.slots": "bjó til vaktir",
  "shift.assign": "færði lækna á vaktir",
  "shift.edit": "breytti vakt",
  "shift.create": "bætti við vakt",
  "shift.delete": "eyddi vakt",
  "request.accept": "samþykkti aukavakt",
  "request.decline": "hafnaði aukavakt",
  "market.open": "setti vakt á vaktamarkað",
  "market.offer": "bauð lækni vakt",
  "market.transfer": "vakt skipti um hendur",
  "market.request": "bað um að taka vakt",
  "market.decline": "hafnaði boði",
  "market.cancel": "afturkallaði boð",
  "market.reject": "hafnaði vaktaskiptum",
};

function AuditLog({ ctx }: { ctx: PlannerCtx }) {
  if (!ctx.data.audit.length) return null;
  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-600"><History className="h-4 w-4" /> Breytingaskrá mánaðarins</summary>
      <ul className="divide-y divide-slate-50 px-5 pb-3">
        {ctx.data.audit.map((a, i) => (
          <li key={i} className="flex justify-between gap-4 py-2 text-xs">
            <span><span className="font-semibold text-slate-800">{a.actor}</span> <span className="text-slate-600">{ACTION_IS[a.action] ?? a.action}</span></span>
            <span className="shrink-0 tabular-nums text-slate-400">{new Date(a.at).toLocaleString("is-IS", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
