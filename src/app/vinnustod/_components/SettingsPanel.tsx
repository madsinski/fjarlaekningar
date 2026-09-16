"use client";

// Stillingar notanda vinnustöðvarinnar: lykilorð, aðgangskóði og útskráning.

import { useState } from "react";
import { KeyRound, Lock, LogOut } from "lucide-react";
import PinPad from "@/app/hsu/_components/PinPad";
import { Badge, Button, Card, Field, Notice, inputCls } from "@/app/hsu/_components/ui";
import type { VsMe } from "./Workstation";
import { vsApi } from "./shared";

export default function SettingsPanel({ me, refresh }: { me: VsMe; refresh: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Innskráð(ur) sem <b className="text-slate-800">{me.email}</b></p>
      <PasswordCard must={me.mustChangePassword} refresh={refresh} />
      <PinCard hasPin={me.hasPin} refresh={refresh} />
      <Card className="p-5">
        <div className="flex items-center gap-2 font-bold"><LogOut className="h-5 w-5 text-[var(--hsu)]" /> Útskráning</div>
        <p className="mt-1 text-sm text-slate-600">Á sameiginlegri tölvu skaltu líka gleyma tækinu, svo aðgangskóðinn virki ekki þar.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={async () => { await vsApi("/api/vinnustod/auth/logout", { body: {} }); window.location.href = "/vinnustod"; }}>Skrá út</Button>
          <Button variant="danger" onClick={async () => { await vsApi("/api/vinnustod/auth/logout", { body: { forget: true } }); window.location.href = "/vinnustod"; }}>Skrá út og gleyma tækinu</Button>
        </div>
      </Card>
    </div>
  );
}

function PasswordCard({ must, refresh }: { must: boolean; refresh: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) { setMsg({ tone: "err", text: "Nýju lykilorðin stemma ekki." }); return; }
    setBusy(true); setMsg(null);
    const r = await vsApi("/api/vinnustod/me", { method: "PUT", body: { kind: "password", current, next } });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
    setCurrent(""); setNext(""); setAgain("");
    setMsg({ tone: "ok", text: "Lykilorði breytt. Önnur tæki hafa verið skráð út." });
    refresh();
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 font-bold"><Lock className="h-5 w-5 text-[var(--hsu)]" /> Lykilorð</div>
      {must && <div className="mt-3"><Notice tone="warn">Lykilorðið þitt var sett af öðrum. Veldu þitt eigið.</Notice></div>}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="Núverandi lykilorð"><input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
        <Field label="Nýtt lykilorð" hint="Minnst 10 stafir, bókstafir og tölustafir."><input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
        <Field label="Nýtt lykilorð aftur"><input type="password" autoComplete="new-password" className={inputCls} value={again} onChange={(e) => setAgain(e.target.value)} required /></Field>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button type="submit" busy={busy}>Breyta lykilorði</Button>
      </form>
    </Card>
  );
}

function PinCard({ hasPin, refresh }: { hasPin: boolean; refresh: () => void }) {
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
    if (v !== pin) { setMsg({ tone: "err", text: "Kóðarnir stemma ekki." }); reset(); return; }
    setBusy(true); setMsg(null);
    const r = await vsApi("/api/vinnustod/me", { method: "PUT", body: { kind: "pin", pin: v, password } });
    setBusy(false); reset();
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
    setEditing(false); setPassword("");
    setMsg({ tone: "ok", text: "Aðgangskóði vistaður." });
    refresh();
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5 text-[var(--hsu)]" /> Aðgangskóði</div>
        {hasPin ? <Badge tone="green">Virkur</Badge> : <Badge>Ekki settur</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-600">4 tölustafir til að skrá sig hratt inn á tölvu þar sem þú hefur áður skráð þig inn með lykilorði.</p>
      {msg && <div className="mt-3"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {!editing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => { setEditing(true); setMsg(null); }}>{hasPin ? "Breyta kóða" : "Velja kóða"}</Button>
          {hasPin && (
            <Button variant="ghost" busy={busy} onClick={async () => {
              if (!confirm("Fjarlægja aðgangskóða? Þú þarft þá lykilorð til að skrá þig inn.")) return;
              setBusy(true); await vsApi("/api/vinnustod/me", { method: "DELETE" }); setBusy(false); refresh();
            }}>Fjarlægja</Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Field label="Lykilorðið þitt (til staðfestingar)">
            <input type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {password.length > 0 && (
            <>
              <p className="text-center text-sm font-semibold text-slate-700">{step === 1 ? "Veldu 4 stafa kóða" : "Sláðu kóðann aftur inn"}</p>
              <PinPad value={step === 1 ? pin : pin2} onChange={step === 1 ? setPin : setPin2} onComplete={complete} disabled={busy} />
            </>
          )}
          <button className="w-full text-center text-sm text-slate-500 hover:underline" onClick={() => { setEditing(false); reset(); }}>Hætta við</button>
        </div>
      )}
    </Card>
  );
}
