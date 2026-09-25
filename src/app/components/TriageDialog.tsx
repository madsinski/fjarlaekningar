"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, ExternalLink, MapPin, Phone, RotateCcw, Search, X } from "lucide-react";
import {
  PORTAL_URL, TK, TRIAGE, TRIAGE_START, triageRemaining, triageWhere,
  type ServiceKey, type TriageExample, type TriageOption, type TriageQuestion, type TriageResult, type TriageStep,
} from "@/lib/triage";
import { searchPlaces } from "@/lib/triage-places";
import { checkMedication } from "@/lib/nurse-guide-search";
import type { LocaleContent } from "@/lib/site-content/types";

// The popup behind "Opna sjúklingagátt". The tree and the reasoning for its
// scope live in src/lib/triage.ts; every word comes from the CMS (`text`,
// already resolved for the page's language). This file is only the UI:
// TriagePanel is the card's contents, TriageDialog the modal around it. The CMS
// preview renders TriagePanel inline, so editors see exactly what visitors do.
//
// Same hand-rolled pattern as the site's other overlays (Screenshot, TeamGrid):
// portal to <body>, Escape and backdrop close, body scroll locked while open.
// Bottom sheet on phones, centred card from sm up.

/** Which button opened the popup — decides the title, so people know why
 *  they are looking at questions instead of the portal. */
export type TriageVariant = "portal" | "check";

const TONE: Record<ServiceKey, { badge: string; ring: string }> = {
  "112": { badge: "bg-red-600 text-white", ring: "border-red-200 bg-red-50" },
  brada: { badge: "bg-red-600 text-white", ring: "border-red-200 bg-red-50" },
  "1700": { badge: "bg-amber-500 text-white", ring: "border-amber-200 bg-amber-50" },
  heilsugaesla: { badge: "bg-[var(--slate-deep)] text-white", ring: "border-slate-200 bg-slate-50" },
  heilsuvera: { badge: "bg-[var(--slate-deep)] text-white", ring: "border-slate-200 bg-slate-50" },
  "other-adult": { badge: "bg-[var(--slate-deep)] text-white", ring: "border-slate-200 bg-slate-50" },
  fjar: { badge: "bg-[var(--primary-dark)] text-white", ring: "border-brand-cyan-muted bg-brand-cyan-subtle" },
};

type MedStatus = "idle" | "red" | "green";

// Browsers can't hyphenate Icelandic, so long compounds in the narrow service
// buttons either overflow or get cut anywhere ("Getnaðarvör-n"). Soft hyphens
// at the compound joints make the break land in the right place, with a hyphen.
const JOINTS: [RegExp, string][] = [
  [/leggangasýkingar/g, "leggangas\u00ADýkingar"],
  [/Þvagfæra/g, "Þvag\u00ADfæra"],
  [/Frjókornaofnæmi/g, "Frjókorna\u00ADofnæmi"],
  [/Getnaðarvörn/g, "Getnaðar\u00ADvörn"],
  [/Læknisvottorð/g, "Læknis\u00ADvottorð"],
  [/Risvandamál/g, "Ris\u00ADvandamál"],
  [/Endurnýjun/g, "Endur\u00ADnýjun"],
  [/augnlokavandamál/g, "augnloka\u00ADvandamál"],
  [/Augnsýkingar/g, "Augn\u00ADsýkingar"],
];
const soft = (s: string) => JOINTS.reduce((acc, [re, to]) => acc.replace(re, to), s);

const lines = (v: string | undefined) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const paragraphs = (v: string | undefined) => (v ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// Mounted only while open (see TriageTrigger), so every open starts from the
// top: a half-finished path from last time is more confusing than helpful.
export default function TriageDialog({
  onClose,
  text,
  examples,
  variant = "portal",
}: {
  onClose: () => void;
  text: LocaleContent;
  examples?: TriageExample[];
  variant?: TriageVariant;
}) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="triage-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <TriagePanel text={text} examples={examples} onClose={onClose} variant={variant} />
      </div>
    </div>,
    document.body,
  );
}

