// Required staff onboarding agreements. A staff member is "onboarded" once
// they have accepted the CURRENT version of every agreement listed here.
// Bump `version` when the text materially changes — that forces everyone to
// re-accept on their next admin visit.

export interface StaffAgreement {
  key: string;
  version: string;
  title: string;
  /** Short markdown-ish body shown on the onboarding screen. */
  body: string;
}

export const STAFF_AGREEMENTS: StaffAgreement[] = [
  {
    key: "confidentiality",
    version: "1.0",
    title: "Þagnarskylda og trúnaður",
    body:
      "Sem starfsmaður eða samstarfsaðili Fjarlækninga ehf. skuldbind ég mig til " +
      "að gæta fyllsta trúnaðar um allar persónu- og heilsufarsupplýsingar sem ég " +
      "kann að fá aðgang að. Ég meðhöndla slík gögn einungis í samræmi við lög nr. " +
      "90/2018 um persónuvernd, GDPR, og fyrirmæli ábyrgðaraðila. Þagnarskyldan " +
      "helst þótt störfum ljúki.",
  },
  {
    key: "acceptable_use",
    version: "1.0",
    title: "Notkunarskilmálar stjórnkerfis",
    body:
      "Ég nota stjórnkerfið (admin) einungis í lögmætum tilgangi tengdum starfi " +
      "mínu, ver aðgangsupplýsingar mínar, virkja tveggja þátta auðkenningu (MFA), " +
      "og tilkynni tafarlaust um hvers kyns öryggisatvik eða grun um óheimilan " +
      "aðgang.",
  },
];

/** Keys of every currently-required agreement. */
export function requiredAgreementKeys(): string[] {
  return STAFF_AGREEMENTS.map((a) => a.key);
}

/** Given accepted (key,version) pairs, is this staff fully onboarded? */
export function isFullyOnboarded(
  accepted: { agreement_key: string; version: string }[],
): boolean {
  return STAFF_AGREEMENTS.every((req) =>
    accepted.some((a) => a.agreement_key === req.key && a.version === req.version),
  );
}
