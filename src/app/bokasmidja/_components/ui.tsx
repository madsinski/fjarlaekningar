"use client";

// Sameiginlegir smáíhlutir: stórir takkar, málaval, haus og API-kall.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, LogOut, Settings } from "lucide-react";
import { AVATARS, LANGS, LANG_FLAGS, LANG_NAMES, type Lang } from "@/lib/bokasmidja/types";
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

/** Fánar til að skipta um mál. `onPick` yfirskrifar sjálfgefnu hegðunina (að skipta um mál viðmótsins). */
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
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={l === current} title={LANG_NAMES[l]}
          className={cx(
            "bk-press flex items-center gap-2 rounded-2xl font-bold",
            big ? "px-4 py-3 text-lg" : "px-2.5 py-1.5 text-sm",
            l === current ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-2 ring-slate-200",
          )}>
          <span aria-hidden className={big ? "text-2xl" : "text-lg"}>{LANG_FLAGS[l]}</span>
          <span className={big ? "" : "hidden sm:inline"}>{LANG_NAMES[l]}</span>
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
