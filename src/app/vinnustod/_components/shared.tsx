"use client";

// Smáhlutir vinnustöðvarinnar.

import { useEffect, useRef, useState } from "react";
import { BellOff, BellRing, X } from "lucide-react";
import qrcode from "qrcode-generator";

import { hsuApi as vsApi } from "@/app/hsu/_components/ui";

export { vsApi };

/** Merki Fjarlækninga (án orðmerkis). */
export function FjLogo({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/fjarlaekningar-mark.svg" width={size} height={size} alt="Fjarlækningar" className="shrink-0" />;
}

/** QR-kóði sem SVG — sjúklingur sem er á staðnum skannar hann í stað SMS. */
export function Qr({ value, size = 220 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={`QR-kóði: ${value}`}>
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#0b1220" />
    </svg>
  );
}

/**
 * Er opið núna? Opið alla daga kl. 10–22 (íslenskur tími, UTC allt árið).
 * Engin fullyrðing um nákvæman svartíma nálægt lokun: heimildirnar segja aðeins
 * „innan tveggja klukkustunda á opnunartíma“ og „eftir kl. 22 daginn eftir“.
 */
export function useServiceStatus() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const h = now.getUTCHours();
  const hhmm = `${String(h).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  if (h >= 10 && h < 22) return { open: true, clock: hhmm, text: "Opið núna", detail: "Læknir svarar innan tveggja klukkustunda." };
  if (h < 10) return { open: false, clock: hhmm, text: "Lokað — opnar kl. 10", detail: "Senda má erindi núna; því er svarað þegar opnar." };
  return { open: false, clock: hhmm, text: "Lokað — opnar kl. 10 á morgun", detail: "Erindum sem berast eftir kl. 22 er svarað daginn eftir." };
}

/** „16.9. kl. 16:55“ — óháð því hvort vafrinn á íslensk staðargögn. */
export function whenIs(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()}.${d.getMonth() + 1}. kl. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";

/** Skúffa sem rennur inn frá hægri — samtal, innhólf, stillingar. */
export function Drawer({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Loka" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div ref={panel} tabIndex={-1}
        className={`relative flex h-full w-full flex-col bg-slate-50 shadow-2xl outline-none ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Loka" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Hljóð við ný skilaboð ───────────────────────────────────────────────────
// Stuttur tvítóna hljómur búinn til í vafranum (engin hljóðskrá). Vafrar leyfa
// hljóð aðeins eftir að notandi hefur smellt á síðuna, svo hljóðkerfið er
// vakið við fyrsta smell.

let audio: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  audio ??= new AC();
  return audio;
}

/** Vekur hljóðkerfið við fyrsta smell svo hljómurinn fái að spilast síðar. */
export function useUnlockAudio() {
  useEffect(() => {
    const unlock = () => { void ctx()?.resume(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);
}

export function playChime() {
  const ac = ctx();
  if (!ac || ac.state !== "running") return;
  const now = ac.currentTime;
  [[880, 0], [1318.5, 0.14]].forEach(([freq, at]) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.55);
  });
}

const SOUND_KEY = "vs-sound";

/** Hljóð af/á — geymt í vafranum. Sjálfgefið á. */
export function useSoundPref(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(SOUND_KEY) === "off") setOn(false);
    } catch { /* einkagluggi — hljóð á */ }
  }, []);
  const set = (v: boolean) => {
    setOn(v);
    try { window.localStorage.setItem(SOUND_KEY, v ? "on" : "off"); } catch { /* sjá að ofan */ }
    if (v) { void ctx()?.resume().then(playChime); }
  };
  return [on, set];
}

/** Rauður punktur með fjölda — sést vel. */
export function UnreadDot({ count, className = "" }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    // Staðsetning kemur frá þeim sem notar punktinn (t.d. absolute í horni);
    // annars er hann relative svo blikkið haldist utan um töluna.
    <span className={`inline-flex ${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`} aria-label={`${count} ólesið`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
        {count}
      </span>
    </span>
  );
}

// ── Tafarlaus merki um ný skilaboð ──────────────────────────────────────────
// Rásin (topic) kemur frá /api/vinnustod/me og er leynileg fyrir hvern
// viðtakanda. Merkið ber ekkert efni — síðan sækir stöðuna sjálf. Að auki:
// merki frá þjónustuforritinu (tilkynning barst) og þegar glugginn fær fókus.

export function useLiveSignal(topic: string | null | undefined, onSignal: (kind: "message" | "focus") => void) {
  const cb = useRef(onSignal);
  useEffect(() => { cb.current = onSignal; });

  // Vafrar hægja á tímamælum í bakgrunnsflipa og tengingin getur rofnað án
  // þess að nokkur taki eftir. Því er rásin opnuð aftur ef hún lokast, þegar
  // flipinn verður sýnilegur og þegar netið kemur aftur.
  useEffect(() => {
    if (!topic) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let remove: (() => void) | undefined;
    let connected = false;
    let generation = 0;

    const connect = async () => {
      const { supabase } = await import("@/lib/supabase");
      if (cancelled) return;
      const mine = ++generation;
      remove?.(); // lokun gömlu rásarinnar kallar á „CLOSED“ — hunsað hér að neðan
      const ch = supabase.channel(topic, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "msg" }, () => cb.current("message"))
        .on("broadcast", { event: "sync" }, () => cb.current("focus"))
        .subscribe((status) => {
          if (mine !== generation) return;
          connected = status === "SUBSCRIBED";
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            clearTimeout(retry);
            if (!cancelled) retry = setTimeout(() => { void connect(); }, 3000);
          }
        });
      remove = () => { void supabase.removeChannel(ch); };
    };
    const revive = () => {
      if (document.visibilityState !== "visible") return;
      if (!connected) void connect();
    };

    void connect();
    document.addEventListener("visibilitychange", revive);
    window.addEventListener("online", revive);
    return () => {
      cancelled = true;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", revive);
      window.removeEventListener("online", revive);
      remove?.();
    };
  }, [topic]);

  useEffect(() => {
    const onSw = (e: MessageEvent) => { if (e.data?.type === "vs-new-message") cb.current("message"); };
    const onVisible = () => { if (document.visibilityState === "visible") cb.current("focus"); };
    navigator.serviceWorker?.addEventListener("message", onSw);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSw);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
}

