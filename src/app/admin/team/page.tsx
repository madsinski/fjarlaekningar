"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  active: boolean;
  invited: boolean;
  onboarded_at: string | null;
  created_at: string;
}

// Order matters — the invite dropdown iterates this. Admin + legal first since
// those are the primary access levels.
const ROLE_LABELS: Record<string, string> = {
  admin: "Stjórnandi — fullur aðgangur",
  lawyer: "Lögfræðingur — aðeins lögfræði",
  member: "Starfsmaður",
  doctor: "Læknir",
  nurse: "Hjúkrunarfræðingur",
  psychologist: "Sálfræðingur",
};

export default function TeamPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is shown for manual copy */
    }
  };

  const regenLink = async (email: string) => {
    const res = await fetch("/api/admin/staff/invite-link", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) {
      setInviteLink(j.invite_link);
      copy(j.invite_link);
      setMsg({ type: "ok", text: `Boðshlekkur fyrir ${email} afritaður — sendu hann á viðkomandi.` });
    } else {
      setMsg({ type: "err", text: j.error || "Ekki tókst að búa til hlekk." });
    }
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
    const { data } = await supabase
      .from("staff")
      .select("id, name, email, role, title, active, invited, onboarded_at, created_at")
      .order("created_at", { ascending: true });
    setRows((data as StaffRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional on-mount fetch; load() sets a loading flag then hydrates rows.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/staff/create", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ name, email, role, title, send_invite: true }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Ekki tókst að bjóða starfsmanni." });
      return;
    }
    if (j.invite_link) {
      setInviteLink(j.invite_link);
      copy(j.invite_link);
      setMsg({ type: "ok", text: `${email} stofnaður. Boðshlekkur afritaður — sendu hann á viðkomandi.` });
    } else {
      setMsg({ type: "ok", text: `${email} stofnaður.` });
    }
    setName("");
    setEmail("");
    setTitle("");
    setRole("member");
    load();
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Starfsfólk</h1>
          <p className="text-sm text-slate-600 mt-1 mb-6">Fólk með aðgang að stjórnkerfinu.</p>
        </div>
        <Link
          href="/admin/signatures"
          className="shrink-0 inline-flex items-center gap-2 py-2 px-3 rounded-lg border border-cyan-600 text-cyan-700 hover:bg-cyan-50 text-sm font-semibold"
        >
          <Mail className="w-4 h-4" /> Netfangsundirskriftir
        </Link>
      </div>

      {isAdmin && (
        <form onSubmit={invite} className="rounded-xl border border-slate-200 bg-white p-5 mb-8">
          <div className="font-semibold text-slate-900 text-sm mb-4">Bjóða nýjum starfsmanni</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nafn"
              required
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Netfang"
              required
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titill (valfrjálst)"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none bg-white"
            >
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !name || !email}
              className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Sendi boð…" : "Senda boð"}
            </button>
            {msg && (
              <span className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>
            )}
          </div>

          {inviteLink && (
            <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
              <div className="text-xs font-semibold text-cyan-800 mb-1">
                Boðshlekkur {copied ? "— afritaður ✓" : ""}
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-2 py-1.5 border border-cyan-200 rounded text-xs font-mono bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => copy(inviteLink)}
                  className="py-1.5 px-3 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shrink-0"
                >
                  Afrita
                </button>
              </div>
              <p className="text-[11px] text-cyan-700 mt-1.5">
                Sendu þennan hlekk á starfsmanninn (t.d. í tölvupósti). Hann velur lykilorð, setur upp MFA og klárar nýliðun. Hlekkurinn rennur út eftir um klukkustund.
              </p>
            </div>
          )}
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Hleð…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Ekkert starfsfólk skráð.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Nafn</th>
                <th className="px-4 py-3 font-medium">Hlutverk</th>
                <th className="px-4 py-3 font-medium">Staða</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.email}</div>
                    {r.title && <div className="text-[11px] text-slate-400">{r.title}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[r.role] || r.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {!r.active ? (
                        <span className="text-xs text-slate-400">Óvirkur</span>
                      ) : r.onboarded_at ? (
                        <span className="text-xs text-emerald-700">Virkur</span>
                      ) : (
                        <span className="text-xs text-amber-600">Bíður nýliðunar</span>
                      )}
                      {isAdmin && r.active && !r.onboarded_at && (
                        <button
                          type="button"
                          onClick={() => regenLink(r.email)}
                          className="text-xs text-cyan-700 hover:text-cyan-900 underline"
                        >
                          Afrita boðshlekk
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
