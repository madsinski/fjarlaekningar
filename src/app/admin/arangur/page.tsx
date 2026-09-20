"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Clock, Download,
  ExternalLink, FileSpreadsheet, Info, Loader2, Save, Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  FORSENDUR_SJALFGEFID, HEIMILD_HEITI, MAELD_ERINDI, erindiRadir, greina,
  leggjaSaman, manudurHeiti, manudurISO, sidustuManudir, tomurManudur,
  type Forsendur, type Heimild, type Manudur, type Stada,
} from "@/lib/arangur";
import { DALKAR, lesa, sniðmat, type InnflutningsVilla } from "@/lib/arangur-innflutningur";
import { GATLISTI, TIDNI_HEITI, kafliStada, timanaemtOgOgert, type Tidni } from "@/lib/arangur-gatlisti";

// Árangursmælingar — fimm flokkar, hver með einn höfuðmælikvarða og það sem
// ber hann þegar spurt er nánar.
//
// Innsláttur er flokkaður eftir HEIMILD (hver gefur þér töluna) af því það er
// vinnuflæðið; mælaborðið er flokkað eftir FULLYRÐINGU (hvað hún sannar) af
// því það er samtalið. Sami gagnagrunnur, tvær röðunarreglur, og hvorug
// reglan er röng á sínum stað.

type Flipi = "maelabord" | "innflutningur" | "skraning" | "gatlisti";

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

const STADA_LITUR: Record<Stada, string> = {
  godur: "border-emerald-200 bg-emerald-50",
  midlungs: "border-amber-200 bg-amber-50",
  slakur: "border-rose-200 bg-rose-50",
};

const HEIMILD_LITUR: Record<Heimild | "afleitt", string> = {
  medalia: "bg-cyan-100 text-cyan-800",
  stofnun: "bg-violet-100 text-violet-800",
  konnun: "bg-amber-100 text-amber-800",
  okkar: "bg-slate-200 text-slate-700",
  afleitt: "bg-slate-100 text-slate-500",
};

