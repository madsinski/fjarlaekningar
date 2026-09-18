"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeftRight, Bell, CalendarCheck, CalendarRange, Check, CheckCircle2, ClipboardList, ExternalLink, Home, Settings, Store,
} from "lucide-react";
import Tour, { markOnboarding, type TourStep } from "../_components/Tour";
import { useCommon, useT } from "@/lib/hsu/i18n/client";
import { onboarding as onboardingMsgs } from "@/lib/hsu/i18n/messages/onboarding";
import { portal } from "@/lib/hsu/i18n/messages/portal";
import type { Lang } from "@/lib/hsu/i18n/core";
import { dayLabelL, holidayL, monthLabelL, shiftPeriodL, weekdayShortOf } from "@/lib/hsu/i18n/format";
import HsuHeader from "../_components/HsuHeader";
import { Badge, Button, Card, Field, Modal, Notice, cx, firstName, hsuApi, inputCls, shortName } from "../_components/ui";
import type { PortalData } from "@/lib/hsu/portal";
import {
  effectiveStatus, hhmm, holidayName, openWindow,
  type HsuShift, type HsuShiftType, type HsuSwap,
} from "@/lib/hsu/types";
import PrefsTab from "./PrefsTab";
import RosterTab from "./RosterTab";
import CalendarTab from "./CalendarTab";
import AccountTab from "./AccountTab";
import Journey, { useJourney } from "./Journey";

type Tab = "yfirlit" | "vaktir" | "oskir" | "markadur" | "plan" | "stillingar";

/** Dagatal og aðgangur voru sitt hvor flipinn; hlekkir á þá eiga áfram að virka. */
const TAB_ALIASES: Record<string, Tab> = { dagatal: "stillingar", adgangur: "stillingar" };

const TABS: { key: Tab; labelKey: `tab.${Tab}`; icon: React.ReactNode }[] = [
  // Í tímaröð mánaðarins: óskir → vaktaplan → mínar vaktir → skipti.
  { key: "yfirlit", labelKey: "tab.yfirlit", icon: <Home className="h-4 w-4" /> },
  { key: "oskir", labelKey: "tab.oskir", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "plan", labelKey: "tab.plan", icon: <CalendarRange className="h-4 w-4" /> },
  { key: "vaktir", labelKey: "tab.vaktir", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "markadur", labelKey: "tab.markadur", icon: <Store className="h-4 w-4" /> },
  { key: "stillingar", labelKey: "tab.stillingar", icon: <Settings className="h-4 w-4" /> },
];

export const shiftWhen = (s: { shift_date: string; starts: string; ends: string; label?: string }, lang: Lang = "is") =>
  `${weekdayShortOf(s.shift_date, lang)} ${dayLabelL(s.shift_date, lang)} · ${s.label ? `${s.label} ` : ""}${hhmm(s.starts)}–${hhmm(s.ends)}`;

