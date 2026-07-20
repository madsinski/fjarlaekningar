"use client";

// Email-signature builder (ported from lifeline-website). One card per team
// member with editable fields, a live preview across design variants, and two
// copy actions: "Copy formatted" (rich clipboard payload Gmail consumes) and
// "Copy HTML source". Edits persist to the email_signatures table via
// /api/admin/signatures so everyone sees the same values on any device.
// Editing is admin-only; any active staff can view + copy.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SignatureFields {
  key: string;
  name: string;
  title: string;
  phone: string; // E.164 ideally, e.g. +354 767 4393
  email: string;
}

const SITE_URL = "https://www.fjarlaekningar.is";
const WEB_LABEL = "fjarlaekningar.is";
// Absolute asset URLs, resolved from the current origin so the signature works
// on whatever host the admin is served from (falls back to the prod domain
// during SSR when window is unavailable). Email clients need absolute URLs.
function assetBase(): string {
  return typeof window !== "undefined" ? window.location.origin : SITE_URL;
}

type DesignKey = "stacked" | "compact" | "card";

const DESIGN_LABELS: Record<DesignKey, string> = {
  stacked: "Súla",
  compact: "Þétt",
  card: "Spjald",
};

const DESIGN_BLURBS: Record<DesignKey, string> = {
  stacked: "Fullt orðmerki efst með cyan-línu undir nafninu. Best fyrir fyrstu kynningarpósta.",
  compact: "Merki vinstra megin, upplýsingar hægra megin. Minna pláss — hentar svörum og þráðum.",
  card: "Merki + upplýsingar í mjúku cyan-lituðu spjaldi. Sterkust vörumerkjanotkun — fyrir kynningarpósta.",
};

// Contact details rendered as plain styled text, not <a> links — Gmail/Apple
// Mail force their own underline onto anchors regardless of text-decoration.
function contact(text: string, color: string, extraStyle = ""): string {
  return `<span style="color:${color};text-decoration:none;${extraStyle}">${escapeHtml(text)}</span>`;
}

// Gmail/Apple Mail auto-linkify anything that looks like an email or URL. A
// zero-width space breaks the pattern so the auto-linker no longer matches.
const ZWSP = "​";
function noAutoLinkUrl(text: string): string {
  return text.replace(/\.([a-z]{2,})(?=$|\/|\b)/i, `${ZWSP}.$1`);
}
function noAutoLinkEmail(email: string): string {
  return noAutoLinkUrl(email.replace("@", `@${ZWSP}`));
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ─── Design 1: Stacked ──────────────────────────────────────────────
function buildStacked(s: SignatureFields): string {
  const LOGO_URL = `${assetBase()}/fjarlaekningar-logo.png`;
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1F2937;line-height:1.4;">`,
    `<tr><td style="padding-bottom:10px;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;border-bottom:0;">`,
    `<img src="${LOGO_URL}" alt="Fjarlækningar" width="200" style="display:block;border:0;outline:none;width:200px;height:auto;">`,
    `</a></td></tr>`,
    `<tr><td style="padding-bottom:8px;border-bottom:2px solid #00a8cc;">`,
    `<span style="font-size:15px;font-weight:700;color:#111827;">${escapeHtml(s.name)}</span><br>`,
    `<span style="font-size:12px;color:#6B7280;letter-spacing:0.2px;">${escapeHtml(s.title)}</span>`,
    `</td></tr>`,
    `<tr><td style="padding-top:8px;font-size:12px;color:#4B5563;">`,
    contact(s.phone, "#4B5563"),
    ` &middot; `,
    contact(noAutoLinkEmail(s.email), "#4B5563"),
    ` &middot; `,
    contact(noAutoLinkUrl(WEB_LABEL), "#0891b2", "font-weight:600;"),
    `</td></tr>`,
    `</table>`,
  ].join("");
}

// ─── Design 2: Compact ──────────────────────────────────────────────
function buildCompact(s: SignatureFields): string {
  const MARK_URL = `${assetBase()}/fjarlaekningar-mark.svg`;
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1F2937;line-height:1.35;">`,
    `<tr>`,
    `<td valign="top" style="padding-right:12px;border-right:1px solid #E5E7EB;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;border-bottom:0;">`,
    `<img src="${MARK_URL}" alt="Fjarlækningar" width="44" height="44" style="display:block;border:0;outline:none;width:44px;height:44px;">`,
    `</a>`,
    `</td>`,
    `<td valign="top" style="padding-left:12px;">`,
    `<div style="font-size:14px;font-weight:700;color:#111827;">${escapeHtml(s.name)}</div>`,
    `<div style="font-size:11.5px;color:#6B7280;padding-bottom:4px;">${escapeHtml(s.title)}</div>`,
    `<div style="font-size:11.5px;color:#4B5563;">`,
    contact(s.phone, "#4B5563"),
    ` &middot; `,
    contact(noAutoLinkEmail(s.email), "#4B5563"),
    `</div>`,
    `<div style="font-size:11.5px;padding-top:1px;">`,
    contact(noAutoLinkUrl(WEB_LABEL), "#0891b2", "font-weight:600;"),
    `</div>`,
    `</td>`,
    `</tr>`,
    `</table>`,
  ].join("");
}

