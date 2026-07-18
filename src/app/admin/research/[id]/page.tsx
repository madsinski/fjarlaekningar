"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { renderMarkdown } from "@/lib/markdown";

interface Note {
  id: string;
  title: string;
  category: string;
  body: string;
  source_url: string | null;
}

export default function ResearchEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/research/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const d = j.note as Note;
      setNote(d);
      setTitle(d.title);
      setCategory(d.category || "");
      setSourceUrl(d.source_url || "");
      setBodyText(d.body || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/research/${id}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ title, category, source_url: sourceUrl, body: bodyText }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return;
    }
    setMsg({ type: "ok", text: "Vistað." });
    await load();
  };

  const remove = async () => {
    if (!confirm("Eyða þessari glósu varanlega?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/research/${id}`, { method: "DELETE", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok) router.push("/admin/research");
    else setMsg({ type: "err", text: j.error || "Villa" });
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;
  if (!note) return <div className="p-8 text-sm text-slate-500">Glósa fannst ekki.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/admin/research" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Rannsóknir
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 truncate">{note.title}</h1>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titill" className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Flokkur" className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
        <div className="sm:col-span-3 relative">
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Heimildarhlekkur (valfrjálst)" className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-700">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Glósa (markdown)</div>
        <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
          <Eye className="w-3.5 h-3.5" /> {preview ? "Breyta" : "Forskoða"}
        </button>
      </div>
      {preview ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-6 min-h-[240px]">{renderMarkdown(bodyText)}</div>
      ) : (
        <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={18} placeholder={"# Titill\n\nNiðurstöður, verklag, athugasemdir…"} className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-cyan-200 outline-none" />
      )}

      {msg && (
        <div className={`mt-4 rounded-lg border p-3 text-xs ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">
          <Save className="w-4 h-4" /> Vista
        </button>
        <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="w-4 h-4" /> Eyða
        </button>
      </div>
    </div>
  );
}
