"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Globe, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { renderMarkdown } from "@/lib/markdown";

interface Item {
  id: string;
  slug: string;
  title: string;
  kind: string;
  summary: string;
  body: string;
  external_url: string | null;
  status: string;
}

export default function PresentationEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("kynning");
  const [summary, setSummary] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const res = await fetch(`/api/admin/presentations/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const d = j.presentation as Item;
      setItem(d);
      setTitle(d.title);
      setKind(d.kind);
      setSummary(d.summary || "");
      setExternalUrl(d.external_url || "");
      setBodyText(d.body || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const patch = async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/presentations/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return;
    }
    setMsg({ type: "ok", text: okText });
    await load();
  };

  const save = () => patch({ title, kind, summary, external_url: externalUrl, body: bodyText }, "Vistað.");
  const publish = () => patch({ title, kind, summary, external_url: externalUrl, body: bodyText, status: "published" }, "Birt.");
  const unpublish = () => patch({ status: "draft" }, "Tekið úr birtingu.");

  const remove = async () => {
    if (!confirm("Eyða þessu efni varanlega?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/presentations/${id}`, { method: "DELETE", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok) router.push("/admin/presentations");
    else setMsg({ type: "err", text: j.error || "Villa" });
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;
  if (!item) return <div className="p-8 text-sm text-slate-500">Efni fannst ekki.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/admin/presentations" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Kynningar & prentefni
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{item.title}</h1>
          <div className="text-sm text-slate-500 mt-1">
            /{item.slug} · {item.kind === "prentefni" ? "Prentefni" : "Kynning"} ·{" "}
            {item.status === "published" ? <span className="text-emerald-700">Birt</span> : <span className="text-amber-600">Drög</span>}
          </div>
        </div>
        {item.status === "published" && (
          <a href={`/kynning/${item.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900">
            <Globe className="w-4 h-4" /> Skoða opinbera síðu
          </a>
        )}
      </div>

      {!isAdmin && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">Þú hefur lesaðgang. Aðeins stjórnendur geta breytt og birt.</div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isAdmin} placeholder="Titill" className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} disabled={!isAdmin} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50">
          <option value="kynning">Kynning</option>
          <option value="prentefni">Prentefni</option>
        </select>
        <input value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!isAdmin} placeholder="Stutt lýsing (valfrjálst)" className="sm:col-span-3 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
        <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} disabled={!isAdmin} placeholder="Ytri hlekkur (Figma/PDF/Medalia) — valfrjálst" className="sm:col-span-3 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efni (markdown, valfrjálst)</div>
        <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
          <Eye className="w-3.5 h-3.5" /> {preview ? "Breyta" : "Forskoða"}
        </button>
      </div>
      {preview ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-6 min-h-[240px]">{renderMarkdown(bodyText)}</div>
      ) : (
        <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} disabled={!isAdmin} rows={16} placeholder={"# Fyrirsögn\n\nEfni hér…"} className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
      )}

      {msg && (
        <div className={`mt-4 rounded-lg border p-3 text-xs ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>
      )}

      {isAdmin && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Save className="w-4 h-4" /> Vista drög
          </button>
          {item.status === "published" ? (
            <button onClick={unpublish} disabled={busy} className="py-2 px-4 rounded-lg border border-amber-300 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">Taka úr birtingu</button>
          ) : (
            <button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">
              <Globe className="w-4 h-4" /> Vista og birta
            </button>
          )}
          <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Eyða
          </button>
        </div>
      )}
    </div>
  );
}
