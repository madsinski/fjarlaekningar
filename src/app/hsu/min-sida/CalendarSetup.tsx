"use client";

// Fyrsta innskráning læknis: vaktirnar í dagatalið, ÁÐUR en kynningin hefst.
// Læknirinn velur dagatalið sitt (Google / Apple / Outlook / annað) og tengir það
// strax: Google með beinni samstillingu, hin með áskrift að persónulegum hlekk.
// Opnast líka úr skrefi 1 á Yfirliti („Tengja dagatal“).

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Calendar, Check, CheckCircle2, Copy, ExternalLink, Link2, Mail, X } from "lucide-react";
import qrcode from "qrcode-generator";
import { useT } from "@/lib/hsu/i18n/client";
import { calendarSetup } from "@/lib/hsu/i18n/messages/calendar-setup";
import { Notice, cx, firstName, hsuApi } from "../_components/ui";

type Choice = "google" | "apple" | "outlook" | "other";

function Qr({ value, size = 150 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="QR">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#0b1220" />
    </svg>
  );
}

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" /><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.8 9.4 6 12 6z" /></svg>
);
const AppleMark = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden><path fill="#111827" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9A4.9 4.9 0 0 0 3.7 9.5c-1.8 3-.5 7.6 1.2 10.1.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.8 1.3-2.8s-2.3-.9-2.3-3.5zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z" /></svg>
);

