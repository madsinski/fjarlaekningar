"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/site-content/ui-strings";
import type { Locale } from "@/lib/site-content/types";

// Roles and flags carry both languages here, in code, for the same reason the
// erindi do: this list is static, so the CMS translator never sees it.
type Member = {
  name: string;
  role: string;
  roleEn: string;
  flag: string;
  flagEn: string;
  photo: string;
};

const team: Member[] = [
  {
    name: "Victor Guðmundsson",
    role: "Framkvæmdastjóri · Læknir",
    roleEn: "CEO · Physician",
    flag: "Stofnandi",
    flagEn: "Founder",
    photo: "/team/fjar-victor.jpg",
  },
  {
    name: "Mads Christian Aanesen",
    role: "Tæknistjóri · Læknir",
    roleEn: "CTO · Physician",
    flag: "Stofnandi",
    flagEn: "Founder",
    photo: "/team/fjar-mads.jpg",
  },
  {
    name: "Guðbjartur Ólafsson",
    role: "Yfirlæknir",
    roleEn: "Chief Physician",
    flag: "Læknateymi",
    flagEn: "Medical team",
    photo: "/team/fjar-gudbjartur.jpg",
  },
  {
    name: "Dagbjört Guðbrandsdóttir",
    role: "Læknir",
    roleEn: "Physician",
    flag: "Læknateymi",
    flagEn: "Medical team",
    photo: "/team/fjar-dagbjort.jpg",
  },
  {
    name: "Elvar Páll Sigurðsson",
    role: "Rekstrarstjóri · Markaðsstjóri",
    roleEn: "COO · Head of Marketing",
    flag: "Stjórnun",
    flagEn: "Management",
    photo: "/team/fjar-elvar.jpg",
  },
];

/** Full-size portrait in a portal. Click anywhere / Escape closes. */
function PhotoLightbox({
  member,
  role,
  onClose,
}: {
  member: Member;
  role: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={member.name}
      onClick={onClose}
      className="fixed inset-0 z-[10060] grid place-items-center gap-5 p-[5vmin] cursor-zoom-out"
      style={{ background: "rgba(3,16,12,.93)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.photo}
        alt={member.name}
        className="block rounded-3xl object-contain"
        style={{
          maxWidth: "min(88vw, 480px)",
          maxHeight: "76vh",
          boxShadow: "0 40px 90px -24px rgba(0,0,0,.85)",
        }}
      />
      <div className="text-center text-[#eafaf3]">
        <div className="text-lg sm:text-xl font-bold">{member.name}</div>
        <div className="text-sm text-[#a9c9bd]">{role}</div>
      </div>
    </div>,
    document.body,
  );
}

export default function TeamGrid({ locale = "is" }: { locale?: Locale }) {
  const [active, setActive] = useState<Member | null>(null);
  const tr = ui(locale);
  const roleOf = (m: Member) => (locale === "en" ? m.roleEn : m.role);
  const flagOf = (m: Member) => (locale === "en" ? m.flagEn : m.flag);

  return (
    <>
      {/* No mx-auto: the grid starts at the container's left edge so it lines up
          with the section heading above it, like every other grid on the site. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 max-w-5xl">
        {team.map((member) => (
          <button
            key={member.name}
            type="button"
            onClick={() => setActive(member)}
            title={tr.clickToEnlarge}
            aria-label={`${tr.enlargeImage}: ${member.name}`}
            className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-lg hover:border-brand-cyan transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-brand-cyan-subtle ring-2 ring-brand-cyan-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover object-top"
              />
              <span className="absolute inset-0 grid place-items-center bg-[var(--primary-dark)]/45 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 8v6M8 11h6M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                  />
                </svg>
              </span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 leading-snug">
              {member.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">{roleOf(member)}</p>
            <span className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-cyan-subtle/70 text-[11px] font-medium text-[var(--primary-dark)]">
              {flagOf(member)}
            </span>
          </button>
        ))}
      </div>
      {active && (
        <PhotoLightbox member={active} role={roleOf(active)} onClose={() => setActive(null)} />
      )}
    </>
  );
}
