"use client";

import { useEffect, useState } from "react";
import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { LanguageSwitch, useT } from "@/lib/hsu/i18n/client";
import { auth } from "@/lib/hsu/i18n/messages/auth";
import PinPad from "./PinPad";
import { Button, Field, HsuLogo, Notice, firstName, hsuApi, inputCls } from "./ui";

type Stage = "loading" | "pin" | "password" | "forgot" | "offer-pin";

export default function LoginClient({ next }: { next: string }) {
  const t = useT(auth);
  const [stage, setStage] = useState<Stage>("loading");
  const [device, setDevice] = useState<{ name: string; email: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinStep, setPinStep] = useState<1 | 2>(1);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dest, setDest] = useState("/hsu/min-sida");

  useEffect(() => {
    (async () => {
      const r = await hsuApi<{ known: boolean; name?: string; email?: string; hasPin?: boolean }>("/api/hsu/auth/device");
      if (r.ok && r.known && r.hasPin) {
        setDevice({ name: r.name ?? "", email: r.email ?? "" });
        setStage("pin");
      } else {
        if (r.ok && r.known && r.email) setEmail(r.email);
        setStage("password");
      }
    })();
  }, []);

  const go = (path: string) => { window.location.href = next || path; };

  const submitPin = async (value: string) => {
    setBusy(true); setErr(null);
    const r = await hsuApi<{ next?: string; deviceRevoked?: boolean }>("/api/hsu/auth/pin", { body: { pin: value } });
    setBusy(false);
    if (r.ok) return go(r.next ?? "/hsu/min-sida");
    setErr(r.error ?? t("login.failed"));
    setPin("");
    if (r.deviceRevoked || (r as { noPin?: boolean }).noPin) {
      if (device?.email) setEmail(device.email);
      setStage("password");
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await hsuApi<{ next: string; hasPin: boolean; mustChangePassword: boolean }>("/api/hsu/auth/login", { body: { email, password } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? t("login.failed")); return; }
    if (!r.hasPin && !r.mustChangePassword) {
      setDest(r.next);
      setStage("offer-pin");
      return;
    }
    go(r.next);
  };

  const savePin = async (value: string) => {
    if (pinStep === 1) { setPin(value); setPinStep(2); setPin2(""); return; }
    if (value !== pin) {
      setErr(t("pin.mismatch"));
      setPin(""); setPin2(""); setPinStep(1);
      return;
    }
    setBusy(true); setErr(null);
    const r = await hsuApi("/api/hsu/me/pin", { method: "PUT", body: { pin: value, password } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? t("pin.saveFailed")); setPin(""); setPin2(""); setPinStep(1); return; }
    go(dest);
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await hsuApi("/api/hsu/auth/forgot", { body: { email } });
    setBusy(false);
    setInfo(t("forgot.sent"));
    setStage("password");
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <LanguageSwitch className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <HsuLogo size={64} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">{t("login.title")}</h1>
          <p className="text-sm text-slate-500">{t("login.subtitle")}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {stage === "loading" && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}

          {stage === "pin" && device && (
            <div>
              <p className="text-center text-sm text-slate-600">{t("login.welcomeBack")}</p>
              <p className="text-center text-lg font-bold text-slate-900">{firstName(device.name)}</p>
              <p className="mb-6 mt-1 text-center text-xs text-slate-500">{t("login.enterPin")}</p>
              <PinPad value={pin} onChange={(v) => { setPin(v); setErr(null); }} onComplete={submitPin} disabled={busy} error={Boolean(err)} />
              {err && <p className="mt-4 text-center text-sm text-red-600">{err}</p>}
              <div className="mt-6 flex justify-center gap-4 text-sm">
                <button className="font-medium text-[var(--hsu)] hover:underline" onClick={() => { setEmail(device.email); setStage("password"); setErr(null); }}>
                  {t("login.usePassword")}
                </button>
                <button className="text-slate-500 hover:underline" onClick={async () => {
                  await hsuApi("/api/hsu/auth/logout", { body: { forget: true } });
                  setDevice(null); setEmail(""); setStage("password");
                }}>
                  {t("login.notYou")}
                </button>
              </div>
            </div>
          )}

          {stage === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              {info && <Notice tone="info">{info}</Notice>}
              <Field label={t("login.username")} hint={t("login.usernameHint")}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className={`${inputCls} pl-9`} type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.emailPlaceholder")} required />
                </div>
              </Field>
              <Field label={t("login.password")}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className={`${inputCls} pl-9`} type="password" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </Field>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <Button type="submit" size="lg" className="w-full" busy={busy}>{t("login.submit")}</Button>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-slate-500 hover:underline" onClick={() => { setStage("forgot"); setErr(null); }}>{t("login.forgot")}</button>
                {device && <button type="button" className="font-medium text-[var(--hsu)] hover:underline" onClick={() => { setStage("pin"); setErr(null); }}>{t("login.usePin")}</button>}
              </div>
            </form>
          )}

          {stage === "forgot" && (
            <form onSubmit={sendForgot} className="space-y-4">
              <p className="text-sm text-slate-600">{t("forgot.intro")}</p>
              <Field label={t("forgot.email")}>
                <input className={inputCls} type="text" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.emailPlaceholder")} required />
              </Field>
              <Button type="submit" size="lg" className="w-full" busy={busy}>{t("forgot.send")}</Button>
              <button type="button" className="w-full text-center text-sm text-slate-500 hover:underline" onClick={() => setStage("password")}>{t("forgot.back")}</button>
            </form>
          )}

          {stage === "offer-pin" && (
            <div>
              <div className="flex flex-col items-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--hsu-soft)]"><KeyRound className="h-6 w-6 text-[var(--hsu)]" /></span>
                <h2 className="mt-3 text-base font-bold">{t("pin.offerTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {pinStep === 1 ? t("pin.offerChoose") : t("pin.offerConfirm")}
                </p>
              </div>
              <div className="mt-6">
                <PinPad
                  value={pinStep === 1 ? pin : pin2}
                  onChange={(v) => { (pinStep === 1 ? setPin : setPin2)(v); setErr(null); }}
                  onComplete={savePin}
                  disabled={busy}
                  error={Boolean(err)}
                />
              </div>
              {err && <p className="mt-4 text-center text-sm text-red-600">{err}</p>}
              <button className="mt-6 w-full text-center text-sm text-slate-500 hover:underline" onClick={() => go(dest)}>{t("pin.skip")}</button>
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> {t("login.pinDeviceOnly")}
        </p>
        <p className="mt-2 text-center text-[11px]">
          <a href="/personuvernd-starfsfolks" className="text-slate-400 underline hover:text-slate-600">{t("login.privacy")}</a>
        </p>
      </div>
    </main>
  );
}
