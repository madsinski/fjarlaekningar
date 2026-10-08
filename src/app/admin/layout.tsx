"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Presentation,
  Rocket,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/app/components/Navbar";
import { ADMIN_NAV, applyNavConfig, type NavConfig } from "@/lib/admin-nav";

// Routes that render WITHOUT the admin shell and don't require full clearance
// (session may exist but MFA / onboarding not yet complete).
const BARE_ROUTES = ["/admin/login", "/admin/mfa", "/admin/onboard"];

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  onboarded_at: string | null;
}

// Item labels + order come from src/lib/admin-nav.ts (editable in Stillingar).
// Icons stay here, keyed by href.
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/admin": <LayoutDashboard className="w-5 h-5" />,
  "/admin/account": <UserRound className="w-5 h-5" />,
  "/admin/website": <Globe className="w-5 h-5" />,
  "/admin/legal": <FileText className="w-5 h-5" />,
  "/admin/presentations": <Presentation className="w-5 h-5" />,
  "/admin/stofnanir": <Building2 className="w-5 h-5" />,
  "/admin/evaluation": <BarChart3 className="w-5 h-5" />,
  "/admin/research": <FlaskConical className="w-5 h-5" />,
  "/admin/clinical": <Activity className="w-5 h-5" />,
  "/admin/surveys": <ClipboardList className="w-5 h-5" />,
  "/admin/communication": <MessageSquare className="w-5 h-5" />,
  "/admin/outreach": <Mail className="w-5 h-5" />,
  "/vinnustod": <MessageCircle className="w-5 h-5" />,
  "/admin/vinnustod": <Users className="w-5 h-5" />,
  "/admin/data-requests": <ShieldAlert className="w-5 h-5" />,
  "/admin/onboarding": <ClipboardList className="w-5 h-5" />,
  "/admin/releases": <Rocket className="w-5 h-5" />,
  "/admin/errors": <AlertTriangle className="w-5 h-5" />,
  "/admin/team": <Users className="w-5 h-5" />,
  "/hsu/stjorn": <Stethoscope className="w-5 h-5" />,
  "/admin/settings": <Settings className="w-5 h-5" />,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [navConfig, setNavConfig] = useState<NavConfig>({});
  // Á síma er hliðarstikan skúffa sem opnast úr efstu stikunni.
  const [menuOpen, setMenuOpen] = useState(false);

  const isBare = BARE_ROUTES.includes(pathname);

  const runGate = useCallback(async () => {
    // Server-verify the session so tokens revoked elsewhere are caught.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStaff(null);
      if (pathname !== "/admin/login") {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
      return;
    }

    // Look up the staff row (RLS: a user may always read their own row).
    const { data: profile } = await supabase
      .from("staff")
      .select("id, name, email, role, active, onboarded_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.active) {
      await supabase.auth.signOut();
      router.replace("/admin/login?reason=not_staff");
      return;
    }
    setStaff(profile as StaffProfile);

    // ── MFA / AAL2 gate ──────────────────────────────────────────────────
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp.find((f) => f.status === "verified");
      if (!verified) {
        if (pathname !== "/admin/mfa") {
          router.replace("/admin/mfa?mode=enroll");
          return;
        }
        setReady(true);
        return;
      }
      if (aal?.currentLevel !== "aal2") {
        if (pathname !== "/admin/mfa") {
          router.replace("/admin/mfa?mode=challenge");
          return;
        }
        setReady(true);
        return;
      }
    } catch {
      /* MFA endpoints unreachable — fall through; sensitive writes still gate server-side */
    }

    // ── Onboarding gate ──────────────────────────────────────────────────
    if (!profile.onboarded_at) {
      if (pathname !== "/admin/onboard") {
        router.replace("/admin/onboard");
        return;
      }
      setReady(true);
      return;
    }

    // ── Role-scoped access ───────────────────────────────────────────────
    // Only 'admin' (stjórnandi) sees all of the admin. A 'lawyer' is scoped to
    // the legal module; everyone else is scoped to their own account page. All
    // keep access to their settings + the MFA/onboarding flows.
    const common = pathname.startsWith("/admin/settings") || pathname === "/admin/mfa" || pathname === "/admin/onboard" || pathname === "/admin/account";
    if (profile.role === "lawyer") {
      if (!(pathname.startsWith("/admin/legal") || common)) {
        router.replace("/admin/legal");
        return;
      }
    } else if (profile.role !== "admin") {
      if (!common) {
        router.replace("/admin/account");
        return;
      }
    }

    // Fully cleared. If they somehow sit on a bare route, send them home.
    if (isBare) {
      router.replace(profile.role === "admin" ? "/admin" : profile.role === "lawyer" ? "/admin/legal" : "/admin/account");
      return;
    }
    setReady(true);
  }, [pathname, router, isBare]);

  useEffect(() => {
    // Reset the gate on every navigation, then re-run auth/MFA/onboarding checks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    runGate();
  }, [runGate]);

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/nav", { headers: { Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" } });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) setNavConfig(j.config || {});
    })();
  }, [staff]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Hleð…
      </div>
    );
  }

  // Bare routes (login / mfa / onboard) render full-screen, no shell.
  if (isBare) return <>{children}</>;

  const isAdmin = staff?.role === "admin";
  const isLawyer = staff?.role === "lawyer";
  const ordered = applyNavConfig(ADMIN_NAV, navConfig);
  const nav = (isAdmin
    ? ordered.filter((n) => !n.adminOnly || isAdmin)
    : isLawyer
      ? ordered.filter((n) => n.href.startsWith("/admin/legal") || n.href === "/admin/settings" || n.href === "/admin/account")
      : ordered.filter((n) => n.href === "/admin/account" || n.href === "/admin/settings" || n.href === "/vinnustod")
  ).map((n) => ({ ...n, icon: NAV_ICONS[n.href] }));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const current = nav.filter((n) => isActive(n.href)).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Public site top nav bar, same as fjarlaekningar.is — desktop only; on a
          phone it would take a quarter of the screen. `contents` keeps it sticky. */}
      <div className="hidden lg:contents">
        <Navbar />
      </div>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-2 bg-slate-900 px-2 py-2 text-white">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Opna valmynd"
          aria-expanded={menuOpen}
          className="rounded-lg p-2.5 hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-cyan-400 leading-tight">Stjórnborð</div>
          <div className="truncate text-sm font-semibold leading-tight">{current?.label ?? "Fjarlækningar"}</div>
        </div>
      </div>
      {menuOpen && (
        <button
          type="button"
          aria-label="Loka valmynd"
          onClick={() => setMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50"
        />
      )}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar — a slide-in drawer below lg */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto overscroll-contain transition-[transform,visibility] duration-200 lg:visible lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 lg:overflow-visible shrink-0 bg-slate-900 text-slate-300 flex flex-col ${
          menuOpen ? "translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div>
            <div className="text-white font-semibold tracking-tight">Fjarlækningar</div>
            <div className="text-[11px] uppercase tracking-widest text-cyan-400 mt-0.5">Stjórnborð</div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Loka valmynd"
            className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 lg:py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-cyan-500/15 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 pb-3">
            <div className="text-xs text-white font-medium truncate">{staff?.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{staff?.email}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-cyan-400">
              <ShieldCheck className="w-3 h-3" /> {staff?.role}
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-5 h-5" /> Skrá út
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
