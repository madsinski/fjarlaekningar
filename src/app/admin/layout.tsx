"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  FileText,
  Presentation,
  FlaskConical,
  MessageSquare,
  ShieldAlert,
  Rocket,
  AlertTriangle,
  ClipboardList,
  Activity,
  Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/app/components/Navbar";

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

// Phase 1 nav. Later phases append modules here (legal, presentations,
// research, communication, surveys, privacy requests, releases, errors).
const NAV: { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Yfirlit", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/admin/website", label: "Vefsíða", icon: <Globe className="w-5 h-5" /> },
  { href: "/admin/legal", label: "Lögfræðiskjöl", icon: <FileText className="w-5 h-5" /> },
  { href: "/admin/presentations", label: "Kynningar & prentefni", icon: <Presentation className="w-5 h-5" /> },
  { href: "/admin/research", label: "Rannsóknir", icon: <FlaskConical className="w-5 h-5" /> },
  { href: "/admin/clinical", label: "Klínísk reiknirit", icon: <Activity className="w-5 h-5" /> },
  { href: "/admin/surveys", label: "Kannanir", icon: <ClipboardList className="w-5 h-5" /> },
  { href: "/admin/communication", label: "Samskipti", icon: <MessageSquare className="w-5 h-5" /> },
  { href: "/admin/data-requests", label: "Persónuverndarbeiðnir", icon: <ShieldAlert className="w-5 h-5" /> },
  { href: "/admin/releases", label: "Útgáfusaga", icon: <Rocket className="w-5 h-5" /> },
  { href: "/admin/errors", label: "Villuskráning", icon: <AlertTriangle className="w-5 h-5" /> },
  { href: "/admin/team", label: "Starfsfólk", icon: <Users className="w-5 h-5" />, adminOnly: true },
  { href: "/admin/settings", label: "Stillingar", icon: <Settings className="w-5 h-5" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [staff, setStaff] = useState<StaffProfile | null>(null);

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

    // ── Legal-only (lawyer) gate ─────────────────────────────────────────
    // A 'lawyer' account is scoped to the legal module + their own settings.
    if (profile.role === "lawyer") {
      const allowed =
        pathname.startsWith("/admin/legal") ||
        pathname.startsWith("/admin/settings") ||
        pathname === "/admin/mfa" ||
        pathname === "/admin/onboard";
      if (!allowed) {
        router.replace("/admin/legal");
        return;
      }
    }

    // Fully cleared. If they somehow sit on a bare route, send them home.
    if (isBare) {
      router.replace(profile.role === "lawyer" ? "/admin/legal" : "/admin");
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
  const nav = isLawyer
    ? NAV.filter((n) => n.href.startsWith("/admin/legal") || n.href === "/admin/settings")
    : NAV.filter((n) => !n.adminOnly || isAdmin);

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
