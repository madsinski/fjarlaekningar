import PortalButton from "../../components/PortalButton";
import PageHero from "../PageHero";
import Band from "../Band";
import { erindi } from "../../../erindi";
import SiteIcon from "@/lib/site-content/SiteIcon";
import { renderHighlighted } from "@/lib/site-content/highlight";
import { THJONUSTA_SECTIONS } from "@/lib/site-content/thjonusta";
import { resolveOrder, type LocaleContent } from "@/lib/site-content/types";

// Presentational Þjónusta page.
//
// Each band's *content* is declared below; the <section> wrapper, container and
// background come from <Band>, which derives the background from the band's
// position. That is what lets the CMS reorder sections without breaking the
// white/tint alternation. Empty bands are dropped before indices are assigned,
// so a hidden section never leaves a gap in the rhythm either.
export default function ThjonustaView({
  c,
  order,
}: {
  c: LocaleContent;
  order?: string[];
}) {
  const steps = [
    { n: "1", title: c.step1_title, description: c.step1_desc },
    { n: "2", title: c.step2_title, description: c.step2_desc },
    { n: "3", title: c.step3_title, description: c.step3_desc },
    { n: "4", title: c.step4_title, description: c.step4_desc },
    { n: "5", title: c.step5_title, description: c.step5_desc },
  ].filter((s) => s.title);
  const tests = [
    { title: c.test1_title, desc: c.test1_desc, when: c.test1_when, where: c.test1_where, icon: c.test1_icon, fallback: "droplet" },
    { title: c.test2_title, desc: c.test2_desc, when: c.test2_when, where: c.test2_where, icon: c.test2_icon, fallback: "test-tube" },
    { title: c.test3_title, desc: c.test3_desc, when: c.test3_when, where: c.test3_where, icon: c.test3_icon, fallback: "open-mouth" },
  ].filter((t) => t.title);
  // Rollout is umbrella-organisation first (HSU, then HSN, ...), each with its
  // member heilsugæslur. Parsed from one textarea so staff can open another
  // heilsugæsla — or add a whole new institution — without a schema change:
  //   Stofnun | undirtexti | /logo.webp   unprefixed  -> new umbrella
  //   + Heilsugæsla | texti               "+"         -> open now
  //   - Heilsugæsla                       "-"         -> not yet open
  //   * Staður | heimilisfang | prófin    "*"         -> where to collect the
  //                                                      home tests, attached to
  //                                                      the "+" line above it
  type Pickup = { name: string; address?: string; tests?: string };
  type Location = { name: string; note?: string; active: boolean; pickups: Pickup[] };
  const umbrellas: {
    name: string;
    subtitle?: string;
    logo?: string;
    locations: Location[];
  }[] = [];
  const lastLocation = (): Location | undefined => {
    const u = umbrellas[umbrellas.length - 1];
    return u?.locations[u.locations.length - 1];
  };
  for (const raw of (c.live_locations ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const active = line.startsWith("+");
    if (line.startsWith("*")) {
      // A pickup point belongs to the heilsugæsla above it; with none, drop it
      // rather than showing an address with nothing to attach it to.
      const loc = lastLocation();
      if (!loc) continue;
      const [name, address, tests] = line.slice(1).split("|").map((x) => x.trim());
      if (name) loc.pickups.push({ name, address: address || undefined, tests: tests || undefined });
    } else if (active || line.startsWith("-")) {
      // A member line before any institution line has nowhere to go; skip it
      // rather than inventing an unnamed umbrella.
      if (!umbrellas.length) continue;
      const [name, ...rest] = line.slice(1).split("|");
      const note = rest.join("|").trim();
      umbrellas[umbrellas.length - 1].locations.push({
        name: name.trim(),
        note: note || undefined,
        active,
        pickups: [],
      });
    } else {
      const [name, subtitle, logo] = line.split("|").map((x) => x.trim());
      umbrellas.push({ name, subtitle: subtitle || undefined, logo: logo || undefined, locations: [] });
    }
  }

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

  const blocks: Record<string, React.ReactNode> = {
    erindi: (
      <>
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
      </>
    ),

    // The process. A vertical numbered sequence rather than a grid of cards: a
    // patient's question here is "what happens to me, in what order", and a
    // grid gives no reading order. The spine makes the sequence explicit.
    ferlid: (
      <>
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {renderHighlighted(c.how_heading)}
          </h2>
          <p className="mt-4 text-slate-600">{c.how_body}</p>
        </div>
        <ol className="relative max-w-3xl">
          {steps.map((step, i) => (
            <li key={step.n} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Spine starts below the badge, so no background-coloured ring is
                  needed to mask it — which matters now that this band's
                  background depends on where it sits in the order. */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-5 top-11 -ml-px h-[calc(100%-2.75rem)] w-0.5 bg-brand-cyan-muted"
                />
              )}
              <span className="relative z-10 shrink-0 w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-base font-bold">
                {step.n}
              </span>
              <div className="pt-1.5">
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </>
    ),

    // Heimapróf. Fetching a test yourself is the one piece of friction in an
    // otherwise at-home flow, so this band's job is to make it feel small.
    tests: c.tests_heading ? (
      <>
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

              {/* Which erindi can call for this test, named as they appear in
                  the menu so a patient can match it to the one they picked.
                  mt-auto pins the two meta blocks to the bottom of the card, so
                  "Fæst hjá" lines up across cards with different text lengths. */}
              {t.when && (
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Á við um
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.when}</p>
                </div>
              )}

              {t.where && (
                <div className={t.when ? "mt-4" : "mt-auto pt-4 border-t border-slate-100"}>
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
      </>
    ) : null,

    // Where the service is live. Emerald is used only here, and only to mean
    // "you can use this today" — the one genuinely positive status on the page,
    // so it should not share the cyan of ordinary content.
    live: c.live_heading ? (
      <>
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {renderHighlighted(c.live_heading)}
          </h2>
          <p className="mt-3 text-slate-600">{c.live_body}</p>
        </div>
        <div className="space-y-12">
          {umbrellas.map((u) => {
            const open = u.locations.filter((l) => l.active);
            const soon = u.locations.filter((l) => !l.active);
            return (
              <div key={u.name}>
                {/* Institution header — the umbrella the heilsugæslur sit under. */}
                <div className="flex items-center gap-4 pb-5 mb-6 border-b border-slate-200">
                  {u.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.logo} alt="" width={56} height={56} className="w-14 h-14 shrink-0 object-contain" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{u.name}</h3>
                    {u.subtitle && <p className="mt-0.5 text-sm text-slate-600">{u.subtitle}</p>}
                  </div>
                </div>

                {open.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    {open.map((l) => (
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
                            <h4 className="text-base font-semibold text-slate-900">{l.name}</h4>
                            {l.note && <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{l.note}</p>}
                          </div>
                        </div>

                        {/* Where this station's patients collect their home
                            tests. Answered inside the card rather than in the
                            general Heimapróf section, because "Heilsugæsla" or
                            "Apótek" in the abstract doesn't tell a patient in
                            Vestmannaeyjar which door to walk through. */}
                        {l.pickups.length > 0 && (
                          <details className="group mt-4 border-t border-slate-100 pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900">
                              {c.live_pickup_label || "Hvar fæ ég heimapróf?"}
                              <svg
                                className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <ul className="mt-3 space-y-3">
                              {l.pickups.map((pk) => (
                                <li key={pk.name} className="flex gap-2.5">
                                  <SiteIcon
                                    name="map-pin"
                                    fallback="map-pin"
                                    className="w-4 h-4 shrink-0 mt-0.5 text-slate-400"
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-slate-800">{pk.name}</div>
                                    {pk.address && (
                                      <div className="text-sm text-slate-500">{pk.address}</div>
                                    )}
                                    {pk.tests && (
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        {pk.tests.split(",").map((tst) => (
                                          <span
                                            key={tst}
                                            className="inline-flex items-center rounded-full bg-brand-cyan-subtle/70 px-2 py-0.5 text-[11px] font-medium text-[var(--primary-dark)]"
                                          >
                                            {tst.trim()}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Not open yet. Deliberately quiet — listing them shows the
                    rollout is real and lets someone find their own heilsugæsla,
                    but they must not be mistaken for somewhere you can use
                    today, so they get no emerald and no card treatment. */}
                {soon.length > 0 && (
                  <div className={open.length > 0 ? "mt-6" : ""}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                      Væntanlegt
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {soon.map((l) => (
                        <li
                          key={l.name}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500"
                        >
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          {l.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {c.live_footer && <p className="mt-8 text-sm text-slate-500 max-w-3xl">{c.live_footer}</p>}
      </>
    ) : null,

    // Scope / limits. Styled apart from the cyan cards on purpose — this is
    // clinical guidance, not marketing.
    limits: c.limits_heading ? (
      <>
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {renderHighlighted(c.limits_heading)}
          </h2>
          <p className="mt-3 text-slate-600">{c.limits_body}</p>
        </div>
        {/* Default stretch (no items-start) so cards in a row share one height
            and their edges line up. h-full + flex-col makes each card fill that
            height. Amber border + lift: these are scope warnings, and a plain
            slate border left them barely visible. */}
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

              {/* Red flags. Collapsed to keep the scope cards scannable, but the
                  card still reads as a warning when shut and "hringdu í 112"
                  stays visible below the grid regardless — nothing
                  safety-critical is hidden behind the click alone. */}
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
      </>
    ) : null,

    faq: (
      <>
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {renderHighlighted(c.faq_heading)}
          </h2>
        </div>
        {/* Band container is full width so the left edge aligns with every other
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
      </>
    ),
  };

  const visible = resolveOrder(THJONUSTA_SECTIONS, order ? { order } : null).filter(
    (id) => blocks[id],
  );

  return (
    <>
      <PageHero c={c} />
      {/* Every band is anchored by its section id, so anything can be deep
          linked (#ferlid from the home page's process summary, #live from the
          cooperation card) without hand-maintaining a list of anchors. */}
      {visible.map((id, i) => (
        <Band key={id} index={i} anchor={id}>
          {blocks[id]}
        </Band>
      ))}
    </>
  );
}
