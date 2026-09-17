"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Mail, Pencil, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, Field, Modal, Notice, cx, hsuApi, inputCls } from "../_components/ui";
import { DOCTOR_COLORS, ROLE_IS, WEEKDAY_ORDER, type HsuDoctor, type HsuRole } from "@/lib/hsu/types";
import { useCommon, useT } from "@/lib/hsu/i18n/client";
import { LANGS, LANG_NAMES, type Lang } from "@/lib/hsu/i18n/core";
import { roleL, timeAgoL, weekdayShortL } from "@/lib/hsu/i18n/format";
import { admin } from "@/lib/hsu/i18n/messages/admin";
import type { PlannerCtx } from "./types";

function statusOf(d: HsuDoctor): { key: "inactive" | "active" | "invited" | "notActivated"; tone: "green" | "amber" | "slate" | "red" } {
  if (!d.active) return { key: "inactive", tone: "slate" };
  if (d.activated) return { key: "active", tone: "green" };
  if (d.invite_pending) return { key: "invited", tone: "amber" };
  return { key: "notActivated", tone: "red" };
}

/** Sterkt lykilorð sem auðvelt er að lesa upp: engin l/1/O/0. */
function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(14);
  crypto.getRandomValues(buf);
  let s = Array.from(buf, (n) => chars[n % chars.length]).join("");
  if (!/\d/.test(s)) s = s.slice(0, -1) + "7";
  return s;
}

