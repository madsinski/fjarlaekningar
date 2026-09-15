"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Mail, Pencil, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, Field, Modal, Notice, cx, hsuApi, inputCls, timeAgoIs } from "../_components/ui";
import { DOCTOR_COLORS, ROLE_IS, type HsuDoctor, type HsuRole } from "@/lib/hsu/types";
import type { PlannerCtx } from "./types";

function statusOf(d: HsuDoctor): { label: string; tone: "green" | "amber" | "slate" | "red" } {
  if (!d.active) return { label: "Óvirkur", tone: "slate" };
  if (d.activated) return { label: "Virkur", tone: "green" };
  if (d.invite_pending) return { label: "Boð sent", tone: "amber" };
  return { label: "Ekki virkjaður", tone: "red" };
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
  const doctors = [...ctx.data.doctors].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "is"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Læknar</h1>
          <p className="text-sm text-slate-500">Notandanafn er @hsu.is netfang. Enginn tvíþátta kóði — lykilorð eða 4 stafa aðgangskóði.</p>
        </div>
        <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Bæta við lækni</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Læknir</th>
              <th className="px-4 py-2.5">Hlutverk</th>
              <th className="px-4 py-2.5 text-right">Starfshlutfall</th>
              <th className="px-4 py-2.5">Staða</th>
              <th className="px-4 py-2.5">Síðast inni</th>
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
                  <td className="px-4 py-3">{d.role === "head" ? <Badge tone="blue">Yfirlæknir</Badge> : "Læknir"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.fte}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {d.has_pin && <Badge tone="slate"><KeyRound className="h-3 w-3" /> Kóði</Badge>}
                      {d.can_bakvakt && <Badge tone="blue">Bakvakt</Badge>}
                      {d.needs_bakvakt && <Badge tone="amber">Þarf bakvakt</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.last_login_at ? timeAgoIs(d.last_login_at) : "–"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /> Breyta</Button>
                  </td>
                </tr>
              );
            })}
            {doctors.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Engir læknar skráðir enn.</td></tr>
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
  return (
    <div className="space-y-3">
      <Field label="Fullt nafn"><input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
      <Field label="Netfang (notandanafn)" hint="Aðeins @hsu.is. Nóg að skrifa fyrri hlutann.">
        <div className="flex">
          <input className={cx(inputCls, "rounded-r-none")} value={v.email} onChange={(e) => set({ email: e.target.value })} autoCapitalize="none" spellCheck={false} placeholder="jon.jonsson" />
          {!v.email.includes("@") && <span className="flex items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">@hsu.is</span>}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sími"><input className={inputCls} value={v.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" /></Field>
        <Field label="Starfsheiti"><input className={inputCls} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Heimilislæknir" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hlutverk">
          <select className={inputCls} value={v.role} onChange={(e) => set({ role: e.target.value as HsuRole })}>
            {(Object.keys(ROLE_IS) as HsuRole[]).map((r) => <option key={r} value={r}>{ROLE_IS[r]}</option>)}
          </select>
        </Field>
        <Field label={`Starfshlutfall: ${v.fte}%`} hint="Vöktum skipt í hlutfalli">
          <input type="range" min={0} max={100} step={5} value={v.fte} onChange={(e) => set({ fte: Number(e.target.value) })} className="mt-2 w-full" />
        </Field>
      </div>
      <Field label="Litur á vaktaplani">
        <div className="flex flex-wrap gap-2">
          {DOCTOR_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => set({ color: c })} aria-label={`Litur ${c}`}
              className={cx("h-7 w-7 rounded-full ring-offset-2 transition", v.color === c && "ring-2 ring-slate-900")} style={{ background: c }} />
          ))}
        </div>
      </Field>
      <div className="space-y-2 rounded-xl border border-slate-200 p-3">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={v.can_bakvakt} onChange={(e) => set({ can_bakvakt: e.target.checked, needs_bakvakt: e.target.checked ? false : v.needs_bakvakt })} />
          <span><span className="block text-sm font-semibold">Bakvaktarréttindi</span><span className="block text-xs text-slate-500">Hefur reynslu til að taka bakvakt (BV1/BV2). Getur líka tekið forvakt.</span></span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={v.needs_bakvakt} onChange={(e) => set({ needs_bakvakt: e.target.checked, can_bakvakt: e.target.checked ? false : v.can_bakvakt })} />
          <span><span className="block text-sm font-semibold">Þarf bakvakt á forvakt</span><span className="block text-xs text-slate-500">Þegar læknirinn er á forvakt verður reyndur læknir að vera á bakvakt sama dag.</span></span>
        </label>
      </div>
      {v.role === "head" && <p className="text-xs text-slate-500">Yfirlæknir hefur aðgang að vaktaskipulaginu auk sinnar eigin síðu.</p>}
    </div>
  );
}

