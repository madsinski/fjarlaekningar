"use client";

// Vinnustöð Fjarlækninga — opin allan vinnudaginn hjá hjúkrunarfræðingi sem
// svarar símanum og skilaboðum sjúklinga.
//
//   Yfirlit      staða þjónustunnar (opið/lokað), tilkynningar, flýtileiðir,
//                QR-kóði á skjá fyrir sjúkling sem stendur við borðið
//   Upplýsingar  hvað hentar og hvað ekki, tilbúin svör, lyfjalisti, leit
//   SMS          senda hlekkinn og sjá hvort hann komst til skila
//   Spurningar   spyrja Fjarlækningar (aðeins notendur vinnustöðvar)
//   Stillingar   lykilorð og aðgangskóði (aðeins notendur vinnustöðvar)

import { useEffect, useRef, useState } from "react";
import {
  BookOpen, ChevronRight, Clock, Home, KeyRound, Lock, LogOut, Megaphone, MessageCircle, QrCode, Search, Send, Settings, X,
} from "lucide-react";
import PinPad from "@/app/hsu/_components/PinPad";
import { Badge, Button, Card, Field, Notice, cx, firstName, inputCls } from "@/app/hsu/_components/ui";
import { GUIDE_FACTS } from "@/lib/nurse-guide";
import NurseGuide from "./NurseGuide";
import QuestionsPanel from "./QuestionsPanel";
import SmsPanel from "./SmsPanel";
import { FjLogo, PORTAL_URL, Qr, useServiceStatus, vsApi } from "./shared";

export interface VsMe {
  id: string;
  name: string;
  kind: "vs" | "staff" | "hsu";
  email: string;
  workplace: string;
  title: string;
  hasPin: boolean;
  mustChangePassword: boolean;
  canMessage: boolean;
}
export interface Announcement { id: string; created_at: string; title: string; body: string; level: "info" | "warning" }

type Tab = "yfirlit" | "upplysingar" | "sms" | "spurningar" | "stillingar";