export default function DoctorsTab({ ctx }: { ctx: PlannerCtx }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<HsuDoctor | null>(null);
  const t = useT(admin);
  const c = useCommon();
  const doctors = [...ctx.data.doctors].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "is"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("doctors.title")}</h1>
          <p className="text-sm text-slate-500">{t("doctors.intro")}</p>
        </div>
        <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> {t("doctors.add")}</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">{t("doctors.col.doctor")}</th>
              <th className="px-4 py-2.5">{t("doctors.col.role")}</th>
              <th className="px-4 py-2.5 text-right">{t("doctors.col.fte")}</th>
              <th className="px-4 py-2.5">{t("doctors.col.status")}</th>
              <th className="px-4 py-2.5">{t("doctors.col.lastLogin")}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => {
              const st = statusOf(d);
              return (
                <tr key={d.id} className={cx("border-b border-slate-50 last:border-0", !d.active && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
                      <div className="min-w-0">
                        <div className="font-semibold">{d.name}</div>
                        <div className="text-xs text-slate-500">{d.email}{d.title ? ` · ${d.title}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{d.role === "head" ? <Badge tone="blue">{roleL("head", t.lang)}</Badge> : roleL("doctor", t.lang)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.fte}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={st.tone}>{t.dyn(`doctors.status.${st.key}`)}</Badge>
                      {d.has_pin && <Badge tone="slate"><KeyRound className="h-3 w-3" /> {t("doctors.badge.pin")}</Badge>}
                      {d.can_bakvakt && <Badge tone="blue">{t("doctors.badge.bakvakt")}</Badge>}
                      {d.needs_bakvakt && <Badge tone="amber">{t("doctors.badge.needsBakvakt")}</Badge>}
                      {d.day_weekdays?.length > 0 && <Badge tone="slate">{t("doctors.badge.dayShift", { days: d.day_weekdays.map((x) => weekdayShortL(x, t.lang)).join(", ") })}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.last_login_at ? timeAgoL(d.last_login_at, t.lang) : "–"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /> {c("action.edit")}</Button>
                  </td>
                </tr>
              );
            })}
            {doctors.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{t("doctors.empty")}</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {adding && <AddDoctor ctx={ctx} onClose={() => setAdding(false)} />}
      {editing && <EditDoctor ctx={ctx} doctor={ctx.data.doctors.find((d) => d.id === editing.id) ?? editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DoctorFields({ v, set }: { v: DoctorForm; set: (p: Partial<DoctorForm>) => void }) {
  const t = useT(admin);
  return (
    <div className="space-y-3">
      <Field label={t("doctors.field.name")}><input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
      <Field label={t("doctors.field.email")} hint={t("doctors.field.emailHint")}>
        <div className="flex">
          <input className={cx(inputCls, "rounded-r-none")} value={v.email} onChange={(e) => set({ email: e.target.value })} autoCapitalize="none" spellCheck={false} placeholder="jon.jonsson" />
          {!v.email.includes("@") && <span className="flex items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">@hsu.is</span>}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("doctors.field.phone")}><input className={inputCls} value={v.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" /></Field>
        <Field label={t("doctors.field.title")}><input className={inputCls} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("doctors.field.titlePlaceholder")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("doctors.field.role")}>
          <select className={inputCls} value={v.role} onChange={(e) => set({ role: e.target.value as HsuRole })}>
            {(Object.keys(ROLE_IS) as HsuRole[]).map((r) => <option key={r} value={r}>{roleL(r, t.lang)}</option>)}
          </select>
        </Field>
        <Field label={t("doctors.field.lang")} hint={t("doctors.field.langHint")}>
          <select className={inputCls} value={v.lang} onChange={(e) => set({ lang: e.target.value as Lang })}>
            {LANGS.map((l) => <option key={l} value={l} lang={l}>{LANG_NAMES[l]}</option>)}
          </select>
        </Field>
      </div>
      {v.role === "head" && <p className="-mt-1 text-xs text-slate-500">{t("doctors.field.headHint")}</p>}
      <Field label={t("doctors.field.fte", { fte: v.fte })} hint={t("doctors.field.fteHint")}>
        <input type="range" min={0} max={100} step={5} value={v.fte} onChange={(e) => set({ fte: Number(e.target.value) })} className="mt-2 w-full" />
      </Field>
      <Field label={t("doctors.field.color")}>
        <div className="flex flex-wrap gap-2">
          {DOCTOR_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => set({ color: c })} aria-label={t("doctors.field.colorAria", { color: c })}
              className={cx("h-7 w-7 rounded-full ring-offset-2 transition", v.color === c && "ring-2 ring-slate-900")} style={{ background: c }} />
          ))}
        </div>
      </Field>
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-sm font-semibold">{t("doctors.field.dayShifts")}</div>
        <p className="text-xs text-slate-500">{t("doctors.field.dayShiftsHint")}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {WEEKDAY_ORDER.map((d) => (
            <button key={d} type="button" onClick={() => set({ day_weekdays: v.day_weekdays.includes(d) ? v.day_weekdays.filter((x) => x !== d) : [...v.day_weekdays, d].sort() })}
              className={cx("rounded-lg px-2.5 py-1.5 text-xs font-semibold", v.day_weekdays.length === 0 || v.day_weekdays.includes(d) ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
              {weekdayShortL(d, t.lang)}
            </button>
          ))}
          {v.day_weekdays.length > 0 && (
            <button type="button" onClick={() => set({ day_weekdays: [] })} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 underline">{t("doctors.field.allDays")}</button>
          )}
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 p-3">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={v.can_bakvakt} onChange={(e) => set({ can_bakvakt: e.target.checked, needs_bakvakt: e.target.checked ? false : v.needs_bakvakt })} />
          <span><span className="block text-sm font-semibold">{t("doctors.field.canBakvakt")}</span><span className="block text-xs text-slate-500">{t("doctors.field.canBakvaktHint")}</span></span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={v.needs_bakvakt} onChange={(e) => set({ needs_bakvakt: e.target.checked, can_bakvakt: e.target.checked ? false : v.can_bakvakt })} />
          <span><span className="block text-sm font-semibold">{t("doctors.field.needsBakvakt")}</span><span className="block text-xs text-slate-500">{t("doctors.field.needsBakvaktHint")}</span></span>
        </label>
      </div>
    </div>
  );
}

interface DoctorForm { name: string; email: string; phone: string; title: string; role: HsuRole; fte: number; color: string; can_bakvakt: boolean; needs_bakvakt: boolean; day_weekdays: number[]; lang: Lang }

function AddDoctor({ ctx, onClose }: { ctx: PlannerCtx; onClose: () => void }) {
  const t = useT(admin);
  const c = useCommon();
  const [mode, setMode] = useState<"invite" | "manual">("invite");
  const [v, setV] = useState<DoctorForm>({ name: "", email: "", phone: "", title: "", role: "doctor", fte: 100, color: DOCTOR_COLORS[ctx.data.doctors.length % DOCTOR_COLORS.length], can_bakvakt: false, needs_bakvakt: false, day_weekdays: [], lang: t.lang });
  const [password, setPassword] = useState(generatePassword);
  const [mustChange, setMustChange] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ link: string | null; emailed: boolean; name: string; email: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); } catch { /* ignore */ }
  };

  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await hsuApi<{ doctor: HsuDoctor; link: string | null; emailed: boolean }>("/api/hsu/admin/doctors", {
      body: { ...v, mode, password: mode === "manual" ? password : undefined, must_change_password: mustChange }, staff: true,
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? t("doctors.failed")); return; }
    setDone({ link: r.link, emailed: r.emailed, name: r.doctor.name, email: r.doctor.email });
    await ctx.reload();
  };

  return (
    <Modal open onClose={onClose} title={done ? t("doctors.added.title") : t("doctors.add")}>
      {done ? (
        <div className="space-y-4">
          <Notice tone="ok"><Check className="mr-1 inline h-4 w-4" /> {t("doctors.added.ok", { name: done.name, email: done.email })}</Notice>
          {mode === "invite" ? (
            <>
              <p className="text-sm text-slate-600">{done.emailed ? t("doctors.added.emailed") : t("doctors.added.notEmailed")} {t("doctors.added.linkValid")}</p>
              {done.link && (
                <div className="flex gap-2">
                  <input readOnly className={cx(inputCls, "text-xs")} value={done.link} onFocus={(e) => e.target.select()} />
                  <Button variant="ghost" onClick={() => copy(done.link!, "link")}>{copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div>{t("doctors.added.login")} <b>fjarlaekningar.is/hsu</b></div>
              <div>{t("doctors.added.username")} <b>{done.email}</b></div>
              <div className="flex items-center gap-2">{t("doctors.added.password")} <code className="rounded bg-white px-2 py-0.5 font-mono">{password}</code>
                <button onClick={() => copy(password, "pw")} className="text-[var(--hsu)]">{copied === "pw" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
              </div>
              <p className="text-xs text-slate-500">{t("doctors.added.pwOnce")} {mustChange ? t("doctors.added.pwMustChange") : ""}</p>
            </div>
          )}
          <Button className="w-full" onClick={onClose}>{c("action.close")}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {([["invite", t("doctors.mode.invite"), <Mail key="m" className="h-4 w-4" />], ["manual", t("doctors.mode.manual"), <KeyRound key="k" className="h-4 w-4" />]] as const).map(([k, l, icon]) => (
              <button key={k} onClick={() => setMode(k)} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold", mode === k ? "bg-white shadow-sm" : "text-slate-600")}>{icon} {l}</button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {mode === "invite"
              ? t("doctors.mode.inviteHint")
              : t("doctors.mode.manualHint")}
          </p>
          <DoctorFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
          {mode === "manual" && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <Field label={t("doctors.initialPassword")}>
                <div className="flex gap-2">
                  <input className={cx(inputCls, "font-mono")} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button variant="ghost" type="button" onClick={() => setPassword(generatePassword())} title={t("doctors.newPassword")}><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} className="h-4 w-4" />
                {t("doctors.mustChange")}
              </label>
            </div>
          )}
          {err && <Notice tone="err">{err}</Notice>}
          <Button className="w-full" size="lg" busy={busy} onClick={submit} disabled={!v.name.trim() || !v.email.trim()}>
            <Plus className="h-4 w-4" /> {mode === "invite" ? t("doctors.submit.invite") : t("doctors.submit.manual")}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function EditDoctor({ ctx, doctor, onClose }: { ctx: PlannerCtx; doctor: HsuDoctor; onClose: () => void }) {
  const t = useT(admin);
  const c = useCommon();
  const [v, setV] = useState<DoctorForm>({ name: doctor.name, email: doctor.email, phone: doctor.phone, title: doctor.title, role: doctor.role, fte: doctor.fte, color: doctor.color, can_bakvakt: doctor.can_bakvakt, needs_bakvakt: doctor.needs_bakvakt, day_weekdays: doctor.day_weekdays ?? [], lang: doctor.lang ?? "is" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);
  const isSelf = ctx.data.actor.doctorId === doctor.id;

  const patch = async (key: string, body: Record<string, unknown>, okText: string) => {
    setBusy(key); setMsg(null);
    const r = await hsuApi<{ link: string | null; emailed: boolean }>(`/api/hsu/admin/doctors/${doctor.id}`, { method: "PATCH", body, staff: true });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("doctors.failed") }); return null; }
    setMsg({ tone: "ok", text: okText });
    await ctx.reload();
    return r;
  };

  return (
    <Modal open onClose={onClose} title={doctor.name}>
      <div className="space-y-5">
        <DoctorFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
        <Button className="w-full" busy={busy === "save"} onClick={() => patch("save", { ...v },
          // API sendir tilkynningu í tölvupósti þegar læknir er gerður að yfirlækni.
          v.role === "head" && doctor.role !== "head" && (doctor.activated || doctor.active)
            ? t("doctors.edit.promoted", { name: v.name || doctor.name })
            : t("doctors.edit.saved"))}>{t("doctors.edit.save")}</Button>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("doctors.edit.access")}</div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" busy={busy === "invite"} onClick={async () => {
              const r = await patch("invite", { resend_invite: true }, doctor.activated ? t("doctors.edit.resetSent") : t("doctors.edit.inviteResent"));
              if (r?.link) setLink(r.link);
            }}><Mail className="h-3.5 w-3.5" /> {doctor.activated ? t("doctors.edit.sendReset") : t("doctors.edit.resendInvite")}</Button>
            <Button size="sm" variant="ghost" busy={busy === "link"} onClick={async () => {
              const r = await patch("link", { invite_link: true }, t("doctors.edit.linkCreated"));
              if (r?.link) setLink(r.link);
            }}><Copy className="h-3.5 w-3.5" /> {t("doctors.edit.createLink")}</Button>
            <Button size="sm" variant="ghost" busy={busy === "pw"} onClick={async () => {
              const pw = generatePassword();
              if (!confirm(t("doctors.edit.setPwConfirm", { name: doctor.name }))) return;
              const r = await patch("pw", { set_password: pw }, t("doctors.edit.pwSet"));
              if (r) setNewPw(pw);
            }}><KeyRound className="h-3.5 w-3.5" /> {t("doctors.edit.setPw")}</Button>
            {doctor.has_pin && <Button size="sm" variant="ghost" busy={busy === "pin"} onClick={() => patch("pin", { clear_pin: true }, t("doctors.edit.pinCleared"))}>{t("doctors.edit.clearPin")}</Button>}
            <Button size="sm" variant="ghost" busy={busy === "unlock"} onClick={() => patch("unlock", { unlock: true, logout_all: true }, t("doctors.edit.unlocked"))}>{t("doctors.edit.unlock")}</Button>
          </div>
          {link && (
            <div className="flex gap-2">
              <input readOnly className={cx(inputCls, "text-xs")} value={link} onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(link)}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
          {newPw && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">{t("doctors.edit.newPw")} <code className="rounded bg-white px-2 py-0.5 font-mono">{newPw}</code> <span className="text-xs text-slate-500">{t("doctors.edit.shownOnce")}</span></div>
          )}
        </div>

        {!isSelf && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button size="sm" variant="ghost" busy={busy === "active"} onClick={() => patch("active", { active: !doctor.active }, doctor.active ? t("doctors.edit.deactivated") : t("doctors.edit.activated"))}>
              {doctor.active ? t("doctors.edit.deactivate") : t("doctors.edit.reactivate")}
            </Button>
            <Button size="sm" variant="danger" busy={busy === "del"} onClick={async () => {
              if (!confirm(t("doctors.edit.deleteConfirm", { name: doctor.name }))) return;
              setBusy("del");
              const r = await hsuApi(`/api/hsu/admin/doctors/${doctor.id}`, { method: "DELETE", staff: true });
              setBusy(null);
              if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("doctors.failed") }); return; }
              await ctx.reload();
              onClose();
            }}><Trash2 className="h-3.5 w-3.5" /> {c("action.delete")}</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
