"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DynamicIcon } from "lucide-react/dynamic";
import { ALL_ICON_NAMES, ICON_KEYS, isIconName } from "@/lib/site-content/icons";

// Icon field editor.
//
// Searches the FULL lucide library (1,986 icons — the same set used by the
// presentation decks and the Lifeline admin) rather than a hand-picked subset.
// The curated ICON_KEYS are shown as the default suggestions so the common
// choices are one click away; typing filters the whole library.
//
// Results are capped so we never render 1,986 SVGs at once.
const MAX_RESULTS = 60;

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
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const current = isIconName(value) ? value : fallback;

  // Empty query → curated suggestions. Otherwise filter the whole library,
  // preferring names that start with the query.
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ICON_KEYS.slice(0, MAX_RESULTS);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const n of ALL_ICON_NAMES) {
      if (n.startsWith(query)) starts.push(n);
      else if (n.includes(query)) contains.push(n);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center border border-slate-200">
          <DynamicIcon name={current as never} className="w-5 h-5" strokeWidth={1.75} aria-hidden />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className="flex-1 text-left px-2 py-1.5 border border-slate-200 rounded-md text-sm bg-white hover:bg-slate-50 focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
        >
          {value ? value : `(sjálfgefið — ${fallback})`}
        </button>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Nota sjálfgefið tákn"
            className="shrink-0 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            Núllstilla
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Leita í ${ALL_ICON_NAMES.length.toLocaleString("is-IS")} táknum…`}
            className="w-full px-2 py-1.5 mb-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
          />
          <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto">
            {results.map((n) => (
              <button
                key={n}
                type="button"
                title={n}
                onClick={() => pick(n)}
                className={`aspect-square rounded-md flex items-center justify-center border ${
                  n === current
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                    : "border-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                <DynamicIcon name={n as never} className="w-4 h-4" strokeWidth={1.75} aria-hidden />
              </button>
            ))}
          </div>
          {results.length === 0 && (
            <p className="px-1 py-2 text-xs text-slate-500">Ekkert tákn fannst fyrir „{q}“.</p>
          )}
          {q.trim() === "" && (
            <p className="px-1 pt-2 text-[11px] text-slate-400">
              Algeng tákn sýnd. Skrifaðu til að leita í öllu safninu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
