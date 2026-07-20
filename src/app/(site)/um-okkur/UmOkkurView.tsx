import MedaliaButton from "../../components/MedaliaButton";
import TeamGrid from "../../components/TeamGrid";
import SiteIcon from "@/lib/site-content/SiteIcon";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/types";

// Presentational Um okkur page — identical markup to the original hard-coded
// page, with strings + icon keys from the resolved content map.
export default function UmOkkurView({ c }: { c: LocaleContent }) {
  const pillars = [
    { title: c.p1_title, body: c.p1_body, icon: c.p1_icon, fallback: "target" },
    { title: c.p2_title, body: c.p2_body, icon: c.p2_icon, fallback: "lock" },
    { title: c.p3_title, body: c.p3_body, icon: c.p3_icon, fallback: "stethoscope" },
    { title: c.p4_title, body: c.p4_body, icon: c.p4_icon, fallback: "clipboard-plus" },
  ];
  const values = [
    { title: c.v1_title, body: c.v1_body, icon: c.v1_icon, fallback: "globe" },
    { title: c.v2_title, body: c.v2_body, icon: c.v2_icon, fallback: "shield-check" },
    { title: c.v3_title, body: c.v3_body, icon: c.v3_icon, fallback: "award" },
    { title: c.v4_title, body: c.v4_body, icon: c.v4_icon, fallback: "sparkles" },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            {renderHighlighted(c.hero_heading)}
          </h1>
          <p className="mt-6 text-lg text-slate-600">{c.hero_body}</p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="group bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-brand-cyan transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-5 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  <SiteIcon name={p.icon} fallback={p.fallback} className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-3">{p.title}</h2>
                <p className="text-slate-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.values_heading)}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
                  <SiteIcon name={v.icon} fallback={v.fallback} className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.team_heading)}
            </h2>
            <p className="mt-4 text-slate-600">{c.team_body}</p>
          </div>
          <TeamGrid />
          <p className="mt-10 text-sm text-slate-500 text-center">{c.team_footer}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MedaliaButton size="lg" label={c.cta_button} />
        </div>
      </section>
    </>
  );
}
