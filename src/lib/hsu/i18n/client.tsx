"use client";

// Tungumál í vafranum: <LangProvider> í /hsu/layout.tsx, useT(safn) í íhlutum.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LANGS, LANG_NAMES, translator, type Catalog, type Lang, type Messages, type Translator } from "./core";
import { common } from "./messages/common";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "is", setLang: () => {} });

export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setState] = useState<Lang>(initial);
  const router = useRouter();
  const setLang = useCallback((l: Lang) => {
    setState(l);
    document.documentElement.lang = l;
    // Vistað í köku (og á lækninn, fyrir tölvupósta); síðan endurteiknuð á þjóni.
    void fetch("/api/hsu/lang", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ lang: l }),
    }).finally(() => router.refresh());
  }, [router]);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** const t = useT(messages); t("key"), t.n("shifts", 3), t.lang */
export function useT<T extends Messages>(catalog: Catalog<T>): Translator<T> {
  const { lang } = useContext(Ctx);
  return useMemo(() => translator(catalog, lang), [catalog, lang]);
}

/** Sameiginlegi orðaforðinn (hnappar, mánuðir, stöður). */
export function useCommon() {
  return useT(common);
}

/** Tungumálaval: „IS | EN“. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const t = useCommon();
  return (
    <div role="group" aria-label={t("nav.language")} className={`inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold ${className}`}>
      <Languages className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
      {LANGS.map((l) => (
        <button key={l} type="button" onClick={() => l !== lang && setLang(l)} aria-pressed={l === lang} title={LANG_NAMES[l]} lang={l}
          className={`rounded-full px-2 py-1 uppercase transition ${l === lang ? "bg-[var(--hsu)] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
