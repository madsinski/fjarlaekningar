"use client";

// Senda sjúklingi hlekk á þjónustuna í SMS — og sjá hvað varð um sendingarnar.
//
// Textinn er fastur (sniðmát): hann er á hvítlista hjá símafyrirtækjunum og
// sjúklingur á alltaf að fá sama skeytið. Síað skeyti lítur út eins og heppnuð
// sending þar til símafyrirtækið svarar, svo staðan er sýnd og viðvörun birtist
// ef eitthvað var síað (villa 30007).

import { forwardRef, useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Send, XCircle } from "lucide-react";
import { Card, Notice, cx, inputCls } from "@/app/hsu/_components/ui";
import { vsApi, whenIs } from "./shared";

interface SmsRow {
  id: string;
  created_at: string;
  sent_by_name: string;
  to_number: string;
  segments: number;
  status: string;
  error_code: number | null;
  error_text: string;
}
interface Template { key: string; label: string; body: string; lang?: "is" | "en"; target?: "portal" | "site" }

const STATUS_IS: Record<string, string> = {
  queued: "Í biðröð", accepted: "Móttekið", sending: "Í sendingu", sent: "Sent",
  delivered: "Komið til skila", undelivered: "Komst ekki til skila", failed: "Mistókst", "dry-run": "Þurrkeyrsla",
};

function StatusPill({ row }: { row: SmsRow }) {
  const bad = row.status === "undelivered" || row.status === "failed";
  const good = row.status === "delivered";
  const Icon = bad ? XCircle : good ? CheckCircle2 : Clock;
  return (
    <span title={row.error_text || undefined}
      className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        bad ? "bg-red-50 text-red-700" : good ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
      <Icon className="h-3.5 w-3.5" /> {STATUS_IS[row.status] ?? row.status}
    </span>
  );
}

