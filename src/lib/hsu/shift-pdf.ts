// Vaktaplan mánaðarins á PDF — eitt blað, þrjú snið.
//
//   classic  „Dagatal"     hlutlaust dagatalsblað, hvítt og rólegt
//   system   „Vaktakerfi"  eins og mánaðarplanið á skjánum (spjöld og pillur)
//   bold     „Djarft"      dökkur haus, stór tala og taktborði; netið hljóðlátt
//
// Öll sniðin byggja á sama grunni (pdf/shared.ts): vika í hverri röð, dagur
// tvískiptur — dagvinna að ofan, forvakt/bakvakt að neðan — og vaktir
// viðtakandans í hans eigin lit.

import { renderBold } from "./pdf/bold";
import { renderClassic } from "./pdf/classic";
import { renderSystem } from "./pdf/system";
import { DEFAULT_PDF_STYLE, type ShiftPdfInput } from "./pdf/shared";

export {
  DEFAULT_PDF_STYLE, PDF_STYLES, isPdfStyle,
  type PdfStyle, type ShiftPdfDoctor, type ShiftPdfInput,
} from "./pdf/shared";

export async function buildShiftPdf(i: ShiftPdfInput): Promise<Uint8Array> {
  switch (i.style ?? DEFAULT_PDF_STYLE) {
    case "classic": return renderClassic(i);
    case "bold": return renderBold(i);
    default: return renderSystem(i);
  }
}

/** Skráarnafn viðhengisins: vaktir-2026-10.pdf */
export const shiftPdfName = (month: string) => `vaktir-${month}.pdf`;
