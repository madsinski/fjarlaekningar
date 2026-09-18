"use client";

import { useCallback, useMemo, useState } from "react";
import PrefsEditor, { PrefsStepNav, Step, draftFrom, rich, type PrefDraft } from "../_components/PrefsEditor";
import { cx, hsuApi } from "../_components/ui";
import type { PortalData } from "@/lib/hsu/portal";
import { effectiveStatus, openWindow, shiftMonth, type HsuPreference, type MonthStatus } from "@/lib/hsu/types";
import { useT } from "@/lib/hsu/i18n/client";
import { capFirstL, dayLabelL, monthLabelL, monthStatusL } from "@/lib/hsu/i18n/format";
import { prefs } from "@/lib/hsu/i18n/messages/prefs";

export default function PrefsTab({ data, initialMonth, refresh }: { data: PortalData; initialMonth: string; refresh: () => void }) {
  const t = useT(prefs);
  // Mánuðir í vali: næstu þrír (alltaf opnir fyrir óskir) og aðrir mánuðir
  // sem yfirlæknir hefur enn opna.
  const options = useMemo(() => {
    const set = new Set<string>(openWindow());
    for (const m of data.months) if (m.status === "collecting" || m.status === "review") set.add(m.month);
    return [...set].sort();
  }, [data.months]);
  const stOf = (m: string) => effectiveStatus(data.months.find((x) => x.month === m), m);

  // Opnast á fyrsta mánuði sem hægt er að breyta: mánuður í vaktaplani er
  // læstur, og læknir sem kemur hingað vill skrá óskir, ekki lesa lás.
  const [month, setMonth] = useState(() => {
    if (options.includes(initialMonth)) return initialMonth;
    const collecting = options.find((m) => stOf(m) === "collecting");
    if (collecting) return collecting;
    const open = options.find((m) => stOf(m) === "review");
    return open ?? options[0];
  });

  const monthRow = data.months.find((m) => m.month === month) ?? null;
  const pref = data.prefs.find((p) => p.month === month) ?? null;
  const initial = useMemo(() => draftFrom(pref), [pref]);

  const status: MonthStatus | null = effectiveStatus(monthRow, month);
  // Aðeins mánuður sem yfirlæknir hefur opnað er opinn lækninum.
  const editable = status === "collecting" || (status === "review" && (!pref || pref.status === "draft" || pref.status === "changes_requested"));
  const lockedReason = !status
    ? t("locked.notOpen", { month: monthLabelL(month, t.lang) })
    : status === "planning" || status === "published"
    ? t("locked.planning")
    : pref?.status === "approved"
      ? t("locked.approved")
      : t("locked.review");

  const [progress, setProgress] = useState({ daysMarked: false, fmMarked: false, sent: false });
  const onProgress = useCallback((p: { daysMarked: boolean; fmMarked: boolean; sent: boolean }) => {
    setProgress((prev) => (prev.daysMarked === p.daysMarked && prev.sent === p.sent ? prev : p));
  }, []);

  const save = async (draft: PrefDraft, opts: { submit: boolean; alsoNext: boolean }) => {
    const r = await hsuApi<{ copiedTo: string | null }>("/api/hsu/me/preferences", {
      method: "PUT",
      body: { month, ...draft, submit: opts.submit, also_next: opts.alsoNext },
    });
    if (r.ok) refresh();
    return r;
  };

  const loadPrevious = async () => {
    const r = await hsuApi<{ preference: HsuPreference | null }>(`/api/hsu/me/preferences?month=${shiftMonth(month, -1)}`);
    return r.ok && r.preference ? draftFrom(r.preference) : null;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("tab.title")}</h1>
        <p className="text-sm text-slate-500">
          {rich(t("tab.intro"), {
            off: <span className="font-semibold text-red-600">{t("tab.introOff")}</span>,
            want: <span className="font-semibold text-emerald-600">{t("tab.introWant")}</span>,
          })}
        </p>
      </div>

      {editable && (
        <div className="rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
          <PrefsStepNav daysMarked={progress.daysMarked} fmMarked={progress.fmMarked} sent={progress.sent} />
        </div>
      )}

      <Step n={1} steps id="skref-1" done title={t("step1.title")}
        hint={t("step1.hint")}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {options.map((m) => {
            const p = data.prefs.find((x) => x.month === m);
            return (
              <button key={m} onClick={() => setMonth(m)} aria-pressed={m === month}
                className={cx("shrink-0 rounded-2xl border px-4 py-2.5 text-left transition", m === month ? "border-[var(--hsu)] bg-[var(--hsu-soft)] ring-2 ring-[var(--hsu)]/30" : "border-slate-200 bg-white hover:bg-slate-50")}>
                <div className="text-sm font-bold text-slate-900">{capFirstL(monthLabelL(m, t.lang), t.lang)}</div>
                {(() => {
                  // Staða læknisins sjálfs fyrir mánuðinn: appelsínugult meðan
                  // eftir er að senda, grænt þegar sent eða samþykkt.
                  const st = stOf(m);
                  const ps = p?.status;
                  const [label, tone] = ps === "approved" ? [t("month.state.approved"), "green"]
                    : ps === "submitted" ? [t("month.state.submitted"), "green"]
                    : ps === "changes_requested" ? [t("month.state.changes"), "red"]
                    : st === "planning" || st === "published" ? [monthStatusL(st, t.lang), "slate"]
                    : ps === "draft" ? [t("month.state.draft"), "amber"]
                    : [t("month.state.notStarted"), "amber"];
                  return (
                    <div className={cx("mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold",
                      tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-slate-500")}>
                      <span className={cx("h-1.5 w-1.5 rounded-full",
                        tone === "green" ? "bg-emerald-500" : tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-400" : "bg-slate-400")} />
                      {label}
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>
        {monthRow?.status === "collecting" && monthRow.prefs_deadline && (
          <p className="mt-2 text-sm text-slate-700">{t("deadline")} <span className="font-bold">{dayLabelL(monthRow.prefs_deadline, t.lang)}</span>{monthRow.note ? ` · ${monthRow.note}` : ""}</p>
        )}
        {!monthRow && <p className="mt-2 text-sm text-slate-500">{t("month.notOpenedYet")}</p>}
      </Step>

      <PrefsEditor
        month={month}
        initial={initial}
        status={pref?.status ?? "none"}
        reviewNote={pref?.review_note}
        editable={editable}
        lockedReason={lockedReason}
        onSave={save}
        onLoadPrevious={loadPrevious}
        onProgress={onProgress}
      />
    </div>
  );
}

