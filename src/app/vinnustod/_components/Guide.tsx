"use client";

// Uppflettiefnið í vinnustöðinni: leit, erindi, textar til sjúklings,
// sjálfspróf, meginreglur, algengar spurningar og lyfjalisti.
//
// Hjúkrunarfræðingur í símanum þarf þrennt á nokkrum sekúndum: hentar þetta,
// hvað segi ég, og hvaða texta sendi ég. Leitin er því efst og stór, erindin
// eru myndaflísar, og hvert erindi opnast með „hentar / hentar ekki“ og texta
// til sjúklings — með hlekk á gáttina — tilbúnum til að afrita.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Camera, Check, ChevronDown, ExternalLink, FlaskConical, MessageCircle, Pill, Search, X,
} from "lucide-react";
import { cx } from "@/app/hsu/_components/ui";
import { EditableText, useGuideContent } from "./Texts";

export { CopyButton } from "./Texts";
import {
  GUIDE_FACTS, GUIDE_MEDS, GUIDE_PROBLEMS, GUIDE_SELFTESTS, SELFTEST_INFO_URL,
  SELFTEST_STAFF_NOTE, SITE, problemPageUrl,
  type GuideAnswer, type GuideFact, type GuideMedGroup, type GuideProblem, type GuideSelftest, type Lang,
} from "@/lib/nurse-guide";
import { checkMedication, searchGuide } from "@/lib/nurse-guide-search";

const icon = (slug: string) => `/fjarlaekningar-icons/portal/${slug}.png`;

// ── Smáhlutir ───────────────────────────────────────────────────────────────

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div role="radiogroup" aria-label="Tungumál textans" className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
      {(["is", "en"] as const).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
          className={cx("rounded-md px-2.5 py-1 text-xs font-bold transition", lang === l ? "bg-[var(--hsu)] text-white" : "text-slate-500 hover:text-slate-800")}>
          {l === "is" ? "Íslenska" : "English"}
        </button>
      ))}
    </div>
  );
}

/** Texti til sjúklings — það sem er afritað, og má breyta. */
function PatientTextBox({ title, id, lang, setLang, onSms }: { title: string; id: string; lang: Lang; setLang: (l: Lang) => void; onSms?: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-100 px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--hsu-dark)]">{title}</span>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <EditableText id={id} onSms={onSms} className="px-4 pb-4 pt-3" />
    </div>
  );
}

// ── Leitarhaus ──────────────────────────────────────────────────────────────

export function SearchHero({ q, setQ, inputRef, status }: {
  q: string; setQ: (v: string) => void; inputRef: React.RefObject<HTMLInputElement | null>;
  status: React.ReactNode;
}) {
  // „/“ fer í leitina hvar sem er á síðunni.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "/" && !typing) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef]);

  return (
    <section className="bg-gradient-to-br from-[#062a38] via-[#0a4a5e] to-[#0e7490] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hvað er sjúklingurinn að spyrja um?</h1>
            <p className="mt-1 text-sm text-cyan-100/80">Leitaðu að einkenni, erindi eða spurningu — líka án íslenskra stafa.</p>
          </div>
          {status}
        </div>
        <label className="relative mt-5 block">
          <span className="sr-only">Leita í upplýsingum um þjónustuna</span>
          <Search className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
            placeholder="t.d. þvagfærasýking, frunsa, barn, blóðprufa, opnunartími…"
            className="w-full rounded-2xl border-0 bg-white py-4 pl-14 pr-14 text-lg text-slate-900 shadow-xl shadow-black/20 outline-none ring-4 ring-transparent placeholder:text-slate-400 focus:ring-cyan-300/60" />
          {q ? (
            <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label="Hreinsa leit"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          ) : (
            <kbd className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-400 sm:block">/</kbd>
          )}
        </label>
      </div>
    </section>
  );
}

// ── Meginreglur (grænu og rauðu spjöldin) ───────────────────────────────────

