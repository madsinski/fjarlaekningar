"use client";

import { Fragment, useMemo, useState } from "react";
import MedsList, { type MedCategory } from "./MedsList";

// Interactive FAQ: a search field, horizontal category pills, and a
// "view more" cap so a long list stays scannable. Kept as a client component
// (the rest of the page is server-rendered); the accordions themselves are
// native <details>, so open/close still needs no JS.

export type FaqItem = { q: string; a: string; cat: string };
export type { MedCategory };

export type FaqLabels = {
  all: string;
  search: string;
  more: string; // "{n}" is replaced with the remaining count
  less: string;
  noResults: string;
};

const PAGE = 5;

// ── answer rendering ───────────────────────────────────────────────────────
// Answers are plain CMS textareas with a tiny syntax: blank line -> paragraph,
// "· "/"•"/"- " -> bullet ("Titill | lýsing" bolds the title), a bare URL is
// linked, and {{lyfjalisti}} expands into the medication list.

const URL_RE = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//i;
const BULLET_RE = /^([·•‣]|-)\s+/;

function linkify(text: string) {
  return text.split(URL_RE).map((part, i) => {
    if (!IS_URL.test(part)) return <Fragment key={i}>{part}</Fragment>;
    const m = part.match(/^(.*?)([.,;:)]*)$/);
    const href = m ? m[1] : part;
    const tail = m ? m[2] : "";
    return (
      <Fragment key={i}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] underline underline-offset-2 hover:text-[var(--primary-dark)] break-words"
        >
          {href}
        </a>
        {tail}
      </Fragment>
    );
  });
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((raw) => {
        const line = raw.replace(BULLET_RE, "").trim();
        const [head, ...rest] = line.split(" | ");
        const desc = rest.join(" | ").trim();
        return (
          <li key={line} className="flex gap-2.5 text-slate-600 leading-relaxed">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
            <span>
              <span className={desc ? "font-semibold text-slate-800" : ""}>{linkify(head)}</span>
              {desc && <span> — {linkify(desc)}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function FaqAnswer({ text, meds, note }: { text: string; meds: MedCategory[]; note?: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="mt-4 space-y-3">
      {blocks.map((block, i) => {
        if (block === "{{lyfjalisti}}") {
          return meds.length ? <MedsList key={i} categories={meds} note={note} /> : null;
        }
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length && lines.every((l) => BULLET_RE.test(l))) {
          return <Bullets key={i} items={lines} />;
        }
        return (
          <p key={i} className="text-slate-600 leading-relaxed">
            {linkify(block)}
          </p>
        );
      })}
    </div>
  );
}

function QuestionCard({ item, meds, note }: { item: FaqItem; meds: MedCategory[]; note?: string }) {
  return (
    <details className="group bg-white rounded-2xl border border-slate-200 p-6 [&_summary]:cursor-pointer">
      <summary className="flex items-center justify-between gap-4 font-semibold text-slate-900 list-none">
        {item.q}
        <svg
          className="w-5 h-5 shrink-0 text-[var(--primary)] transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <FaqAnswer text={item.a} meds={meds} note={note} />
    </details>
  );
}

export default function FaqSection({
  faqs,
  categories,
  meds,
  medsNote,
  labels,
}: {
  faqs: FaqItem[];
  categories: string[];
  meds: MedCategory[];
  medsNote?: string;
  labels: FaqLabels;
}) {
  const [activeCat, setActiveCat] = useState<string | null>(null); // null = "Allt"
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const q = query.trim().toLowerCase();

  // "Allt" order groups questions by category order, then keeps their own order
  // within a category — so the flat list already reads grouped.
  const ordered = useMemo(() => {
    if (!categories.length) return faqs;
    const rank = new Map(categories.map((c, i) => [c, i]));
    return faqs
      .map((f, i) => ({ f, i }))
      .sort((a, b) => {
        const ra = rank.get(a.f.cat) ?? categories.length;
        const rb = rank.get(b.f.cat) ?? categories.length;
        return ra - rb || a.i - b.i;
      })
      .map((x) => x.f);
  }, [faqs, categories]);

  // Search wins over category + the cap: it looks across everything.
  const searching = q.length > 0;
  const base = useMemo(() => {
    if (searching) {
      return ordered.filter((f) => (f.q + " " + f.a).toLowerCase().includes(q));
    }
    return activeCat ? ordered.filter((f) => f.cat === activeCat) : ordered;
  }, [ordered, activeCat, searching, q]);

  const capped = !searching && !activeCat && !expanded;
  const visible = capped ? base.slice(0, PAGE) : base;
  const remaining = base.length - visible.length;
  // Category sub-headings only in the grouped "Allt" view.
  const showGroupHeads = !searching && !activeCat && categories.length > 0;

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-[var(--primary)] text-white shadow-sm"
        : "bg-white text-slate-600 border border-slate-200 hover:border-brand-cyan-muted hover:text-[var(--primary-dark)]"
    }`;

  return (
    <div className="max-w-3xl">
      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search}
          aria-label={labels.search}
          className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-200 outline-none"
        />
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setActiveCat(null);
              setExpanded(false);
            }}
            className={pill(activeCat === null)}
          >
            {labels.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCat(cat);
                setQuery("");
              }}
              className={pill(activeCat === cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Question list */}
      {visible.length === 0 ? (
        <p className="text-slate-500">{labels.noResults}</p>
      ) : (
        <div className="space-y-4">
          {visible.map((item, i) => {
            const head =
              showGroupHeads && (i === 0 || visible[i - 1].cat !== item.cat) ? item.cat : null;
            return (
              <Fragment key={item.q}>
                {head && (
                  <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary-dark)]">
                    {head}
                  </h3>
                )}
                <QuestionCard item={item} meds={meds} note={medsNote} />
              </Fragment>
            );
          })}
        </div>
      )}

      {/* View more / less */}
      {!searching && !activeCat && base.length > PAGE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--primary-dark)] hover:bg-brand-cyan-subtle transition-colors"
        >
          {expanded ? labels.less : labels.more.replace("{n}", String(remaining))}
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
