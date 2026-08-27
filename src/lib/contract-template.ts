import { billingParty, formatKennitala, type StaffBilling } from "./billing";

// Default contract text pre-filled in the "Rafræn undirritun" composer. Draft —
// review with a lawyer before sending. Fill the [...] placeholders per person.

export const DEFAULT_CONTRACT_TITLE = "Verktakasamningur um fjarlæknaþjónustu";

export const DEFAULT_CONTRACT_BODY = `VERKTAKASAMNINGUR UM FJARLÆKNAÞJÓNUSTU

1. Samningsaðilar
Annars vegar Fjarlækningar ehf., kt. [kennitala Fjarlækninga], Langholtsvegi 111, 104 Reykjavík ("Fjarlækningar"), og hins vegar [Nafn verktaka], kt. [kennitala verktaka] ("Verktaki").

2. Umfang þjónustu
Verktaki sinnir mati og meðferð á einföldum og afmörkuðum erindum í gegnum örugga sjúklingagátt Fjarlækninga, á opnunartíma alla daga milli kl. 10 og 22 samkvæmt vaktaskipulagi. Alvarlegri erindum skal vísað í réttan farveg innan heilbrigðiskerfisins.

3. Staða og ábyrgð
Verktaki starfar sem sjálfstæður verktaki og ber ábyrgð á eigin sköttum og skyldum. Verktaki skal hafa gilt lækningaleyfi og starfa eftir lögum nr. 34/2012 og leiðbeiningum Landlæknis. Verktaki ber faglega ábyrgð á eigin ákvörðunum um greiningu og meðferð.

4. Þóknun og uppgjör
Fyrir hvert leyst erindi (sjúkling) greiðir Fjarlækningar Verktaka þóknun að fjárhæð [þóknun] kr. Uppgjör fer fram mánaðarlega á grundvelli skráðs fjölda sjúklinga á vöktum Verktaka, sem gefur út reikning fyrir þóknun.

5. Vaktir
Vaktir eru skipulagðar í vaktakerfi Fjarlækninga. Verktaki getur boðið vaktir til skipta eða á vaktamarkað og skráir fjölda sjúklinga eftir hverja vakt.

6. Þagnarskylda og persónuvernd
Verktaki er bundinn þagnarskyldu og fer að lögum nr. 90/2018 og reglugerð (ESB) 2016/679 (GDPR). Persónuupplýsingar eru einungis unnar innan öruggra kerfa félagsins.

7. Fagleg gæði
Verktaki fylgir spurningalistum og klínískum leiðbeiningum þjónustunnar og veitir sjúklingum skýrar útskýringar samhliða greiningu og meðferð.

8. Samningstími og uppsögn
Samningurinn er ótímabundinn með eins mánaðar gagnkvæmum uppsagnarfresti. Við verulegar vanefndir er heimilt að rifta án fyrirvara.

9. Lög og varnarþing
Um samninginn gilda íslensk lög og ágreiningur rekst fyrir Héraðsdómi Reykjavíkur.`;


// ── Fylling úr greiðsluupplýsingum ──────────────────────────────────────────


/**
 * Fills the draft from what the contractor entered about themselves.
 *
 * Two versions of clause 1, because the slf decides who the counterparty is:
 * when payment goes to a company, that company is the Verktaki and carries the
 * kennitala. Clause 3 then gains a sentence keeping professional responsibility
 * with the doctor personally — the company can take the payment, it cannot take
 * the medical responsibility, and the contract must not blur the two.
 */
export function fillContract(opts: {
  personName: string;
  billing: Pick<StaffBilling, "invoice_as" | "slf_name" | "slf_kennitala" | "kennitala">;
  rate?: number | null;
  companyKennitala?: string | null;
}): string {
  const { personName, billing, rate, companyKennitala } = opts;
  const party = billingParty(billing, personName);
  const isSlf = billing.invoice_as === "slf" && !!(billing.slf_name || billing.slf_kennitala);

  let body = DEFAULT_CONTRACT_BODY;

  body = body.replace("[Nafn verktaka]", party.name || "[Nafn verktaka]");
  body = body.replace(
    "[kennitala verktaka]",
    party.kennitala ? formatKennitala(party.kennitala) : "[kennitala verktaka]",
  );
  if (companyKennitala) {
    body = body.replace("[kennitala Fjarlækninga]", formatKennitala(companyKennitala));
  }
  if (rate && rate > 0) {
    body = body.replace("[þóknun]", new Intl.NumberFormat("is-IS").format(rate));
  }

  if (isSlf) {
    body = body.replace(
      "Verktaki starfar sem sjálfstæður verktaki og ber ábyrgð á eigin sköttum og skyldum.",
      `Verktaki starfar sem sjálfstæður verktaki og ber ábyrgð á eigin sköttum og skyldum. ` +
      `Þjónustan er innt af hendi af ${personName}${
        billing.kennitala ? `, kt. ${formatKennitala(billing.kennitala)}` : ""
      }, sem ber persónulega faglega ábyrgð á eigin ákvörðunum um greiningu og meðferð óháð því ` +
      `hver tekur við greiðslu samkvæmt samningi þessum.`,
    );
  }

  return body;
}
