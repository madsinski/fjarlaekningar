"use client";

import Link from "next/link";
import { Users, Settings, FileText, Presentation, FlaskConical, MessageSquare, Mail, ClipboardList, ShieldAlert, Rocket, AlertTriangle, Activity } from "lucide-react";

// Dashboard. Phase 1 ships the foundation; later phases light up the modules
// below (shown as "væntanlegt" until their phase lands).
const MODULES: { label: string; icon: React.ReactNode; href?: string; phase: number }[] = [
  { label: "Starfsfólk", icon: <Users className="w-5 h-5" />, href: "/admin/team", phase: 1 },
  { label: "Stillingar", icon: <Settings className="w-5 h-5" />, href: "/admin/settings", phase: 1 },
  { label: "Lögfræðiskjöl", icon: <FileText className="w-5 h-5" />, href: "/admin/legal", phase: 2 },
  { label: "Kynningar & prentefni", icon: <Presentation className="w-5 h-5" />, href: "/admin/presentations", phase: 2 },
  { label: "Rannsóknir", icon: <FlaskConical className="w-5 h-5" />, href: "/admin/research", phase: 3 },
  { label: "Klínísk reiknirit", icon: <Activity className="w-5 h-5" />, href: "/admin/clinical", phase: 3 },
  { label: "Samskipti", icon: <MessageSquare className="w-5 h-5" />, href: "/admin/communication", phase: 3 },
  { label: "Kannanir", icon: <ClipboardList className="w-5 h-5" />, href: "/admin/surveys", phase: 3 },
  { label: "Fréttabréf", icon: <Mail className="w-5 h-5" />, href: "/admin/outreach", phase: 3 },
  { label: "Persónuverndarbeiðnir", icon: <ShieldAlert className="w-5 h-5" />, href: "/admin/data-requests", phase: 3 },
  { label: "Útgáfusaga", icon: <Rocket className="w-5 h-5" />, href: "/admin/releases", phase: 3 },
  { label: "Villuskráning", icon: <AlertTriangle className="w-5 h-5" />, href: "/admin/errors", phase: 3 },
];

export default function AdminDashboard() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">
        Stjórnborð
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Yfirlit</h1>
      <p className="text-sm text-slate-600 mt-1 mb-8">
        Stjórnkerfi Fjarlækninga ehf. Aðeins fyrir starfsfólk.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const card = (
            <div
              className={`rounded-xl border p-5 h-full transition-colors ${
                m.href
                  ? "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-sm"
                  : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div className={`inline-flex rounded-lg p-2 ${m.href ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-400"}`}>
                {m.icon}
              </div>
              <div className="mt-3 font-semibold text-slate-900 text-sm">{m.label}</div>
              {!m.href && (
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">
                  Væntanlegt · áfangi {m.phase}
                </div>
              )}
            </div>
          );
          return m.href ? (
            <Link key={m.label} href={m.href}>
              {card}
            </Link>
          ) : (
            <div key={m.label}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