// ─── Design 3: Card ─────────────────────────────────────────────────
function buildCard(s: SignatureFields): string {
  const LOGO_URL = `${assetBase()}/fjarlaekningar-logo.png`;
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1F2937;line-height:1.4;">`,
    `<tr><td style="background-color:#ECFEFF;border:1px solid #A5F3FC;border-radius:12px;padding:16px 18px;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;border-bottom:0;">`,
    `<img src="${LOGO_URL}" alt="Fjarlækningar" width="180" style="display:block;border:0;outline:none;width:180px;height:auto;margin-bottom:12px;">`,
    `</a>`,
    `<div style="font-size:15px;font-weight:700;color:#0E4A5B;">${escapeHtml(s.name)}</div>`,
    `<div style="font-size:12px;color:#0E7490;padding-bottom:10px;">${escapeHtml(s.title)}</div>`,
    `<div style="font-size:12px;color:#155E75;line-height:1.7;">`,
    contact(s.phone, "#155E75"),
    ` &middot; `,
    contact(noAutoLinkEmail(s.email), "#155E75"),
    ` &middot; `,
    contact(noAutoLinkUrl(WEB_LABEL), "#0891b2", "font-weight:700;"),
    `</div>`,
    `</td></tr>`,
    `</table>`,
  ].join("");
}

const DESIGN_BUILDERS: Record<DesignKey, (s: SignatureFields) => string> = {
  stacked: buildStacked,
  compact: buildCompact,
  card: buildCard,
};

