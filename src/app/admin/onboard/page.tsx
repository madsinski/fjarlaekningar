"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STAFF_AGREEMENTS } from "@/lib/staff-agreements";

// Staff onboarding: accept the required agreements. On success the server
// stamps staff.onboarded_at and the layout lets the user into the admin.

export default function OnboardPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const { data } = await supabase.from("staff").select("name, onboarded_at").eq("id", user.id).maybeSingle();
      if (data?.onboarded_at) {
        router.replace("/admin");
        return;
      }
      setName(data?.name || "");
    })();
  }, [router]);

  const allChecked = STAFF_AGREEMENTS.every((a) => checked[a.key]);

  const submit = async () => {
    if (!allChecked || busy) return;
    setBusy(true);
    setErr(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/staff/me/agreements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
      },
      body: JSON.stringify({ accept: STAFF_AGREEMENTS.map((a) => ({ key: a.key, version: a.version })) }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að vista samþykki.");
      return;
    }
    router.replace("/admin");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">
          Fjarlækningar · Nýliðun
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {name ? `Velkomin/n, ${name.split(" ")[0]}` : "Velkomin/n"}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Áður en þú færð aðgang að stjórnborðinu þarftu að samþykkja eftirfarandi.
        </p>

        <div className="space-y-4">
          {STAFF_AGREEMENTS.map((a) => (
            <label
              key={a.key}
              className="flex gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-cyan-300"
            >
              <input
                type="checkbox"
                checked={!!checked[a.key]}
                onChange={(e) => setChecked((c) => ({ ...c, [a.key]: e.target.checked }))}
                className="mt-1 h-4 w-4 accent-cyan-600"
              />
              <div>
                <div className="font-semibold text-slate-900 text-sm">{a.title}</div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.body}</p>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">útgáfa {a.version}</div>
              </div>
            </label>
          ))}
        </div>

        {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{err}</div>}

        <button
          onClick={submit}
          disabled={!allChecked || busy}
          className="mt-6 w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
        >
          {busy ? "Vista…" : "Samþykkja og halda áfram"}
        </button>
      </div>
    </div>
  );
}