/** The card's contents: header, current screen, footer. Remount (key) to reset. */
export function TriagePanel({
  text,
  examples = [],
  onClose,
  initial,
  focusOnMount = true,
  onScreen,
  variant = "portal",
}: {
  text: LocaleContent;
  /** Services pictured under "Algengt vandamál" (see triageExamples). */
  examples?: TriageExample[];
  /** Omit for the inline CMS preview: no close button. */
  onClose?: () => void;
  initial?: TriageStep[];
  focusOnMount?: boolean;
  /** Reports the screen now showing (the CMS preview highlights it). */
  onScreen?: (id: string) => void;
  variant?: TriageVariant;
}) {
  const ui = (name: string) => text[TK.ui(name)] ?? "";
  const [steps, setSteps] = useState<TriageStep[]>(initial ?? [{ id: TRIAGE_START }]);
  const [medStatus, setMedStatus] = useState<MedStatus>("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Move focus to the new question so keyboard and screen-reader users land
  // on it rather than on a button that no longer exists. Not on mount in the
  // CMS preview, where it would pull focus out of the field being edited.
  useEffect(() => {
    if (mounted.current || focusOnMount) headingRef.current?.focus({ preventScroll: !focusOnMount });
    mounted.current = true;
  }, [steps, focusOnMount]);

  const current = steps[steps.length - 1];
  const node = TRIAGE[current.id];
  useEffect(() => {
    onScreen?.(current.id);
  }, [current.id, onScreen]);

  const go = (opt: TriageOption, index: number, place?: string, pick?: string) => {
    setMedStatus("idle");
    setSteps((s) => [...s, { id: opt.next, via: { from: current.id, index }, place, pick }]);
  };
  const back = () => {
    setMedStatus("idle");
    setSteps((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };
  const restart = () => {
    setMedStatus("idle");
    setSteps([{ id: TRIAGE_START }]);
  };
  const why = current.via ? text[TK.why(current.via.from, current.via.index)] : undefined;

  // Never runs backwards: answered / (answered + longest way left).
  const done = steps.length - 1;
  const left = triageRemaining(current.id);
  const progress = node.kind === "result" ? 100 : Math.round((done / (done + left)) * 100);
  const title = ui(variant === "check" ? "title_check" : "title_portal") || ui("title");

  return (
    <>
      <div className="border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {steps.length > 1 ? (
              <button
                type="button"
                onClick={back}
                aria-label={ui("back")}
                className="-ml-2 shrink-0 rounded-full p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/fjarlaekningar-mark.svg" alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
            )}
            <span id="triage-title" className="truncate text-sm font-semibold text-[var(--primary-dark)]">{title}</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={ui("close")}
              className="shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
        <div className="h-1 bg-slate-100" aria-hidden>
          <div className="h-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${Math.max(progress, 6)}%` }} />
        </div>
      </div>

      <div className="overflow-y-auto px-5 py-6 sm:px-6">
        {node.kind === "question" ? (
          <>
            {steps.length === 1 && (ui("intro_heading") || ui("intro")) && (
              <div className="mb-5 rounded-2xl bg-brand-cyan-subtle p-4">
                {ui("intro_heading") && <p className="text-sm font-semibold text-[var(--primary-dark)]">{ui("intro_heading")}</p>}
                {ui("intro") && <p className="mt-1 text-sm leading-relaxed text-slate-700">{ui("intro")}</p>}
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{`${ui("step")} ${steps.length}`}</p>
            <h2
              id="triage-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 text-xl font-bold text-slate-900 outline-none"
            >
              {text[TK.question(current.id)]}
            </h2>
            {node.hint && text[TK.hint(current.id)] && (
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{text[TK.hint(current.id)]}</p>
            )}
            {node.list && lines(text[TK.list(current.id)]).length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-2xl border border-red-100 bg-red-50/60 p-4 text-sm text-slate-700">
                {lines(text[TK.list(current.id)]).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {node.search === "places" ? (
              <PlaceStep node={node} id={current.id} text={text} ui={ui} onPick={go} />
            ) : (
              <>
                {node.search === "meds" && <MedSearch ui={ui} onStatus={setMedStatus} />}
                <Options
                  node={node}
                  id={current.id}
                  text={text}
                  examples={examples}
                  medStatus={medStatus}
                  onPick={go}
                />
              </>
            )}
          </>
        ) : (
          <Result id={current.id} node={node} why={why} text={text} steps={steps} headingRef={headingRef} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-slate-500 sm:px-6 sm:pb-3">
        <span>{ui("disclaimer")}</span>
        {node.kind === "result" ? (
          <button type="button" onClick={restart} className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {ui("restart")}
          </button>
        ) : (
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--primary-dark)] hover:underline"
          >
            {ui("skip")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </>
  );
}

const CARD =
  "group rounded-2xl border border-slate-200 text-left transition-colors hover:border-[var(--primary)] hover:bg-brand-cyan-subtle/60 focus-visible:border-[var(--primary)] focus-visible:outline-none";

/** The answers of a question: picture cards when the answers carry a
 *  `visual`, otherwise a plain list. Medication-search answers are filtered
 *  by the search verdict. */
function Options({
  node,
  id,
  text,
  examples,
  medStatus,
  onPick,
}: {
  node: TriageQuestion;
  id: string;
  text: LocaleContent;
  examples: TriageExample[];
  medStatus: MedStatus;
  onPick: (opt: TriageOption, i: number, place?: string, pick?: string) => void;
}) {
  const shown = node.options
    .map((opt, i) => ({ opt, i }))
    .filter(({ opt }) => !opt.when || (opt.when === "red" ? medStatus === "red" : medStatus === "green"));
  const label = (i: number) => text[TK.option(id, i)];

  if (node.options.some((o) => o.section)) {
    // "Hvað þarftu": section 1 = what Fjarlækningar handles, one button per
    // service (the gallery answer) plus the other section-1 answers; section 2
    // = everything that belongs elsewhere.
    const gallery = shown.find(({ opt }) => opt.visual?.gallery);
    const one = shown.filter(({ opt }) => opt.section === 1 && !opt.visual?.gallery);
    const two = shown.filter(({ opt }) => opt.section === 2);
    return (
      <>
        <h3 className="mt-5 text-sm font-semibold text-slate-900">{gallery ? label(gallery.i) : ""}</h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {gallery &&
            examples.map((ex) => (
              <button
                key={ex.slug}
                type="button"
                onClick={() => onPick(gallery.opt, gallery.i, undefined, ex.title)}
                className={`${CARD} flex items-center gap-2.5 p-2.5`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/erindi-icons/${ex.slug}.png`} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 shrink-0 object-contain" />
                <span className="min-w-0 hyphens-manual text-[13px] font-medium leading-tight text-slate-800">{soft(ex.title)}</span>
              </button>
            ))}
          {one.map(({ opt, i }) => (
            <PictureButton key={i} img={opt.visual?.img} label={label(i)} onClick={() => onPick(opt, i)} compact />
          ))}
        </div>
        {two.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-slate-900">{text[TK.ui("need_more")]}</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {two.map(({ opt, i }) => (
                <PictureButton key={i} img={opt.visual?.img} label={label(i)} onClick={() => onPick(opt, i)} />
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  if (node.options.some((o) => o.visual)) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {shown.map(({ opt, i }) => (
          <PictureButton key={i} img={opt.visual?.img} label={label(i)} onClick={() => onPick(opt, i)} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-2.5">
      {shown.map(({ opt, i }) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(opt, i)}
          className={`${CARD} flex w-full items-center justify-between gap-3 px-4 py-3.5 text-[15px] font-medium text-slate-800`}
        >
          {label(i)}
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--primary-dark)]" aria-hidden />
        </button>
      ))}
    </div>
  );
}

function PictureButton({ img, label, onClick, compact }: { img?: string; label: string; onClick: () => void; compact?: boolean }) {
  return compact ? (
    <button type="button" onClick={onClick} className={`${CARD} flex items-center gap-2.5 p-2.5`}>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 shrink-0 object-contain" />
      )}
      <span className="min-w-0 hyphens-manual text-[13px] font-medium leading-tight text-slate-800">{soft(label)}</span>
    </button>
  ) : (
    <button type="button" onClick={onClick} className={`${CARD} flex flex-col gap-2.5 p-3.5`}>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 object-contain" />
      )}
      <span className="text-sm font-medium leading-snug text-slate-800">{label}</span>
    </button>
  );
}

/** "Hvar ertu núna?": type a place (suggestions pick the region for you), or
 *  press one of the region buttons. */
function PlaceStep({
  node,
  id,
  text,
  ui,
  onPick,
}: {
  node: TriageQuestion;
  id: string;
  text: LocaleContent;
  ui: (name: string) => string;
  onPick: (opt: TriageOption, i: number, place?: string) => void;
}) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => searchPlaces(q), [q]);
  const regionIndex = (region: string) => node.options.findIndex((o) => o.region === region);
  const pickPlace = (region: string, name: string) => {
    const i = regionIndex(region);
    if (i >= 0) onPick(node.options[i], i, name);
  };
  return (
    <div className="mt-5">
      <label className="relative block">
        <span className="sr-only">{ui("place_placeholder")}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) pickPlace(hits[0].region, hits[0].name);
          }}
          placeholder={ui("place_placeholder")}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-3 text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-brand-cyan-subtle"
        />
      </label>
      <div aria-live="polite">
        {hits.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200">
            {hits.map((h) => (
              <li key={h.name} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => pickPlace(h.region, h.name)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[15px] text-slate-800 hover:bg-brand-cyan-subtle"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
                  <span className="font-medium">{h.name}</span>
                  <span className="ml-auto truncate text-xs text-slate-500">{text[TK.option(id, regionIndex(h.region))]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && hits.length === 0 && ui("place_nomatch") && (
          <p className="mt-2 text-sm text-slate-500">{ui("place_nomatch")}</p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {node.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(opt, i)}
            className={`${CARD} flex items-center gap-2 px-3.5 py-3 text-sm font-medium text-slate-800`}
          >
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--primary-dark)]" aria-hidden />
            {text[TK.option(id, i)]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The /vinnustod medication check, worded for patients: red if the medicine
 *  (or its class) is on the list of medicines not renewed remotely. */
function MedSearch({ ui, onStatus }: { ui: (name: string) => string; onStatus: (s: MedStatus) => void }) {
  const [q, setQ] = useState("");
  const res = useMemo(() => checkMedication(q), [q]);
  useEffect(() => {
    onStatus(res.status);
  }, [res.status, onStatus]);
  return (
    <div className="mt-5">
      <label className="relative block">
        <span className="sr-only">{ui("med_placeholder")}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ui("med_placeholder")}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-3 text-base outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-brand-cyan-subtle"
        />
      </label>
      <div aria-live="polite">
        {res.status === "red" && (
          <div className="mt-3 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-3">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]" aria-hidden />
            <div className="min-w-0">
              <p className="font-bold text-red-900">{ui("med_red_title")}</p>
              <p className="text-sm text-red-900/80">{ui("med_red_body")}</p>
              <ul className="mt-2 space-y-1.5">
                {res.groups.map((g) => (
                  <li key={g.name} className="text-sm">
                    <span className="font-semibold text-red-900">{g.name.replace(/^[A-D] · /, "")}</span>
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
              <p className="font-bold text-emerald-900">{ui("med_green_title")}</p>
              <p className="text-sm text-emerald-900/80">{ui("med_green_body")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Result({
  id,
  node,
  why,
  text,
  steps,
  headingRef,
}: {
  id: string;
  node: TriageResult;
  why?: string;
  text: LocaleContent;
  steps: TriageStep[];
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const tone = TONE[node.service];
  const where = triageWhere(steps);
  const pick = steps.find((st) => st.pick)?.pick;
  const localText = node.local && where.region ? text[TK.local(where.region, node.local)] : undefined;
  const location = TRIAGE.location;
  const locIndex = location.kind === "question" ? location.options.findIndex((o) => o.region === where.region) : -1;
  const whereName = where.place || (locIndex >= 0 ? text[TK.option("location", locIndex)] : "");
  return (
    <div>
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
        {text[TK.eyebrow(id)]}
      </span>
      <h2
        id="triage-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-2xl font-bold text-slate-900 outline-none"
      >
        {text[TK.title(id)]}
      </h2>
      {why && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm text-slate-700 ${tone.ring}`}>
          <span className="font-semibold">{text[TK.ui("why")]} </span>
          {why}
        </div>
      )}
      {pick && node.service === "fjar" && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-cyan-muted bg-brand-cyan-subtle p-3.5">
          <p className="text-[15px] text-slate-800">
            {text[TK.ui("pick_hint")]}: <span className="font-semibold text-[var(--primary-dark)]">„{pick}“</span>
          </p>
        </div>
      )}
      {localText && (
        <div className="mt-4 rounded-2xl border border-brand-cyan-muted bg-brand-cyan-subtle p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--primary-dark)]">
            <MapPin className="h-4 w-4" aria-hidden />
            {text[TK.ui("local")]}
            {whereName ? `: ${whereName}` : ""}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-800">{localText}</p>
        </div>
      )}
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-700">
        {paragraphs(text[TK.body(id)]).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {node.actions.map((a) => {
          const isTel = a.href.startsWith("tel:");
          const external = a.href.startsWith("http");
          const Icon = isTel ? Phone : ExternalLink;
          return (
            <a
              key={a.id}
              href={a.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                a.primary
                  ? node.service === "112" || node.service === "brada"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[var(--primary-dark)] text-white hover:brightness-110"
                  : "border-2 border-slate-300 text-slate-700 hover:border-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {text[TK.action(a.id)]}
            </a>
          );
        })}
      </div>
    </div>
  );
}
