import Link from "next/link";
import MedaliaButton from "../components/MedaliaButton";
import NewsletterSignup from "../components/NewsletterSignup";
import { erindi } from "../../erindi";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/home";

// Presentational Home page. Renders from a resolved content map `c` so the same
// component powers the public page (server) and the CMS live preview (client).
// Markup/classes are identical to the original hard-coded page — only the text
// strings come from `c`.
export default function HomeView({ c }: { c: LocaleContent }) {
  const steps = [
    { n: "1", title: c.step1_title, description: c.step1_desc },
    { n: "2", title: c.step2_title, description: c.step2_desc },
    { n: "3", title: c.step3_title, description: c.step3_desc },
    { n: "4", title: c.step4_title, description: c.step4_desc },
    { n: "5", title: c.step5_title, description: c.step5_desc },
  ];
  const stats = [
    { value: c.stat1_value, label: c.stat1_label },
    { value: c.stat2_value, label: c.stat2_label },
    { value: c.stat3_value, label: c.stat3_label },
  ];
  const chips = [c.hero_chip1, c.hero_chip2, c.hero_chip3];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-subtle via-white to-brand-cyan-subtle" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              {c.hero_eyebrow}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
              {renderHighlighted(c.hero_heading)}{" "}
              <span className="text-[var(--primary)]">{c.hero_heading_highlight}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl">{c.hero_subheading}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-brand-cyan-muted text-xs font-medium text-slate-600"
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <MedaliaButton size="lg" label={c.hero_cta_primary} />
              <Link
                href="/thjonusta"
                className="inline-flex items-center justify-center px-10 py-4 rounded-full border-2 border-slate-300 text-slate-700 font-semibold hover:border-slate-400 transition-colors"
              >
                {c.hero_cta_secondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{renderHighlighted(c.services_heading)}</h2>
            <p className="mt-4 text-slate-600">{c.services_body}</p>
          </div>
          {/* Glanceable overview only — the full list with descriptions lives on
              /thjonusta so the two pages don't restate each other. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {erindi
              .filter((s) => s.slug !== "laeknisvottord")
              .map((s) => (
                <Link
                  key={s.slug}
                  href="/thjonusta"
                  className="group flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-md hover:border-brand-cyan transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/erindi-icons/${s.slug}.png`}
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 shrink-0 object-contain"
                  />
                  <span className="text-sm font-medium text-slate-800 leading-snug group-hover:text-[var(--primary-dark)]">
                    {s.title}
                  </span>
                </Link>
              ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            {c.services_footer_pre}{" "}
            <Link href="/thjonusta" className="text-[var(--primary)] font-medium hover:underline">
              {c.services_footer_link}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{renderHighlighted(c.stats_heading)}</h2>
            <p className="mt-4 text-slate-600">{c.stats_body}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.value} className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="text-4xl font-extrabold text-[var(--primary)]">{stat.value}</div>
                <p className="mt-3 text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">{c.stats_footer}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{renderHighlighted(c.how_heading)}</h2>
            <p className="mt-4 text-slate-600">{c.how_body}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((step) => (
              <div key={step.n} className="relative">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mb-4">
                  {step.n}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HSU cooperation / pilot */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 flex flex-col md:flex-row items-center gap-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hsu-logo.webp"
              alt="Heilbrigðisstofnun Suðurlands"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40 shrink-0"
            />
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan-subtle/60 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-4">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                {c.hsu_eyebrow}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{renderHighlighted(c.hsu_heading)}</h2>
              <p className="mt-4 text-slate-600">{c.hsu_body1}</p>
              <p className="mt-4 font-medium text-slate-900">{c.hsu_body2}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fréttabréf — opt-in for news, new heilsugæsla cooperations, new services */}
      <section className="pb-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewsletterSignup
            heading={renderHighlighted(c.news_heading)}
            body={c.news_body}
            cta={c.news_cta}
            success={c.news_success}
            consent={c.news_consent}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-10 sm:p-16 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold">{renderHighlighted(c.cta_heading)}</h2>
            <p className="mt-4 text-brand-cyan-subtle max-w-xl mx-auto">{c.cta_body}</p>
            <div className="mt-8 flex justify-center">
              <MedaliaButton
                size="lg"
                label={c.cta_button}
                className="bg-white !text-[var(--primary-dark)] hover:!bg-brand-cyan-subtle"
              />
            </div>
            <p className="mt-6 text-sm text-brand-cyan-subtle/90">{c.cta_footer}</p>
          </div>
        </div>
      </section>
    </>
  );
}
