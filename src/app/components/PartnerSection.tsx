/* eslint-disable @next/next/no-img-element */
// Shared, presentational render of a partner-institution access proposal — the
// section an institution (HSU, HSN, …) can place on its island.is page to give
// patients access to Fjarlækningar, plus a spec block for that institution's
// tech team. Pure/props-only (no server or client-only APIs) so it renders both
// on the public shareable page (server) and in the admin live preview (client).

export interface PartnerPageData {
  slug: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  eyebrow: string;
  title: string;
  intro: string;
  region: string;
  response_time: string;
  hours: string;
  service_url: string;
  info_url: string;
  erindi: string[];
  pilot_tag: string;
  safety_note: string;
}

const I = {
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  cal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><rect x="9" y="11" width="6" height="5" rx="1" /><path d="M12 11V9.5" /></svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
};

function copyText(p: PartnerPageData): string {
  return `Fjarlækningar — stafræn læknisþjónusta

${p.intro}

Til að byrja með stendur þjónustan skjólstæðingum ${p.region} til boða.

Dæmi um erindi: ${p.erindi.filter(Boolean).join(", ")}.

${p.safety_note}

[Opna þjónustuna] → ${p.service_url}
[Nánari upplýsingar] → ${p.info_url}`;
}

export default function PartnerSection({
  partner: p,
  showSpec = true,
}: {
  partner: PartnerPageData;
  showSpec?: boolean;
}) {
  const erindi = p.erindi.filter(Boolean);
  const stats: [React.ReactNode, string, string][] = [
    [I.clock, p.response_time, "frá lækni á opnunartíma"],
    [I.cal, p.hours, "opnunartími þjónustunnar"],
    [I.shield, "Örugg sjúklingagátt", "senda erindi hvar og hvenær sem er"],
    [I.pin, p.region, "fyrsta skref tilraunaverkefnis"],
  ];

  return (
    <div className="w-full">
      {/* ── The section as it would sit on the institution's site ── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(6,42,56,.6)]">
        <div className="h-[5px] bg-gradient-to-r from-[var(--primary)] to-[#00d6ff]" />
        <div className="p-6 sm:p-10">
          {/* cobrand */}
          <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-slate-200 pb-5">
            {p.logo_url && <img src={p.logo_url} alt={p.name} className="h-11 w-auto" />}
            <span className="text-sm text-slate-400">í samstarfi við</span>
            <img src="/fjarlaekningar-logo.svg" alt="Fjarlækningar" className="h-7 w-auto" />
            {p.pilot_tag && (
              <span className="ml-auto rounded-full border border-[#d5eaf2] bg-[#f1f8fb] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary-dark)]">
                {p.pilot_tag}
              </span>
            )}
          </div>

          <p className="mb-2.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary-dark)]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#00d6ff] shadow-[0_0_0_4px_rgba(0,214,255,.22)]" />
            {p.eyebrow}
          </p>
          <h1 className="mb-3.5 text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[34px]">
            {p.title}
          </h1>
          <p className="mb-7 max-w-[64ch] text-[17px] text-slate-600">{p.intro}</p>

          {/* stats */}
          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stats.map(([icon, main, sub], i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-[#d5eaf2] bg-[#f1f8fb] px-4 py-3.5">
                <span className="mt-0.5 h-6 w-6 shrink-0 text-[var(--primary-dark)]">{icon}</span>
                <div>
                  <b className="block text-[15px] font-extrabold leading-tight text-slate-900">{main}</b>
                  <span className="block text-[13px] text-slate-500">{sub}</span>
                </div>
              </div>
            ))}
          </div>

          {erindi.length > 0 && (
            <>
              <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
                Dæmi um erindi sem hægt er að leysa
              </p>
              <div className="mb-8 flex flex-wrap gap-2.5">
                {erindi.map((e, i) => (
                  <span key={i} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
                    {e}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-3.5">
            <a href={p.service_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-dark)] px-7 py-3.5 text-base font-bold text-white shadow-[0_12px_26px_-14px_rgba(4,136,164,.8)] transition hover:brightness-110">
              Opna þjónustuna <span aria-hidden>→</span>
            </a>
            <a href={p.info_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--primary-dark)] px-7 py-3.5 text-base font-bold text-[var(--primary-dark)] transition hover:bg-[#f1f8fb]">
              Nánari upplýsingar
            </a>
          </div>

          {p.safety_note && (
            <p className="mt-6 rounded-xl border border-[#d5eaf2] bg-[#f1f8fb] px-4.5 py-3.5 text-[13.5px] text-slate-600">
              <b className="text-slate-900">Athugið: </b>{p.safety_note}
            </p>
          )}
        </div>
      </section>

      {/* ── Spec block for the institution's tech team ── */}
      {showSpec && (
        <div className="mt-10 rounded-3xl bg-[#0b2233] p-6 text-[#eaf5fb] sm:p-10">
          <h2 className="text-xl font-extrabold text-white">Til tæknifólks {p.short_name || p.name}</h2>
          <p className="mt-1 mb-6 text-sm text-[#9fbccd]">
            Allt sem þarf til að setja hlutann upp á island.is-síðu {p.short_name || p.name}.
          </p>

          <h3 className="mb-3 mt-6 text-xs font-extrabold uppercase tracking-[0.12em] text-[#00d6ff]">Hlekkir</h3>
          <div className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-[#204a68] bg-[#12324a] px-4 py-3.5">
              <div className="text-[13px] text-[#9fbccd]">Bein aðgangur (aðalhnappur „Opna þjónustuna“) — opnist í nýjum flipa</div>
              <a href={p.service_url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-sm text-white">{p.service_url}</a>
            </div>
            <div className="rounded-xl border border-[#204a68] bg-[#12324a] px-4 py-3.5">
              <div className="text-[13px] text-[#9fbccd]">Nánari upplýsingar (aukahnappur)</div>
              <a href={p.info_url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-sm text-white">{p.info_url}</a>
            </div>
          </div>

          <h3 className="mb-3 mt-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#00d6ff]">Útfærsla á island.is</h3>
          <ul className="list-disc pl-5 text-[14.5px] leading-relaxed marker:text-[#4d7794]">
            <li>Fyrirsögn (H2) + meginmál (rich text) + tveir hlekkir/hnappar. Ef „hnappar“ component er í boði, notið hann; annars textahlekki.</li>
            <li><b className="text-white">„Opna þjónustuna“</b> er aðalaðgerðin, <b className="text-white">„Nánari upplýsingar“</b> aukaaðgerð.</li>
            <li>Báðir hlekkir opnist í <b className="text-white">nýjum flipa</b> (<code className="font-mono text-[13px]">target=&quot;_blank&quot;</code>, <code className="font-mono text-[13px]">rel=&quot;noopener&quot;</code>).</li>
            <li>Litur Fjarlækninga er blágrænn (<code className="font-mono text-[13px]">#0488a4</code>) — má nota á aðalhnappinn, annars island.is-blár.</li>
          </ul>

          <h3 className="mb-3 mt-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#00d6ff]">Merki</h3>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/fjarlaekningar-logo.svg" download className="inline-flex items-center gap-2.5 rounded-lg border border-[#dbe6ec] bg-white px-3.5 py-2.5 text-[13.5px] font-bold text-[#0b2233]">
              <img src="/fjarlaekningar-logo.svg" alt="" className="h-5 w-auto" /> Sækja Fjarlækningar-merki (SVG)
            </a>
          </div>

          <h3 className="mb-3 mt-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#00d6ff]">Texti til að afrita</h3>
          <pre className="whitespace-pre-wrap rounded-xl border border-[#204a68] bg-[#12324a] px-4 py-4 font-sans text-[14px] leading-relaxed text-[#eaf5fb]">{copyText(p)}</pre>
        </div>
      )}
    </div>
  );
}
