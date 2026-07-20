"use client";

import { ICONS, ICON_KEYS } from "@/lib/site-content/icons";

// Icon field editor: a select of the available keys plus a live glyph preview
// of the current choice, so you can see what you picked without leaving the form.
export default function IconPicker({
  value,
  onChange,
  disabled,
  fallback,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  fallback: string;
}) {
  const key = value || fallback;
  const Glyph = ICONS[key] ?? ICONS[fallback];

  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center border border-slate-200">
        {Glyph ? <Glyph className="w-5 h-5" strokeWidth={1.75} aria-hidden /> : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-sm bg-white focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
      >
        <option value="">(sjálfgefið — {fallback})</option>
        {ICON_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </div>
  );
}
