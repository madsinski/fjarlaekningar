"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Globe, Languages, Sparkles, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SurveyFields from "@/app/components/SurveyFields";
import {
  QUESTION_TYPE_LABELS,
  YES_NO_OPTIONS,
  aggregateSurvey,
  scaleBounds,
  type Locale,
  type SurveyAnswerValue,
  type SurveyQuestion,
  type SurveyQuestionType,
} from "@/lib/survey-types";

interface Survey {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  description: string;
  description_en: string | null;
  questions: SurveyQuestion[];
  status: string;
  layout?: string | null;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_mode?: string | null;
}
interface ResponseRow {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
}
interface AiSummary {
  summary_md: string | null;
  themes_jsonb: { title: string; description: string }[];
  praise_jsonb: { title: string; description: string }[];
  concerns_jsonb: { title: string; description: string; severity: string }[];
  action_items_jsonb: { title: string; description: string; priority: string }[];
  responses_count: number;
  generated_at: string;
  model: string | null;
}

function newQuestion(): SurveyQuestion {
  return { id: crypto.randomUUID(), label: "", type: "text", required: false };
}

const NEEDS_OPTIONS: SurveyQuestionType[] = ["single_choice", "multi_choice"];
const IS_SCALE: SurveyQuestionType[] = ["scale", "nps"];

