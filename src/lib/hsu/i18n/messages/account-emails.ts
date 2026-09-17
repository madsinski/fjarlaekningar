// Tölvupóstar um aðgang: boð (læknir / yfirlæknir) og þegar læknir er gerður að yfirlækni.

import { defineMessages } from "../core";

export const accountEmails = defineMessages(
  {
    "layout.unit": "Heilsugæslan í Vestmannaeyjum",
    "layout.system": "Vaktakerfi lækna · HSU",

    "invite.subject": "Aðgangur að vaktakerfi HSU",
    "invite.heading": "Velkomin(n) í vaktakerfið",
    "invite.hello": "Sæl/l {name}.",
    "invite.body": "{by} hefur stofnað aðgang fyrir þig að vaktakerfi lækna á Heilsugæslunni í Vestmannaeyjum. Þar skráir þú vaktaóskir, sérð vaktirnar þínar og getur skipt vöktum á vaktamarkaði.",
    "invite.username": "Notandanafnið þitt er {email}. Veldu lykilorð — og, ef þú vilt, fjögurra stafa aðgangskóða til að skrá þig hratt inn í símanum.",
    "invite.tour": "Þegar þú skráir þig inn í fyrsta sinn færðu stutta kynningu á kerfinu.",
    "invite.cta": "Virkja aðganginn",
    "invite.foot": "Hlekkurinn gildir í 14 daga.",
    "invite.text": "Virkjaðu aðganginn þinn að vaktakerfi HSU: {url}",

    "head.subject": "Þú ert yfirlæknir í vaktakerfi HSU",
    "head.heading": "Velkomin(n) sem yfirlæknir",
    "head.body": "{by} hefur stofnað aðgang fyrir þig sem yfirlækni í vaktakerfi lækna á Heilsugæslunni í Vestmannaeyjum. Þú skipuleggur vaktirnar: opnar fyrir óskir lækna, samþykkir þær, býrð til vaktaplan og birtir það.",
    "head.steps": "Eftir innskráningu færðu kynningu á kerfinu og gátlista með fyrstu skrefunum: fara yfir læknana, yfirfara vaktategundir, tengja dagatalið og opna fyrir óskir næsta mánaðar.",
    "head.own": "Þú ert líka læknir í kerfinu og skráir eigin óskir á „Mín síða“.",
    "head.help": "Spurningar? Hafðu samband við Fjarlækningar: {contact}.",
    "head.text": "Virkjaðu aðganginn þinn sem yfirlæknir í vaktakerfi HSU: {url}",

    "promoted.subject": "Þú ert orðin(n) yfirlæknir í vaktakerfi HSU",
    "promoted.heading": "Þú ert yfirlæknir",
    "promoted.body": "{by} hefur gert þig að yfirlækni í vaktakerfi HSU. Þú hefur nú aðgang að vaktaskipulaginu, þar sem þú opnar fyrir óskir, samþykkir þær, býrð til vaktaplan og birtir það.",
    "promoted.steps": "Næst þegar þú opnar vaktaskipulagið færðu kynningu og gátlista með fyrstu skrefunum.",
    "promoted.cta": "Opna vaktaskipulagið",
    "promoted.text": "Þú ert orðin(n) yfirlæknir í vaktakerfi HSU. Vaktaskipulagið: {url}",
    "promoted.notice": "{by} gerði þig að yfirlækni. Vaktaskipulagið er undir nafninu þínu efst á síðunni.",
  },
  {
    en: {
      "layout.unit": "Vestmannaeyjar Health Centre",
      "layout.system": "Doctors' rota · HSU",

      "invite.subject": "Your access to the HSU rota",
      "invite.heading": "Welcome to the rota",
      "invite.hello": "Hello {name},",
      "invite.body": "{by} has created an account for you in the doctors' rota at Vestmannaeyjar Health Centre. There you enter your shift requests, see your shifts and can swap shifts on the shift market.",
      "invite.username": "Your username is {email}. Choose a password — and, if you like, a four-digit code for quick sign-in on your phone.",
      "invite.tour": "The first time you sign in you'll get a short tour of the system.",
      "invite.cta": "Activate your account",
      "invite.foot": "The link is valid for 14 days.",
      "invite.text": "Activate your account in the HSU rota: {url}",

      "head.subject": "You are chief physician in the HSU rota",
      "head.heading": "Welcome, chief physician",
      "head.body": "{by} has created an account for you as chief physician in the doctors' rota at Vestmannaeyjar Health Centre. You plan the shifts: open requests from doctors, approve them, build the rota and publish it.",
      "head.steps": "After signing in you'll get a tour of the system and a checklist of first steps: review the doctors, check the shift types, connect your calendar and open requests for next month.",
      "head.own": "You are also a doctor in the system and enter your own requests under “My page”.",
      "head.help": "Questions? Contact Fjarlækningar: {contact}.",
      "head.text": "Activate your chief physician account in the HSU rota: {url}",

      "promoted.subject": "You are now chief physician in the HSU rota",
      "promoted.heading": "You are chief physician",
      "promoted.body": "{by} has made you chief physician in the HSU rota. You now have access to rota planning, where you open requests, approve them, build the rota and publish it.",
      "promoted.steps": "The next time you open rota planning you'll get a tour and a checklist of first steps.",
      "promoted.cta": "Open rota planning",
      "promoted.text": "You are now chief physician in the HSU rota. Rota planning: {url}",
      "promoted.notice": "{by} made you chief physician. Rota planning is under your name at the top of the page.",
    },
  },
);
