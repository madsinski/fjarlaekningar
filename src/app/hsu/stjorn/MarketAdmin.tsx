"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, Notice, hsuApi } from "../_components/ui";
import { hhmm } from "@/lib/hsu/types";
import { useT } from "@/lib/hsu/i18n/client";
import { dayLabelL, weekdayShortOf } from "@/lib/hsu/i18n/format";
import { admin } from "@/lib/hsu/i18n/messages/admin";
import type { PlannerCtx } from "./types";

/** Setur íhluti (t.d. feitletrun) í stað {breyta} í þýddum texta. */
function rich(template: string, parts: Record<string, ReactNode>): ReactNode {
  return template.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{parts[s] ?? `{${s}}`}</Fragment> : s));
}

export default function MarketAdmin({ ctx }: { ctx: PlannerCtx }) {
  const { data } = ctx;
  const t = useT(admin);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const name = (id: string | null) => data.doctors.find((d) => d.id === id)?.name ?? "—";
  const awaiting = data.swaps.filter((s) => s.status === "awaiting_approval");
  const pending = data.swaps.filter((s) => s.status === "pending");

  const act = async (id: string, action: "approve" | "reject" | "cancel") => {
    setBusy(id + action); setErr(null);
    const r = await hsuApi(`/api/hsu/admin/swaps/${id}`, { body: { action }, staff: true });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? t("doctors.failed")); return; }
    await ctx.reload();
  };

  const when = (s: (typeof data.swaps)[number]) => s.shift ? `${weekdayShortOf(s.shift.shift_date, t.lang)} ${dayLabelL(s.shift.shift_date, t.lang)} · ${s.shift.label} ${hhmm(s.shift.starts)}–${hhmm(s.shift.ends)}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("market.title")}</h1>
        <p className="text-sm text-slate-500">
          {data.settings.market_requires_approval
            ? t("market.introApproval")
            : t("market.introFree")}
        </p>
      </div>
      {err && <Notice tone="err">{err}</Notice>}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("market.awaiting")}</h2>
        <Card className="divide-y divide-slate-100">
          {awaiting.length === 0 && <div className="p-5 text-sm text-slate-500">{t("market.awaitingEmpty")}</div>}
          {awaiting.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{when(s)}</div>
                <div className="text-xs text-slate-500">{rich(t("market.wantsToTake"), { taker: <b>{name(s.taken_by)}</b>, from: <b>{name(s.from_doctor)}</b> })}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="success" busy={busy === s.id + "approve"} onClick={() => act(s.id, "approve")}><Check className="h-3.5 w-3.5" /> {t("market.approve")}</Button>
                <Button size="sm" variant="ghost" busy={busy === s.id + "reject"} onClick={() => act(s.id, "reject")}><X className="h-3.5 w-3.5" /> {t("market.reject")}</Button>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("market.open")}</h2>
        <Card className="divide-y divide-slate-100">
          {pending.length === 0 && <div className="p-5 text-sm text-slate-500">{t("market.openEmpty")}</div>}
          {pending.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{when(s)}</div>
                <div className="text-xs text-slate-500">
                  {name(s.from_doctor)} {s.to_doctor ? rich(t("market.offersTo"), { to: <b>{name(s.to_doctor)}</b> }) : <Badge tone="amber">{t("market.onMarket")}</Badge>}
                  {s.note ? ` · „${s.note}“` : ""}
                </div>
              </div>
              <Button size="sm" variant="ghost" busy={busy === s.id + "cancel"} onClick={() => act(s.id, "cancel")}>{t("market.cancel")}</Button>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
