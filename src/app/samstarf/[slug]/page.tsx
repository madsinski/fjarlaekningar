import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import PartnerSection, { type PartnerPageData } from "@/app/components/PartnerSection";

// Public, shareable partner-access proposal — the link sent to an institution's
// tech team. Standalone (no site chrome) so it reads as a focused hand-off.
export const dynamic = "force-dynamic";

async function fetchPublished(slug: string): Promise<PartnerPageData | null> {
  try {
    const { data } = await supabaseAdmin
      .from("partner_pages")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    return { ...data, erindi: Array.isArray(data.erindi) ? data.erindi : [] } as PartnerPageData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchPublished(slug);
  return {
    title: p ? `${p.short_name || p.name} × Fjarlækningar` : "Fjarlækningar",
    robots: { index: false, follow: false },
  };
}

export default async function SamstarfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const partner = await fetchPublished(slug);

  if (!partner) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Síðan er ekki tiltæk</h1>
          <p className="mt-2 text-slate-600">Hlekkurinn gæti verið rangur eða síðan ekki verið birt enn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <PartnerSection partner={partner} />
        <p className="mt-8 text-center text-xs text-slate-400">
          Tillaga frá Fjarlækningum · endanlegt útlit ræðst af component-safni island.is
        </p>
      </div>
    </div>
  );
}
