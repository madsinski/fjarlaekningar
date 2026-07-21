import MedaliaButton from "../components/MedaliaButton";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/types";

// Shared subpage hero.
//
// Mirrors the Forsíða hero's visual language so every page reads as one site:
// eyebrow pill → headline (with ==word== rendered in brand blue) → lead →
// trust chips → CTA, left-aligned, over the brand gradient with a soft glow.
// That sequence gives the eye a clear path down the page while staying
// restrained enough for a medical service.
//
// Every element is optional — an empty CMS field simply drops that element,
// so a page can opt out of the CTA or a third chip without a code change.
export default function PageHero({
  c,
  width = "max-w-5xl",
}: {
  c: LocaleContent;
  /** Container width — match the page's content sections so edges line up. */
  width?: string;
}) {
  const chips = [c.hero_chip1, c.hero_chip2, c.hero_chip3].filter(Boolean);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
      {/* Decorative brand glow — depth without noise. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[var(--brand-cyan)]/10 blur-3xl"
      />
      <div className={`relative ${width} mx-auto px-4 sm:px-6 lg:px-8`}>
        {c.hero_eyebrow && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            {c.hero_eyebrow}
          </span>
        )}

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight max-w-3xl">
          {renderHighlighted(c.hero_heading)}
        </h1>

        {c.hero_body && <p className="mt-6 text-lg text-slate-600 max-w-2xl">{c.hero_body}</p>}

        {chips.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-brand-cyan-muted text-xs font-medium text-slate-600"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {c.hero_cta && (
          <div className="mt-8">
            <MedaliaButton size="lg" label={c.hero_cta} />
          </div>
        )}
      </div>
    </section>
  );
}
