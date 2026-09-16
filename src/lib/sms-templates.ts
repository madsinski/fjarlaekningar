// Sniðmát skeytanna. Föst — starfsmaður semur ekki texta sjálfur.
//
// ÞRJÁR ÁSTÆÐUR fyrir því að textinn er fastur:
//   * Twilio setur innihaldið á hvítlista hjá íslensku símafyrirtækjunum.
//     Frjáls texti gæti fallið utan hvítlistans og verið síaður.
//   * Skeyti frá heilbrigðisþjónustu á að vera eins í hvert sinn: sjúklingur
//     sem fær tvö ólík skeyti veit ekki hvort er ósvikið.
//   * Sendandinn er nafn en ekki númer, svo ekki er hægt að svara. Þess vegna
//     stendur alltaf í skeytinu að ekki sé hægt að svara því.

/** Gátt sjúklings — sama slóð og á vefnum og prentefninu. */
export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";

export interface SmsTemplate {
  key: string;
  label: string;
  /** {nafn} er valkvætt: sé nafnið autt fellur ávarpið burt. */
  body: string;
  lang: "is" | "en";
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    key: "is-portal",
    label: "Íslenska — hlekkur á þjónustuna",
    lang: "is",
    body: `{nafn}Fjarlækningar: smelltu á hlekkinn til að hefja erindi. ${PORTAL_URL}`,
  },
  {
    key: "en-portal",
    label: "English — link to the service",
    lang: "en",
    body: `{nafn}Fjarlaekningar telemedicine: tap the link to start. ${PORTAL_URL}`,
  },
];

/**
 * Setur nafnið inn í sniðmátið. Autt nafn skilur ekkert eftir sig — hvorki
 * komma né bil — svo skeytið lesist eðlilega hvort sem er.
 */
export function renderTemplate(tpl: SmsTemplate, vars: { name?: string }): string {
  const name = (vars.name ?? "").trim();
  // Fyrsta orðið dugar: skeytið er stutt og eftirnafn bætir engu við.
  const first = name.split(/\s+/)[0] ?? "";
  return tpl.body.replace("{nafn}", first ? `${first}, ` : "");
}
