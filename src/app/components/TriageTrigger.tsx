"use client";

import { useCallback, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import TriageDialog from "./TriageDialog";
import { PORTAL_URL } from "@/lib/triage";
import { pathLocale } from "@/lib/locale";
import type { Locale } from "@/lib/site-content/types";

/**
 * A real link to the patient portal that opens the "Hvert á ég að leita?"
 * popup on a plain click. Without JavaScript, or with a modifier key
 * (ctrl/cmd/shift/middle click), it behaves as the ordinary portal link, so
 * nobody is ever locked out of the portal by the triage.
 */
export default function TriageTrigger({
  className,
  children,
  locale,
}: {
  className?: string;
  children: ReactNode;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const lang = locale ?? pathLocale(pathname ?? "/") ?? "is";
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <a
        href={PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-haspopup="dialog"
        className={className}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {open && <TriageDialog onClose={close} locale={lang} />}
    </>
  );
}
