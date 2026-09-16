// Hver má senda SMS á sjúkling — og hvaðan hann er skráður inn.
//
// TVENNS KONAR INNSKRÁNING liggur að sama verkfærinu:
//   * Starfsmaður Fjarlækninga (staff-taflan, Bearer-lykill úr Supabase Auth).
//     Hjúkrunarfræðingar á heilsugæslunni fá boð hingað inn, líka með
//     @hsu.is netfangi, og fá hlutverkið `nurse`.
//   * Læknir í HSU-vaktakerfinu (hsu_doctors, kexlota á sama léni). Hann er
//     þegar með aðgang og á ekki að þurfa annan.
//
// Sjálft kerfið tilheyrir Fjarlækningum, ekki vaktakerfinu: sniðmátin,
// sendingasagan og Twilio-aðgangurinn eru hér.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDoctorSession } from "@/lib/hsu/auth";

export interface SmsActor {
  /** Auðkenni í sinni töflu. */
  id: string;
  name: string;
  /** Hvaðan hann kom — ræður því í hvorn dálkinn sendingin er skráð. */
  kind: "staff" | "hsu";
  /** Sér hann allar sendingar eða aðeins sínar eigin? */
  isAdmin: boolean;
}

/** Hlutverk starfsmanna sem mega ekki senda. Lögfræðingur á ekkert erindi hér. */
const BLOCKED_STAFF_ROLES = new Set(["lawyer"]);

/**
 * Leysir úr innskráningunni. Skilar null sé enginn innskráður — eða sé
 * starfsmaðurinn óvirkur.
 */
export async function getSmsActor(req: Request): Promise<SmsActor | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
    if (!error && data.user?.id) {
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("id, name, email, role, roles, active")
        .eq("id", data.user.id)
        .maybeSingle();
      if (staff?.active) {
        const roles: string[] = Array.isArray(staff.roles) && staff.roles.length ? staff.roles : [staff.role];
        if (roles.every((r) => BLOCKED_STAFF_ROLES.has(r))) return null;
        return {
          id: staff.id,
          name: staff.name || staff.email,
          kind: "staff",
          isAdmin: roles.includes("admin"),
        };
      }
    }
  }

  // Engin starfsmannalota: er þetta læknir úr vaktakerfinu?
  // getDoctorSession skilar aðeins virkum lækni.
  const doctor = await getDoctorSession();
  if (doctor) {
    return { id: doctor.id, name: doctor.name, kind: "hsu", isAdmin: doctor.role === "head" };
  }
  return null;
}
