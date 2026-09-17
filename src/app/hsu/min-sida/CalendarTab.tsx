"use client";

// Dagatalstengingar: bein Google-samstilling (push) og áskrift (Apple/Outlook).

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Apple, Check, Copy, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { Badge, Button, Card, Notice, hsuApi } from "../_components/ui";
import { useT } from "@/lib/hsu/i18n/client";
import { timeAgoL } from "@/lib/hsu/i18n/format";
import { account } from "@/lib/hsu/i18n/messages/account";

interface GoogleStatus {
  configured: boolean; connected: boolean; email: string | null; enabled: boolean;
  lastSyncAt: string | null; lastError: string | null; calendarName: string;
}

export default function CalendarTab({ hasToken }: { hasToken: boolean }) {
  const t = useT(account);
  const [g, setG] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justConnected] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("google") === "connected");
  const [googleErr] = useState(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("google");
    return v && v !== "connected" ? v : null;
  });

  const loadGoogle = useCallback(async () => {
    const r = await hsuApi<GoogleStatus>("/api/hsu/me/google");
    if (r.ok) setG(r);
  }, []);

  const loadIcs = useCallback(async (rotate = false) => {
    const r = await hsuApi<{ url: string }>("/api/hsu/me/calendar-token", { body: { rotate } });
    if (r.ok) setIcsUrl(r.url);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGoogle();
    if (hasToken) void loadIcs();
    if (!justConnected) return;
    const timer = setTimeout(() => { void loadGoogle(); }, 2500);
    return () => clearTimeout(timer);
  }, [loadGoogle, loadIcs, hasToken, justConnected]);

  const webcal = icsUrl?.replace(/^https?:/, "webcal:") ?? "";
  const googleSubscribe = icsUrl ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` : "";

  const copy = async () => {
    if (!icsUrl) return;
    try { await navigator.clipboard.writeText(icsUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">{t("cal.title")}</h2>
        <p className="text-sm text-slate-500">{t("cal.intro")}</p>
      </div>

      {/* Google — bein samstilling */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-base font-bold">
            <RefreshCw className="h-5 w-5 text-[var(--hsu)]" /> {t("cal.google.title")}
            {g?.connected && <Badge tone="green"><Check className="h-3 w-3" /> {t("cal.google.connected")}</Badge>}
          </div>
          <Badge tone="blue">{t("cal.google.instant")}</Badge>
        </div>

        {!g ? (
          <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100" />
        ) : !g.configured ? (
          <p className="mt-3 text-sm text-slate-500">{t("cal.google.notConfigured")}</p>
        ) : !g.connected ? (
          <>
            <p className="mt-2 text-sm text-slate-600">{t("cal.google.connectHint")}</p>
            {googleErr && <div className="mt-3"><Notice tone="warn">{t("cal.google.error", { error: googleErr })}</Notice></div>}
            <a href="/api/hsu/me/google/start" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--hsu)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)]">
              <Link2 className="h-4 w-4" /> {t("cal.google.connect")}
            </a>
            <p className="mt-3 text-[11px] text-slate-500">{t("cal.google.privacy", { name: g.calendarName })} <a href="/personuvernd-starfsfolks" target="_blank" rel="noopener noreferrer" className="underline">{t("cal.google.privacyLink")}</a></p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">{g.email ?? t("cal.google.account")} · {t("cal.google.calendarName", { name: g.calendarName })}</p>
            {justConnected && <div className="mt-3"><Notice tone="ok">{t("cal.google.justConnected")}</Notice></div>}
            {g.lastError && <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {g.lastError}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={g.enabled} disabled={busy !== null} className="h-4 w-4"
                  onChange={async () => { setBusy("toggle"); await hsuApi("/api/hsu/me/google", { method: "PATCH", body: { enabled: !g.enabled } }); await loadGoogle(); setBusy(null); }} />
                {t("cal.google.enabled")}
              </label>
              <span className="text-xs text-slate-500">{t("cal.google.lastSync", { ago: timeAgoL(g.lastSyncAt, t.lang) })}</span>
              <Button variant="ghost" size="sm" busy={busy === "disc"} onClick={async () => {
                if (!confirm(t("cal.google.disconnectConfirm", { name: g.calendarName }))) return;
                setBusy("disc"); await hsuApi("/api/hsu/me/google", { method: "DELETE" }); await loadGoogle(); setBusy(null);
              }}><Unlink className="h-3.5 w-3.5" /> {t("cal.google.disconnect")}</Button>
            </div>
          </>
        )}
      </Card>

      {/* Áskrift — Apple, Outlook, Google */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-base font-bold"><Apple className="h-5 w-5 text-slate-800" /> {t("cal.ics.title")}</div>
          <Badge tone="slate">{t("cal.ics.auto")}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {t("cal.ics.intro")}
        </p>
        {!icsUrl ? (
          <Button className="mt-4" onClick={async () => { setBusy("ics"); await loadIcs(); setBusy(null); }} busy={busy === "ics"}>{t("cal.ics.create")}</Button>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={webcal} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
                <Apple className="h-4 w-4" /> {t("cal.ics.apple")}
              </a>
              <a href={googleSubscribe} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {t("cal.ics.google")}
              </a>
              <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? t("cal.ics.copied") : t("cal.ics.copy")}
              </button>
            </div>
            <details className="mt-4 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-700">{t("cal.ics.help")}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li><b>{t("cal.ics.help.iphoneLabel")}</b> {t("cal.ics.help.iphone")}</li>
                <li><b>{t("cal.ics.help.outlookLabel")}</b> {t("cal.ics.help.outlook")}</li>
                <li><b>{t("cal.ics.help.googleLabel")}</b> {t("cal.ics.help.google")}</li>
              </ul>
            </details>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-[11px] text-slate-500">{t("cal.ics.personal")}</span>
              <button className="shrink-0 text-xs font-semibold text-[var(--hsu)] hover:underline" disabled={busy !== null}
                onClick={async () => { if (!confirm(t("cal.ics.rotateConfirm"))) return; setBusy("rot"); await loadIcs(true); setBusy(null); }}>
                {busy === "rot" ? <Loader2 className="h-3 w-3 animate-spin" /> : t("cal.ics.rotate")}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
