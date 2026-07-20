import React from "react";

// Brand-blue word highlighting for headings, using the same ==word== convention
// as the presentation decks. "Breytum kerfinu ==saman==" renders "saman" in the
// brand colour. Text with no == marks renders verbatim, so existing copy is
// untouched.

const MARK = /==([^=]+)==/g;

export function renderHighlighted(text: string): React.ReactNode {
  if (!text || !text.includes("==")) return text;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  MARK.lastIndex = 0;

  while ((m = MARK.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={`hl${i++}`} className="text-[var(--primary)]">
        {m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <>{parts}</>;
}

/** Strip the == markers — for places that need plain text (alt, title, meta). */
export function stripHighlight(text: string): string {
  return (text ?? "").replace(/==([^=]+)==/g, "$1");
}
