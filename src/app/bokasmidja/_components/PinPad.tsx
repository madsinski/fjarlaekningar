"use client";

// Fjögurra stafa talnaborð með stórum tökkum. Virkar með snertingu og lyklaborði.

import { useEffect, useRef } from "react";
import { Delete } from "lucide-react";
import { cx } from "./ui";

export default function PinPad({ value, onChange, onComplete, disabled, error, color = "#f97316" }: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  color?: string;
}) {
  // Nýjustu gildi í ref: lyklaborðshlustarinn er skráður einu sinni.
  const latest = useRef({ value, onChange, onComplete, disabled });
  useEffect(() => { latest.current = { value, onChange, onComplete, disabled }; });

  const press = (d: string) => {
    const { value: cur, onChange: change, onComplete: complete, disabled: off } = latest.current;
    if (off) return;
    if (d === "back") { change(cur.slice(0, -1)); return; }
    if (cur.length >= 4) return;
    const next = cur + d;
    latest.current.value = next;
    change(next);
    if (next.length === 4) complete?.(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="select-none">
      <div className={cx("flex justify-center gap-4", error && "bk-shake")} role="status" aria-label={`${value.length} / 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-6 w-6 rounded-full border-4 transition"
            style={i < value.length ? { background: error ? "#ef4444" : color, borderColor: error ? "#ef4444" : color } : { borderColor: "#cbd5e1" }} />
        ))}
      </div>
      <div className="mx-auto mt-6 grid max-w-[300px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((k, i) =>
          k === "" ? <span key={i} /> : (
            <button key={i} type="button" onClick={() => press(k)} disabled={disabled} aria-label={k === "back" ? "⌫" : k}
              className="bk-press bk-display flex h-[72px] items-center justify-center rounded-3xl bg-white text-3xl font-extrabold text-slate-800 shadow-[0_5px_0_#cbd5e1] ring-2 ring-slate-200">
              {k === "back" ? <Delete className="h-7 w-7 text-slate-500" aria-hidden /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
