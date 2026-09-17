# Þýðingar vaktakerfis HSU (íslenska / enska)

Allur texti sem notandi sér í vaktakerfinu (`/hsu`, `/hsu/min-sida`, `/hsu/stjorn`,
`/hsu/virkja`, API-villuboð og tölvupóstar) kemur úr textasöfnum í
`src/lib/hsu/i18n/messages/`. Íslenska er frumtextinn; enska er skilgreind við hlið
hennar og **TypeScript neitar að þýða ef lykil vantar á ensku**.

## Hvernig tungumálið er valið

| Hvar | Uppspretta |
| --- | --- |
| Vafri | kakan `hsu_lang` (`is` / `en`), sett með `LanguageSwitch` (efst í haus og í valmynd) → `POST /api/hsu/lang` |
| Læknir | `hsu_doctors.lang` — vistað þegar læknir skiptir um tungumál eða velur það á innskráningarsíðu; kakan sett við innskráningu |
| Tölvupóstar og tilkynningar | tungumál viðtakandans (`doctorLangs()` / `doctorLang()`) |
| API-villuboð | kakan í beiðninni (`tr(req, safn)`) |

## Að nota texta

```tsx
// Íhlutur í vafra
import { useT, useCommon, useLang } from "@/lib/hsu/i18n/client";
import { stjorn } from "@/lib/hsu/i18n/messages/stjorn";

const t = useT(stjorn);
t("doctors.add");                        // "Bæta við lækni" / "Add doctor"
t("doctors.invited", { name });          // breytur: "Boð sent til {name}"
t.n("shifts", count);                    // shifts_one / shifts_other, {n} = fjöldi
t.dyn(`status.${s}`);                    // lykill settur saman á keyrslutíma
t.lang;                                  // "is" | "en"
const c = useCommon();                   // sameiginlegir hnappar, mánuðir, stöður
```

```ts
// API-leið
import { tr } from "@/lib/hsu/i18n/server";
import { api } from "@/lib/hsu/i18n/messages/api";
const t = tr(req, api);
return fail(t("doctor.notFound"), 404);

// Tölvupóstur til læknis
const lang = await doctorLang(doctorId);
const t = translator(emails, lang);
hsuEmailHtml({ origin, lang, heading: t("…"), paragraphs: [...] });
```

Dagsetningar og heiti: `src/lib/hsu/i18n/format.ts` — `monthLabelL(month, lang)`,
`dayLabelL`, `weekdayShortL`, `monthStatusL`, `prefStatusL`, `roleL`,
`shiftKindL`, `dayPartL`, `holidayL`, `timeAgoL`, `dateTimeL`, `capFirstL`.
Gömlu föllin í `types.ts` (`monthLabel`, `MONTH_STATUS_IS` …) eru áfram til fyrir
innri rökfræði en eiga ekki að birtast notanda.

## Reglur

- **Einn lykill = ein setning eða eining.** Aldrei skeyta saman bútum („Þú ert með “ + n + “ vaktir“); notaðu breytur og `t.n()`.
- **Fleirtala:** `lykill_one` og `lykill_other`. Íslenska eintalan gildir um tölur sem enda á 1 nema 11 (1, 21, 31 vakt).
- **Lyklaheiti** á ensku, punktaskipt eftir svæði: `plan.publish.confirm`.
- Vaktaheiti, nöfn lækna og texti sem notendur skrifa sjálfir (athugasemdir, vaktategundir) **eru ekki þýdd**.
- Íslenskur texti fer í gegnum `scripts/yfirlestur.py` (GreynirCorrect) áður en hann er birtur.

## Nýtt tungumál

1. Bæta því við `LANGS`, `LANG_NAMES` og `LANG_LOCALE` í `core.ts`.
2. TypeScript bendir á hvert textasafn sem vantar þýðinguna — fylla út.
3. Bæta því við `hsu_doctors_lang_check` í `supabase/hsu-schema.sql`.

## Textasöfn

| Skrá | Svæði |
| --- | --- |
| `common.ts` | mánuðir, vikudagar, stöður, hlutverk, almennir hnappar, frídagar |
| `onboarding.ts` | kynning á kerfinu (læknar og yfirlæknir), leiðarvísir yfirlæknis |
| `account-emails.ts` | boð, yfirlæknir, útlit tölvupósta |
| `auth.ts` | innskráning, aðgangskóði, virkjun, gleymt lykilorð |
| `portal.ts` | Mín síða (yfirlit, vaktir, óskir, markaður, plan, stillingar, dagatal) |
| `prefs.ts` | óskaskráning (sameiginleg lækni og yfirlækni) |
| `stjorn.ts` | vaktaskipulag: mánaðarflæði, læknar, markaður, stillingar |
| `board.ts` | vaktaplanið (draga og sleppa) |
| `api.ts` | villuboð og svör API-leiða |
| `notify.ts` | tölvupóstar og tilkynningar um vaktir, óskir og markað |
