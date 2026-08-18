"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Force the window to the very top on a route change.
//
// `html { scroll-behavior: smooth }` (kept for in-page anchors) interferes with
// the App Router's scroll-to-top on navigation, so plain nav links (Heim,
// Þjónusta, Um okkur …) were landing slightly below the top. This resets the
// scroll instantly whenever the path changes — but skips navigations that carry
// a hash (e.g. /thjonusta#faq) so their anchor jump still works.
export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
