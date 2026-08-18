import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { erindi, localizeErindi } from "@/erindi";
import { getPageContent, getLocale } from "@/lib/site-content/server";
import { erindiKey, erindiPagesLive } from "@/lib/site-content/erindi-pages";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** Content for one erindi, or null when the pages are switched off / unknown slug. */
async function load(slug: string) {
  const item = erindi.find((e) => e.slug === slug);
  if (!item) return null;
  const [c, locale] = await Promise.all([getPageContent("erindi"), getLocale()]);
  if (!erindiPagesLive(c)) return null;
  const k = erindiKey(slug);
  const localized = localizeErindi(locale).find((e) => e.slug === slug)!;
  const lines = (v?: string) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    c,
    locale,
    slug,
    title: localized.title,
    lead: c[`${k}_lead`]?.trim() || localized.description,
    suitable: lines(c[`${k}_suitable`]),
    refer: lines(c[`${k}_refer`]),
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  // Switched off: tell crawlers to stay away even if someone has the URL.
  if (!d) return { title: "Erindi", robots: { index: false, follow: false } };
  return {
    title: d.title,
    description: d.lead.slice(0, 160),
    alternates: { canonical: `/erindi/${slug}` },
    openGraph: { title: `${d.title} — Fjarlækningar`, description: d.lead.slice(0, 200) },
  };
}

export default async function ErindiPage({ params }: Params) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { c } = d;
  const others = localizeErindi(d.locale).filter((e) => e.slug !== slug).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${d.title} — Fjarlækningar`,
    description: d.lead,
    url: `${SITE_URL}/erindi/${slug}`,
    inLanguage: d.locale,
    about: { "@type": "MedicalCondition", name: d.title },
    publisher: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forsíða", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Þjónusta", item: `${SITE_URL}/thjonusta` },
        { "@type": "ListItem", position: 3, name: d.title, item: `${SITE_URL}/erindi/${slug}` },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <nav aria-label="Brauðmylsna" className="text-sm text-slate-500 mb-6">
          <Link href="/thjonusta" className="hover:text-slate-700">Þjónusta</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">{d.title}</span>
        </nav>

        <div className="flex items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/erindi-icons/${slug}.png`} alt="" width={72} height={72} className="w-18 h-18 shrink-0 object-contain" />
          <div>
            {c.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan-dark mb-2">{c.eyebrow}</p>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{d.title}</h1>
          </div>
        </div>
        <p className="mt-5 text-lg text-slate-600 leading-relaxed">{d.lead}</p>

        {d.suitable.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-slate-900">{c.suitable_heading}</h2>
            <ul className="mt-4 space-y-2.5">
              {d.suitable.map((line) => (
                <li key={line} className="flex gap-3 text-slate-700">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">{c.refer_heading}</h2>
          {d.refer.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {d.refer.map((line) => (
                <li key={line} className="flex gap-3 text-slate-700">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-slate-600 leading-relaxed">{c.refer_body}</p>
          )}
        </div>

        <div className="mt-14 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-8 sm:p-10 text-white">
          <h2 className="text-2xl font-bold">{c.cta_heading}</h2>
          {c.cta_body && <p className="mt-3 text-brand-cyan-subtle max-w-xl">{c.cta_body}</p>}
          <Link
            href="/hafa-samband"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] hover:bg-slate-50"
          >
            {c.cta_label}
          </Link>
        </div>

        {others.length > 0 && (
          <div className="mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">{c.related_heading}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/erindi/${o.slug}`}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-cyan hover:text-brand-cyan-dark"
                >
                  {o.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
