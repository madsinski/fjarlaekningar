// The list of medications Fjarlækningar cannot renew, as collapsible groups.
//
// Lives on its own because two pages need it: the /thjonusta FAQ answer about
// prescription renewal, and the lyfjaendurnýjun erindi page. Both read the same
// CMS fields (meds_* on the Þjónusta page), so the list is written once.
//
// No "use client" and no hooks — the accordions are native <details>, so this
// renders on the server and costs the erindi page nothing in JavaScript.

export type MedCategory = { title: string; items: string };

export default function MedsList({ categories, note }: { categories: MedCategory[]; note?: string }) {
  const parse = (items: string) => {
    const groups: { heading?: string; drugs: { label: string; brands?: string }[] }[] = [];
    for (const raw of items.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("#")) {
        groups.push({ heading: line.replace(/^#\s*/, ""), drugs: [] });
        continue;
      }
      if (!groups.length) groups.push({ drugs: [] });
      const idx = line.indexOf(":");
      const drug =
        idx > 0
          ? { label: line.slice(0, idx).trim(), brands: line.slice(idx + 1).trim() }
          : { label: line };
      groups[groups.length - 1].drugs.push(drug);
    }
    return groups;
  };

  return (
    <div className="not-prose space-y-2.5">
      {categories.map((cat) => (
        <details
          key={cat.title}
          className="group/med rounded-xl border border-slate-200 bg-slate-50/70 [&_summary]:cursor-pointer"
        >
          <summary className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 list-none">
            {cat.title}
            <svg
              className="w-4 h-4 shrink-0 text-[var(--primary)] transition-transform group-open/med:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4">
            {parse(cat.items).map((group, gi) => (
              <div key={group.heading ?? gi} className="mt-4 first:mt-1">
                {group.heading && (
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.heading}
                  </div>
                )}
                <ul className="space-y-1">
                  {group.drugs.map((d) => (
                    <li key={d.label} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                      <span>
                        <span className="font-medium text-slate-800">{d.label}</span>
                        {d.brands && <span className="text-slate-500">: {d.brands}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ))}
      {note && <p className="pt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