export default function DoctorPortal({ data, initialTab, initialMonth }: { data: PortalData; initialTab: string; initialMonth: string }) {
  const router = useRouter();
  const wanted = TAB_ALIASES[initialTab] ?? (initialTab as Tab);
  const [tab, setTabState] = useState<Tab>(TABS.some((t) => t.key === wanted) ? wanted : data.me.mustChangePassword ? "stillingar" : "yfirlit");
  const setTab = (t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("t", t);
    url.searchParams.delete("google");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  };
  const refresh = () => router.refresh();
  /** Merkja (eða afmerkja) að útköll vaktarinnar séu komin í Vinnustund. */
  const logVinnustund = async (shift: HsuShift, done: boolean) => {
    const r = await hsuApi(`/api/hsu/me/shifts/${shift.id}/vinnustund`, { method: "PUT", body: { done } });
    if (r.ok) refresh();
  };

  const me = data.me;
  const t = useT(portal);
  const c = useCommon();

  // Kynning á kerfinu: sjálfkrafa í fyrsta sinn (eftir að lykilorði hefur verið skipt).
  const to = useT(onboardingMsgs);
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (me.onboarding["tour:doctor"] || me.mustChangePassword) return;
    const timer = setTimeout(() => setTourOpen(true), 500);
    return () => clearTimeout(timer);
  }, [me.onboarding, me.mustChangePassword]);
  const tourSteps: TourStep[] = [
    { title: to("doctor.0.title", { name: firstName(me.name) }), body: to("doctor.0.body") },
    { target: "tabs", title: to("doctor.1.title"), body: to("doctor.1.body") },
    { target: "journey|tab-yfirlit", title: to("doctor.2.title"), body: to("doctor.2.body"), before: () => setTab("yfirlit") },
    { target: "tab-oskir", title: to("doctor.3.title"), body: to("doctor.3.body"), before: () => setTab("oskir") },
    { target: "tab-plan", title: to("doctor.6.title"), body: to("doctor.6.body"), before: () => setTab("plan") },
    { target: "tab-vaktir", title: to("doctor.4.title"), body: to("doctor.4.body"), before: () => setTab("vaktir") },
    { target: "tab-markadur", title: to("doctor.5.title"), body: to("doctor.5.body"), before: () => setTab("markadur") },
    { target: "tab-stillingar", title: to("doctor.7.title"), body: to("doctor.7.body"), before: () => setTab("stillingar") },
    { target: "lang|user-menu", title: to("doctor.8.title"), body: to("doctor.8.body"), before: () => setTab("yfirlit") },
    { title: to("doctor.9.title"), body: to("doctor.9.body") },
  ];
  const closeTour = () => {
    setTourOpen(false);
    // Lokað = séð, hvort sem farið var í gegn eða sleppt; opnast aftur úr valmyndinni.
    if (!me.onboarding["tour:doctor"]) void markOnboarding("tour:doctor").then(refresh);
  };
  const name = (id: string | null) => data.colleagues.find((c) => c.id === id)?.name ?? t("unknownDoctor");

  const incoming = data.swaps.filter((s) => s.status === "pending" && s.to_doctor === me.id);
  const market = data.swaps.filter((s) => s.status === "pending" && !s.to_doctor && s.from_doctor !== me.id);
  const mine = data.swaps.filter((s) => s.from_doctor === me.id);
  const myRequests = data.swaps.filter((s) => s.status === "awaiting_approval" && s.taken_by === me.id);
  const marketCount = incoming.length + market.length;

  // Næstu þrír mánuðir eru opnir fyrir óskir, auk mánaða sem yfirlæknir hefur enn opna.
  const openPrefMonths = [...new Set([...openWindow(), ...data.months.map((m) => m.month)])]
    .map((month) => ({ month, status: effectiveStatus(data.months.find((m) => m.month === month), month) }))
    .filter((m) => m.status === "collecting" || m.status === "review");
  const prefActions = openPrefMonths.filter((m) => {
    const p = data.prefs.find((x) => x.month === m.month);
    return !p || p.status === "draft" || p.status === "changes_requested";
  });

  return (
    <div className="min-h-screen pb-16">
      <HsuHeader
        unitName={data.unitName}
        userName={me.name}
        links={[
          // SMS-gáttin tilheyrir Fjarlækningum, ekki vaktakerfinu — en læknir
          // hér kemst í hana með sinni innskráningu.
          ...(me.role === "head" ? [{ href: "/hsu/stjorn", label: c("nav.planner"), icon: "grid" as const }] : []),
        ]}
        actions={[{ label: to("menu.tour"), onClick: () => setTourOpen(true), icon: "help" }]}
      />
      <Tour steps={tourSteps} open={tourOpen} onClose={closeTour} />

      <nav className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div data-tour="tabs" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-5 [scrollbar-width:none]">
          {TABS.map((tb) => {
            const badge = tb.key === "markadur" ? marketCount : tb.key === "oskir" ? prefActions.length : tb.key === "vaktir" ? data.requests.length + data.notifications.filter((n) => !n.read_at).length : 0;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)} aria-current={tab === tb.key ? "page" : undefined} data-tour={`tab-${tb.key}`}
                className={cx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                  tab === tb.key ? "bg-[var(--hsu)] text-white" : "text-slate-600 hover:bg-slate-100",
                )}>
                {tb.icon} {t(tb.labelKey)}
                {badge > 0 && <span className={cx("ml-0.5 rounded-full px-1.5 text-[11px]", tab === tb.key ? "bg-white/25" : "bg-red-500 text-white")}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === "yfirlit" && (
          <Overview data={data} incoming={incoming} market={market} go={setTab} onLog={logVinnustund} />
        )}
        {tab === "vaktir" && <ShiftsTab data={data} swaps={mine} refresh={refresh} onLog={logVinnustund} />}
        {tab === "oskir" && <PrefsTab data={data} initialMonth={initialMonth} refresh={refresh} />}
        {tab === "markadur" && (
          <MarketTab data={data} incoming={incoming} market={market} mine={mine} myRequests={myRequests} name={name} refresh={refresh} />
        )}
        {tab === "plan" && <RosterTab meId={me.id} />}
        {tab === "stillingar" && (
          <div className="space-y-8">
            <h1 className="text-xl font-bold">{t("settings.title")}</h1>
            <CalendarTab hasToken={me.hasCalendarToken} />
            <AccountTab me={me} refresh={refresh} />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Yfirlit ────────────────────────────────────────────────────────────────

function Overview({ data, incoming, market, go, onLog }: {
  data: PortalData; incoming: HsuSwap[]; market: HsuSwap[]; go: (t: Tab) => void;
  onLog: (s: HsuShift, done: boolean) => void;
}) {
  const upcoming = data.myShifts.filter((s) => s.shift_date >= data.today);
  const t = useT(portal);
  const hour = new Date().getHours();
  // Liðnar forvaktir/bakvaktir sem á eftir að merkja við í Vinnustund.
  const onCall = new Set(data.shiftTypes.filter((t) => t.kind === "forvakt" || t.kind === "bakvakt").map((t) => t.id));
  const unlogged = data.myShifts.filter((s) => s.shift_date <= data.today && onCall.has(s.shift_type_id ?? "") && !s.vinnustund_logged_at);
  const jr = useJourney({ data, incoming, market, unlogged: unlogged.length, go });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(hour < 18 ? "greeting.day" : "greeting.evening", { name: firstName(data.me.name) })}</h1>
        <p className="text-sm text-slate-500">{data.unitName}</p>
      </div>

      {/* Leiðin í gegnum mánuðinn — opnast á skrefinu sem á við núna. */}
      <Journey steps={jr.steps} landing={jr.landing} planMonth={jr.planMonth} extra={<VinnustundLink />} />

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("upcoming.title")}</h2>
          <div className="flex items-center gap-3">
            <VinnustundLink className="!px-2.5 !py-1 !text-xs" />
            <button onClick={() => go("vaktir")} className="text-sm font-semibold text-[var(--hsu)] hover:underline">{t("upcoming.all")}</button>
          </div>
        </div>
        <Card className="divide-y divide-slate-100">
          {upcoming.slice(0, 5).map((s) => <ShiftRow key={s.id} s={s} types={data.shiftTypes} today={data.today} onLog={onLog} />)}
          {upcoming.length === 0 && <div className="p-5 text-sm text-slate-500">{t("upcoming.empty")}</div>}
        </Card>
      </div>
    </div>
  );
}

