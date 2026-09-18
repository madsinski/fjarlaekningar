"use client";

// Yfirlit læknis sem leið í gegnum mánuðinn, skref fyrir skref — sama mynstur
// og mánaðarflæði yfirlæknis (/hsu/stjorn): síðan opnast á skrefinu sem á við
// núna og segir skýrt hvað á að gera.
//
//   1. Aðgangurinn þinn   lykilorð, dagatal, (aðgangskóði)
//   2. Vaktaóskir         fyrir mánuðinn sem verið er að skipuleggja
//   3. Vaktaplan          yfirlæknir gerir það og birtir
//   4. Vaktirnar þínar    næsta vakt, beiðnir og boð sem þarf að svara
//   5. Eftir vakt         skrá útköll í Vinnustund

import { useState, type ReactNode } from "react";
import { ArrowRight, CalendarCheck, Check, CheckCircle2, CircleDashed, ClipboardList, Clock, KeyRound, Lightbulb, UserRound } from "lucide-react";
import type { PortalData } from "@/lib/hsu/portal";
import type { HsuSwap } from "@/lib/hsu/types";
import { effectiveStatus, holidayName, openWindow, weekdayOf } from "@/lib/hsu/types";
import { useT } from "@/lib/hsu/i18n/client";
import { journey } from "@/lib/hsu/i18n/messages/journey";
import { dayLabelL, holidayL, monthLabelL, weekdayLongL } from "@/lib/hsu/i18n/format";
import { Card, cx } from "../_components/ui";

type Tab = "yfirlit" | "vaktir" | "oskir" | "markadur" | "plan" | "stillingar";
/** current = þú þarft að gera eitthvað · active = í gangi, ekkert áríðandi · waiting = bíður annarra */
type State = "done" | "current" | "active" | "waiting" | "upcoming" | "missed";

interface Action { label: string; onClick: () => void; primary?: boolean; tone?: "red" }
interface Step {
  key: "account" | "prefs" | "plan" | "shifts" | "after";
  icon: ReactNode;
  state: State;
  bar: string;
  head: string;
  body: string[];
  checklist?: { label: string; done: boolean; optional?: boolean }[];
  alerts?: { text: string; action: Action }[];
  tip?: string;
  actions: Action[];
}

const hhmm = (t: string) => (t || "").slice(0, 5);

