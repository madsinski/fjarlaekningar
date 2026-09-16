"use client";

// Vinnustöð Fjarlækninga — opin allan vinnudaginn hjá hjúkrunarfræðingi sem
// svarar símanum og skilaboðum sjúklinga.
//
// Einn skjár, ekkert falið á bak við flipa:
//   * Efst: stór leit, staða þjónustunnar og erindin sem flýtihnappar.
//   * Vinstra megin: niðurstöður, erindið sjálft (hentar / hentar ekki og texti
//     til sjúklings með hlekk), meginreglurnar, sjálfspróf, tilbúin svör.
//   * Hægra megin (fast á stórum skjá): SMS og spurningar til Fjarlækninga.
// Samtöl, innhólf, stillingar og stór QR-kóði opnast í skúffu svo leitin og
// SMS-ið hverfi ekki. Í síma raðast þetta í einn dálk með stiku neðst.

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, LogOut, Megaphone, MessageCircle, QrCode, Search, Send, Settings, Volume2, VolumeX } from "lucide-react";
import { Card, cx } from "@/app/hsu/_components/ui";
import Inbox from "@/app/admin/vinnustod/Inbox";
import type { Lang } from "@/lib/nurse-guide";
import { GuideBody, SearchHero } from "./Guide";
import { NewQuestion, QuestionsCard, ThreadView } from "./QuestionsPanel";
import SettingsPanel from "./SettingsPanel";
import SmsPanel from "./SmsPanel";
import TriageCard from "./TriageCard";
import { TextsProvider, type GuideContent, type SharedText } from "./Texts";
import { Drawer, FjLogo, PORTAL_URL, PushToggle, Qr, UnreadDot, chimeOnce, useLiveSignal, useServiceStatus, useFaviconBadge, useSoundPref, useUnlockAudio, vsApi } from "./shared";

export interface VsMe {
  id: string;
  name: string;
  kind: "vs" | "staff" | "hsu";
  email: string;
  workplace: string;
  title: string;
  hasPin: boolean;
  mustChangePassword: boolean;
  canMessage: boolean;
  /** Stjórnandi Fjarlækninga: svarar spurningum og breytir textum fyrir alla. */
  canAnswer: boolean;
}
/** Leynileg rás fyrir tafarlaus merki og lykill fyrir tilkynningar í tæki. */
export interface LiveInfo { topic: string | null; vapidKey: string | null; everyoneTopic?: string | null }
export interface Announcement { id: string; created_at: string; title: string; body: string; level: "info" | "warning" }

type DrawerState =
  | null
  | { kind: "thread"; id: string }
  | { kind: "new"; draft: string }
  | { kind: "settings" }
  | { kind: "qr" };

function initialDrawer(me: VsMe): DrawerState {
  if (me.kind === "vs" && me.mustChangePassword) return { kind: "settings" };
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.search).get("t");
  if (t === "stillingar" && me.kind === "vs") return { kind: "settings" };
  return null;
}

