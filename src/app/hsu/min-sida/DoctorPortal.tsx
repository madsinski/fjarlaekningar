"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeftRight, CalendarCheck, CalendarRange, CheckCircle2, ChevronRight, ClipboardList, ExternalLink, Home, Settings, Store,
} from "lucide-react";
import HsuHeader from "../_components/HsuHeader";
import { Badge, Button, Card, Field, Modal, Notice, cx, firstName, hsuApi, inputCls, shortName, capFirst } from "../_components/ui";
import type { PortalData } from "@/lib/hsu/portal";
import {
  SHIFT_PERIOD_IS, WEEKDAY_LONG_IS, dayLabel, hhmm, holidayName, monthKey, monthLabel, shiftMonth, weekdayOf, weekdayShort,
  type HsuShift, type HsuShiftType, type HsuSwap,
} from "@/lib/hsu/types";
import PrefsTab from "./PrefsTab";
import RosterTab from "./RosterTab";
import CalendarTab from "./CalendarTab";
import AccountTab from "./AccountTab";

type Tab = "yfirlit" | "vaktir" | "oskir" | "markadur" | "plan" | "stillingar";

/** Dagatal og aðgangur voru sitt hvor flipinn; hlekkir á þá eiga áfram að virka. */
const TAB_ALIASES: Record<string, Tab> = { dagatal: "stillingar", adgangur: "stillingar" };

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "yfirlit", label: "Yfirlit", icon: <Home className="h-4 w-4" /> },
  { key: "vaktir", label: "Mínar vaktir", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "oskir", label: "Óskir", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "markadur", label: "Vaktamarkaður", icon: <Store className="h-4 w-4" /> },
  { key: "plan", label: "Vaktaplan", icon: <CalendarRange className="h-4 w-4" /> },
  { key: "stillingar", label: "Stillingar", icon: <Settings className="h-4 w-4" /> },
];

