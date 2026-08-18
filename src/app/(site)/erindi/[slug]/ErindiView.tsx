// Presentational body of an erindi landing page. Kept free of server-only
// imports so the CMS can render the very same component as a live preview
// while the text is being edited.

import Link from "next/link";
import { localeHref } from "@/lib/locale";
import { ui } from "@/lib/site-content/ui-strings";
import MedsList, { type MedCategory } from "../../thjonusta/MedsList";
import type { Locale, LocaleContent } from "@/lib/site-content/types";

export type ErindiViewProps = {
  c: LocaleContent;
  slug: string;
  title: string;
  lead: string;
  about: string;
  selftest: string;
  advice: string;
  suitable: string[];
  refer: string[];
  others: { slug: string; title: string }[];
  /** Medications that cannot be renewed — only the lyfjaendurnýjun page passes
   *  these. Same CMS fields the /thjonusta FAQ reads, so the list is written
   *  once and cannot drift between the two pages. */
  meds?: MedCategory[];
  medsIntro?: string;
  medsNote?: string;
  /** Keeps cross-links inside the visitor's language (/en/erindi/… on /en). */
  locale?: Locale;
  /** The CMS preview is not a routed page, so its links stay inert. */
  linked?: boolean;
};

/** Blank-line-separated prose → paragraphs. */
export function erindiParagraphs(v?: string): string[] {
  return (v ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export type AdviceItem = { text: string; detail: string[] };
export type AdviceCard = { title: string; items: AdviceItem[] };

export type AdviceBlock =
  | { kind: "h1"; text: string }
  | { kind: "h"; text: string }
  | { kind: "warn"; text: string }
  | { kind: "p"; text: string }
  | { kind: "li"; text: string; detail: string[] }
  | { kind: "do"; text: string }
  | { kind: "dont"; text: string }
  /** A do/don't pair, rendered as two cards side by side. */
  | { kind: "cards"; good: AdviceCard; bad: AdviceCard };

/**
 * "# x" section, "## x" sub-heading, "!! x" warning, "- x" bullet, anything else
 * a paragraph. The two heading levels matter on the erindi that covers three
 * separate conditions: without them "Sveppasýking í leggöngum" would sit at the
 * same rank as its own "Góð ráð", and the page reads as one undifferentiated
 * list rather than three sections.
 *
 * A plain line directly under a bullet is that bullet's EXPLANATION and is kept
 * with it as one block — "Saltvatnsnefsprey" and the sentence telling you how to
 * use it are one thing, and rendering them as two siblings a paragraph apart is
 * what made these pages read as a jumble of disconnected lines. A blank line
 * ends the group, which is how an author detaches a paragraph that belongs to
 * the section rather than to the bullet above it.
 */
export function adviceBlocks(v?: string): AdviceBlock[] {
  const out: AdviceBlock[] = [];
  for (const raw of (v ?? "").split("\n")) {
    const l = raw.trim();
    // Blank line: close any open bullet so the next paragraph stands alone.
    if (!l) {
      if (out[out.length - 1]?.kind === "li") out.push({ kind: "p", text: "" });
      continue;
    }
    if (l.startsWith("++ ")) out.push({ kind: "do", text: l.slice(3).trim() });
    else if (l.startsWith("-- ")) out.push({ kind: "dont", text: l.slice(3).trim() });
    else if (l.startsWith("## ")) out.push({ kind: "h", text: l.slice(3).trim() });
    else if (l.startsWith("# ")) out.push({ kind: "h1", text: l.slice(2).trim() });
    else if (l.startsWith("!! ")) out.push({ kind: "warn", text: l.slice(3).trim() });
    else if (l.startsWith("- ")) out.push({ kind: "li", text: l.slice(2).trim(), detail: [] });
    else {
      const prev = out[out.length - 1];
      if (prev?.kind === "li") prev.detail.push(l);
      else out.push({ kind: "p", text: l });
    }
  }
  return foldCards(out.filter((b) => b.kind !== "p" || b.text));
}

/**
 * Fold a "++ do" heading and the "-- don't" heading after it into one paired
 * block, each with the bullets that followed it. Advice of the shape "here is
 * what helps / here is what makes it worse" is read by comparison, and two
 * stacked lists of identical grey bullets make the reader do that work
 * themselves. A "++" with no "--" after it degrades to an ordinary heading.
 */
function foldCards(blocks: AdviceBlock[]): AdviceBlock[] {
  const out: AdviceBlock[] = [];
  const take = (from: number): [AdviceItem[], number] => {
    const items: AdviceItem[] = [];
    let i = from;
    for (; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.kind !== "li") break;
      items.push({ text: b.text, detail: b.detail });
    }
    return [items, i];
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === "do") {
      const [goodItems, afterGood] = take(i + 1);
      const next = blocks[afterGood];
      if (next?.kind === "dont") {
        const [badItems, afterBad] = take(afterGood + 1);
        out.push({
          kind: "cards",
          good: { title: b.text, items: goodItems },
          bad: { title: next.text, items: badItems },
        });
        i = afterBad - 1;
        continue;
      }
      out.push({ kind: "h", text: b.text });
      continue;
    }
    if (b.kind === "dont") {
      out.push({ kind: "h", text: b.text });
      continue;
    }
    out.push(b);
  }
  return out;
}