export default function Workstation({ me, announcements, unread: initialUnread, refresh }: {
  me: VsMe; announcements: Announcement[]; unread: number; refresh: () => void;
}) {
  const [tab, setTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "yfirlit";
    const t = new URLSearchParams(window.location.search).get("t") as Tab | null;
    return t && ["yfirlit", "upplysingar", "sms", "spurningar", "stillingar"].includes(t) ? t : me.mustChangePassword ? "stillingar" : "yfirlit";
  });
  const [unread, setUnread] = useState(initialUnread);
  const [qrOpen, setQrOpen] = useState(false);
  const [askDraft, setAskDraft] = useState<string | undefined>(undefined);
  const [searchPing, setSearchPing] = useState(0);
  const phoneRef = useRef<HTMLInputElement>(null);

  const setTab = (t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("t", t);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  // Ólesin svör uppfærast þó spurningaflipinn sé ekki opinn.
  useEffect(() => {
    if (!me.canMessage) return;
    const t = setInterval(async () => {
      const r = await vsApi<{ unread: number }>("/api/vinnustod/me", { staff: true });
      if (r.ok) setUnread(r.unread);
    }, 60_000);
    return () => clearInterval(t);
  }, [me.canMessage]);

  const goSms = () => { setTab("sms"); setTimeout(() => phoneRef.current?.focus(), 80); };
  const goSearch = () => { setTab("upplysingar"); setSearchPing((n) => n + 1); };
  const goAsk = (q?: string) => { setAskDraft(q ? `Spurning: ${q}` : undefined); setTab("spurningar"); };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number; show: boolean }[] = [
    { key: "yfirlit", label: "Yfirlit", icon: <Home className="h-4 w-4" />, show: true },
    { key: "upplysingar", label: "Upplýsingar", icon: <BookOpen className="h-4 w-4" />, show: true },
    { key: "sms", label: "SMS", icon: <Send className="h-4 w-4" />, show: true },
    { key: "spurningar", label: "Spurningar", icon: <MessageCircle className="h-4 w-4" />, badge: unread, show: me.canMessage },
    { key: "stillingar", label: "Stillingar", icon: <Settings className="h-4 w-4" />, show: me.kind === "vs" },
  ];

  const logout = async () => {
    if (me.kind === "vs") await vsApi("/api/vinnustod/auth/logout", { body: {} });
    window.location.href = me.kind === "staff" ? "/admin" : me.kind === "hsu" ? "/hsu/min-sida" : "/vinnustod";
  };

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <FjLogo size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-900">Vinnustöð Fjarlækninga</div>
            <div className="truncate text-xs text-slate-500">{me.name}{me.workplace ? ` · ${me.workplace}` : ""}</div>
          </div>
          <ServiceChip />
          <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" title="Skrá út">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{me.kind === "vs" ? "Skrá út" : "Til baka"}</span>
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5 [scrollbar-width:none]">
          {tabs.filter((t) => t.show).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} aria-current={tab === t.key ? "page" : undefined}
              className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                tab === t.key ? "bg-[var(--hsu)] text-white" : "text-slate-600 hover:bg-slate-100")}>
              {t.icon} {t.label}
              {Boolean(t.badge) && <span className={cx("ml-0.5 rounded-full px-1.5 text-[11px]", tab === t.key ? "bg-white/25" : "bg-red-500 text-white")}>{t.badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === "yfirlit" && (
          <Overview me={me} announcements={announcements} unread={unread}
            onSms={goSms} onSearch={goSearch} onAsk={() => goAsk()} onQr={() => setQrOpen(true)} onOpenQuestions={() => setTab("spurningar")} />
        )}
        {tab === "upplysingar" && <NurseGuide onSendLink={goSms} onAsk={me.canMessage ? goAsk : undefined} focusSearch={searchPing} />}
        {tab === "sms" && (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            <SmsPanel ref={phoneRef} />
            <QrCard onOpen={() => setQrOpen(true)} />
          </div>
        )}
        {tab === "spurningar" && me.canMessage && <QuestionsPanel onUnreadChange={setUnread} initialCompose={askDraft} key={askDraft ?? "list"} />}
        {tab === "stillingar" && me.kind === "vs" && <SettingsPanel me={me} refresh={refresh} />}
      </main>

      {qrOpen && <QrModal onClose={() => setQrOpen(false)} />}
    </div>
  );
}

// ── Staða þjónustunnar ──────────────────────────────────────────────────────

