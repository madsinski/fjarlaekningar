"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { QUESTION_TYPE_LABELS, type SurveyQuestion, type SurveyQuestionType } from "@/lib/survey-types";

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  status: string;
}
interface ResponseRow {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
}

function newQuestion(): SurveyQuestion {
  return { id: crypto.randomUUID(), label: "", type: "text", required: false };
}

export default function SurveyEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"build" | "responses">("build");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
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
    const res = await fetch(`/api/admin/surveys/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const s = j.survey as Survey;
      setSurvey(s);
      setTitle(s.title);
      setDescription(s.description || "");
      setQuestions(Array.isArray(s.questions) ? s.questions : []);
      setResponses(j.responses || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const updateQ = (idx: number, patch: Partial<SurveyQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  const moveQ = (idx: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const j = idx + dir;
      if (j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
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

  const save = () => patch({ title, description, questions }, "Vistað.");
  const publish = () => patch({ title, description, questions, status: "published" }, "Birt.");
  const unpublish = () => patch({ status: "draft" }, "Tekið úr birtingu.");

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

  return (
    <div className="p-8 max-w-4xl">
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
        {survey.status === "published" && (
          <a href={`/kannanir/${survey.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900">
            <Globe className="w-4 h-4" /> Opna könnun
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {(["build", "responses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "build" ? "Uppbygging" : `Svör (${responses.length})`}
          </button>
        ))}
      </div>

      {tab === "build" ? (
        <div className="mt-6">
          {!isAdmin && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">Þú hefur lesaðgang.</div>}
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isAdmin} placeholder="Titill" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isAdmin} rows={2} placeholder="Lýsing (valfrjálst)" className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />

          <div className="mt-6 space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <input value={q.label} onChange={(e) => updateQ(idx, { label: e.target.value })} disabled={!isAdmin} placeholder={`Spurning ${idx + 1}`} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50" />
                    <div className="flex flex-wrap items-center gap-3">
                      <select value={q.type} onChange={(e) => updateQ(idx, { type: e.target.value as SurveyQuestionType })} disabled={!isAdmin} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50">
                        {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={!!q.required} onChange={(e) => updateQ(idx, { required: e.target.checked })} disabled={!isAdmin} className="accent-cyan-600" /> Skylda
                      </label>
                    </div>
                    {q.type === "single_choice" && (
                      <input
                        value={(q.options || []).join(", ")}
                        onChange={(e) => updateQ(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        disabled={!isAdmin}
                        placeholder="Valkostir, aðgreindir með kommu"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
                      />
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
            ))}
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
      ) : (
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
                        <dd className="text-slate-900">{String(val)}</dd>
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