/** "Heiti | /mynd.webp | Lýsing" per line. */
export function selfTests(v?: string): { title: string; img?: string; body: string }[] {
  return (v ?? "")
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .map(([title, img, body]) => ({ title, img: img || undefined, body: body ?? "" }))
    .filter((t) => t.title);
}

export function erindiLines(v?: string): string[] {
  return (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}

/**
 * One half of a do/don't pair. The mark in the corner carries the meaning at a
 * glance; the colour alone would not, for a reader who cannot distinguish red
 * from green, which is why the tick and the cross are there rather than a
 * coloured border on its own.
 */
function AdviceCardBox({ card, tone }: { card: AdviceCard; tone: "good" | "bad" }) {
  const good = tone === "good";
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        good ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white ${
          good ? "bg-emerald-500" : "bg-rose-500"
        }`}
      >
        {good ? "✓" : "✕"}
      </span>
      <h3 className={`mt-3 text-base font-bold ${good ? "text-emerald-900" : "text-rose-900"}`}>
        {card.title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {card.items.map((it) => (
          <li key={it.text} className="flex gap-2.5 leading-relaxed">
            <span
              aria-hidden
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${good ? "bg-emerald-500" : "bg-rose-400"}`}
            />
            <div className={good ? "text-emerald-950" : "text-rose-950"}>
              <span className={it.detail.length ? "font-semibold" : undefined}>{it.text}</span>
              {it.detail.map((d, j) => (
                <p key={j} className="mt-1 text-slate-600">{d}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ErindiView({
  c,
  slug,
  title,
  lead,
  about,
  selftest,
  advice,
  suitable,
  refer,
  others,
  meds = [],
  medsIntro = "",
  medsNote = "",
  locale = "is",
  linked = true,
}: ErindiViewProps) {
  const t = ui(locale);
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <nav aria-label={t.breadcrumb} className="text-sm text-slate-500 mb-6">
        {linked ? (
          <Link href={localeHref("/thjonusta", locale)} className="hover:text-slate-700">{t.services}</Link>
        ) : (
          <span>{t.services}</span>
        )}
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-700">{title}</span>
      </nav>

      <div className="flex items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/erindi-icons/${slug}.png`} alt="" width={72} height={72} className="w-18 h-18 shrink-0 object-contain" />
        <div>
          {c.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan-dark mb-2">{c.eyebrow}</p>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{title}</h1>
        </div>
      </div>
      {/* The description of the problem is the page's opening text — there is
          no separate one-line summary above it. `lead` still exists, but only
          as the search-result snippet. */}
      {erindiParagraphs(about).length > 0 ? (
        <div className="mt-5 space-y-4">
          {erindiParagraphs(about).map((para) => (
            <p key={para.slice(0, 40)} className="text-lg text-slate-600 leading-relaxed">{para}</p>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-lg text-slate-600 leading-relaxed">{lead}</p>
      )}

      {suitable.length > 0 && (
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">{c.suitable_heading}</h2>
          <ul className="mt-4 space-y-2.5">
            {suitable.map((line) => (
              <li key={line} className="flex gap-3 text-slate-700">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selfTests(selftest).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">{c.selftest_heading}</h2>
          {c.selftest_body && <p className="mt-3 text-slate-600 leading-relaxed">{c.selftest_body}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {selfTests(selftest).map((t) => (
              <div
                key={t.title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                {t.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.img}
                    alt={t.title}
                    className="mb-4 h-32 w-full rounded-xl bg-slate-50 object-contain p-3"
                  />
                )}
                <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                {t.body && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-lg leading-none text-amber-600">⚠</span>
          <h2 className="text-xl font-bold text-slate-900">{c.refer_heading}</h2>
        </div>
        {refer.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {refer.map((line) => (
              <li key={line} className="flex gap-3 text-slate-800">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-slate-700 leading-relaxed">{c.refer_body}</p>
        )}
        {meds.length > 0 && (
          <div className="mt-6">
            {medsIntro && <p className="mb-3 text-slate-700 leading-relaxed">{medsIntro}</p>}
            <MedsList categories={meds} note={medsNote} />
          </div>
        )}
      </div>

      {adviceBlocks(advice).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">{c.advice_heading}</h2>
          <div className="mt-4 space-y-3">
            {adviceBlocks(advice).map((b, i) =>
              b.kind === "cards" ? (
                <div key={i} className="grid gap-4 pt-2 sm:grid-cols-2">
                  <AdviceCardBox card={b.good} tone="good" />
                  <AdviceCardBox card={b.bad} tone="bad" />
                </div>
              ) : b.kind === "h1" ? (
                <h3
                  key={i}
                  className="mt-8 border-t border-slate-200 pt-6 text-lg font-bold text-slate-900 first:mt-0 first:border-0 first:pt-0"
                >
                  {b.text}
                </h3>
              ) : b.kind === "h" ? (
                <h4 key={i} className="pt-3 text-base font-bold text-slate-900">{b.text}</h4>
              ) : b.kind === "warn" ? (
                <div
                  key={i}
                  className="mt-4 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
                >
                  <span aria-hidden className="text-lg leading-none">⚠</span>
                  <p className="font-semibold leading-relaxed">{b.text}</p>
                </div>
              ) : b.kind === "li" ? (
                <div key={i} className="flex gap-3 text-slate-700 leading-relaxed">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <div>
                    {/* A bullet that carries an explanation reads as a label, so
                        it is set in bold with its text beneath it. A plain
                        bullet keeps the normal weight. */}
                    <span className={b.detail.length ? "font-semibold text-slate-900" : undefined}>
                      {b.text}
                    </span>
                    {b.detail.map((d, j) => (
                      <p key={j} className="mt-1 text-slate-600">{d}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p key={i} className="text-slate-700 leading-relaxed">{b.text}</p>
              ),
            )}
          </div>
          {c.advice_note && <p className="mt-5 text-sm text-slate-500">{c.advice_note}</p>}
        </div>
      )}

      <div className="mt-14 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-8 sm:p-10 text-white">
        <h2 className="text-2xl font-bold">{c.cta_heading}</h2>
        {c.cta_body && <p className="mt-3 text-brand-cyan-subtle max-w-xl">{c.cta_body}</p>}
        {linked ? (
          <Link
            href={localeHref("/hafa-samband", locale)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] hover:bg-slate-50"
          >
            {c.cta_label}
          </Link>
        ) : (
          <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">
            {c.cta_label}
          </span>
        )}
      </div>

      {others.length > 0 && (
        <div className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">{c.related_heading}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) =>
              linked ? (
                <Link
                  key={o.slug}
                  href={localeHref(`/erindi/${o.slug}`, locale)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-cyan hover:text-brand-cyan-dark"
                >
                  {o.title}
                </Link>
              ) : (
                <span
                  key={o.slug}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  {o.title}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  );
}
