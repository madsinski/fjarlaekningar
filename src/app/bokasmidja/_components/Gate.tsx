"use client";

// Inngangurinn: foreldrakóði (einu sinni á tæki) → börnin → leynikóði barnsins.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import type { Child } from "@/lib/bokasmidja/types";
import PinPad from "./PinPad";
import { useBk } from "./Provider";
import { Avatar, BigButton, LangSwitch, call } from "./ui";

export default function Gate({ trusted, configured, kids }: { trusted: boolean; configured: boolean; kids: Child[] }) {
  const { t } = useBk();
  const router = useRouter();
  const [mode, setMode] = useState<"kids" | "parent">(trusted ? "kids" : "parent");
  const [kid, setKid] = useState<Child | null>(null);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async (value: string) => {
    if (!kid) return;
    setBusy(true);
    const res = await call("POST", "/api/bokasmidja/auth/login", { childId: kid.id, pin: value });
    if (res.ok) { router.push("/bokasmidja/books"); router.refresh(); return; }
    setError(errorText(t, res.error));
    setBusy(false);
    setTimeout(() => setPin(""), 500);
  };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await call("POST", "/api/bokasmidja/auth/device", { code });
    if (res.ok) { router.push("/bokasmidja/parent"); router.refresh(); return; }
    setError(errorText(t, res.error));
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-4 py-8">
      <div className="flex w-full justify-end"><LangSwitch /></div>
      <div className="mt-6 text-center">
        <div className="text-7xl" aria-hidden>📚</div>
        <h1 className="bk-display mt-2 text-4xl font-extrabold text-slate-900 sm:text-5xl">{t("app.name")}</h1>
      </div>

      {mode === "parent" ? (
        <form onSubmit={unlock} className="bk-pop mt-8 w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl ring-2 ring-slate-100">
          <h2 className="bk-display flex items-center gap-2 text-2xl font-extrabold"><KeyRound className="h-6 w-6 text-orange-500" aria-hidden />{t("gate.parentTitle")}</h2>
          <p className="mt-2 text-slate-600">{configured ? t("gate.parentBody") : t("err.not_configured")}</p>
          <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="bk-code">{t("gate.code")}</label>
          <input id="bk-code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} disabled={!configured}
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg outline-none focus:border-orange-400" />
          {error && <p role="alert" className="mt-3 font-bold text-red-600">{error}</p>}
          <div className="mt-5 flex items-center gap-3">
            {trusted && (
              <BigButton tone="white" onClick={() => { setMode("kids"); setError(""); }}><ArrowLeft className="h-5 w-5" aria-hidden />{t("gate.back")}</BigButton>
            )}
            <BigButton type="submit" disabled={busy || !configured || code.length < 6} className="flex-1">{t("gate.open")}</BigButton>
          </div>
        </form>
      ) : kid ? (
        <section className="bk-pop mt-8 w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-xl ring-2 ring-slate-100">
          <Avatar avatar={kid.avatar} color={kid.color} size={96} />
          <h2 className="bk-display mt-3 text-2xl font-extrabold">{t("gate.pin", { name: kid.name })}</h2>
          <div className="mt-5">
            <PinPad value={pin} onChange={(v) => { setPin(v); setError(""); }} onComplete={login} disabled={busy} error={!!error} color={kid.color} />
          </div>
          <p role="alert" className="mt-4 min-h-6 font-bold text-red-600">{error}</p>
          <BigButton tone="white" className="mt-2" onClick={() => { setKid(null); setPin(""); setError(""); }}>
            <ArrowLeft className="h-5 w-5" aria-hidden />{t("gate.back")}
          </BigButton>
        </section>
      ) : (
        <section className="mt-8 w-full text-center">
          <h2 className="bk-display text-3xl font-extrabold">{kids.length ? t("gate.who") : t("gate.noKids")}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-5">
            {kids.map((k) => (
              <button key={k.id} type="button" onClick={() => setKid(k)}
                className="bk-press bk-pop flex w-40 flex-col items-center gap-3 rounded-[2rem] bg-white p-5 shadow-[0_6px_0_#e2e8f0] ring-2 ring-slate-100">
                <Avatar avatar={k.avatar} color={k.color} size={96} />
                <span className="bk-display text-2xl font-extrabold">{k.name}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setMode("parent"); setError(""); }}
            className="bk-press mt-10 inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-bold text-slate-500 underline-offset-4 hover:underline">
            <KeyRound className="h-4 w-4" aria-hidden />{t("gate.grownups")}
          </button>
        </section>
      )}
    </main>
  );
}
