// Hver er við (server-only): allir sem nota vinnustöðina, flokkaðir eftir starfsstöð, með stöðu.
//
//   online  — síðan opin (merki < 90 sek.), flipinn sýnilegur og notaður síðustu 5 mín.
//   idle    — innskráð(ur) en ekki virk(ur): síðan í bakgrunni, ónotuð eða lokuð
//             á meðan innskráningin er enn í gildi
//   offline — útskráð(ur)
//   pending — hefur ekki virkjað aðganginn (aðeins notendur vinnustöðvar)
//
// Starfsfólk Fjarlækninga skráir sig inn um Supabase og lotan er ekki geymd hjá
// okkur; það telst innskráð meðan vinnustöðin hefur verið opin síðustu 12 klst.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { listRecipients } from "./threads";

const ONLINE_SEEN_MS = 90_000;
const ONLINE_ACTIVE_MS = 5 * 60_000;
const STAFF_SESSION_MS = 12 * 3600_000;

export async function presenceSnapshot() {
  const nowIso = new Date().toISOString();
  const [people, { data: presence }, { data: vsSessions }, { data: hsuSessions }, { data: vsUsers }] = await Promise.all([
    listRecipients({ includeAdmins: true }),
    supabaseAdmin.from("gatt_presence").select("owner_kind, owner_id, last_seen_at, last_active_at, active"),
    supabaseAdmin.from("gatt_sessions").select("user_id, last_seen_at").gt("expires_at", nowIso),
    supabaseAdmin.from("hsu_sessions").select("doctor_id, last_seen_at").gt("expires_at", nowIso),
    supabaseAdmin.from("gatt_users").select("id, password_hash, last_login_at").eq("active", true),
  ]);
  const pres = new Map((presence ?? []).map((p) => [`${p.owner_kind}:${p.owner_id}`, p]));
  const vsLogged = new Map<string, string>();
  for (const s of vsSessions ?? []) vsLogged.set(s.user_id, s.last_seen_at);
  const hsuLogged = new Map<string, string>();
  for (const s of hsuSessions ?? []) hsuLogged.set(s.doctor_id, s.last_seen_at);
  const vsInfo = new Map((vsUsers ?? []).map((u) => [u.id as string, u]));
  const now = Date.now();
  const ago = (iso?: string | null) => (iso ? now - new Date(iso).getTime() : Infinity);

  const rows = people.map((p) => {
    const pr = pres.get(`${p.kind}:${p.id}`);
    const pageOpen = ago(pr?.last_seen_at) < ONLINE_SEEN_MS;
    const loggedIn = p.kind === "vs" ? vsLogged.has(p.id)
      : p.kind === "hsu" ? hsuLogged.has(p.id)
      : ago(pr?.last_seen_at) < STAFF_SESSION_MS;
    let status: "online" | "idle" | "offline" | "pending" =
      pageOpen && pr?.active && ago(pr?.last_active_at) < ONLINE_ACTIVE_MS ? "online"
      : loggedIn || pageOpen ? "idle"
      : "offline";
    const info = p.kind === "vs" ? vsInfo.get(p.id) : null;
    if (p.kind === "vs" && info && !info.password_hash) status = "pending";
    const lastActive = [pr?.last_active_at, p.kind === "vs" ? info?.last_login_at : null].filter(Boolean).sort().pop() ?? null;
    return {
      kind: p.kind, id: p.id, name: p.name, email: p.email, title: p.title, isAdmin: Boolean(p.isAdmin),
      workplace: p.workplace || "Án starfsstöðvar",
      status, pageOpen, lastActive,
    };
  });
  return { people: rows, at: nowIso };
}
