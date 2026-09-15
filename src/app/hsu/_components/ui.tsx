"use client";

// Smáeiningar viðmóts HSU vaktakerfis. Litur HSU er í --hsu (sjá layout).

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "ghost" | "danger" | "soft" | "success";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--hsu)] text-white hover:bg-[var(--hsu-dark)] shadow-sm",
  ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  soft: "bg-[var(--hsu-soft)] text-[var(--hsu-dark)] hover:brightness-95",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
};

export function Button({
  variant = "primary", size = "md", busy, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; busy?: boolean }) {
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-3 text-base" };
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hsu)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant], sizes[size], className,
      )}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-slate-200 bg-white", className)}>{children}</div>;
}

export function Badge({ tone = "slate", children }: { tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple"; children: ReactNode }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-[var(--hsu-soft)] text-[var(--hsu-dark)]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    purple: "bg-violet-50 text-violet-700",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--hsu)] focus:outline-none focus:ring-2 focus:ring-[var(--hsu)]/20";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-md")}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Loka" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "err" | "info" | "warn"; children: ReactNode }) {
  const t = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    err: "border-red-200 bg-red-50 text-red-900",
    info: "border-[var(--hsu)]/20 bg-[var(--hsu-soft)] text-[var(--hsu-dark)]",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return <div className={cx("rounded-xl border px-3.5 py-2.5 text-sm", t[tone])}>{children}</div>;
}

/**
 * fetch fyrir /api/hsu. Kaka læknis fylgir sjálfkrafa; sé stjórnandi
 * Fjarlækninga innskráður í sama vafra fylgir aðgangslykill hans líka, svo
 * stjórnborðið virki fyrir hvorn tveggja.
 */
export async function hsuApi<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown; staff?: boolean } = {}): Promise<T & { ok: boolean; error?: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.staff) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch { /* engin starfsmannalota */ }
  }
  try {
    const res = await fetch(path, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
    const j = await res.json().catch(() => ({ ok: false, error: `Villa (${res.status})` }));
    return { status: res.status, ...j };
  } catch {
    return { ok: false, error: "Engin nettenging" } as T & { ok: boolean; error?: string };
  }
}

export function HsuLogo({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/hsu/hsu-logo-192.png" width={size} height={size} alt="HSU" className="shrink-0" />;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Fyrsti stafur hástafur: "desember 2026" → "Desember 2026". CSS capitalize
 *  gerir hvert orð að hástaf ("1. Des."), sem er rangt á íslensku. */
export function capFirst(s: string): string {
  return s ? s[0].toLocaleUpperCase("is-IS") + s.slice(1) : s;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Stuttnafn á vaktaplani: "Anna J." */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] ?? name;
}

export function timeAgoIs(iso: string | null): string {
  if (!iso) return "aldrei";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "rétt í þessu";
  if (mins < 60) return `fyrir ${mins} mín`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `fyrir ${h} klst`;
  return `fyrir ${Math.floor(h / 24)} d`;
}
