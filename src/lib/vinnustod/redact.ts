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

