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

export default async function Footer() {
  const legalDocs = await getPublishedLegalDocs();
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo variant="light" />
            <p className="mt-4 text-sm text-slate-400 max-w-sm">
              Fjarlækningar ehf. leysir einföld og afmörkuð erindi í gegnum
              örugga sjúklingagátt Medalia. Aðgengileg og skilvirk
              læknisþjónusta, óháð staðsetningu.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Síður</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white">
                  Heim
                </Link>
              </li>
              <li>
                <Link href="/thjonusta" className="hover:text-white">
                  Þjónusta
                </Link>
              </li>
              <li>
                <Link href="/um-okkur" className="hover:text-white">
                  Um okkur
                </Link>
              </li>
              <li>
                <Link href="/hafa-samband" className="hover:text-white">
                  Hafa samband
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Samband</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Fjarlækningar ehf.</li>
              <li>Ísland</li>
              <li>
                <a
                  href="mailto:fjarlaekningar@fjarlaekningar.is"
                  className="hover:text-white"
                >
                  fjarlaekningar@fjarlaekningar.is
                </a>
              </li>
            </ul>
          </div>
        </div>

        {legalDocs.length > 0 && (
          <div className="mt-10 pt-6 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">Lögfræði</h3>
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
            © {new Date().getFullYear()} Fjarlækningar ehf. Allur réttur áskilinn.
          </p>
          <div className="flex items-center gap-4">
            <p>
              Sjúklingagátt rekin af{" "}
              <a
                href="https://medalia.is"
                className="hover:text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                Medalia
              </a>
              .
            </p>
            <Link
              href="/admin"
              className="text-slate-500 hover:text-white transition-colors"
            >
              Stjórnborð
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
