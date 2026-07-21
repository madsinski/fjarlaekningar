"use client";

import Link from "next/link";
import { FileText, PanelsTopLeft, ExternalLink } from "lucide-react";
import { SITE_PAGES } from "@/lib/site-content/registry";
import { PUBLIC_SITE_URL, previewUrl } from "@/lib/public-site";
import GateToggle from "./GateToggle";

// Website CMS index — every editable surface: the marketing pages plus the
// site chrome (header + footer), which is edited separately from page content.
export default function WebsiteCmsPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vefsíða</h1>
          <p className="text-sm text-slate-600 mt-1 mb-6 max-w-2xl">
            Breyttu texta og táknum á vefsíðunni á íslensku og ensku, forskoðaðu og birtu. Breytingar fara ekki í loftið
            fyrr en þú ýtir á „Birta“.
          </p>
        </div>
        {/* Opens the real domain with the coming-soon gate bypassed. */}
        <a
          href={previewUrl("/")}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          <ExternalLink className="w-4 h-4" /> Skoða vefinn í beinni
        </a>
      </div>

      <p className="-mt-2 mb-6 text-xs text-slate-500">
        Hlekkurinn opnar <span className="font-medium">{PUBLIC_SITE_URL.replace("https://", "")}</span> með
        forskoðunarlykli, svo þú sérð síðuna eins og hún verður — þótt „coming soon“ hliðið sé enn virkt. Lykillinn
        gildir í 30 daga í vafranum.
      </p>

      <GateToggle />

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {SITE_PAGES.map((p) => {
          const Icon = p.key === "chrome" ? PanelsTopLeft : FileText;
          return (
            <Link
              key={p.key}
              href={`/admin/website/${p.key}`}
              className="flex items-center gap-3 p-4 hover:bg-slate-50"
            >
              <Icon className="w-5 h-5 text-cyan-600 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{p.label}</div>
                <div className="text-xs text-slate-500 truncate">{p.desc}</div>
              </div>
              {p.path && <code className="ml-auto shrink-0 text-[11px] text-slate-400">{p.path}</code>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
