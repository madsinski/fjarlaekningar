"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Users, Download, Send, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { markdownToEmailHtml, renderFjarlaekningarEmail } from "@/lib/email-render";

// Fréttabréf — subscriber list + campaign composer ("content creator").
//
// Composer mirrors the CMS editor: form on the left, LIVE preview of the real
// branded email on the right (rendered with the same function the send route
// uses, so what you see is what goes out), debounced autosave, test send, then
// a confirmed send to every active subscriber.

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string;
  unsubscribed_at: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  subject: string;
  preheader: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  updated_at: string;
}

type Tab = "subscribers" | "campaigns";
type SaveState = "idle" | "saving" | "saved" | "error";

function fmt(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("is-IS", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

export default function OutreachPage() {
  const [tab, setTab] = useState<Tab>("subscribers");
  const [isAdmin, setIsAdmin] = useState(false);
  const [myEmail, setMyEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [query, setQuery] = useState("");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipSave = useRef(true);

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
      const { data: me } = await supabase
        .from("staff")
        .select("role, email")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin(me?.role === "admin");
      setMyEmail(me?.email ?? "");
    }
    const h = await authHeaders();
    const [s, c] = await Promise.all([
      fetch("/api/admin/outreach/subscribers", { headers: h }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/outreach/campaigns", { headers: h }).then((r) => r.json()).catch(() => ({})),
    ]);
    if (s?.ok) setSubs(s.subscribers ?? []);
    if (c?.ok) setCampaigns(c.campaigns ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Debounced autosave of the open draft (admin only, never once sent).
  useEffect(() => {
    if (!openId || !isAdmin || locked) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/outreach/campaigns/${openId}`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ subject, preheader, body }),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [subject, preheader, body, openId, isAdmin, locked]);

  const openCampaign = async (id: string) => {
    setMsg(null);
    setConfirmSend(false);
    const res = await fetch(`/api/admin/outreach/campaigns/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) return;
    skipSave.current = true;
    setOpenId(id);
    setSubject(j.campaign.subject ?? "");
    setPreheader(j.campaign.preheader ?? "");
    setBody(j.campaign.body ?? "");
    setLocked(j.campaign.status === "sent");
    setSaveState("idle");
  };

  const createCampaign = async () => {
    setBusy(true);
    const res = await fetch("/api/admin/outreach/campaigns", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({}),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j?.ok) {
      await load();
      openCampaign(j.campaign.id);
    }
  };

  const removeCampaign = async (id: string) => {
    if (!confirm("Eyða þessari herferð?")) return;
    await fetch(`/api/admin/outreach/campaigns/${id}`, { method: "DELETE", headers: await authHeaders() });
    if (openId === id) setOpenId(null);
    load();
  };

  const send = async (test: boolean) => {
    if (!openId) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/outreach/campaigns/${openId}/send`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ test }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirmSend(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Sending mistókst." });
      return;
    }
    if (test) {
      setMsg({ type: "ok", text: `Prófpóstur sendur á ${j.to}.` });
    } else {
      const failed = j.failures?.length ?? 0;
      setMsg({
        type: "ok",
        text: `Sent á ${j.sent} af ${j.total} áskrifendum${failed ? ` · ${failed} mistókust` : ""}.`,
      });
      setLocked(true);
      load();
    }
  };

  const activeCount = subs.filter((s) => !s.unsubscribed_at).length;

  const filteredSubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) => s.email.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q),
    );
  }, [subs, query]);

  const exportCsv = () => {
    const rows = [
      ["email", "name", "source", "status", "created_at"],
      ...filteredSubs.map((s) => [
        s.email,
        s.name ?? "",
        s.source,
        s.unsubscribed_at ? "unsubscribed" : "active",
        s.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `askrifendur-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Same renderer the send route uses — the preview is the real email.
  const previewHtml = useMemo(
    () =>
      renderFjarlaekningarEmail({
        heading: subject || "Efnislína",
        bodyHtml: markdownToEmailHtml(body),
        preheader,
        unsubscribeUrl: "#",
      }),
    [subject, preheader, body],
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Fréttabréf</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">
        Áskrifendur sem skráðu sig á vefnum, og fréttabréf send í útliti Fjarlækninga.
      </p>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {([
          ["subscribers", `Áskrifendur (${activeCount})`],
          ["campaigns", "Herferðir"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === key
                ? "border-cyan-600 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">Hleð…</p>}

      {/* ── Áskrifendur ─────────────────────────────────────────────────── */}
      {!loading && tab === "subscribers" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <Users className="w-4 h-4 text-cyan-600" />
              <span className="font-semibold text-slate-900">{activeCount}</span>
              <span className="text-slate-500">virkir</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{subs.length - activeCount} afskráðir</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Leita…"
              className="flex-1 min-w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200"
            />
            <button
              onClick={exportCsv}
              disabled={filteredSubs.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {filteredSubs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <Mail className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                Enginn áskrifandi enn.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-3 font-medium">Netfang</th>
                    <th className="px-4 py-3 font-medium">Nafn</th>
                    <th className="px-4 py-3 font-medium">Skráð</th>
                    <th className="px-4 py-3 font-medium">Staða</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-900">{s.email}</td>
                      <td className="px-4 py-3 text-slate-600">{s.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{fmt(s.created_at)}</td>
                      <td className="px-4 py-3">
                        {s.unsubscribed_at ? (
                          <span className="text-xs text-slate-400">Afskráð</span>
                        ) : (
                          <span className="text-xs text-emerald-700">Virkur</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Herferðir ───────────────────────────────────────────────────── */}
      {!loading && tab === "campaigns" && (
        <>
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-slate-600">
              {campaigns.length} herferð{campaigns.length === 1 ? "" : "ir"}
            </p>
            {isAdmin && (
              <button
                onClick={createCampaign}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Nýtt fréttabréf
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 mb-8">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Engin herferð enn.</div>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 p-4">
                  <button onClick={() => openCampaign(c.id)} className="min-w-0 text-left">
                    <div className="font-medium text-slate-900 truncate">{c.subject}</div>
                    <div className="text-xs text-slate-500">
                      {c.status === "sent"
                        ? `Sent ${fmt(c.sent_at)} · ${c.sent_count} viðtakendur`
                        : `Drög · uppfært ${fmt(c.updated_at)}`}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    {c.status === "sent" ? (
                      <span className="text-xs font-medium text-emerald-700">Sent</span>
                    ) : (
                      <span className="text-xs text-amber-600">Drög</span>
                    )}
                    {isAdmin && c.status !== "sent" && (
                      <button
                        onClick={() => removeCampaign(c.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Eyða"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          {openId && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="font-semibold text-slate-900">
                  {locked ? "Sent fréttabréf (læst)" : "Semja fréttabréf"}
                </h2>
                {!locked && isAdmin && (
                  <span className="text-xs text-slate-500">
                    {saveState === "saving" ? "Vista…" : saveState === "saved" ? "Vistað ✓" : saveState === "error" ? "Villa við vistun" : ""}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="space-y-3">
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={locked || !isAdmin}
                    placeholder="Efnislína"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-50"
                  />
                  <input
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    disabled={locked || !isAdmin}
                    placeholder="Forskoðunartexti (sést við hliðina á efnislínu í pósthólfinu)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-50"
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={locked || !isAdmin}
                    rows={16}
                    placeholder={"# Fyrirsögn\n\nTexti…\n\n- Punktur\n- Annar punktur\n\n[Tengill](https://www.fjarlaekningar.is)"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500">
                    Markdown: # fyrirsagnir, **feitletrað**, - listar, [tenglar](slóð).
                  </p>

                  {msg && (
                    <div
                      className={`rounded-lg border p-3 text-xs ${
                        msg.type === "ok"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {isAdmin && !locked && (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => send(true)}
                        disabled={busy || !subject.trim()}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4" /> Senda próf á mig
                      </button>

                      {!confirmSend ? (
                        <button
                          onClick={() => setConfirmSend(true)}
                          disabled={busy || !subject.trim() || activeCount === 0}
                          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" /> Senda á alla ({activeCount})
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                          <span className="text-xs text-amber-900">
                            Senda á {activeCount} áskrifendur? Þetta er ekki hægt að afturkalla.
                          </span>
                          <button
                            onClick={() => send(false)}
                            disabled={busy}
                            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                          >
                            {busy ? "Sendi…" : "Já, senda"}
                          </button>
                          <button
                            onClick={() => setConfirmSend(false)}
                            className="text-xs text-slate-600 hover:text-slate-900"
                          >
                            Hætta við
                          </button>
                        </div>
                      )}
                      {myEmail && <span className="text-[11px] text-slate-400">Próf fer á {myEmail}</span>}
                    </div>
                  )}

                  {locked && (
                    <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Þessi herferð hefur verið send og er læst.
                    </p>
                  )}
                </div>

                {/* Live preview of the real branded email */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Forskoðun
                  </div>
                  <iframe
                    title="Forskoðun fréttabréfs"
                    srcDoc={previewHtml}
                    className="w-full h-[560px] rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