export default function CalendarSetup({ name, open, onClose }: {
  name: string;
  open: boolean;
  /** done = læknirinn tengdi dagatal (eða staðfesti það); annars „Seinna“. */
  onClose: (done: boolean) => void;
}) {
  const t = useT(calendarSetup);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [googleOk, setGoogleOk] = useState<boolean | null>(null);
  // Komið til baka frá Google: ?welcome=calendar&google=connected|<villa>
  const [googleReturn] = useState(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search);
    return q.get("welcome") === "calendar" ? q.get("google") : null;
  });

  const loadIcs = useCallback(async () => {
    const r = await hsuApi<{ url: string }>("/api/hsu/me/calendar-token", { body: {} });
    if (r.ok) setIcsUrl(r.url);
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (googleReturn) setChoice("google");
    void hsuApi<{ configured: boolean }>("/api/hsu/me/google").then((r) => setGoogleOk(r.ok ? r.configured : false));
  }, [open, googleReturn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && choice && choice !== "google" && !icsUrl) void loadIcs();
  }, [open, choice, icsUrl, loadIcs]);

  // Hreinsa ?welcome/?google úr slóðinni svo glugginn opnist ekki aftur við endurhleðslu.
  const clearQuery = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome"); url.searchParams.delete("google");
    window.history.replaceState(null, "", url);
  };
  const close = (done: boolean) => { clearQuery(); setChoice(null); onClose(done); };

  if (!open) return null;

  const webcal = icsUrl?.replace(/^https?:/, "webcal:") ?? "";
  const outlookUrl = icsUrl ? `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(icsUrl)}&name=${encodeURIComponent("HSU — vaktir")}` : "";
  const copy = async () => {
    if (!icsUrl) return;
    try { await navigator.clipboard.writeText(icsUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ekkert */ }
  };
  const connected = googleReturn === "connected";

  const tiles: { key: Choice; icon: React.ReactNode; label: string; hint: string }[] = [
    { key: "google", icon: <GoogleMark />, label: t("choice.google"), hint: t("choice.google.hint") },
    { key: "apple", icon: <AppleMark />, label: t("choice.apple"), hint: t("choice.apple.hint") },
    { key: "outlook", icon: <Mail className="h-6 w-6 text-[#0a64c9]" />, label: t("choice.outlook"), hint: t("choice.outlook.hint") },
    { key: "other", icon: <Calendar className="h-6 w-6 text-slate-600" />, label: t("choice.other"), hint: t("choice.other.hint") },
  ];

  const linkRow = (
    <div className="mt-3 flex items-center gap-2">
      <button onClick={() => void copy()} disabled={!icsUrl}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? t("copied") : t("copy")}
      </button>
      <span className="text-[11px] text-slate-500">{t("private")}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cal-setup-title" data-testid="calendar-setup">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hsu)]">{t("eyebrow")}</div>
            <h2 id="cal-setup-title" className="mt-0.5 text-xl font-bold text-slate-900">{t("title")}</h2>
          </div>
          <button onClick={() => close(false)} aria-label={t("later")} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        {!choice && (
          <>
            <p className="mt-2 text-sm text-slate-600"><b>{t("welcome", { name: firstName(name) })}</b> {t("intro")}</p>
            <div className="mt-4 text-sm font-semibold text-slate-800">{t("question")}</div>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {tiles.map((c) => (
                <button key={c.key} type="button" onClick={() => setChoice(c.key)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-[var(--hsu)] hover:bg-[var(--hsu-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--hsu)]/30">
                  {c.icon}
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{c.label}</span>
                    <span className="block text-[11px] text-slate-500">{c.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button onClick={() => close(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-700 hover:underline">{t("later")}</button>
            </div>
          </>
        )}

        {choice && (
          <div className="mt-3">
            {!connected && (
              <button onClick={() => setChoice(null)} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
              </button>
            )}

            {choice === "google" && (
              connected ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                  <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> {t("google.connected")}</div>
                  <p className="mt-1 text-sm">{t("google.connectedBody")}</p>
                </div>
              ) : (
                <>
                  <h3 className="flex items-center gap-2 text-base font-bold"><GoogleMark /> {t("google.title")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("google.body")}</p>
                  {googleReturn && googleReturn !== "connected" && <div className="mt-3"><Notice tone="warn">{t("google.failed", { error: googleReturn })}</Notice></div>}
                  {googleOk === false ? (
                    <div className="mt-3"><Notice tone="warn">{t("google.unavailable")}</Notice></div>
                  ) : (
                    <a href="/api/hsu/me/google/start?return=welcome"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--hsu)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)] sm:w-auto">
                      <Link2 className="h-4 w-4" /> {t("google.connect")}
                    </a>
                  )}
                </>
              )
            )}

            {choice === "apple" && (
              <>
                <h3 className="flex items-center gap-2 text-base font-bold"><AppleMark /> {t("apple.title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("apple.body")}</p>
                {!icsUrl ? <p className="mt-3 text-sm text-slate-500">{t("loading")}</p> : (
                  <>
                    <a href={webcal} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto">
                      {t("apple.button")}
                    </a>
                    <div className="mt-4 hidden items-center gap-4 rounded-2xl bg-slate-50 p-3 sm:flex">
                      <Qr value={webcal} size={120} />
                      <p className="text-xs text-slate-600">{t("apple.qr")}</p>
                    </div>
                    {linkRow}
                  </>
                )}
              </>
            )}

            {choice === "outlook" && (
              <>
                <h3 className="flex items-center gap-2 text-base font-bold"><Mail className="h-6 w-6 text-[#0a64c9]" /> {t("outlook.title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("outlook.body")}</p>
                {!icsUrl ? <p className="mt-3 text-sm text-slate-500">{t("loading")}</p> : (
                  <>
                    <a href={outlookUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a64c9] px-4 py-3 text-sm font-semibold text-white hover:brightness-95 sm:w-auto">
                      <ExternalLink className="h-4 w-4" /> {t("outlook.button")}
                    </a>
                    <p className="mt-3 text-xs text-slate-500">{t("outlook.app")}</p>
                    {linkRow}
                  </>
                )}
              </>
            )}

            {choice === "other" && (
              <>
                <h3 className="flex items-center gap-2 text-base font-bold"><Calendar className="h-6 w-6 text-slate-600" /> {t("other.title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("other.body")}</p>
                {!icsUrl ? <p className="mt-3 text-sm text-slate-500">{t("loading")}</p> : (
                  <>
                    <code className="mt-3 block break-all rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700">{icsUrl}</code>
                    {linkRow}
                  </>
                )}
              </>
            )}

            <p className="mt-4 text-[11px] text-slate-500">{t("calendarName")}</p>
            <div className={cx("mt-5 flex flex-wrap items-center gap-3", connected ? "justify-end" : "justify-between")}>
              {!connected && <button onClick={() => close(false)} className="text-sm font-semibold text-slate-500 hover:underline">{t("later")}</button>}
              {(connected || choice !== "google") && (
                <button onClick={() => close(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--hsu)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--hsu-dark)]">
                  {t("done")} <Check className="h-4 w-4" />
                </button>
              )}
            </div>
            {choice !== "google" && <p className="mt-2 text-right text-[11px] text-slate-400">{t("doneHint")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
