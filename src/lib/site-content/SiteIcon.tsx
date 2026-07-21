"use client";

import { DynamicIcon } from "lucide-react/dynamic";
import { isIconName } from "./icon-names";
import { CUSTOM_ICONS, isCustomIconName } from "./custom-icons";

// Renders a CMS-selected icon by key, from the FULL lucide library (1,986
// icons — the same high-quality set the presentation decks use).
//
// lucide's DynamicIcon lazy-loads each icon on demand, so making the whole
// library selectable doesn't bloat the bundle. It needs a client boundary, but
// this is a tiny leaf component — the surrounding page stays a server component.
//
// An empty or unrecognised key falls back to `fallback`, so content written
// before an icon was renamed still renders something sensible.
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
  // Custom icons win over lucide: they exist precisely because lucide has no
  // equivalent, so there is nothing to collide with.
  const key = isCustomIconName(name) || isIconName(name) ? name : fallback;
  if (isCustomIconName(key)) {
    const Custom = CUSTOM_ICONS[key];
    return <Custom className={className} strokeWidth={strokeWidth} />;
  }
  return (
    <DynamicIcon
      name={key as never}
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden
    />
  );
}
