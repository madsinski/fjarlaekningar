import PortalButton from "../../components/PortalButton";
import SiteIcon from "@/lib/site-content/SiteIcon";
import PageHero from "../PageHero";
import Band from "../Band";
import { HAFA_SAMBAND_SECTIONS } from "@/lib/site-content/hafa-samband";
import { resolveOrder, type LocaleContent } from "@/lib/site-content/types";

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
}: {
  c: LocaleContent;
  order?: string[];
}) {
  const blocks: Record<string, React.ReactNode> = {
    cards: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl">
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
        </div>
      </div>
    ),

    // Safety notice — left-aligned with the cards, and given a warning
    // treatment rather than muted grey footnote text. Someone in an
    // emergency must not scan past this.
    emergency: (
      <div className="max-w-4xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
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
