// Server-side signed-contract PDF (pdf-lib). Helvetica/WinAnsi covers Icelandic
// (þ æ ö á é í ó ú ý ð and uppercase); characters outside CP1252 are replaced so
// drawText never throws. Renders the canonical contract text plus an electronic-
// signature block and an audit box (name, ID, time, IP, version, text hash).

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface ContractPdfInput {
  title: string;
  body: string;
  version: string;
  signatoryName: string;
  signatoryKennitala?: string;
  signedAtISO: string;
  ip: string;
  userAgent: string;
  termsHash: string;
}

// Keep chars representable by WinAnsi (CP1252): all code points <= 0xFF plus the
// CP1252 "high" specials (smart quotes, dashes, ellipsis, €, etc.).
const CP1252_HIGH = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);
function safe(s: string): string {
  let out = "";
  for (const ch of (s || "").normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    out += c <= 0xff || CP1252_HIGH.has(c) ? ch : "?";
  }
  return out;
}

export async function buildContractPdf(i: ContractPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89, M = 56;
  const maxW = W - M * 2;
  let page = doc.addPage([W, H]);
  let y = H - M;

  const ink = rgb(0.1, 0.13, 0.16);
  const muted = rgb(0.42, 0.47, 0.52);

  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = (h: number) => { if (y - h < M) newPage(); };

  const wrap = (text: string, f: PDFFont, size: number): string[] => {
    const lines: string[] = [];
    for (const raw of safe(text).split("\n")) {
      if (!raw.trim()) { lines.push(""); continue; }
      let line = "";
      for (const word of raw.split(/\s+/)) {
        const t = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = word; }
        else line = t;
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  const draw = (text: string, f: PDFFont, size: number, color = ink, lh = size * 1.4) => {
    for (const line of wrap(text, f, size)) {
      ensure(lh);
      if (line) page.drawText(line, { x: M, y: y - size, size, font: f, color });
      y -= lh;
    }
  };

  // Title
  draw(i.title, bold, 17);
  y -= 8;
  // Body
  draw(i.body, font, 10.5, ink, 15);

  // Signature block
  y -= 24;
  ensure(120);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });
  y -= 22;
  draw("RAFRÆN UNDIRRITUN", bold, 11, rgb(0.02, 0.53, 0.64), 16);
  draw(`Undirritað af: ${i.signatoryName}`, font, 11, ink, 16);
  if (i.signatoryKennitala) draw(`Kennitala: ${i.signatoryKennitala}`, font, 11, ink, 16);
  draw(
    "Með undirritun staðfestir undirritaður að hafa lesið samninginn og samþykkir hann. Rafræn undirritun er bindandi og jafngild eiginhandarundirritun, sbr. lög nr. 28/2001 um rafrænar undirskriftir.",
    font, 9, muted, 13,
  );

  // Audit box
  y -= 12;
  ensure(90);
  const boxTop = y;
  const rows = [
    `Dagsetning undirritunar: ${i.signedAtISO}`,
    `IP-tala: ${i.ip}`,
    `Vafri: ${safe(i.userAgent).slice(0, 90)}`,
    `Útgáfa: ${i.version}`,
    `Textahash (SHA-256): ${i.termsHash}`,
  ];
  const boxH = rows.length * 13 + 16;
  page.drawRectangle({ x: M, y: boxTop - boxH, width: maxW, height: boxH, borderColor: rgb(0.85, 0.88, 0.9), borderWidth: 1, color: rgb(0.98, 0.99, 0.99) });
  let ry = boxTop - 14;
  for (const r of rows) {
    page.drawText(safe(r), { x: M + 10, y: ry - 8, size: 8, font, color: muted });
    ry -= 13;
  }

  return doc.save();
}
