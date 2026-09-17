// Villuboð og svör API-leiða lækna (innskráning, Mín síða) og sameiginlegra
// hjálparfalla (requireDoctor, requireManager, lykilorð, aðgangskóði, óskir).

import { defineMessages } from "../core";

export const apiDoctor = defineMessages(
  {
    "req.invalid": "Ógild beiðni",
    "req.notSignedIn": "Ekki innskráð(ur)",
    "req.headOnly": "Aðeins yfirlæknir hefur aðgang",
    "req.notAllowed": "Ekki heimilt",
    "req.unknownAction": "Óþekkt aðgerð",
    "req.unknownKey": "Óþekktur lykill",
    "req.unknownLang": "Óþekkt tungumál",
    "req.invalidMonth": "Ógildur mánuður",

    "password.tooShort": "Lykilorð þarf að vera minnst 10 stafir.",
    "password.tooLong": "Lykilorð er of langt.",
    "password.lettersDigits": "Lykilorð þarf að innihalda bæði bókstafi og tölustafi.",
    "password.wrong": "Lykilorð er rangt.",
    "password.currentWrong": "Núverandi lykilorð er rangt.",
    "password.sameAsOld": "Nýja lykilorðið má ekki vera það sama og það gamla.",
    "pin.fourDigits": "Aðgangskóði er nákvæmlega 4 tölustafir.",
    "pin.obvious": "Veldu kóða sem er ekki augljós (t.d. ekki 1111 eða 1234).",

    "invite.tooMany": "Of margar tilraunir.",
    "invite.expired": "Hlekkurinn er útrunninn eða hefur þegar verið notaður.",

    "login.wrong": "Rangt notandanafn eða lykilorð.",
    "login.missing": "Sláðu inn notandanafn og lykilorð.",
    "login.tooManyNetwork": "Of margar innskráningartilraunir frá þessu neti. Reyndu aftur eftir stutta stund.",
    "login.tooMany": "Of margar innskráningartilraunir. Reyndu aftur eftir stutta stund.",
    "login.locked": "Of margar rangar tilraunir. Reyndu aftur eftir {mins} mín.",

    "pin.throttled": "Of margar tilraunir. Reyndu aftur eftir stutta stund.",
    "pin.deviceUnknown": "Þetta tæki er ekki skráð. Skráðu þig inn með lykilorði.",
    "pin.deviceExpired": "Þetta tæki er ekki lengur skráð. Skráðu þig inn með lykilorði.",
    "pin.noPin": "Enginn aðgangskóði er virkur. Skráðu þig inn með lykilorði.",
    "pin.locked": "Aðgangur er tímabundið læstur. Reyndu aftur síðar.",
    "pin.revoked": "Of margar rangar tilraunir. Skráðu þig inn með lykilorði.",
    "pin.wrong_one": "Rangur kóði. {n} tilraun eftir.",
    "pin.wrong_other": "Rangur kóði. {n} tilraunir eftir.",

    "prefs.futureOnly": "Aðeins má skrá óskir fyrir næstu mánuði.",
    "prefs.closed": "Óskum fyrir þennan mánuð hefur verið lokað. Hafðu samband við yfirlækni.",
    "prefs.minAboveMax": "Lágmark getur ekki verið hærra en hámark.",

    "request.inactive": "Beiðnin er ekki lengur virk",

    "shift.notYours": "Vaktin tilheyrir þér ekki",
    "shift.notFound": "Vaktin fannst ekki",
    "shift.past": "Vaktin er liðin.",
    "shift.answerRequestFirst": "Svaraðu fyrst beiðninni um þessa vakt.",
    "doctor.notFound": "Læknir fannst ekki",

    "swap.selfOffer": "Þú getur ekki boðið sjálfum þér vaktina.",
    "swap.targetNoBakvakt": "Þessi læknir hefur ekki bakvaktarréttindi.",
    "swap.notFound": "Boðið fannst ekki",
    "swap.inactive": "Boðið er ekki lengur virkt",
    "swap.alreadyMoved": "Vaktin hefur þegar skipt um hendur",
    "swap.overlap": "Þú ert þegar á vakt á sama tíma.",
    "swap.noBakvakt": "Þú hefur ekki bakvaktarréttindi.",

    "google.notConfigured": "Google-tenging er ekki uppsett",
  },
  {
    en: {
      "req.invalid": "Invalid request",
      "req.notSignedIn": "Not signed in",
      "req.headOnly": "Only the chief physician has access",
      "req.notAllowed": "Not allowed",
      "req.unknownAction": "Unknown action",
      "req.unknownKey": "Unknown key",
      "req.unknownLang": "Unknown language",
      "req.invalidMonth": "Invalid month",

      "password.tooShort": "Your password must be at least 10 characters long.",
      "password.tooLong": "Your password is too long.",
      "password.lettersDigits": "Your password must contain both letters and numbers.",
      "password.wrong": "Incorrect password.",
      "password.currentWrong": "Your current password is incorrect.",
      "password.sameAsOld": "The new password must be different from the old one.",
      "pin.fourDigits": "The PIN code must be exactly 4 digits.",
      "pin.obvious": "Choose a code that is not obvious (e.g. not 1111 or 1234).",

      "invite.tooMany": "Too many attempts.",
      "invite.expired": "This link has expired or has already been used.",

      "login.wrong": "Incorrect username or password.",
      "login.missing": "Enter your username and password.",
      "login.tooManyNetwork": "Too many sign-in attempts from this network. Please try again shortly.",
      "login.tooMany": "Too many sign-in attempts. Please try again shortly.",
      "login.locked": "Too many failed attempts. Try again in {mins} min.",

      "pin.throttled": "Too many attempts. Please try again shortly.",
      "pin.deviceUnknown": "This device is not registered. Sign in with your password.",
      "pin.deviceExpired": "This device is no longer registered. Sign in with your password.",
      "pin.noPin": "No PIN code is active. Sign in with your password.",
      "pin.locked": "Access is temporarily locked. Please try again later.",
      "pin.revoked": "Too many failed attempts. Sign in with your password.",
      "pin.wrong_one": "Wrong code. {n} attempt left.",
      "pin.wrong_other": "Wrong code. {n} attempts left.",

      "prefs.futureOnly": "Requests can only be entered for the coming months.",
      "prefs.closed": "Requests for this month are closed. Please contact the chief physician.",
      "prefs.minAboveMax": "The minimum cannot be higher than the maximum.",

      "request.inactive": "This request is no longer active",

      "shift.notYours": "This shift is not yours",
      "shift.notFound": "Shift not found",
      "shift.past": "This shift is in the past.",
      "shift.answerRequestFirst": "Please answer the request for this shift first.",
      "doctor.notFound": "Doctor not found",

      "swap.selfOffer": "You cannot offer the shift to yourself.",
      "swap.targetNoBakvakt": "This doctor is not authorised for second on call.",
      "swap.notFound": "Offer not found",
      "swap.inactive": "This offer is no longer active",
      "swap.alreadyMoved": "This shift has already changed hands",
      "swap.overlap": "You already have a shift at the same time.",
      "swap.noBakvakt": "You are not authorised for second on call.",

      "google.notConfigured": "Google Calendar connection is not set up",
    },
  },
);
