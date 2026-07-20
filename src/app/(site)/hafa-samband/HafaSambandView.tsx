import MedaliaButton from "../../components/MedaliaButton";
import SiteIcon from "@/lib/site-content/SiteIcon";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/types";

// Presentational Hafa samband page — identical markup to the original, with
// strings + icon keys from the resolved content map.
export default function HafaSambandView({ c }: { c: LocaleContent }) {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            {renderHighlighted(c.hero_heading)}
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl">{c.hero_body}</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
              <SiteIcon name={c.card1_icon} fallback="shield-check" className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{c.card1_heading}</h2>
            <p className="text-slate-600 mb-6">{c.card1_body}</p>
            <MedaliaButton label={c.card1_button} />
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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center text-sm text-slate-500">
          <p>
            <strong>{c.emergency_label}</strong> {c.emergency_body}
          </p>
        </div>
      </section>
    </>
  );
}
