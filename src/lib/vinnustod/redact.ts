// Tekur auðþekkjanlegar persónuupplýsingar úr texta áður en hann fer til
// gervigreindar. Notað bæði í vafra (viðvörun á meðan skrifað er) og á
// netþjóni (sem fjarlægir þær alltaf, hvað sem vafrinn gerði).

export const TRIAGE_MAX = 2000;

/** Tekur út það sem auðþekkjanlegt er: kennitölur, símanúmer og netföng. */
export function redactPersonal(input: string): { text: string; removed: string[] } {
  const removed = new Set<string>();
  let text = input;
  const rules: [RegExp, string, string][] = [
    [/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[netfang]", "netfang"],
    // Kennitala: 6 tölustafir, valfrjálst bandstrik/bil, 4 tölustafir.
    [/\b\d{6}[-\s]?\d{4}\b/g, "[kennitala]", "kennitala"],
    // Símanúmer: +354/00354 og 7 tölustafir, eða erlent númer með +.
    [/(?:\+|00)\d[\d\s-]{6,16}\d/g, "[símanúmer]", "símanúmer"],
    [/\b\d{3}[\s-]?\d{4}\b/g, "[símanúmer]", "símanúmer"],
  ];
  for (const [re, label, name] of rules) {
    text = text.replace(re, () => { removed.add(name); return label; });
  }
  return { text, removed: [...removed] };
}


/**
 * Er kennitala í textanum? Strangara en reglan að ofan, því hér er skeytinu
 * hafnað: fyrstu sex stafirnir verða að vera dagsetning (dagur 01–31, eða
 * 41–71 hjá lögaðilum, mánuður 01–12) og síðasti stafurinn öld (8, 9 eða 0).
 * Þannig stoppa t.d. pöntunarnúmer og símanúmer með landsnúmeri ekki skeytið.
 */
export function hasKennitala(input: string): boolean {
  for (const m of input.matchAll(/(?<!\d)(\d{2})(\d{2})\d{2}[-\s]?\d{3}([890])(?!\d)/g)) {
    const day = Number(m[1]) > 40 ? Number(m[1]) - 40 : Number(m[1]);
    const month = Number(m[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) return true;
  }
  return false;
}

/** Sýnt þegar skeyti í samtölum Vinnustöðvarinnar er hafnað vegna kennitölu. */
export const KENNITALA_BLOCKED = "Skeytið var ekki sent því í því er kennitala. Taktu hana út — persónuupplýsingar sjúklinga mega ekki vera í skilaboðum í Vinnustöðinni.";
