"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Three flows on this page:
//  1. Normal sign-in: email + password → /admin (layout gates from there).
//  2. Invite / recovery landing: the link in the email lands here with a
//     PKCE ?token_hash=…&type=invite|recovery (or a legacy #access_token hash).
//     We establish the session then show a "set password" form.
//  3. Forgot-password request: sends a recovery email back to this page.

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [setupMode, setSetupMode] = useState<null | "invite" | "recovery">(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Detect an invite/recovery landing and establish the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let detected: "invite" | "recovery" | null = null;
      let queryTokenHash: string | null = null;

      if (typeof window !== "undefined") {
        if (window.location.hash) {
          const p = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const t = p.get("type");
          if (t === "invite" || t === "recovery") detected = t;
        }
        if (!detected && window.location.search) {
          const qs = new URLSearchParams(window.location.search);
          const t = qs.get("type");
          if (t === "invite" || t === "recovery") {
            detected = t;
            queryTokenHash = qs.get("token_hash");
          }
        }
      }

      if (detected && queryTokenHash) {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: queryTokenHash,
          type: detected,
        });
        if (cancelled) return;
        if (otpErr) {
          setError(`Hlekkur ógildur eða útrunninn: ${otpErr.message}`);
          return;
        }
        setSetupMode(detected);
        return;
      }
      if (detected) {
        // Legacy hash flow — JS client auto-established the session.
        setSetupMode(detected);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    router.replace("/admin");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      setError("Lykilorð verður að vera a.m.k. 10 stafir.");
      return;
    }
    setSavingPassword(true);
    setError("");
    const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    // Strip the token from the URL and continue into the app (layout will
    // send them to MFA enrollment next).
    window.history.replaceState(null, "", "/admin/login");
    router.replace("/admin");
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSending(true);
    setForgotMsg(null);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.fjarlaekningar.is";
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/admin/login`,
    });
    setForgotSending(false);
    setForgotMsg(
      rErr
        ? { type: "err", text: rErr.message }
        : { type: "ok", text: "Ef netfangið er skráð sendum við endurstillingarhlekk." },
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">
          Fjarlækningar · Stjórnborð
        </div>

        {setupMode ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Veldu lykilorð</h1>
            <p className="text-sm text-slate-600 mb-5">
              {setupMode === "invite"
                ? "Velkomin/n. Veldu lykilorð til að virkja aðganginn þinn."
                : "Sláðu inn nýtt lykilorð fyrir aðganginn þinn."}
            </p>
            <form onSubmit={savePassword} className="space-y-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nýtt lykilorð (a.m.k. 10 stafir)"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-cyan-200 outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={savingPassword || newPassword.length < 10}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
              >
                {savingPassword ? "Vista…" : "Vista og halda áfram"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Innskráning</h1>
            <p className="text-sm text-slate-600 mb-5">Aðeins starfsfólk. Innskráning krefst tveggja þátta auðkenningar.</p>
            <form onSubmit={signIn} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Netfang"
                autoComplete="username"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-cyan-200 outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Lykilorð"
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-cyan-200 outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
              >
                {loading ? "Skrái inn…" : "Skrá inn"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setForgotOpen((v) => !v)}
              className="mt-4 text-xs text-slate-500 hover:text-slate-700"
            >
              Gleymt lykilorð?
            </button>
            {forgotOpen && (
              <form onSubmit={sendForgot} className="mt-3 space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Netfang"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                />
                <button
                  type="submit"
                  disabled={forgotSending || !email}
                  className="w-full py-2 rounded-lg border border-cyan-600 text-cyan-700 font-semibold text-sm disabled:opacity-50"
                >
                  {forgotSending ? "Sendi…" : "Senda endurstillingarhlekk"}
                </button>
                {forgotMsg && (
                  <p className={`text-xs ${forgotMsg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
                    {forgotMsg.text}
                  </p>
                )}
              </form>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
