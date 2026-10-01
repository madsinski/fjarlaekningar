// Textar í prentskjalinu (src/lib/hsu/shift-pdf.ts) — dagatalsblað mánaðarins.

import { defineMessages } from "../core";

export const shiftPdf = defineMessages(
  {
    "mine.title": "Vaktir — {name}",
    "mine.count_one": "ein vakt í mánuðinum",
    "mine.count_other": "{n} vaktir í mánuðinum",
    "all.title": "Vaktaplan mánaðarins",
    "all.open": "ómannað",
    "all.youMark": "Þínar vaktir",
    "parts": "Í hverjum degi: dagvinna að ofan, forvakt og bakvakt að neðan. Aðrir læknar eru gráir.",
    "foot": "Vaktaplan HSU — {month}. Birt {at}.",
  },
  {
    en: {
      "mine.title": "Shifts — {name}",
      "mine.count_one": "one shift this month",
      "mine.count_other": "{n} shifts this month",
      "all.title": "Schedule for the month",
      "all.open": "unstaffed",
      "all.youMark": "Your shifts",
      "parts": "Within each day: day work above, on-call and second-on-call below. Other doctors are shown in grey.",
      "foot": "HSU schedule — {month}. Published {at}.",
    },
  },
);
