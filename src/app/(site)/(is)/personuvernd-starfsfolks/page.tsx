import type { Metadata } from "next";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/seo";
import { STAFF_PRIVACY_EN, STAFF_PRIVACY_IS, STAFF_PRIVACY_UPDATED, STAFF_PRIVACY_VERSION } from "@/lib/staff-privacy";

// Persónuvernd starfsfólks og samstarfsaðila. Efnið er í src/lib/staff-privacy.ts.
// Slóðin er líka persónuverndarstefna Google OAuth-forritsins (dagatalstenging),
// svo hún verður að vera opin óháð „væntanlegt“-hliðinu (src/proxy.ts).

const TITLE = "Persónuvernd starfsfólks og samstarfsaðila";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | Fjarlækningar` },
  description: "Hvernig Fjarlækningar vinna persónuupplýsingar um starfsfólk, lækna á vaktaskrám og notendur Vinnustöðvar — þar á meðal Google-dagatalstengingu.",
  alternates: { canonical: `${SITE_URL}/personuvernd-starfsfolks` },
};

export default function StaffPrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Langar slóðir (t.d. heimild Google) mega brotna — annars flæðir síðan út í síma. */}
      <article className="[overflow-wrap:anywhere]">
        <h1 className="text-3xl font-bold text-slate-900">{TITLE}</h1>
        <p className="text-sm text-slate-500 mt-2 mb-4">
          Útgáfa {STAFF_PRIVACY_VERSION} · Uppfært {STAFF_PRIVACY_UPDATED}
        </p>
        <p className="mb-8 text-sm text-slate-600">
          <a href="#english" className="text-cyan-700 underline hover:text-cyan-900">English version, including Google user data</a>
        </p>
        <div className="prose-slate">{renderMarkdown(STAFF_PRIVACY_IS)}</div>
        <hr className="my-12 border-slate-200" />
        <section id="english" lang="en" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-slate-900">Privacy notice for staff and partners</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">Version {STAFF_PRIVACY_VERSION} · Updated 16 September 2026</p>
          <div className="prose-slate">{renderMarkdown(STAFF_PRIVACY_EN)}</div>
        </section>
      </article>
    </div>
  );
}
