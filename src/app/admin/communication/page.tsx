"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, ChevronDown, ChevronUp, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Msg {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  staff_notes: string | null;
  created_at: string;
}

type Filter = "new" | "handled" | "all";

export default function CommunicationPage() {
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<Filter>("new");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const { data } = await supabase
      .from("contact_messages")
      .select("id, name, email, subject, message, status, staff_notes, created_at")
      .order("created_at", { ascending: false });
    setRows((data as Msg[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const patch = async (id: string, payload: Record<string, unknown>) => {
    setBusy(true);
    const res = await fetch(`/api/admin/communication/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(payload) });
    setBusy(false);
    if (res.ok) load();
  };

  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    handled: rows.filter((r) => r.status === "handled").length,
    all: rows.length,
  };
  const shown = rows.filter((r) => (filter === "all" ? true : r.status === filter));

  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Samskipti</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">Almennar fyrirspurnir sem berast í gegnum eyðublaðið á vefnum.</p>

      <div className="flex gap-2 mb-4">
        {(["new", "handled", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {f === "new" ? "Nýtt" : f === "handled" ? "Afgreitt" : "Allt"} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Hleð…</div>
        ) : shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <Mail className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engar fyrirspurnir.
          </div>
        ) : (
          shown.map((r) => {
            const open = openId === r.id;
            return (
              <div key={r.id}>
                <button onClick={() => setOpenId(open ? null : r.id)} className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {r.subject || "(ekkert efni)"} {r.status === "new" && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-cyan-500 align-middle" />}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{r.name} · {r.email} · {new Date(r.created_at).toLocaleDateString("is-IS")}</div>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{r.message}</p>
                    <a href={`mailto:${r.email}?subject=Re: ${encodeURIComponent(r.subject || "Fyrirspurn")}`} className="text-sm text-cyan-700 hover:text-cyan-900">Svara í tölvupósti →</a>
                    {isAdmin && (
                      <div className="space-y-2">
                        <textarea
                          value={notes[r.id] ?? r.staff_notes ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          placeholder="Athugasemd starfsfólks (valfrjálst)"
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => patch(r.id, { staff_notes: notes[r.id] ?? r.staff_notes ?? "" })} disabled={busy} className="py-1.5 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Vista athugasemd</button>
                          {r.status === "new" ? (
                            <button onClick={() => patch(r.id, { status: "handled", staff_notes: notes[r.id] ?? r.staff_notes ?? "" })} disabled={busy} className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50"><Check className="w-4 h-4" /> Merkja afgreitt</button>
                          ) : (
                            <button onClick={() => patch(r.id, { status: "new" })} disabled={busy} className="py-1.5 px-3 rounded-lg border border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">Opna aftur</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
