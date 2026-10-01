// Sjálfvirkar áminningar um það sem er ógert fyrir skilafrest mánaðarins.
// Server-only. Keyrt úr /api/cron/hsu-tasks einu sinni á dag.
//
// SKILAFRESTUR: 25. í mánuðinum á undan — vaktaplan nóvember á að vera frágengið
// 25. október. Hafi yfirlæknir sett aðra dagsetningu á mánuðinn
// (hsu_months.prefs_deadline) gildir hún; hann er eini sem stýrir frestinum.
//
// ÞREP: áminning fer út viku, þrem dögum og einum degi fyrir frestinn, og á
// frestdeginum sjálfum. Hvert þrep fer aðeins einu sinni á hvern mann og mánuð
// (einkvæmni á hsu_task_reminders), svo cron má keyra eins oft sem er.
//
// LEIÐIR: tilkynning í kerfinu fer ALLTAF; tölvupóstur fer ef flokkurinn
// „deadline“ er á „now“ hjá viðtakandanum; SMS fer ef hann hefur símanúmer og
// sms_reminders er true. Ekkert fer á þann sem er búinn með sitt.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/sms";
import { hsuEmailHtml, loadMonth, loadMonthShifts, loadPreferences, loadShiftTypes, sendHsuEmail } from "./server";
import { requiredSlots, toPlanSlots } from "./plan";
import { normalizeEmailPrefs } from "./email-categories";
import { DEFAULT_LANG, isLang, translator, type Lang } from "./i18n/core";
import { dayLabelL, monthLabelL } from "./i18n/format";
import { tasks as msgs } from "./i18n/messages/tasks";
import { defaultDeadline, monthKey, openWindow, reminderStage, type HsuPreference, type ReminderStage } from "./types";

interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  lang: Lang;
  role: string;
  email_prefs: unknown;
  sms_reminders: boolean;
  /** Þarf bakvakt á bak við sig — ræður því hvort ómönnuð bakvakt er gat. */
  needs_bakvakt: boolean;
}

/** Ógert hjá lækninum sjálfum: óskir sem vantar eða eru hálfkláraðar. */
function ownTask(pref: HsuPreference | undefined): string | null {
  if (!pref) return "prefs";
  if (pref.status === "draft") return "draft";
  if (pref.status === "changes_requested") return "changes";
  return null; // submitted / approved
}

export interface MonthTasks {
  month: string;
  deadline: string;
  /** Hvað hver læknir þarf að gera sjálfur. */
  own: Map<string, string>;
  /** Hvað yfirlæknir þarf að gera (sama fyrir alla yfirlækna). */
  head: { key: string; n?: number }[];
}

/** Staðan á mánuðinum: hvað er ógert og hjá hverjum. */
export async function monthTasks(month: string, people: Person[]): Promise<MonthTasks> {
  const [m, prefs, shifts, types] = await Promise.all([
    loadMonth(month), loadPreferences(month), loadMonthShifts(month), loadShiftTypes(),
  ]);
  const deadline = m?.prefs_deadline ?? defaultDeadline(month);
  const prefOf = new Map(prefs.map((p) => [p.doctor_id, p]));

  const own = new Map<string, string>();
  for (const p of people) {
    const task = ownTask(prefOf.get(p.id));
    if (task) own.set(p.id, task);
  }

  const head: { key: string; n?: number }[] = [];
  const status = m?.status ?? "collecting";
  if (status !== "published") {
    const missing = own.size;
    if (status === "collecting" || status === "review") {
      if (missing) head.push({ key: "missing", n: missing });
      head.push({ key: "review" });
    }
    if (status === "planning" || status === "review") {
      if (!shifts.length) head.push({ key: "build" });
    }
    if (shifts.length) {
      // Bakvakt sem enginn þarf er ekki gat — sama regla og við birtingu.
      const gaps = requiredSlots(
        toPlanSlots(shifts, types),
        people.map((p) => ({ id: p.id, needsBakvakt: p.needs_bakvakt })),
      ).filter((s) => !s.doctorId).length;
      if (gaps) head.push({ key: "gaps", n: gaps });
      head.push({ key: "publish" });
    }
  }
  return { month, deadline, own, head };
}

export interface ReminderRun {
  today: string;
  months: { month: string; deadline: string; stage: ReminderStage | null; sent: number; skipped: number }[];
  sentEmail: number;
  sentSms: number;
  notices: number;
}

/**
 * Send áminningar fyrir alla mánuði í opna glugganum sem eru á þrepi í dag.
 * Skilar yfirliti; `dryRun` skrifar ekkert og sendir ekkert.
 */
