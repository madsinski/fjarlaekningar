"use client";

// Setup — the protocol for each selected module, with its documents attached.
//
// Steps and documents sit together under the module they belong to, so the
// link between "do this" and "get that metric" is never more than a card away.
// That was the main thing wrong with the previous version: a checklist in one
// tab and the numbers in another, with nothing joining them.
//
// Time-critical steps are called out and counted on the overview, because they
// are the only ones where delay actually costs you something: a baseline not
// collected while goodwill is fresh is not collected at all.

import { useRef, useState } from "react";
import { Clock, Download, ExternalLink, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { enabledModules } from "@/lib/evaluation/programme";
import type { UploadedDoc } from "@/lib/evaluation/programme";
import type { Programme } from "@/lib/evaluation/types";
import { CATEGORIES } from "@/lib/evaluation/types";
import { ACCENT, Chip, card } from "./ui";

export default function Setup({
  programme, documents, canEdit, onToggleStep, onUpload, onDeleteDoc, onOpenDoc,
}: {
  programme: Programme;
  documents: UploadedDoc[];
  canEdit: boolean;
  onToggleStep: (key: string, done: boolean) => void;
  onUpload: (moduleId: string, docId: string, file: File) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  onOpenDoc: (path: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const modules = enabledModules(programme);

  const docsFor = (moduleId: string, docId: string) =>
    documents.filter((d) => d.module_id === moduleId && d.doc_id === docId);

  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <h2 className="text-base font-bold text-slate-900">Set the programme up</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Every step belongs to a module, and so does every document. Work down a card and that module starts
          reporting — nothing here is a separate list to keep in step with anything else.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-rose-700">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Steps marked time-critical are the ones that cannot be recovered later. Everything else can wait a week
          and cost you nothing.
        </p>
      </div>

      {modules.map((m) => {
        const a = ACCENT[m.category];
        const cat = CATEGORIES.find((c) => c.id === m.category)!;
        const done = m.protocol.filter((_, i) => programme.done[`${m.id}:${i}`]).length;

        return (
          <section key={m.id} className={`relative overflow-hidden ${card}`}>
            <div className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} />
            <div className="p-4 pt-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    {m.name} <Chip className={a.chip}>{cat.name}</Chip>
                  </h3>
                  <p className="text-xs text-slate-500">{m.question}</p>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  done === m.protocol.length ? "bg-emerald-100 text-emerald-800" : done ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                }`}>
                  {done}/{m.protocol.length} steps
                </span>
              </div>

              <ol className="space-y-2.5">
                {m.protocol.map((step, i) => {
                  const key = `${m.id}:${i}`;
                  const isDone = !!programme.done[key];
                  return (
                    <li key={key} className="flex gap-2.5">
                      <input
                        type="checkbox"
                        checked={isDone}
                        disabled={!canEdit}
                        onChange={(e) => onToggleStep(key, e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div className="min-w-0">
                        <span className={`text-sm ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {step.text}
                        </span>
                        {step.timeCritical && !isDone && (
                          <Chip className="ml-1.5 bg-rose-100 text-rose-700">Time-critical</Chip>
                        )}
                        {step.detail && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.detail}</p>}
                        {step.link && (
                          <a href={step.link.href} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline">
                            {step.link.label} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {m.documents.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <Paperclip className="h-3 w-3" /> Documents
                  </p>
                  {m.documents.map((doc) => {
                    const files = docsFor(m.id, doc.id);
                    const slot = `${m.id}:${doc.id}`;
                    return (
                      <div key={doc.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800">
                              {doc.name}
                              {doc.required && <span className="ml-1 font-normal text-rose-600">required</span>}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{doc.why}</p>
                          </div>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => inputs.current[slot]?.click()}
                                disabled={busy === slot}
                                className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                {busy === slot ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Upload
                              </button>
                              <input
                                ref={(el) => { inputs.current[slot] = el; }}
                                type="file"
                                className="hidden"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  setBusy(slot);
                                  try { await onUpload(m.id, doc.id, f); } finally { setBusy(null); e.target.value = ""; }
                                }}
                              />
                            </>
                          )}
                        </div>

                        {files.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {files.map((f) => (
                              <li key={f.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <button onClick={() => onOpenDoc(f.path)} className="min-w-0 flex-1 truncate text-left text-xs text-slate-700 hover:text-cyan-700 hover:underline">
                                  {f.filename}
                                </button>
                                <span className="shrink-0 text-[10px] text-slate-400">
                                  {Math.max(1, Math.round(f.size_bytes / 1024))} KB · {f.uploaded_by_name}
                                </span>
                                <button onClick={() => onOpenDoc(f.path)} className="shrink-0 rounded p-0.5 text-slate-400 hover:text-cyan-700" aria-label="Download">
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                {canEdit && (
                                  <button onClick={() => void onDeleteDoc(f.id)} className="shrink-0 rounded p-0.5 text-slate-400 hover:text-rose-600" aria-label="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
