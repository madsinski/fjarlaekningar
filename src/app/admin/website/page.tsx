"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

// Website CMS home. One page for now (the proof); more pages get added here.
const PAGES = [{ slug: "home", label: "Forsíða (Home)", desc: "Hetjusvæði, þjónusta, tölur, ferlið, HSU, ákall." }];

export default function WebsiteCmsPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Vefsíða</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">
        Breyttu texta á vefsíðunni á íslensku og ensku, forskoðaðu og birtu. Breytingar fara ekki í loftið fyrr en þú
        ýtir á „Birta“.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {PAGES.map((p) => (
          <Link key={p.slug} href={`/admin/website/${p.slug}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
            <FileText className="w-5 h-5 text-cyan-600 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{p.label}</div>
              <div className="text-xs text-slate-500 truncate">{p.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