export async function runTaskReminders(opts: { origin: string; today?: string; dryRun?: boolean }): Promise<ReminderRun> {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const out: ReminderRun = { today, months: [], sentEmail: 0, sentSms: 0, notices: 0 };

  const { data } = await supabaseAdmin
    .from("hsu_doctors")
    .select("id, name, email, phone, lang, role, email_prefs, sms_reminders, needs_bakvakt")
    .eq("active", true);
  const people: Person[] = (data ?? []).map((d) => ({
    id: d.id as string,
    name: (d.name as string) ?? "",
    email: (d.email as string) ?? "",
    phone: (d.phone as string) ?? "",
    lang: (isLang(d.lang) ? d.lang : DEFAULT_LANG) as Lang,
    role: (d.role as string) ?? "doctor",
    email_prefs: d.email_prefs,
    sms_reminders: d.sms_reminders !== false,
    needs_bakvakt: Boolean(d.needs_bakvakt),
  }));
  if (!people.length) return out;

  // Mánuðir framar í tímann en yfirstandandi: frestur yfirstandandi mánaðar er
  // liðinn og honum er ekki unnt að breyta.
  for (const month of openWindow(monthKey(new Date(`${today}T00:00:00Z`))).slice(1)) {
    const st = await monthTasks(month, people);
    const stage = reminderStage(st.deadline, today);
    const row = { month, deadline: st.deadline, stage, sent: 0, skipped: 0 };
    out.months.push(row);
    if (!stage) continue;

    // Hver maður fær ÞÁ eina áminningu sem nær yfir allt sem er ógert hjá honum.
    const targets = people
      .map((p) => {
        const mine = st.own.get(p.id);
        const headTasks = p.role === "head" ? st.head : [];
        const list = [
          ...(mine ? [{ key: mine }] : []),
          ...headTasks,
        ];
        return { person: p, list, isHead: headTasks.length > 0 };
      })
      .filter((x) => x.list.length > 0);
    if (!targets.length) continue;

    if (opts.dryRun) { row.sent = targets.length; continue; }

    // Einkvæmnin (doctor_id, month, stage) gerir þetta óhætt að keyra aftur:
    // aðeins raðir sem komust inn fá póst og skeyti.
    const { data: inserted } = await supabaseAdmin
      .from("hsu_task_reminders")
      .upsert(
        targets.map((x) => ({
          doctor_id: x.person.id,
          month,
          role: x.isHead ? "head" : "doctor",
          stage,
          tasks: x.list.map((l) => l.key),
        })),
        { onConflict: "doctor_id,month,stage", ignoreDuplicates: true },
      )
      .select("id, doctor_id");
    const fresh = new Set((inserted ?? []).map((r) => r.doctor_id as string));
    row.sent = fresh.size;
    row.skipped = targets.length - fresh.size;
    if (!fresh.size) continue;

    for (const x of targets.filter((y) => fresh.has(y.person.id))) {
      const p = x.person;
      const t = translator(msgs, p.lang);
      const vars = {
        month: monthLabelL(month, p.lang),
        date: dayLabelL(st.deadline, p.lang),
        stage: t.dyn(`stage.${stage}`),
        name: p.name,
      };
      // gaps/missing eru í eintölu og fleirtölu; hin eru einn fastur texti.
      const lineOf = (l: { key: string; n?: number }) =>
        l.key === "gaps" ? t.n("task.gaps", l.n ?? 0, vars)
        : l.key === "missing" ? t.n("task.missing", l.n ?? 0, vars)
        : t.dyn(`task.${l.key}`, vars);
      const lines = x.list.map(lineOf);
      const link = x.isHead ? `/hsu/stjorn?t=plan&m=${month}` : `/hsu/min-sida?t=oskir&m=${month}`;

      // 1. Tilkynning í kerfinu — fer alltaf.
      await supabaseAdmin.from("hsu_notifications").insert({
        doctor_id: p.id,
        title: t("note.title", vars),
        lines,
        link,
        category: "deadline",
      });
      out.notices++;

      // 2. Tölvupóstur — eftir stillingu viðtakandans.
      const mode = normalizeEmailPrefs(p.email_prefs).deadline;
      let emailed = false;
      if (mode === "now" && p.email) {
        const kind = x.isHead ? "head" : "doctor";
        const res = await sendHsuEmail(
          p.email,
          t.dyn(`subject.${kind}`, vars),
          hsuEmailHtml({
            origin: opts.origin,
            lang: p.lang,
            heading: t.dyn(`heading.${kind}`, vars),
            paragraphs: [t("hello", vars), t.dyn(`intro.${kind}`, vars), ...lines],
            cta: { label: t(x.isHead ? "cta.plan" : "cta.prefs"), url: `${opts.origin}${link}` },
            foot: t("foot"),
          }),
          [t.dyn(`intro.${kind}`, vars), ...lines, `${opts.origin}${link}`].join("\n"),
        );
        emailed = res.ok;
        if (res.ok) out.sentEmail++;
      }

      // 3. SMS — aðeins ef læknirinn vill það og númerið er til.
      let smsStatus = "";
      let smsOk = false;
      if (p.sms_reminders && p.phone) {
        const res = await sendSms({ to: p.phone, body: t(x.isHead ? "sms.head" : "sms.doctor", vars) });
        smsOk = res.ok;
        smsStatus = res.ok ? (res.status ?? "sent") : (res.error ?? "villa").slice(0, 200);
        if (res.ok) out.sentSms++;
      } else {
        smsStatus = p.sms_reminders ? "ekkert símanúmer" : "slökkt";
      }

      await supabaseAdmin
        .from("hsu_task_reminders")
        .update({ email_sent: emailed, sms_sent: smsOk, sms_status: smsStatus })
        .eq("doctor_id", p.id).eq("month", month).eq("stage", stage);
    }
  }
  return out;
}
