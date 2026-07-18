"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Req {
  id: string;
  request_type: string;
  full_name: string;
  email: string;
  details: string;
  status: string;
  staff_notes: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  access: "Aðgangur",
  rectification: "Leiðrétting",
  erasure: "Eyðing",
  restriction: "Takmörkun",
  portability: "Flutningur",
  objection: "Andmæli",
  other: "Annað",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nýtt",
  in_progress: "Í vinnslu",
  completed: "Lokið",
  rejected: "Hafnað",
};
const STATUS_ORDER = ["new", "in_progress", "completed", "rejected"];

const STATUS_STYLE: Record<string, string> = {
  new: "text-cyan-700 bg-cyan-50",
  in_progress: "text-amber-700 bg-amber-50",
  completed: "text-emerald-700 bg-emerald-50",
  rejected: "text-slate-500 bg-slate-100",
};

export default function DataRequestsPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

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
      .from("data_requests")
      .select("id, request_type, full_name, email, details, status, staff_notes, created_at")
      .order("created_at", { ascending: false });
    setRows((data as Req[]) || []);
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
    setBusyId(id);
    const res = await fetch(`/api/admin/data-requests/${id}`, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(payload) });
    setBusyId(null);
    if (res.ok) load();
  };

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = rows.filter((r) => r.status === s).length;
    return acc;
  }, {});
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Persónuverndarbeiðnir</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">Beiðnir einstaklinga um persónuupplýsingar (GDPR).</p>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Allt ({rows.length})
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Hleð…</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engar beiðnir.
          </div>
        ) : (
          visible.map((r) => {
            const open = openId === r.id;
            return (
              <div key={r.id} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => {
                    setOpenId(open ? null : r.id);
                    setNotesDraft((d) => ({ ...d, [r.id]: r.staff_notes || "" }));
                  }}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{r.full_name}</div>
                      <div className="text-xs text-slate-500">{TYPE_LABELS[r.request_type]} · {new Date(r.created_at).toLocaleDateString("is-IS")}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                </button>

                {open && (
                  <div className="px-4 pb-4 pl-11 space-y-3">
                    <div className="text-sm">
                      <span className="text-slate-500">Netfang: </span>
                      <a href={`mailto:${r.email}`} className="text-cyan-700 hover:underline">{r.email}</a>
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{r.details || "— engin lýsing —"}</div>

                    {isAdmin ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">Staða:</label>
                          <select
                            value={r.status}
                            onChange={(e) => patch(r.id, { status: e.target.value })}
                            disabled={busyId === r.id}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Athugasemdir starfsfólks</label>
                          <textarea
                            value={notesDraft[r.id] ?? (r.staff_notes || "")}
                            onChange={(e) => setNotesDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                          />
                          <button
                            onClick={() => patch(r.id, { staff_notes: notesDraft[r.id] ?? "" })}
                            disabled={busyId === r.id}
                            className="mt-2 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold disabled:opacity-50"
                          >
                            {busyId === r.id ? "Vista…" : "Vista athugasemd"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      r.staff_notes && <div className="text-xs text-slate-500">Athugasemd: {r.staff_notes}</div>
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
