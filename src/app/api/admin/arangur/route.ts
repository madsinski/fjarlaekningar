// Árangursmælingar — lestur og skrif.
//
// Taflan geymir aðeins samantekt: hver dálkur er fjöldi, ekkert sem rekja má
// til einstaklings. Það er ástæðan fyrir því að hún má liggja hér yfirleitt.
//
// GET  — hvaða virki starfsmaður sem er les. Skilar mánuðum, forsendum,
//        stöðvalista og stöðu gátlistans í einu kalli, því síðan þarf allt
//        fjórennt til að teikna sig.
// POST — stjórnandi skrifar. action ræður hverju: mánuði, forsendum,
//        gátlista eða heilum innflutningi.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { FORSENDUR_SJALFGEFID, type Forsendur, type Manudur } from "@/lib/arangur";
import { HSU_STATIONS, mergeOnboarding } from "@/lib/station-onboarding";

export const runtime = "nodejs";

const FORSENDUR_LYKILL = "arangur_forsendur";
const GATLISTI_LYKILL = "arangur_gatlisti";

async function lesaStillingu<T>(lykill: string, sjalfgefid: T): Promise<T> {
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", lykill).maybeSingle();
  return data?.value ? ({ ...sjalfgefid, ...(data.value as object) } as T) : sjalfgefid;
}

/** Stöðvarnar koma úr innleiðingarmódúlnum svo það er einn sannleikur um
 *  hvaða stöðvar eru til. Sé hann ótekinn í notkun er fallið aftur á
 *  starfsstöðvalista HSU. */
async function lesaStodvar(): Promise<{ institution: string; short: string; stations: string[] }[]> {
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "station_onboarding").maybeSingle();
  const state = mergeOnboarding(data?.value ?? null);
  const ut = state.institutions
    .filter((i) => i.stations.length)
    .map((i) => ({ institution: i.short.toLowerCase() || i.id, short: i.short || i.name, stations: i.stations.map((s) => s.name) }));
  return ut.length ? ut : [{ institution: "hsu", short: "HSU", stations: HSU_STATIONS }];
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Innskráningar krafist" }, { status: 401 });

  try {
    const [manudirRes, forsendur, gatlisti, stodvar] = await Promise.all([
      supabaseAdmin.from("arangur_manudir").select("*").order("month", { ascending: true }),
      lesaStillingu<Forsendur>(FORSENDUR_LYKILL, FORSENDUR_SJALFGEFID),
      lesaStillingu<{ done: Record<string, boolean> }>(GATLISTI_LYKILL, { done: {} }),
      lesaStodvar(),
    ]);

    if (manudirRes.error) throw manudirRes.error;
    return NextResponse.json({
      ok: true,
      manudir: manudirRes.data ?? [],
      forsendur,
      gatlisti: gatlisti.done ?? {},
      stodvar,
      admin: isAdmin(caller),
    });
  } catch {
    // Taflan er ekki til — migration ekki keyrð. Síðan á að segja það
    // hreint út frekar en að líta út eins og engar mælingar séu til.
    return NextResponse.json({
      ok: true,
      unavailable: true,
      manudir: [],
      forsendur: FORSENDUR_SJALFGEFID,
      gatlisti: {},
      stodvar: [{ institution: "hsu", short: "HSU", stations: HSU_STATIONS }],
      admin: isAdmin(caller),
    });
  }
}

/** Dálkar sem mega berast frá viðmótinu. Hvítlisti frekar en svartlisti, svo
 *  nýr dálkur í töflunni verður ekki óvart skrifanlegur úr vafra. */
const SKRIFANLEGT = new Set([
  "institution", "station", "month",
  "erindi_alls", "erindi_leyst", "erindi_visad", "erindi_endurtekin",
  "visad_heilsugaesla", "visad_serfraedi", "visad_annad", "visad_brad",
  "kodar_utan_setts", "listi_stodvadur", "stodvun_flokkar", "lyfsedlar", "syklalyf",
  "svartimi_midgildi_min", "svartimi_p95_min", "erindi_sundurlidun",
  "adkoma_beint", "adkoma_hjukrunarfr", "adkoma_mottaka", "adkoma_gagnafr", "adkoma_annad",
  "almenn_alls", "almenn_leyst", "almenn_oleyst_flokkar",
  "samskipti_kodar", "endurkomur_7d", "afleysingakostn_isk", "simtol_stofnun", "monnun_hlutfall",
  "konnun_svor", "konnun_send", "konnun_einfalt", "konnun_aftur", "konnun_annars_hvergi",
  "heildartimi_midgildi_klst", "ferdir_felldar",
  "starfsm_hjukr_jakvaett", "starfsm_laeknar_jakvaett",
  "frvik", "frvik_naermiss", "alvarleg_atvik",
  "laeknar_virkir", "laeknar_haettu", "studningsspurningar", "uppitimi_hlutfall",
  "note", "heimildir",
]);

function hreinsa(m: Partial<Manudur>, caller: { id: string; name: string }) {
  const ut: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(m)) if (SKRIFANLEGT.has(k)) ut[k] = v;
  ut.entered_by = caller.id;
  ut.entered_by_name = caller.name;
  return ut;
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Stjórnandaaðgangs krafist" }, { status: 403 });

  let body: { action?: string; manudur?: Partial<Manudur>; manudir?: Partial<Manudur>[]; forsendur?: Forsendur; done?: Record<string, boolean> } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Ógilt JSON" }, { status: 400 }); }

  try {
    switch (body.action) {
      case "forsendur": {
        if (!body.forsendur) return NextResponse.json({ ok: false, error: "Forsendur vantar" }, { status: 400 });
        await supabaseAdmin.from("site_settings").upsert(
          { key: FORSENDUR_LYKILL, value: body.forsendur, updated_by: caller!.id, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
        return NextResponse.json({ ok: true });
      }

      case "gatlisti": {
        await supabaseAdmin.from("site_settings").upsert(
          { key: GATLISTI_LYKILL, value: { done: body.done ?? {} }, updated_by: caller!.id, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
        return NextResponse.json({ ok: true });
      }

      case "innflutningur": {
        const radir = (body.manudir ?? []).filter((m) => m.station && m.month);
        if (!radir.length) return NextResponse.json({ ok: false, error: "Engar raðir" }, { status: 400 });
        // Innflutningur skrifar aðeins Medalia-dálkana yfir. Tölur sem koma
        // annars staðar frá — samskiptaskrá, kannanir — eru slegnar inn
        // handvirkt og mega ekki þurrkast út þótt skrá sé flutt inn aftur.
        const { error } = await supabaseAdmin
          .from("arangur_manudir")
          .upsert(radir.map((m) => hreinsa(m, caller!)), { onConflict: "institution,station,month" });
        if (error) throw error;
        return NextResponse.json({ ok: true, fjoldi: radir.length });
      }

      default: {
        if (!body.manudur?.station || !body.manudur?.month) {
          return NextResponse.json({ ok: false, error: "Stöð og mánuð vantar" }, { status: 400 });
        }
        const { error } = await supabaseAdmin
          .from("arangur_manudir")
          .upsert(hreinsa(body.manudur, caller!), { onConflict: "institution,station,month" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Villa" }, { status: 500 });
  }
}
