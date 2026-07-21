import PortalButton from "../../components/PortalButton";
import PageHero from "../PageHero";
import { erindi } from "../../../erindi";
import SiteIcon from "@/lib/site-content/SiteIcon";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { LocaleContent } from "@/lib/site-content/types";

// Presentational Þjónusta page. Same markup/classes as the original hard-coded
// page — only the strings + icon keys come from the resolved content map `c`,
// so this powers both the public page (server) and the CMS live preview.
export default function ThjonustaView({ c }: { c: LocaleContent }) {
  const steps = [
    { n: "1", title: c.step1_title, description: c.step1_desc },
    { n: "2", title: c.step2_title, description: c.step2_desc },
    { n: "3", title: c.step3_title, description: c.step3_desc },
    { n: "4", title: c.step4_title, description: c.step4_desc },
    { n: "5", title: c.step5_title, description: c.step5_desc },
  ].filter((s) => s.title);
  const tests = [
    { title: c.test1_title, desc: c.test1_desc, where: c.test1_where, icon: c.test1_icon, fallback: "droplet" },
    { title: c.test2_title, desc: c.test2_desc, where: c.test2_where, icon: c.test2_icon, fallback: "test-tube" },
    { title: c.test3_title, desc: c.test3_desc, where: c.test3_where, icon: c.test3_icon, fallback: "thermometer" },
  ].filter((t) => t.title);
  // One location per line, "Nafn | Texti". Unlimited, so staff can add
  // heilsugæslur from the admin editor without touching the schema.
  const live = (c.live_locations ?? "")
    .split("\n")
    .map((line) => {
      const [name, ...rest] = line.split("|");
      return { name: name.trim(), note: rest.join("|").trim() };
    })
    .filter((l) => l.name);

  // CMS stores these lists one item per line.
  const lines = (v?: string) =>
    (v ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const limits = [
    {
      title: c.limits1_title,
      body: c.limits1_body,
      icon: c.limits1_icon,
      fallback: "shield-alert",
      lead: c.limits1_lead,
      items: lines(c.limits1_items),
      actionLead: c.limits1_action_lead,
      actions: lines(c.limits1_actions),
    },
    { title: c.limits2_title, body: c.limits2_body, icon: c.limits2_icon, fallback: "stethoscope" },
    { title: c.limits3_title, body: c.limits3_body, icon: c.limits3_icon, fallback: "clipboard-list" },
    { title: c.limits4_title, body: c.limits4_body, icon: c.limits4_icon, fallback: "heart-pulse" },
  ].filter((l) => l.title);
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

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                className="group bg-white rounded-2xl border border-slate-200 p-8 flex items-start gap-5 hover:shadow-lg hover:border-brand-cyan hover:-translate-y-0.5 transition-all"
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

      {/* The process. Rendered as a vertical numbered sequence rather than a
          grid of cards: a patient's question here is "what happens to me, in
          what order", and a grid gives no reading order. The connecting spine
          makes the sequence explicit. #ferlid is linked from the home page. */}
      <section id="ferlid" className="py-20 bg-[var(--background)] scroll-mt-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.how_heading)}
            </h2>
            <p className="mt-4 text-slate-600">{c.how_body}</p>
          </div>

          <ol className="relative max-w-3xl">
            {steps.map((step, i) => (
              <li key={step.n} className="relative flex gap-5 pb-8 last:pb-0">
                {/* Spine: drawn on every item except the last. */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-5 top-11 -ml-px h-[calc(100%-2.75rem)] w-0.5 bg-brand-cyan-muted"
                  />
                )}
                <span className="relative z-10 shrink-0 w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-base font-bold ring-4 ring-[var(--background)]">
                  {step.n}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Heimapróf. Fetching a test yourself is the one piece of friction in an
          otherwise at-home flow, so this section's job is to make it feel
          small: what the test is, and exactly where to get it. */}
      {c.tests_heading && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {renderHighlighted(c.tests_heading)}
              </h2>
              <p className="mt-3 text-slate-600">{c.tests_body}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tests.map((t) => (
                <div
                  key={t.title}
                  className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
                >
                  <div className="w-11 h-11 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
                    <SiteIcon name={t.icon} fallback={t.fallback} className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1.5">{t.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.desc}</p>
                  {t.where && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Fæst hjá
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {t.where.split(",").map((w) => (
                          <span
                            key={w}
                            className="inline-flex items-center rounded-full bg-brand-cyan-subtle/70 px-2.5 py-0.5 text-xs font-medium text-[var(--primary-dark)]"
                          >
                            {w.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {c.tests_footer && <p className="mt-8 text-sm text-slate-500 max-w-3xl">{c.tests_footer}</p>}
          </div>
        </section>
      )}

      {/* Where the service is live. Green is used only here, and only to mean
          "you can use this today" — it is the one genuinely positive status on
          the page, so it should not share the cyan of ordinary content. */}
      {c.live_heading && (
        <section className="py-20 bg-[var(--background)] border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {renderHighlighted(c.live_heading)}
              </h2>
              <p className="mt-3 text-slate-600">{c.live_body}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              {live.map((l) => (
                <div
                  key={l.name}
                  className="h-full flex flex-col bg-white rounded-2xl border border-emerald-200 shadow-sm p-6"
                >
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 mb-4">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Virk þjónusta
                  </span>
                  <div className="flex items-start gap-3">
                    <SiteIcon name="map-pin" fallback="map-pin" className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{l.name}</h3>
                      {l.note && <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{l.note}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {c.live_footer && <p className="mt-8 text-sm text-slate-500">{c.live_footer}</p>}
          </div>
        </section>
      )}

      {/* Scope / limits. Styled apart from the cyan capability cards on purpose
          — this is clinical guidance, not marketing. Hidden entirely if the
          heading is cleared in the CMS. */}
      {c.limits_heading && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {renderHighlighted(c.limits_heading)}
              </h2>
              <p className="mt-3 text-slate-600">{c.limits_body}</p>
            </div>
            {/* Default stretch (no items-start) so cards in a row share one
                height and their edges line up. h-full + flex-col makes each
                card fill that height rather than floating at its natural size.
                Amber border + lift: these are scope warnings on a white
                section, and a plain slate border left them barely visible. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {limits.map((l) => (
                <div
                  key={l.title}
                  className="h-full flex flex-col bg-white rounded-2xl border border-amber-200 shadow-sm p-6 transition-shadow hover:shadow-md"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                    <SiteIcon name={l.icon} fallback={l.fallback} className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1.5">{l.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{l.body}</p>

                  {/* Red flags. Collapsed by default to keep the three scope
                      cards scannable, but the card still reads as a warning
                      when shut and "hringdu í 112" stays visible below the grid
                      regardless — nothing safety-critical is hidden behind the
                      click alone. */}
                  {l.items && l.items.length > 0 && (
                    <details className="group mt-4 border-t border-slate-100 pt-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-amber-800 hover:text-amber-900">
                        Sjá dæmi um alvarleg einkenni
                        <svg
                          className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>

                      {l.lead && <p className="mt-3 text-sm font-medium text-slate-800">{l.lead}</p>}
                      <ul className="mt-2 space-y-1.5">
                        {l.items.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                            {item}
                          </li>
                        ))}
                      </ul>

                      {l.actions && l.actions.length > 0 && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          {l.actionLead && (
                            <p className="text-sm font-semibold text-amber-900">{l.actionLead}</p>
                          )}
                          <ul className="mt-2 space-y-1.5">
                            {l.actions.map((a) => (
                              <li key={a} className="flex gap-2 text-sm text-amber-900 leading-relaxed">
                                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </details>
                  )}
                </div>
              ))}
            </div>
            {c.limits_note && (
              <p className="mt-8 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                {c.limits_note}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="py-20 bg-[var(--background)] border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.faq_heading)}
            </h2>
          </div>
          {/* Container is full width so the left edge aligns with every other
              section; the list itself stays at a readable measure. */}
          <div className="space-y-4 max-w-3xl">
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

          <div className="mt-16 max-w-3xl">
            <p className="text-slate-600 mb-6">{c.cta_text}</p>
            <PortalButton size="lg" label={c.cta_button} />
          </div>
        </div>
      </section>
    </>
  );
}
