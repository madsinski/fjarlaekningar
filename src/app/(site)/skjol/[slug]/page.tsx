import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";

// Public renderer for PUBLISHED legal documents. Fetches straight from
// Supabase PostgREST with the anon key (RLS allows anon to read only
// status='published' rows), so no service-role key is exposed to the site.

export const dynamic = "force-dynamic";

interface PublicDoc {
  title: string;
  body: string;
  version: number;
  published_at: string | null;
  updated_at: string;
}

async function getDoc(slug: string): Promise<PublicDoc | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const q =
    `${url}/rest/v1/legal_documents?slug=eq.${encodeURIComponent(slug)}` +
    `&status=eq.published&select=title,body,version,published_at,updated_at&limit=1`;
  const res = await fetch(q, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as PublicDoc[];
  return rows?.[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
  return { title: doc ? `${doc.title} — Fjarlækningar ehf.` : "Skjal fannst ekki" };
}

export default async function PublicLegalDoc({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const updated = doc.published_at || doc.updated_at;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <article>
        <h1 className="text-3xl font-bold text-slate-900">{doc.title}</h1>
        <p className="text-sm text-slate-500 mt-2 mb-8">
          Útgáfa {doc.version}
          {updated ? ` · Uppfært ${new Date(updated).toLocaleDateString("is-IS")}` : ""}
        </p>
        <div className="prose-slate">{renderMarkdown(doc.body)}</div>
      </article>
    </div>
  );
}
