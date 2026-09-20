"use client";

// Choosing the programme.
//
// Two columns: what is available, what is selected. Cards drag between them and
// reorder within the selected column, because the order is the order everything
// else appears in — the setup list, the dashboard, the printed protocol.
//
// Every card carries what the decision needs: the question it answers, the
// claim it earns, the argument for it, what it cannot show, what it costs, and
// which metrics and fields come with it. The caveat is given equal weight to
// the rationale on purpose — a reviewer who is only shown upside has not been
// given a decision to make.

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, GripVertical, Lock, Plus, X } from "lucide-react";
import { ALL_MODULES } from "@/lib/evaluation/modules";
import { availableModules, enabledModules, EFFORT_LABEL, unmetDependencies } from "@/lib/evaluation/programme";
import type { Module, Programme } from "@/lib/evaluation/types";
import { CATEGORIES } from "@/lib/evaluation/types";
import { ACCENT, Chip, card, input } from "./ui";

function ModuleCard({
  m, selected, onToggle, onDragStart, onDragOver, onDrop, dragging, note, onNote, canEdit,
}: {
  m: Module; selected: boolean; onToggle: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  dragging: boolean; note: string; onNote: (v: string) => void; canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const a = ACCENT[m.category];
  const cat = CATEGORIES.find((c) => c.id === m.category)!;

  return (
    <div
      draggable={canEdit && !m.core}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group relative overflow-hidden ${card} transition ${dragging ? "opacity-40" : "hover:shadow-md"} ${
        canEdit && !m.core ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} />
      <div className="py-3 pl-4 pr-3">
        <div className="flex items-start gap-2">
          {canEdit && !m.core && (
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
              {m.core && (
                <Chip className="bg-slate-800 text-white">
                  <Lock className="mr-0.5 h-2.5 w-2.5" /> Core
                </Chip>
              )}
              <Chip className={a.chip}>{cat.name}</Chip>
              <Chip className="bg-slate-100 text-slate-600">{EFFORT_LABEL[m.effort]}</Chip>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{m.question}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {canEdit && !m.core && (
              <button
                onClick={onToggle}
                className={`rounded-md p-1 transition ${
                  selected ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600" : "text-slate-400 hover:bg-cyan-50 hover:text-cyan-700"
                }`}
                aria-label={selected ? "Remove" : "Add"}
              >
                {selected ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {open && (
          <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
            <div className={`rounded-lg ${a.soft} px-3 py-2`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">The claim it earns</p>
              <p className={`mt-0.5 text-xs font-medium leading-relaxed ${a.text}`}>{m.claim}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Why it is worth doing</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{m.rationale}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">What it cannot show</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{m.caveat}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span><strong className="font-semibold text-slate-700">{m.metrics.length}</strong> metric{m.metrics.length === 1 ? "" : "s"}</span>
              <span><strong className="font-semibold text-slate-700">{m.fields.length}</strong> monthly field{m.fields.length === 1 ? "" : "s"}</span>
              <span><strong className="font-semibold text-slate-700">{m.protocol.length}</strong> setup step{m.protocol.length === 1 ? "" : "s"}</span>
              {m.documents.length > 0 && (
                <span><strong className="font-semibold text-slate-700">{m.documents.length}</strong> document{m.documents.length === 1 ? "" : "s"}</span>
              )}
            </div>

            {selected && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Advisor note</label>
                <textarea
                  className={`${input} mt-1 min-h-[52px] text-xs`}
                  placeholder="What the medical advisor said about this module."
                  value={note}
                  disabled={!canEdit}
                  onChange={(e) => onNote(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


type ColumnKind = "on" | "off";

/** Defined at module scope on purpose. A component created inside the parent's
 *  render is a new type on every render, so React remounts the entire column —
 *  which drops the drag halfway through the gesture. */
function Column({
  kind, title, blurb, items, empty, canEdit, programme, overCol,
  onDragOverCol, onDragLeaveCol, onDropCol, onReorderDrop,
  onCardDragStart, onCardDragEnd, onToggle, onNote, draggingId, acceptsReorder,
}: {
  kind: ColumnKind; title: string; blurb: string; items: Module[]; empty: string;
  canEdit: boolean; programme: Programme; overCol: ColumnKind | null;
  onDragOverCol: () => void; onDragLeaveCol: () => void; onDropCol: () => void;
  onReorderDrop: (index: number) => void;
  onCardDragStart: (e: React.DragEvent, id: string) => void;
  onCardDragEnd: () => void;
  onToggle: (id: string) => void;
  onNote: (id: string, v: string) => void;
  draggingId: string | null;
  acceptsReorder: boolean;
}) {
  return (
    <div
      onDragOver={(e) => { if (canEdit) { e.preventDefault(); onDragOverCol(); } }}
      onDragLeave={onDragLeaveCol}
      onDrop={(e) => { e.preventDefault(); onDropCol(); }}
      className={`rounded-2xl border-2 border-dashed p-3 transition ${
        overCol === kind ? "border-cyan-400 bg-cyan-50/50" : "border-slate-200 bg-slate-50/40"
      }`}
    >
      <div className="mb-2 px-1">
        <h2 className="text-sm font-bold text-slate-900">
          {title} <span className="ml-1 font-normal text-slate-400">{items.length}</span>
        </h2>
        <p className="text-xs leading-relaxed text-slate-500">{blurb}</p>
      </div>
      <div className="space-y-2">
        {items.map((m, i) => (
          <div
            key={m.id}
            onDragEnd={onCardDragEnd}
            onDragOver={(e) => { if (acceptsReorder && canEdit && draggingId && draggingId !== m.id) e.preventDefault(); }}
            onDrop={(e) => {
              if (!acceptsReorder) return;
              e.preventDefault(); e.stopPropagation();
              onReorderDrop(i);
            }}
          >
            <ModuleCard
              m={m}
              selected={kind === "on"}
              canEdit={canEdit}
              dragging={draggingId === m.id}
              note={programme.notes[m.id] ?? ""}
              onNote={(v) => onNote(m.id, v)}
              onToggle={() => onToggle(m.id)}
              onDragStart={(e) => onCardDragStart(e, m.id)}
            />
          </div>
        ))}
        {!items.length && <p className="px-1 py-6 text-center text-xs text-slate-400">{empty}</p>}
      </div>
    </div>
  );
}

export default function ModulePicker({
  programme, onChange, canEdit,
}: { programme: Programme; onChange: (p: Programme) => void; canEdit: boolean }) {
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<"on" | "off" | null>(null);

  const on = enabledModules(programme);
  const off = availableModules(programme);
  const unmet = unmetDependencies(programme);

  const setEnabled = (ids: string[]) => onChange({ ...programme, enabled: ids });

  const add = (id: string, at?: number) => {
    const next = on.filter((m) => !m.core).map((m) => m.id).filter((x) => x !== id);
    next.splice(at ?? next.length, 0, id);
    // Turning on a module whose prerequisite is off is almost never what
    // somebody means, so the prerequisite comes with it.
    const mod = ALL_MODULES.find((m) => m.id === id);
    for (const req of mod?.requires ?? []) if (!next.includes(req)) next.unshift(req);
    setEnabled(next);
  };

  const remove = (id: string) => setEnabled(on.filter((m) => !m.core && m.id !== id).map((m) => m.id));

  const start = (e: React.DragEvent, id: string) => {
    dragId.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const end = () => { dragId.current = null; setDragging(null); setOverCol(null); };

  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <h2 className="text-base font-bold text-slate-900">Choose what to measure</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Each module is one decision your medical advisor can take on its own. Expand a card to see the claim it
          earns, the argument for it and — given equal weight — what it cannot show. Drag between the columns, or
          reorder the selected ones to set the order everything else follows.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Three modules are marked <strong className="font-semibold text-slate-700">Core</strong> and cannot be
          removed. Without resolution, incidents and response time there is no evaluation, only anecdote.
        </p>
      </div>

      {unmet.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Missing prerequisites</p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
            {unmet.map(({ module, missing }) => (
              <li key={module.id}>
                <strong>{module.name}</strong> needs {missing.map((x) => x.name).join(", ")} — it will report nothing without it.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Column
          kind="on"
          title="Selected"
          blurb="The programme. Order here drives setup, data entry and the dashboard."
          items={on}
          empty="Drag modules here"
          canEdit={canEdit}
          programme={programme}
          overCol={overCol}
          draggingId={dragging}
          acceptsReorder
          onDragOverCol={() => setOverCol("on")}
          onDragLeaveCol={() => setOverCol((c) => (c === "on" ? null : c))}
          onDropCol={() => { const id = dragId.current; if (id && canEdit) add(id); end(); }}
          onReorderDrop={(index) => { const id = dragId.current; if (id && canEdit) add(id, index); end(); }}
          onCardDragStart={start}
          onCardDragEnd={end}
          onToggle={remove}
          onNote={(id, v) => onChange({ ...programme, notes: { ...programme.notes, [id]: v } })}
        />
        <Column
          kind="off"
          title="Available"
          blurb="Not in the programme. Nothing is collected and nothing is reported for these."
          items={off}
          empty="Everything is selected"
          canEdit={canEdit}
          programme={programme}
          overCol={overCol}
          draggingId={dragging}
          acceptsReorder={false}
          onDragOverCol={() => setOverCol("off")}
          onDragLeaveCol={() => setOverCol((c) => (c === "off" ? null : c))}
          onDropCol={() => { const id = dragId.current; if (id && canEdit) remove(id); end(); }}
          onReorderDrop={() => end()}
          onCardDragStart={start}
          onCardDragEnd={end}
          onToggle={add}
          onNote={(id, v) => onChange({ ...programme, notes: { ...programme.notes, [id]: v } })}
        />
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <ArrowLeft className="h-3 w-3" /> drag to add or remove <ArrowRight className="h-3 w-3" />
      </p>
    </div>
  );
}
