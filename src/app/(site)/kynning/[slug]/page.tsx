import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import PrintButton from "./PrintButton";

// Public renderer for PUBLISHED presentations / printables. Anon-key fetch
// (RLS restricts to status='published'). Print-friendly.

export const dynamic = "force-dynamic";

interface PublicItem {
  title: string;
  kind: string;
  summary: string;
  body: string;
  external_url: string | null;
}

async function getItem(slug: string): Promise<PublicItem | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const q =
    `${url}/rest/v1/presentations?slug=eq.${encodeURIComponent(slug)}` +
    `&status=eq.published&select=title,kind,summary,body,external_url&limit=1`;
  const res = await fetch(q, { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: "no-store" });
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as PublicItem[];
  return rows?.[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  return { title: item ? `${item.title} — Fjarlækningar ehf.` : "Fannst ekki" };
}

export default async function PublicPresentation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <article>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-900">{item.title}</h1>
          <PrintButton />
        </div>
        {item.summary && <p className="text-slate-600 mt-2 mb-6">{item.summary}</p>}

        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="print:hidden inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold mb-8"
          >
            Opna efni
          </a>
        )}

        {item.body?.trim() && <div className="prose-slate mt-6">{renderMarkdown(item.body)}</div>}
      </article>
    </div>
  );
}
