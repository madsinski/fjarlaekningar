// Sjálfvirkar áminningar um það sem er ógert fyrir skilafrest mánaðarins —
// tölvupóstur, SMS og tilkynning í kerfinu (src/lib/hsu/tasks.ts).
//
// SMS: ekkert vefslóðarbrot. Íslensk símafyrirtæki sía skeyti með slóð þar til
// Twilio hefur sett hana á hvítlista, svo skeytið segir aðeins „vaktakerfið“.

import { defineMessages } from "../core";

export const tasks = defineMessages(
  {
    // ── Þrep: hve langt er í skilafrestinn ──
    "stage.7": "Vika í skilafrest",
    "stage.3": "Þrír dagar í skilafrest",
    "stage.1": "Skilafrestur á morgun",
    "stage.0": "Skilafrestur í dag",

    // ── Tölvupóstur ──
    "hello": "Sæl(l) {name},",
    "subject.doctor": "{stage}: vaktaóskir fyrir {month}",
    "subject.head": "{stage}: vaktaplan {month}",
    "heading.doctor": "Það vantar vaktaóskir fyrir {month}",
    "heading.head": "Vaktaplan {month} er ógert",
    "intro.doctor": "Skilafrestur vaktaóska fyrir {month} er {date} — þetta er ógert hjá þér:",
    "intro.head": "Skilafrestur fyrir {month} er {date} — þetta er ógert:",
    "foot": "Þessi áminning fer sjálfkrafa út fyrir hvern skilafrest. Þú stýrir henni undir Mín síða → Stillingar.",
    "cta.prefs": "Skrá vaktaóskir",
    "cta.plan": "Opna mánaðarplan",

    // ── Það sem er ógert ──
    "task.prefs": "Skrá og senda vaktaóskir fyrir {month}.",
    "task.draft": "Óskirnar fyrir {month} eru í vinnslu — þær þarf að senda inn.",
    "task.changes": "Yfirlæknir bað um breytingar á óskunum þínum fyrir {month}.",
    "task.review": "Fara yfir og samþykkja innsendar óskir fyrir {month}.",
    "task.build": "Búa til vaktaplan fyrir {month}.",
    "task.publish": "Birta vaktaplan fyrir {month} — læknar sjá vaktirnar fyrst þá.",
    "task.gaps_one": "Ein vakt er ómönnuð í {month}.",
    "task.gaps_other": "{n} vaktir eru ómannaðar í {month}.",
    "task.missing_one": "Einn læknir hefur ekki sent óskir fyrir {month}.",
    "task.missing_other": "{n} læknar hafa ekki sent óskir fyrir {month}.",

    // ── SMS ──
    "sms.doctor": "HSU vaktakerfi: vaktaóskir fyrir {month} vantar. Skilafrestur er {date} — skráðu þig inn í vaktakerfið. Skeytinu er ekki unnt að svara.",
    "sms.head": "HSU vaktakerfi: vaktaplan {month} er ógert. Skilafrestur er {date} — skráðu þig inn í vaktakerfið. Skeytinu er ekki unnt að svara.",

    // ── Tilkynning í kerfinu ──
    "note.title": "{stage} — {month}",

    // ── Birting vaktaplans ──
    "pub.note.title": "Vaktaplan {month} er birt",
    "pub.note.line_one": "Þú ert á einni vakt í {month}. Vaktaplanið er í viðhengi birtingarpóstsins og á Mínar vaktir.",
    "pub.note.line_other": "Þú ert á {n} vöktum í {month}. Vaktaplanið er í viðhengi birtingarpóstsins og á Mínar vaktir.",
    "pub.attach": "Vaktaplanið er í viðhenginu — bæði vaktirnar þínar og allur mánuðurinn, til að prenta.",
  },
  {
    en: {
      "stage.7": "One week to the deadline",
      "stage.3": "Three days to the deadline",
      "stage.1": "Deadline tomorrow",
      "stage.0": "Deadline today",

      "hello": "Hello {name},",
      "subject.doctor": "{stage}: shift requests for {month}",
      "subject.head": "{stage}: schedule for {month}",
      "heading.doctor": "Shift requests for {month} are missing",
      "heading.head": "The schedule for {month} is not done",
      "intro.doctor": "The deadline for shift requests for {month} is {date} — this is outstanding for you:",
      "intro.head": "The deadline for {month} is {date} — this is outstanding:",
      "foot": "This reminder is sent automatically before every deadline. You control it under My page → Settings.",
      "cta.prefs": "Enter shift requests",
      "cta.plan": "Open monthly plan",

      "task.prefs": "Enter and submit your shift requests for {month}.",
      "task.draft": "Your requests for {month} are a draft — they still need to be submitted.",
      "task.changes": "The chief physician asked for changes to your requests for {month}.",
      "task.review": "Review and approve the submitted requests for {month}.",
      "task.build": "Build the schedule for {month}.",
      "task.publish": "Publish the schedule for {month} — doctors only see their shifts then.",
      "task.gaps_one": "One shift is unstaffed in {month}.",
      "task.gaps_other": "{n} shifts are unstaffed in {month}.",
      "task.missing_one": "One doctor has not submitted requests for {month}.",
      "task.missing_other": "{n} doctors have not submitted requests for {month}.",

      "sms.doctor": "HSU shift system: shift requests for {month} are missing. The deadline is {date} — please sign in to the shift system. This message cannot be answered.",
      "sms.head": "HSU shift system: the schedule for {month} is not done. The deadline is {date} — please sign in to the shift system. This message cannot be answered.",

      "note.title": "{stage} — {month}",

      "pub.note.title": "The schedule for {month} is published",
      "pub.note.line_one": "You have one shift in {month}. The schedule is attached to the publication email and is on My shifts.",
      "pub.note.line_other": "You have {n} shifts in {month}. The schedule is attached to the publication email and is on My shifts.",
      "pub.attach": "The schedule is attached — both your own shifts and the whole month, ready to print.",
    },
  },
);
