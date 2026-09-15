"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, Notice, hsuApi } from "../_components/ui";
import { dayLabel, hhmm, weekdayShort } from "@/lib/hsu/types";
import type { PlannerCtx } from "./types";

export default function MarketAdmin({ ctx }: { ctx: PlannerCtx }) {
  const { data } = ctx;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const name = (id: string | null) => data.doctors.find((d) => d.id === id)?.name ?? "—";
  const awaiting = data.swaps.filter((s) => s.status === "awaiting_approval");
  const pending = data.swaps.filter((s) => s.status === "pending");

  const act = async (id: string, action: "approve" | "reject" | "cancel") => {
    setBusy(id + action); setErr(null);
    const r = await hsuApi(`/api/hsu/admin/swaps/${id}`, { body: { action }, staff: true });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    await ctx.reload();
  };

  const when = (s: (typeof data.swaps)[number]) => s.shift ? `${weekdayShort(s.shift.shift_date)} ${dayLabel(s.shift.shift_date)} · ${s.shift.label} ${hhmm(s.shift.starts)}–${hhmm(s.shift.ends)}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Vaktamarkaður</h1>
        <p className="text-sm text-slate-500">
          {data.settings.market_requires_approval
            ? "Þegar læknir tekur vakt bíður skiptin samþykkis þíns."
            : "Læknar skipta vöktum sín á milli án samþykkis. Hægt er að krefjast samþykkis undir Stillingar."}
        </p>
      </div>
      {err && <Notice tone="err">{err}</Notice>}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Bíða samþykkis</h2>
        <Card className="divide-y divide-slate-100">
          {awaiting.length === 0 && <div className="p-5 text-sm text-slate-500">Ekkert bíður samþykkis.</div>}
          {awaiting.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{when(s)}</div>
                <div className="text-xs text-slate-500"><b>{name(s.taken_by)}</b> vill taka vakt <b>{name(s.from_doctor)}</b></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="success" busy={busy === s.id + "approve"} onClick={() => act(s.id, "approve")}><Check className="h-3.5 w-3.5" /> Samþykkja</Button>
                <Button size="sm" variant="ghost" busy={busy === s.id + "reject"} onClick={() => act(s.id, "reject")}><X className="h-3.5 w-3.5" /> Hafna</Button>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Opin boð</h2>
        <Card className="divide-y divide-slate-100">
          {pending.length === 0 && <div className="p-5 text-sm text-slate-500">Engar vaktir á vaktamarkaði.</div>}
          {pending.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{when(s)}</div>
                <div className="text-xs text-slate-500">
                  {name(s.from_doctor)} {s.to_doctor ? <>býður <b>{name(s.to_doctor)}</b></> : <Badge tone="amber">á vaktamarkaði</Badge>}
                  {s.note ? ` · „${s.note}“` : ""}
                </div>
              </div>
              <Button size="sm" variant="ghost" busy={busy === s.id + "cancel"} onClick={() => act(s.id, "cancel")}>Fella niður</Button>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
