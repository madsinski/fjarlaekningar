"use client";

// Mánaðarplan í fjórum skrefum. Hvert skref segir hvað þarf að gera og býður
// næsta skref þegar það er tilbúið; yfirlæknir getur samt alltaf flett á milli.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Ban, BellRing, Check, CheckCheck, ClipboardList, Eye, Heart, History, Megaphone, MessageSquareWarning,
  Pencil, RotateCcw, Sparkles, Undo2,
} from "lucide-react";
import PrefsEditor, { PREF_TONE, PrefsMini, draftFrom, type PrefDraft } from "../_components/PrefsEditor";
import { Badge, Button, Card, Field, Modal, Notice, cx, hsuApi, inputCls } from "../_components/ui";
import { datesInMonth, effectiveStatus, inOpenWindow, markFor, openWindow, opensOn, type HsuDoctor, type HsuPreference, type MonthStatus } from "@/lib/hsu/types";
import { useCommon, useT } from "@/lib/hsu/i18n/client";
import { LANG_LOCALE, type Translator } from "@/lib/hsu/i18n/core";
import { dateTimeL, dayLabelL, dayPartL, monthLabelL, prefStatusL, weekdayShortL } from "@/lib/hsu/i18n/format";
import { stjorn } from "@/lib/hsu/i18n/messages/stjorn";
import { findConflicts, requiredSlots, statsFor, toPlanDoctors, toPlanSlots, type PlanPrefs } from "@/lib/hsu/plan";
import type { PlannerCtx } from "./types";
import PlanBoard from "./PlanBoard";

type T = Translator<typeof stjorn.is>;

const STEPS: { key: "collect" | "review" | "plan" | "publish"; icon: React.ReactNode }[] = [
  { key: "collect", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "review", icon: <CheckCheck className="h-4 w-4" /> },
  { key: "plan", icon: <Sparkles className="h-4 w-4" /> },
  { key: "publish", icon: <Megaphone className="h-4 w-4" /> },
];

const STATUS_STEP: Record<MonthStatus, number> = { collecting: 0, review: 1, planning: 2, published: 3 };

