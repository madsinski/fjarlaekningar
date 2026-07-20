"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import MedaliaButton from "./MedaliaButton";

function LangToggle() {
  const router = useRouter();
  const [lang, setLang] = useState<"is" | "en">("is");
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)lang=(is|en)/);
    if (m) setLang(m[1] as "is" | "en");
  }, []);
  const pick = (l: "is" | "en") => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLang(l);
    router.refresh();
  };
  return (
    <div className="inline-flex rounded-full border border-brand-cyan-muted overflow-hidden text-xs">
      {(["is", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => pick(l)}
          className={`px-2.5 py-1 font-medium transition-colors ${lang === l ? "bg-[var(--primary)] text-white" : "text-slate-600 hover:bg-white/60"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const navLinks = [
  { href: "/", label: "Heim" },
  { href: "/thjonusta", label: "Þjónusta" },
  { href: "/um-okkur", label: "Um okkur" },
  { href: "/hafa-samband", label: "Hafa samband" },
];

export default function Navbar() {
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
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
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
            <LangToggle />
            <MedaliaButton size="sm" />
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
              <LangToggle />
              <MedaliaButton className="w-full" />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
