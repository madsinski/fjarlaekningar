"use client";

// Útflutningur á PDF: þrjú snið með skýrum myndum, og val á tungumáli.

import { useState } from "react";
import { X } from "lucide-react";
import { buildPdf, type PdfKind } from "@/lib/bokasmidja/pdf";
import { LENGTH_KEYS, pageText, pagesFor, pick, type I18nText, type Lang, type StoryLength, type StoryView } from "@/lib/bokasmidja/types";
import { translator } from "@/lib/bokasmidja/i18n";
import { useBk } from "./Provider";
import { LangSwitch } from "./ui";

const KINDS: { kind: PdfKind; emoji: string; title: "pdf.read" | "pdf.print" | "pdf.publish"; sub: "pdf.readSub" | "pdf.printSub" | "pdf.publishSub" }[] = [
  { kind: "read", emoji: "📱", title: "pdf.read", sub: "pdf.readSub" },
  { kind: "print", emoji: "🖨️", title: "pdf.print", sub: "pdf.printSub" },
  { kind: "publish", emoji: "📚", title: "pdf.publish", sub: "pdf.publishSub" },
];

export default function PdfDialog({ book, load, onClose, length, chooseLength }: {
  book: { title: I18nText; subtitle: I18nText; color: string; emoji: string; cover: boolean; coverSvg?: string | null; coverImage?: string | null };
  /** Stories with their pages; fetched when the export starts. */
  load: () => Promise<StoryView[]>;
  onClose: () => void;
  /** The version to export (1 short, 2 medium, 3 long). */
  length?: StoryLength;
  /** Let the reader pick the version here (the book page, where no reader has chosen one). */
  chooseLength?: boolean;
}) {
  const { lang, t } = useBk();
  const [pdfLang, setPdfLang] = useState<Lang>(lang);
  const [len, setLen] = useState<StoryLength>(length ?? 1);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const make = async (kind: PdfKind) => {
    setError("");
    setProgress({ done: 0, total: 0 });
    try {
      const stories = (await load()).filter((s) => s.pages?.length);
      if (!stories.length) { setError(t("pdf.notReady")); setProgress(null); return; }
      const tl = translator(pdfLang);
      const text = (v: I18nText, s: StoryView) => v[pdfLang] || v[s.sourceLang] || pick(v, pdfLang);
      // A story that only has one length is exported whole, whatever is chosen.
      const lengthOf = (s: StoryView): StoryLength => (s.lengths >= 3 ? len : 1);
      const css = getComputedStyle(document.querySelector(".bk-root") || document.body);
      const bytes = await buildPdf({
        kind,
        color: book.color,
        cover: book.cover ? { title: pick(book.title, pdfLang), subtitle: pick(book.subtitle, pdfLang), emoji: book.emoji, svg: book.coverSvg ?? null, image: book.coverImage ?? null } : null,
        fonts: { display: css.getPropertyValue("--font-bk-display") || "sans-serif", body: css.getPropertyValue("--font-bk-body") || "sans-serif" },
        stories: stories.map((s) => ({
          title: text(s.title, s),
          credit: s.authorName ? tl("reader.inventedBy", { name: s.authorName }) : "",
          pages: pagesFor(s.pages || [], lengthOf(s)).map((p) => ({ text: pageText(p, pdfLang, lengthOf(s)) || pageText(p, s.sourceLang, lengthOf(s)) || text(p.text, s), svg: p.svg, textFirst: p.layout === "text-first", noPicture: !p.svg && !p.autoArt })),
        })),
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const name = (pick(book.title, pdfLang) || stories[0].title[pdfLang] || "book").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "book";
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}-${kind}-${pdfLang}${len > 1 ? `-${LENGTH_KEYS[len - 1]}` : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setProgress(null);
    } catch {
      setError(t("err.generic"));
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="bk-pdf-title">
      <div className="bk-pop max-h-full w-full max-w-lg overflow-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 id="bk-pdf-title" className="bk-display text-3xl font-extrabold">{t("pdf.title")}</h2>
          <button type="button" onClick={onClose} disabled={!!progress} aria-label={t("pdf.close")} className="bk-press rounded-2xl bg-slate-100 p-2.5"><X className="h-6 w-6" aria-hidden /></button>
        </div>
        <p className="mt-4 font-extrabold text-slate-600">{t("pdf.lang")}</p>
        <div className="mt-2"><LangSwitch value={pdfLang} onPick={setPdfLang} /></div>
        {chooseLength && (
          <>
            <p className="mt-4 font-extrabold text-slate-600">{t("len.title")}</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group">
              {([1, 2, 3] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLen(l)} aria-pressed={len === l} disabled={!!progress}
                  className={`bk-press bk-display rounded-2xl bg-white px-4 py-2 text-lg font-extrabold ${len === l ? "ring-4 ring-slate-900" : "opacity-80 ring-2 ring-slate-200"}`}>
                  {t(`len.${LENGTH_KEYS[l - 1]}`)}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-5 grid gap-3">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" onClick={() => make(k.kind)} disabled={!!progress}
              className="bk-press flex items-center gap-4 rounded-3xl bg-slate-50 p-4 text-left ring-2 ring-slate-200">
              <span aria-hidden className="text-4xl">{k.emoji}</span>
              <span>
                <span className="bk-display block text-xl font-extrabold">{t(k.title)}</span>
                <span className="block font-bold text-slate-500">{t(k.sub)}</span>
              </span>
            </button>
          ))}
        </div>
        <p role="status" className="mt-4 min-h-6 font-extrabold text-sky-700">
          {progress ? (progress.total ? t("pdf.making", { n: Math.min(progress.done + 1, progress.total), total: progress.total }) : "…") : ""}
        </p>
        {error && <p role="alert" className="font-bold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
