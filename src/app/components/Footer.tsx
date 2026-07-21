import Link from "next/link";
import Logo from "./Logo";

// Single source of truth: published legal documents managed in /admin/legal
// auto-appear here. Publish a doc → it shows in the footer + is live at
// /skjol/<slug>, with no code change.
async function getPublishedLegalDocs(): Promise<{ title: string; slug: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/legal_documents?status=eq.published&select=title,slug&order=title.asc`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    return (await res.json().catch(() => [])) as { title: string; slug: string }[];
  } catch {
    return [];
  }
}

// Text is CMS-editable (page key "chrome"). Props are OPTIONAL and fall back to
// these defaults, so <Footer /> with no props renders exactly as before.
export interface FooterContent {
  nav_home?: string;
  nav_thjonusta?: string;
  nav_um_okkur?: string;
  nav_hafa_samband?: string;
  footer_blurb?: string;
  footer_pages_heading?: string;
  footer_contact_heading?: string;
  footer_legal_heading?: string;
  footer_company?: string;
  footer_country?: string;
  footer_email?: string;
  footer_rights?: string;
  footer_portal_note?: string;
  footer_admin_link?: string;
}

const FOOTER_DEFAULTS: Required<FooterContent> = {
  nav_home: "Heim",
  nav_thjonusta: "Þjónusta",
  nav_um_okkur: "Um okkur",
  nav_hafa_samband: "Hafa samband",
  footer_blurb:
    "Fjarlækningar ehf. leysir einföld og afmörkuð erindi í gegnum örugga sjúklingagátt. Aðgengileg og skilvirk læknisþjónusta, óháð staðsetningu.",
  footer_pages_heading: "Síður",
  footer_contact_heading: "Samband",
  footer_legal_heading: "Lögfræði",
  footer_company: "Fjarlækningar ehf.",
  footer_country: "Ísland",
  footer_email: "fjarlaekningar@fjarlaekningar.is",
  footer_rights: "Fjarlækningar ehf. Allur réttur áskilinn.",
  footer_portal_note: "Sjúklingagátt rekin af",
  footer_admin_link: "Stjórnborð",
};

export default async function Footer({ content }: { content?: FooterContent }) {
  const t = { ...FOOTER_DEFAULTS, ...(content ?? {}) };
  const legalDocs = await getPublishedLegalDocs();
  const pages = [
    { href: "/", label: t.nav_home },
    { href: "/thjonusta", label: t.nav_thjonusta },
    { href: "/um-okkur", label: t.nav_um_okkur },
    { href: "/hafa-samband", label: t.nav_hafa_samband },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo variant="light" />
            <p className="mt-4 text-sm text-slate-400 max-w-sm">{t.footer_blurb}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">{t.footer_pages_heading}</h3>
            <ul className="space-y-2 text-sm">
              {pages.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="hover:text-white">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">{t.footer_contact_heading}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>{t.footer_company}</li>
              <li>{t.footer_country}</li>
              <li>
                <a href={`mailto:${t.footer_email}`} className="hover:text-white">
                  {t.footer_email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {legalDocs.length > 0 && (
          <div className="mt-10 pt-6 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">{t.footer_legal_heading}</h3>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {legalDocs.map((d) => (
                <li key={d.slug}>
                  <Link href={`/skjol/${d.slug}`} className="hover:text-white">
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {t.footer_rights}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              {t.footer_admin_link}
              <span aria-hidden className="text-slate-500">→</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
