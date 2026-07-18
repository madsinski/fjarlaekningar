"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// MFA gate: TOTP enrollment + challenge. The admin layout redirects here when
// a user has no verified factor yet, or has one but hasn't stepped the session
// up to AAL2 this visit. Ported from lifeline-website, rebranded cyan.

function MfaPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") || "challenge") as "enroll" | "challenge";

  const [mode, setMode] = useState<"enroll" | "challenge" | "done">(initialMode);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startEnroll = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Fjarlækningar Admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp.find((f) => f.status === "verified");
        if (verified) {
          setFactorId(verified.id);
          setMode("challenge");
          return;
        }
        // Clean up abandoned unverified factors (else "friendly name in use").
        for (const f of factors?.totp || []) {
          if (f.status !== "verified") {
            try {
              await supabase.auth.mfa.unenroll({ factorId: f.id });
            } catch {}
          }
        }
        if (initialMode === "enroll") startEnroll();
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [initialMode, startEnroll]);

  const verify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!factorId || busy || code.length !== 6) return;
    setErr(null);
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const res = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (res.error) throw res.error;
      setMode("done");
      setTimeout(() => router.replace("/admin"), 500);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">
          Örugg innskráning
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Tveggja þátta auðkenning</h1>
        <p className="text-sm text-slate-600 mb-5">
          {mode === "enroll"
            ? "Settu upp auðkenningarapp. Við biðjum um 6 stafa kóða við hverja innskráningu — það ver gögnin ef lykilorðið lekur."
            : mode === "challenge"
              ? "Sláðu inn 6 stafa kóðann úr auðkenningarappinu."
              : "Tilbúið."}
        </p>

        {mode === "enroll" && !qrCode && (
          <button
            onClick={startEnroll}
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
          >
            {busy ? "Hleð…" : "Byrja uppsetningu"}
          </button>
        )}

        {mode === "enroll" && qrCode && (
          <form onSubmit={verify} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col items-center">
              <p className="text-xs text-slate-600 mb-2">
                Skannaðu QR-kóðann í Google Authenticator, Authy eða 1Password.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="TOTP QR" className="w-48 h-48" />
              {secret && (
                <div className="mt-3 text-[11px] text-slate-500 text-center">
                  Eða sláðu inn leyndarmálið handvirkt:
                  <div className="font-mono text-slate-800 mt-0.5 select-all break-all">{secret}</div>
                </div>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base font-mono tracking-[0.4em] text-center focus:ring-2 focus:ring-cyan-200 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Staðfesti…" : "Staðfesta og ljúka"}
            </button>
          </form>
        )}

        {mode === "challenge" && (
          <form onSubmit={verify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base font-mono tracking-[0.4em] text-center focus:ring-2 focus:ring-cyan-200 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Staðfesti…" : "Halda áfram"}
            </button>
            <button
              type="button"
              onClick={() => {
                supabase.auth.signOut();
                router.replace("/admin/login");
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-700"
            >
              Skrá út
            </button>
          </form>
        )}

        {mode === "done" && (
          <div className="text-center py-6 text-cyan-700 text-sm font-medium">
            ✓ Auðkenning staðfest. Áframsendi…
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{err}</div>
        )}
      </div>
    </div>
  );
}

export default function MfaPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Hleð…</div>}
    >
      <MfaPageInner />
    </Suspense>
  );
}