export function RuleCards({ facts = GUIDE_FACTS, title = "Það helsta um þjónustuna" }: { facts?: GuideFact[]; title?: string }) {
  const groups = [
    { tone: "ok" as const, title: "Svona virkar þjónustan", facts: facts.filter((f) => f.tone === "ok") },
    { tone: "no" as const, title: "Hentar ekki", facts: facts.filter((f) => f.tone === "no") },
    { tone: "info" as const, title: "Hver má nota hana", facts: facts.filter((f) => f.tone === "info") },
  ].filter((g) => g.facts.length);
  const style = {
    ok: { box: "border-emerald-200 bg-emerald-50", head: "text-emerald-800", dot: "bg-emerald-500" },
    no: { box: "border-red-200 bg-red-50", head: "text-red-800", dot: "bg-red-500" },
    info: { box: "border-slate-200 bg-white", head: "text-slate-700", dot: "bg-[var(--hsu)]" },
  };
  return (
    <section aria-labelledby="rules-h" className="space-y-3">
      <h2 id="rules-h" className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className={cx("grid gap-3", groups.length === 3 ? "md:grid-cols-3" : groups.length === 2 ? "md:grid-cols-2" : "")}>
        {groups.map((g) => (
          <div key={g.tone} className={cx("rounded-2xl border p-4", style[g.tone].box)}>
            <h3 className={cx("text-sm font-bold", style[g.tone].head)}>{g.title}</h3>
            <ul className="mt-2 space-y-2.5">
              {g.facts.map((f) => (
                <li key={f.label} className="flex gap-2.5">
                  <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", style[g.tone].dot)} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{f.label}</span>
                    <span className="block text-xs leading-relaxed text-slate-600">{f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Erindi ──────────────────────────────────────────────────────────────────

function ProblemTile({ p, onOpen }: { p: GuideProblem; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon(p.slug)} alt="" className="h-12 w-12 shrink-0" />
      <span className="min-w-0">
        <span className="block font-bold leading-snug text-slate-900 group-hover:text-[var(--hsu-dark)]">{p.title}</span>
        <span className="line-clamp-2 text-xs text-slate-500">{p.summary}</span>
      </span>
    </button>
  );
}

function ProblemDetail({ p, lang, setLang, onBack, onSms }: { p: GuideProblem; lang: Lang; setLang: (l: Lang) => void; onBack?: () => void; onSms: () => void }) {
  const tests = GUIDE_SELFTESTS.filter((t) => p.selftests?.includes(t.key));
  const { livePages } = useGuideContent();
  const pageUrl = livePages.includes(p.slug) ? problemPageUrl(p.slug) : `${SITE}/thjonusta`;
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Til baka" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon(p.slug)} alt="" className="h-14 w-14" />
        <div className="min-w-0 flex-1 basis-52">
          <h2 className="text-xl font-bold text-slate-900">{p.title}</h2>
          <p className="text-sm text-slate-600">{p.summary}</p>
          {p.photo && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <Camera className="h-3.5 w-3.5" /> Sjúklingur sendir mynd með erindinu
            </p>
          )}
        </div>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--hsu-dark)] ring-1 ring-slate-200 hover:bg-slate-50">
          <ExternalLink className="h-4 w-4" /> Á vefnum
        </a>
      </header>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Hentar</h3>
            <ul className="mt-2 space-y-1.5">
              {p.suitable.map((s) => <li key={s} className="flex gap-2 text-sm text-slate-800"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{s}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-800">Hentar ekki — vísa annað</h3>
            <ul className="mt-2 space-y-1.5">
              {p.notSuitable.map((s) => <li key={s} className="flex gap-2 text-sm text-slate-800"><X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />{s}</li>)}
            </ul>
          </div>
        </div>

        {p.slug === "lyfjuendurnyjun" && <MedCheckBox />}

        <PatientTextBox title="Texti til sjúklings" id={`problem:${p.slug}:${lang}`} lang={lang} setLang={setLang} onSms={onSms} />

        {p.slug === "lyfjuendurnyjun" && <MedsSection groups={GUIDE_MEDS} searching />}

        {tests.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <FlaskConical className="h-4 w-4" /> Sjálfspróf sem geta fylgt erindinu
            </h3>
            <div className="grid gap-2 md:grid-cols-2">
              {tests.map((t) => <SelftestCard key={t.key} t={t} lang={lang} compact />)}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Sjálfspróf ──────────────────────────────────────────────────────────────

function SelftestCard({ t, lang, compact }: { t: GuideSelftest; lang: Lang; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="font-bold text-slate-900">{t.title}</h4>
      <p className="text-xs text-slate-600">{t.what}</p>
      <p className="mt-1 text-xs text-slate-500"><b>Fæst:</b> {t.where} · <b>Á við:</b> {t.when}</p>
      {open ? (
        <EditableText id={`selftest:${t.key}:${lang}`} size="sm" copyLabel="Afrita leiðbeiningar" className="mt-3 rounded-xl bg-slate-50 p-3" />
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false}
          className="mt-3 inline-flex items-center gap-1 self-start rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--hsu-dark)] ring-1 ring-cyan-200 hover:bg-cyan-50">
          <ChevronDown className="h-3.5 w-3.5" /> Leiðbeiningar til sjúklings
        </button>
      )}
    </div>
  );
}

function SelftestSection({ lang, setLang, tests, expanded }: { lang: Lang; setLang: (l: Lang) => void; tests: GuideSelftest[]; expanded?: boolean }) {
  return (
    <section aria-labelledby="tests-h" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tests-h" className="flex items-center gap-2 text-lg font-bold text-slate-900"><FlaskConical className="h-5 w-5 text-[var(--hsu)]" /> Sjálfspróf</h2>
          <p className="text-sm text-slate-600">
            Leiðbeiningar til að afrita.{" "}
            <a href={SELFTEST_INFO_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--hsu-dark)] underline">Sjálfsprófin á vefnum</a>
          </p>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {tests.map((t) => <SelftestCard key={t.key} t={t} lang={lang} compact={!expanded} />)}
      </div>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>Fyrir móttöku:</b> {SELFTEST_STAFF_NOTE}</p>
    </section>
  );
}

// ── Algengar spurningar og lyf ──────────────────────────────────────────────

function AnswersSection({ answers, title = "Algengar spurningar — svör af vefnum" }: { answers: GuideAnswer[]; title?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {answers.map((a) => (
          <div key={a.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-slate-900">{a.q}</h3>
            <EditableText id={`answer:${a.key}`} size="sm" copyLabel="Afrita svar" className="mt-1.5" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Lyfjaleit í lyfjaendurnýjun: rautt ef lyfið er á listanum, annars grænt. */
function MedCheckBox() {
  const [q, setQ] = useState("");
  const res = useMemo(() => checkMedication(q), [q]);
  return (
    <section aria-labelledby="medcheck-h" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 id="medcheck-h" className="flex items-center gap-2 font-bold text-slate-900"><Pill className="h-5 w-5 text-[var(--hsu)]" /> Má endurnýja lyfið?</h3>
      <label className="relative mt-3 block">
        <span className="sr-only">Heiti lyfs</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
          placeholder="Heiti lyfs eða virkt efni, t.d. Stesolid, zópíklón, Elvanse"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-3 text-base outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" />
      </label>
      <div aria-live="polite">
        {res.status === "red" && (
          <div className="mt-3 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-3">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]" aria-hidden />
            <div className="min-w-0">
              <p className="font-bold text-red-900">Ekki endurnýjað hjá Fjarlækningum</p>
              <p className="text-sm text-red-900/80">Vísaðu sjúklingi til heimilislæknis eða þess læknis sem ávísar lyfinu.</p>
              <ul className="mt-2 space-y-1.5">
                {res.groups.map((g) => (
                  <li key={g.name} className="text-sm">
                    <span className="font-semibold text-red-900">{g.name}</span>
                    <span className="block text-red-900/80">{g.items.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {res.status === "green" && (
          <div className="mt-3 flex gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]" aria-hidden />
            <div className="min-w-0">
              <p className="font-bold text-emerald-900">Ekki á listanum — getur hentað lyfjaendurnýjun</p>
              <p className="text-sm text-emerald-900/80">
                Á við lyf sem sjúklingur tekur að staðaldri, og aðeins einfaldur lyfseðill. Listinn er ekki tæmandi —
                læknir metur alltaf hvort lyfið er endurnýjað. Athugaðu stafsetningu ef þú ert í vafa.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MedsSection({ groups, searching }: { groups: GuideMedGroup[]; /** Opið strax — í leit og í lyfjaendurnýjun. */ searching: boolean }) {
  const [open, setOpen] = useState(false);
  if (!groups.length) return null;
  const shown = open || searching;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown}
        className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2 font-bold text-slate-900"><Pill className="h-5 w-5 text-red-600" /> Lyf sem eru ekki endurnýjuð</span>
        <ChevronDown className={cx("h-5 w-5 text-slate-400 transition", shown && "rotate-180")} />
      </button>
      {shown && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          <p className="text-xs text-slate-500">Listinn er ekki tæmandi og mat læknis ræður alltaf. Sjúklingi er vísað til heimilislæknis eða þess læknis sem ávísar lyfinu.</p>
          {groups.map((g) => (
            <div key={g.name}>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{g.name}</div>
              <ul className="mt-1 flex flex-wrap gap-1.5">{g.items.map((i) => <li key={i} className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-900">{i}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Allt saman ──────────────────────────────────────────────────────────────

export function GuideBody({ q, setQ, openSlug, setOpenSlug, lang, setLang, onSms, onAsk }: {
  q: string; setQ: (v: string) => void;
  openSlug: string | null; setOpenSlug: (s: string | null) => void;
  lang: Lang; setLang: (l: Lang) => void;
  onSms: () => void; onAsk?: (q: string) => void;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const { answers: allAnswers } = useGuideContent();
  const hits = useMemo(() => searchGuide(q, allAnswers), [q, allAnswers]);
  const { problems, tests, answers } = hits;
  const searching = q.trim().length > 0;
  const opened = openSlug ? GUIDE_PROBLEMS.find((p) => p.slug === openSlug) ?? null : null;

  useEffect(() => { if (opened) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [opened]);

  // Erindi valið: það eitt, stórt.
  if (opened) {
    return (
      <div ref={topRef} className="scroll-mt-24 space-y-6">
        <ProblemDetail p={opened} lang={lang} setLang={setLang} onSms={onSms} onBack={() => setOpenSlug(null)} />
      </div>
    );
  }

  if (searching) {
    const nothing = hits.empty;
    return (
      <div ref={topRef} className="space-y-6">
        <p className="text-sm text-slate-500" aria-live="polite">
          {nothing ? "Ekkert fannst." : `Niðurstöður fyrir „${q}“`}
        </p>
        {nothing && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-slate-700">Sé erindið ekki á listanum hentar það líklega ekki fjarþjónustu — vísaðu sjúklingi á hefðbundna þjónustu heilsugæslunnar.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setQ("")} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Sjá öll erindi</button>
              {onAsk && (
                <button type="button" onClick={() => onAsk(q)} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--hsu)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)]">
                  <MessageCircle className="h-4 w-4" /> Spyrja Fjarlækningar
                </button>
              )}
            </div>
          </div>
        )}
        {problems.length === 1 && <ProblemDetail p={problems[0]} lang={lang} setLang={setLang} onSms={onSms} />}
        {problems.length > 1 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Erindi</h2>
            <div className="grid gap-2 sm:grid-cols-2">{problems.map((p) => <ProblemTile key={p.slug} p={p} onOpen={() => setOpenSlug(p.slug)} />)}</div>
          </section>
        )}
        <MedsSection groups={hits.meds} searching />
        {hits.facts.length > 0 && <RuleCards facts={hits.facts} title="Um þjónustuna" />}
        {hits.access && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Svona kemst sjúklingur inn</h2>
            <PatientTextBox title="Almennur texti með hlekkjum" id={`access:${lang}`} lang={lang} setLang={setLang} onSms={onSms} />
          </section>
        )}
        {tests.length > 0 && <SelftestSection lang={lang} setLang={setLang} tests={tests} expanded />}
        {answers.length > 0 && <AnswersSection answers={answers} title="Algengar spurningar" />}
      </div>
    );
  }

  return (
    <div ref={topRef} className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Erindi sem Fjarlækningar sinna</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {GUIDE_PROBLEMS.map((p) => <ProblemTile key={p.slug} p={p} onOpen={() => setOpenSlug(p.slug)} />)}
        </div>
      </section>
      <RuleCards />
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Svona kemst sjúklingur inn</h2>
        <PatientTextBox title="Almennur texti með hlekkjum" id={`access:${lang}`} lang={lang} setLang={setLang} onSms={onSms} />
      </section>
      <SelftestSection lang={lang} setLang={setLang} tests={GUIDE_SELFTESTS} />
      <AnswersSection answers={allAnswers} />
      <MedsSection groups={GUIDE_MEDS} searching={false} />
    </div>
  );
}
