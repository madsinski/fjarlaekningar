// Vaktaplan mánaðarins á PDF — ein síða, A4 á langsnið, í útliti vaktakerfisins.
//
// Blaðið lítur út eins og mánaðarplanið á skjánum: hvít rúnnuð spjöld, merking
// vaktategundar til vinstri og „pilla" með nafni til hægri. Teikningin er í
// pdf/system.ts og allur útreikningur (vikur, dagar, nöfn, litir) í pdf/shared.ts.

import { renderSystem } from "./pdf/system";
import type { ShiftPdfInput } from "./pdf/shared";

export type { ShiftPdfDoctor, ShiftPdfInput } from "./pdf/shared";

export async function buildShiftPdf(i: ShiftPdfInput): Promise<Uint8Array> {
  return renderSystem(i);
}

/** Skráarnafn viðhengisins: vaktir-2026-10.pdf */
export const shiftPdfName = (month: string) => `vaktir-${month}.pdf`;
