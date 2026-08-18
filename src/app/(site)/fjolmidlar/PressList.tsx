// Shared press list — used by /fjolmidlar and by the CMS preview.

import type { PressItem } from "@/lib/site-content/fjolmidlar";

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

export default function PressList({ items, locale = "is" }: { items: PressItem[]; locale?: "is" | "en" }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {items.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener"
            className="group flex items-start justify-between gap-6 p-6 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider text-brand-cyan-dark">
                <span>{item.outlet}</span>
                {item.date && (
                  <>
                    <span aria-hidden className="text-slate-300">·</span>
                    <span className="font-medium normal-case tracking-normal text-slate-500">
                      {formatDate(item.date, locale)}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1.5 text-lg font-semibold text-slate-900 group-hover:text-brand-cyan-dark">
                {item.title}
              </p>
            </div>
            <span
              aria-hidden
              className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-cyan"
            >
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