export function useJourney({ data, incoming, market, unlogged, go, onCalendar }: {
  data: PortalData; incoming: HsuSwap[]; market: HsuSwap[]; unlogged: number; go: (t: Tab) => void;
  /** Opnar dagatalsgluggann (sama og við fyrstu innskráningu). */
  onCalendar: () => void;
}): { steps: Step[]; landing: number; planMonth: string } {
  const t = useT(journey);
  const L = t.lang;
  const me = data.me;

  // ── Mánuðurinn sem verið er að skipuleggja ──
  // Næstu þrír mánuðir eru opnir fyrir óskir (effectiveStatus); fyrsti mánuður
  // sem er enn í vinnslu ræður skrefum 2–3, annars næsti mánuður.
  const openMonths = openWindow();
  const candidates = [...new Set([...openMonths, ...data.months.map((m) => m.month)])].filter((m) => m >= openMonths[0]).sort();
  const stOf = (m: string) => effectiveStatus(data.months.find((x) => x.month === m), m);
  const planMonth = candidates.find((m) => { const st = stOf(m); return st === "collecting" || st === "review" || st === "planning"; }) ?? openMonths[0];
  const found = data.months.find((m) => m.month === planMonth);
  const effective = stOf(planMonth);
  const row = effective ? { ...(found ?? { month: planMonth, prefs_deadline: null, note: "", published_at: null }), status: effective } : undefined;
  const pref = data.prefs.find((p) => p.month === planMonth);
  const monthName = monthLabelL(planMonth, L);

  // 1. Aðgangur
  const calendar = me.hasCalendarToken || me.googleConnected;
  const accountDone = !me.mustChangePassword && calendar;
  const account: Step = {
    key: "account", icon: <UserRound className="h-4 w-4" />,
    state: accountDone ? "done" : "current",
    bar: t(accountDone ? "account.bar.done" : "account.bar.todo"),
    // Aðeins dagatalið eftir: segja það beint.
    head: t(accountDone ? "account.head.done" : me.mustChangePassword ? "account.head.todo" : "account.head.calendar"),
    body: [t(accountDone ? "account.body.done" : "account.body.todo")],
    checklist: [
      { label: t("account.item.password"), done: !me.mustChangePassword },
      { label: t("account.item.calendar"), done: calendar },
      { label: t("account.item.pin"), done: me.hasPin, optional: true },
    ],
    actions: accountDone ? []
      : me.mustChangePassword ? [{ label: t("account.action"), onClick: () => go("stillingar"), primary: true }]
      : [{ label: t("account.calendarAction"), onClick: onCalendar, primary: true }],
  };

  // 2. Vaktaóskir
  const ps = pref?.status ?? "none";
  const deadline = row?.prefs_deadline ? dayLabelL(row.prefs_deadline, L) : null;
  let prefs: Step;
  const prefsBase = { key: "prefs" as const, icon: <ClipboardList className="h-4 w-4" /> };
  if (!row) {
    prefs = { ...prefsBase, state: "upcoming", bar: t("prefs.bar.notOpen"), head: t("prefs.head.notOpen"), body: [t("prefs.body.notOpen", { month: monthName })], actions: [] };
  } else if (ps === "changes_requested" && (row.status === "collecting" || row.status === "review")) {
    prefs = {
      ...prefsBase, state: "current", bar: t("prefs.bar.changes"), head: t("prefs.head.changes"),
      body: [t("prefs.body.changes", { month: monthName }), ...(pref?.review_note ? [`„${pref.review_note}“`] : [])],
      actions: [{ label: t("prefs.action.changes"), onClick: () => go("oskir"), primary: true, tone: "red" }],
    };
  } else if (ps === "approved") {
    prefs = { ...prefsBase, state: "done", bar: t("prefs.bar.approved"), head: t("prefs.head.approved"), body: [t("prefs.body.approved", { month: monthName })], actions: [{ label: t("prefs.action.view"), onClick: () => go("oskir") }] };
  } else if (ps === "submitted") {
    prefs = { ...prefsBase, state: "done", bar: t("prefs.bar.submitted"), head: t("prefs.head.submitted"), body: [t("prefs.body.submitted")], actions: [{ label: t("prefs.action.view"), onClick: () => go("oskir") }] };
  } else if (row.status === "collecting") {
    prefs = {
      ...prefsBase, state: "current", bar: deadline ? t("prefs.bar.deadline", { date: deadline }) : t("prefs.bar.open"),
      head: t("prefs.head.open", { month: monthName }),
      body: [t("prefs.body.open"), ...(deadline ? [t("prefs.body.deadline", { date: deadline })] : [])],
      actions: [{ label: t("prefs.action.open"), onClick: () => go("oskir"), primary: true }],
    };
  } else {
    prefs = { ...prefsBase, state: "missed", bar: t("prefs.bar.missed"), head: t("prefs.head.missed"), body: [t("prefs.body.missed", { month: monthName })], actions: [] };
  }

  // 3. Vaktaplan
  const mine = data.myShifts.filter((s) => s.shift_date.startsWith(planMonth)).length;
  let plan: Step;
  const planBase = { key: "plan" as const, icon: <CalendarCheck className="h-4 w-4" /> };
  if (row?.status === "planning") {
    plan = { ...planBase, state: "waiting", bar: t("plan.bar.building"), head: t("plan.head.building"), body: [t("plan.body.building", { month: monthName })], actions: [] };
  } else if (row?.status === "published") {
    plan = {
      ...planBase, state: "done", bar: t("plan.bar.published"), head: t("plan.head.published", { month: monthName }),
      body: [mine ? t.n("plan.body.published", mine, { month: monthName }) : t("plan.body.publishedNone", { month: monthName })],
      actions: [{ label: t("plan.action"), onClick: () => go("plan") }],
    };
  } else {
    plan = { ...planBase, state: "upcoming", bar: t("plan.bar.later"), head: t("plan.head.later"), body: [t("plan.body.later", { month: monthName })], actions: [] };
  }

  // 4. Vaktirnar þínar
  const upcoming = data.myShifts.filter((s) => s.shift_date >= data.today);
  const next = upcoming[0];
  const when = next
    // Á eftir tvípunkti: „Næsta vakt: mánudagur 4. maí“ (ensk vikudagaheiti eru þegar með hástaf).
    ? `${weekdayLongL(weekdayOf(next.shift_date), L)} ${dayLabelL(next.shift_date, L)} · ${next.label ? `${next.label} ` : ""}${hhmm(next.starts)}–${hhmm(next.ends)}${holidayName(next.shift_date) ? ` · ${holidayL(holidayName(next.shift_date), L)}` : ""}`
    : "";
  const replies = data.requests.length + incoming.length;
  const alerts: Step["alerts"] = [
    ...(data.requests.length ? [{ text: t.n("shifts.requests", data.requests.length), action: { label: t("shifts.action.reply"), onClick: () => go("vaktir"), primary: true, tone: "red" as const } }] : []),
    ...(incoming.length ? [{ text: t.n("shifts.incoming", incoming.length), action: { label: t("shifts.action.reply"), onClick: () => go("markadur"), primary: true } }] : []),
    ...(market.length ? [{ text: t.n("shifts.market", market.length), action: { label: t("shifts.action.market"), onClick: () => go("markadur") } }] : []),
  ];
  const shifts: Step = {
    key: "shifts", icon: <Clock className="h-4 w-4" />,
    state: replies ? "current" : next ? "active" : "upcoming",
    bar: replies ? t("shifts.bar.reply") : next ? t.n("shifts.bar.upcoming", upcoming.length) : t("shifts.bar.none"),
    head: next ? t("shifts.head.next", { when }) : t("shifts.head.none"),
    body: [next ? t.n("shifts.body.count", upcoming.length) : t("shifts.body.none")],
    alerts,
    tip: next ? t("shifts.tip") : undefined,
    actions: next ? [{ label: t("shifts.action.mine"), onClick: () => go("vaktir") }] : [],
  };

  // 5. Eftir vakt
  const hadOnCall = data.myShifts.some((s) => s.shift_date <= data.today && data.shiftTypes.some((ty) => ty.id === s.shift_type_id && (ty.kind === "forvakt" || ty.kind === "bakvakt")));
  const after: Step = unlogged
    ? {
        key: "after", icon: <KeyRound className="h-4 w-4" />, state: "current", bar: t.n("after.bar.todo", unlogged),
        head: t("after.head.todo"), body: [t.n("after.body.todo", unlogged)],
        actions: [{ label: t("after.action.mark"), onClick: () => go("vaktir"), primary: true }],
      }
    : {
        key: "after", icon: <KeyRound className="h-4 w-4" />, state: hadOnCall ? "done" : "upcoming",
        bar: t(hadOnCall ? "after.bar.done" : "after.bar.later"),
        head: t(hadOnCall ? "after.head.done" : "after.head.later"), body: [t(hadOnCall ? "after.body.done" : "after.body.later")], actions: [],
      };

  const steps = [account, prefs, plan, shifts, after];
  // Lendir á: nýtt lykilorð fyrst; svo því sem krefst viðbragða, í tímaröð;
  // svo því sem er í gangi eða bíður; annars fyrsta skrefi sem er eftir.
  const find = (pred: (s: Step) => boolean) => steps.findIndex(pred);
  let landing = me.mustChangePassword ? 0 : find((s) => s.state === "current" && s.key !== "account");
  if (landing < 0) landing = find((s) => s.state === "current");
  if (landing < 0) landing = find((s) => s.state === "active" || s.state === "waiting");
  if (landing < 0) landing = find((s) => s.state === "upcoming");
  if (landing < 0) landing = steps.length - 1;
  return { steps, landing, planMonth };
}

