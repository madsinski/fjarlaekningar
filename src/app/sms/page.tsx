"use client";

// SMS til sjúklinga — hlekkur á þjónustuna sendur í samtali.
//
// Starfsmaður velur sniðmát, slær inn símanúmer og sendir. Textinn er fastur:
// hann er á hvítlista hjá símafyrirtækjunum og sjúklingur á alltaf að fá sama
// skeytið. Listinn að neðan sýnir hvað varð um hverja sendingu — sérstaklega
// hvort skeytið komst til skila, því síað skeyti lítur út eins og heppnuð
// sending þar til símafyrirtækið svarar.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, MessageCircle, Send, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SmsRow {
  id: string;
  created_at: string;
  sent_by_name: string;
  to_number: string;
  body: string;
  template: string;
  segments: number;
  status: string;
  error_code: number | null;
  error_text: string;
  delivered_at: string | null;
}
interface Template { key: string; label: string; body: string; lang: string }

const STATUS_IS: Record<string, string> = {
  queued: "Í biðröð", accepted: "Móttekið", sending: "Í sendingu", sent: "Sent",
  delivered: "Komið til skila", undelivered: "Komst ekki til skila", failed: "Mistókst",
  "dry-run": "Þurrkeyrsla",
};

function StatusPill({ row }: { row: SmsRow }) {
  const bad = row.status === "undelivered" || row.status === "failed";
  const good = row.status === "delivered";
  const Icon = bad ? XCircle : good ? CheckCircle2 : Clock;
  return (
    <span
      title={row.error_text || undefined}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        bad ? "bg-red-50 text-red-700" : good ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}>
      <Icon className="h-3.5 w-3.5" /> {STATUS_IS[row.status] ?? row.status}
    </span>
  );
}

export default function SmsPage() {
  const [rows, setRows] = useState<SmsRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sender, setSender] = useState("");
  const [tpl, setTpl] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "warn"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ name: string; kind: string; isAdmin: boolean } | null>(null);
  const [denied, setDenied] = useState(false);

  const auth = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/sms/send", { headers: await auth(), credentials: "include" });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      setRows(j.messages ?? []);
      setTemplates(j.templates ?? []);
      setSender(j.sender ?? "");
      setMe(j.me ?? null);
      setDenied(false);
      setTpl((t) => t || j.templates?.[0]?.key || "");
    } else if (res.status === 403) {
      setDenied(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const active = templates.find((t) => t.key === tpl);
  // Sama og þjónninn gerir, svo forskoðunin sé rétt.
  const preview = useMemo(() => {
    if (!active) return "";
    const first = name.trim().split(/\s+/)[0] ?? "";
    return active.body.replace("{nafn}", first ? `${first}, ` : "");
  }, [active, name]);

  // Íslenskir stafir þýða 70 stafi í hlutann í stað 160.
  const size = useMemo(() => {
    const gsm = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅåÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r]*$/.test(preview);
    const per = gsm ? 160 : 70;
    const multi = gsm ? 153 : 67;
    const n = preview.length;
    return { gsm, chars: n, segments: n <= per ? 1 : Math.ceil(n / multi) };
  }, [preview]);

  const digits = phone.replace(/\D/g, "");
  const validPhone = digits.length === 7 || (digits.length === 10 && digits.startsWith("354"));

  const send = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await auth()) },
      credentials: "include",
      body: JSON.stringify({ to: phone, template: tpl, name }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!j.ok) { setMsg({ tone: "err", text: j.error ?? "Sendingin mistókst" }); await load(); return; }
    setMsg(j.dryRun
      ? { tone: "warn", text: "Þurrkeyrsla — Twilio-lyklar eru ekki komnir í umhverfið, svo ekkert skeyti fór út." }
      : { tone: "ok", text: `Sent á ${j.pretty}. Fylgstu með stöðunni hér að neðan — hún endar í „Komið til skila“.` });
    setPhone(""); setName("");
    await load();
  };

  const filtered = rows.filter((r) => r.error_code === 30007).length;

  if (denied) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-slate-900">Skráðu þig inn</h1>
        <p className="mt-2 text-sm text-slate-600">
          SMS-gáttin er fyrir starfsfólk. Skráðu þig inn með aðgangi Fjarlækninga eða HSU-vaktakerfisins.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <a href="/admin/login" className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">Fjarlækningar</a>
          <a href="/hsu" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">HSU-vaktakerfi</a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><MessageCircle className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SMS til sjúklinga</h1>
          <p className="text-sm text-slate-500">
            Sendu sjúklingi hlekk á þjónustuna í stað þess að stafa slóðina upphátt.
            {sender && <> Sendandi: <b>{sender}</b> — ekki er hægt að svara skeytinu.</>}
            {me && <span className="ml-1 text-slate-400">· skráð(ur) inn sem {me.name}</span>}
          </p>
        </div>
      </div>

      {filtered > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{filtered} skeyti voru síuð af símafyrirtæki (villa 30007).</b> Það þýðir að vefslóðin er ekki komin á
            hvítlista hjá Twilio. Sendu inn beiðni um það áður en fleiri skeyti eru send.
          </span>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Nýtt skeyti</h2>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Sniðmát</label>
          <select value={tpl} onChange={(e) => setTpl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Símanúmer sjúklings</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="555 1234"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-slate-500">Sjö tölustafir. Erlent númer þarf + og landsnúmer.</p>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Nafn sjúklings <span className="font-normal text-slate-400">(valkvætt)</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="t.d. Anna"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Skeytið eins og það berst</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{preview}</p>
            <div className="mt-2 text-xs text-slate-500">
              {size.chars} stafir · {size.segments} hluti{size.segments === 1 ? "" : "r"}
              {!size.gsm && " · íslenskir stafir þýða 70 stafi í hlutann"}
            </div>
          </div>

          {msg && (
            <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${
              msg.tone === "err" ? "bg-red-50 text-red-700" : msg.tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
              {msg.text}
            </div>
          )}

          <button onClick={send} disabled={!validPhone || busy || !tpl}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senda skeyti
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Sendingar</h2>
          {loading ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Engin skeyti send enn.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{r.to_number}</span>
                    <StatusPill row={r} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString("is-IS")} · {r.sent_by_name}
                    {r.segments > 1 && ` · ${r.segments} hlutar`}
                  </div>
                  {r.error_text && <div className="mt-1 text-xs text-red-600">{r.error_text}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
