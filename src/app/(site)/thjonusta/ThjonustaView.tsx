import MedaliaButton from "../../components/MedaliaButton";
import PageHero from "../PageHero";
import { erindi } from "../../../erindi";
import SiteIcon from "@/lib/site-content/SiteIcon";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/types";

// Presentational Þjónusta page. Same markup/classes as the original hard-coded
// page — only the strings + icon keys come from the resolved content map `c`,
// so this powers both the public page (server) and the CMS live preview.
export default function ThjonustaView({ c }: { c: LocaleContent }) {
  const features = [
    { title: c.f1_title, description: c.f1_desc, icon: c.f1_icon, fallback: "zap" },
    { title: c.f2_title, description: c.f2_desc, icon: c.f2_icon, fallback: "clipboard-list" },
    { title: c.f3_title, description: c.f3_desc, icon: c.f3_icon, fallback: "test-tube" },
    { title: c.f4_title, description: c.f4_desc, icon: c.f4_icon, fallback: "pill" },
    { title: c.f5_title, description: c.f5_desc, icon: c.f5_icon, fallback: "shield-check" },
    { title: c.f6_title, description: c.f6_desc, icon: c.f6_icon, fallback: "book-open" },
  ];
  const faqs = [
    { q: c.faq1_q, a: c.faq1_a },
    { q: c.faq2_q, a: c.faq2_a },
    { q: c.faq3_q, a: c.faq3_a },
    { q: c.faq4_q, a: c.faq4_a },
    { q: c.faq5_q, a: c.faq5_a },
    { q: c.faq6_q, a: c.faq6_a },
  ];

  return (
    <>
      <PageHero c={c} />

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.erindi_heading)}
            </h2>
            <p className="mt-3 text-slate-600">{c.erindi_body}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {erindi.map((s) => (
              <div
                key={s.slug}
                className="bg-white rounded-2xl border border-slate-200 p-8 flex items-start gap-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/erindi-icons/${s.slug}.png`}
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20 shrink-0 object-contain"
                />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-slate-600">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">{c.erindi_footer}</p>
        </div>
      </section>

      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.how_heading)}
            </h2>
            <p className="mt-4 text-slate-600">{c.how_body}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-brand-cyan transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-5 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  <SiteIcon name={f.icon} fallback={f.fallback} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.faq_heading)}
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group bg-white rounded-2xl border border-slate-200 p-6 [&_summary]:cursor-pointer"
              >
                <summary className="flex items-center justify-between gap-4 font-semibold text-slate-900 list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 shrink-0 text-[var(--primary)] transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-600 mb-6">{c.cta_text}</p>
            <MedaliaButton size="lg" label={c.cta_button} />
          </div>
        </div>
      </section>
    </>
  );
}