function Merki({ heimild }: { heimild: Heimild | "afleitt" }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${HEIMILD_LITUR[heimild]}`}>
      {heimild === "afleitt" ? "Afleitt" : HEIMILD_HEITI[heimild]}
    </span>
  );
}

/** Tölureitur sem greinir á milli núlls og ómælds. Auður reitur er ekki núll —
 *  „engin sýklalyf“ og „við mældum ekki sýklalyf“ eru ólíkar fullyrðingar og
 *  mælaborðið sýnir þær ólíkt. */
function Tala({
  label, value, onChange, hint, nullanlegt,
}: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string; nullanlegt?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        min={0}
        className={input}
        value={value === null || value === undefined ? "" : value}
        placeholder={nullanlegt ? "ómælt" : "0"}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(nullanlegt ? null : 0);
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : nullanlegt ? null : 0);
        }}
      />
      {hint && <span className="mt-1 block text-[11px] leading-snug text-slate-400">{hint}</span>}
    </label>
  );
}

export default function ArangurPage() {
  const [flipi, setFlipi] = useState<Flipi>("maelabord");
  const [manudir, setManudir] = useState<Manudur[]>([]);
  const [forsendur, setForsendur] = useState<Forsendur>(FORSENDUR_SJALFGEFID);
  const [gatlisti, setGatlisti] = useState<Record<string, boolean>>({});
  const [stodvar, setStodvar] = useState<{ institution: string; short: string; stations: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [admin, setAdmin] = useState(false);

  // Mælaborð: hvaða stöð og hversu langt aftur.
  const [stod, setStod] = useState<string>("");
  const [manudaFjoldi, setManudaFjoldi] = useState(12);

  // Skráning
  const [skrStod, setSkrStod] = useState("");
  const [skrManudur, setSkrManudur] = useState(manudurISO(-1));
  const [drog, setDrog] = useState<Manudur | null>(null);
  const [vistar, setVistar] = useState(false);
  const [skilabod, setSkilabod] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Innflutningur
  const [innVillur, setInnVillur] = useState<InnflutningsVilla[]>([]);
  const [innRadir, setInnRadir] = useState<Manudur[]>([]);
  const [innLinur, setInnLinur] = useState(0);
  const skraRef = useRef<HTMLInputElement>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const saekja = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/arangur", { headers: await authHeaders() });
      const j = await res.json();
      if (j.ok) {
        setManudir(j.manudir ?? []);
        setForsendur({ ...FORSENDUR_SJALFGEFID, ...(j.forsendur ?? {}) });
        setGatlisti(j.gatlisti ?? {});
        setStodvar(j.stodvar ?? []);
        setUnavailable(!!j.unavailable);
        setAdmin(!!j.admin);
        const fyrsta = j.stodvar?.[0]?.stations?.[0] ?? "";
        setStod((s) => s || fyrsta);
        setSkrStod((s) => s || fyrsta);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void saekja(); }, [saekja]);

  const allarStodvar = useMemo(() => stodvar.flatMap((i) => i.stations), [stodvar]);
  const stofnunAf = useCallback(
    (s: string) => stodvar.find((i) => i.stations.includes(s))?.institution ?? "hsu",
    [stodvar],
  );

  // ── Mælaborðið ────────────────────────────────────────────────────────────
  const gluggi = useMemo(() => sidustuManudir(manudaFjoldi), [manudaFjoldi]);
  const valdir = useMemo(
    () => manudir.filter((m) => (stod === "__allar" || m.station === stod) && gluggi.includes(m.month.slice(0, 10))),
    [manudir, stod, gluggi],
  );
  const samtala = useMemo(() => leggjaSaman(valdir), [valdir]);
  const flokkar = useMemo(() => greina(samtala, forsendur), [samtala, forsendur]);
  const radir = useMemo(() => erindiRadir(samtala), [samtala]);

  // ── Skráning ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!skrStod || !skrManudur) return;
    const fyrir = manudir.find((m) => m.station === skrStod && m.month.slice(0, 10) === skrManudur);
    setDrog(fyrir ? { ...fyrir } : tomurManudur(stofnunAf(skrStod), skrStod, skrManudur));
  }, [skrStod, skrManudur, manudir, stofnunAf]);

  const setja = (p: Partial<Manudur>) => setDrog((d) => (d ? { ...d, ...p } : d));

  const vista = async () => {
    if (!drog) return;
    setVistar(true);
    setSkilabod(null);
    try {
      const res = await fetch("/api/admin/arangur", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ manudur: drog }),
      });
      const j = await res.json();
      setSkilabod(j.ok ? { kind: "ok", text: "Vistað." } : { kind: "err", text: j.error ?? "Villa" });
      if (j.ok) await saekja();
    } finally {
      setVistar(false);
    }
  };

  const vistaForsendur = async (f: Forsendur) => {
    setForsendur(f);
    await fetch("/api/admin/arangur", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "forsendur", forsendur: f }) });
  };

  const setjaGatlista = async (id: string, done: boolean) => {
    const next = { ...gatlisti, [id]: done };
    setGatlisti(next);
    await fetch("/api/admin/arangur", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "gatlisti", done: next }) });
  };

  // ── Innflutningur ─────────────────────────────────────────────────────────
  const lesaSkra = async (f: File) => {
    const texti = await f.text();
    const n = lesa(texti, stodvar[0]?.institution ?? "hsu");
    setInnRadir(n.manudir);
    setInnVillur(n.villur);
    setInnLinur(n.linur);
  };

  const flytjaInn = async () => {
    if (!innRadir.length) return;
    setVistar(true);
    try {
      const res = await fetch("/api/admin/arangur", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ action: "innflutningur", manudir: innRadir }),
      });
      const j = await res.json();
      setSkilabod(j.ok ? { kind: "ok", text: `${j.fjoldi} stöðvarmánuðir fluttir inn.` } : { kind: "err", text: j.error ?? "Villa" });
      if (j.ok) { setInnRadir([]); setInnVillur([]); setInnLinur(0); if (skraRef.current) skraRef.current.value = ""; await saekja(); }
    } finally {
      setVistar(false);
    }
  };

  const saekjaSnidmat = () => {
    const blob = new Blob([sniðmat()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fjarlaekningar-manadarutflutningur-snidmat.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const ogert = useMemo(() => timanaemtOgOgert(gatlisti), [gatlisti]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Sæki mælingar…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <BarChart3 className="h-6 w-6 text-cyan-600" /> Árangur
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Fimm flokkar, hver með einn höfuðmælikvarða og það sem ber hann þegar spurt er nánar. Tölurnar eru
          samantekt á þjónustustigi — ekkert hér er rekjanlegt til einstaklings, og það er ástæðan fyrir því að
          þetta er gæðaeftirlit en ekki rannsókn.
        </p>
      </header>

      {unavailable && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Taflan er ekki til ennþá. Keyrðu <code className="rounded bg-amber-100 px-1">supabase/arangur-schema.sql</code> í
            Supabase SQL-ritlinum; þangað til er ekkert hægt að vista.
          </span>
        </div>
      )}

      {ogert.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-900">
            <Clock className="h-4 w-4" /> {ogert.length} tímanæm atriði ógerð
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-800">
            Þetta eru atriðin sem eru ekki bætanleg eftir á — mæling sem byrjar of seint mælir ekki lengur það sem
            hún átti að mæla. Allt annað má gera í næstu viku án þess að tapa neinu.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-rose-800">
            {ogert.slice(0, 4).map((i) => <li key={i.id}>· {i.label}</li>)}
            {ogert.length > 4 && <li className="text-rose-600">· og {ogert.length - 4} til viðbótar</li>}
          </ul>
          <button onClick={() => setFlipi("gatlisti")} className="mt-2 text-xs font-semibold text-rose-900 underline">
            Opna gátlistann
          </button>
        </div>
      )}

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {([
          ["maelabord", "Mælaborð", BarChart3],
          ["innflutningur", "Innflutningur", Upload],
          ["skraning", "Skráning", FileSpreadsheet],
          ["gatlisti", "Gátlisti", ClipboardList],
        ] as [Flipi, string, typeof BarChart3][]).map(([id, heiti, Icon]) => (
          <button
            key={id}
            onClick={() => setFlipi(id)}
            className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              flipi === id ? "border-b-2 border-cyan-600 text-cyan-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" /> {heiti}
          </button>
        ))}
      </nav>

      {skilabod && (
        <div className={`rounded-lg p-3 text-sm ${skilabod.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {skilabod.text}
        </div>
      )}

      {/* ── MÆLABORÐ ──────────────────────────────────────────────────────── */}
      {flipi === "maelabord" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Stöð</span>
              <select className={input} value={stod} onChange={(e) => setStod(e.target.value)}>
                <option value="__allar">Allar stöðvar</option>
                {allarStodvar.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Tímabil</span>
              <select className={input} value={manudaFjoldi} onChange={(e) => setManudaFjoldi(Number(e.target.value))}>
                {[3, 6, 12, 24].map((n) => <option key={n} value={n}>Síðustu {n} mánuðir</option>)}
              </select>
            </label>
            <p className="pb-2 text-xs text-slate-500">
              {samtala.manudir} {samtala.manudir === 1 ? "mánuður" : "mánuðir"} með gögnum
            </p>
          </div>

          {flokkar.map((f) => (
            <section key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    {f.titill}
                    {f.hlid && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        Hlið
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500">{f.spurning}</p>
                </div>
                <span className="text-xs text-slate-400">{f.markmid}</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
                <div className={`rounded-lg border p-4 ${f.haus.stada ? STADA_LITUR[f.haus.stada] : "border-slate-200 bg-slate-50"}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{f.haus.heiti}</span>
                    <Merki heimild={f.haus.heimild} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">
                    {f.haus.gildi ?? <span className="text-lg font-medium text-slate-400">Bíður</span>}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-slate-600">{f.haus.undir}</p>
                  {f.haus.vantar && (
                    <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Info className="h-3 w-3" /> Vantar: {f.haus.vantar}
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs leading-relaxed text-slate-600">{f.afHverju}</p>
                  {f.forsenda && (
                    <p className={`mb-3 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
                      f.id === "alag" && !forsendur.timamaeling_gerd
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}>
                      {f.forsenda}
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {f.undir.map((u) => (
                      <div key={u.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-slate-600">{u.heiti}</span>
                          <Merki heimild={u.heimild} />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {u.gildi ?? <span className="text-sm font-medium text-slate-400">—</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{u.undir}</p>
                        {u.vantar && <p className="mt-1 text-[11px] font-medium text-cyan-700">Vantar: {u.vantar}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* Erindin ellefu — fullyrðing 1 og 2, erindi fyrir erindi. */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Erindin ellefu</h2>
            <p className="mb-3 max-w-3xl text-sm text-slate-600">
              Heildarlausnarhlutfallið felur það ef þrjú erindi bera hin átta. Markmiðið er ekki ellefu grænir hakar
              yfir 95% — því trúir enginn — heldur tafla sem stenst skoðun, þar sem veiku erindin eru sýnileg og
              útskýrt hverju var breytt.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-2 font-semibold">Erindi</th>
                    <th className="py-2 px-2 text-right font-semibold">Alls</th>
                    <th className="py-2 px-2 text-right font-semibold">Leyst</th>
                    <th className="py-2 px-2 text-right font-semibold">Vísað</th>
                    <th className="py-2 pl-2 text-right font-semibold">Lausnarhlutfall</th>
                  </tr>
                </thead>
                <tbody>
                  {radir.map((r) => (
                    <tr key={r.slug} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-2 text-slate-800">{r.titill}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{r.t.alls || "—"}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{r.t.leyst || "—"}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{r.t.visad || "—"}</td>
                      <td className="py-1.5 pl-2 text-right">
                        {r.hlutfall === null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                            r.t.alls < 5 ? "bg-slate-100 text-slate-500"
                              : r.hlutfall >= 80 ? "bg-emerald-100 text-emerald-800"
                              : r.hlutfall >= 60 ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {r.hlutfall}%{r.t.alls < 5 && " ·  fá"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Grátt hlutfall = færri en fimm erindi. Slíkar tölur eiga ekki að fara í skýrslu sem fer út úr húsi.
            </p>
          </section>

          {samtala.oleyst_flokkar.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Almenn þjónusta — það sem leystist ekki</h2>
              <p className="mb-3 max-w-3xl text-sm text-slate-600">
                Ruslakistan er þar sem erindi 12, 13 og 14 fela sig. Þetta er vegvísirinn að næstu erindum — og
                glæran sem selur sig sjálf: „við byrjuðum með ellefu, gögnin sögðu okkur hver næstu þrjú eiga að vera.“
              </p>
              <ul className="space-y-1">
                {samtala.oleyst_flokkar.map((f) => (
                  <li key={f.flokkur} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                    <span className="text-slate-700">{f.flokkur}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{f.fjoldi}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ── INNFLUTNINGUR ─────────────────────────────────────────────────── */}
      {flipi === "innflutningur" && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Mánaðarleg skrá frá Medalia</h2>
            <div className="mt-2 max-w-3xl space-y-2 text-sm leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-800">Ein lína á stöð × mánuð × erindi.</strong> Það er fínasta kornið
                sem er enn alveg ópersónugreinanlegt, og það gefur hvort tveggja í einni skrá: sundurliðun eftir
                erindi og heildartölur á stöð. Níu stöðvar × þrettán erindi = 117 línur á mánuði.
              </p>
              <p>
                <strong className="text-slate-800">Engar persónuupplýsingar — og það er hönnun, ekki varúð.</strong>{" "}
                Hver lína er fjöldi, ekki manneskja. Engin kennitala, engin dagsetning (mánuður er nógu nákvæmt og
                dagsetning á lítilli stöð er persónugreinandi), enginn frjáls texti, ekkert aldursbil, ekkert kyn.
                Þá er engin spurning um hvað gerist ef einhver fær aðgang að töflunni.
              </p>
              <p>
                Svartími er gefinn sem <strong className="text-slate-800">lengd í mínútum</strong>, aldrei sem
                tímastimpill.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saekjaSnidmat} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
                <Download className="h-4 w-4" /> Sækja sniðmát (CSV)
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Velja skrá
                <input
                  ref={skraRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void lesaSkra(f); }}
                />
              </label>
            </div>
          </section>

          {(innRadir.length > 0 || innVillur.length > 0) && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                {innLinur} línur lesnar → {innRadir.length} stöðvarmánuðir
              </h3>
              {innVillur.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{innVillur.length} athugasemdir</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                    {innVillur.slice(0, 12).map((v, i) => (
                      <li key={i}>{v.lina ? `Lína ${v.lina}: ` : ""}{v.texti}</li>
                    ))}
                    {innVillur.length > 12 && <li>… og {innVillur.length - 12} til viðbótar</li>}
                  </ul>
                </div>
              )}
              {innRadir.length > 0 && (
                <>
                  <ul className="mt-3 space-y-1 text-sm">
                    {innRadir.map((m) => (
                      <li key={`${m.station}${m.month}`} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                        <span className="text-slate-700">{m.station} · {manudurHeiti(m.month)}</span>
                        <span className="tabular-nums text-slate-500">{m.erindi_alls} erindi</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Innflutningur skrifar aðeins Medalia-dálkana. Tölur frá stofnuninni og úr könnunum standa óhreyfðar.
                  </p>
                  <button
                    onClick={flytjaInn}
                    disabled={vistar || !admin}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {vistar ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Flytja inn
                  </button>
                </>
              )}
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">Dálkarnir — þetta er skjalið sem fer til Medalia</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {DALKAR.map((d) => (
                    <tr key={d.nafn} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="py-1.5 pr-3 font-mono text-xs text-cyan-800">{d.nafn}</td>
                      <td className="py-1.5 text-xs leading-snug text-slate-600">
                        {d.lysing}
                        {d.valfrjals && <span className="ml-1 text-slate-400">(má vanta)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Erindisauðkenni:{" "}
              {MAELD_ERINDI.map((e) => e.slug).join(", ")}, almenn-laeknisthjonusta, laeknisvottord.
            </p>
          </section>
        </div>
      )}

      {/* ── SKRÁNING ──────────────────────────────────────────────────────── */}
      {flipi === "skraning" && drog && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Stöð</span>
              <select className={input} value={skrStod} onChange={(e) => setSkrStod(e.target.value)}>
                {allarStodvar.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Mánuður</span>
              <select className={input} value={skrManudur} onChange={(e) => setSkrManudur(e.target.value)}>
                {sidustuManudir(18).slice().reverse().map((m) => (
                  <option key={m} value={m}>{manudurHeiti(m)}</option>
                ))}
              </select>
            </label>
            <button
              onClick={vista}
              disabled={vistar || !admin || unavailable}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {vistar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Vista
            </button>
          </div>

          <p className="max-w-3xl text-sm text-slate-600">
            Flokkað eftir því <strong className="text-slate-800">hvaðan talan kemur</strong>, ekki hvað hún sannar —
            það er vinnuflæðið. Auður reitur þýðir ómælt og er ekki sama og núll: „engin alvarleg atvik“ og „við
            mældum ekki atvik“ eru ólíkar fullyrðingar og mælaborðið sýnir þær ólíkt.
          </p>

          <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <h3 className="mb-1 font-semibold text-slate-900">Frá stofnuninni</h3>
            <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-600">
              Nefnarinn er ekki hjá okkur og verður það aldrei — hann er í samskiptaskrá stofnunarinnar. Það er
              betra en nokkuð sem við hefðum getað talið sjálf: þeirra gögn, í þeirra kerfi, samræmd á landsvísu.
              Enginn efast um tölu úr samskiptaskrá.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tala nullanlegt label="Samskipti í sömu kóðum" value={drog.samskipti_kodar} onChange={(v) => setja({ samskipti_kodar: v })} hint="Nefnarinn. Án hans er hlutdeildartalan ekki reiknuð." />
              <Tala nullanlegt label="Endurkomur innan 7 daga" value={drog.endurkomur_7d} onChange={(v) => setja({ endurkomur_7d: v })} hint="Keyrt hjá stofnuninni, aðeins talan afhent." />
              <Tala nullanlegt label="Mönnun (%)" value={drog.monnun_hlutfall} onChange={(v) => setja({ monnun_hlutfall: v })} />
              <Tala nullanlegt label="Afleysingakostnaður (kr.)" value={drog.afleysingakostn_isk} onChange={(v) => setja({ afleysingakostn_isk: v })} hint="Rekstrarlínan sem við keppum við." />
              <Tala nullanlegt label="Símtöl til stofnunar" value={drog.simtol_stofnun} onChange={(v) => setja({ simtol_stofnun: v })} />
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <h3 className="mb-1 font-semibold text-slate-900">Kannanir og frávik</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tala label="Kannanir sendar" value={drog.konnun_send} onChange={(v) => setja({ konnun_send: v ?? 0 })} />
              <Tala label="Svör" value={drog.konnun_svor} onChange={(v) => setja({ konnun_svor: v ?? 0 })} />
              <Tala nullanlegt label="Sögðu einfalt (%)" value={drog.konnun_einfalt} onChange={(v) => setja({ konnun_einfalt: v })} />
              <Tala nullanlegt label="Myndu nota aftur (%)" value={drog.konnun_aftur} onChange={(v) => setja({ konnun_aftur: v })} />
              <Tala nullanlegt label="Hefðu annars sleppt því (%)" value={drog.konnun_annars_hvergi} onChange={(v) => setja({ konnun_annars_hvergi: v })} hint="Hreinn aðgengisávinningur — sterkasta röksemdin fyrir markmiði 1." />
              <Tala nullanlegt label="Heildartími til úrlausnar (klst)" value={drog.heildartimi_midgildi_klst} onChange={(v) => setja({ heildartimi_midgildi_klst: v })} hint="Frá fyrstu tilraun sjúklings, ekki frá innsendingu." />
              <Tala nullanlegt label="Ferðir sem féllu niður" value={drog.ferdir_felldar} onChange={(v) => setja({ ferdir_felldar: v })} />
              <Tala nullanlegt label="Hjúkrunarfr. jákvæðir (%)" value={drog.starfsm_hjukr_jakvaett} onChange={(v) => setja({ starfsm_hjukr_jakvaett: v })} />
              <Tala nullanlegt label="Læknar stofnunar jákvæðir (%)" value={drog.starfsm_laeknar_jakvaett} onChange={(v) => setja({ starfsm_laeknar_jakvaett: v })} hint="Sér hópur — þeir ráða meiru um framhaldið en virðist." />
              <Tala label="Skráð frávik" value={drog.frvik} onChange={(v) => setja({ frvik: v ?? 0 })} />
              <Tala label="Þar af næstum-atvik" value={drog.frvik_naermiss} onChange={(v) => setja({ frvik_naermiss: v ?? 0 })} />
              <Tala label="Alvarleg atvik" value={drog.alvarleg_atvik} onChange={(v) => setja({ alvarleg_atvik: v ?? 0 })} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="mb-1 font-semibold text-slate-900">Úr okkar kerfum</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Tala label="Læknar sem tóku vaktir" value={drog.laeknar_virkir} onChange={(v) => setja({ laeknar_virkir: v ?? 0 })} />
              <Tala label="Hættu í mánuðinum" value={drog.laeknar_haettu} onChange={(v) => setja({ laeknar_haettu: v ?? 0 })} />
              <Tala label="Stuðningsspurningar" value={drog.studningsspurningar} onChange={(v) => setja({ studningsspurningar: v ?? 0 })} hint="Fallandi tala = stöðin orðin sjálfbjarga." />
              <Tala nullanlegt label="Uppitími (%)" value={drog.uppitimi_hlutfall} onChange={(v) => setja({ uppitimi_hlutfall: v })} />
            </div>
          </section>

          <section className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
            <h3 className="mb-1 font-semibold text-slate-900">Úr Medalia</h3>
            <p className="mb-3 text-xs text-slate-600">
              Venjulega flutt inn með skrá. Hér má leiðrétta handvirkt eða slá inn áður en útflutningur er kominn í gagnið.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Tala label="Erindi alls" value={drog.erindi_alls} onChange={(v) => setja({ erindi_alls: v ?? 0 })} />
              <Tala label="Leyst" value={drog.erindi_leyst} onChange={(v) => setja({ erindi_leyst: v ?? 0 })} />
              <Tala label="Vísað áfram" value={drog.erindi_visad} onChange={(v) => setja({ erindi_visad: v ?? 0 })} />
              <Tala label="Þar af brátt/112" value={drog.visad_brad} onChange={(v) => setja({ visad_brad: v ?? 0 })} hint="Næstum-atvik síunarinnar." />
              <Tala label="Listi stöðvaði" value={drog.listi_stodvadur} onChange={(v) => setja({ listi_stodvadur: v ?? 0 })} />
              <Tala label="Lyfseðlar" value={drog.lyfsedlar} onChange={(v) => setja({ lyfsedlar: v ?? 0 })} />
              <Tala label="Sýklalyf" value={drog.syklalyf} onChange={(v) => setja({ syklalyf: v ?? 0 })} />
              <Tala nullanlegt label="Svartími miðgildi (mín)" value={drog.svartimi_midgildi_min} onChange={(v) => setja({ svartimi_midgildi_min: v })} />
            </div>
          </section>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Athugasemd</span>
            <textarea
              className={`${input} min-h-[70px]`}
              value={drog.note}
              placeholder="Það sem skýrir tölurnar og gleymist annars fyrir næsta ársfjórðung."
              onChange={(e) => setja({ note: e.target.value })}
            />
          </label>
        </div>
      )}

      {/* ── GÁTLISTI ──────────────────────────────────────────────────────── */}
      {flipi === "gatlisti" && (
        <div className="space-y-6">
          {(["einu-sinni", "manadarlega", "arsfjordungslega", "arlega"] as Tidni[]).map((tidni) => {
            const kaflar = GATLISTI.filter((k) => k.tidni === tidni);
            if (!kaflar.length) return null;
            return (
              <div key={tidni}>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{TIDNI_HEITI[tidni]}</h2>
                <div className="space-y-3">
                  {kaflar.map((k) => {
                    const stadaPct = kafliStada(k, gatlisti);
                    return (
                      <section key={k.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-bold text-slate-900">{k.title}</h3>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            stadaPct === 100 ? "bg-emerald-100 text-emerald-800" : stadaPct > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                          }`}>
                            {stadaPct}%
                          </span>
                        </div>
                        {k.blurb && <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">{k.blurb}</p>}
                        <ul className="space-y-2">
                          {k.items.map((i) => (
                            <li key={i.id} className="flex gap-2.5">
                              <input
                                type="checkbox"
                                checked={!!gatlisti[i.id]}
                                disabled={!admin}
                                onChange={(e) => void setjaGatlista(i.id, e.target.checked)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                              />
                              <div className="min-w-0">
                                <span className={`text-sm ${gatlisti[i.id] ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                  {i.label}
                                </span>
                                {i.timanaemt && !gatlisti[i.id] && (
                                  <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                    Tímanæmt
                                  </span>
                                )}
                                {i.detail && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{i.detail}</p>}
                                {i.link && (
                                  <a href={i.link} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline">
                                    {i.linkLabel ?? "Opna"} <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-900">Forsendur</h3>
            <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              „Frigjörð vinna“ er afleidd tala og forsendan er því hluti af fullyrðingunni. Hún er það fyrsta sem
              verður dregið í efa, svo hún á að vera sýnileg og auðvelt að verja — ekki grafin í kóða.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Tala label="Mín. sparaðar á erindi" value={forsendur.min_a_erindi} onChange={(v) => void vistaForsendur({ ...forsendur, min_a_erindi: v ?? 0 })} />
              <Tala label="Mín. kostaðar á erindi" value={forsendur.min_kostnadur_a_erindi} onChange={(v) => void vistaForsendur({ ...forsendur, min_kostnadur_a_erindi: v ?? 0 })} hint="Tíminn sem stofnunin eyðir í að vísa. Núll = tilfærsla vinnu ómæld." />
              <Tala label="Klst. í læknisdegi" value={forsendur.klst_i_laeknisdegi} onChange={(v) => void vistaForsendur({ ...forsendur, klst_i_laeknisdegi: v ?? 7 })} />
              <Tala label="Svartímaloforð (mín)" value={forsendur.svartimi_markmid_min} onChange={(v) => void vistaForsendur({ ...forsendur, svartimi_markmid_min: v ?? 120 })} />
            </div>
            <label className="mt-3 flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={forsendur.timamaeling_gerd}
                disabled={!admin}
                onChange={(e) => void vistaForsendur({ ...forsendur, timamaeling_gerd: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-700">
                Tímamæling hefur verið framkvæmd
                <span className="mt-0.5 block text-xs text-slate-500">
                  Þar til þetta er hakað er álagsléttingartalan merkt ágiskun og á ekki heima í kynningu.
                </span>
              </span>
            </label>
          </section>
        </div>
      )}
    </div>
  );
}
