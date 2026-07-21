import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/types";

// Shared subpage header.
//
// Deliberately NOT a landing hero. Someone on /thjonusta has already chosen to
// come here for depth, so this orients them in one beat and hands off — the
// content below should hold the attention, not the header. That means no CTA
// and no trust chips (those are conversion furniture for the home page).
//
// It still isn't plain text: a slim cyan accent rule, a small uppercase
// eyebrow, the ==word== highlight in the title, a soft gradient that fades into
// the page, and a hairline rule separating it from the content.
export default function PageHero({
  c,
  width = "max-w-5xl",
}: {
  c: LocaleContent;
  /** Container width — match the page's content sections so edges line up. */
  width?: string;
}) {
  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-brand-cyan-subtle/60 to-white py-14">
      <div className={`${width} mx-auto px-4 sm:px-6 lg:px-8`}>
        {c.hero_eyebrow && (
          <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--primary-dark)]">
            <span aria-hidden className="h-px w-6 bg-[var(--primary)]" />
            {c.hero_eyebrow}
          </span>
        )}

        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 max-w-3xl">
          {renderHighlighted(c.hero_heading)}
        </h1>

        {c.hero_body && <p className="mt-3 text-base text-slate-600 max-w-2xl">{c.hero_body}</p>}
      </div>
    </section>
  );
}
