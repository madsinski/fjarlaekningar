"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Presentation,
  Rocket,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
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
  "/admin/research": <FlaskConical className="w-5 h-5" />,
  "/admin/clinical": <Activity className="w-5 h-5" />,
  "/admin/surveys": <ClipboardList className="w-5 h-5" />,
  "/admin/communication": <MessageSquare className="w-5 h-5" />,
  "/admin/outreach": <Mail className="w-5 h-5" />,
  "/admin/data-requests": <ShieldAlert className="w-5 h-5" />,
  "/admin/onboarding": <ClipboardList className="w-5 h-5" />,
  "/admin/releases": <Rocket className="w-5 h-5" />,
  "/admin/errors": <AlertTriangle className="w-5 h-5" />,
  "/admin/team": <Users className="w-5 h-5" />,
  "/admin/settings": <Settings className="w-5 h-5" />,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [navConfig, setNavConfig] = useState<NavConfig>({});

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
      : ordered.filter((n) => n.href === "/admin/account" || n.href === "/admin/settings")
  ).map((n) => ({ ...n, icon: NAV_ICONS[n.href] }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Public site top nav bar, same as fjarlaekningar.is */}
      <Navbar />
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-white font-semibold tracking-tight">Fjarlækningar</div>
          <div className="text-[11px] uppercase tracking-widest text-cyan-400 mt-0.5">Stjórnborð</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
