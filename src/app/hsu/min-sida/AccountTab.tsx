"use client";

import { useState } from "react";
import { KeyRound, Lock, LogOut } from "lucide-react";
import PinPad from "../_components/PinPad";
import { Badge, Button, Card, Field, Notice, hsuApi, inputCls } from "../_components/ui";
import type { PortalData } from "@/lib/hsu/portal";
import { useCommon, useT } from "@/lib/hsu/i18n/client";
import { account } from "@/lib/hsu/i18n/messages/account";

export default function AccountTab({ me, refresh }: { me: PortalData["me"]; refresh: () => void }) {
  const t = useT(account);
  const c = useCommon();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-sm text-slate-500">{t("username")} <span className="font-semibold text-slate-800">{me.email}</span></p>
      </div>
      <PasswordCard must={me.mustChangePassword} refresh={refresh} />
      <PinCard hasPin={me.hasPin} refresh={refresh} />
      <Card className="p-5 lg:col-span-2">
        <div className="flex items-center gap-2 font-bold"><LogOut className="h-5 w-5 text-[var(--hsu)]" /> {t("logout.title")}</div>
        <p className="mt-1 text-sm text-slate-600">{t("logout.hint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={async () => { await hsuApi("/api/hsu/auth/logout", { body: {} }); window.location.href = "/hsu"; }}>{c("action.logout")}</Button>
          <Button variant="danger" onClick={async () => { await hsuApi("/api/hsu/auth/logout", { body: { forget: true } }); window.location.href = "/hsu"; }}>{t("logout.forget")}</Button>
        </div>
      </Card>
    </div>
  );
}

function PasswordCard({ must, refresh }: { must: boolean; refresh: () => void }) {
  const t = useT(account);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) { setMsg({ tone: "err", text: t("password.mismatch") }); return; }
    setBusy(true); setMsg(null);
    const r = await hsuApi("/api/hsu/me/password", { method: "PUT", body: { current, next } });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("error.failed") }); return; }
    setCurrent(""); setNext(""); setAgain("");
    setMsg({ tone: "ok", text: t("password.changed") });
    refresh();
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 font-bold"><Lock className="h-5 w-5 text-[var(--hsu)]" /> {t("password.title")}</div>
      {must && <div className="mt-3"><Notice tone="warn">{t("password.mustChange")}</Notice></div>}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label={t("password.current")}><input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
        <Field label={t("password.new")} hint={t("password.newHint")}><input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
        <Field label={t("password.again")}><input type="password" autoComplete="new-password" className={inputCls} value={again} onChange={(e) => setAgain(e.target.value)} required /></Field>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button type="submit" busy={busy}>{t("password.submit")}</Button>
      </form>
    </Card>
  );
}

function PinCard({ hasPin, refresh }: { hasPin: boolean; refresh: () => void }) {
  const t = useT(account);
  const c = useCommon();
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const reset = () => { setPin(""); setPin2(""); setStep(1); };
  const complete = async (v: string) => {
    if (step === 1) { setPin(v); setStep(2); return; }
    if (v !== pin) { setMsg({ tone: "err", text: t("pin.mismatch") }); reset(); return; }
    setBusy(true); setMsg(null);
    const r = await hsuApi("/api/hsu/me/pin", { method: "PUT", body: { pin: v, password } });
    setBusy(false);
    reset();
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("error.failed") }); return; }
    setEditing(false); setPassword("");
    setMsg({ tone: "ok", text: t("pin.saved") });
    refresh();
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5 text-[var(--hsu)]" /> {t("pin.title")}</div>
        {hasPin ? <Badge tone="green">{t("pin.active")}</Badge> : <Badge>{t("pin.notSet")}</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-600">{t("pin.hint")}</p>
      {msg && <div className="mt-3"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {!editing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => { setEditing(true); setMsg(null); }}>{hasPin ? t("pin.change") : t("pin.choose")}</Button>
          {hasPin && (
            <Button variant="ghost" busy={busy} onClick={async () => {
              if (!confirm(t("pin.removeConfirm"))) return;
              setBusy(true); await hsuApi("/api/hsu/me/pin", { method: "DELETE" }); setBusy(false); refresh();
            }}>{t("pin.remove")}</Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Field label={t("pin.passwordLabel")}>
            <input type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {password.length > 0 && (
            <>
              <p className="text-center text-sm font-semibold text-slate-700">{step === 1 ? t("pin.step1") : t("pin.step2")}</p>
              <PinPad value={step === 1 ? pin : pin2} onChange={step === 1 ? setPin : setPin2} onComplete={complete} disabled={busy} />
            </>
          )}
          <button className="w-full text-center text-sm text-slate-500 hover:underline" onClick={() => { setEditing(false); reset(); }}>{c("action.cancel")}</button>
        </div>
      )}
    </Card>
  );
}
