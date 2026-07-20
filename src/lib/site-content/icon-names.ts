// Lightweight icon-name lookup.
//
// Kept separate from icons.ts on purpose: icons.ts statically imports ~35
// lucide components for the curated quick-pick map, and SiteIcon is a client
// component that only needs to validate a NAME. Importing from here keeps those
// component imports out of the client bundle — SiteIcon renders via lucide's
// DynamicIcon (lazy per icon) instead.

export { LUCIDE_ICON_NAMES as ALL_ICON_NAMES } from "@/lib/presentations/lucide-icon-names";

import { LUCIDE_ICON_NAMES } from "@/lib/presentations/lucide-icon-names";

const NAME_SET: ReadonlySet<string> = new Set(LUCIDE_ICON_NAMES);

/** True when `name` is a real lucide icon name. */
export function isIconName(name: string | undefined): name is string {
  return !!name && NAME_SET.has(name);
}
