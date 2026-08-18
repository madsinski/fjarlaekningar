"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import PortalButton from "./PortalButton";
import { localeHref, stripLocale } from "@/lib/locale";
import type { Locale } from "@/lib/site-content/types";

/**
 * Language switch. Each language is a real URL now, so this NAVIGATES to the
 * sibling page rather than flipping a cookie and re-rendering the same address:
 * that is what makes an English link shareable and indexable.
 *
 * The cookie is still written, but only as a preference — it is all the pages
 * with a single URL and no English twin (/kannanir, /skjol, the admin) have to
 * go on. Pages that live at two URLs ignore it entirely.
 */
function LangToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const isPath = stripLocale(pathname || "/");
  const remember = (l: Locale) => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
  };
  return (
    <div className="inline-flex shrink-0 rounded-full border border-brand-cyan-muted overflow-hidden text-xs">
      {(["is", "en"] as const).map((l) => (
        <Link
          key={l}
          href={localeHref(isPath, l)}
          hrefLang={l}
          onClick={() => remember(l)}
          aria-current={locale === l ? "true" : undefined}
          className={`px-2.5 py-1 font-medium transition-colors ${locale === l ? "bg-[var(--primary)] text-white" : "text-slate-600 hover:bg-white/60"}`}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

// Labels are CMS-editable (page key "chrome"). Props are OPTIONAL and fall back
// to these defaults, so <Navbar /> with no props (e.g. in the admin shell) works
// exactly as before.
export interface NavbarContent {
  nav_home?: string;
  nav_thjonusta?: string;
  nav_faq?: string;
  nav_um_okkur?: string;
  nav_hafa_samband?: string;
  nav_cta?: string;
}

const NAV_DEFAULTS: Required<NavbarContent> = {
  nav_home: "Heim",
  nav_thjonusta: "Þjónusta",
  nav_faq: "Algengar spurningar",
  nav_um_okkur: "Um okkur",
  nav_hafa_samband: "Hafa samband",
  nav_cta: "Opna sjúklingagátt",
};

export default function Navbar({
  content,
  locale = "is",
}: {
  content?: NavbarContent;
  locale?: Locale;
}) {
  const t = { ...NAV_DEFAULTS, ...(content ?? {}) };
  // Every internal link goes through localeHref, so the English header never
  // drops the visitor back onto an Icelandic page mid-session.
  const home = localeHref("/", locale);
  const navLinks = [
    { href: home, label: t.nav_home },
    { href: localeHref("/thjonusta", locale), label: t.nav_thjonusta },
    { href: localeHref("/thjonusta#faq", locale), label: t.nav_faq },
    { href: localeHref("/um-okkur", locale), label: t.nav_um_okkur },
    { href: localeHref("/hafa-samband", locale), label: t.nav_hafa_samband },
  ];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm"
          : "bg-white/70 backdrop-blur-sm"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <Link href={home} className="flex items-center">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active =
                link.href === home
                  ? pathname === home
                  : pathname.startsWith(link.href.split("#")[0]);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    active
                      ? "text-[var(--primary)]"
                      : "text-slate-700 hover:text-[var(--primary)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <LangToggle locale={locale} />
            <PortalButton size="sm" label={t.nav_cta} />
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md text-slate-700"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Valmynd"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-2 py-2 text-base font-medium text-slate-700 hover:text-[var(--primary)]"
              >
                {link.label}
              </Link>
            ))}
            <div className="px-2 pt-2 flex items-center gap-3">
              <LangToggle locale={locale} />
              <PortalButton className="w-full" label={t.nav_cta} />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
