// One-time bootstrap: create the FIRST admin (mads@fjarlaekningar.is).
//
// There's a chicken-and-egg problem: /api/admin/staff/create requires an
// existing admin caller, but there is none yet. This script uses the
// service-role key directly to (1) send an invite email so the admin sets
// their own password, and (2) insert the matching staff row (role=admin).
//
// Uses plain fetch against Supabase's GoTrue + PostgREST APIs (no
// @supabase/supabase-js) so it runs on Node 20 without the realtime client's
// native-WebSocket requirement.
//
// Usage (after schema.sql has been run in the Supabase project):
//   node scripts/seed-admin.mjs
// It reads .env.local automatically. Idempotent: re-running reuses the
// existing auth user and upserts the staff row.

import { readFileSync } from "node:fs";

// Minimal .env.local loader (no dotenv dependency).
try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on real env */
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fjarlaekningar.is";
const email = (process.env.SEED_ADMIN_EMAIL || "mads@fjarlaekningar.is").toLowerCase();
const name = process.env.SEED_ADMIN_NAME || "Mads Christian Aanesen";

if (!url || !serviceKey) {
  console.error("✗ Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const authHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function findUser() {
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, { headers: authHeaders });
  const j = await res.json().catch(() => ({}));
  const users = Array.isArray(j) ? j : j?.users || [];
  return users.find((u) => (u.email || "").toLowerCase() === email) || null;
}

async function main() {
  let user = await findUser();

  if (!user) {
    console.log(`→ Inviting ${email} …`);
    const res = await fetch(
      `${url}/auth/v1/invite?redirect_to=${encodeURIComponent(`${origin}/admin/login`)}`,
      { method: "POST", headers: authHeaders, body: JSON.stringify({ email, data: { name, role: "admin" } }) },
    );
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.id) {
      console.error(`✗ Invite failed: ${j?.msg || j?.error || j?.message || `HTTP ${res.status}`}`);
      process.exit(1);
    }
    user = { id: j.id, email };
    console.log(`✓ Invite sent — ${email} will get an email to set a password.`);
  } else {
    console.log(`→ Auth user already exists (${user.id}); upserting staff row.`);
  }

  // Upsert the staff row (PostgREST: merge on the id primary key).
  const res = await fetch(`${url}/rest/v1/staff?on_conflict=id`, {
    method: "POST",
    headers: {
      ...authHeaders,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ id: user.id, name, email, role: "admin", active: true, invited: true }]),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ Could not upsert staff row: ${body?.message || body?.hint || `HTTP ${res.status}`}`);
    console.error(JSON.stringify(body));
    process.exit(1);
  }

  console.log(`✓ Admin staff row ready for ${email} (role=admin).`);
  console.log("  Next: accept the invite email, set a password, then enroll MFA at /admin.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
