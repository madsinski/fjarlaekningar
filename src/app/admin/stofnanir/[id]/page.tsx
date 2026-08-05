"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Globe, Copy, Check, Plus, Trash2, ChevronUp, ChevronDown, Upload, Code } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PartnerSection, { buildPartnerHtml, type PartnerPageData } from "@/app/components/PartnerSection";

interface PartnerRow extends PartnerPageData {
  id: string;
  status: string;
}

const FIELD = (label: string, node: React.ReactNode) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
    {node}
  </label>
);

export default function StofnunEditor() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PartnerRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const res = await fetch(`/api/admin/stofnanir/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setP({ ...j.partner, erindi: Array.isArray(j.partner.erindi) ? j.partner.erindi : [] });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof PartnerRow>(k: K, v: PartnerRow[K]) => setP((prev) => (prev ? { ...prev, [k]: v } : prev));

  const setErindi = (fn: (a: string[]) => string[]) => setP((prev) => (prev ? { ...prev, erindi: fn(prev.erindi) } : prev));
  const moveErindi = (i: number, dir: -1 | 1) =>
    setErindi((a) => {
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      const c = [...a];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const patch = async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/stofnanir/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return;
    }
    setMsg({ type: "ok", text: okText });
    if (j.partner) setP({ ...j.partner, erindi: Array.isArray(j.partner.erindi) ? j.partner.erindi : [] });
  };

  const payload = () => {
    if (!p) return {};
    const { id: _id, status: _s, created_at: _c, updated_at: _u, ...rest } = p as PartnerRow & Record<string, unknown>;
    void _id; void _s; void _c; void _u;
    return rest;
  };

  const save = () => patch(payload(), "Vistað.");
  const publish = () => patch({ ...payload(), status: "published" }, "Birt.");
  const unpublish = () => patch({ status: "draft" }, "Tekið úr birtingu.");

  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    setMsg(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `site/stofnun-logo/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("presentation-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("presentation-assets").getPublicUrl(path);
      set("logo_url", data.publicUrl);
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Ekki tókst að hlaða upp merki" });
    } finally {
      setLogoBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/samstarf/${p?.slug ?? ""}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg({ type: "err", text: "Ekki tókst að afrita hlekk" });
    }
  };

  // Inline-styled HTML the institution's developers paste into their island.is page.
  const copyHtml = async () => {
    if (!p) return;
    try {
      await navigator.clipboard.writeText(buildPartnerHtml(p));
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      setMsg({ type: "err", text: "Ekki tókst að afrita HTML" });
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;
  if (!p) return <div className="p-8 text-sm text-slate-500">Fannst ekki.</div>;

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-50";
  const ro = !isAdmin;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <Link href="/admin/stofnanir" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Til baka
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{p.name || "Stofnun"}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Afritað!" : "Afrita hlekk"}
          </button>
          <button onClick={copyHtml} title="Afrita HTML-kóða til að líma inn á island.is" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {copiedHtml ? <Check className="w-4 h-4 text-emerald-600" /> : <Code className="w-4 h-4" />}
            {copiedHtml ? "Afritað!" : "Afrita HTML"}
          </button>
          {p.status === "published" && (
            <a href={`/samstarf/${p.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Globe className="w-4 h-4" /> Opna
            </a>
          )}
          {isAdmin && (
            <>
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <Save className="w-4 h-4" /> Vista
              </button>
              {p.status === "published" ? (
                <button onClick={unpublish} disabled={busy} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                  Taka úr birtingu
                </button>
              ) : (
                <button onClick={publish} disabled={busy} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
                  Birta
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Form ── */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELD("Nafn stofnunar", <input value={p.name} onChange={(e) => set("name", e.target.value)} disabled={ro} className={inputCls} />)}
            {FIELD("Stytting (t.d. HSU)", <input value={p.short_name ?? ""} onChange={(e) => set("short_name", e.target.value)} disabled={ro} className={inputCls} />)}
          </div>
          {FIELD("Slóð (/samstarf/…)", <input value={p.slug} onChange={(e) => set("slug", e.target.value)} disabled={ro} className={inputCls} />)}

          {FIELD("Merki stofnunar", (
            <div className="flex items-center gap-3">
              {p.logo_url && <img src={p.logo_url} alt="" className="h-9 w-auto rounded border border-slate-200 bg-white p-1" />}
              <input value={p.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} disabled={ro} placeholder="/hsu-logo.webp eða slóð" className={inputCls} />
              {isAdmin && (
                <label className="inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Upload className="w-4 h-4" /> {logoBusy ? "Hleð…" : "Hlaða"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </label>
              )}
            </div>
          ))}

          {FIELD("Yfirtexti (eyebrow)", <input value={p.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} disabled={ro} className={inputCls} />)}
          {FIELD("Fyrirsögn", <input value={p.title} onChange={(e) => set("title", e.target.value)} disabled={ro} className={inputCls} />)}
          {FIELD("Inngangur", <textarea value={p.intro} onChange={(e) => set("intro", e.target.value)} disabled={ro} rows={4} className={inputCls} />)}

          <div className="grid grid-cols-2 gap-3">
            {FIELD("Svæði / staðsetning", <input value={p.region} onChange={(e) => set("region", e.target.value)} disabled={ro} className={inputCls} />)}
            {FIELD("Merki-borði (pilot)", <input value={p.pilot_tag} onChange={(e) => set("pilot_tag", e.target.value)} disabled={ro} className={inputCls} />)}
            {FIELD("Svartími", <input value={p.response_time} onChange={(e) => set("response_time", e.target.value)} disabled={ro} className={inputCls} />)}
            {FIELD("Opnunartími", <input value={p.hours} onChange={(e) => set("hours", e.target.value)} disabled={ro} className={inputCls} />)}
          </div>

          {FIELD("Hlekkur á þjónustuna (sjúklingagátt)", <input value={p.service_url} onChange={(e) => set("service_url", e.target.value)} disabled={ro} placeholder="https://app.medalia.is/fjarlaekningar-…" className={inputCls} />)}
          {FIELD("Hlekkur á nánari upplýsingar", <input value={p.info_url} onChange={(e) => set("info_url", e.target.value)} disabled={ro} className={inputCls} />)}

          {/* Erindi list */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
            <span className="block text-xs font-medium text-slate-500">Dæmi um erindi</span>
            {p.erindi.length === 0 && <p className="text-[11px] text-slate-400">Engin erindi enn.</p>}
            <div className="space-y-1.5">
              {p.erindi.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={e} onChange={(ev) => setErindi((a) => a.map((x, j) => (j === i ? ev.target.value : x)))} disabled={ro} placeholder={`Erindi ${i + 1}`} className={`flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-100`} />
                  {isAdmin && (
                    <div className="flex items-center">
                      <button type="button" onClick={() => moveErindi(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Upp"><ChevronUp className="w-4 h-4" /></button>
                      <button type="button" onClick={() => moveErindi(i, 1)} disabled={i === p.erindi.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Niður"><ChevronDown className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setErindi((a) => a.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-600" title="Eyða"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <button type="button" onClick={() => setErindi((a) => [...a, ""])} className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 hover:text-cyan-800">
                <Plus className="w-3.5 h-3.5" /> Bæta við erindi
              </button>
            )}
          </div>

          {FIELD("Öryggistexti", <textarea value={p.safety_note} onChange={(e) => set("safety_note", e.target.value)} disabled={ro} rows={3} className={inputCls} />)}
        </div>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Forskoðun</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-[80vh] overflow-y-auto">
            <PartnerSection partner={p} />
          </div>
        </div>
      </div>
    </div>
  );
}
