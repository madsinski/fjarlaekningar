"use client";

// Mál viðmótsins og innskráður notandi, handa öllum íhlutum smiðjunnar.

import { createContext, useContext, useMemo } from "react";
import { translator, type T } from "@/lib/bokasmidja/i18n";
import type { Lang, Viewer } from "@/lib/bokasmidja/types";

interface Ctx { lang: Lang; t: T; viewer: Viewer | null }
const BkContext = createContext<Ctx | null>(null);

export function BkProvider({ lang, viewer, children }: { lang: Lang; viewer: Viewer | null; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, viewer, t: translator(lang) }), [lang, viewer]);
  return <BkContext.Provider value={value}>{children}</BkContext.Provider>;
}

export function useBk(): Ctx {
  const ctx = useContext(BkContext);
  if (!ctx) throw new Error("useBk outside BkProvider");
  return ctx;
}
