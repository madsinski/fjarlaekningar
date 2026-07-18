"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ErrRow {
  id: string;
  message: string;
  stack: string | null;
  source: string;
  url: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
}

export default function ErrorsPage() {
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"new" | "resolved" | "all">("new");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    let query = supabase
      .from("app_errors")
      .select("id, message, stack, source, url, user_agent, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setRows((data as ErrRow[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/errors/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ status }) });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Eyða þessari villu?")) return;
    await fetch(`/api/admin/errors/${id}`, { method: "DELETE", headers: await authHeaders() });
    load();
  };

  const FILTERS: { k: "new" | "resolved" | "all"; label: string }[] = [
    { k: "new", label: "Nýjar" },
    { k: "resolved", label: "Leystar" },
    { k: "all", label: "Allar" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Villuskrá</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">Kerfisvillur (miðlara og vafra) til greiningar.</p>

      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f.k ? "bg-cyan-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Hleð…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engar villur. 🎉
          </div>
        ) : (
          rows.map((r) => {
            const open = !!expanded[r.id];
            return (
              <div key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => setExpanded((e) => ({ ...e, [r.id]: !open }))} className="mt-0.5 text-slate-400 hover:text-slate-600 shrink-0">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 break-words">{r.message}</div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className={`uppercase ${r.source === "server" ? "text-purple-600" : "text-sky-600"}`}>{r.source}</span>
                      {r.url && <span className="truncate">{r.url}</span>}
                      <span>{new Date(r.created_at).toLocaleString("is-IS")}</span>
                      {r.status === "resolved" && <span className="text-emerald-600">leyst</span>}
                    </div>
                    {open && (
                      <div className="mt-3 space-y-2">
                        {r.stack && (
                          <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 whitespace-pre-wrap">{r.stack}</pre>
                        )}
                        {r.user_agent && <div className="text-[11px] text-slate-400 break-words">UA: {r.user_agent}</div>}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      {r.status === "new" ? (
                        <button onClick={() => setStatus(r.id, "resolved")} title="Merkja leyst" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => setStatus(r.id, "new")} title="Opna aftur" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 text-xs px-2">
                          Opna
                        </button>
                      )}
                      <button onClick={() => remove(r.id)} title="Eyða" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
