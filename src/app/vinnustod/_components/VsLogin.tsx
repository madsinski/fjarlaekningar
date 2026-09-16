"use client";

// Innskráning í vinnustöðina — eins og í vaktakerfinu: lykilorð, eða 4 stafa
// kóði á tæki sem hefur skráð sig inn áður. Auk þess nýskráning fyrir netföng á
// leyfðu léni (t.d. @hsu.is): staðfestingarhlekkur fer í póst.

import { useEffect, useState } from "react";
import { KeyRound, Lock, Mail, ShieldCheck, UserPlus } from "lucide-react";
import PinPad from "@/app/hsu/_components/PinPad";
import { Button, Field, Notice, firstName, inputCls } from "@/app/hsu/_components/ui";
import { FjLogo, vsApi } from "./shared";

type Stage = "loading" | "pin" | "password" | "forgot" | "offer-pin" | "signup" | "signup-sent";

export default function VsLogin({ onDone }: { onDone: () => void }) {
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
  const [signup, setSignup] = useState({ name: "", email: "", workplace: "", title: "Hjúkrunarfræðingur" });

  useEffect(() => {
    (async () => {
      const r = await vsApi<{ known: boolean; name?: string; email?: string; hasPin?: boolean }>("/api/vinnustod/auth/device");
      if (r.ok && r.known && r.hasPin) {
        setDevice({ name: r.name ?? "", email: r.email ?? "" });
        setStage("pin");
      } else {
        if (r.ok && r.known && r.email) setEmail(r.email);
        setStage("password");
      }
    })();
  }, []);

  const submitPin = async (value: string) => {
    setBusy(true); setErr(null);
    const r = await vsApi<{ deviceRevoked?: boolean; noPin?: boolean }>("/api/vinnustod/auth/pin", { body: { pin: value } });
    setBusy(false);
    if (r.ok) return onDone();
    setErr(r.error ?? "Innskráning mistókst");
    setPin("");
    if (r.deviceRevoked || r.noPin) {
      if (device?.email) setEmail(device.email);
      setStage("password");
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await vsApi<{ hasPin: boolean; mustChangePassword: boolean }>("/api/vinnustod/auth/login", { body: { email, password } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Innskráning mistókst"); return; }
    if (!r.hasPin && !r.mustChangePassword) { setStage("offer-pin"); return; }
    onDone();
  };

  const savePin = async (value: string) => {
    if (pinStep === 1) { setPin(value); setPinStep(2); setPin2(""); return; }
    if (value !== pin) {
      setErr("Kóðarnir stemma ekki. Reyndu aftur.");
      setPin(""); setPin2(""); setPinStep(1);
      return;
    }
    setBusy(true); setErr(null);
    const r = await vsApi("/api/vinnustod/me", { method: "PUT", body: { kind: "pin", pin: value, password } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að vista kóðann"); setPin(""); setPin2(""); setPinStep(1); return; }
    onDone();
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await vsApi("/api/vinnustod/auth/forgot", { body: { email } });
    setBusy(false);
    setInfo("Ef netfangið er skráð færðu tölvupóst með hlekk til að velja nýtt lykilorð.");
    setStage("password");
  };

  const sendSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await vsApi("/api/vinnustod/auth/signup", { body: signup });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Nýskráning mistókst"); return; }
    setStage("signup-sent");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <FjLogo size={56} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Vinnustöð Fjarlækninga</h1>
          <p className="text-sm text-slate-500">Fyrir starfsfólk heilsugæslunnar</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {stage === "loading" && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}

          {stage === "pin" && device && (
            <div>
              <p className="text-center text-sm text-slate-600">Velkomin(n) aftur,</p>
              <p className="text-center text-lg font-bold text-slate-900">{firstName(device.name)}</p>
              <p className="mb-6 mt-1 text-center text-xs text-slate-500">Sláðu inn aðgangskóðann þinn</p>
              <PinPad value={pin} onChange={(v) => { setPin(v); setErr(null); }} onComplete={submitPin} disabled={busy} error={Boolean(err)} />
              {err && <p className="mt-4 text-center text-sm text-red-600">{err}</p>}
              <div className="mt-6 flex justify-center gap-4 text-sm">
                <button className="font-medium text-[var(--hsu)] hover:underline" onClick={() => { setEmail(device.email); setStage("password"); setErr(null); }}>Nota lykilorð</button>
                <button className="text-slate-500 hover:underline" onClick={async () => {
                  await vsApi("/api/vinnustod/auth/logout", { body: { forget: true } });
                  setDevice(null); setEmail(""); setStage("password");
                }}>Ekki þú?</button>
              </div>
            </div>
          )}

          {stage === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              {info && <Notice tone="info">{info}</Notice>}
              <Field label="Netfang">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className={`${inputCls} pl-9`} type="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nafn@hsu.is" required />
                </div>
              </Field>
              <Field label="Lykilorð">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className={`${inputCls} pl-9`} type="password" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </Field>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <Button type="submit" size="lg" className="w-full" busy={busy}>Skrá inn</Button>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-slate-500 hover:underline" onClick={() => { setStage("forgot"); setErr(null); }}>Gleymt lykilorð?</button>
                {device && <button type="button" className="font-medium text-[var(--hsu)] hover:underline" onClick={() => { setStage("pin"); setErr(null); }}>Nota kóða</button>}
              </div>
              <div className="border-t border-slate-100 pt-4 text-center">
                <button type="button" onClick={() => { setStage("signup"); setErr(null); setSignup((s) => ({ ...s, email })); }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hsu)] hover:underline">
                  <UserPlus className="h-4 w-4" /> Nýskráning
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-400">
                Starfsfólk Fjarlækninga: <a href="/admin/login" className="underline">skráðu þig inn í stjórnborðið</a> og veldu „Vinnustöð“ í valmyndinni.
              </p>
            </form>
          )}

          {stage === "forgot" && (
            <form onSubmit={sendForgot} className="space-y-4">
              <p className="text-sm text-slate-600">Sláðu inn netfangið þitt og við sendum þér hlekk til að velja nýtt lykilorð.</p>
              <Field label="Netfang">
                <input className={inputCls} type="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nafn@hsu.is" required />
              </Field>
              <Button type="submit" size="lg" className="w-full" busy={busy}>Senda hlekk</Button>
              <button type="button" className="w-full text-center text-sm text-slate-500 hover:underline" onClick={() => setStage("password")}>Til baka</button>
            </form>
          )}

          {stage === "signup" && (
            <form onSubmit={sendSignup} className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Nýskráning</h2>
                <p className="text-sm text-slate-600">Notaðu vinnunetfangið þitt (@hsu.is). Við sendum staðfestingarhlekk þangað og þú velur lykilorð.</p>
              </div>
              <Field label="Fullt nafn">
                <input className={inputCls} autoComplete="name" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} required />
              </Field>
              <Field label="Vinnunetfang">
                <input className={inputCls} type="email" autoCapitalize="none" autoComplete="email" value={signup.email}
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })} placeholder="nafn@hsu.is" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starfsheiti">
                  <input className={inputCls} value={signup.title} onChange={(e) => setSignup({ ...signup, title: e.target.value })} />
                </Field>
                <Field label="Starfsstöð">
                  <input className={inputCls} value={signup.workplace} onChange={(e) => setSignup({ ...signup, workplace: e.target.value })} placeholder="t.d. Vestmannaeyjar" />
                </Field>
              </div>
              {err && <Notice tone="err">{err}</Notice>}
              <Button type="submit" size="lg" className="w-full" busy={busy}>Senda staðfestingarhlekk</Button>
              <button type="button" className="w-full text-center text-sm text-slate-500 hover:underline" onClick={() => { setStage("password"); setErr(null); }}>Ég er með aðgang</button>
            </form>
          )}

          {stage === "signup-sent" && (
            <div className="space-y-3 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--hsu-soft)]"><Mail className="h-6 w-6 text-[var(--hsu)]" /></span>
              <h2 className="text-base font-bold">Athugaðu pósthólfið</h2>
              <p className="text-sm text-slate-600">
                Við sendum hlekk á <b>{signup.email}</b>. Smelltu á hann til að staðfesta netfangið og velja lykilorð. Hlekkurinn gildir í 14 daga.
              </p>
              <button className="text-sm font-medium text-[var(--hsu)] hover:underline" onClick={() => setStage("password")}>Til baka í innskráningu</button>
            </div>
          )}

          {stage === "offer-pin" && (
            <div>
              <div className="flex flex-col items-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--hsu-soft)]"><KeyRound className="h-6 w-6 text-[var(--hsu)]" /></span>
                <h2 className="mt-3 text-base font-bold">Fljótleg innskráning</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {pinStep === 1 ? "Veldu 4 stafa aðgangskóða. Næst skráirðu þig inn á þessari tölvu með honum." : "Sláðu kóðann inn aftur til staðfestingar."}
                </p>
              </div>
              <div className="mt-6">
                <PinPad value={pinStep === 1 ? pin : pin2} onChange={(v) => { (pinStep === 1 ? setPin : setPin2)(v); setErr(null); }}
                  onComplete={savePin} disabled={busy} error={Boolean(err)} />
              </div>
              {err && <p className="mt-4 text-center text-sm text-red-600">{err}</p>}
              <button className="mt-6 w-full text-center text-sm text-slate-500 hover:underline" onClick={onDone}>Sleppa í bili</button>
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Aðgangskóði virkar aðeins á tæki þar sem þú hefur skráð þig inn með lykilorði.
        </p>
      </div>
    </main>
  );
}