export const shiftWhen = (s: { shift_date: string; starts: string; ends: string; label?: string }) =>
  `${weekdayShort(s.shift_date)} ${dayLabel(s.shift_date)} · ${s.label ? `${s.label} ` : ""}${hhmm(s.starts)}–${hhmm(s.ends)}`;

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
  const name = (id: string | null) => data.colleagues.find((c) => c.id === id)?.name ?? "óþekktur";

  const incoming = data.swaps.filter((s) => s.status === "pending" && s.to_doctor === me.id);
  const market = data.swaps.filter((s) => s.status === "pending" && !s.to_doctor && s.from_doctor !== me.id);
  const mine = data.swaps.filter((s) => s.from_doctor === me.id);
  const myRequests = data.swaps.filter((s) => s.status === "awaiting_approval" && s.taken_by === me.id);
  const marketCount = incoming.length + market.length;

  const openPrefMonths = data.months.filter((m) => m.status === "collecting" || m.status === "review");
  const prefActions = openPrefMonths.filter((m) => {
    const p = data.prefs.find((x) => x.month === m.month);
    return !p || p.status === "draft" || p.status === "changes_requested";
  });

  return (
    <div className="min-h-screen pb-16">
      <HsuHeader
        unitName={data.unitName}
        userName={me.name}
        links={me.role === "head" ? [{ href: "/hsu/stjorn", label: "Vaktaskipulag (yfirlæknir)", icon: "grid" }] : []}
      />

      <nav className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-5 [scrollbar-width:none]">
          {TABS.map((t) => {
            const badge = t.key === "markadur" ? marketCount : t.key === "oskir" ? prefActions.length : t.key === "vaktir" ? data.requests.length : 0;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} aria-current={tab === t.key ? "page" : undefined}
                className={cx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                  tab === t.key ? "bg-[var(--hsu)] text-white" : "text-slate-600 hover:bg-slate-100",
                )}>
                {t.icon} {t.label}
                {badge > 0 && <span className={cx("ml-0.5 rounded-full px-1.5 text-[11px]", tab === t.key ? "bg-white/25" : "bg-red-500 text-white")}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === "yfirlit" && (
          <Overview data={data} incoming={incoming} market={market} prefActions={prefActions.map((m) => m.month)} go={setTab} onLog={logVinnustund} />
        )}
        {tab === "vaktir" && <ShiftsTab data={data} swaps={mine} refresh={refresh} onLog={logVinnustund} />}
        {tab === "oskir" && <PrefsTab data={data} initialMonth={initialMonth} refresh={refresh} />}
        {tab === "markadur" && (
          <MarketTab data={data} incoming={incoming} market={market} mine={mine} myRequests={myRequests} name={name} refresh={refresh} />
        )}
        {tab === "plan" && <RosterTab meId={me.id} />}
        {tab === "stillingar" && (
          <div className="space-y-8">
            <h1 className="text-xl font-bold">Stillingar</h1>
            <CalendarTab hasToken={me.hasCalendarToken} />
            <AccountTab me={me} refresh={refresh} />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Yfirlit ────────────────────────────────────────────────────────────────

function Overview({ data, incoming, market, prefActions, go, onLog }: {
  data: PortalData; incoming: HsuSwap[]; market: HsuSwap[]; prefActions: string[]; go: (t: Tab) => void;
  onLog: (s: HsuShift, done: boolean) => void;
}) {
  const upcoming = data.myShifts.filter((s) => s.shift_date >= data.today);
  const nextShift = upcoming[0];
  const thisMonth = monthKey(new Date());
  const nextMonth = shiftMonth(thisMonth, 1);
  const count = (m: string) => data.myShifts.filter((s) => s.shift_date.startsWith(m)).length;
  const hour = new Date().getHours();
  const greeting = hour < 18 ? "Góðan dag" : "Gott kvöld";
  const daysUntil = nextShift ? Math.round((Date.parse(nextShift.shift_date) - Date.parse(data.today)) / 86400000) : null;
  // Liðnar forvaktir/bakvaktir sem á eftir að merkja við í Vinnustund.
  const onCall = new Set(data.shiftTypes.filter((t) => t.kind === "forvakt" || t.kind === "bakvakt").map((t) => t.id));
  const unlogged = data.myShifts.filter((s) => s.shift_date <= data.today && onCall.has(s.shift_type_id ?? "") && !s.vinnustund_logged_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {firstName(data.me.name)}</h1>
        <p className="text-sm text-slate-500">{data.unitName}</p>
      </div>

      {data.me.mustChangePassword && (
        <Notice tone="warn">
          <span className="font-semibold">Veldu þitt eigið lykilorð.</span> Lykilorðið þitt var sett af öðrum.{" "}
          <button className="font-semibold underline" onClick={() => go("stillingar")}>Breyta núna</button>
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden md:col-span-2">
          <div className="bg-gradient-to-br from-[var(--hsu)] to-[#2c6cc0] p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Næsta vakt</div>
            {nextShift ? (
              <>
                <div className="mt-1 text-2xl font-bold">{capFirst(WEEKDAY_LONG_IS[weekdayOf(nextShift.shift_date)])} {dayLabel(nextShift.shift_date)}</div>
                <div className="mt-0.5 text-white/90">{nextShift.label} · {hhmm(nextShift.starts)}–{hhmm(nextShift.ends)}{holidayName(nextShift.shift_date) ? ` · ${holidayName(nextShift.shift_date)}` : ""}</div>
                <div className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {daysUntil === 0 ? "Í dag" : daysUntil === 1 ? "Á morgun" : `Eftir ${daysUntil} daga`}
                </div>
              </>
            ) : (
              <div className="mt-1 text-lg font-semibold">Engin vakt á dagskrá</div>
            )}
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              [monthLabel(thisMonth), count(thisMonth)],
              [monthLabel(nextMonth), count(nextMonth)],
              ["Framundan alls", upcoming.length],
            ].map(([l, v]) => (
              <div key={String(l)} className="p-4 text-center">
                <div className="text-2xl font-bold tabular-nums text-slate-900">{v}</div>
                <div className="text-[11px] text-slate-500">{capFirst(String(l))}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-3">
          {prefActions.map((m) => {
            const month = data.months.find((x) => x.month === m);
            const pref = data.prefs.find((p) => p.month === m);
            return (
              <ActionCard key={m} tone={pref?.status === "changes_requested" ? "red" : "blue"} onClick={() => go("oskir")}
                title={pref?.status === "changes_requested" ? `Breytinga óskað: ${monthLabel(m)}` : `Skráðu óskir fyrir ${monthLabel(m)}`}
                text={month?.prefs_deadline ? `Skilafrestur ${dayLabel(month.prefs_deadline)}` : "Merktu daga sem þú getur ekki unnið"} />
            );
          })}
          {unlogged.length > 0 && (
            <ActionCard tone="amber" onClick={() => go("vaktir")}
              title={`${unlogged.length} vakt${unlogged.length === 1 ? "" : "ir"} án útkallaskráningar`}
              text="Skráðu útköllin í Vinnustund og merktu við" />
          )}
          {data.requests.length > 0 && (
            <ActionCard tone="red" onClick={() => go("vaktir")} title={`${data.requests.length} beiðni${data.requests.length === 1 ? "" : "r"} um aukavakt`} text="Yfirlæknir bíður eftir svari þínu" />
          )}
          {incoming.length > 0 && (
            <ActionCard tone="purple" onClick={() => go("markadur")} title={`${incoming.length} vakt${incoming.length === 1 ? "" : "ir"} boðin þér`} text="Taktu afstöðu á vaktamarkaði" />
          )}
          {market.length > 0 && (
            <ActionCard tone="amber" onClick={() => go("markadur")} title={`${market.length} á vaktamarkaði`} text="Vaktir sem aðrir læknar vilja láta frá sér" />
          )}
          {prefActions.length === 0 && incoming.length === 0 && market.length === 0 && data.requests.length === 0 && unlogged.length === 0 && (
            <Card className="p-5 text-sm text-slate-500">Ekkert sem bíður þín.</Card>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Næstu vaktir</h2>
          <div className="flex items-center gap-3">
            <VinnustundLink className="!px-2.5 !py-1 !text-xs" />
            <button onClick={() => go("vaktir")} className="text-sm font-semibold text-[var(--hsu)] hover:underline">Allar vaktir</button>
          </div>
        </div>
        <Card className="divide-y divide-slate-100">
          {upcoming.slice(0, 5).map((s) => <ShiftRow key={s.id} s={s} types={data.shiftTypes} today={data.today} onLog={onLog} />)}
          {upcoming.length === 0 && <div className="p-5 text-sm text-slate-500">Engar birtar vaktir framundan.</div>}
        </Card>
      </div>
    </div>
  );
}

function ActionCard({ title, text, tone, onClick }: { title: string; text: string; tone: "blue" | "red" | "amber" | "purple"; onClick: () => void }) {
  const bar = { blue: "bg-[var(--hsu)]", red: "bg-red-500", amber: "bg-amber-400", purple: "bg-violet-500" }[tone];
  return (
    <button onClick={onClick} className="flex w-full items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:shadow-md">
      <span className={cx("w-1.5 shrink-0", bar)} />
      <span className="flex flex-1 items-center justify-between gap-3 p-4">
        <span>
          <span className="block text-sm font-bold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-500">{text}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </span>
    </button>
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
function ShiftRow({ s, types, today, onLog, right }: {
  s: HsuShift; types: HsuShiftType[]; today?: string;
  onLog?: (shift: HsuShift, done: boolean) => void; right?: React.ReactNode;
}) {
  const h = holidayName(s.shift_date);
  const t = types.find((x) => x.id === s.shift_type_id);
  const color = t?.color ?? "#64748b";
  // Útköll eru skráð í Vinnustund eftir forvakt og bakvakt.
  const needsVinnustund = t?.kind === "forvakt" || t?.kind === "bakvakt";
  const logged = Boolean(s.vinnustund_logged_at);
  const started = today ? s.shift_date <= today : false;
  return (
    <div className="flex items-center gap-3 border-l-4 px-4 py-3" style={{ borderColor: color }}>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={{ background: color }}>
        <span className="text-[10px] font-bold uppercase leading-none opacity-80">{weekdayShort(s.shift_date)}</span>
        <span className="text-lg font-bold leading-tight">{Number(s.shift_date.slice(8))}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
          <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: color }}>{s.label || "Vakt"}</span>
          <span>{t?.name ?? "Vakt"}</span>
          <span className="font-medium text-slate-500">{hhmm(s.starts)}–{hhmm(s.ends)}</span>
        </div>
        <div className="truncate text-xs text-slate-500">
          {dayLabel(s.shift_date)}{h ? ` · ${h}` : ""}{t ? ` · ${SHIFT_PERIOD_IS[t.period]}` : ""}{s.note ? ` · ${s.note}` : ""}
        </div>
        {needsVinnustund && onLog && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            {logged ? (
              <button onClick={() => onLog(s, false)} title="Smelltu til að afmerkja"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" /> Útköll skráð í Vinnustund
              </button>
            ) : (
              <>
                <span className={cx("font-medium", started ? "text-amber-700" : "text-slate-500")}>
                  {started ? "Skráðu útköll vaktarinnar í Vinnustund" : "Mundu að skrá útköll í Vinnustund eftir vaktina"}
                </span>
                <a href={VINNUSTUND_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                  <ExternalLink className="h-3 w-3" /> Opna
                </a>
                <button onClick={() => onLog(s, true)}
                  className={cx("inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold",
                    started ? "bg-amber-500 text-white hover:brightness-110" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Skráð
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {s.status === "open" && <Badge tone="amber">Á vaktamarkaði</Badge>}
      {s.status === "offered" && <Badge tone="purple">Í boði</Badge>}
      {right}
    </div>
  );
}

// ── Mínar vaktir ───────────────────────────────────────────────────────────

function ShiftsTab({ data, swaps, refresh, onLog }: { data: PortalData; swaps: HsuSwap[]; refresh: () => void; onLog: (s: HsuShift, done: boolean) => void }) {
  const [offer, setOffer] = useState<HsuShift | null>(null);
  const [busy, setBusy] = useState(false);
  const byMonth = useMemo(() => {
    const m = new Map<string, HsuShift[]>();
    for (const s of data.myShifts) (m.get(s.shift_date.slice(0, 7)) ?? m.set(s.shift_date.slice(0, 7), []).get(s.shift_date.slice(0, 7))!).push(s);
    return [...m.entries()];
  }, [data.myShifts]);
  const pendingFor = (id: string) => swaps.find((s) => s.shift_id === id);
  // Liðin vakt sem á eftir að merkja við er ekki "búin" — hún má ekki daufna.
  const onCall = new Set(data.shiftTypes.filter((t) => t.kind === "forvakt" || t.kind === "bakvakt").map((t) => t.id));
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
          <h1 className="text-xl font-bold">Mínar vaktir</h1>
          <p className="text-sm text-slate-500">
            Birtar vaktir frá byrjun þessa mánaðar. Viltu losna við vakt? Settu hana á vaktamarkað.
            Útköll af forvakt og bakvakt skráir þú í Vinnustund og merkir hér við.
          </p>
        </div>
        <VinnustundLink />
      </div>
      <RequestsBlock data={data} refresh={refresh} />
      {/* Litaskýring: sömu litir og á vaktaplaninu. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 text-[11px] text-slate-500 ring-1 ring-slate-200">
        {data.shiftTypes.filter((t) => t.active).map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded" style={{ background: t.color }} />
            <b className="text-slate-700">{t.short || t.name}</b> {t.name} · {hhmm(t.starts)}–{hhmm(t.ends)}
          </span>
        ))}
      </div>
      {byMonth.length === 0 && <Card className="p-8 text-center text-sm text-slate-500">Engar birtar vaktir.</Card>}
      {byMonth.map(([m, rows]) => (
        <section key={m}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{monthLabel(m)} · {rows.length} vakt{rows.length === 1 ? "" : "ir"}</h2>
          <Card className="divide-y divide-slate-100">
            {rows.map((s) => {
              const past = s.shift_date < data.today;
              const p = pendingFor(s.id);
              return (
                <div key={s.id} className={cx(past && !needsLog(s) && "opacity-50")}>
                  <ShiftRow s={s} types={data.shiftTypes} today={data.today} onLog={onLog} right={past ? null : p ? (
                    <Button variant="ghost" size="sm" busy={busy} onClick={() => cancel(p.id)}>Afturkalla</Button>
                  ) : (
                    <Button variant="soft" size="sm" onClick={() => setOffer(s)}><ArrowLeftRight className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Setja á vaktamarkað</span><span className="sm:hidden">Markaður</span></Button>
                  )} />
                  {p && (
                    <div className="px-4 pb-3 text-xs text-slate-500">
                      {p.status === "awaiting_approval" ? "Annar læknir vill taka vaktina — bíður samþykkis yfirlæknis." : p.to_doctor ? `Boðin ${data.colleagues.find((c) => c.id === p.to_doctor)?.name ?? ""}. Vaktin er þín þar til hún er tekin.` : "Á vaktamarkaði. Vaktin er þín þar til annar læknir tekur hana."}
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
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const others = data.colleagues.filter((c) => c.id !== data.me.id);
  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await hsuApi("/api/hsu/me/swaps", { body: { shift_id: shift.id, to_doctor: target || null, note } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    onDone();
  };
  return (
    <Modal open onClose={onClose} title="Setja á vaktamarkað">
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{shiftWhen(shift)}</div>
        <div className="space-y-2">
          <label className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", !target ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : "border-slate-200")}>
            <input type="radio" name="t" className="mt-1" checked={!target} onChange={() => setTarget("")} />
            <span><span className="block text-sm font-semibold">Setja á vaktamarkað</span><span className="block text-xs text-slate-500">Allir læknar fá tilkynningu og hver sem er getur tekið hana.</span></span>
          </label>
          <label className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", target ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : "border-slate-200")}>
            <input type="radio" name="t" className="mt-1" checked={Boolean(target)} onChange={() => setTarget(others[0]?.id ?? "")} />
            <span className="flex-1">
              <span className="block text-sm font-semibold">Bjóða ákveðnum lækni</span>
              <select className={cx(inputCls, "mt-2")} value={target} onChange={(e) => setTarget(e.target.value)} onClick={(e) => e.stopPropagation()}>
                <option value="">— veldu lækni —</option>
                {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </span>
          </label>
        </div>
        <Field label="Skilaboð (valfrjálst)">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="t.d. „Get tekið þína vakt 14. í staðinn“" />
        </Field>
        <p className="text-xs text-slate-500">Vaktin er áfram á þinni ábyrgð og í dagatalinu þínu þar til annar læknir tekur hana.</p>
        {err && <Notice tone="err">{err}</Notice>}
        <Button className="w-full" size="lg" onClick={submit} busy={busy}>{target ? "Bjóða vaktina" : "Setja á vaktamarkað"}</Button>
      </div>
    </Modal>
  );
}

// ── Beiðnir um aukavakt ────────────────────────────────────────────────────

function RequestsBlock({ data, refresh }: { data: PortalData; refresh: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!data.requests.length) return null;
  const answer = async (id: string, action: "accept" | "decline") => {
    if (action === "decline" && !confirm("Hafna vaktinni? Yfirlæknir fær tilkynningu.")) return;
    setBusy(id + action); setErr(null);
    const r = await hsuApi(`/api/hsu/me/requests/${id}`, { body: { action } });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    refresh();
  };
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-700">Beiðnir um aukavakt</h2>
      <Card className="divide-y divide-amber-100 border-amber-300 bg-amber-50/40">
        {data.requests.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: data.shiftTypes.find((t) => t.id === s.shift_type_id)?.color ?? "#64748b" }}>{s.label || "Vakt"}</span>
                {shiftWhen(s)}
              </div>
              <div className="text-xs text-slate-600">
                {s.requested_by || "Yfirlæknir"} biður þig um þessa vakt. Hún er frátekin fyrir þig þar til þú svarar — samþykktu hana eða hafnaðu.
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="success" busy={busy === s.id + "accept"} onClick={() => answer(s.id, "accept")}>Samþykkja</Button>
              <Button size="sm" variant="ghost" busy={busy === s.id + "decline"} onClick={() => answer(s.id, "decline")}>Hafna</Button>
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

function MarketTab({ data, incoming, market, mine, myRequests, name, refresh }: {
  data: PortalData; incoming: HsuSwap[]; market: HsuSwap[]; mine: HsuSwap[]; myRequests: HsuSwap[];
  name: (id: string | null) => string; refresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const act = async (id: string, action: "accept" | "decline" | "cancel") => {
    setBusy(id + action); setMsg(null);
    const r = await hsuApi<{ awaitingApproval?: boolean }>(`/api/hsu/me/swaps/${id}`, { method: "PATCH", body: { action } });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
    if (action === "accept") setMsg({ tone: "ok", text: r.awaitingApproval ? "Beiðnin er komin til yfirlæknis til samþykkis." : "Vaktin er orðin þín og komin í dagatalið." });
    refresh();
  };
  const when = (s: HsuSwap) => (s.shift ? shiftWhen(s.shift) : "");
  const myDates = new Set(data.myShifts.map((s) => s.shift_date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Vaktamarkaður</h1>
        <p className="text-sm text-slate-500">
          Vaktir sem læknar vilja láta frá sér.{data.marketRequiresApproval ? " Yfirlæknir samþykkir hver skipti." : " Sá sem tekur vakt fær hana strax."}
        </p>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Section title="Boðnar þér" empty="Enginn hefur boðið þér vakt.">
        {incoming.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-semibold">{when(s)}</div>
              <div className="text-xs text-slate-500">Frá {name(s.from_doctor)}{s.note ? ` · „${s.note}“` : ""}</div>
              {s.shift && myDates.has(s.shift.shift_date) && <div className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" /> Þú ert líka á vakt þennan dag</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => act(s.id, "accept")} busy={busy === s.id + "accept"}>Taka vakt</Button>
              <Button size="sm" variant="ghost" onClick={() => act(s.id, "decline")} busy={busy === s.id + "decline"}>Hafna</Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Á vaktamarkaði" empty="Engar vaktir á vaktamarkaði núna.">
        {market.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-semibold">{when(s)}</div>
              <div className="text-xs text-slate-500">{name(s.from_doctor)}{s.note ? ` · „${s.note}“` : ""}</div>
              {s.shift && myDates.has(s.shift.shift_date) && <div className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" /> Þú ert líka á vakt þennan dag</div>}
            </div>
            <Button size="sm" onClick={() => act(s.id, "accept")} busy={busy === s.id + "accept"}>Taka vakt</Button>
          </div>
        ))}
      </Section>

      {myRequests.length > 0 && (
        <Section title="Bíða samþykkis yfirlæknis">
          {myRequests.map((s) => (
            <div key={s.id} className="p-4 text-sm"><span className="font-semibold">{when(s)}</span> <span className="text-slate-500">frá {name(s.from_doctor)}</span></div>
          ))}
        </Section>
      )}

      <Section title="Mínar vaktir í boði" empty="Þú ert ekki með vaktir á vaktamarkaði. Settu vakt á markað undir „Mínar vaktir“.">
        {mine.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-semibold">{when(s)}</div>
              <div className="text-xs text-slate-500">
                {s.status === "awaiting_approval" ? `${name(s.taken_by)} vill taka hana — bíður yfirlæknis` : s.to_doctor ? `Boðin ${name(s.to_doctor)}` : "Á vaktamarkaði"}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => act(s.id, "cancel")} busy={busy === s.id + "cancel"}>Afturkalla</Button>
          </div>
        ))}
      </Section>
      <p className="text-xs text-slate-400">Samstarfsfólk: {data.colleagues.filter((c) => c.id !== data.me.id).map((c) => `${shortName(c.name)}${c.phone ? ` (${c.phone})` : ""}`).join(" · ")}</p>
    </div>
  );
}
