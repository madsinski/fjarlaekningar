"use client";

// Smáhlutir vinnustöðvarinnar.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import qrcode from "qrcode-generator";

export { hsuApi as vsApi } from "@/app/hsu/_components/ui";

/** Merki Fjarlækninga (án orðmerkis). */
export function FjLogo({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/fjarlaekningar-mark.svg" width={size} height={size} alt="Fjarlækningar" className="shrink-0" />;
}

/** QR-kóði sem SVG — sjúklingur sem er á staðnum skannar hann í stað SMS. */
export function Qr({ value, size = 220 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={`QR-kóði: ${value}`}>
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#0b1220" />
    </svg>
  );
}

/**
 * Er opið núna? Opið alla daga kl. 10–22 (íslenskur tími, UTC allt árið).
 * Engin fullyrðing um nákvæman svartíma nálægt lokun: heimildirnar segja aðeins
 * „innan tveggja klukkustunda á opnunartíma“ og „eftir kl. 22 daginn eftir“.
 */
export function useServiceStatus() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const h = now.getUTCHours();
  const hhmm = `${String(h).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  if (h >= 10 && h < 22) return { open: true, clock: hhmm, text: "Opið núna", detail: "Læknir svarar innan tveggja klukkustunda." };
  if (h < 10) return { open: false, clock: hhmm, text: "Lokað — opnar kl. 10", detail: "Senda má erindi núna; því er svarað þegar opnar." };
  return { open: false, clock: hhmm, text: "Lokað — opnar kl. 10 á morgun", detail: "Erindum sem berast eftir kl. 22 er svarað daginn eftir." };
}

/** „16.9. kl. 16:55“ — óháð því hvort vafrinn á íslensk staðargögn. */
export function whenIs(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()}.${d.getMonth() + 1}. kl. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";

/** Skúffa sem rennur inn frá hægri — samtal, innhólf, stillingar. */
export function Drawer({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Loka" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div ref={panel} tabIndex={-1}
        className={`relative flex h-full w-full flex-col bg-slate-50 shadow-2xl outline-none ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Loka" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
