"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Settings, Store, Users } from "lucide-react";
import HsuHeader from "../_components/HsuHeader";
import { Card, Notice, cx, hsuApi, capFirst } from "../_components/ui";
import { MONTH_STATUS_IS, monthKey, monthLabel, shiftMonth } from "@/lib/hsu/types";
import { supabase } from "@/lib/supabase";
import type { Overview } from "./types";
import MonthFlow from "./MonthFlow";
import DoctorsTab from "./DoctorsTab";
import MarketAdmin from "./MarketAdmin";
import SettingsTab from "./SettingsTab";
import HeadGuide from "./HeadGuide";
import Tour, { markOnboarding, seenLocally, type TourStep } from "../_components/Tour";
import { useT } from "@/lib/hsu/i18n/client";
import { onboarding as onboardingMsgs } from "@/lib/hsu/i18n/messages/onboarding";

type Tab = "plan" | "laeknar" | "markadur" | "stillingar";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "plan", label: "Mánaðarplan", icon: <CalendarRange className="h-4 w-4" /> },
  { key: "laeknar", label: "Læknar", icon: <Users className="h-4 w-4" /> },
  { key: "markadur", label: "Vaktamarkaður", icon: <Store className="h-4 w-4" /> },
  { key: "stillingar", label: "Stillingar", icon: <Settings className="h-4 w-4" /> },
];

