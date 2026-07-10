"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Member = {
  name: string;
  role: string;
  flag: string;
  photo: string;
};

const team: Member[] = [
  {
    name: "Victor Guðmundsson",
    role: "Framkvæmdastjóri · Læknir",
    flag: "Stofnandi",
    photo: "/team/fjar-victor.jpg",
  },
  {
    name: "Mads Christian Aanesen",
    role: "Tæknistjóri · Læknir",
    flag: "Stofnandi",
    photo: "/team/fjar-mads.jpg",
  },
  {
    name: "Guðbjartur Ólafsson",
    role: "Yfirlæknir",
    flag: "Læknateymi",
    photo: "/team/fjar-gudbjartur.jpg",
  },
  {
    name: "Dagbjört Guðbrandsdóttir",
    role: "Læknir",
    flag: "Læknateymi",
    photo: "/team/fjar-dagbjort.jpg",
  },
  {
    name: "Elvar Páll Sigurðsson",
    role: "Rekstrarstjóri · Markaðsstjóri",
    flag: "Stjórnun",
    photo: "/team/fjar-elvar.jpg",
  },
];

/** Full-size portrait in a portal. Click anywhere / Escape closes. */
function PhotoLightbox({
  member,
  onClose,
}: {
  member: Member;
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
          maxWidth: "min(88vw, 540px)",
          maxHeight: "78vh",
          boxShadow: "0 40px 90px -24px rgba(0,0,0,.85)",
        }}
      />
      <div className="text-center text-[#eafaf3]">
        <div className="text-lg sm:text-xl font-bold">{member.name}</div>
        <div className="text-sm text-[#a9c9bd]">{member.role}</div>
      </div>
    </div>,
    document.body,
  );
}

export default function TeamGrid() {
  const [active, setActive] = useState<Member | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => (
          <div
            key={member.name}
            className="bg-white rounded-2xl border border-slate-200 p-6 text-center"
          >
            <button
              type="button"
              onClick={() => setActive(member)}
              title="Smelltu til að stækka"
              aria-label={`Stækka mynd: ${member.name}`}
              className="group relative mx-auto block w-28 h-28 rounded-full overflow-hidden ring-2 ring-brand-cyan-muted transition-transform hover:-translate-y-0.5 hover:ring-brand-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center shadow-md opacity-90 group-hover:opacity-100">
                <svg
                  className="w-3.5 h-3.5"
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
            </button>
            <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-brand-cyan-subtle/60 text-xs font-medium text-[var(--primary-dark)]">
              {member.flag}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              {member.name}
            </h3>
            <p className="text-sm text-slate-600">{member.role}</p>
          </div>
        ))}
      </div>
      {active && (
        <PhotoLightbox member={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}
