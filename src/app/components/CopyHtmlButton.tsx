"use client";

import { useState } from "react";

// Small client island so the (server-rendered) /samstarf spec block can offer a
// working "copy to clipboard" button for the embeddable HTML.
export default function CopyHtmlButton({
  text,
  label = "Afrita HTML",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable — the <pre> below is still selectable */
        }
      }}
      className={className}
    >
      {copied ? "Afritað!" : label}
    </button>
  );
}
