// Textar í prentskjalinu (src/lib/hsu/shift-pdf.ts).

import { defineMessages } from "../core";

export const shiftPdf = defineMessages(
  {
    "mine.title": "Vaktir — {name}",
    "mine.none": "Engar vaktir í {month}.",
    "mine.count_one": "Samtals ein vakt",
    "mine.count_other": "Samtals {n} vaktir",
    "all.title": "Vaktaplan mánaðarins",
    "all.open": "ómannað",
    "all.youMark": "> merkir þínar vaktir.",
    "col.day": "Dagur",
    "col.shift": "Vakt",
    "col.time": "Tími",
    "col.with": "Á vakt sama dag",
    "col.note": "Athugasemd",
    "col.extra": "Aukavakt",
    "shift.extra": "Aukavakt",
    "foot": "Vaktaplan HSU — {month}. Birt {at}.",
    "page": "Síða {n} af {of}",
  },
  {
    en: {
      "mine.title": "Shifts — {name}",
      "mine.none": "No shifts in {month}.",
      "mine.count_one": "One shift in total",
      "mine.count_other": "{n} shifts in total",
      "all.title": "Schedule for the month",
      "all.open": "unstaffed",
      "all.youMark": "> marks your own shifts.",
      "col.day": "Day",
      "col.shift": "Shift",
      "col.time": "Time",
      "col.with": "On duty the same day",
      "col.note": "Note",
      "col.extra": "Extra shift",
      "shift.extra": "Extra shift",
      "foot": "HSU schedule — {month}. Published {at}.",
      "page": "Page {n} of {of}",
    },
  },
);