export default function SurveyEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"build" | "analytics" | "responses">("build");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [layout, setLayout] = useState<"list" | "steps">("list");
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandMode, setBrandMode] = useState<"both" | "fjarlaekningar" | "client">("both");
  const [logoBusy, setLogoBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [ai, setAi] = useState<AiSummary | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  // Live preview state (its own answers, independent of real responses).
  const [previewLocale, setPreviewLocale] = useState<Locale>("is");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, SurveyAnswerValue>>({});
  const pvSet = (qid: string, value: SurveyAnswerValue) =>
    setPreviewAnswers((a) => ({ ...a, [qid]: value }));
  const pvToggle = (qid: string, opt: string) =>
    setPreviewAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
      return { ...a, [qid]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });

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
    const res = await fetch(`/api/admin/surveys/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const s = j.survey as Survey;
      setSurvey(s);
      setTitle(s.title);
      setDescription(s.description || "");
      setLayout(s.layout === "steps" ? "steps" : "list");
      setBrandName(s.brand_name || "");
      setBrandLogoUrl(s.brand_logo_url || "");
      setBrandMode(s.brand_mode === "fjarlaekningar" || s.brand_mode === "client" ? s.brand_mode : "both");
      setQuestions(Array.isArray(s.questions) ? s.questions : []);
      setResponses(j.responses || []);
    }
    // Cached AI summary (best-effort).
    const aiRes = await fetch(`/api/admin/surveys/${id}/summary`, { headers: await authHeaders() });
    const aiJson = await aiRes.json().catch(() => ({}));
    if (aiJson.ok && aiJson.summary) setAi(aiJson.summary as AiSummary);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateQ = (idx: number, patch: Partial<SurveyQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const changeType = (idx: number, type: SurveyQuestionType) =>
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== idx) return q;
        const next: SurveyQuestion = { ...q, type };
        if (IS_SCALE.includes(type)) {
          next.min = type === "nps" ? 0 : 1;
          next.max = 5;
        }
        if (NEEDS_OPTIONS.includes(type) && !next.options) next.options = [];
        return next;
      }),
    );

  const moveQ = (idx: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const j = idx + dir;
      if (j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });

  const moveOption = (qIdx: number, optIdx: number, dir: -1 | 1) =>
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx) return q;
        const opts = [...(q.options || [])];
        const j = optIdx + dir;
        if (j < 0 || j >= opts.length) return q;
        [opts[optIdx], opts[j]] = [opts[j], opts[optIdx]];
        return { ...q, options: opts };
      }),
    );

  // Rename an option AND carry the change into any later question whose
  // "Sýna aðeins ef" condition points at this one — so conditions never go stale.
  const renameOption = (qIdx: number, optIdx: number, value: string) =>
    setQuestions((qs) => {
      const controllerId = qs[qIdx]?.id;
      const old = qs[qIdx]?.options?.[optIdx];
      return qs.map((q, i) => {
        if (i === qIdx) return { ...q, options: (q.options || []).map((o, j) => (j === optIdx ? value : o)) };
        if (old !== undefined && old !== value && q.showIf?.questionId === controllerId && q.showIf.equals.includes(old)) {
          return { ...q, showIf: { ...q.showIf, equals: q.showIf.equals.map((x) => (x === old ? value : x)) } };
        }
        return q;
      });
    });

  // Delete an option and drop it from any dependent condition.
  const deleteOption = (qIdx: number, optIdx: number) =>
    setQuestions((qs) => {
      const controllerId = qs[qIdx]?.id;
      const removed = qs[qIdx]?.options?.[optIdx];
      return qs.map((q, i) => {
        if (i === qIdx) return { ...q, options: (q.options || []).filter((_, j) => j !== optIdx) };
        if (removed !== undefined && q.showIf?.questionId === controllerId && q.showIf.equals.includes(removed)) {
          return { ...q, showIf: { ...q.showIf, equals: q.showIf.equals.filter((x) => x !== removed) } };
        }
        return q;
      });
    });

  const patch = async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/surveys/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return;
    }
    setMsg({ type: "ok", text: okText });
    await load();
  };

  const brandPayload = () => ({ brand_name: brandName, brand_logo_url: brandLogoUrl, brand_mode: brandMode });
  // Trim option text and drop blank options for choice questions on save, so an
  // empty "new option" row the editor left behind is never persisted.
  const cleanQuestions = () =>
    questions.map((q) =>
      NEEDS_OPTIONS.includes(q.type)
        ? { ...q, options: (q.options || []).map((o) => o.trim()).filter(Boolean) }
        : q,
    );
  const save = () => patch({ title, description, layout, ...brandPayload(), questions: cleanQuestions() }, "Vistað.");
  const publish = () => patch({ title, description, layout, ...brandPayload(), questions: cleanQuestions(), status: "published" }, "Birt.");

  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    setMsg(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `site/survey-brand/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("presentation-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("presentation-assets").getPublicUrl(path);
      setBrandLogoUrl(data.publicUrl);
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Ekki tókst að hlaða upp merki" });
    } finally {
      setLogoBusy(false);
    }
  };
  const unpublish = () => patch({ status: "draft" }, "Tekið úr birtingu.");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/kannanir/${survey?.slug ?? ""}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg({ type: "err", text: "Ekki tókst að afrita hlekk" });
    }
  };

  const translate = async () => {
    setBusy(true);
    setMsg(null);
    // Save current edits first so the translator sees the latest text.
    await fetch(`/api/admin/surveys/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ title, description, layout, ...brandPayload(), questions: cleanQuestions() }) });
    const res = await fetch(`/api/admin/surveys/${id}/translate`, { method: "POST", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Þýðing mistókst" });
      return;
    }
    setMsg({ type: "ok", text: `Þýddi ${j.translated} atriði á ensku.` });
    await load();
  };

  const regenerateAi = async () => {
    setAiBusy(true);
    setAiErr(null);
    const res = await fetch(`/api/admin/surveys/${id}/summary`, { method: "POST", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    setAiBusy(false);
    if (!res.ok || !j.ok) {
      setAiErr(j.error || "AI greining mistókst");
      return;
    }
    setAi(j.summary as AiSummary);
  };

  const remove = async () => {
    if (!confirm("Eyða þessari könnun og öllum svörum?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/surveys/${id}`, { method: "DELETE", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok) router.push("/admin/surveys");
    else setMsg({ type: "err", text: j.error || "Villa" });
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;
  if (!survey) return <div className="p-8 text-sm text-slate-500">Könnun fannst ekki.</div>;

  const labelFor = (qid: string) => questions.find((q) => q.id === qid)?.label || qid;
  const controllerOptions = (q: SurveyQuestion) =>
    q.type === "yes_no" ? [...YES_NO_OPTIONS] : q.options || [];

  return (
    <div className="p-8 max-w-6xl">
      <Link href="/admin/surveys" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Kannanir
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{survey.title}</h1>
          <div className="text-sm text-slate-500 mt-1">
            /{survey.slug} · {survey.status === "published" ? <span className="text-emerald-700">Birt</span> : <span className="text-amber-600">Drög</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Afritað!" : "Afrita hlekk"}
          </button>
          {survey.status === "published" && (
            <a href={`/kannanir/${survey.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-cyan-700 hover:text-cyan-900 border border-cyan-200 rounded-lg px-3 py-1.5">
              <Globe className="w-4 h-4" /> Opna könnun
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {([
          ["build", "Uppbygging"],
          ["analytics", "Greining"],
          ["responses", `Svör (${responses.length})`],
        ] as const).map(([t, lbl]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {tab === "build" && (
        <div className="mt-6 grid lg:grid-cols-2 gap-8 items-start">
          <div>
          {!isAdmin && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">Þú hefur lesaðgang.</div>}
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isAdmin} placeholder="Titill" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isAdmin} rows={2} placeholder="Inngangstexti (valfrjálst)" className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
          {survey.title_en && <p className="mt-1 text-[11px] text-slate-400">EN: {survey.title_en}</p>}

          {/* Institution branding — logo + name shown in the survey header */}
          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <label className="block text-xs font-medium text-slate-500 mb-2">Stofnun (könnun fyrir)</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} disabled={!isAdmin} placeholder="Nafn stofnunar (t.d. Heilbrigðisstofnun Suðurlands)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
            <div className="mt-2 flex items-center gap-3">
              <div className="h-12 w-20 shrink-0 rounded border border-slate-200 bg-white grid place-items-center overflow-hidden">
                {brandLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandLogoUrl} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400">Ekkert merki</span>
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <label className={`rounded-md px-3 py-1.5 text-xs font-medium ${logoBusy ? "bg-slate-100 text-slate-400" : "bg-cyan-600 text-white hover:bg-cyan-700 cursor-pointer"}`}>
                    {logoBusy ? "Hleð upp…" : "Hlaða upp merki"}
                    <input type="file" accept="image/*" className="hidden" disabled={logoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                  </label>
                  {brandLogoUrl && <button type="button" onClick={() => setBrandLogoUrl("")} className="rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100">Fjarlægja</button>}
                </div>
              )}
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Merki í haus</label>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                {([["both", "Bæði"], ["fjarlaekningar", "Fjarlækningar"], ["client", "Stofnun"]] as const).map(([v, l]) => (
                  <button key={v} type="button" disabled={!isAdmin} onClick={() => setBrandMode(v)} className={`px-2.5 py-1.5 ${brandMode === v ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-50"} disabled:opacity-60`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Display layout */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Framsetning</label>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {([["list", "Listi"], ["steps", "Ein spurning í einu"]] as const).map(([v, l]) => (
                <button key={v} type="button" disabled={!isAdmin} onClick={() => setLayout(v)} className={`px-3 py-1.5 ${layout === v ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-50"} disabled:opacity-60`}>{l}</button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {questions.map((q, idx) => {
              const priorControllers = questions
                .slice(0, idx)
                .filter((p) => p.type === "single_choice" || p.type === "yes_no");
              const bounds = IS_SCALE.includes(q.type) ? scaleBounds(q) : null;
              return (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <input value={q.label} onChange={(e) => updateQ(idx, { label: e.target.value })} disabled={!isAdmin} placeholder={`Spurning ${idx + 1}`} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
                      {q.labelEn && <p className="text-[11px] text-slate-400">EN: {q.labelEn}</p>}

                      <input value={q.helper || ""} onChange={(e) => updateQ(idx, { helper: e.target.value })} disabled={!isAdmin} placeholder="Hjálpartexti (valfrjálst)" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />

                      <div className="flex flex-wrap items-center gap-3">
                        <select value={q.type} onChange={(e) => changeType(idx, e.target.value as SurveyQuestionType)} disabled={!isAdmin} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50">
                          {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <input type="checkbox" checked={!!q.required} onChange={(e) => updateQ(idx, { required: e.target.checked })} disabled={!isAdmin} className="accent-cyan-600" /> Skylda
                        </label>
                      </div>

                      {NEEDS_OPTIONS.includes(q.type) && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-2">
                          <label className="block text-[11px] font-medium text-slate-500">Valkostir</label>
                          {(q.options || []).length === 0 && (
                            <p className="text-[11px] text-slate-400">Engir valkostir enn — bættu við fyrsta valkosti.</p>
                          )}
                          <div className="space-y-1.5">
                            {(q.options || []).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <span className="w-5 text-right text-[11px] text-slate-400 tabular-nums">{oi + 1}.</span>
                                <input
                                  value={opt}
                                  onChange={(e) => renameOption(idx, oi, e.target.value)}
                                  disabled={!isAdmin}
                                  placeholder={`Valkostur ${oi + 1}`}
                                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-100"
                                />
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => moveOption(idx, oi, -1)}
                                    disabled={!isAdmin || oi === 0}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                    title="Færa upp"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveOption(idx, oi, 1)}
                                    disabled={!isAdmin || oi === (q.options || []).length - 1}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                    title="Færa niður"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => deleteOption(idx, oi)}
                                      className="p-1 text-slate-400 hover:text-red-600"
                                      title="Eyða valkosti"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => updateQ(idx, { options: [...(q.options || []), ""] })}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                            >
                              <Plus className="w-3.5 h-3.5" /> Bæta við valkosti
                            </button>
                          )}
                        </div>
                      )}

                      {bounds && (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-slate-500">Lágmark
                            <input type="number" value={bounds.min} onChange={(e) => updateQ(idx, { min: Number(e.target.value) })} disabled={!isAdmin} className="mt-0.5 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
                          </label>
                          <label className="text-xs text-slate-500">Hámark
                            <input type="number" value={bounds.max} onChange={(e) => updateQ(idx, { max: Number(e.target.value) })} disabled={!isAdmin} className="mt-0.5 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
                          </label>
                          <label className="text-xs text-slate-500">Texti við lágmark
                            <input value={q.minLabel || ""} onChange={(e) => updateQ(idx, { minLabel: e.target.value })} disabled={!isAdmin} placeholder="t.d. Mjög óánægð(ur)" className="mt-0.5 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
                          </label>
                          <label className="text-xs text-slate-500">Texti við hámark
                            <input value={q.maxLabel || ""} onChange={(e) => updateQ(idx, { maxLabel: e.target.value })} disabled={!isAdmin} placeholder="t.d. Mjög ánægð(ur)" className="mt-0.5 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
                          </label>
                        </div>
                      )}

                      {/* Conditional visibility */}
                      {priorControllers.length > 0 && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 space-y-2">
                          <label className="block text-[11px] font-medium text-slate-500">Sýna aðeins ef</label>
                          <select
                            value={q.showIf?.questionId || ""}
                            onChange={(e) =>
                              updateQ(idx, e.target.value ? { showIf: { questionId: e.target.value, equals: [] } } : { showIf: undefined })
                            }
                            disabled={!isAdmin}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50"
                          >
                            <option value="">Engin skilyrði (alltaf sýnd)</option>
                            {priorControllers.map((p) => (
                              <option key={p.id} value={p.id}>{p.label || p.id}</option>
                            ))}
                          </select>
                          {q.showIf?.questionId && (
                            <div className="flex flex-wrap gap-2">
                              {controllerOptions(questions.find((p) => p.id === q.showIf!.questionId)!).map((opt) => {
                                const on = q.showIf!.equals.includes(opt);
                                return (
                                  <label key={opt} className="inline-flex items-center gap-1 text-xs text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      disabled={!isAdmin}
                                      onChange={() =>
                                        updateQ(idx, {
                                          showIf: {
                                            questionId: q.showIf!.questionId,
                                            equals: on ? q.showIf!.equals.filter((x) => x !== opt) : [...q.showIf!.equals, opt],
                                          },
                                        })
                                      }
                                      className="accent-cyan-600"
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveQ(idx, -1)} className="p-1 text-slate-400 hover:text-slate-700"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveQ(idx, 1)} className="p-1 text-slate-400 hover:text-slate-700"><ChevronDown className="w-4 h-4" /></button>
                        <button onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <>
              <button onClick={() => setQuestions((qs) => [...qs, newQuestion()])} className="mt-4 inline-flex items-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50">
                <Plus className="w-4 h-4" /> Bæta við spurningu
              </button>

              {msg && <div className={`mt-4 rounded-lg border p-3 text-xs ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  <Save className="w-4 h-4" /> Vista drög
                </button>
                <button onClick={translate} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" title="Vistar og þýðir yfir á ensku með gervigreind">
                  <Languages className="w-4 h-4" /> Þýða → EN
                </button>
                {survey.status === "published" ? (
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
            </>
          )}
          </div>

          {/* Right: sticky live preview — brand + layout update as you edit */}
          <div className="lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Forskoðun</h2>
              {(survey.title_en || questions.some((q) => q.labelEn)) && (
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                  {(["is", "en"] as Locale[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPreviewLocale(l)}
                      className={`px-3 py-1.5 ${previewLocale === l ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {l === "is" ? "IS" : "EN"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-b from-brand-cyan-subtle to-[var(--background)] px-5 py-6 border-b border-slate-200">
                {(() => {
                  const fjar = (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/fjarlaekningar-logo.svg" alt="Fjarlækningar" className="h-11 w-auto object-contain" />
                  );
                  const client =
                    brandLogoUrl || brandName ? (
                      <div className="flex items-center gap-2.5">
                        {brandLogoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={brandLogoUrl} alt={brandName || ""} className="h-8 w-auto object-contain" />
                        )}
                        {brandName && <span className="text-sm font-semibold text-slate-800 leading-tight max-w-[12rem]">{brandName}</span>}
                      </div>
                    ) : null;
                  const sf = brandMode !== "client";
                  const sc = brandMode !== "fjarlaekningar" && !!client;
                  return sf && sc ? (
                    <div className="flex items-center justify-between gap-3 mb-4">{fjar}{client}</div>
                  ) : (
                    <div className="flex items-center gap-3 mb-4">{sf ? fjar : client}</div>
                  );
                })()}
                <h3 className="text-xl font-bold text-slate-900">{previewLocale === "en" && survey.title_en ? survey.title_en : title}</h3>
                {(previewLocale === "en" && survey.description_en ? survey.description_en : description) && (
                  <p className="text-slate-600 mt-2 text-sm">{previewLocale === "en" && survey.description_en ? survey.description_en : description}</p>
                )}
              </div>
              <div className={`bg-[var(--background)] p-5 ${layout === "steps" ? "" : "space-y-5"}`}>
                <SurveyFields
                  questions={questions}
                  answers={previewAnswers}
                  onSet={pvSet}
                  onToggleMulti={pvToggle}
                  locale={previewLocale}
                  mode={layout}
                  footer={
                    <button type="button" disabled className="py-2.5 px-6 rounded-lg bg-slate-300 text-white font-semibold text-sm cursor-not-allowed">
                      Senda svar (forskoðun)
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <Analytics
          questions={questions}
          responses={responses}
          isAdmin={isAdmin}
          ai={ai}
          aiBusy={aiBusy}
          aiErr={aiErr}
          onRegenerate={regenerateAi}
        />
      )}

      {tab === "responses" && (
        <div className="mt-6">
          {responses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Engin svör enn.</div>
          ) : (
            <div className="space-y-4">
              {responses.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">{new Date(r.submitted_at).toLocaleString("is-IS")}</div>
                  <dl className="space-y-1.5">
                    {Object.entries(r.answers || {}).map(([qid, val]) => (
                      <div key={qid} className="text-sm">
                        <dt className="text-slate-500">{labelFor(qid)}</dt>
                        <dd className="text-slate-900">{Array.isArray(val) ? val.join(", ") : String(val)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function Bar({ label, count, total, tone = "cyan" }: { label: string; count: number; total: number; tone?: "cyan" | "slate" }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-40 shrink-0 text-slate-600 truncate" title={label}>{label}</div>
      <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
        <div className={`h-full ${tone === "cyan" ? "bg-cyan-500" : "bg-slate-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-16 shrink-0 text-right text-slate-500 tabular-nums">{count} · {pct}%</div>
    </div>
  );
}

function Analytics({
  questions,
  responses,
  isAdmin,
  ai,
  aiBusy,
  aiErr,
  onRegenerate,
}: {
  questions: SurveyQuestion[];
  responses: ResponseRow[];
  isAdmin: boolean;
  ai: AiSummary | null;
  aiBusy: boolean;
  aiErr: string | null;
  onRegenerate: () => void;
}) {
  const { total, perQuestion } = aggregateSurvey(questions, responses);
  const npsStat = perQuestion.find((s) => s.nps)?.nps ?? null;

  if (total === 0) {
    return <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Engin svör enn — greining birtist þegar svör berast.</div>;
  }

  const sevTone: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <div className="mt-6 space-y-8">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-xs text-slate-500 mt-0.5">Svör</div>
        </div>
        {npsStat && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className={`text-2xl font-bold ${npsStat.score >= 50 ? "text-emerald-700" : npsStat.score >= 0 ? "text-amber-600" : "text-red-600"}`}>{npsStat.score}</div>
            <div className="text-xs text-slate-500 mt-0.5">NPS (meðmæli)</div>
          </div>
        )}
      </div>

      {/* AI insight panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="w-4 h-4 text-cyan-600" /> AI samantekt og tillögur</h2>
          {isAdmin && (
            <button onClick={onRegenerate} disabled={aiBusy} className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold disabled:opacity-50">
              <Sparkles className="w-3.5 h-3.5" /> {aiBusy ? "Greini…" : ai ? "Endurkeyra greiningu" : "Búa til AI samantekt"}
            </button>
          )}
        </div>
        {aiErr && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{aiErr}</div>}
        {!ai && !aiErr && <p className="mt-3 text-sm text-slate-500">Engin greining enn. {isAdmin ? "Smelltu á hnappinn til að búa hana til." : ""}</p>}
        {ai && (
          <div className="mt-4 space-y-5">
            {ai.summary_md && <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ai.summary_md}</div>}
            <div className="grid md:grid-cols-2 gap-5">
              {ai.action_items_jsonb?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Aðgerðir</h3>
                  <ul className="space-y-2">
                    {ai.action_items_jsonb.map((a, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                        <div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevTone[a.priority] || sevTone.low}`}>{a.priority}</span><span className="font-medium text-slate-800">{a.title}</span></div>
                        <p className="text-slate-600 text-xs mt-1">{a.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ai.concerns_jsonb?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Áhyggjuefni</h3>
                  <ul className="space-y-2">
                    {ai.concerns_jsonb.map((c, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                        <div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevTone[c.severity] || sevTone.low}`}>{c.severity}</span><span className="font-medium text-slate-800">{c.title}</span></div>
                        <p className="text-slate-600 text-xs mt-1">{c.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {(ai.themes_jsonb?.length > 0 || ai.praise_jsonb?.length > 0) && (
              <div className="grid md:grid-cols-2 gap-5">
                {ai.themes_jsonb?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Helstu þemu</h3>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {ai.themes_jsonb.map((t, i) => (<li key={i}><span className="font-medium">{t.title}:</span> <span className="text-slate-600">{t.description}</span></li>))}
                    </ul>
                  </div>
                )}
                {ai.praise_jsonb?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Hrós</h3>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {ai.praise_jsonb.map((p, i) => (<li key={i}><span className="font-medium">{p.title}:</span> <span className="text-slate-600">{p.description}</span></li>))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-400">Búið til {new Date(ai.generated_at).toLocaleString("is-IS")} · {ai.responses_count} svör{ai.model ? ` · ${ai.model}` : ""}</p>
          </div>
        )}
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-6">
        {perQuestion.map((s) => (
          <div key={s.question.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-800">{s.question.label}</h3>
              <div className="text-xs text-slate-400">
                {s.answered} svör
                {s.mean != null && s.scaleMax != null && (
                  <span className="ml-2 rounded-full bg-cyan-50 text-cyan-700 px-2 py-0.5">meðaltal {s.mean.toFixed(1)} / {s.scaleMax}</span>
                )}
              </div>
            </div>

            {(s.question.type === "text" || s.question.type === "textarea") ? (
              s.texts.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">Engin svör.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 max-h-64 overflow-auto">
                  {s.texts.map((t, i) => (<li key={i} className="text-sm text-slate-700 border-l-2 border-slate-200 pl-3">{t}</li>))}
                </ul>
              )
            ) : (
              <div className="mt-3 space-y-1.5">
                {s.distribution.map((d) => (
                  <Bar key={d.value} label={d.label} count={d.count} total={s.answered} tone={s.question.type === "multi_choice" ? "slate" : "cyan"} />
                ))}
                {s.nps && (
                  <p className="mt-2 text-xs text-slate-500">Meðmælendur {s.nps.promoters} · hlutlausir {s.nps.passives} · letjendur {s.nps.detractors}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
