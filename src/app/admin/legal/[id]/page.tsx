"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Globe, Trash2, History, CheckCircle2, Send, RotateCcw, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { renderMarkdown } from "@/lib/markdown";

interface Doc {
  id: string;
  slug: string;
  title: string;
  category: string;
  language: string;
  body: string;
  version: number;
  status: string;
  published_at: string | null;
  updated_at: string;
  approval_status?: string;
  approved_at?: string | null;
}
interface Version {
  version: number;
  title: string;
  status: string;
  edited_by_name: string | null;
  created_at: string;
}
interface Review {
  action: string;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

const APPROVAL_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Drög", cls: "bg-slate-100 text-slate-600" },
  in_review: { label: "Í yfirlestri", cls: "bg-amber-100 text-amber-700" },
  changes_requested: { label: "Breytinga óskað", cls: "bg-red-100 text-red-700" },
  approved: { label: "Samþykkt", cls: "bg-emerald-100 text-emerald-700" },
};
const REVIEW_ACTION_LABEL: Record<string, string> = {
  submitted: "sendi í yfirlestur",
  approved: "samþykkti",
  changes_requested: "óskaði breytinga",
  reopened: "enduropnaði",
  comment: "athugasemd",
};

const CATEGORY_LABELS: Record<string, string> = {
  privacy: "Persónuvernd",
  terms: "Skilmálar",
  consent: "Samþykki",
  general: "Almennt",
};

export default function LegalEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [doc, setDoc] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string>("member");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("privacy");
  const [language, setLanguage] = useState("is");
  const [bodyText, setBodyText] = useState("");
  const [preview, setPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
      setRole(me?.role || "member");
    }
    const res = await fetch(`/api/admin/legal/documents/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const d = j.document as Doc;
      setDoc(d);
      setTitle(d.title);
      setCategory(d.category);
      setLanguage(d.language);
      setBodyText(d.body || "");
      setVersions(j.versions || []);
      setReviews(j.reviews || []);
    }
    setLoading(false);
  }, [id]);

  const reviewAction = async (action: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/legal/documents/${id}/review`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ action, comment: reviewComment }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return;
    }
    setReviewComment("");
    await load();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const patch = async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/legal/documents/${id}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return false;
    }
    setMsg({ type: "ok", text: okText });
    await load();
    return true;
  };

  const save = () => patch({ title, category, language, body: bodyText }, "Vistað.");
  const publish = () => patch({ title, category, language, body: bodyText, status: "published" }, "Birt.");
  const unpublish = () => patch({ status: "draft" }, "Tekið úr birtingu.");

  const remove = async () => {
    if (!confirm("Eyða þessu skjali varanlega?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/legal/documents/${id}`, { method: "DELETE", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok) router.push("/admin/legal");
    else setMsg({ type: "err", text: j.error || "Villa" });
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;
  if (!doc) return <div className="p-8 text-sm text-slate-500">Skjal fannst ekki.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/admin/legal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Lögfræðiskjöl
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{doc.title}</h1>
          <div className="text-sm text-slate-500 mt-1">
            /{doc.slug} · {CATEGORY_LABELS[doc.category]} · útg. {doc.version} ·{" "}
            {doc.status === "published" ? (
              <span className="text-emerald-700">Birt</span>
            ) : (
              <span className="text-amber-600">Drög</span>
            )}
          </div>
        </div>
        {doc.status === "published" && (
          <a
            href={`/skjol/${doc.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900"
          >
            <Globe className="w-4 h-4" /> Skoða opinbera síðu
          </a>
        )}
      </div>

      {!isAdmin && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Þú hefur lesaðgang. Aðeins stjórnendur geta breytt og birt.
        </div>
      )}

      {/* Approval */}
      {(() => {
        const approval = doc.approval_status || "draft";
        const meta = APPROVAL_META[approval] || APPROVAL_META.draft;
        const canApprove = role === "admin" || role === "lawyer";
        return (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {approval === "approved" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                <span className="text-sm font-semibold text-slate-900">Samþykki</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                {doc.approved_at && approval === "approved" && (
                  <span className="text-xs text-slate-400">· {new Date(doc.approved_at).toLocaleDateString("is-IS")}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canApprove && (approval === "draft" || approval === "changes_requested") && (
                  <button onClick={() => reviewAction("submit")} disabled={busy} className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Senda í yfirlestur
                  </button>
                )}
                {canApprove && approval === "in_review" && (
                  <>
                    <button onClick={() => reviewAction("request_changes")} disabled={busy} className="py-1.5 px-3 rounded-lg border border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                      Óska breytinga
                    </button>
                    <button onClick={() => reviewAction("approve")} disabled={busy} className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Samþykkja
                    </button>
                  </>
                )}
                {canApprove && approval === "approved" && (
                  <button onClick={() => reviewAction("reopen")} disabled={busy} className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <RotateCcw className="w-3.5 h-3.5" /> Enduropna
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Athugasemd (valfrjálst)"
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
              />
              <button
                onClick={() => reviewAction("comment")}
                disabled={busy || !reviewComment.trim()}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" /> Bæta við
              </button>
            </div>

            {reviews.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                {reviews.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{r.reviewer_name || "—"}</span>{" "}
                    {REVIEW_ACTION_LABEL[r.action] || r.action}
                    {r.comment ? `: “${r.comment}”` : ""}
                    <span className="text-slate-400"> · {new Date(r.created_at).toLocaleDateString("is-IS")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      {/* Meta */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isAdmin}
          className="sm:col-span-3 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!isAdmin} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50">
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!isAdmin} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-50">
          <option value="is">Íslenska</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Editor / preview */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efni (markdown)</div>
        <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
          <Eye className="w-3.5 h-3.5" /> {preview ? "Breyta" : "Forskoða"}
        </button>
      </div>
      {preview ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-6 min-h-[300px]">{renderMarkdown(bodyText)}</div>
      ) : (
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          disabled={!isAdmin}
          rows={20}
          placeholder={"# Fyrirsögn\n\nTexti hér. Notaðu **feitletrun**, - lista og [tengla](https://…)."}
          className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
        />
      )}

      {msg && (
        <div className={`mt-4 rounded-lg border p-3 text-xs ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Actions */}
      {isAdmin && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Save className="w-4 h-4" /> Vista drög
          </button>
          {doc.status === "published" ? (
            <button onClick={unpublish} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-amber-300 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
              Taka úr birtingu
            </button>
          ) : (
            <button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">
              <Globe className="w-4 h-4" /> Vista og birta
            </button>
          )}
          <button onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <History className="w-4 h-4" /> Saga ({versions.length})
          </button>
          <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Eyða
          </button>
        </div>
      )}

      {showHistory && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-4 py-2 font-medium">Útg.</th>
                <th className="px-4 py-2 font-medium">Titill</th>
                <th className="px-4 py-2 font-medium">Staða</th>
                <th className="px-4 py-2 font-medium">Breytt af</th>
                <th className="px-4 py-2 font-medium">Dags.</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.version} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-700">{v.version}</td>
                  <td className="px-4 py-2 text-slate-700">{v.title}</td>
                  <td className="px-4 py-2 text-slate-500">{v.status}</td>
                  <td className="px-4 py-2 text-slate-500">{v.edited_by_name || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(v.created_at).toLocaleDateString("is-IS")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
