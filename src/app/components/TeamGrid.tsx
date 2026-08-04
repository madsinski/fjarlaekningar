"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/site-content/ui-strings";
import type { Locale } from "@/lib/site-content/types";

// Members are now CMS-editable (see src/lib/site-content/um-okkur.ts): the page
// resolves the numbered t{i}_* fields for the current locale and passes them in,
// so role/flag arrive already in the right language and there are no hard-coded
// strings here any more.
export type TeamMember = {
  name: string;
  role: string;
  flag: string;
  photo: string;
};

/** Full-size portrait in a portal. Click anywhere / Escape closes. */
function PhotoLightbox({
  member,
  onClose,
}: {
  member: TeamMember;
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
        <div className="text-sm text-[#a9c9bd]">{member.role}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Magnifier that fades in over a portrait on hover — the click affordance. */
function ZoomHint() {
  return (
    <span className="absolute inset-0 grid place-items-center bg-[var(--primary-dark)]/45 text-white opacity-0 group-hover:opacity-100 transition-opacity">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M11 8v6M8 11h6M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
        />
      </svg>
    </span>
  );
}

/**
 * Two presentations of the same people:
 *
 *   cards      — the default: a bordered white card per person. Reads correctly
 *                on its own band, where the card edges give the grid structure.
 *   portraits  — chrome-free: just the portrait and the name, centred. For the
 *                combined layout, where the grid sits inside a white panel and
 *                a second set of white card edges would only add noise.
 */
export default function TeamGrid({
  members,
  locale = "is",
  variant = "cards",
}: {
  members: TeamMember[];
  locale?: Locale;
  variant?: "cards" | "portraits";
}) {
  const [active, setActive] = useState<TeamMember | null>(null);
  const tr = ui(locale);

  if (!members.length) return null;

  const portraits = variant === "portraits";

  return (
    <>
      {/* No mx-auto: the grid starts at the container's left edge so it lines up
          with the section heading above it, like every other grid on the site. */}
      <div
        className={
          portraits
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-9"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 max-w-5xl"
        }
      >
        {members.map((member) => (
          <button
            key={`${member.name}-${member.photo}`}
            type="button"
            onClick={() => setActive(member)}
            title={tr.clickToEnlarge}
            aria-label={`${tr.enlargeImage}: ${member.name}`}
            className={
              portraits
                ? "group flex flex-col items-center rounded-2xl px-2 py-3 text-center hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                : "group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:shadow-lg hover:border-brand-cyan transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            }
          >
            <div
              className={
                portraits
                  ? "relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-brand-cyan-subtle ring-2 ring-brand-cyan-muted group-hover:ring-[var(--primary)] transition-colors"
                  : "relative w-20 h-20 rounded-full overflow-hidden bg-brand-cyan-subtle ring-2 ring-brand-cyan-muted"
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover object-top"
              />
              <ZoomHint />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 leading-snug">
              {member.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">{member.role}</p>
            {member.flag ? (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-cyan-subtle/70 text-[11px] font-medium text-[var(--primary-dark)] ${
                  portraits ? "mt-2.5" : "mt-3"
                }`}
              >
                {member.flag}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {active && (
        <PhotoLightbox member={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}
