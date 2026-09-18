"use client";

import { useCallback, useMemo, useState } from "react";
import PrefsEditor, { PrefsStepNav, Step, draftFrom, rich, type PrefDraft } from "../_components/PrefsEditor";
import { cx, hsuApi } from "../_components/ui";
import type { PortalData } from "@/lib/hsu/portal";
import { monthKey, shiftMonth, type HsuPreference, type MonthStatus } from "@/lib/hsu/types";
import { useT } from "@/lib/hsu/i18n/client";
import { capFirstL, dayLabelL, monthLabelL, monthStatusL } from "@/lib/hsu/i18n/format";
import { prefs } from "@/lib/hsu/i18n/messages/prefs";

export default function PrefsTab({ data, initialMonth, refresh }: { data: PortalData; initialMonth: string; refresh: () => void }) {
  const t = useT(prefs);
  // Mánuðir í vali: allir opnir mánuðir, auk næstu tveggja — þeir sjást en eru
  // læstir þar til yfirlæknir opnar þá (sama og „Beðið eftir…“ á Yfirliti).
  const options = useMemo(() => {
    const now = monthKey(new Date());
    const set = new Set<string>([shiftMonth(now, 1), shiftMonth(now, 2)]);
    for (const m of data.months) if (m.status === "collecting" || m.status === "review") set.add(m.month);
    return [...set].sort();
  }, [data.months]);

  // Opnast á fyrsta mánuði sem hægt er að breyta: mánuður í vaktaplani er
  // læstur, og læknir sem kemur hingað vill skrá óskir, ekki lesa lás.
  const [month, setMonth] = useState(() => {
    if (options.includes(initialMonth)) return initialMonth;
    const collecting = data.months.find((m) => m.status === "collecting");
    if (collecting) return collecting.month;
    const open = options.find((m) => data.months.find((x) => x.month === m)?.status === "review");
    return open ?? options[0];
  });

  const monthRow = data.months.find((m) => m.month === month) ?? null;
  const pref = data.prefs.find((p) => p.month === month) ?? null;
  const initial = useMemo(() => draftFrom(pref), [pref]);

  const status: MonthStatus | null = monthRow?.status ?? null;
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
            const row = data.months.find((x) => x.month === m);
            const p = data.prefs.find((x) => x.month === m);
            return (
              <button key={m} onClick={() => setMonth(m)} aria-pressed={m === month}
                className={cx("shrink-0 rounded-2xl border px-4 py-2.5 text-left transition", m === month ? "border-[var(--hsu)] bg-[var(--hsu-soft)] ring-2 ring-[var(--hsu)]/30" : "border-slate-200 bg-white hover:bg-slate-50")}>
                <div className="text-sm font-bold text-slate-900">{capFirstL(monthLabelL(m, t.lang), t.lang)}</div>
                <div className="text-[11px] text-slate-500">
                  {row ? monthStatusL(row.status, t.lang) : t("month.notOpened")}{p ? ` · ${{ draft: t("prefShort.draft"), submitted: t("prefShort.submitted"), approved: t("prefShort.approved"), changes_requested: t("prefShort.changes_requested") }[p.status]}` : ""}
                </div>
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
        dayWeekdays={data.me.dayWeekdays}
      />
    </div>
  );
}