const SmsPanel = forwardRef<HTMLInputElement, { compact?: boolean }>(function SmsPanel({ compact }, phoneRef) {
  const [rows, setRows] = useState<SmsRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sender, setSender] = useState("");
  const [tpl, setTpl] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "warn"; text: string } | null>(null);
  const [allHistory, setAllHistory] = useState(false);

  const load = useCallback(async () => {
    const r = await vsApi<{ messages: SmsRow[]; templates: Template[]; sender: string }>("/api/sms/send", { staff: true });
    if (r.ok) {
      setRows(r.messages ?? []);
      setTemplates(r.templates ?? []);
      setSender(r.sender ?? "");
      setTpl((t) => t || r.templates?.[0]?.key || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // Staða sendinga breytist eftir á (Twilio svarar); endurnýjað reglulega.
    const t = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const active = templates.find((t) => t.key === tpl);
  const target = active?.target ?? "portal";
  const lang = active?.lang ?? "is";
  /** Velja sniðmát út frá hlekk og tungumáli. */
  const pick = (t: "portal" | "site", l: "is" | "en") => {
    const found = templates.find((x) => (x.target ?? "portal") === t && (x.lang ?? "is") === l);
    if (found) setTpl(found.key);
  };
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const preview = active ? active.body.replace("{nafn}", firstName ? `${firstName}, ` : "") : "";

  // Íslenskir stafir þýða 70 stafi í hlutann í stað 160.
  const gsm = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅåÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r]*$/.test(preview);
  const size = { gsm, chars: preview.length, segments: preview.length <= (gsm ? 160 : 70) ? 1 : Math.ceil(preview.length / (gsm ? 153 : 67)) };

  const digits = phone.replace(/\D/g, "");
  const validPhone = digits.length === 7 || (digits.length === 10 && digits.startsWith("354")) || (phone.trim().startsWith("+") && digits.length >= 8);

  const send = async () => {
    setBusy(true); setMsg(null);
    const r = await vsApi<{ dryRun: boolean; pretty: string }>("/api/sms/send", { body: { to: phone, template: tpl, name }, staff: true });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Sendingin mistókst" }); await load(); return; }
    setMsg(r.dryRun
      ? { tone: "warn", text: "Þurrkeyrsla — SMS-aðgangurinn er ekki virkur, svo ekkert skeyti fór út." }
      : { tone: "ok", text: `Sent á ${r.pretty}. Staðan hér að neðan endar í „Komið til skila“.` });
    setPhone(""); setName("");
    await load();
  };

  const filtered = rows.filter((r) => r.error_code === 30007).length;
  const limit = compact ? 3 : 8;
  const shown = allHistory ? rows : rows.slice(0, limit);

  return (
    <div className="space-y-4">
      {filtered > 0 && (
        <Notice tone="warn">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><b>{filtered} skeyti voru síuð af símafyrirtæki.</b> Láttu Fjarlækningar vita undir „Spurningar“ — vefslóðin þarf að fara á hvítlista.</span>
          </span>
        </Notice>
      )}

      <Card className={cx("border-cyan-200 shadow-sm", compact ? "p-4" : "p-5")}>
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--hsu)] text-white"><Send className="h-4 w-4" /></span>
          Senda hlekk í SMS
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Sendandi: <b>{sender || "Fjarlaeknir"}</b> — sjúklingur getur ekki svarað skeytinu.
        </p>

        <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="sms-phone">Símanúmer sjúklings</label>
        <input id="sms-phone" ref={phoneRef} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="555 1234"
          onKeyDown={(e) => { if (e.key === "Enter" && validPhone && !busy) void send(); }}
          className={cx(inputCls, "mt-1 text-lg tracking-wide")} />
        <p className="mt-1 text-xs text-slate-500">Sjö tölustafir. Erlent númer þarf + og landsnúmer.</p>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-slate-700">Hlekkurinn fer á</legend>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {([["portal", "Sjúklingagátt", "hefja erindi"], ["site", "fjarlaekningar.is", "upplýsingar"]] as const).map(([k, title, sub]) => (
              <button key={k} type="button" aria-pressed={target === k} onClick={() => pick(k, lang)}
                className={cx("rounded-xl px-3 py-2 text-left ring-1 transition",
                  target === k ? "bg-[var(--hsu)] text-white ring-[var(--hsu)]" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")}>
                <span className="block text-sm font-semibold">{title}</span>
                <span className={cx("block text-[11px]", target === k ? "text-white/80" : "text-slate-500")}>{sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Tungumál</legend>
            <div className="mt-1 inline-flex w-full rounded-xl bg-slate-100 p-0.5">
              {([["is", "Íslenska"], ["en", "English"]] as const).map(([l, label]) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => pick(target, l)}
                  className={cx("flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition", lang === l ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="sms-name">Fornafn <span className="font-normal text-slate-400">(valkvætt)</span></label>
            <input id="sms-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="t.d. Anna" className={cx(inputCls, "mt-1")} />
          </div>
        </div>

        <details className="mt-3 rounded-xl bg-slate-50 p-3" open={!compact}>
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-500">Skeytið eins og það berst</summary>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{preview}</p>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {size.chars} stafir · {size.segments} hluti{size.segments === 1 ? "" : "r"}
          </div>
        </details>

        {msg && <div className="mt-3"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

        <button onClick={send} disabled={!validPhone || busy || !tpl}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--hsu)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)] disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senda skeyti
        </button>
      </Card>

      <Card className={compact ? "p-4" : "p-5"}>
        <h2 className="text-sm font-bold text-slate-900">Síðustu sendingar</h2>
        {loading ? (
          <div className="mt-3 h-20 animate-pulse rounded-xl bg-slate-100" />
        ) : shown.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Engin skeyti send enn.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {shown.map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-slate-800">{r.to_number}</span>
                  <StatusPill row={r} />
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {whenIs(r.created_at)} · {r.sent_by_name}
                </div>
                {r.error_text && <div className="mt-1 text-xs text-red-600">{r.error_text}</div>}
              </li>
            ))}
          </ul>
        )}
        {rows.length > limit && (
          <button type="button" onClick={() => setAllHistory((v) => !v)} className="mt-2 text-xs font-semibold text-[var(--hsu-dark)] hover:underline">
            {allHistory ? "Sýna færri" : `Sýna allar (${rows.length})`}
          </button>
        )}
      </Card>
    </div>
  );
});

export default SmsPanel;
