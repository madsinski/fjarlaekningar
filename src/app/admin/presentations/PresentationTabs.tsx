"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Two equal-weight subpages of the presentations area.
const TABS = [
  {
    href: "/admin/presentations",
    label: "Kynningar",
    isActive: (p: string) => p === "/admin/presentations",
  },
  {
    href: "/admin/presentations/printables",
    label: "Prentefni",
    isActive: (p: string) => p.startsWith("/admin/presentations/printables"),
  },
];

export default function PresentationTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-8 border-b border-slate-200">
      {TABS.map((t) => {
        const active = t.isActive(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative -mb-px py-3 text-sm font-semibold transition-colors ${
              active ? "text-cyan-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-cyan-600" />}
          </Link>
        );
      })}
    </div>
  );
}
