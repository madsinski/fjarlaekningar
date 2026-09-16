"use client";

// „Hentar erindið?“ — hjúkrunarfræðingur límir inn skilaboð frá sjúklingi og
// fær tillögu gervigreindar. Efst á skjánum, því þetta er oft fyrsta skrefið.
// Persónuupplýsingar: viðvörun áður en límt er inn, lifandi ábending ef
// kennitala/símanúmer/netfang sést, og netþjónninn fjarlægir þær hvort sem er.

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Loader2, ShieldAlert, Sparkles, X, XCircle } from "lucide-react";
import { cx } from "@/app/hsu/_components/ui";
import { GUIDE_PROBLEMS } from "@/lib/nurse-guide";
import { TRIAGE_MAX, redactPersonal } from "@/lib/vinnustod/redact";
import { vsApi } from "./shared";

interface Triage {
  verdict: "hentar" | "hentar_ekki" | "oljost";
  erindi: string | null;
  reason: string;
  warnings: string[];
  nextStep: string;
  questions: string[];
}

const LOOK = {
  hentar: { label: "Hentar Fjarlækningum", Icon: CheckCircle2, box: "border-emerald-300 bg-emerald-50", head: "text-emerald-900", dot: "bg-emerald-500" },
  hentar_ekki: { label: "Hentar ekki Fjarlækningum", Icon: XCircle, box: "border-red-300 bg-red-50", head: "text-red-900", dot: "bg-red-500" },
  oljost: { label: "Óljóst — spyrja nánar", Icon: HelpCircle, box: "border-amber-300 bg-amber-50", head: "text-amber-900", dot: "bg-amber-500" },
} as const;

export default function TriageCard({ onOpenProblem }: { onOpenProblem: (slug: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ result: Triage; removed: string[] } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const found = useMemo(() => redactPersonal(text).removed, [text]);

  const run = async () => {
    if (busy || text.trim().length < 5) return;
    setBusy(true); setErr(null); setRes(null);
    const r = await vsApi<{ result: Triage; removed: string[] }>("/api/vinnustod/triage", { body: { message: text }, staff: true });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    setRes({ result: r.result, removed: r.removed });
  };
  const clear = () => { setText(""); setRes(null); setErr(null); area.current?.focus(); };

  const look = res ? LOOK[res.result.verdict] : null;
  const problem = res?.result.erindi ? GUIDE_PROBLEMS.find((p) => p.slug === res.result.erindi) : null;

  return (
    <section aria-labelledby="triage-h" className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-cyan-50 to-white px-5 pt-4">
        <h2 id="triage-h" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0a4a5e] to-[#0e7490] text-white"><Sparkles className="h-4 w-4" /></span>
          Hentar erindið Fjarlækningum?
        </h2>
        <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-bold text-cyan-900">Gervigreind</span>
      </div>
      <div className="space-y-3 px-5 pb-5 pt-2">
        <p className="text-sm text-slate-600">Límdu inn skilaboðin frá sjúklingnum eða lýstu erindinu og fáðu tillögu um hvort það hentar — og hvaða erindi hann á að velja.</p>

        <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Ekki setja inn persónuupplýsingar</b> — nafn, kennitölu, símanúmer, heimilisfang eða annað sem auðkennir sjúklinginn.
            Kennitölur, símanúmer og netföng eru fjarlægð sjálfkrafa áður en textinn er sendur til mats.
          </span>
        </p>

        <label className="block">
          <span className="sr-only">Skilaboð frá sjúklingi</span>
          <textarea ref={area} value={text} maxLength={TRIAGE_MAX} rows={3}
            onChange={(e) => { setText(e.target.value); setErr(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void run(); } }}
            placeholder="t.d. „Ég er með sviða við þvaglát síðan í gær og tíð þvaglát, enginn hiti.“"
            className="block w-full resize-y rounded-2xl border border-slate-300 bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
        </label>
        {found.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800" aria-live="polite">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {cap(found.join(" og "))} fannst í textanum — það verður fjarlægt áður en textinn er sendur. Fjarlægðu líka nöfn.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={run} disabled={busy || text.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--hsu)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)] disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Met erindið…" : "Meta erindið"}
          </button>
          {(text || res) && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" /> Hreinsa
            </button>
          )}
          <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">Ctrl + Enter</span>
        </div>

        {err && <p className="text-sm font-semibold text-red-700" role="alert">{err}</p>}

        {res && look && (
          <div className={cx("rounded-2xl border p-4", look.box)} aria-live="polite">
            <div className={cx("flex items-center gap-2 text-base font-bold", look.head)}>
              <look.Icon className="h-5 w-5 shrink-0" /> {look.label}
            </div>
            <p className="mt-1.5 text-sm text-slate-800">{res.result.reason}</p>

            {res.result.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {res.result.warnings.map((w) => (
                  <li key={w} className="flex gap-2 text-sm text-slate-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{w}</li>
                ))}
              </ul>
            )}

            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900">
              <span className="text-slate-500">Næsta skref: </span>{res.result.nextStep}
            </p>

            {res.result.questions.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Spyrðu sjúklinginn</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {res.result.questions.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </div>
            )}

            {problem && res.result.verdict !== "hentar_ekki" && (
              <button type="button" onClick={() => onOpenProblem(problem.slug)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[var(--hsu-dark)] ring-1 ring-cyan-200 hover:bg-cyan-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/fjarlaekningar-icons/portal/${problem.slug}.png`} alt="" className="h-6 w-6" />
                Opna „{problem.title}“ — texti og hlekkur til sjúklings <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <p className="mt-3 text-[11px] text-slate-500">
              Tillaga gervigreindar byggð á reglum Fjarlækninga — mat þitt og læknis ræður alltaf.
              {res.removed.length > 0 ? ` Fjarlægt fyrir sendingu: ${res.removed.join(", ")}.` : ""} Textinn er ekki vistaður.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