const DOT: Record<State, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-white text-[var(--hsu)] ring-2 ring-inset ring-[var(--hsu)]",
  active: "bg-white text-[var(--hsu)] ring-2 ring-inset ring-[var(--hsu)]/40",
  waiting: "bg-white text-amber-600 ring-[3px] ring-inset ring-amber-400",
  upcoming: "bg-slate-100 text-slate-500",
  missed: "bg-slate-200 text-slate-500",
};

function Btn({ a, small = false }: { a: Action; small?: boolean }) {
  return (
    <button onClick={a.onClick}
      className={cx("inline-flex items-center gap-1.5 rounded-xl font-semibold transition",
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        a.primary
          ? a.tone === "red" ? "bg-red-600 text-white shadow-sm hover:bg-red-700" : "bg-[var(--hsu)] text-white shadow-sm hover:bg-[var(--hsu-dark)]"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}>
      {a.label} {a.primary && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

export default function Journey({ steps, landing, planMonth, extra }: {
  steps: Step[]; landing: number; planMonth: string;
  /** Aukahnappur í skrefi 5 (hlekkur á Vinnustund). */
  extra?: ReactNode;
}) {
  const t = useT(journey);
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked ?? landing;
  const step = steps[sel];
  const nextStep = steps[landing];
  // Næsta skref: aðalhnappur skrefsins, eða fyrsta atriði sem þarf að svara — og
  // fyrirsögnin segir það sama og hnappurinn gerir.
  const primary = nextStep.state === "current" ? nextStep.actions.find((a) => a.primary) : undefined;
  const alert = nextStep.state === "current" && !primary ? nextStep.alerts?.find((a) => a.action.primary) : undefined;
  const nextAction = primary ?? alert?.action;
  const nextHead = primary ? nextStep.head : alert?.text ?? nextStep.head;

  return (
    <div className="space-y-4">
      {/* Næsta skref: ein setning og einn hnappur. */}
      <div data-tour="next-step" className={cx("flex flex-wrap items-center gap-3 rounded-2xl p-4 sm:p-5",
        nextAction ? "bg-gradient-to-br from-[var(--hsu)] to-[#2c6cc0] text-white shadow-sm" : "border border-emerald-200 bg-emerald-50 text-emerald-900")}>
        {nextAction ? <ArrowRight className="h-5 w-5 shrink-0 text-white/80" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
        <div className="min-w-0 flex-1">
          <div className={cx("text-[11px] font-semibold uppercase tracking-wider", nextAction ? "text-white/70" : "text-emerald-700")}>{t("next.label")}</div>
          <div className="text-base font-bold leading-snug sm:text-lg">{nextAction ? nextHead : t("next.none")}</div>
        </div>
        {nextAction && (
          <button onClick={nextAction.onClick}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--hsu-dark)] shadow-sm hover:bg-slate-50 sm:w-auto">
            {nextAction.label} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Skrefin — sama útlit og mánaðarflæði yfirlæknis. */}
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" data-tour="journey">
        {steps.map((s, i) => (
          <li key={s.key}>
            <button onClick={() => setPicked(i)} aria-current={i === sel ? "step" : undefined}
              className={cx("flex w-full flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition sm:flex-row sm:items-center sm:gap-2.5 sm:p-3 sm:text-left",
                i === sel ? "border-[var(--hsu)] bg-white shadow-md ring-2 ring-[var(--hsu)]/15" : "border-slate-200 bg-white/60 hover:bg-white")}>
              <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-9 sm:w-9", DOT[s.state])}>
                {s.state === "done" ? <Check className="h-4 w-4" /> : s.state === "missed" ? <CircleDashed className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx("block text-[10px] font-bold leading-tight sm:truncate sm:text-sm", i === sel ? "text-slate-900" : "text-slate-600")}>{t.dyn(`${s.key}.title`)}</span>
                <span className={cx("hidden truncate text-[11px] sm:block",
                  s.state === "done" ? "text-emerald-700" : s.state === "current" ? "font-semibold text-[var(--hsu)]" : s.state === "waiting" ? "text-amber-700" : "text-slate-500")}>{s.bar}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* Valið skref. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <span className="text-slate-500">{t("step.of", { n: sel + 1, total: steps.length })}</span>
          <span className={cx("rounded-full px-2 py-0.5 normal-case tracking-normal",
            step.state === "done" ? "bg-emerald-100 text-emerald-800"
              : step.state === "current" ? "bg-[var(--hsu-soft)] text-[var(--hsu-dark)]"
              : step.state === "waiting" ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-600")}>
            {t.dyn(`state.${step.state === "active" ? "current" : step.state}`)}
          </span>
          {(step.key === "prefs" || step.key === "plan") && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case tracking-normal text-slate-600">{t("month.chip", { month: monthLabelL(planMonth, t.lang) })}</span>
          )}
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{step.head}</h2>
        {step.body.map((b, i) => <p key={i} className="mt-1 text-sm text-slate-600">{b}</p>)}

        {step.checklist && (
          <ul className="mt-3 space-y-2">
            {step.checklist.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5 text-sm">
                <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  c.done ? "bg-emerald-500 text-white" : "border-2 border-slate-300 bg-white")}>
                  {c.done && <Check className="h-3 w-3" />}
                </span>
                <span className={cx(c.done ? "text-slate-500" : c.optional ? "text-slate-600" : "font-medium text-slate-900")}>{c.label}</span>
              </li>
            ))}
          </ul>
        )}

        {step.alerts && step.alerts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {step.alerts.map((a) => (
              <li key={a.text} className={cx("flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5",
                a.action.tone === "red" ? "bg-red-50 ring-1 ring-red-200" : a.action.primary ? "bg-[var(--hsu-soft)]" : "bg-slate-50")}>
                <span className="text-sm font-semibold text-slate-900">{a.text}</span>
                <Btn a={a.action} small />
              </li>
            ))}
          </ul>
        )}

        {step.tip && (
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {step.tip}</p>
        )}

        {(step.actions.length > 0 || (step.key === "after" && extra)) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {step.actions.map((a) => <Btn key={a.label} a={a} />)}
            {step.key === "after" && extra}
          </div>
        )}
      </Card>
    </div>
  );
}