export default function Workstation({ me, announcements: initialAnnouncements, unread: initialUnread, texts, guide, live, refresh }: {
  me: VsMe; announcements: Announcement[]; unread: number; texts: Record<string, SharedText>; guide: GuideContent; live: LiveInfo; refresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("is");
  const [unread, setUnread] = useState(initialUnread);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [drawer, setDrawer] = useState<DrawerState>(() => initialDrawer(me));
  const [threadsKey, setThreadsKey] = useState(0);
  // Samtöl stjórnanda opnast sem fellilisti í hliðardálkinum (?t=spurningar opnar hann).
  const [inboxOpen, setInboxOpen] = useState(() =>
    me.canAnswer && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("t") === "spurningar");
  const phoneRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const status = useServiceStatus();
  /** Notandinn er að leita eða með erindi opið — þá kemur það efst í síma. */
  const focused = Boolean(q.trim() || openSlug);

  const focusSms = useCallback(() => {
    const el = phoneRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, []);
  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    searchRef.current?.focus({ preventScroll: true });
  };

  // Gamla slóðin /sms (→ ?t=sms) fer beint í símanúmerið.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("t") === "sms") setTimeout(focusSms, 250);
  }, [focusSms]);

  // Fjöldi sem bíður. Stjórnandi fær hann úr /me; aðrir úr QuestionsCard,
  // sem sækir samtölin sjálft.
  // Tilkynningar uppfærast hjá öllum (merki + könnun á mínútu fresti).
  const refreshUnread = useCallback(async () => {
    const r = await vsApi<{ unread: number; announcements: Announcement[] }>("/api/vinnustod/me", { staff: true });
    if (!r.ok) return;
    setAnnouncements(r.announcements);
    if (me.canAnswer) setUnread(r.unread);
  }, [me.canAnswer]);
  useEffect(() => {
    const t = setInterval(() => { void refreshUnread(); }, me.canAnswer ? 20_000 : 60_000);
    return () => clearInterval(t);
  }, [me.canAnswer, refreshUnread]);
  useLiveSignal(live.everyoneTopic, () => { void refreshUnread(); });

  // Ný skilaboð: tafarlaust merki → sækja strax, hljóð (ef kveikt).
  // `pulse` segir listum og opnu samtali að sækja aftur.
  const [soundOn, setSoundOn] = useSoundPref();
  useUnlockAudio();
  const [pulse, setPulse] = useState(0);
  useLiveSignal(live.topic, (kind) => {
    setPulse((n) => n + 1);
    void refreshUnread();
    if (kind === "message" && soundOn) chimeOnce();
  });
  useFaviconBadge(unread);
  // Könnunin (varaleið) getur líka fundið nýtt — þá hljóð ef fjöldinn hækkar.
  const lastUnread = useRef(initialUnread);
  useEffect(() => {
    if (unread > lastUnread.current && soundOn) chimeOnce();
    lastUnread.current = unread;
    document.title = unread ? `(${unread}) Vinnustöð Fjarlækninga` : "Vinnustöð Fjarlækninga";
  }, [unread, soundOn]);

  const setQuery = (v: string) => { setQ(v); if (v) setOpenSlug(null); };
  const threadRead = useCallback(() => setThreadsKey((k) => k + 1), []);
  const closeDrawer = useCallback(() => {
    setDrawer(null);
    setThreadsKey((k) => k + 1); // nýlesið eða nýtt samtal birtist strax í listanum
  }, []);

  const logout = async () => {
    if (me.kind === "vs") await vsApi("/api/vinnustod/auth/logout", { body: {} });
    window.location.href = me.kind === "staff" ? "/admin" : me.kind === "hsu" ? "/hsu/min-sida" : "/vinnustod";
  };

  const openQuestions = () => {
    if (me.canAnswer) setInboxOpen(true);
    setTimeout(() => document.getElementById("spurningar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <TextsProvider canEdit={me.canAnswer} initial={texts} guide={guide}>
      <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
        <header className="sticky top-0 z-40 bg-[#062a38] text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white"><FjLogo size={26} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">Vinnustöð Fjarlækninga</div>
              <div className="truncate text-xs text-cyan-100/70">{me.name}{me.workplace ? ` · ${me.workplace}` : ""}</div>
            </div>
            {(me.canAnswer || me.canMessage) && (
              <button type="button" onClick={openQuestions} aria-label="Skilaboð"
                className="relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/10">
                <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">{me.canAnswer ? "Samtöl" : "Skilaboð"}</span>
                <UnreadDot count={unread} className="absolute -right-1 -top-1" />
              </button>
            )}
            <PushToggle vapidKey={live.vapidKey} />
            <button type="button" onClick={() => setSoundOn(!soundOn)} title={soundOn ? "Hljóð við ný skilaboð: á" : "Hljóð við ný skilaboð: af"}
              aria-label={soundOn ? "Slökkva á hljóði" : "Kveikja á hljóði"} aria-pressed={soundOn}
              className="rounded-xl p-2 hover:bg-white/10">
              {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 opacity-60" />}
            </button>
            {me.kind === "vs" && (
              <button type="button" onClick={() => setDrawer({ kind: "settings" })} aria-label="Stillingar" title="Stillingar"
                className="rounded-xl p-2 hover:bg-white/10"><Settings className="h-5 w-5" /></button>
            )}
            <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-white/10">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{me.kind === "vs" ? "Skrá út" : "Til baka"}</span>
            </button>
          </div>
        </header>

        <AnnouncementBanner items={announcements} />

        <SearchHero q={q} setQ={setQuery} inputRef={searchRef}
          status={status && (
            <span title={status.detail}
              className={cx("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1",
                status.open ? "bg-emerald-400/15 text-emerald-50 ring-emerald-300/40" : "bg-white/10 text-white/85 ring-white/20")}>
              <span className={cx("h-2.5 w-2.5 rounded-full", status.open ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.25)]" : "bg-slate-400")} />
              {status.text}
              <span className="font-normal tabular-nums text-white/60">{status.clock}</span>
            </span>
          )} />

        {/* Í síma: gervigreindarmat → SMS/spurningar → leiðarvísir; í leit eða
            opnu erindi koma niðurstöðurnar fyrst. Á stórum skjá: matið og
            leiðarvísirinn í vinstri dálki, hliðardálkurinn fastur hægra megin. */}
        <main className="mx-auto mt-6 grid max-w-7xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:grid-rows-[auto_1fr]">
          <div className={cx("min-w-0 lg:order-none lg:col-start-1 lg:row-start-1", focused ? "order-2" : "order-1")}>
            <TriageCard onOpenProblem={(slug) => { setQ(""); setOpenSlug(slug); }} />
          </div>
          <div className={cx("min-w-0 space-y-6 lg:order-none lg:col-start-1 lg:row-start-2", focused ? "order-1" : "order-3")}>
            <GuideBody q={q} setQ={setQuery} openSlug={openSlug} setOpenSlug={setOpenSlug} lang={lang} setLang={setLang}
              onSms={focusSms} onAsk={me.canMessage ? (text) => setDrawer({ kind: "new", draft: `Sjúklingur spyr um: ${text}\n\n` }) : undefined} />
          </div>

          <aside className={cx("min-w-0 space-y-4 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1", focused ? "order-3" : "order-2", "lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pb-2 [scrollbar-width:thin]")}>
            {me.canMessage && (
              <div id="spurningar" className="scroll-mt-20">
                <QuestionsCard key={threadsKey} onUnreadChange={setUnread} refresh={pulse}
                  onOpen={(id) => setDrawer({ kind: "thread", id })} onNew={() => setDrawer({ kind: "new", draft: "" })} />
              </div>
            )}
            {me.canAnswer && (
              <div id="spurningar" className={cx("scroll-mt-20 overflow-hidden rounded-2xl border shadow-sm",
                unread ? "border-red-300 bg-red-50 ring-2 ring-red-200" : "border-slate-200 bg-white")}>
                <button type="button" onClick={() => setInboxOpen((o) => !o)} aria-expanded={inboxOpen} aria-controls="samtol-panel"
                  className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <span className="flex items-center gap-3">
                    <span className={cx("relative flex h-9 w-9 items-center justify-center rounded-xl", unread ? "bg-red-600 text-white" : "bg-[var(--hsu-soft)] text-[var(--hsu)]")}>
                      <MessageCircle className="h-5 w-5" />
                      <UnreadDot count={unread} className="absolute -right-2 -top-2" />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-900">Samtöl við starfsfólk</span>
                      <span className="block text-xs text-slate-600">
                        {unread === 0 ? "Ekkert bíður svars · skrifa nýtt" : unread === 1 ? "Ný skilaboð bíða svars" : `${unread} samtöl bíða svars`}
                      </span>
                    </span>
                  </span>
                  <ChevronDown className={cx("h-5 w-5 text-slate-500 transition", inboxOpen && "rotate-180")} />
                </button>
                {inboxOpen && (
                  <div id="samtol-panel" className="border-t border-slate-200 bg-white p-3">
                    <Inbox onAwaitingChange={setUnread} refresh={pulse} compact />
                  </div>
                )}
              </div>
            )}

            <div id="sms" className="scroll-mt-20"><SmsPanel ref={phoneRef} compact /></div>


            <Card className="flex items-center gap-4 p-4">
              <button type="button" onClick={() => setDrawer({ kind: "qr" })} aria-label="Sýna QR-kóða stórt"
                className="shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-cyan-400">
                <Qr value={PORTAL_URL} size={76} />
              </button>
              <div className="min-w-0">
                <div className="font-bold text-slate-900">Sjúklingur við borðið?</div>
                <p className="text-xs text-slate-500">Hann skannar kóðann með símanum í stað þess að fá SMS.</p>
                <button type="button" onClick={() => setDrawer({ kind: "qr" })}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--hsu-dark)] hover:underline">
                  <QrCode className="h-3.5 w-3.5" /> Sýna stórt
                </button>
              </div>
            </Card>
          </aside>
        </main>

        <nav aria-label="Flýtileiðir"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <MobileBtn icon={<Search className="h-5 w-5" />} label="Leita" onClick={focusSearch} />
          <MobileBtn icon={<Send className="h-5 w-5" />} label="SMS" onClick={focusSms} />
          {(me.canMessage || me.canAnswer)
            ? <MobileBtn icon={<MessageCircle className="h-5 w-5" />} label="Spurningar" badge={unread} onClick={openQuestions} />
            : <MobileBtn icon={<QrCode className="h-5 w-5" />} label="QR-kóði" onClick={() => setDrawer({ kind: "qr" })} />}
        </nav>

        {drawer?.kind === "thread" && (
          <Drawer title="Samtal" onClose={closeDrawer}><ThreadView id={drawer.id} onBack={closeDrawer} onRead={threadRead} refresh={pulse} /></Drawer>
        )}
        {drawer?.kind === "new" && (
          <Drawer title="Ný spurning til Fjarlækninga" onClose={closeDrawer}>
            <NewQuestion initial={drawer.draft} onCancel={closeDrawer} onCreated={(id) => setDrawer({ kind: "thread", id })} />
          </Drawer>
        )}
        {drawer?.kind === "settings" && me.kind === "vs" && (
          <Drawer title="Stillingar" onClose={closeDrawer}><SettingsPanel me={me} refresh={refresh} /></Drawer>
        )}
        {drawer?.kind === "qr" && (
          <Drawer title="QR-kóði" onClose={closeDrawer}>
            <div className="flex flex-col items-center py-4 text-center">
              <FjLogo size={48} />
              <p className="mt-3 text-2xl font-bold text-slate-900">Skannaðu til að byrja</p>
              <p className="mt-1 text-sm text-slate-600">Opnaðu myndavélina í símanum og beindu henni að kóðanum.</p>
              <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><Qr value={PORTAL_URL} size={300} /></div>
              <p className="mt-5 text-xl font-bold text-[var(--hsu-dark)]">fjarlaekningar.is</p>
              <p className="text-sm text-slate-500">Innskráning með rafrænum skilríkjum</p>
            </div>
          </Drawer>
        )}
      </div>
    </TextsProvider>
  );
}

function MobileBtn({ icon, label, onClick, badge }: { icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick}
      className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-slate-600 active:bg-slate-100">
      {icon}
      {label}
      <UnreadDot count={badge ?? 0} className="absolute left-1/2 top-1 ml-2" />
    </button>
  );
}

/** Tilkynningar frá Fjarlækningum — borði efst, undir yfirstikunni. */
function AnnouncementBanner({ items }: { items: Announcement[] }) {
  if (!items.length) return null;
  return (
    <div role="region" aria-label="Tilkynningar frá Fjarlækningum" aria-live="polite">
      {items.map((a) => {
        const warn = a.level === "warning";
        return (
          <div key={a.id} className={cx("border-b", warn ? "border-amber-500 bg-amber-400 text-slate-950" : "border-cyan-700 bg-cyan-600 text-white")}>
            <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6">
              <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", warn ? "bg-slate-950/10" : "bg-white/15")}>
                {warn ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
              </span>
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <p className="font-bold leading-snug">{a.title}</p>
                {a.body ? <p className={cx("mt-0.5 whitespace-pre-wrap text-sm", warn ? "text-slate-900" : "text-cyan-50")}>{a.body}</p> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