export default function PlannerApp() {
  const [tab, setTabState] = useState<Tab>("plan");
  const [month, setMonthState] = useState(() => shiftMonth(monthKey(new Date()), 1));
  const [data, setData] = useState<Overview | null>(null);
  // Hvaða mánuð gögnin eiga við. Meðan nýr mánuður hleðst er sá gamli ekki sýndur.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Slóðin geymir flipa og mánuð, svo hlekkur í tölvupósti opni rétta sýn.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("t");
    const m = q.get("m");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t && TABS.some((x) => x.key === t)) setTabState(t as Tab);
    if (m && /^\d{4}-\d{2}$/.test(m)) setMonthState(m);
  }, []);

  const syncUrl = (t: Tab, m: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("t", t);
    url.searchParams.set("m", m);
    window.history.replaceState(null, "", url);
  };
  const setTab = (t: Tab) => { setTabState(t); syncUrl(t, month); };
  const setMonth = (m: string) => { setMonthState(m); syncUrl(tab, m); };

  // Svar fyrir mánuð sem búið er að fletta frá má ekki skrifa yfir nýrri gögn:
  // hægara svar fyrir gamla mánuðinn myndi annars festa síðuna í hleðslu.
  const latest = useRef(month);
  useEffect(() => { latest.current = month; }, [month]);
  const load = useCallback(async () => {
    const r = await hsuApi<Overview & { status?: number }>(`/api/hsu/admin/overview?month=${month}`, { staff: true });
    if (latest.current !== month) return;
    if (r.ok) { setData(r); setLoadedFor(month); setError(null); return; }
    const status = (r as { status?: number }).status;
    if (status === 401) { window.location.href = "/hsu?next=/hsu/stjorn"; return; }
    setError(r.error ?? "Gat ekki sótt gögn");
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const patch = useCallback((fn: (d: Overview) => Overview) => setData((d) => (d ? fn(d) : d)), []);

  // Innleiðing yfirlæknis: kynning í fyrsta sinn, svo gátlisti á Mánaðarplani.
  // Stjórnandi Fjarlækninga sér hvorugt sjálfkrafa en getur opnað úr valmyndinni.
  const to = useT(onboardingMsgs);
  const [tourOpen, setTourOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState<boolean | null>(null);
  const actorKind = data?.actor.kind;
  const seen = data?.actor.onboarding;
  useEffect(() => {
    if (!actorKind || !seen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuideOpen((g) => g ?? (actorKind === "doctor" ? !seen["guide:head"] : false));
    if (actorKind !== "doctor" || seen["tour:head"]) return;
    const timer = setTimeout(() => { setTabState("plan"); setTourOpen(true); }, 600);
    return () => clearTimeout(timer);
  }, [actorKind, seen]);
  const persist = actorKind === "doctor";
  const closeTour = () => {
    setTourOpen(false);
    if (persist ? !seen?.["tour:head"] : !seenLocally("tour:head")) {
      void markOnboarding("tour:head", true, persist).then(() => { if (persist) void load(); });
    }
  };
  const hideGuide = () => {
    setGuideOpen(false);
    void markOnboarding("guide:head", true, persist);
  };
  const tourSteps: TourStep[] = [
    { title: to("head.0.title", { name: (data?.actor.label ?? "").split(" (")[0].split(" ")[0] }), body: to("head.0.body") },
    { target: "tabs", title: to("head.1.title"), body: to("head.1.body"), before: () => setTab("plan") },
    { target: "month-nav", title: to("head.2.title"), body: to("head.2.body"), before: () => setTab("plan") },
    { target: "month-flow", title: to("head.3.title"), body: to("head.3.body"), before: () => setTab("plan") },
    { target: "tab-laeknar", title: to("head.4.title"), body: to("head.4.body"), before: () => setTab("laeknar") },
    { target: "tab-markadur", title: to("head.5.title"), body: to("head.5.body"), before: () => setTab("markadur") },
    { target: "tab-stillingar", title: to("head.6.title"), body: to("head.6.body"), before: () => setTab("stillingar") },
    { target: "user-menu", title: to("head.7.title"), body: to("head.7.body"), before: () => setTab("plan") },
    { target: "head-guide", title: to("head.8.title"), body: to("head.8.body"), before: () => { setTab("plan"); setGuideOpen(true); } },
  ];

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center">
          <h1 className="text-lg font-bold">Enginn aðgangur</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-2 text-xs text-slate-500">Vaktaskipulagið er fyrir yfirlækni HSU og stjórnendur Fjarlækninga (með tvíþátta auðkenningu).</p>
          <a href="/hsu" className="mt-4 inline-block text-sm font-semibold text-[var(--hsu)] hover:underline">Fara á innskráningu</a>
        </Card>
      </main>
    );
  }

  const isStaff = data?.actor.kind === "staff";
  const awaiting = data?.swaps.filter((s) => s.status === "awaiting_approval").length ?? 0;
  const monthRow = data?.months.find((m) => m.month === month);

  return (
    <div className="min-h-screen pb-20">
      <HsuHeader
        unitName={data?.settings.unit_name ?? "Heilsugæslan í Vestmannaeyjum"}
        subtitle="Vaktaskipulag"
        userName={data?.actor.label ?? "…"}
        links={isStaff
          ? [{ href: "/admin", label: "Stjórnborð Fjarlækninga", icon: "grid" }]
          : [{ href: "/hsu/min-sida", label: "Mín síða", icon: "user" }]}
        actions={[
          { label: to("menu.tour"), onClick: () => setTourOpen(true), icon: "help" },
          { label: to("menu.guide"), onClick: () => { setTab("plan"); setGuideOpen(true); if (persist) void markOnboarding("guide:head", false); }, icon: "list" },
        ]}
        onLogout={async () => {
          if (isStaff) { await supabase.auth.signOut(); return "/admin/login"; }
          await hsuApi("/api/hsu/auth/logout", { body: {} });
        }}
      />

      <nav className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <div data-tour="tabs" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} data-tour={`tab-${t.key}`}
                className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                  tab === t.key ? "bg-[var(--hsu)] text-white" : "text-slate-600 hover:bg-slate-100")}>
                {t.icon} {t.label}
                {t.key === "markadur" && awaiting > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] text-white">{awaiting}</span>}
              </button>
            ))}
          </div>
          {tab === "plan" && (
            <div data-tour="month-nav" className="flex items-center gap-1.5">
              <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Fyrri mánuður" className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
              <div className="w-40 text-center">
                <div className="text-sm font-bold leading-tight">{capFirst(monthLabel(month))}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{monthRow ? MONTH_STATUS_IS[monthRow.status] : "Ekki hafið"}</div>
              </div>
              <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Næsti mánuður" className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {isStaff && (
          <div className="mb-4">
            <Notice tone="info">Þú ert innskráð(ur) sem stjórnandi Fjarlækninga og hefur fullan aðgang að vaktaskipulagi HSU.</Notice>
          </div>
        )}
        {error && <div className="mb-4"><Notice tone="err">{error}</Notice></div>}
        {!data || (tab === "plan" && loadedFor !== month) ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
          </div>
        ) : (
          <>
            {tab === "plan" && guideOpen && (
              <div data-tour="head-guide">
                <HeadGuide data={data} onHide={hideGuide}
                  onGo={(g) => { if (g === "min-sida") window.location.href = "/hsu/min-sida?t=stillingar"; else setTab(g); }} />
              </div>
            )}
            {tab === "plan" && <div data-tour="month-flow"><MonthFlow ctx={{ data, month, reload: load, patch }} /></div>}
            {tab === "laeknar" && <DoctorsTab ctx={{ data, month, reload: load, patch }} />}
            {tab === "markadur" && <MarketAdmin ctx={{ data, month, reload: load, patch }} />}
            {tab === "stillingar" && <SettingsTab ctx={{ data, month, reload: load, patch }} />}
          </>
        )}
        {data && data.doctors.length === 0 && tab !== "laeknar" && (
          <div className="mt-4"><Notice tone="warn">Engir læknar eru skráðir. <button className="font-semibold underline" onClick={() => setTab("laeknar")}>Bæta við læknum</button></Notice></div>
        )}
      </main>
      <Tour steps={tourSteps} open={tourOpen && Boolean(data)} onClose={closeTour} />
    </div>
  );
}
