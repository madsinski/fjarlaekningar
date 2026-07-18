import type { Metadata } from "next";
import { renderMarkdown } from "@/lib/markdown";

// Public changelog / version history. Anon-key fetch (RLS allows anyone to
// read every release row).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Útgáfusaga — Fjarlækningar ehf.",
};

interface Release {
  id: string;
  version: string;
  title: string;
  notes: string;
  kind: string;
  released_on: string;
}

const KIND_LABELS: Record<string, string> = {
  feature: "Nýjung",
  fix: "Lagfæring",
  security: "Öryggi",
  compliance: "Regluvarsla",
};
const KIND_CHIP: Record<string, string> = {
  feature: "bg-cyan-50 text-cyan-700",
  fix: "bg-slate-100 text-slate-600",
  security: "bg-red-50 text-red-700",
  compliance: "bg-emerald-50 text-emerald-700",
};

async function getReleases(): Promise<Release[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const q = `${url}/rest/v1/releases?select=id,version,title,notes,kind,released_on&order=released_on.desc`;
  const res = await fetch(q, { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json().catch(() => [])) as Release[];
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-slate-900">Útgáfusaga</h1>
      <p className="text-sm text-slate-500 mt-2 mb-10">Breytingar og uppfærslur á þjónustu Fjarlækninga.</p>

      {releases.length === 0 ? (
        <p className="text-sm text-slate-500">Engar útgáfur skráðar enn.</p>
      ) : (
        <ol className="relative border-l border-slate-200 ml-2">
          {releases.map((r) => (
            <li key={r.id} className="mb-10 ml-6">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-cyan-500 border-2 border-white" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${KIND_CHIP[r.kind] || KIND_CHIP.fix}`}>
                  {KIND_LABELS[r.kind] || r.kind}
                </span>
                <span className="font-mono text-xs text-slate-500">v{r.version}</span>
                <time className="text-xs text-slate-400">{new Date(r.released_on).toLocaleDateString("is-IS")}</time>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mt-2">{r.title}</h2>
              {r.notes?.trim() && <div className="mt-2 text-sm">{renderMarkdown(r.notes)}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