function ServiceChip() {
  const s = useServiceStatus();
  if (!s) return null;
  return (
    <span title={s.detail} className={cx("hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex",
      s.open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
      <span className={cx("h-2 w-2 rounded-full", s.open ? "bg-emerald-500" : "bg-slate-400")} /> {s.text}
    </span>
  );
}

function Overview({ me, announcements, unread, onSms, onSearch, onAsk, onQr, onOpenQuestions }: {
  me: VsMe; announcements: Announcement[]; unread: number;
  onSms: () => void; onSearch: () => void; onAsk: () => void; onQr: () => void; onOpenQuestions: () => void;
}) {
  const s = useServiceStatus();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Góðan dag, {firstName(me.name)}</h1>
        <p className="text-sm text-slate-500">Allt sem þú þarft til að vísa sjúklingum á Fjarlækningar.</p>
      </div>

      {s && (
        <div className={cx("flex items-center gap-4 rounded-2xl border p-5", s.open ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
          <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", s.open ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>
            <Clock className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-slate-900">{s.text}</div>
            <div className="text-sm text-slate-600">{s.detail} Opið alla daga kl. 10–22.</div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-slate-400">{s.clock}</div>
        </div>
      )}

      {announcements.map((a) => (
        <Notice key={a.id} tone={a.level === "warning" ? "warn" : "info"}>
          <span className="flex items-start gap-2">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
            <span><b>{a.title}</b>{a.body ? <span className="block whitespace-pre-wrap">{a.body}</span> : null}</span>
          </span>
        </Notice>
      ))}

      {unread > 0 && (
        <button onClick={onOpenQuestions} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--hsu)]/30 bg-[var(--hsu-soft)] p-4 text-left">
          <span className="flex items-center gap-2 font-semibold text-[var(--hsu-dark)]">
            <MessageCircle className="h-5 w-5" /> Fjarlækningar svöruðu {unread === 1 ? "spurningunni þinni" : `${unread} spurningum`}
          </span>
          <ChevronRight className="h-4 w-4 text-[var(--hsu)]" />
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction icon={<Send className="h-5 w-5" />} title="Senda hlekk í SMS" text="Sjúklingur fær hlekkinn í símann" onClick={onSms} />
        <QuickAction icon={<Search className="h-5 w-5" />} title="Leita í upplýsingum" text="Hentar erindið? Tilbúin svör" onClick={onSearch} />
        <QuickAction icon={<QrCode className="h-5 w-5" />} title="Sýna QR-kóða" text="Sjúklingur við borðið skannar" onClick={onQr} />
        {me.canMessage
          ? <QuickAction icon={<MessageCircle className="h-5 w-5" />} title="Spyrja Fjarlækningar" text="Við svörum hér og í pósti" onClick={onAsk} />
          : <QuickAction icon={<BookOpen className="h-5 w-5" />} title="Opna vefinn" text="fjarlaekningar.is/thjonusta" onClick={() => window.open("/thjonusta", "_blank", "noopener")} />}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Það helsta</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_FACTS.slice(0, 9).map((f) => (
            <div key={f.label} className={cx("rounded-xl border px-3 py-2.5",
              f.tone === "no" ? "border-red-200 bg-red-50/50" : f.tone === "ok" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white")}>
              <div className="text-sm font-bold text-slate-900">{f.label}</div>
              <div className="text-xs text-slate-600">{f.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickAction({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-[var(--hsu)]/40 hover:shadow-md">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hsu-soft)] text-[var(--hsu)]">{icon}</span>
      <span>
        <span className="block font-bold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </button>
  );
}

// ── QR-kóði ─────────────────────────────────────────────────────────────────

function QrCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="p-5 text-center">
      <h2 className="font-bold text-slate-900">Sjúklingur við borðið?</h2>
      <p className="mt-1 text-xs text-slate-500">Hann skannar kóðann með símanum í stað þess að fá SMS.</p>
      <div className="mt-3 flex justify-center"><Qr value={PORTAL_URL} size={180} /></div>
      <Button variant="ghost" size="sm" className="mt-3" onClick={onOpen}><QrCode className="h-4 w-4" /> Stækka</Button>
    </Card>
  );
}

function QrModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="QR-kóði">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end"><button onClick={onClose} aria-label="Loka" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <FjLogo size={44} />
        <h2 className="mt-3 text-2xl font-bold text-slate-900">Skannaðu til að byrja</h2>
        <p className="mt-1 text-sm text-slate-600">Opnaðu myndavélina í símanum og beindu henni að kóðanum.</p>
        <div className="mt-5 flex justify-center"><Qr value={PORTAL_URL} size={300} /></div>
        <p className="mt-4 text-lg font-bold text-[var(--hsu)]">fjarlaekningar.is</p>
        <p className="text-xs text-slate-500">Innskráning með rafrænum skilríkjum</p>
      </div>
    </div>
  );
}

// ── Stillingar ──────────────────────────────────────────────────────────────

function SettingsPanel({ me, refresh }: { me: VsMe; refresh: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <h1 className="text-xl font-bold">Stillingar</h1>
        <p className="text-sm text-slate-500">Innskráð(ur) sem <b className="text-slate-800">{me.email}</b></p>
      </div>
      <PasswordCard must={me.mustChangePassword} refresh={refresh} />
      <PinCard hasPin={me.hasPin} refresh={refresh} />
      <Card className="p-5 lg:col-span-2">
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