/** Hljómur, en aldrei tvisvar með stuttu millibili (merki + könnun í senn). */
let lastChime = 0;
export function chimeOnce() {
  const now = Date.now();
  if (now - lastChime < 4000) return;
  lastChime = now;
  playChime();
}

// ── Tilkynningar í tæki (Web Push) ──────────────────────────────────────────

const SW_URL = "/vinnustod-sw.js";

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PushState = "unsupported" | "denied" | "off" | "on" | "busy";

/**
 * Hnappur: tilkynningar í þessu tæki á/af. Skráir þjónustuforritið, biður um
 * leyfi og vistar áskriftina. `staff` sendir innskráningu starfsmanns með.
 */
export function PushToggle({ vapidKey, variant = "dark" }: { vapidKey: string | null | undefined; variant?: "dark" | "light" }) {
  const [state, setState] = useState<PushState>("busy");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (alive) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") { if (alive) setState("denied"); return; }
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (!alive) return;
      setState(sub ? "on" : "off");
      // Endurnýja skráninguna hjá okkur (t.d. ef annar notandi var á sömu tölvu).
      if (sub) void vsApi("/api/vinnustod/push", { body: sub.toJSON(), staff: true });
    })().catch(() => { if (alive) setState("off"); });
    return () => { alive = false; };
  }, [vapidKey]);

  const turnOn = async () => {
    if (!vapidKey) return;
    setState("busy"); setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidKey) });
      const r = await vsApi("/api/vinnustod/push", { body: sub.toJSON(), staff: true });
      if (!r.ok) throw new Error(r.error ?? "Mistókst");
      setState("on");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Mistókst");
      setState("off");
    }
  };
  const turnOff = async () => {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await vsApi("/api/vinnustod/push", { method: "DELETE", body: { endpoint: sub.endpoint }, staff: true });
      await sub.unsubscribe();
    }
    setState("off");
  };

  if (state === "unsupported") return null;
  const dark = variant === "dark";
  const cls = dark
    ? "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold hover:bg-white/10"
    : "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
  const title = state === "on" ? "Tilkynningar í þessu tæki eru á — smelltu til að slökkva"
    : state === "denied" ? "Vafrinn hefur lokað á tilkynningar. Leyfðu þær í stillingum vafrans (lásinn við slóðina)."
    : "Fá tilkynningu um ný skilaboð þótt síðan sé lokuð";
  return (
    <button type="button" className={cls} title={err ?? title} aria-pressed={state === "on"}
      disabled={state === "busy" || state === "denied"}
      onClick={() => (state === "on" ? turnOff() : turnOn())}>
      {state === "on" ? <BellRing className="h-4 w-4" /> : <BellOff className={`h-4 w-4 ${dark ? "opacity-70" : ""}`} />}
      <span className={dark ? "hidden md:inline" : ""}>
        {state === "on" ? "Tilkynningar á" : state === "denied" ? "Tilkynningar bannaðar" : state === "busy" ? "…" : "Kveikja á tilkynningum"}
      </span>
    </button>
  );
}

// ── Rauður punktur á flipatákninu ───────────────────────────────────────────
// Teiknar merki síðunnar með rauðum punkti (og fjölda) á meðan eitthvað er
// ólesið, og setur upprunalega táknið aftur þegar allt er lesið.

let baseIcon: HTMLImageElement | null = null;

function iconLinks(): HTMLLinkElement[] {
  return [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
}

export function useFaviconBadge(count: number) {
  useEffect(() => {
    const links = iconLinks();
    for (const l of links) if (!l.dataset.orig) { l.dataset.orig = l.href; l.dataset.origType = l.type; }
    if (!count) {
      for (const l of links) { if (l.dataset.orig) l.href = l.dataset.orig; l.type = l.dataset.origType ?? ""; }
      return;
    }
    let cancelled = false;
    const draw = () => {
      if (cancelled || !baseIcon) return;
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      if (!g) return;
      g.drawImage(baseIcon, 0, 0, 64, 64);
      g.beginPath();
      g.arc(44, 20, 19, 0, Math.PI * 2);
      g.fillStyle = "#dc2626";
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = "#ffffff";
      g.stroke();
      g.fillStyle = "#ffffff";
      g.font = "bold 26px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(count > 9 ? "9+" : String(count), 44, 21);
      const url = c.toDataURL("image/png");
      for (const l of iconLinks()) { l.href = url; l.type = "image/png"; }
    };
    if (baseIcon?.complete) draw();
    else {
      baseIcon = new Image();
      baseIcon.onload = draw;
      baseIcon.src = "/icon.png";
    }
    return () => { cancelled = true; };
  }, [count]);
}

/** Enter sendir, Shift+Enter gefur nýja línu (og ekkert gerist á meðan stafir eru samsettir). */
export function onEnterSend(e: React.KeyboardEvent<HTMLTextAreaElement>, send: () => void) {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
  e.preventDefault();
  send();
}

export const ENTER_HINT = "Enter sendir · Shift+Enter ný lína";