interface DoctorForm { name: string; email: string; phone: string; title: string; role: HsuRole; fte: number; color: string; can_bakvakt: boolean; needs_bakvakt: boolean }

function AddDoctor({ ctx, onClose }: { ctx: PlannerCtx; onClose: () => void }) {
  const [mode, setMode] = useState<"invite" | "manual">("invite");
  const [v, setV] = useState<DoctorForm>({ name: "", email: "", phone: "", title: "", role: "doctor", fte: 100, color: DOCTOR_COLORS[ctx.data.doctors.length % DOCTOR_COLORS.length], can_bakvakt: false, needs_bakvakt: false });
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
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    setDone({ link: r.link, emailed: r.emailed, name: r.doctor.name, email: r.doctor.email });
    await ctx.reload();
  };

  return (
    <Modal open onClose={onClose} title={done ? "Læknir skráður" : "Bæta við lækni"}>
      {done ? (
        <div className="space-y-4">
          <Notice tone="ok"><Check className="mr-1 inline h-4 w-4" /> {done.name} ({done.email}) hefur verið skráð(ur).</Notice>
          {mode === "invite" ? (
            <>
              <p className="text-sm text-slate-600">{done.emailed ? "Boð hefur verið sent í tölvupósti." : "Ekki tókst að senda tölvupóst — sendu hlekkinn sjálf(ur)."} Hlekkurinn gildir í 14 daga.</p>
              {done.link && (
                <div className="flex gap-2">
                  <input readOnly className={cx(inputCls, "text-xs")} value={done.link} onFocus={(e) => e.target.select()} />
                  <Button variant="ghost" onClick={() => copy(done.link!, "link")}>{copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div>Innskráning: <b>fjarlaekningar.is/hsu</b></div>
              <div>Notandanafn: <b>{done.email}</b></div>
              <div className="flex items-center gap-2">Lykilorð: <code className="rounded bg-white px-2 py-0.5 font-mono">{password}</code>
                <button onClick={() => copy(password, "pw")} className="text-[var(--hsu)]">{copied === "pw" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
              </div>
              <p className="text-xs text-slate-500">Lykilorðið birtist aðeins núna. {mustChange ? "Læknirinn velur sitt eigið við fyrstu innskráningu." : ""}</p>
            </div>
          )}
          <Button className="w-full" onClick={onClose}>Loka</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {([["invite", "Senda boð", <Mail key="m" className="h-4 w-4" />], ["manual", "Fylla út sjálf(ur)", <KeyRound key="k" className="h-4 w-4" />]] as const).map(([k, l, icon]) => (
              <button key={k} onClick={() => setMode(k)} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold", mode === k ? "bg-white shadow-sm" : "text-slate-600")}>{icon} {l}</button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {mode === "invite"
              ? "Læknirinn fær tölvupóst með hlekk, velur lykilorð og aðgangskóða sjálf(ur)."
              : "Þú velur upphafslykilorð og lætur lækninn fá það. Enginn tölvupóstur er sendur."}
          </p>
          <DoctorFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
          {mode === "manual" && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <Field label="Upphafslykilorð">
                <div className="flex gap-2">
                  <input className={cx(inputCls, "font-mono")} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button variant="ghost" type="button" onClick={() => setPassword(generatePassword())} title="Nýtt lykilorð"><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} className="h-4 w-4" />
                Læknir velur nýtt lykilorð við fyrstu innskráningu
              </label>
            </div>
          )}
          {err && <Notice tone="err">{err}</Notice>}
          <Button className="w-full" size="lg" busy={busy} onClick={submit} disabled={!v.name.trim() || !v.email.trim()}>
            <Plus className="h-4 w-4" /> {mode === "invite" ? "Skrá og senda boð" : "Skrá lækni"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function EditDoctor({ ctx, doctor, onClose }: { ctx: PlannerCtx; doctor: HsuDoctor; onClose: () => void }) {
  const [v, setV] = useState<DoctorForm>({ name: doctor.name, email: doctor.email, phone: doctor.phone, title: doctor.title, role: doctor.role, fte: doctor.fte, color: doctor.color, can_bakvakt: doctor.can_bakvakt, needs_bakvakt: doctor.needs_bakvakt });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);
  const isSelf = ctx.data.actor.doctorId === doctor.id;

  const patch = async (key: string, body: Record<string, unknown>, okText: string) => {
    setBusy(key); setMsg(null);
    const r = await hsuApi<{ link: string | null; emailed: boolean }>(`/api/hsu/admin/doctors/${doctor.id}`, { method: "PATCH", body, staff: true });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return null; }
    setMsg({ tone: "ok", text: okText });
    await ctx.reload();
    return r;
  };

  return (
    <Modal open onClose={onClose} title={doctor.name}>
      <div className="space-y-5">
        <DoctorFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
        <Button className="w-full" busy={busy === "save"} onClick={() => patch("save", { ...v }, "Vistað.")}>Vista breytingar</Button>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aðgangur</div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" busy={busy === "invite"} onClick={async () => {
              const r = await patch("invite", { resend_invite: true }, doctor.activated ? "Hlekkur til að velja nýtt lykilorð sendur." : "Boð sent aftur.");
              if (r?.link) setLink(r.link);
            }}><Mail className="h-3.5 w-3.5" /> {doctor.activated ? "Senda hlekk á nýtt lykilorð" : "Senda boð aftur"}</Button>
            <Button size="sm" variant="ghost" busy={busy === "link"} onClick={async () => {
              const r = await patch("link", { invite_link: true }, "Hlekkur búinn til (enginn póstur sendur).");
              if (r?.link) setLink(r.link);
            }}><Copy className="h-3.5 w-3.5" /> Búa til hlekk</Button>
            <Button size="sm" variant="ghost" busy={busy === "pw"} onClick={async () => {
              const pw = generatePassword();
              if (!confirm(`Setja nýtt lykilorð fyrir ${doctor.name}?\n\nLæknirinn verður skráður út af öllum tækjum og þarf að velja nýtt lykilorð við innskráningu.`)) return;
              const r = await patch("pw", { set_password: pw }, "Nýtt lykilorð sett.");
              if (r) setNewPw(pw);
            }}><KeyRound className="h-3.5 w-3.5" /> Setja lykilorð</Button>
            {doctor.has_pin && <Button size="sm" variant="ghost" busy={busy === "pin"} onClick={() => patch("pin", { clear_pin: true }, "Aðgangskóði fjarlægður.")}>Fjarlægja kóða</Button>}
            <Button size="sm" variant="ghost" busy={busy === "unlock"} onClick={() => patch("unlock", { unlock: true, logout_all: true }, "Aflæst og skráð út af öllum tækjum.")}>Aflæsa / skrá út alls staðar</Button>
          </div>
          {link && (
            <div className="flex gap-2">
              <input readOnly className={cx(inputCls, "text-xs")} value={link} onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(link)}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
          {newPw && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">Nýtt lykilorð: <code className="rounded bg-white px-2 py-0.5 font-mono">{newPw}</code> <span className="text-xs text-slate-500">(birtist aðeins núna)</span></div>
          )}
        </div>

        {!isSelf && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button size="sm" variant="ghost" busy={busy === "active"} onClick={() => patch("active", { active: !doctor.active }, doctor.active ? "Læknir afvirkjaður." : "Læknir virkjaður.")}>
              {doctor.active ? "Afvirkja" : "Virkja aftur"}
            </Button>
            <Button size="sm" variant="danger" busy={busy === "del"} onClick={async () => {
              if (!confirm(`Eyða ${doctor.name} alveg?\n\nÓskir hans eyðast og vaktir hans verða án læknis. Oftast er betra að afvirkja.`)) return;
              setBusy("del");
              const r = await hsuApi(`/api/hsu/admin/doctors/${doctor.id}`, { method: "DELETE", staff: true });
              setBusy(null);
              if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
              await ctx.reload();
              onClose();
            }}><Trash2 className="h-3.5 w-3.5" /> Eyða</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
