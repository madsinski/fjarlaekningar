"use client";

import { useState } from "react";
import { ChevronDown, CircleHelp, LayoutGrid, ListChecks, LogOut, UserRound, MessageCircle } from "lucide-react";
import { LanguageSwitch, useCommon } from "@/lib/hsu/i18n/client";
import { common } from "@/lib/hsu/i18n/messages/common";
import { HsuLogo, hsuApi, initials } from "./ui";

export default function HsuHeader({
  unitName, userName, subtitle, links = [], onLogout, actions = [],
}: {
  /** Heiti starfsstöðvar úr stillingum; sjálfgefna íslenska heitið er þýtt. */
  unitName?: string;
  userName: string;
  subtitle?: string;
  links?: { href: string; label: string; icon?: "grid" | "user" | "message" }[];
  /** Skilar slóð til að fara á eftir útskráningu (sjálfgefið /hsu). */
  onLogout?: () => Promise<string | void> | string | void;
  /** Aukaaðgerðir í valmyndinni, t.d. „Kynning á kerfinu“. */
  actions?: { label: string; onClick: () => void; icon?: "help" | "list" }[];
}) {
  const [open, setOpen] = useState(false);
  const t = useCommon();
  const logout = async () => {
    const dest = onLogout ? await onLogout() : await hsuApi("/api/hsu/auth/logout", { body: {} }).then(() => undefined);
    window.location.href = typeof dest === "string" ? dest : "/hsu";
  };
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/hsu" className="flex min-w-0 items-center gap-3">
          <HsuLogo size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{!unitName || unitName === common.is["app.unit"] ? t("app.unit") : unitName}</div>
            <div className="truncate text-[11px] font-medium uppercase tracking-wider text-[var(--hsu)]">{subtitle ?? t("app.tagline")}</div>
          </div>
        </a>
        <div className="flex items-center gap-2">
        <span data-tour="lang" className="hidden sm:inline-flex"><LanguageSwitch /></span>
        <div className="relative">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} data-tour="user-menu"
            className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 hover:bg-slate-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--hsu)] text-xs font-bold text-white">{initials(userName)}</span>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block">{userName}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {open && (
            <>
              <button aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
                {links.map((l) => (
                  <a key={l.href} href={l.href} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                    {l.icon === "grid" ? <LayoutGrid className="h-4 w-4" /> : l.icon === "message" ? <MessageCircle className="h-4 w-4" /> : <UserRound className="h-4 w-4" />} {l.label}
                  </a>
                ))}
                {actions.map((a) => (
                  <button key={a.label} onClick={() => { setOpen(false); a.onClick(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    {a.icon === "list" ? <ListChecks className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />} {a.label}
                  </button>
                ))}
                <div className="border-t border-slate-100 px-4 py-2.5 sm:hidden"><LanguageSwitch /></div>
                <button onClick={logout} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <LogOut className="h-4 w-4" /> {t("action.logout")}
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
