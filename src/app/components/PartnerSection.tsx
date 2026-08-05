/* eslint-disable @next/next/no-img-element */
// Shared, presentational render of a partner-institution access proposal — the
// section an institution (HSU, HSN, …) can place on its island.is page to give
// patients access to Fjarlækningar, plus a spec block for that institution's
// tech team. Pure/props-only (no server or client-only APIs) so it renders both
// on the public shareable page (server) and in the admin live preview (client).

import { PUBLIC_SITE_URL } from "@/lib/public-site";

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
  // Standard Fjarlækningar process — same wording as the printed collateral.
  const steps: [string, string][] = [
    ["Skráðu þig inn", "Opnaðu sjúklingagáttina með rafrænum skilríkjum — í tölvu eða síma."],
    ["Veldu vandamál", "Svaraðu markvissum spurningalista um einkennin þín."],
    ["Fáðu meðferð", "Læknir metur málið og leggur til meðferð. Lyfseðill fer rafrænt í lyfjagátt."],
  ];

  return (
    <div className="w-full">
      {/* ── The section as it would sit on the institution's site ── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(6,42,56,.6)]">
        <div className="h-[5px] bg-gradient-to-r from-[var(--primary)] to-[#00d6ff]" />
        <div className="p-6 sm:p-10">
          {/* cobrand — Fjarlækningar logo prominent */}
          <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-slate-200 pb-5">
            {p.logo_url && <img src={p.logo_url} alt={p.name} className="h-10 w-auto" />}
            <span className="text-sm text-slate-400">í samstarfi við</span>
            <img src="/fjarlaekningar-logo.svg" alt="Fjarlækningar" className="h-10 sm:h-12 w-auto" />
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
          <p className="mb-8 max-w-[64ch] text-[17px] text-slate-600">{p.intro}</p>

          {/* Svona virkar það — numbered steps (matches the printed collateral) */}
          <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Svona virkar það</p>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {steps.map(([t, b], i) => (
              <div key={i} className="rounded-2xl border border-[#d5eaf2] bg-[#f1f8fb] p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[#00d6ff] text-sm font-extrabold text-white">{i + 1}</div>
                <div className="text-[15px] font-extrabold leading-tight text-slate-900">{t}</div>
                <div className="mt-1 text-[13px] leading-snug text-slate-600">{b}</div>
              </div>
            ))}
          </div>

          {erindi.length > 0 && (
            <>
              <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
                Við getum meðal annars aðstoðað með:
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
              Byrjaðu hér <span aria-hidden>→</span>
            </a>
            <a href={p.info_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--primary-dark)] px-7 py-3.5 text-base font-bold text-[var(--primary-dark)] transition hover:bg-[#f1f8fb]">
              Nánari upplýsingar
            </a>
          </div>

          {/* Availability note (matches the poster's footer line) */}
          <div className="mt-6 flex items-start gap-2.5 text-[13.5px] text-slate-600">
            <span className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary-dark)]">{I.clock}</span>
            <p>
              <b className="text-slate-900">{p.response_time}</b> á opnunartíma · {p.hours}
              {p.region ? ` · Fyrir skjólstæðinga ${p.region}` : ""}
            </p>
          </div>

          {p.safety_note && (
            <p className="mt-4 rounded-xl border border-[#d5eaf2] bg-[#f1f8fb] px-4 py-3.5 text-[13.5px] text-slate-600">
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

// Self-contained, inline-styled HTML for the section — no Tailwind, no external
// CSS — so island.is developers can paste it straight into a page/HTML block.
// Logos become absolute URLs on www.fjarlaekningar.is.
export function buildPartnerHtml(p: PartnerPageData): string {
  const abs = (u: string) => (u?.startsWith("/") ? PUBLIC_SITE_URL + u : u);
  const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const erindi = p.erindi.filter(Boolean);
  const steps: [string, string][] = [
    ["Skráðu þig inn", "Opnaðu sjúklingagáttina með rafrænum skilríkjum — í tölvu eða síma."],
    ["Veldu vandamál", "Svaraðu markvissum spurningalista um einkennin þín."],
    ["Fáðu meðferð", "Læknir metur málið og leggur til meðferð. Lyfseðill fer rafrænt í lyfjagátt."],
  ];
  const font = "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

  const cobrand = `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:20px;border-bottom:1px solid #e2e8f0;padding-bottom:18px;margin-bottom:22px;">${
    p.logo_url ? `<img src="${esc(abs(p.logo_url))}" alt="${esc(p.name)}" style="height:40px;width:auto;">` : ""
  }<span style="font-size:14px;color:#94a3b8;">í samstarfi við</span><img src="${PUBLIC_SITE_URL}/fjarlaekningar-logo.svg" alt="Fjarlækningar" style="height:46px;width:auto;">${
    p.pilot_tag ? `<span style="margin-left:auto;border:1px solid #d5eaf2;background:#f1f8fb;color:#0488a4;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-radius:999px;padding:6px 13px;">${esc(p.pilot_tag)}</span>` : ""
  }</div>`;

  const stepsHtml = `<div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:12px;">Svona virkar það</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;border-collapse:separate;border-spacing:10px 0;"><tr>${steps
    .map(([t, b], i) => `<td width="33%" valign="top" style="background:#f1f8fb;border:1px solid #d5eaf2;border-radius:14px;padding:16px;"><div style="width:30px;height:30px;line-height:30px;text-align:center;border-radius:50%;background:#00a8cc;color:#fff;font-weight:800;font-size:14px;margin-bottom:8px;">${i + 1}</div><div style="font-size:15px;font-weight:800;color:#0f2733;">${esc(t)}</div><div style="font-size:13px;line-height:1.4;color:#475569;margin-top:4px;">${esc(b)}</div></td>`)
    .join("")}</tr></table>`;

  const services = erindi.length
    ? `<div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:12px;">Við getum meðal annars aðstoðað með:</div><div style="margin-bottom:28px;">${erindi
        .map((e) => `<span style="display:inline-block;border:1px solid #e2e8f0;border-radius:999px;padding:8px 15px;font-size:14px;font-weight:600;color:#0f2733;margin:0 8px 8px 0;">${esc(e)}</span>`)
        .join("")}</div>`
    : "";

  const cta = `<div style="margin-bottom:18px;"><a href="${esc(p.service_url)}" target="_blank" rel="noopener" style="display:inline-block;background:#0488a4;color:#fff;text-decoration:none;font-weight:700;font-size:16px;border-radius:999px;padding:14px 30px;margin:0 12px 10px 0;">Byrjaðu hér &rarr;</a><a href="${esc(p.info_url)}" target="_blank" rel="noopener" style="display:inline-block;border:2px solid #0488a4;color:#0488a4;text-decoration:none;font-weight:700;font-size:16px;border-radius:999px;padding:12px 28px;margin:0 0 10px 0;">Nánari upplýsingar</a></div>`;

  const note = `<p style="font-size:13.5px;color:#475569;margin:6px 0 0;"><strong style="color:#0f2733;">${esc(p.response_time)}</strong> á opnunartíma &middot; ${esc(p.hours)}${p.region ? ` &middot; Fyrir skjólstæðinga ${esc(p.region)}` : ""}</p>`;

  const safety = p.safety_note
    ? `<p style="margin:16px 0 0;background:#f1f8fb;border:1px solid #d5eaf2;border-radius:12px;padding:14px 16px;font-size:13.5px;color:#475569;"><strong style="color:#0f2733;">Athugið: </strong>${esc(p.safety_note)}</p>`
    : "";

  return `<div style="max-width:760px;margin:0 auto;${font}color:#334155;">
  <div style="border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
    <div style="height:5px;background:linear-gradient(90deg,#00a8cc,#00d6ff);"></div>
    <div style="padding:32px;">
      ${cobrand}
      <div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0488a4;margin-bottom:10px;">${esc(p.eyebrow)}</div>
      <h2 style="margin:0 0 14px;font-size:30px;line-height:1.15;font-weight:800;color:#0f2733;">${esc(p.title)}</h2>
      <p style="margin:0 0 26px;font-size:17px;line-height:1.6;color:#475569;">${esc(p.intro)}</p>
      ${stepsHtml}
      ${services}
      ${cta}
      ${note}
      ${safety}
    </div>
  </div>
</div>`;
}
