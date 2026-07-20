import { createElement } from "react";
import { iconFor } from "./icons";

// Renders a CMS-selected icon by key.
//
// The icon component is looked up from a module-scope table (icons.ts) rather
// than declared inline. We use createElement instead of JSX because rendering a
// component held in a local variable trips react-hooks/static-components — a
// rule aimed at components *constructed* during render losing their state.
// These are stateless SVG glyphs from a fixed table, so there is no state to
// lose, and a dynamic icon-by-key picker needs this indirection.
export default function SiteIcon({
  name,
  fallback,
  className,
  strokeWidth = 1.75,
}: {
  /** Icon key stored in the CMS. Empty/unknown falls back. */
  name?: string;
  /** Icon key to use when `name` is empty or unrecognised. */
  fallback: string;
  className?: string;
  strokeWidth?: number;
}) {
  return createElement(iconFor(name, fallback), {
    className,
    strokeWidth,
    "aria-hidden": true,
  });
}
