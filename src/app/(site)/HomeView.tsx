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
  // Titles only. The descriptions used to live here too, which meant the home
  // page and /thjonusta each carried a different half of the same explanation.
  const steps = [c.step1_title, c.step2_title, c.step3_title, c.step4_title, c.step5_title].filter(
    Boolean,
  );
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
      <section className="py-20 bg-[var(--background)] border-y border-slate-200">
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
          {/* Glanceable summary: the five steps in order, titles only. Someone
              who wants to know what each step involves follows the button to
              the full process on /thjonusta, where it is written out once. */}
          <ol className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-3">
            {steps.map((title, i) => (
              <li key={title} className="flex items-center gap-3 sm:flex-1 sm:min-w-[15rem]">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 leading-snug">{title}</span>
              </li>
            ))}
          </ol>

          <Link
            href="/thjonusta#ferlid"
            className="mt-10 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white border-2 border-[var(--primary)] text-[var(--primary-dark)] font-semibold hover:bg-brand-cyan-subtle transition-colors"
          >
            {c.how_cta || "Sjá hvernig þjónustan virkar"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* HSU cooperation / pilot */}
      <section className="py-20 bg-[var(--background)] border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* CTA — the primary ask, and the loudest thing on the page.
          Deliberately placed BEFORE the newsletter: the newsletter is the
          consolation prize for people who aren't ready to book, so asking for
          an email first would interrupt the path to the actual conversion. */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-10 sm:p-16 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold max-w-2xl">{renderHighlighted(c.cta_heading)}</h2>
            <p className="mt-4 text-brand-cyan-subtle max-w-xl">{c.cta_body}</p>
            <div className="mt-8">
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

      {/* Fréttabréf — the fallback capture, last before the footer and styled
          quietly on purpose so it never competes with the CTA above it. */}
      <section className="py-16 bg-[var(--background)] border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewsletterSignup
            heading={renderHighlighted(c.news_heading)}
            body={c.news_body}
            cta={c.news_cta}
            success={c.news_success}
            consent={c.news_consent}
          />
        </div>
      </section>
    </>
  );
}
