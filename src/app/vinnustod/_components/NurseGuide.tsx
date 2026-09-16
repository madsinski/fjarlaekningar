"use client";

// Uppflettiefni hjúkrunarfræðings — opið allan daginn við hlið SMS-gáttarinnar.
//
// Hjúkrunarfræðingurinn svarar símanum og skilaboðum sjúklinga. Hún þarf að
// geta svarað „hentar þetta?“ á nokkrum sekúndum og afritað tilbúið svar. Því:
// leitarstika efst (líka án íslenskra stafa), meginreglurnar alltaf sýnilegar,
// og hvert erindi með „hentar / hentar ekki“ og svari til að afrita.
//
// Efnið sjálft er í src/lib/nurse-guide.ts og segir ekkert umfram það sem
// Fjarlækningar segja sjúklingum annars staðar.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy, MessageCircle, Pill, Search, X } from "lucide-react";
import {
  GUIDE_ACCESS, GUIDE_ANSWERS, GUIDE_FACTS, GUIDE_MEDS, GUIDE_PROBLEMS,
  type GuideAnswer, type GuideProblem,
} from "@/lib/nurse-guide";
import { search } from "@/lib/nurse-guide-search";

function CopyButton({ text, label = "Afrita svar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* ekkert */ }
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        done ? "bg-emerald-600 text-white" : "bg-white text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-50"}`}>
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Afritað" : label}
    </button>
  );
}

function ReplyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-cyan-50/60 p-3 ring-1 ring-cyan-100">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-cyan-800">Svar til sjúklings</div>
        <CopyButton text={text} />
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{text}</p>
    </div>
  );
}

function ProblemCard({ p, open, onToggle, onSendLink }: { p: GuideProblem; open: boolean; onToggle: () => void; onSendLink: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-slate-900">{p.title}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{p.summary}</span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50/70 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Hentar</div>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-800">
                {p.suitable.map((s) => <li key={s} className="flex gap-1.5"><span className="text-emerald-600">✓</span><span>{s}</span></li>)}
              </ul>
            </div>
            <div className="rounded-xl bg-red-50/70 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-red-800">Hentar ekki — vísa annað</div>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-800">
                {p.notSuitable.map((s) => <li key={s} className="flex gap-1.5"><span className="text-red-600">✕</span><span>{s}</span></li>)}
              </ul>
            </div>
          </div>
          <ReplyBox text={p.reply} />
          <button type="button" onClick={onSendLink}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:underline">
            <MessageCircle className="h-4 w-4" /> Senda sjúklingi hlekkinn í SMS
          </button>
        </div>
      )}
    </div>
  );
}

function AnswerCard({ a }: { a: GuideAnswer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="font-bold text-slate-900">{a.q}</div>
        <CopyButton text={a.a} />
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.a}</p>
    </div>
  );
}

export default function NurseGuide({ onSendLink, onAsk, focusSearch }: { onSendLink: () => void; onAsk?: (q: string) => void; focusSearch?: number }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (focusSearch) input.current?.focus(); }, [focusSearch]);

  // „/“ fer í leitina hvar sem er á síðunni; Esc hreinsar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "/" && !typing) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const problems = useMemo(() => search(GUIDE_PROBLEMS, q, (p) => ({
    title: p.title, keywords: p.keywords, body: [p.summary, ...p.suitable, ...p.notSuitable, p.reply],
  })), [q]);
  const answers = useMemo(() => search(GUIDE_ANSWERS, q, (a) => ({ title: a.q, keywords: a.keywords, body: [a.a] })), [q]);
  const meds = useMemo(() => GUIDE_MEDS
    .map((c) => ({ ...c, items: search(c.items, q, (i) => ({ title: i })) }))
    .filter((c) => !q.trim() || c.items.length || search([c], q, (x) => ({ title: x.name, body: x.items })).length),
  [q]);
  const searching = q.trim().length > 0;
  const nothing = searching && !problems.length && !answers.length && !meds.some((m) => m.items.length);

  // Leit að einu erindi: opna það beint.
  const shownOpen = searching && problems.length === 1 ? problems[0].slug : open;

  return (
    <div className="space-y-5">
      {/* Leit */}
      <div className="sticky top-[7.5rem] z-10 -mx-1 bg-slate-50/95 px-1 pb-2 pt-1 backdrop-blur sm:top-[6.5rem]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
            placeholder="Leita — t.d. þvagfæri, frunsa, aldur, blóðprufa, opnunartími…"
            aria-label="Leita í upplýsingum um þjónustuna"
            className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-20 text-base shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          {q ? (
            <button type="button" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Hreinsa leit"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-1.5 text-xs text-slate-400 sm:block">/</kbd>
          )}
        </label>
      </div>

      {/* Meginreglur — alltaf sýnilegar */}
      {!searching && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Í stuttu máli</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {GUIDE_FACTS.map((f) => (
              <div key={f.label} className={`rounded-xl border px-3 py-2.5 ${
                f.tone === "no" ? "border-red-200 bg-red-50/50" : f.tone === "ok" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                <div className="text-sm font-bold text-slate-900">{f.label}</div>
                <div className="text-xs text-slate-600">{f.detail}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {nothing && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          Ekkert fannst fyrir „{q}“. Sé erindið ekki á listanum hentar það líklega ekki fjarþjónustu —
          vísaðu sjúklingi á hefðbundna þjónustu heilsugæslunnar.
          {onAsk && (
            <div className="mt-3">
              <button type="button" onClick={() => onAsk(q)} className="font-semibold text-cyan-700 hover:underline">
                Óviss? Spyrðu Fjarlækningar →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Erindi */}
      {problems.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Erindi {searching && <span className="font-normal normal-case">({problems.length})</span>}
          </h2>
          <div className="space-y-2">
            {problems.map((p) => (
              <ProblemCard key={p.slug} p={p} open={shownOpen === p.slug}
                onToggle={() => setOpen((o) => (o === p.slug ? null : p.slug))} onSendLink={onSendLink} />
            ))}
          </div>
        </section>
      )}

      {/* Algengar spurningar */}
      {answers.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Algengar spurningar — tilbúin svör</h2>
          <div className="space-y-2">{answers.map((a) => <AnswerCard key={a.key} a={a} />)}</div>
        </section>
      )}

      {/* Aðgangur */}
      {!searching && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-slate-900">Svona kemst sjúklingur inn</h2>
            <CopyButton text={GUIDE_ACCESS.reply} />
          </div>
          <ol className="mt-2 space-y-1.5 text-sm text-slate-700">
            {GUIDE_ACCESS.steps.map((s, i) => (
              <li key={s} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-bold text-white">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
        </section>
      )}

      {/* Lyf sem eru ekki endurnýjuð */}
      {meds.some((m) => m.items.length) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Pill className="h-4 w-4 text-red-600" /> Lyf sem eru ekki endurnýjuð í fjarþjónustu</h2>
          <p className="mt-1 text-xs text-slate-500">{GUIDE_MEDS_NOTE}</p>
          <div className="mt-3 space-y-3">
            {meds.filter((m) => m.items.length).map((m) => (
              <div key={m.name}>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{m.name}</div>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {m.items.map((i) => <li key={i} className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-900">{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const GUIDE_MEDS_NOTE = "Listinn er ekki tæmandi og mat læknis ræður alltaf. Sjúklingi er vísað til heimilislæknis eða þess læknis sem ávísar lyfinu.";