export default function SignaturesPage() {
  const [sigs, setSigs] = useState<SignatureFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saveState, setSaveState] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
          setIsAdmin(me?.role === "admin");
        }
        const headers = await authHeader();
        const res = await fetch("/api/admin/signatures", { headers });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `HTTP ${res.status}`);
        }
        const j = await res.json();
        setSigs((j.signatures || []) as SignatureFields[]);
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [authHeader]);

  const persist = useCallback(async (next: SignatureFields) => {
    setSaveState((prev) => ({ ...prev, [next.key]: "saving" }));
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch("/api/admin/signatures", { method: "PUT", headers, body: JSON.stringify(next) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setSaveState((prev) => ({ ...prev, [next.key]: "saved" }));
      setTimeout(() => {
        setSaveState((prev) => (prev[next.key] === "saved" ? { ...prev, [next.key]: "idle" } : prev));
      }, 1600);
    } catch {
      setSaveState((prev) => ({ ...prev, [next.key]: "error" }));
    }
  }, [authHeader]);

  const updateField = (key: string, field: keyof SignatureFields, value: string) => {
    setSigs((prev) => {
      const next = prev.map((s) => (s.key === key ? { ...s, [field]: value } : s));
      const updated = next.find((s) => s.key === key);
      if (updated) {
        clearTimeout(saveTimers.current[key]);
        saveTimers.current[key] = setTimeout(() => persist(updated), 600);
      }
      return next;
    });
  };

  const saveNow = (key: string) => {
    clearTimeout(saveTimers.current[key]);
    const cur = sigs.find((s) => s.key === key);
    if (cur) persist(cur);
  };

  const [adding, setAdding] = useState(false);

  const addSignature = async () => {
    setAdding(true);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch("/api/admin/signatures", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Ný undirskrift", title: "Fjarlækningar ehf." }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (j.signature) setSigs((prev) => [...prev, j.signature as SignatureFields]);
    } catch {
      alert("Ekki tókst að bæta við undirskrift.");
    } finally {
      setAdding(false);
    }
  };

  const removeSignature = async (key: string) => {
    if (!confirm("Fjarlægja þessa undirskrift? Þetta er ekki hægt að afturkalla.")) return;
    try {
      const res = await fetch(`/api/admin/signatures?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: await authHeader(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSigs((prev) => prev.filter((s) => s.key !== key));
    } catch {
      alert("Ekki tókst að fjarlægja undirskrift.");
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Hleð undirskriftum…</div>;
  }
  if (loadError) {
    return (
      <div className="p-8 max-w-2xl">
        <Link href="/admin/team" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Starfsfólk
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Netfangsundirskriftir</h1>
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
          Gat ekki hlaðið undirskriftum: {loadError}. Migration <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">signatures-schema.sql</code> hefur mögulega ekki verið keyrt enn.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/team" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Starfsfólk
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Netfangsundirskriftir</h1>
          <p className="text-sm text-slate-600">
            Breyttu upplýsingunum — þær vistast sjálfkrafa í sameiginlega töflu svo allir sjái sömu gildi.
            Notaðu „Afrita sniðið (fyrir Gmail)“ og límdu í Gmail → Stillingar → Undirskrift.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={addSignature}
            disabled={adding}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {adding ? "Bæti við…" : "Bæta við undirskrift"}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {sigs.map((s) => (
          <SignatureCard
            key={s.key}
            sig={s}
            isAdmin={isAdmin}
            saveState={saveState[s.key] ?? "idle"}
            onChange={(field, value) => updateField(s.key, field, value)}
            onBlur={() => saveNow(s.key)}
            onRemove={() => removeSignature(s.key)}
          />
        ))}
      </div>
    </div>
  );
}

function SignatureCard({
  sig,
  isAdmin,
  saveState,
  onChange,
  onBlur,
  onRemove,
}: {
  sig: SignatureFields;
  isAdmin: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  onChange: (field: keyof SignatureFields, value: string) => void;
  onBlur: () => void;
  onRemove: () => void;
}) {
  const [design, setDesign] = useState<DesignKey>("stacked");
  const html = useMemo(() => DESIGN_BUILDERS[design](sig), [design, sig]);
  const [copiedType, setCopiedType] = useState<"html" | "formatted" | null>(null);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopiedType("html");
      setTimeout(() => setCopiedType(null), 1800);
    } catch {}
  };

  const copyFormatted = async () => {
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        const plain = `${sig.name}\n${sig.title}\n${sig.phone} · ${sig.email} · ${WEB_LABEL}`;
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      setCopiedType("formatted");
      setTimeout(() => setCopiedType(null), 1800);
    } catch {}
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{sig.name || "(nafnlaus)"}</div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-400 min-h-[14px]">
            {saveState === "saving" && "Vista…"}
            {saveState === "saved" && <span className="text-emerald-600">Vistað</span>}
            {saveState === "error" && <span className="text-amber-600">Vistun mistókst</span>}
          </div>
          {isAdmin && (
            <button type="button" onClick={onRemove} className="text-[11px] font-medium text-red-600 hover:text-red-700 hover:underline">
              Fjarlægja
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x lg:divide-slate-100">
        <div className="p-5 space-y-3">
          <Field label="Nafn" value={sig.name} disabled={!isAdmin} onChange={(v) => onChange("name", v)} onBlur={onBlur} placeholder="Fullt nafn" />
          <Field label="Titill / hlutverk" value={sig.title} disabled={!isAdmin} onChange={(v) => onChange("title", v)} onBlur={onBlur} placeholder="t.d. Læknir · meðstofnandi, Fjarlækningar ehf." />
          <Field label="Sími" value={sig.phone} disabled={!isAdmin} onChange={(v) => onChange("phone", v)} onBlur={onBlur} placeholder="+354 000 0000" />
          <Field label="Netfang" value={sig.email} disabled={!isAdmin} onChange={(v) => onChange("email", v)} onBlur={onBlur} placeholder="nafn@fjarlaekningar.is" />

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={copyFormatted} className="text-xs font-semibold px-3 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700">
              {copiedType === "formatted" ? "Afritað — límdu í Gmail" : "Afrita sniðið (fyrir Gmail)"}
            </button>
            <button type="button" onClick={copyHtml} className="text-xs font-medium px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              {copiedType === "html" ? "HTML afritað" : "Afrita HTML kóða"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 pt-1 leading-snug">
            Ábending: „Afrita sniðið“ límist beint í undirskriftarritil Gmail með merki og útliti. „Afrita HTML kóða“ gefur hráan kóða til afritunar eða deilingar.
          </p>
        </div>

        <div className="p-5 bg-slate-50">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Forskoðun</div>
            <div className="flex gap-1 rounded-md border border-slate-200 bg-white p-0.5">
              {(Object.keys(DESIGN_LABELS) as DesignKey[]).map((k) => {
                const active = design === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDesign(k)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded ${active ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {DESIGN_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2 leading-snug">{DESIGN_BLURBS[design]}</p>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <iframe
              title={`${sig.name} undirskrift forskoðun`}
              srcDoc={`<!doctype html><html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${html}</body></html>`}
              className="w-full"
              style={{ height: 200, border: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}
