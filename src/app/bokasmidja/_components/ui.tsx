"use client";

// Sameiginlegir smáíhlutir: stórir takkar, málaval, haus og API-kall.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, LogOut, Settings } from "lucide-react";
import { AVATARS, LANGS, LANG_NAMES, type Lang } from "@/lib/bokasmidja/types";
import { useBk } from "./Provider";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** JSON-kall á smiðjuna. Skilar alltaf hlut með ok; netvilla verður { ok: false, error: "generic" }. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call(method: string, url: string, body?: unknown): Promise<any> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return data && typeof data === "object" ? data : { ok: false, error: "generic" };
  } catch {
    return { ok: false, error: "generic" };
  }
}

const TONES = {
  orange: "bg-orange-500 text-white shadow-[0_6px_0_#c2410c]",
  blue: "bg-sky-500 text-white shadow-[0_6px_0_#0369a1]",
  green: "bg-emerald-500 text-white shadow-[0_6px_0_#047857]",
  purple: "bg-violet-500 text-white shadow-[0_6px_0_#6d28d9]",
  white: "bg-white text-slate-800 shadow-[0_6px_0_#cbd5e1] ring-2 ring-slate-200",
} as const;

export function BigButton({ tone = "orange", className, children, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONES }) {
  return (
    <button type="button" {...rest}
      className={cx("bk-press bk-display inline-flex min-h-14 items-center justify-center gap-3 rounded-3xl px-7 py-3 text-xl font-extrabold", TONES[tone], className)}>
      {children}
    </button>
  );
}

export function Avatar({ avatar, color, size = 64 }: { avatar: string; color: string; size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full ring-4 ring-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.55 }}>
      {AVATARS[avatar] ?? "🙂"}
    </span>
  );
}

/** Þjóðfáni málsins, teiknaður sem SVG (fánatákn sjást ekki á Windows). */
export function Flag({ lang, className }: { lang: Lang; className?: string }) {
  const common = { className: cx("block rounded-[5px] ring-1 ring-black/15", className), "aria-hidden": true, preserveAspectRatio: "none" as const };
  if (lang === "is") {
    return (
      <svg viewBox="0 0 25 18" {...common}>
        <rect width="25" height="18" fill="#02529c" />
        <path d="M0 9h25M9 0v18" stroke="#fff" strokeWidth="4" />
        <path d="M0 9h25M9 0v18" stroke="#dc1e35" strokeWidth="2" />
      </svg>
    );
  }
  if (lang === "nb") {
    return (
      <svg viewBox="0 0 22 16" {...common}>
        <rect width="22" height="16" fill="#ba0c2f" />
        <path d="M0 8h22M8 0v16" stroke="#fff" strokeWidth="4" />
        <path d="M0 8h22M8 0v16" stroke="#00205b" strokeWidth="2" />
      </svg>
    );
  }
  if (lang === "hu") {
    return (
      <svg viewBox="0 0 6 4" {...common}>
        <rect width="6" height="4" fill="#fff" />
        <rect width="6" height="1.3334" fill="#ce2939" />
        <rect y="2.6667" width="6" height="1.3334" fill="#477050" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 36" {...common}>
      <rect width="60" height="36" fill="#012169" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#fff" strokeWidth="7" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#c8102e" strokeWidth="2.6" />
      <path d="M30 0v36M0 18h60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0v36M0 18h60" stroke="#c8102e" strokeWidth="7" />
    </svg>
  );
}

/** Fánahnappar til að skipta um mál. `onPick` yfirskrifar sjálfgefnu hegðunina (að skipta um mál viðmótsins). */
export function LangSwitch({ value, onPick, big }: { value?: Lang; onPick?: (l: Lang) => void; big?: boolean }) {
  const { lang } = useBk();
  const router = useRouter();
  const current = value ?? lang;
  const pick = async (l: Lang) => {
    if (onPick) return onPick(l);
    await call("POST", "/api/bokasmidja/lang", { lang: l });
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-2" role="group">
      {LANGS.map((l) => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={l === current} aria-label={LANG_NAMES[l]} title={LANG_NAMES[l]}
          className={cx(
            "bk-press flex flex-col items-center gap-1 rounded-2xl bg-white font-bold text-slate-700",
            big ? "px-3 pb-1.5 pt-3 text-base" : "p-1.5",
            // Valið mál: þykkur dökkur rammi, svo það sjáist án þess að treysta á lit eingöngu.
            l === current ? "ring-4 ring-slate-900" : "opacity-80 ring-2 ring-slate-200",
          )}>
          <Flag lang={l} className={big ? "h-12 w-[4.5rem]" : "h-7 w-10"} />
          {big && <span>{LANG_NAMES[l]}</span>}
        </button>
      ))}
    </div>
  );
}

/** Haus innri síðna: heim í hilluna, hver er inni, mál og útskráning. */
export function TopBar() {
  const { t, viewer } = useBk();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const bye = async () => {
    setBusy(true);
    await call("POST", "/api/bokasmidja/auth/logout");
    router.push("/bokasmidja");
    router.refresh();
  };
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 pt-4">
      <Link href="/bokasmidja/books" className="bk-press flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-extrabold text-slate-800 ring-2 ring-slate-200">
        <Home className="h-6 w-6 text-orange-500" aria-hidden />
        <span className="bk-display text-lg">{t("nav.shelf")}</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <LangSwitch />
        {viewer?.role === "parent" ? (
          <Link href="/bokasmidja/parent" aria-label={t("parent.title")} className="bk-press rounded-2xl bg-white p-2.5 ring-2 ring-slate-200">
            <Settings className="h-6 w-6 text-slate-600" aria-hidden />
          </Link>
        ) : viewer ? <Avatar avatar={viewer.child.avatar} color={viewer.child.color} size={44} /> : null}
        <button type="button" onClick={bye} disabled={busy}
          className="bk-press flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 font-bold text-slate-600 ring-2 ring-slate-200">
          <LogOut className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">{t("nav.bye")}</span>
        </button>
      </div>
    </header>
  );
}

/** Mynd síðu: hreinsuð SVG frá myndskreytinum (sjá src/lib/bokasmidja/svg.ts). */
export function Art({ svg, className, children }: { svg: string | null; className?: string; children?: React.ReactNode }) {
  if (!svg) return <div className={cx("bk-art flex items-center justify-center", className)}>{children}</div>;
  return <div className={cx("bk-art", className)} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Minnkar ljósmynd (teikningu eða kápu) í JPEG sem þjónninn og myndskreytirinn ráða við. Skilar base64. */
export async function shrinkImage(file: File, maxSide = 1568): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1] || null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
