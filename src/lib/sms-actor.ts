// Hver notar vinnustöðina — og hvaðan hann er skráður inn.
//
// ÞRENNS KONAR INNSKRÁNING liggur að sama verkfærinu:
//   * Notandi vinnustöðvar (gatt_users, kakan vs_session) — hjúkrunarfræðingar
//     og annað starfsfólk samstarfsstofnana. Einföld innskráning eins og í
//     vaktakerfinu: lykilorð eða aðgangskóði, engin tveggja þrepa auðkenning.
//   * Starfsmaður Fjarlækninga (staff-taflan, Bearer-lykill úr Supabase Auth).
//   * Læknir í HSU-vaktakerfinu (hsu_doctors, kakan hsu_session). Hann er þegar
//     með aðgang og á ekki að þurfa annan.
//
// Sjálft kerfið tilheyrir Fjarlækningum, ekki vaktakerfinu.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDoctorSession } from "@/lib/hsu/auth";
import { getVsUser } from "@/lib/vinnustod/auth";

export interface SmsActor {
  /** Auðkenni í sinni töflu. */
  id: string;
  name: string;
  /** Hvaðan hann kom — ræður því í hvaða dálk sendingin er skráð. */
  kind: "vs" | "staff" | "hsu";
  /** Sér hann allar sendingar eða aðeins sínar eigin? */
  isAdmin: boolean;
  email?: string;
  workplace?: string;
  title?: string;
  hasPin?: boolean;
  mustChangePassword?: boolean;
}

function jwtAal(token: string): string | null {
  // Lesið án sannprófunar — en aðeins notað ef getUser staðfestir sama lykil.
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()).aal ?? null;
  } catch {
    return null;
  }
}

/** Hlutverk starfsmanna sem mega ekki nota vinnustöðina. */
const BLOCKED_STAFF_ROLES = new Set(["lawyer"]);

async function vsActor(): Promise<SmsActor | null> {
  const vs = await getVsUser();
  if (!vs) return null;
  return {
    id: vs.id, name: vs.name, kind: "vs", isAdmin: false, email: vs.email,
    workplace: vs.workplace, title: vs.title, hasPin: vs.has_pin, mustChangePassword: vs.must_change_password,
  };
}

/**
 * Starfsmaður Fjarlækninga sér sendingasögu allra (símanúmer sjúklinga), svo
 * lotan verður að hafa staðist tveggja þrepa auðkenningu — eins og stjórnborðið.
 */
export async function staffActor(req: Request): Promise<SmsActor | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || jwtAal(auth.slice(7)) !== "aal2") return null;
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (error || !data.user?.id) return null;
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id, name, email, role, roles, active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!staff?.active) return null;
  const roles: string[] = Array.isArray(staff.roles) && staff.roles.length ? staff.roles : [staff.role];
  if (roles.every((r) => BLOCKED_STAFF_ROLES.has(r))) return null;
  return {
    id: staff.id, name: staff.name || staff.email, kind: "staff",
    isAdmin: roles.includes("admin"), email: staff.email, workplace: "Fjarlækningar",
  };
}

async function hsuActor(): Promise<SmsActor | null> {
  // getDoctorSession skilar aðeins virkum lækni.
  const doctor = await getDoctorSession();
  if (!doctor) return null;
  return { id: doctor.id, name: doctor.name, kind: "hsu", isAdmin: doctor.role === "head", email: doctor.email, workplace: "HSU Vestmannaeyjum" };
}

/**
 * Leysir úr innskráningunni. Notandi vinnustöðvar gengur fyrir: sé hann
 * skráður inn í þessum vafra er það hann sem situr við tölvuna.
 */
export async function getSmsActor(req: Request): Promise<SmsActor | null> {
  // Sé vafrinn skráður inn sem fleiri en einn má velja hver er við tölvuna
  // (kakan vs_as eða ?as=), t.d. stjórnandi sem er líka læknir í vaktakerfinu.
  // Aðeins er valið á milli innskráninga sem þegar eru í gildi.
  const wanted = preferredKind(req);
  if (wanted) {
    const pick = wanted === "vs" ? await vsActor() : wanted === "staff" ? await staffActor(req) : await hsuActor();
    if (pick) return pick;
  }
  return (await vsActor()) ?? (await staffActor(req)) ?? (await hsuActor());
}

export const AS_COOKIE = "vs_as";

function preferredKind(req: Request): SmsActor["kind"] | null {
  const fromQuery = new URL(req.url).searchParams.get("as");
  const fromCookie = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${AS_COOKIE}=`))?.slice(AS_COOKIE.length + 1);
  const v = fromQuery ?? fromCookie ?? null;
  return v === "vs" || v === "staff" || v === "hsu" ? v : null;
}

/**
 * Allar innskráningar í þessum vafra — t.d. stjórnandi sem er líka læknir í
 * vaktakerfinu. Notað fyrir tilkynningar í tæki, svo skilaboð til hvers þeirra
 * berist tækinu.
 */
export async function getSmsActors(req: Request): Promise<SmsActor[]> {
  const all = await Promise.all([vsActor(), staffActor(req), hsuActor()]);
  return all.filter((a): a is SmsActor => Boolean(a));
}

/** Dálkurinn í sms_messages sem heldur utan um sendandann. */
export function senderColumn(kind: SmsActor["kind"]): "sent_by_gatt" | "sent_by_staff" | "sent_by_hsu" {
  return kind === "vs" ? "sent_by_gatt" : kind === "staff" ? "sent_by_staff" : "sent_by_hsu";
}
