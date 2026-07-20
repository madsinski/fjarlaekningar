// Icon registry for CMS-editable icons.
//
// A field of type "icon" stores one of these keys. Views look the key up here;
// an unknown/empty key falls back to the caller's default, so content written
// before an icon was renamed still renders.
//
// Icons come from lucide-react (the same high-quality set used across the
// Lifeline admin + the presentation decks), so the whole system shares one
// visual language.

import {
  Zap, ClipboardList, TestTube, Pill, ShieldCheck, BookOpen,
  Target, Lock, Stethoscope, ClipboardPlus, Globe, Award, Sparkles,
  Heart, Clock, MapPin, Mail, Phone, Users, Activity, FileText,
  CheckCircle2, AlertTriangle, Home, Calendar, MessageSquare, Send,
  Video, Microscope, Syringe, Baby, Brain, Eye, Leaf, Star,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  "clipboard-list": ClipboardList,
  "test-tube": TestTube,
  pill: Pill,
  "shield-check": ShieldCheck,
  "book-open": BookOpen,
  target: Target,
  lock: Lock,
  stethoscope: Stethoscope,
  "clipboard-plus": ClipboardPlus,
  globe: Globe,
  award: Award,
  sparkles: Sparkles,
  heart: Heart,
  clock: Clock,
  "map-pin": MapPin,
  mail: Mail,
  phone: Phone,
  users: Users,
  activity: Activity,
  "file-text": FileText,
  "check-circle": CheckCircle2,
  "alert-triangle": AlertTriangle,
  home: Home,
  calendar: Calendar,
  "message-square": MessageSquare,
  send: Send,
  video: Video,
  microscope: Microscope,
  syringe: Syringe,
  baby: Baby,
  brain: Brain,
  eye: Eye,
  leaf: Leaf,
  star: Star,
};

/** Curated "common" keys surfaced first in the picker. */
export const ICON_KEYS: string[] = Object.keys(ICONS);

/** Resolve an icon key to a component, falling back to `fallback`'s icon. */
export function iconFor(key: string | undefined, fallback: string): LucideIcon {
  return (key && ICONS[key]) || ICONS[fallback] || Zap;
}

// ── Full library ────────────────────────────────────────────────────────────
// The complete lucide set (1,986 names) baked out of lucide-react and shared
// with the presentation decks — the same high-quality icon library used across
// the Lifeline admin. The curated ICONS map above stays as the quick-pick list;
// anything in ALL_ICON_NAMES is selectable and renders via <SiteIcon> using
// lucide's DynamicIcon (lazy-loaded per icon, so the bundle isn't bloated).
//
// Re-exported from icon-names.ts, which has no lucide *component* imports — so
// client components can pull the lookup without dragging this map along.
export { ALL_ICON_NAMES, isIconName } from "./icon-names";
