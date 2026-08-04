"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Globe2, Languages, Send, Check, ExternalLink, ArrowUp, ArrowDown, GripVertical, RotateCcw, Copy, Trash2, Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import HomeView from "@/app/(site)/HomeView";
import ThjonustaView from "@/app/(site)/thjonusta/ThjonustaView";
import UmOkkurView from "@/app/(site)/um-okkur/UmOkkurView";
import HafaSambandView from "@/app/(site)/hafa-samband/HafaSambandView";
import Navbar from "@/app/components/Navbar";
import { getSitePage, resolveContent, resolveSections, sectionsOf } from "@/lib/site-content/registry";
import type { Locale, LocaleContent, SiteContentBlob, SiteFieldOption } from "@/lib/site-content/types";
import { TEAM_MEMBER_SLOTS, TEAM_ROSTER_GROUP, teamSize } from "@/lib/site-content/um-okkur";
import IconPicker from "../IconPicker";

type SaveState = "idle" | "saving" | "saved" | "error";

// Preview renderer per page key. "chrome" previews the live header (the footer
// is server-rendered — it reads published legal docs — so it isn't previewed here).
function Preview({ pageKey, c, order, locale }: { pageKey: string; c: LocaleContent; order: string[]; locale: Locale }) {
  switch (pageKey) {
    case "home":
      return <HomeView c={c} order={order} locale={locale} />;
    case "thjonusta":
      return <ThjonustaView c={c} order={order} locale={locale} />;
    case "um-okkur":
      return <UmOkkurView c={c} order={order} locale={locale} />;
    case "hafa-samband":
      return <HafaSambandView c={c} order={order} />;
    case "chrome":
      return (
        <div>
          <Navbar content={c} />
          <div className="p-8 text-sm text-slate-500">
            Hausinn að ofan uppfærist um leið og þú skrifar. Fótinn þarf að birta til að sjá hann á
            vefnum (hann sækir birt lögfræðiskjöl á þjóninum).
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Single-value image field: upload to the shared assets bucket, paste a URL, or
// clear. Photos are locale-independent, so (like icons) the value lives only in
// the Icelandic map and the public page falls back to it for every language.
function ImageField({
  value,
  fallback,
  disabled,
  onChange,
}: {
  value: string;
  fallback: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shown = value.trim() || fallback;

  async function upload(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `site/team/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("presentation-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("presentation-assets").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ekki tókst að hlaða upp mynd");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200 shrink-0">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="w-full h-full object-cover object-top" />
        ) : null}
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <label
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              disabled
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-cyan-600 text-white hover:bg-cyan-700 cursor-pointer"
            }`}
          >
            {uploading ? "Hleð upp…" : "Hlaða upp mynd"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
          </label>
          {value.trim() && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              Fjarlægja
            </button>
          )}
        </div>
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback || "/team/mynd.jpg eða https://…"}
          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
        />
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </div>
  );
}

// A layout switch: a fixed set of values as a list of radio cards. Each option
// carries its own explanation, so they are all shown at once rather than only
// the selected one — with four arrangements to choose between, the differences
// are the whole point. Locale-independent like icons and images: the value
// lives in the Icelandic map and every language reads it.
function ChoiceField({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: SiteFieldOption[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="space-y-1.5">
      {options.map((o) => {
        const active = o.value === selected?.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60 ${
              active
                ? "border-cyan-500 bg-cyan-50/70"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span
              className={`mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border ${
                active ? "border-cyan-600" : "border-slate-300"
              }`}
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-sm font-medium ${active ? "text-cyan-900" : "text-slate-700"}`}
              >
                {o.label}
              </span>
              {o.hint && (
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                  {o.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// One person in the team roster. Name and photo are single values (a person's
// name and portrait don't change per language); role and flag carry both.
type Member = {
  name: string;
  photo: string;
  hidden: boolean;
  role: { is: string; en: string };
  flag: { is: string; en: string };
};

const BLANK_MEMBER: Member = {
  name: "",
  photo: "",
  hidden: false,
  role: { is: "", en: "" },
  flag: { is: "", en: "" },
};

/**
 * The team roster: add, duplicate, hide, delete and reorder the people on
 * /um-okkur. Rows collapse to a single line so the list stays scannable — the
 * actions are what you come here for, and the fields are one click away.
 *
 * Hiding is not deleting: a hidden member keeps every field and simply stops
 * rendering on the public page, which is what you want for someone on leave or
 * an announcement that isn't live yet.
 */
function TeamRoster({
  members,
  disabled,
  onChange,
}: {
  members: Member[];
  disabled: boolean;
  onChange: (next: Member[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const replace = (i: number, m: Member) =>
    onChange(members.map((cur, k) => (k === i ? m : cur)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= members.length) return;
    const next = [...members];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setOpen(open === from ? to : open);
  };

  const duplicate = (i: number) => {
    const src = members[i];
    const next = [...members];
    // Suffixed rather than identical: two rows reading the same name is a
    // puzzle, and the public grid keys members by name + photo.
    next.splice(i + 1, 0, {
      ...src,
      name: src.name ? `${src.name} (afrit)` : "",
      role: { ...src.role },
      flag: { ...src.flag },
    });
    onChange(next);
    setOpen(i + 1);
  };

  const remove = (i: number) => {
    const who = members[i].name.trim() || "þennan meðlim";
    if (!window.confirm(`Eyða ${who} af síðunni? Þetta er ekki hægt að afturkalla.`)) return;
    onChange(members.filter((_, k) => k !== i));
    setOpen(null);
  };

  const add = () => {
    onChange([...members, { ...BLANK_MEMBER, role: { is: "", en: "" }, flag: { is: "", en: "" } }]);
    setOpen(members.length);
  };

  const iconBtn =
    "rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="space-y-2">
      {members.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
          Enginn í teyminu. Bættu við fyrsta meðlimnum hér að neðan.
        </p>
      )}

      {members.map((m, i) => {
        const isOpen = open === i;
        const incomplete = !m.name.trim() || !m.photo.trim();
        return (
          <div
            key={i}
            className={`rounded-xl border ${m.hidden ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo}
                    alt=""
                    className={`h-full w-full object-cover object-top ${m.hidden ? "opacity-40 grayscale" : ""}`}
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`truncate text-sm font-medium ${m.hidden ? "text-slate-400" : "text-slate-800"}`}
                  >
                    {m.name.trim() || "Nafnlaus meðlimur"}
                  </span>
                  {m.hidden && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Falin
                    </span>
                  )}
                  {!m.hidden && incomplete && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Birtist ekki
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                  <span className="truncate">{m.role.is.trim() || "Enginn titill"}</span>
                </span>
              </button>

              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => replace(i, { ...m, hidden: !m.hidden })}
                  disabled={disabled}
                  title={m.hidden ? "Sýna á vefnum" : "Fela á vefnum"}
                  aria-label={m.hidden ? `Sýna ${m.name}` : `Fela ${m.name}`}
                  className={iconBtn}
                >
                  {m.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={disabled || i === 0}
                  title="Færa upp"
                  aria-label={`Færa ${m.name} upp`}
                  className={iconBtn}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={disabled || i === members.length - 1}
                  title="Færa niður"
                  aria-label={`Færa ${m.name} niður`}
                  className={iconBtn}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicate(i)}
                  disabled={disabled || members.length >= TEAM_MEMBER_SLOTS}
                  title={
                    members.length >= TEAM_MEMBER_SLOTS
                      ? `Hámark ${TEAM_MEMBER_SLOTS} meðlimir`
                      : "Afrita"
                  }
                  aria-label={`Afrita ${m.name}`}
                  className={iconBtn}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={disabled}
                  title="Eyða"
                  aria-label={`Eyða ${m.name}`}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="space-y-3 border-t border-slate-100 p-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Nafn</span>
                  <input
                    value={m.name}
                    disabled={disabled}
                    onChange={(e) => replace(i, { ...m, name: e.target.value })}
                    placeholder="Nafn meðlims"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-50"
                  />
                </label>

                {(["role", "flag"] as const).map((k) => (
                  <div key={k}>
                    <div className="mb-1 text-xs font-medium text-slate-600">
                      {k === "role" ? "Titill" : "Merki (t.d. Stofnandi)"}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(["is", "en"] as Locale[]).map((loc) => (
                        <label key={loc} className="block">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {loc}
                          </span>
                          <input
                            value={m[k][loc]}
                            disabled={disabled}
                            onChange={(e) =>
                              replace(i, { ...m, [k]: { ...m[k], [loc]: e.target.value } })
                            }
                            placeholder={loc === "en" ? "(þýðing)" : ""}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-50"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600">Mynd</div>
                  <ImageField
                    value={m.photo}
                    fallback=""
                    disabled={disabled}
                    onChange={(v) => replace(i, { ...m, photo: v })}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={add}
          disabled={disabled || members.length >= TEAM_MEMBER_SLOTS}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Bæta við meðlimi
        </button>
        <span className="text-[11px] text-slate-400">
          {members.length} af {TEAM_MEMBER_SLOTS}
        </span>
      </div>
    </div>
  );
}

export default function SiteContentEditor() {
  const params = useParams<{ page: string }>();
  const pageKey = params?.page ?? "home";
  const page = getSitePage(pageKey);

  const [draft, setDraft] = useState<SiteContentBlob>({ is: {}, en: {} });
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<Locale>("is");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipSave = useRef(true);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const res = await fetch(`/api/admin/site-content/${pageKey}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const d = (j.content?.draft as SiteContentBlob) ?? {};
      setDraft({ is: d.is ?? {}, en: d.en ?? {}, order: d.order });
      setPublishedAt(j.content?.published_at ?? null);
    } else {
      setDraft({ is: {}, en: {} });
      setPublishedAt(null);
    }
    skipSave.current = true;
    setLoading(false);
  }, [pageKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Debounced autosave of the draft (admin only).
  useEffect(() => {
    if (loading || !isAdmin) return;
    if (skipSave.current) { skipSave.current = false; return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/site-content/${pageKey}`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ draft }),
      });
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [draft, loading, isAdmin, pageKey]);

  const setField = (locale: Locale, key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [locale]: { ...(prev[locale] ?? {}), [key]: value } }));
  };

  // Section order. Stored on the blob (not per-locale — order is the same in
  // every language) and autosaved by the same effect as the field edits.
  const sectionOrder = useMemo(
    () => resolveSections(pageKey, draft),
    [pageKey, draft],
  );
  // The sections that actually render for the current draft — a layout switch
  // can merge two bands into one, and the order list must agree with the page
  // or moving a phantom section would look like a bug.
  const contentIs = resolveContent(pageKey, draft, "is");
  const visibleSections = sectionsOf(pageKey, contentIs);

  // ── Team roster ──────────────────────────────────────────────────────────
  // Read per locale from its own map, never across locales: a draft value if
  // there is one, otherwise that locale's built-in default. Resolving through
  // the public fallback chain instead would freeze Icelandic copy into the
  // English overrides the first time anyone pressed a button here.
  const hasRoster = !!page?.fields.some((f) => f.editor === "team-members");
  const rawField = (loc: Locale, key: string) =>
    draft[loc]?.[key] ??
    (loc === "is" ? page?.defaultsIs[key] : page?.defaultsEn[key]) ??
    "";

  const members: Member[] = hasRoster
    ? Array.from({ length: teamSize(contentIs) }, (_, k) => {
        const i = k + 1;
        return {
          name: rawField("is", `t${i}_name`),
          photo: rawField("is", `t${i}_photo`),
          hidden: rawField("is", `t${i}_hidden`) === "1",
          role: { is: rawField("is", `t${i}_role`), en: rawField("en", `t${i}_role`) },
          flag: { is: rawField("is", `t${i}_flag`), en: rawField("en", `t${i}_flag`) },
        };
      })
    : [];

  // Every slot is rewritten on every change, and the count with it. That
  // materialises the built-in defaults into the draft the first time the roster
  // is touched — necessary, because an empty override means "use the default"
  // and a deletion would otherwise undo itself on the next render.
  const setMembers = (next: Member[]) => {
    setDraft((prev) => {
      const is = { ...(prev.is ?? {}) };
      const en = { ...(prev.en ?? {}) };
      for (let i = 1; i <= TEAM_MEMBER_SLOTS; i++) {
        const m = next[i - 1];
        is[`t${i}_name`] = m?.name ?? "";
        is[`t${i}_photo`] = m?.photo ?? "";
        is[`t${i}_hidden`] = m?.hidden ? "1" : "";
        is[`t${i}_role`] = m?.role.is ?? "";
        is[`t${i}_flag`] = m?.flag.is ?? "";
        // Names are the same in every language — the translator skips them too.
        en[`t${i}_name`] = "";
        en[`t${i}_role`] = m?.role.en ?? "";
        en[`t${i}_flag`] = m?.flag.en ?? "";
      }
      is.team_size = String(next.length);
      return { ...prev, is, en };
    });
  };
  const sectionLabel = (id: string) =>
    visibleSections.find((s) => s.id === id)?.label ?? id;

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sectionOrder.length) return;
    const next = [...sectionOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft((prev) => ({ ...prev, order: next }));
  };
  const defaultOrder = visibleSections.map((s) => s.id);
  const resetOrder = () => setDraft((prev) => ({ ...prev, order: defaultOrder }));
  const isCustomOrder =
    !!draft.order?.length && JSON.stringify(sectionOrder) !== JSON.stringify(defaultOrder);

  // Plain derivation, not useMemo: `page` is now also read by the section-order
  // helpers above, and the React Compiler could no longer prove the manual
  // memoization safe (it bailed out of optimizing the whole component). The
  // compiler memoizes this for us.
  const groups = (() => {
    if (!page) return [];
    // Fields owned by a custom control (the roster) and pure bookkeeping never
    // get the generic label-and-input treatment.
    const generic = page.fields.filter((f) => !f.editor && f.type !== "internal");
    const seen: string[] = [];
    for (const f of generic) if (!seen.includes(f.group)) seen.push(f.group);
    return seen.map((g) => ({ group: g, fields: generic.filter((f) => f.group === g) }));
  })();

  const previewContent = useMemo(
    () => resolveContent(pageKey, draft, previewLocale),
    [pageKey, draft, previewLocale],
  );

  const publish = async () => {
    setBusy("publish");
    setMsg(null);
    const res = await fetch(`/api/admin/site-content/${pageKey}/publish`, {
      method: "POST",
      headers: await authHeaders(),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && j.ok) {
      setPublishedAt(j.published_at);
      setMsg({ type: "ok", text: "Birt! Breytingar eru nú í loftinu." });
    } else setMsg({ type: "err", text: j.error || "Ekki tókst að birta." });
  };

  const translate = async (from: Locale, to: Locale) => {
    setBusy(`tr-${to}`);
    setMsg(null);
    const res = await fetch(`/api/admin/site-content/${pageKey}/translate`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ from, to }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && j.ok) {
      skipSave.current = true; // server already saved
      setDraft((prev) => ({ is: j.draft.is ?? {}, en: j.draft.en ?? {}, order: j.draft.order ?? prev.order }));
      setMsg({ type: "ok", text: `Þýddi ${j.count} reiti → ${to === "en" ? "ensku" : "íslensku"}.` });
    } else {
      setMsg({ type: "err", text: j.error || "Þýðing mistókst." });
    }
  };

  if (!page) {
    return (
      <div className="p-8">
        <Link href="/admin/website" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Vefsíða
        </Link>
        <p className="text-sm text-slate-500">Þessi síða fannst ekki í efnisskránni.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <Link href="/admin/website" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft className="w-4 h-4" /> Vefsíða
      </Link>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{page.label}</h1>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {saveState === "saving" && <span>Vistar…</span>}
            {saveState === "saved" && (
              <span className="text-emerald-600 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Vistað (drög)
              </span>
            )}
            {saveState === "error" && <span className="text-red-600">Vistun mistókst</span>}
            {publishedAt && <span>· Síðast birt {new Date(publishedAt).toLocaleString("is-IS")}</span>}
            {page.path && (
              <a
                href={page.path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900"
              >
                <ExternalLink className="w-3 h-3" /> Skoða síðuna
              </a>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => translate("is", "en")} disabled={!!busy} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Languages className="w-4 h-4" /> {busy === "tr-en" ? "Þýði…" : "Þýða → enska"}
            </button>
            <button onClick={() => translate("en", "is")} disabled={!!busy} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Languages className="w-4 h-4" /> {busy === "tr-is" ? "Þýði…" : "Þýða → íslenska"}
            </button>
            <button onClick={publish} disabled={!!busy} className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">
              <Send className="w-4 h-4" /> {busy === "publish" ? "Birti…" : "Birta"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border p-3 text-xs ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
      {!isAdmin && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Þú hefur lesaðgang. Aðeins stjórnendur geta breytt og birt.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fields */}
        <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
          {page.sections.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  Röð kafla
                </h2>
                {isCustomOrder && (
                  <button
                    onClick={resetOrder}
                    disabled={!isAdmin}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" /> Sjálfgefin röð
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Færðu kafla upp eða niður. Bakgrunnur skiptist sjálfkrafa á milli hvíts og grás
                eftir röðinni. Hetjusvæðið er alltaf efst.
              </p>
              <ol className="space-y-1.5">
                {sectionOrder.map((id, i) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5"
                  >
                    <GripVertical className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                    <span className="w-5 text-[11px] font-semibold text-slate-400">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-700">{sectionLabel(id)}</span>
                    <button
                      onClick={() => moveSection(i, i - 1)}
                      disabled={!isAdmin || i === 0}
                      aria-label={`Færa ${sectionLabel(id)} upp`}
                      className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-25 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(i, i + 1)}
                      disabled={!isAdmin || i === sectionOrder.length - 1}
                      aria-label={`Færa ${sectionLabel(id)} niður`}
                      className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-25 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {groups.map((g) => (
            <Fragment key={g.group}>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-700 mb-3">{g.group}</h2>
              <div className="space-y-4">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <div className="text-xs font-medium text-slate-600 mb-1">
                      {f.label}
                      {f.type === "heading" && (
                        <span className="ml-2 font-normal text-slate-400">
                          Notaðu ==orð== til að lita orð blátt
                        </span>
                      )}
                    </div>
                    {f.help && <p className="text-[11px] text-slate-400 mb-1.5 -mt-0.5">{f.help}</p>}

                    {f.type === "choice" ? (
                      // Layout switches aren't translated — one value for both locales.
                      <ChoiceField
                        value={draft.is?.[f.key] || page.defaultsIs[f.key] || ""}
                        options={f.options ?? []}
                        disabled={!isAdmin}
                        onChange={(v) => setField("is", f.key, v)}
                      />
                    ) : f.type === "icon" ? (
                      // Icons aren't translated — one value for both locales.
                      <IconPicker
                        value={draft.is?.[f.key] ?? ""}
                        onChange={(v) => setField("is", f.key, v)}
                        disabled={!isAdmin}
                        fallback={page.defaultsIs[f.key] ?? ""}
                      />
                    ) : f.type === "image" ? (
                      // Photos are a single, locale-independent value, like icons.
                      <ImageField
                        value={draft.is?.[f.key] ?? ""}
                        fallback={page.defaultsIs[f.key] ?? ""}
                        disabled={!isAdmin}
                        onChange={(v) => setField("is", f.key, v)}
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(["is", "en"] as Locale[]).map((loc) => {
                          const val = draft[loc]?.[f.key] ?? "";
                          const placeholder = loc === "is" ? page.defaultsIs[f.key] : "(þýðing)";
                          return (
                            <label key={loc} className="block">
                              <span className="text-[10px] uppercase tracking-wide text-slate-400">{loc}</span>
                              {f.type === "textarea" ? (
                                <textarea
                                  value={val}
                                  onChange={(e) => setField(loc, f.key, e.target.value)}
                                  disabled={!isAdmin}
                                  rows={3}
                                  placeholder={placeholder}
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
                                />
                              ) : (
                                <input
                                  value={val}
                                  onChange={(e) => setField(loc, f.key, e.target.value)}
                                  disabled={!isAdmin}
                                  placeholder={placeholder}
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-cyan-200 outline-none disabled:bg-slate-50"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {hasRoster && g.group === TEAM_ROSTER_GROUP && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  Teymismeðlimir
                </h2>
                <p className="mb-3 text-[11px] text-slate-400">
                  Smelltu á nafn til að breyta. Falinn meðlimur heldur öllum upplýsingum en birtist
                  ekki á vefnum. Röðin hér er röðin á síðunni.
                </p>
                <TeamRoster members={members} disabled={!isAdmin} onChange={setMembers} />
              </section>
            )}
            </Fragment>
          ))}
          <p className="text-xs text-slate-400">
            Íslenskur reitur sem er tómur notar sjálfgefna textann. Enskur reitur sem er tómur sýnir íslenska textann á
            ensku síðunni þangað til hann er þýddur.
          </p>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Forskoðun (drög)
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              {(["is", "en"] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setPreviewLocale(loc)}
                  className={`px-2.5 py-1 inline-flex items-center gap-1 ${previewLocale === loc ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  <Globe2 className="w-3 h-3" /> {loc.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
            <div className="overflow-auto h-full">
              <div style={{ width: "200%", transform: "scale(0.5)", transformOrigin: "top left" }}>
                <Preview pageKey={pageKey} c={previewContent} order={sectionOrder} locale={previewLocale} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