/** Vinnustund — þar skrá læknar útköll af forvakt og bakvakt. */
const VINNUSTUND_URL = "https://heima.orri.is/";

function VinnustundLink({ className }: { className?: string }) {
  return (
    <a href={VINNUSTUND_URL} target="_blank" rel="noopener noreferrer"
      className={cx("inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50", className)}>
      <ExternalLink className="h-4 w-4" /> Vinnustund
    </a>
  );
}

/** Litur vaktategundar — sama litakóðun og yfirlæknir sér á vaktaplani. */
function ShiftRow({ s, types, today, onLog, right, extra }: {
  s: HsuShift; types: HsuShiftType[]; today?: string;
  onLog?: (shift: HsuShift, done: boolean) => void; right?: React.ReactNode;
  /** Aukalína undir tímanum, t.d. hver bauð vaktina á vaktamarkaði. */
  extra?: React.ReactNode;
}) {
  const tr = useT(portal);
  const L = tr.lang;
  const h = holidayL(holidayName(s.shift_date), L);
  const t = types.find((x) => x.id === s.shift_type_id);
  const color = t?.color ?? "#64748b";
  // Útköll eru skráð í Vinnustund eftir forvakt og bakvakt.
  const needsVinnustund = t?.kind === "forvakt" || t?.kind === "bakvakt";
  const logged = Boolean(s.vinnustund_logged_at);
  const started = today ? s.shift_date <= today : false;
  return (
    <div className="flex items-center gap-3 border-l-4 px-4 py-3" style={{ borderColor: color }}>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={{ background: color }}>
        <span className="text-[10px] font-bold uppercase leading-none opacity-80">{weekdayShortOf(s.shift_date, L)}</span>
        <span className="text-lg font-bold leading-tight">{Number(s.shift_date.slice(8))}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
          <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: color }}>{s.label || tr("shift")}</span>
          <span>{t?.name ?? tr("shift")}</span>
          <span className="font-medium text-slate-500">{hhmm(s.starts)}–{hhmm(s.ends)}</span>
        </div>
        <div className="truncate text-xs text-slate-500">
          {dayLabelL(s.shift_date, L)}{h ? ` · ${h}` : ""}{t ? ` · ${shiftPeriodL(t.period, L)}` : ""}{s.note ? ` · ${s.note}` : ""}
        </div>
        {extra}
        {needsVinnustund && onLog && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            {logged ? (
              <button onClick={() => onLog(s, false)} title={tr("row.unmarkTitle")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" /> {tr("row.logged")}
              </button>
            ) : (
              <>
                <span className={cx("font-medium", started ? "text-amber-700" : "text-slate-500")}>
                  {started ? tr("row.logNow") : tr("row.logLater")}
                </span>
                <a href={VINNUSTUND_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                  <ExternalLink className="h-3 w-3" /> {tr("row.open")}
                </a>
                <button onClick={() => onLog(s, true)}
                  className={cx("inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold",
                    started ? "bg-amber-500 text-white hover:brightness-110" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {tr("row.markLogged")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {s.status === "open" && <Badge tone="amber">{tr("row.onMarket")}</Badge>}
      {s.status === "offered" && <Badge tone="purple">{tr("row.offered")}</Badge>}
      {right}
    </div>
  );
}

// ── Mínar vaktir ───────────────────────────────────────────────────────────

/**
 * Breytingar sem yfirlæknir gerði á vöktum læknisins eftir birtingu. Ólesnar
 * efst og áberandi; lesnar síðustu daga fyrir neðan, samanbrotnar.
 */
function NotificationsBlock({ data, refresh }: { data: PortalData; refresh: () => void }) {
  const t = useT(portal);
  const [busy, setBusy] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const unread = data.notifications.filter((n) => !n.read_at);
  const read = data.notifications.filter((n) => n.read_at);
  if (!data.notifications.length) return null;

  const markRead = async (ids?: string[]) => {
    setBusy(true);
    await hsuApi("/api/hsu/me/notifications", { body: ids ? { ids } : {} });
    setBusy(false);
    refresh();
  };
  const when = (iso: string) => {
    const d = new Date(iso);
    return t("notif.when", { d: d.getDate(), m: d.getMonth() + 1, hh: String(d.getHours()).padStart(2, "0"), mm: String(d.getMinutes()).padStart(2, "0") });
  };

  return (
    <section className="space-y-2">
      {unread.length > 0 && (
        <Card className="overflow-hidden border-[var(--hsu)]/40">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--hsu-soft)] px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--hsu-dark)]">
              <Bell className="h-4 w-4" /> {t.n("notif.new", unread.length)}
            </h2>
            <Button size="sm" variant="soft" busy={busy} onClick={() => markRead()}>
              <Check className="h-3.5 w-3.5" /> {t("notif.markRead")}
            </Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {unread.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-500">{when(n.created_at)}</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {n.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {read.length > 0 && (
        <div>
          <button onClick={() => setShowOld((v) => !v)} className="text-xs font-semibold text-slate-500 hover:underline">
            {showOld ? t("notif.hideOld") : t("notif.showOld", { n: read.length })}
          </button>
          {showOld && (
            <Card className="mt-2 divide-y divide-slate-100">
              {read.map((n) => (
                <div key={n.id} className="px-4 py-2.5 text-slate-600">
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold">{n.title}</span>
                    <span className="shrink-0">{when(n.created_at)}</span>
                  </div>
                  <ul className="mt-0.5 space-y-0.5 text-xs">{n.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

function ShiftsTab({ data, swaps, refresh, onLog }: { data: PortalData; swaps: HsuSwap[]; refresh: () => void; onLog: (s: HsuShift, done: boolean) => void }) {
  const t = useT(portal);
  const [offer, setOffer] = useState<HsuShift | null>(null);
  const [busy, setBusy] = useState(false);
  const byMonth = useMemo(() => {
    const m = new Map<string, HsuShift[]>();
    for (const s of data.myShifts) (m.get(s.shift_date.slice(0, 7)) ?? m.set(s.shift_date.slice(0, 7), []).get(s.shift_date.slice(0, 7))!).push(s);
    return [...m.entries()];
  }, [data.myShifts]);
  const pendingFor = (id: string) => swaps.find((s) => s.shift_id === id);
  // Liðin vakt sem á eftir að merkja við er ekki "búin" — hún má ekki daufna.
  const onCall = new Set(data.shiftTypes.filter((st) => st.kind === "forvakt" || st.kind === "bakvakt").map((st) => st.id));
  const needsLog = (s: HsuShift) => onCall.has(s.shift_type_id ?? "") && !s.vinnustund_logged_at;

  const cancel = async (swapId: string) => {
    setBusy(true);
    await hsuApi(`/api/hsu/me/swaps/${swapId}`, { method: "PATCH", body: { action: "cancel" } });
    setBusy(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{t("shifts.title")}</h1>
          <p className="text-sm text-slate-500">
            {t("shifts.intro")}
          </p>
        </div>
        <VinnustundLink />
      </div>
      <NotificationsBlock data={data} refresh={refresh} />
      <RequestsBlock data={data} refresh={refresh} />
      {/* Litaskýring: sömu litir og á vaktaplaninu. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 text-[11px] text-slate-500 ring-1 ring-slate-200">
        {data.shiftTypes.filter((st) => st.active).map((st) => (
          <span key={st.id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded" style={{ background: st.color }} />
            <b className="text-slate-700">{st.short || st.name}</b> {st.name} · {hhmm(st.starts)}–{hhmm(st.ends)}
          </span>
        ))}
      </div>
      {byMonth.length === 0 && <Card className="p-8 text-center text-sm text-slate-500">{t("shifts.empty")}</Card>}
      {byMonth.map(([m, rows]) => (
        <section key={m}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t.n("shifts.monthCount", rows.length, { month: monthLabelL(m, t.lang) })}</h2>
          <Card className="divide-y divide-slate-100">
            {rows.map((s) => {
              const past = s.shift_date < data.today;
              const p = pendingFor(s.id);
              return (
                <div key={s.id} className={cx(past && !needsLog(s) && "opacity-50")}>
                  <ShiftRow s={s} types={data.shiftTypes} today={data.today} onLog={onLog} right={past ? null : p ? (
                    <Button variant="ghost" size="sm" busy={busy} onClick={() => cancel(p.id)}>{t("shifts.withdraw")}</Button>
                  ) : (
                    <Button variant="soft" size="sm" onClick={() => setOffer(s)}><ArrowLeftRight className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("shifts.toMarket")}</span><span className="sm:hidden">{t("shifts.toMarketShort")}</span></Button>
                  )} />
                  {p && (
                    <div className="px-4 pb-3 text-xs text-slate-500">
                      {p.status === "awaiting_approval" ? t("shifts.pendingApproval") : p.to_doctor ? t("shifts.offeredTo", { name: data.colleagues.find((c) => c.id === p.to_doctor)?.name ?? "" }) : t("shifts.onMarket")}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      ))}
      {offer && <OfferModal shift={offer} data={data} onClose={() => setOffer(null)} onDone={() => { setOffer(null); refresh(); }} />}
    </div>
  );
}

function OfferModal({ shift, data, onClose, onDone }: { shift: HsuShift; data: PortalData; onClose: () => void; onDone: () => void }) {
  const t = useT(portal);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const others = data.colleagues.filter((c) => c.id !== data.me.id);
  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await hsuApi("/api/hsu/me/swaps", { body: { shift_id: shift.id, to_doctor: target || null, note } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? t("failed")); return; }
    onDone();
  };
  return (
    <Modal open onClose={onClose} title={t("offer.title")}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{shiftWhen(shift, t.lang)}</div>
        <div className="space-y-2">
          <label className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", !target ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : "border-slate-200")}>
            <input type="radio" name="t" className="mt-1" checked={!target} onChange={() => setTarget("")} />
            <span><span className="block text-sm font-semibold">{t("offer.market")}</span><span className="block text-xs text-slate-500">{t("offer.market.body")}</span></span>
          </label>
          <label className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", target ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : "border-slate-200")}>
            <input type="radio" name="t" className="mt-1" checked={Boolean(target)} onChange={() => setTarget(others[0]?.id ?? "")} />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{t("offer.direct")}</span>
              <select className={cx(inputCls, "mt-2")} value={target} onChange={(e) => setTarget(e.target.value)} onClick={(e) => e.stopPropagation()}>
                <option value="">{t("offer.pickDoctor")}</option>
                {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </span>
          </label>
        </div>
        <Field label={t("offer.note")}>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("offer.notePlaceholder")} />
        </Field>
        <p className="text-xs text-slate-500">{t("offer.responsibility")}</p>
        {err && <Notice tone="err">{err}</Notice>}
        <Button className="w-full" size="lg" onClick={submit} busy={busy}>{target ? t("offer.submitDirect") : t("offer.submitMarket")}</Button>
      </div>
    </Modal>
  );
}

// ── Beiðnir um aukavakt ────────────────────────────────────────────────────

function RequestsBlock({ data, refresh }: { data: PortalData; refresh: () => void }) {
  const t = useT(portal);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!data.requests.length) return null;
  const answer = async (id: string, action: "accept" | "decline") => {
    if (action === "decline" && !confirm(t("requests.declineConfirm"))) return;
    setBusy(id + action); setErr(null);
    const r = await hsuApi(`/api/hsu/me/requests/${id}`, { body: { action } });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? t("failed")); return; }
    refresh();
  };
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-700">{t("requests.title")}</h2>
      <Card className="divide-y divide-amber-100 border-amber-300 bg-amber-50/40">
        {data.requests.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: data.shiftTypes.find((st) => st.id === s.shift_type_id)?.color ?? "#64748b" }}>{s.label || t("shift")}</span>
                {shiftWhen(s, t.lang)}
              </div>
              <div className="text-xs text-slate-600">
                {t("requests.body", { who: s.requested_by || t("requests.head") })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="success" busy={busy === s.id + "accept"} onClick={() => answer(s.id, "accept")}>{t("requests.accept")}</Button>
              <Button size="sm" variant="ghost" busy={busy === s.id + "decline"} onClick={() => answer(s.id, "decline")}>{t("requests.decline")}</Button>
            </div>
          </div>
        ))}
      </Card>
      {err && <div className="mt-2"><Notice tone="err">{err}</Notice></div>}
    </section>
  );
}

// ── Vaktamarkaður ──────────────────────────────────────────────────────────

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <Card className="divide-y divide-slate-100">
        {children.length ? children : <div className="p-5 text-sm text-slate-500">{empty}</div>}
      </Card>
    </section>
  );
}

/** Vakt sem boðin er á vaktamarkaði, á því formi sem ShiftRow les. */
function swapShift(s: HsuSwap): HsuShift | null {
  if (!s.shift) return null;
  return {
    id: s.shift_id, shift_date: s.shift.shift_date, starts: s.shift.starts, ends: s.shift.ends,
    label: s.shift.label, shift_type_id: s.shift.shift_type_id ?? null,
    // Vaktamarkaðurinn segir sjálfur að vaktin sé í boði; merkið væri tvítekið.
    status: "assigned", note: "", doctor_id: s.from_doctor,
  } as HsuShift;
}

function MarketTab({ data, incoming, market, mine, myRequests, name, refresh }: {
  data: PortalData; incoming: HsuSwap[]; market: HsuSwap[]; mine: HsuSwap[]; myRequests: HsuSwap[];
  name: (id: string | null) => string; refresh: () => void;
}) {
  const t = useT(portal);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const act = async (id: string, action: "accept" | "decline" | "cancel") => {
    setBusy(id + action); setMsg(null);
    const r = await hsuApi<{ awaitingApproval?: boolean }>(`/api/hsu/me/swaps/${id}`, { method: "PATCH", body: { action } });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("failed") }); return; }
    if (action === "accept") setMsg({ tone: "ok", text: r.awaitingApproval ? t("market.ok.awaiting") : t("market.ok.taken") });
    refresh();
  };
  const when = (s: HsuSwap) => (s.shift ? shiftWhen(s.shift, t.lang) : "");
  const myDates = new Set(data.myShifts.map((s) => s.shift_date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("market.title")}</h1>
        <p className="text-sm text-slate-500">
          {t(data.marketRequiresApproval ? "market.intro.approval" : "market.intro.direct")}
        </p>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Section title={t("market.incoming")} empty={t("market.incoming.empty")}>
        {incoming.map((s) => (
          <MarketRow key={s.id} s={s} types={data.shiftTypes} fallback={when(s)}
            who={s.note ? t("market.fromNote", { name: name(s.from_doctor), note: s.note }) : t("market.from", { name: name(s.from_doctor) })}
            clash={Boolean(s.shift && myDates.has(s.shift.shift_date))}
            actions={<>
              <Button size="sm" onClick={() => act(s.id, "accept")} busy={busy === s.id + "accept"}>{t("market.take")}</Button>
              <Button size="sm" variant="ghost" onClick={() => act(s.id, "decline")} busy={busy === s.id + "decline"}>{t("market.decline")}</Button>
            </>} />
        ))}
      </Section>

      <Section title={t("market.open")} empty={t("market.open.empty")}>
        {market.map((s) => (
          <MarketRow key={s.id} s={s} types={data.shiftTypes} fallback={when(s)}
            who={s.note ? t("market.withNote", { name: name(s.from_doctor), note: s.note }) : name(s.from_doctor)}
            clash={Boolean(s.shift && myDates.has(s.shift.shift_date))}
            actions={<Button size="sm" onClick={() => act(s.id, "accept")} busy={busy === s.id + "accept"}>{t("market.take")}</Button>} />
        ))}
      </Section>

      {myRequests.length > 0 && (
        <Section title={t("market.awaiting")}>
          {myRequests.map((s) => (
            <MarketRow key={s.id} s={s} types={data.shiftTypes} fallback={when(s)} who={t("market.from", { name: name(s.from_doctor) })} />
          ))}
        </Section>
      )}

      <Section title={t("market.mine")} empty={t("market.mine.empty")}>
        {mine.map((s) => (
          <MarketRow key={s.id} s={s} types={data.shiftTypes} fallback={when(s)}
            who={s.status === "awaiting_approval" ? t("market.mine.wantsIt", { name: name(s.taken_by) }) : s.to_doctor ? t("market.mine.offeredTo", { name: name(s.to_doctor) }) : t("market.mine.onMarket")}
            actions={<Button size="sm" variant="ghost" onClick={() => act(s.id, "cancel")} busy={busy === s.id + "cancel"}>{t("market.withdraw")}</Button>} />
        ))}
      </Section>
      <p className="text-xs text-slate-400">{t("market.colleagues", { list: data.colleagues.filter((c) => c.id !== data.me.id).map((c) => `${shortName(c.name)}${c.phone ? ` (${c.phone})` : ""}`).join(" · ") })}</p>
    </div>
  );
}

/** Lína á vaktamarkaði — sama litakóðun og í „Mínum vöktum“. */
function MarketRow({ s, types, fallback, who, clash, actions }: {
  s: HsuSwap; types: HsuShiftType[]; fallback: string; who: string; clash?: boolean; actions?: React.ReactNode;
}) {
  const t = useT(portal);
  const shift = swapShift(s);
  const extra = (
    <>
      <div className="text-xs text-slate-600">{who}</div>
      {clash && <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" /> {t("market.clash")}</div>}
    </>
  );
  // Vakt sem fannst ekki (t.d. eytt) sést samt, án litar.
  if (!shift) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><div className="text-sm font-semibold">{fallback}</div>{extra}</div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    );
  }
  return <ShiftRow s={shift} types={types} extra={extra} right={actions ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div> : undefined} />;
}
