"use client";

// Mín síða → Stillingar: hver læknir velur hvað hann fær í tölvupósti.
// Hver smellur vistast strax.

import { useRef, useState } from "react";
import { Check, Mail } from "lucide-react";
import { useT } from "@/lib/hsu/i18n/client";
import { emailSettings } from "@/lib/hsu/i18n/messages/email-settings";
import { canDigest, categoriesFor, type EmailCategory, type EmailMode } from "@/lib/hsu/email-categories";
import { Card, cx, hsuApi } from "../_components/ui";

export default function EmailPrefsCard({ initial, role }: { initial: Record<EmailCategory, EmailMode>; role: string }) {
  const t = useT(emailSettings);
  const [prefs, setPrefs] = useState(initial);
  const [state, setState] = useState<{ key: EmailCategory; ok: boolean } | null>(null);

  // Vistanir fara í röð, hver með öll gildin eins og þau eru þá — svo tveir
  // hraðir smellir geti ekki skrifað hvor yfir annan.
  const latest = useRef(prefs);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const set = (cat: EmailCategory, mode: EmailMode) => {
    if (latest.current[cat] === mode) return;
    latest.current = { ...latest.current, [cat]: mode };
    setPrefs(latest.current);
    queue.current = queue.current.then(async () => {
      const r = await hsuApi<{ prefs: Record<EmailCategory, EmailMode> }>("/api/hsu/me/email-prefs", { method: "PUT", body: { prefs: latest.current } });
      setState({ key: cat, ok: r.ok });
    });
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Mail className="h-5 w-5 text-[var(--hsu)]" /> {t("title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("intro")}</p>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {categoriesFor(role).map((cat) => (
          <li key={cat} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-48 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {t.dyn(`cat.${cat}`)}
                {state?.key === cat && (
                  <span className={cx("inline-flex items-center gap-0.5 text-[11px] font-semibold", state.ok ? "text-emerald-700" : "text-red-600")}>
                    {state.ok && <Check className="h-3 w-3" />} {t(state.ok ? "saved" : "failed")}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">{t.dyn(`cat.${cat}.hint`)}</div>
            </div>
            <div role="group" aria-label={t.dyn(`cat.${cat}`)} className="flex shrink-0 rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              {(["now", "digest", "off"] as EmailMode[]).filter((m) => m !== "digest" || canDigest(cat)).map((m) => (
                <button key={m} type="button" onClick={() => set(cat, m)} aria-pressed={prefs[cat] === m}
                  className={cx("rounded-lg px-2.5 py-1.5 transition",
                    prefs[cat] === m ? "bg-white text-[var(--hsu-dark)] shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700")}>
                  {t.dyn(`mode.${m}`)}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">{t("digestHint")}</p>
      <p className="text-xs text-slate-500">{t("always")}</p>
    </Card>
  );
}
