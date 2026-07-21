// Lightweight icon-name lookup.
//
// Kept separate from icons.ts on purpose: icons.ts statically imports ~35
// lucide components for the curated quick-pick map, and SiteIcon is a client
// component that only needs to validate a NAME. Importing from here keeps those
// component imports out of the client bundle — SiteIcon renders via lucide's
// DynamicIcon (lazy per icon) instead.

import { LUCIDE_ICON_NAMES } from "@/lib/presentations/lucide-icon-names";
import { CUSTOM_ICON_NAMES } from "./custom-icons";

/** Custom icons first, so the handful of hand-drawn ones are easy to find in
 *  the picker's 1,986-icon list. */
export const ALL_ICON_NAMES: readonly string[] = [...CUSTOM_ICON_NAMES, ...LUCIDE_ICON_NAMES];

const NAME_SET: ReadonlySet<string> = new Set(ALL_ICON_NAMES);

/** True when `name` is a selectable icon (lucide or custom). */
export function isIconName(name: string | undefined): name is string {
  return !!name && NAME_SET.has(name);
}