export default function MonthFlow({ ctx }: { ctx: PlannerCtx }) {
  const t = useT(stjorn);
  const { data, month } = ctx;
  // Næstu þrír mánuðir eru opnir fyrir óskir án þess að yfirlæknir opni þá.
  const status = effectiveStatus(data.month, month);
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

  const progress = useMemo(() => stepProgress(ctx, t), [ctx, t]);

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
function stepProgress(ctx: PlannerCtx, t: T): StepState[] {
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

  return [
    !effectiveStatus(data.month, ctx.month) ? { state: "todo", detail: t("progress.notOpened") }
      : n > 0 && sent === n ? { state: "done", detail: t("progress.allSent") } : { state: "partial", detail: t("progress.sent", { x: sent, n }) },
    n > 0 && approved === n ? { state: "done", detail: t("progress.allApproved") }
      : approved > 0 ? { state: "partial", detail: t("progress.approved", { x: approved, n }) } : { state: "todo", detail: t("progress.approved", { x: 0, n }) },
    slots.length === 0 ? { state: "todo", detail: t("progress.notCreated") }
      : empty === 0 && conflicts === 0 && pending === 0 ? { state: "done", detail: t("progress.full") }
      : { state: "partial", detail: [empty && t.n("progress.empty", empty), conflicts && t.n("progress.conflicts", conflicts), pending && t.n("progress.pending", pending)].filter(Boolean).join(" · ") },
    published ? { state: "done", detail: t("progress.published") } : { state: "todo", detail: t("progress.unpublished") },
  ];
}

function Stepper({ step, progress, onPick }: { step: number; progress: StepState[]; onPick: (n: number) => void }) {
  const t = useT(stjorn);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const { state, detail } = progress[i];
        const done = state === "done";
        const partial = state === "partial";
        const active = i === step;
        return (
          <li key={s.key}>
            <button onClick={() => onPick(i)}
              className={cx(
                "group flex w-full flex-col items-start gap-2 rounded-2xl border p-3 text-left transition sm:flex-row sm:items-center",
                active ? "border-[var(--hsu)] bg-white shadow-md ring-2 ring-[var(--hsu)]/15" : "border-slate-200 bg-white/60 hover:bg-white",
              )}>
              {/* Fyllt grænt = allt búið. Útlína = hálfnað. Grátt = ekki hafið. */}
              <span
                title={t(done ? "step.state.done" : partial ? "step.state.partial" : "step.state.todo")}
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  done ? "bg-emerald-500 text-white"
                    : partial ? "bg-white text-amber-600 ring-[3px] ring-inset ring-amber-400"
                    : active ? "bg-white text-[var(--hsu)] ring-2 ring-inset ring-[var(--hsu)]" : "bg-slate-100 text-slate-500",
                )}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx("block truncate text-sm font-bold", active ? "text-slate-900" : "text-slate-600")}>{t(`step.${s.key}.title`)}</span>
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
  const t = useT(stjorn);
  const c = useCommon();
  const { data, month } = ctx;
  // Mánuður í opna glugganum án raðar er opinn fyrir óskir; röðin verður til
  // þegar skilafrestur er vistaður eða mánuðurinn færður áfram.
  const open3 = inOpenWindow(month);
  const m = data.month ?? (open3 ? { month, status: "collecting" as const, prefs_deadline: null, note: "", opened_at: "", published_at: null } : null);
  const doctors = data.doctors.filter((d) => d.active);
  const byDoc = prefsByDoctor(data.preferences);
  const sent = doctors.filter((d) => ["submitted", "approved"].includes(byDoc[d.id]?.status ?? "")).length;

  const [deadline, setDeadline] = useState(m?.prefs_deadline ?? "");
  const [note, setNote] = useState(m?.note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<HsuDoctor | null>(null);

  const saveMeta = async () => {
    setBusy("meta");
    await hsuApi(`/api/hsu/admin/months/${month}`, { method: "PUT", body: { prefs_deadline: deadline || null, note }, staff: true });
    setBusy(null);
    await ctx.reload();
  };

  // Áminningar má senda eins oft og þarf — þeim sem eiga eftir, öllum, eða einum.
  const [reminders, setReminders] = useState<{ at: string; actor: string; detail: { count?: number; scope?: string; names?: string[] } }[]>([]);
  const loadReminders = useCallback(async () => {
    const r = await hsuApi<{ reminders: typeof reminders }>(`/api/hsu/admin/months/${month}`, { staff: true });
    if (r.ok) setReminders(r.reminders);
  }, [month]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReminders();
  }, [loadReminders]);
  const remind = async (scope: "missing" | "all" | "one", doctor?: HsuDoctor) => {
    const key = doctor ? `remind:${doctor.id}` : `remind:${scope}`;
    setBusy(key); setMsg(null);
    const r = await hsuApi<{ sent: number; skipped: number; reminders: typeof reminders }>(`/api/hsu/admin/months/${month}`, {
      body: { action: "remind", scope, doctorId: doctor?.id }, staff: true,
    });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("failed") }); return; }
    const who = doctor ? doctor.name : t.n("collect.remind.doctors", r.sent);
    setMsg({
      tone: "ok",
      text: r.sent ? `${t("collect.remind.sent", { who })}${r.skipped ? ` ${t.n("collect.remind.skipped", r.skipped)}` : ""}`
        : t("collect.remind.none"),
    });
    if (r.reminders) setReminders(r.reminders);
  };

  if (!m) {
    const past = month < openWindow()[0];
    return (
      <Card className="p-6 sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("collect.start.step")}</div>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{t("collect.start.title", { month: monthLabelL(month, t.lang) })}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {past ? t("collect.past", { month: monthLabelL(month, t.lang) })
            : t("collect.later", { month: monthLabelL(month, t.lang), date: dayLabelL(opensOn(month), t.lang) })}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold">{t("collect.title")}</h2>
            <p className="text-sm text-slate-500">{t("collect.sentCount", { x: sent, n: doctors.length })}</p>
            <p className="mt-1 text-xs text-slate-500">{t("collect.auto")}</p>
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
                    {t("collect.fte", { fte: d.fte })}{p?.submitted_at ? t("collect.sentOn", { date: dayLabelL(p.submitted_at.slice(0, 10), t.lang) }) : ""}{p?.entered_by ? t("collect.enteredBy", { name: p.entered_by }) : ""}
                    {!d.activated && t("collect.notActivated")}
                  </div>
                </div>
                <Badge tone={PREF_TONE[st]}>{prefStatusL(st, t.lang)}</Badge>
                <Button variant="ghost" size="sm" onClick={() => remind("one", d)} busy={busy === `remind:${d.id}`} title={t("collect.remindOne", { name: d.name })} aria-label={t("collect.remindOne", { name: d.name })}>
                  <BellRing className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /> {t(p ? "collect.viewEdit" : "collect.enterFor")}</Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <Field label={t("collect.deadline.short")}>
            <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label={t("collect.note.label")}>
            <textarea rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {(deadline !== (m.prefs_deadline ?? "") || note !== (m.note ?? "")) && (
            <Button size="sm" variant="soft" onClick={saveMeta} busy={busy === "meta"}>{c("action.save")}</Button>
          )}
        </Card>
        <Card className="space-y-3 p-5">
          <div className="text-sm font-semibold text-slate-800">{t("collect.remind.title")}</div>
          <Button variant="ghost" className="w-full" onClick={() => remind("missing")} busy={busy === "remind:missing"} disabled={sent === doctors.length}>
            <BellRing className="h-4 w-4" /> {t("collect.remind.missing", { n: doctors.length - sent })}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => remind("all")} busy={busy === "remind:all"} disabled={!doctors.length}>
            <BellRing className="h-4 w-4" /> {t("collect.remind.all", { n: doctors.length })}
          </Button>
          <p className="text-[11px] text-slate-500">{t("collect.remind.help")}</p>
          {reminders.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
              <div className="font-semibold text-slate-700">{t("collect.reminders.title")}</div>
              <ul className="mt-1 space-y-0.5">
                {reminders.map((r) => (
                  <li key={r.at}>
                    {t("collect.reminders.when", {
                      day: dayLabelL(r.at.slice(0, 10), t.lang),
                      time: `${String(new Date(r.at).getHours()).padStart(2, "0")}:${String(new Date(r.at).getMinutes()).padStart(2, "0")}`,
                    })} —{" "}
                    {r.detail.scope === "one" && r.detail.names?.[0] ? r.detail.names[0]
                      : r.detail.scope === "all" ? t("collect.reminders.all", { count: t.n("collect.reminders.count", r.detail.count ?? 0) })
                      : t.n("collect.reminders.count", r.detail.count ?? 0)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          {m.status === "collecting" ? (
            <Button size="lg" className="w-full" busy={busy === "next"} onClick={async () => {
              if (sent < doctors.length && !confirm(t.n("collect.close.confirm", doctors.length - sent))) return;
              setBusy("next");
              const r = await setStatus("review");
              setBusy(null);
              if (r.ok) goNext();
            }}>
              {t("collect.close")} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button size="lg" className="w-full" onClick={goNext}>{c("action.next")} <ArrowRight className="h-4 w-4" /></Button>
              {m.status === "review" && (
                <button className="w-full text-center text-xs font-semibold text-slate-500 hover:underline" onClick={() => setStatus("collecting")}>
                  {t("collect.reopen")}
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
  const t = useT(stjorn);
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
    <Modal open onClose={onClose} title={t("prefs.modalTitle", { name: doctor.name })} wide>
      <PrefsEditor month={ctx.month} initial={initial} status={pref?.status ?? "none"} reviewNote={pref?.review_note} editable mode="admin" onSave={save} />
    </Modal>
  );
}

// ── Skref 2: yfirferð ───────────────────────────────────────────────────────

function StepReview({ ctx, setStatus, goNext }: { ctx: PlannerCtx; setStatus: SetStatus; goNext: () => void }) {
  const t = useT(stjorn);
  const c = useCommon();
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
    if (!r.ok) { setErr(r.error ?? t("failed")); return; }
    setAsking(null); setAskNote("");
    await ctx.reload();
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">{t("review.title")}</h2>
          <p className="text-sm text-slate-500">
            {t("review.summary", { x: approved, n: doctors.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {submitted > 0 && (
            <Button variant="success" busy={busy === "all"} onClick={async () => {
              setBusy("all");
              await hsuApi("/api/hsu/admin/preferences/review", { body: { month, action: "approve_all" }, staff: true });
              setBusy(null);
              await ctx.reload();
            }}><CheckCheck className="h-4 w-4" /> {t("review.approveAll", { n: submitted })}</Button>
          )}
          <Button busy={busy === "next"} onClick={async () => {
            if (approved < doctors.length && !confirm(t.n("review.next.confirm", doctors.length - approved))) return;
            if (data.month?.status === "collecting" || data.month?.status === "review") {
              setBusy("next"); await setStatus("planning"); setBusy(null);
            }
            goNext();
          }}>{t("review.next")} <ArrowRight className="h-4 w-4" /></Button>
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
                    <div className="text-[11px] text-slate-500">{t("review.fte", { fte: d.fte })}</div>
                  </div>
                </div>
                <Badge tone={PREF_TONE[st]}>{prefStatusL(st, t.lang)}</Badge>
              </div>

              <div className="mt-3 flex gap-4">
                <PrefsMini month={month} pref={p} />
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5 text-red-500" /> {t.n("review.off", off)}</div>
                  <div className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-emerald-500" /> {t.n("review.want", want)}</div>
                  {ok > 0 && <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--hsu)]" /> {t.n("review.ok", ok)}</div>}
                  {p?.evening_weekdays?.length ? <div className="font-semibold text-[var(--hsu-dark)]">{t("review.evenings", { days: p.evening_weekdays.map((x) => weekdayShortL(x, t.lang)).join(", ") })}</div> : null}
                  {p && (p.day_part !== "all" || Object.keys(p.day_part_marks ?? {}).length > 0) ? (
                    <div className="font-semibold text-violet-700">
                      {t("review.dayPart", { part: dayPartL(p.day_part ?? "all", t.lang).toLowerCase() })}
                      {Object.keys(p.day_part_marks ?? {}).length > 0 ? t.n("review.dayPartDays", Object.keys(p.day_part_marks).length) : ""}
                    </div>
                  ) : null}
                  <div>{t("review.range", { min: p?.min_shifts ?? "–", max: p?.max_shifts ?? "–" })}</div>
                  {offShare > 0.5 && <div className="flex items-center gap-1 font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {t("review.manyOff")}</div>}
                </div>
              </div>

              {!p && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{t("review.noPrefs")}</p>}
              {p?.note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-700">{t("review.note", { note: p.note })}</p>}
              {p?.status === "changes_requested" && p.review_note && <p className="mt-2 text-xs text-red-700">{t("review.askedFor", { note: p.review_note })}</p>}

              {asking === d.id ? (
                <div className="mt-3 space-y-2">
                  <textarea rows={2} autoFocus className={inputCls} placeholder={t("review.ask.placeholder")} value={askNote} onChange={(e) => setAskNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => review(d.id, "request_changes", askNote)} busy={busy === d.id + "request_changes"} disabled={!askNote.trim()}>{t("review.ask.send")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>{c("action.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {st !== "approved" ? (
                    <Button size="sm" variant="success" onClick={() => review(d.id, "approve")} busy={busy === d.id + "approve"}><Check className="h-3.5 w-3.5" /> {t("review.approve")}</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => review(d.id, "reopen")} busy={busy === d.id + "reopen"}><RotateCcw className="h-3.5 w-3.5" /> {t("review.reopen")}</Button>
                  )}
                  {p && st !== "changes_requested" && (
                    <Button size="sm" variant="ghost" onClick={() => { setAsking(d.id); setAskNote(""); }}><MessageSquareWarning className="h-3.5 w-3.5" /> {t("review.ask")}</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /> {c("action.edit")}</Button>
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
  const t = useT(stjorn);
  const { data, month } = ctx;
  const [busy, setBusy] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
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
      if (confirm(t.n("publish.gaps.confirm", r.empty ?? 0))) return publish(true);
      return;
    }
    if (!r.ok) setErr(r.error ?? t("failed"));
  };

  return (
    <div className="space-y-5">
      {published ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 bg-emerald-50 p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-6 w-6" /></span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-900">{t("publish.done.title", { month: monthLabelL(month, t.lang) })}</h2>
              <p className="text-sm text-emerald-800">
                {t("publish.done.body", { date: data.month?.published_at ? dayLabelL(data.month.published_at.slice(0, 10), t.lang) : "" })}{" "}
                {t("publish.done.body2")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={goPlan}><Eye className="h-4 w-4" /> {t("publish.openPlan")}</Button>
              <Button variant="ghost" busy={busy === "unpub"} onClick={async () => {
                if (!confirm(t("publish.unpublish.confirm"))) return;
                setBusy("unpub"); await setStatus("planning"); setBusy(null);
              }}><Undo2 className="h-4 w-4" /> {t("publish.unpublish")}</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-bold">{t("publish.title", { month: monthLabelL(month, t.lang) })}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t("publish.stat.shifts"), data.shifts.length, "slate"],
              [t("publish.stat.empty"), empty, empty ? "red" : "green"],
              [t("publish.stat.conflicts"), conflicts, conflicts ? "amber" : "green"],
              [t("publish.stat.doctors"), data.doctors.filter((d) => d.active).length, "slate"],
            ].map(([l, v, tone]) => (
              <div key={String(l)} className={cx("rounded-2xl p-4 text-center", tone === "red" ? "bg-red-50" : tone === "amber" ? "bg-amber-50" : tone === "green" ? "bg-emerald-50" : "bg-slate-50")}>
                <div className="text-2xl font-bold tabular-nums">{v}</div>
                <div className="text-xs text-slate-600">{l}</div>
              </div>
            ))}
          </div>
          {data.shifts.length === 0 && <div className="mt-4"><Notice tone="warn">{t("publish.noPlan")} <button className="font-semibold underline" onClick={goPlan}>{t("publish.noPlan.create")}</button></Notice></div>}
          {conflicts > 0 && <div className="mt-4"><Notice tone="warn">{t.n("publish.conflicts", conflicts)} <button className="font-semibold underline" onClick={goPlan}>{t("publish.conflicts.view")}</button></Notice></div>}
          {pending > 0 && <div className="mt-4"><Notice tone="warn">{t.n("publish.pending", pending)}</Notice></div>}
          <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4" />
            {t("publish.notify")}
          </label>
          {err && <div className="mt-3"><Notice tone="err">{err}</Notice></div>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => publish()} busy={busy === "pub"} disabled={data.shifts.length === 0}><Megaphone className="h-4 w-4" /> {t("publish.publish")}</Button>
            <Button size="lg" variant="ghost" onClick={goPlan}>{t("publish.backToPlan")}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">{t("publish.col.doctor")}</th>
              <th className="px-4 py-2.5 text-right">{t("publish.col.shifts")}</th>
              <th className="px-4 py-2.5 text-right">{t("publish.col.target")}</th>
              <th className="px-4 py-2.5 text-right">{t("publish.col.weekend")}</th>
              <th className="px-4 py-2.5 text-right">{t("publish.col.bakvakt")}</th>
              <th className="px-4 py-2.5 text-right">{t("publish.col.wants")}</th>
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
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{s.target.toLocaleString(LANG_LOCALE[t.lang])}</td>
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

function AuditLog({ ctx }: { ctx: PlannerCtx }) {
  const t = useT(stjorn);
  const actionLabel = (action: string) => {
    const key = `audit.${action}`;
    const label = t.dyn(key);
    return label === key ? action : label;
  };
  if (!ctx.data.audit.length) return null;
  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-600"><History className="h-4 w-4" /> {t("audit.title")}</summary>
      <ul className="divide-y divide-slate-50 px-5 pb-3">
        {ctx.data.audit.map((a, i) => (
          <li key={i} className="flex justify-between gap-4 py-2 text-xs">
            <span><span className="font-semibold text-slate-800">{a.actor}</span> <span className="text-slate-600">{actionLabel(a.action)}</span></span>
            <span className="shrink-0 tabular-nums text-slate-400">{dateTimeL(a.at, t.lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
