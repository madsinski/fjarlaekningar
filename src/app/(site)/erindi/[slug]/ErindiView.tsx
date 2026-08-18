// Presentational body of an erindi landing page. Kept free of server-only
// imports so the CMS can render the very same component as a live preview
// while the text is being edited.

import Link from "next/link";
import type { LocaleContent } from "@/lib/site-content/types";

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
  /** The CMS preview is not a routed page, so its links stay inert. */
  linked?: boolean;
};

/** Blank-line-separated prose → paragraphs. */
export function erindiParagraphs(v?: string): string[] {
  return (v ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** "## x" sub-heading, "- x" bullet, anything else a paragraph. */
export function adviceBlocks(v?: string): { kind: "h" | "li" | "p" | "warn"; text: string }[] {
  return (v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) =>
      l.startsWith("## ")
        ? { kind: "h" as const, text: l.slice(3).trim() }
        : l.startsWith("!! ")
          ? { kind: "warn" as const, text: l.slice(3).trim() }
        : l.startsWith("- ")
          ? { kind: "li" as const, text: l.slice(2).trim() }
          : { kind: "p" as const, text: l },
    );
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
  linked = true,
}: ErindiViewProps) {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <nav aria-label="Brauðmylsna" className="text-sm text-slate-500 mb-6">
        {linked ? (
          <Link href="/thjonusta" className="hover:text-slate-700">Þjónusta</Link>
        ) : (
          <span>Þjónusta</span>
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
      </div>

      {adviceBlocks(advice).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">{c.advice_heading}</h2>
          <div className="mt-4 space-y-3">
            {adviceBlocks(advice).map((b, i) =>
              b.kind === "h" ? (
                <h3 key={i} className="pt-3 text-base font-bold text-slate-900">{b.text}</h3>
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
                  <span>{b.text}</span>
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
            href="/hafa-samband"
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
                  href={`/erindi/${o.slug}`}
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
