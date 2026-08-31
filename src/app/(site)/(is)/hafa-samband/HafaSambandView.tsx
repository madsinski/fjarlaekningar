import Link from "next/link";
import PortalButton from "../../../components/PortalButton";
import NewsletterInline from "../../../components/NewsletterInline";
import SiteIcon from "@/lib/site-content/SiteIcon";
import PageHero from "../../PageHero";
import Band from "../../Band";
import { HAFA_SAMBAND_SECTIONS } from "@/lib/site-content/hafa-samband";
import { resolveOrder, type Locale, type LocaleContent } from "@/lib/site-content/types";
import { localeHref } from "@/lib/locale";

// Presentational Hafa samband page.
//
// Each band's *content* is declared below; the <section> wrapper, container and
// background come from <Band>, which derives the background from the band's
// position. That is what lets the CMS reorder sections without breaking the
// white/tint alternation. Empty bands are dropped before indices are assigned,
// so a hidden section never leaves a gap in the rhythm either.
export default function HafaSambandView({
  c,
  order,
  locale = "is",
}: {
  c: LocaleContent;
  order?: string[];
  /** Keeps the FAQ link inside the visitor's language (/en/thjonusta on /en). */
  locale?: Locale;
}) {
  const blocks: Record<string, React.ReactNode> = {
    cards: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
            <SiteIcon name={c.card1_icon} fallback="shield-check" className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{c.card1_heading}</h2>
          <p className="text-slate-600 mb-6">{c.card1_body}</p>
          <PortalButton label={c.card1_button} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
            <SiteIcon name={c.card2_icon} fallback="mail" className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{c.card2_heading}</h2>
          <p className="text-slate-600 mb-6">{c.card2_body}</p>
          <a
            href={`mailto:${c.card2_email}`}
            className="inline-flex items-center gap-2 text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)]"
          >
            {c.card2_email}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
          {/* Deflect common questions to the FAQ before someone emails —
              styled as a button so it reads as a real next step, not a footnote. */}
          {c.card2_faq_label && (
            <Link
              href={localeHref("/thjonusta#faq", locale)}
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border-2 border-[var(--primary)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--primary-dark)] hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {c.card2_faq_label}
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
            <SiteIcon name={c.card3_icon} fallback="mail" className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{c.card3_heading}</h2>
          <p className="text-slate-600 mb-6">{c.card3_body}</p>
          <NewsletterInline buttonLabel={c.card3_button} success={c.card3_success} />
        </div>
      </div>
    ),

    // Safety notice — left-aligned with the cards, and given a warning
    // treatment rather than muted grey footnote text. Someone in an
    // emergency must not scan past this.
    emergency: (
      <div className="max-w-5xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p>
          <strong>{c.emergency_label}</strong> {c.emergency_body}
        </p>
      </div>
    ),
  };

  const visible = resolveOrder(HAFA_SAMBAND_SECTIONS, order ? { order } : null).filter(
    (id) => blocks[id],
  );

  return (
    <>
      <PageHero c={c} />
      {visible.map((id, i) => (
        <Band key={id} index={i}>
          {blocks[id]}
        </Band>
      ))}
    </>
  );
}
