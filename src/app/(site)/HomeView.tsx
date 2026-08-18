import Link from "next/link";
import PortalButton from "../components/PortalButton";
import NewsletterSignup from "../components/NewsletterSignup";
import Band from "./Band";
import { localizeErindi } from "../../erindi";
import { renderHighlighted } from "@/lib/site-content/highlight";
import { HOME_SECTIONS } from "@/lib/site-content/home";
import { resolveOrder, type LocaleContent } from "@/lib/site-content/types";
import { ui } from "@/lib/site-content/ui-strings";
import { localeHref } from "@/lib/locale";
import { PressMeta } from "./fjolmidlar/PressList";
import type { PressItem } from "@/lib/site-content/fjolmidlar";

// Presentational Home page. Renders from a resolved content map `c` so the same
// component powers the public page (server) and the CMS live preview (client).
//
// Each band's *content* is declared below; the <section> wrapper, container and
// background come from <Band>, which derives the background from the band's
// position. That is what lets the CMS reorder sections without breaking the
// white/tint alternation. Empty bands are dropped before indices are assigned,
// so a hidden section never leaves a gap in the rhythm either.
export default function HomeView({
  c,
  order,
  locale = "is",
  press = [],
  pressHeading = "",
  pressLink = "",
}: {
  c: LocaleContent;
  order?: string[];
  /** Locale for the static erindi list — CMS strings in `c` are already
   *  resolved, but the erindi are code, so the view must pick the language. */
  locale?: "is" | "en";
  /** Newest press coverage first; empty means the band does not render at all. */
  press?: PressItem[];
  /** Labels live on the Fjölmiðlar CMS page, next to the list itself. */
  pressHeading?: string;
  pressLink?: string;
}) {
  const erindi = localizeErindi(locale);
  const t = ui(locale);
  // Keeps the visitor inside their language: on /en every link below is /en/…
  const href = (path: string) => localeHref(path, locale);
  // Titles only. The descriptions used to live here too, which meant the home
  // page and /thjonusta each carried a different half of the same explanation.
  // One step title per line (edited by the add/remove control in the CMS);
  // auto-numbered by position.
  const steps = (c.steps ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const stats = [
    { value: c.stat1_value, label: c.stat1_label },
    { value: c.stat2_value, label: c.stat2_label },
    { value: c.stat3_value, label: c.stat3_label },
  ];
  const chips = [c.hero_chip1, c.hero_chip2, c.hero_chip3];
  // Cooperating institutions, one per line: "Nafn | /logo.webp | undirtexti".
  const coops = (c.coop_list ?? "")
    .split("\n")
    .map((line) => {
      const [name, logo, note] = line.split("|").map((x) => x.trim());
      return { name, logo: logo || undefined, note: note || undefined };
    })
    .filter((co) => co.name);

  const blocks: Record<string, React.ReactNode> = {
    services: (
      <>
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{renderHighlighted(c.services_heading)}</h2>
          <p className="mt-4 text-slate-600">{c.services_body}</p>
        </div>
        {/* Glanceable overview only — the full list with descriptions lives on
            /thjonusta so the two pages don't restate each other. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {erindi
            .filter((s) => s.slug !== "laeknisvottord")
            .map((s) => (
              <Link
                key={s.slug}
                href={href("/thjonusta")}
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
                <span className="min-w-0 break-words text-sm font-medium text-slate-800 leading-snug group-hover:text-[var(--primary-dark)]">
                  {s.title}
                </span>
              </Link>
            ))}
        </div>
        <p className="mt-8 text-sm text-slate-500">
          {c.services_footer_pre}{" "}
          <Link href={href("/thjonusta")} className="text-[var(--primary)] font-medium hover:underline">
            {c.services_footer_link}
          </Link>
          .
        </p>
      </>
    ),

    stats: (
      <>
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
      </>
    ),

    how: (
      <>
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{renderHighlighted(c.how_heading)}</h2>
          <p className="mt-4 text-slate-600">{c.how_body}</p>
        </div>
        {/* Glanceable summary: the five steps in order, titles only. Someone
            who wants to know what each step involves follows the button to
            the full process on /thjonusta, where it is written out once. */}
        {/* Single vertical column so every number badge lines up on the same
            left edge, whatever the title lengths. */}
        <ol className="flex flex-col gap-3 max-w-2xl">
          {steps.map((title, i) => (
            <li key={title} className="flex items-center gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-slate-800 leading-snug">{title}</span>
            </li>
          ))}
        </ol>

        <Link
          href={href("/thjonusta#ferlid")}
          className="mt-10 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white border-2 border-[var(--primary)] text-[var(--primary-dark)] font-semibold hover:bg-brand-cyan-subtle transition-colors"
        >
          {c.how_cta || t.seeHow}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </>
    ),

    // Cooperations. Was a single hard-coded HSU card; now a list, so announcing
    // a second institution is a line of CMS text rather than a code change. The
    // layout switches from side-by-side to a logo row once there is more than
    // one, which is why the logos are not simply inlined into the prose.
    // Cooperation section: intro copy, then a horizontal row of institution
    // cards (logo + 2-line name). Adding an institution is one more line in
    // coop_list; "Ekkert merki" hides the cards. Card logo size is a CMS choice.
    coop: (() => {
      const mode = c.coop_logo_placement || "cards"; // "cards" | "top" | "none"
      const logoSize =
        c.coop_logo_size === "small"
          ? "w-14 h-14 sm:w-16 sm:h-16"
          : c.coop_logo_size === "medium"
            ? "w-20 h-20 sm:w-24 sm:h-24"
            : "w-24 h-24 sm:w-28 sm:h-28";
      return (
        <div>
          {/* "Efst": a single logo above the copy, cards hidden. */}
          {mode === "top" && coops[0]?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coops[0].logo} alt={coops[0].name} className={`${logoSize} object-contain mb-8`} />
          )}
          <div className="max-w-2xl">
            {c.coop_eyebrow && (
              <span className="site-eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan-subtle/60 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-4">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                {c.coop_eyebrow}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {renderHighlighted(c.coop_heading)}
            </h2>
            <p className="mt-4 text-slate-600">{c.coop_body}</p>
            {c.coop_note && <p className="mt-4 font-medium text-slate-900">{c.coop_note}</p>}
          </div>

          {/* "Spjöld": one card per institution in a horizontal row. The narrow
              card lets a name like "Heilbrigðisstofnun Suðurlands" wrap to two
              lines under the logo. */}
          {mode === "cards" && coops.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-4 sm:gap-5">
              {coops.map((co) => (
                <div
                  key={co.name}
                  className="flex w-48 flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center"
                >
                  {co.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={co.logo} alt={co.name} className={`${logoSize} object-contain`} />
                  )}
                  <div className="mt-3 text-sm font-semibold leading-tight text-slate-900 break-words">
                    {co.name}
                  </div>
                  {co.note && (
                    <div className="mt-1 text-xs leading-snug text-slate-500 break-words">{co.note}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Link
            href={href("/thjonusta#live")}
            className="mt-10 inline-flex items-center gap-2 px-7 py-3 rounded-full border-2 border-[var(--primary)] text-[var(--primary-dark)] font-semibold hover:bg-brand-cyan-subtle transition-colors"
          >
            {c.coop_cta || t.whereLive}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      );
    })(),

    // Team — a human face right before the final ask, linking to /um-okkur.
    team: (
      <div className="grid items-center gap-8 sm:gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{renderHighlighted(c.team_heading)}</h2>
          <p className="mt-4 max-w-prose text-slate-600">{c.team_body}</p>
          <Link
            href={href("/um-okkur")}
            className="mt-6 inline-flex items-center gap-2 px-7 py-3 rounded-full border-2 border-[var(--primary)] text-[var(--primary-dark)] font-semibold hover:bg-brand-cyan-subtle transition-colors"
          >
            {c.team_cta || "Kynnast teyminu"}
            <span aria-hidden>→</span>
          </Link>
        </div>
        {c.team_photo && (
          <div className="order-1 md:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.team_photo}
              alt="Teymi Fjarlækninga"
              className="h-60 w-full rounded-2xl border border-slate-200 object-cover object-[center_25%] sm:h-72"
            />
          </div>
        )}
      </div>
    ),

    // CTA — the primary ask, and the loudest thing on the page.
    // Deliberately placed BEFORE the newsletter: the newsletter is the
    // consolation prize for people who aren't ready to book, so asking for
    // an email first would interrupt the path to the actual conversion.
    // Social proof, and the only place on the front page where someone other
    // than us is doing the talking — so it gets a real band rather than the
    // three-headline strip it used to be: the newest piece leads with its photo
    // and our summary, the rest follow as compact rows. Nothing renders at all
    // when there is no press.
    press: press.length ? (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4 bg-gradient-to-r from-brand-cyan-subtle to-white px-6 py-5 sm:px-8">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {pressHeading || t.pressHeading}
          </h2>
          <Link
            href={href("/fjolmidlar")}
            className="text-sm font-semibold text-brand-cyan-dark hover:underline"
          >
            {pressLink || t.pressLink} →
          </Link>
        </div>

        <a
          href={press[0].url}
          target="_blank"
          rel="noopener"
          className="group grid border-t border-slate-100 sm:grid-cols-5"
        >
          {press[0].image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={press[0].image}
              alt={press[0].title}
              width={1600}
              height={1085}
              className="aspect-[16/10] w-full object-cover object-top sm:col-span-2 sm:aspect-auto sm:h-full"
            />
          )}
          {/* Centred against the photo so the two columns read as one unit
              rather than text hanging from the top of a taller image. */}
          <div
            className={`flex flex-col justify-center p-6 sm:p-8 ${press[0].image ? "sm:col-span-3" : "sm:col-span-5"}`}
          >
            <PressMeta item={press[0]} locale={locale} />
            <p className="mt-2.5 text-lg font-bold leading-snug text-slate-900 group-hover:text-brand-cyan-dark sm:text-xl">
              {press[0].title}
            </p>
            {press[0].summary && (
              <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {press[0].summary}
              </p>
            )}
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-cyan-dark">
              {t.readAt} {press[0].outlet}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </a>

        {press.length > 1 && (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {press.slice(1, 3).map((p) => (
              <li key={p.url}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-start justify-between gap-6 px-6 py-5 hover:bg-slate-50 sm:px-8"
                >
                  <div className="min-w-0">
                    <PressMeta item={p} locale={locale} />
                    <p className="mt-1.5 font-semibold leading-snug text-slate-900 group-hover:text-brand-cyan-dark">
                      {p.title}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-cyan"
                  >
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null,

    cta: (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-10 sm:p-16 text-white">
        <h2 className="text-3xl sm:text-4xl font-bold max-w-2xl">{renderHighlighted(c.cta_heading)}</h2>
        <p className="mt-4 text-brand-cyan-subtle max-w-xl">{c.cta_body}</p>
        <div className="mt-8">
          <PortalButton
            size="lg"
            label={c.cta_button}
            className="bg-white !text-[var(--primary-dark)] hover:!bg-brand-cyan-subtle"
          />
        </div>
        <p className="mt-6 text-sm text-brand-cyan-subtle/90">{c.cta_footer}</p>
      </div>
    ),

    // Fréttabréf — the fallback capture, last before the footer and styled
    // quietly on purpose so it never competes with the CTA above it.
    news: (
      <NewsletterSignup
        locale={locale}
        heading={renderHighlighted(c.news_heading)}
        body={c.news_body}
        cta={c.news_cta}
        success={c.news_success}
        consent={c.news_consent}
      />
    ),
  };

  const visible = resolveOrder(HOME_SECTIONS, order ? { order } : null).filter(
    (id) => blocks[id],
  );

  return (
    <>
      {/* Hero */}
      {/* Same fix as PageHero: the mid-stop was `white`, so the hero's bottom
          edge matched the white services section below and the two ran
          together. It is now --background, which keeps the diagonal character
          that distinguishes the landing hero from the quieter subpage headers
          while giving it a bottom edge you can actually see. */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-subtle via-[var(--background)] to-brand-cyan-subtle" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="site-eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-6">
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
              <PortalButton size="lg" label={c.hero_cta_primary} />
              <Link
                href={href("/thjonusta")}
                className="inline-flex items-center justify-center px-10 py-4 rounded-full border-2 border-slate-300 text-slate-700 font-semibold hover:border-slate-400 transition-colors"
              >
                {c.hero_cta_secondary}
              </Link>
            </div>
          </div>
        </div>
      </section>
      {visible.map((id, i) => (
        <Band key={id} index={i}>
          {blocks[id]}
        </Band>
      ))}
    </>
  );
}
