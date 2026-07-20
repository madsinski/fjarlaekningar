"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Globe2, Languages, Send, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import HomeView from "@/app/(site)/HomeView";
import ThjonustaView from "@/app/(site)/thjonusta/ThjonustaView";
import UmOkkurView from "@/app/(site)/um-okkur/UmOkkurView";
import HafaSambandView from "@/app/(site)/hafa-samband/HafaSambandView";
import Navbar from "@/app/components/Navbar";
import { getSitePage, resolveContent } from "@/lib/site-content/registry";
import type { Locale, LocaleContent, SiteContentBlob } from "@/lib/site-content/types";
import IconPicker from "../IconPicker";

type SaveState = "idle" | "saving" | "saved" | "error";

// Preview renderer per page key. "chrome" previews the live header (the footer
// is server-rendered — it reads published legal docs — so it isn't previewed here).
function Preview({ pageKey, c }: { pageKey: string; c: LocaleContent }) {
  switch (pageKey) {
    case "home":
      return <HomeView c={c} />;
    case "thjonusta":
      return <ThjonustaView c={c} />;
    case "um-okkur":
      return <UmOkkurView c={c} />;
    case "hafa-samband":
      return <HafaSambandView c={c} />;
    case "chrome":
      return (
        <div>
          <Navbar content={c} />
          <div className="p-8 text-sm text-slate-500">
            Hausinn að ofan uppfærist um leið og þú skrifar. Fótinn þarf að birta til að sjá hann á
            vefnum (hann sækir birt lögfræðiskjöl á þjóninum).
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function SiteContentEditor() {
  const params = useParams<{ page: string }>();
  const pageKey = params?.page ?? "home";
  const page = getSitePage(pageKey);

  const [draft, setDraft] = useState<SiteContentBlob>({ is: {}, en: {} });
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<Locale>("is");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipSave = useRef(true);

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
    const res = await fetch(`/api/admin/site-content/${pageKey}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const d = (j.content?.draft as SiteContentBlob) ?? {};
      setDraft({ is: d.is ?? {}, en: d.en ?? {} });
      setPublishedAt(j.content?.published_at ?? null);
    } else {
      setDraft({ is: {}, en: {} });
      setPublishedAt(null);
    }
    skipSave.current = true;
    setLoading(false);
  }, [pageKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Debounced autosave of the draft (admin only).
  useEffect(() => {
    if (loading || !isAdmin) return;
    if (skipSave.current) { skipSave.current = false; return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/site-content/${pageKey}`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ draft }),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [draft, loading, isAdmin, pageKey]);

  const setField = (locale: Locale, key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [locale]: { ...(prev[locale] ?? {}), [key]: value } }));
  };

  const groups = useMemo(() => {
    if (!page) return [];
    const seen: string[] = [];
    for (const f of page.fields) if (!seen.includes(f.group)) seen.push(f.group);
    return seen.map((g) => ({ group: g, fields: page.fields.filter((f) => f.group === g) }));
  }, [page]);

  const previewContent = useMemo(
    () => resolveContent(pageKey, draft, previewLocale),
    [pageKey, draft, previewLocale],
  );

  const publish = async () => {
    setBusy("publish");
    setMsg(null);
    const res = await fetch(`/api/admin/site-content/${pageKey}/publish`, {
      method: "POST",
      headers: await authHeaders(),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && j.ok) {
      setPublishedAt(j.published_at);
      setMsg({ type: "ok", text: "Birt! Breytingar eru nú í loftinu." });
    } else setMsg({ type: "err", text: j.error || "Ekki tókst að birta." });
  };

  const translate = async (from: Locale, to: Locale) => {
    setBusy(`tr-${to}`);
    setMsg(null);
    const res = await fetch(`/api/admin/site-content/${pageKey}/translate`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ from, to }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && j.ok) {
      skipSave.current = true; // server already saved
      setDraft({ is: j.draft.is ?? {}, en: j.draft.en ?? {} });
      setMsg({ type: "ok", text: `Þýddi ${j.count} reiti → ${to === "en" ? "ensku" : "íslensku"}.` });
    } else {
      setMsg({ type: "err", text: j.error || "Þýðing mistókst." });
    }
  };

  if (!page) {
    return (
      <div className="p-8">
        <Link href="/admin/website" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Vefsíða
        </Link>
        <p className="text-sm text-slate-500">Þessi síða fannst ekki í efnisskránni.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <Link href="/admin/website" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft className="w-4 h-4" /> Vefsíða
      </Link>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{page.label}</h1>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {saveState === "saving" && <span>Vistar…</span>}
            {saveState === "saved" && (
              <span className="text-emerald-600 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Vistað (drög)
              </span>
            )}
            {saveState === "error" && <span className="text-red-600">Vistun mistókst</span>}
            {publishedAt && <span>· Síðast birt {new Date(publishedAt).toLocaleString("is-IS")}</span>}
            {page.path && (
              <a
                href={page.path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900"
              >
                <ExternalLink className="w-3 h-3" /> Skoða síðuna
              </a>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => translate("is", "en")} disabled={!!busy} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Languages className="w-4 h-4" /> {busy === "tr-en" ? "Þýði…" : "Þýða → enska"}
            </button>
            <button onClick={() => translate("en", "is")} disabled={!!busy} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Languages className="w-4 h-4" /> {busy === "tr-is" ? "Þýði…" : "Þýða → íslenska"}
            </button>
            <button onClick={publish} disabled={!!busy} className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">
              <Send className="w-4 h-4" /> {busy === "publish" ? "Birti…" : "Birta"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border p-3 text-xs ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
      {!isAdmin && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Þú hefur lesaðgang. Aðeins stjórnendur geta breytt og birt.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fields */}
        <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
          {groups.map((g) => (
            <section key={g.group} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-700 mb-3">{g.group}</h2>
              <div className="space-y-4">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <div className="text-xs font-medium text-slate-600 mb-1">
                      {f.label}
                      {f.type === "heading" && (
                        <span className="ml-2 font-normal text-slate-400">
                          Notaðu ==orð== til að lita orð blátt
                        </span>
                      )}
                    </div>

                    {f.type === "icon" ? (
                      // Icons aren't translated — one value for both locales.
                      <IconPicker
                        value={draft.is?.[f.key] ?? ""}
                        onChange={(v) => setField("is", f.key, v)}
                        disabled={!isAdmin}
                        fallback={page.defaultsIs[f.key] ?? ""}
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["is", "en"] as Locale[]).map((loc) => {
                          const val = draft[loc]?.[f.key] ?? "";
                          const placeholder = loc === "is" ? page.defaultsIs[f.key] : "(þýðing)";
                          return (
                            <label key={loc} className="block">
                              <span className="text-[10px] uppercase tracking-wide text-slate-400">{loc}</span>
                              {f.type === "textarea" ? (
                                <textarea
                                  value={val}
                                  onChange={(e) => setField(loc, f.key, e.target.value)}
                                  disabled={!isAdmin}
                                  rows={3}
                                  placeholder={placeholder}
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
                                />
                              ) : (
                                <input
                                  value={val}
                                  onChange={(e) => setField(loc, f.key, e.target.value)}
                                  disabled={!isAdmin}
                                  placeholder={placeholder}
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="text-xs text-slate-400">
            Íslenskur reitur sem er tómur notar sjálfgefna textann. Enskur reitur sem er tómur sýnir íslenska textann á
            ensku síðunni þangað til hann er þýddur.
          </p>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Forskoðun (drög)
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              {(["is", "en"] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setPreviewLocale(loc)}
                  className={`px-2.5 py-1 inline-flex items-center gap-1 ${previewLocale === loc ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  <Globe2 className="w-3 h-3" /> {loc.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
            <div className="overflow-auto h-full">
              <div style={{ width: "200%", transform: "scale(0.5)", transformOrigin: "top left" }}>
                <Preview pageKey={pageKey} c={previewContent} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
