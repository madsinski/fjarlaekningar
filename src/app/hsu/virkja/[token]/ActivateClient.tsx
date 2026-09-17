"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useT } from "@/lib/hsu/i18n/client";
import { auth } from "@/lib/hsu/i18n/messages/auth";
import PinPad from "../../_components/PinPad";
import { Button, Field, HsuLogo, Notice, hsuApi, inputCls } from "../../_components/ui";

export default function ActivateClient({ token }: { token: string }) {
  const t = useT(auth);
  const [info, setInfo] = useState<{ name: string; email: string; reset: boolean } | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [usePin, setUsePin] = useState(true);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await hsuApi<{ name: string; email: string; reset: boolean }>(`/api/hsu/auth/invite?token=${encodeURIComponent(token)}`);
      if (r.ok) setInfo({ name: r.name, email: r.email, reset: r.reset });
      else setInvalid(r.error ?? "");
    })();
  }, [token]);

  const rules = [
    { ok: pw.length >= 10, label: t("activate.rule.length") },
    { ok: /[A-Za-zÁÐÉÍÓÚÝÞÆÖáðéíóúýþæö]/.test(pw) && /\d/.test(pw), label: t("activate.rule.mix") },
    { ok: pw.length > 0 && pw === pw2, label: t("activate.rule.match") },
  ];

  // Netfangið feitletrað inni í þýddri setningu.
  const usernameParts = t("activate.username").split("{email}");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rules.every((r) => r.ok)) { setErr(t("activate.rulesFailed")); return; }
    if (usePin && pin.length !== 4) { setErr(t("activate.pinRequired")); return; }
    setBusy(true); setErr(null);
    const r = await hsuApi<{ next: string }>("/api/hsu/auth/invite", { body: { token, password: pw, pin: usePin ? pin : "" } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? t("activate.failed")); return; }
    window.location.href = r.next;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <HsuLogo size={44} />
          <div>
            <div className="text-sm font-bold text-slate-900">{t("login.title")}</div>
            <div className="text-xs text-slate-500">{t("activate.unit")}</div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!info && invalid === null && <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />}
          {invalid !== null && (
            <div className="space-y-4 text-center">
              <h1 className="text-lg font-bold">{t("activate.invalidTitle")}</h1>
              <p className="text-sm text-slate-600">{invalid || t("activate.invalidDefault")} {t("activate.invalidHelp")}</p>
              <a href="/hsu" className="inline-block text-sm font-semibold text-[var(--hsu)] hover:underline">{t("activate.toLogin")}</a>
            </div>
          )}
          {info && (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h1 className="text-lg font-bold">{info.reset ? t("activate.resetTitle") : t("activate.welcome", { name: info.name.split(" ")[0] })}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {usernameParts[0]}<span className="font-semibold text-slate-900">{info.email}</span>{usernameParts[1]}
                </p>
              </div>
              <Field label={t("activate.password")}>
                <input className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </Field>
              <Field label={t("activate.password2")}>
                <input className={inputCls} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </Field>
              <ul className="space-y-1">
                {rules.map((r) => (
                  <li key={r.label} className={`flex items-center gap-2 text-xs ${r.ok ? "text-emerald-700" : "text-slate-500"}`}>
                    <Check className={`h-3.5 w-3.5 ${r.ok ? "opacity-100" : "opacity-30"}`} /> {r.label}
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-slate-200 p-4">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} />
                  <span>
                    <span className="block text-sm font-semibold">{t("activate.pinTitle")}</span>
                    <span className="block text-xs text-slate-500">{t("activate.pinBody")}</span>
                  </span>
                </label>
                {usePin && <div className="mt-5"><PinPad value={pin} onChange={setPin} disabled={busy} /></div>}
              </div>

              {err && <Notice tone="err">{err}</Notice>}
              <Button type="submit" size="lg" className="w-full" busy={busy}>{info.reset ? t("activate.savePassword") : t("activate.submit")}</Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
