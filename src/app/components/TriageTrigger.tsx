"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import TriageDialog from "./TriageDialog";
import { PORTAL_URL, type TriageExample } from "@/lib/triage";
import type { LocaleContent } from "@/lib/site-content/types";

// Whether the triage is live, and its words (already resolved for the page's
// language — see triageText()). OFF unless a provider says otherwise, so any
// button rendered outside SiteChrome (or before the CMS switch is published)
// is just the ordinary portal link.
type TriageState = { on: boolean; text: LocaleContent; examples: TriageExample[] };
const Triage = createContext<TriageState>({ on: false, text: {}, examples: [] });

export function TriageProvider({ on, text, examples, children }: TriageState & { children: ReactNode }) {
  return <Triage.Provider value={{ on, text, examples }}>{children}</Triage.Provider>;
}

/**
 * A real link to the patient portal that opens the "Hvert á ég að leita?"
 * popup on a plain click. Without JavaScript, or with a modifier key
 * (ctrl/cmd/shift/middle click), it behaves as the ordinary portal link, so
 * nobody is ever locked out of the portal by the triage.
 */
export default function TriageTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { on: live, text, examples } = useContext(Triage);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <a
        href={PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-haspopup={live ? "dialog" : undefined}
        className={className}
        onClick={(e) => {
          if (!live) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {open && <TriageDialog onClose={close} text={text} examples={examples} />}
    </>
  );
}
