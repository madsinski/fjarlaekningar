"use client";

// Vinnustöð Fjarlækninga. Innskráning ef enginn er skráður inn — annars
// vinnusvæðið. Starfsfólk Fjarlækninga og læknar vaktakerfisins komast líka
// inn með sinni eigin innskráningu.

import { useCallback, useEffect, useState } from "react";
import VsLogin from "./_components/VsLogin";
import Workstation, { type Announcement, type VsMe } from "./_components/Workstation";
import { vsApi } from "./_components/shared";

type State =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "ready"; me: VsMe; announcements: Announcement[]; unread: number }
  | { kind: "error"; text: string };

export default function VinnustodPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    const r = await vsApi<{ me: VsMe; announcements: Announcement[]; unread: number; status?: number }>("/api/vinnustod/me", { staff: true });
    if (r.ok) setState({ kind: "ready", me: r.me, announcements: r.announcements, unread: r.unread });
    else if (r.status === 401 || r.status === 403) setState({ kind: "login" });
    else setState({ kind: "error", text: r.error ?? "Ekki tókst að hlaða vinnustöðinni" });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return <div className="mx-auto max-w-6xl px-4 py-10"><div className="h-40 animate-pulse rounded-3xl bg-slate-200/60" /></div>;
  }
  if (state.kind === "login") return <VsLogin onDone={() => { setState({ kind: "loading" }); void load(); }} />;
  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-slate-700">{state.text}</p>
        <button onClick={() => { setState({ kind: "loading" }); void load(); }} className="mt-4 font-semibold text-[var(--hsu)] hover:underline">Reyna aftur</button>
      </div>
    );
  }
  return <Workstation me={state.me} announcements={state.announcements} unread={state.unread} refresh={load} />;
}
