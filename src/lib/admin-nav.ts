// Canonical admin sidebar items (shared by the layout and the settings editor).
// Icons live in the layout (keyed by href); labels + order are overridable via
// the "admin_nav" site_settings row so an admin can rename/reorder the menu.

export interface AdminNavItem {
  href: string;
  label: string; // default label
  adminOnly?: boolean;
}

export interface NavConfig {
  order?: string[]; // hrefs, in display order
  labels?: Record<string, string>; // href -> custom label
}

// Vaktakerfi og Reikningar eru ekki hér: þau eru flipar undir Starfsfólki.
// Slóðirnar /admin/roster og /admin/invoices virka áfram beint.
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Yfirlit" },
  { href: "/admin/account", label: "Mín síða" },
  { href: "/admin/website", label: "Vefsíða" },
  { href: "/admin/legal", label: "Lögfræðiskjöl" },
  { href: "/admin/presentations", label: "Kynningar & prentefni" },
  { href: "/admin/stofnanir", label: "Samstarfsstofnanir" },
  { href: "/admin/onboarding", label: "Ný stöð — verkferli", adminOnly: true },
  { href: "/admin/research", label: "Rannsóknir" },
  { href: "/admin/clinical", label: "Klínísk reiknirit" },
  { href: "/admin/surveys", label: "Kannanir" },
  { href: "/admin/communication", label: "Samskipti" },
  { href: "/admin/outreach", label: "Fréttabréf" },
  { href: "/admin/data-requests", label: "Persónuverndarbeiðnir" },
  { href: "/admin/releases", label: "Útgáfusaga" },
  { href: "/admin/errors", label: "Villuskráning" },
  { href: "/admin/team", label: "Starfsfólk", adminOnly: true },
  { href: "/admin/settings", label: "Stillingar" },
];

/** Apply saved label overrides + ordering. New items (not in `order`) keep their
 *  built-in position, appended after the ordered ones. */
export function applyNavConfig(items: AdminNavItem[], cfg: NavConfig | null | undefined): AdminNavItem[] {
  const labels = cfg?.labels ?? {};
  const withLabels = items.map((i) => ({ ...i, label: labels[i.href]?.trim() || i.label }));
  const order = cfg?.order ?? [];
  if (!order.length) return withLabels;
  const rank = (href: string) => {
    const i = order.indexOf(href);
    return i === -1 ? order.length + items.findIndex((x) => x.href === href) : i;
  };
  return [...withLabels].sort((a, b) => rank(a.href) - rank(b.href));
}
