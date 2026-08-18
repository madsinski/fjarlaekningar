// Shared press list — used by /fjolmidlar, /en/fjolmidlar and the CMS preview.
//
// The newest piece is given a full-width lead card and the rest follow as a
// two-column grid. That ordering is the whole design: a list of six identical
// rows tells a visitor nothing about which one to read, while a lead card plus
// its summary gives them something to actually read on the page rather than a
// wall of headlines to click through blindly.

import { pressKindLabel, type PressItem } from "@/lib/site-content/fjolmidlar";

/** "2026-05-14" → "14. maí 2026". Anything unparseable is shown as written. */
export function formatDate(value: string, locale: "is" | "en" = "is"): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!m) return value ?? "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "is-IS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Outlet · date · kind, the same line on every card. */
function Meta({ item, locale }: { item: PressItem; locale: "is" | "en" }) {
  const kind = pressKindLabel(item.kind, locale);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wider text-brand-cyan-dark">{item.outlet}</span>
      {item.date && (
        <>
          <span aria-hidden className="text-slate-300">·</span>
          <span className="text-slate-500">{formatDate(item.date, locale)}</span>
        </>
      )}
      {kind && (
        <span className="rounded-full bg-brand-cyan-subtle px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary-dark)]">
          {kind}
        </span>
      )}
    </div>
  );
}

const READ_AT = { is: "Lesa hjá", en: "Read at" };

function LeadCard({ item, locale }: { item: PressItem; locale: "is" | "en" }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener"
      className="group relative block overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-colors hover:border-brand-cyan-muted sm:p-10"
    >
      {/* A quiet tint in the corner rather than a photo: we have no rights to
          the outlets' images, and a coloured wash keeps the card from reading
          as a broken image slot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-cyan-subtle opacity-60"
      />
      <div className="relative">
        <Meta item={item} locale={locale} />
        <h2 className="mt-4 max-w-3xl text-2xl font-bold leading-snug text-slate-900 group-hover:text-brand-cyan-dark sm:text-3xl">
          {item.title}
        </h2>
        {item.summary && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{item.summary}</p>
        )}
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan-dark">
          {READ_AT[locale]} {item.outlet}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </a>
  );
}

function Card({ item, locale }: { item: PressItem; locale: "is" | "en" }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener"
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-cyan-muted hover:bg-slate-50/60"
    >
      <Meta item={item} locale={locale} />
      <p className="mt-3 text-lg font-semibold leading-snug text-slate-900 group-hover:text-brand-cyan-dark">
        {item.title}
      </p>
      {item.summary && (
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.summary}</p>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-cyan-dark">
        {READ_AT[locale]} {item.outlet}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">↗</span>
      </span>
    </a>
  );
}

export default function PressList({
  items,
  locale = "is",
}: {
  items: PressItem[];
  locale?: "is" | "en";
}) {
  if (!items.length) return null;
  const [lead, ...rest] = items;
  return (
    <div className="space-y-6">
      <LeadCard item={lead} locale={locale} />
      {rest.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2">
          {rest.map((item) => (
            <li key={item.url} className="h-full">
              <Card item={item} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
