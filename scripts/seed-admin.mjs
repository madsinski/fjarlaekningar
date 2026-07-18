// One-time bootstrap: create the FIRST admin (mads@fjarlaekningar.is).
//
// There's a chicken-and-egg problem: /api/admin/staff/create requires an
// existing admin caller, but there is none yet. This script uses the
// service-role key directly to (1) send an invite email so the admin sets
// their own password, and (2) insert the matching staff row (role=admin).
//
// Usage (after schema.sql has been run in the Supabase project):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   NEXT_PUBLIC_SITE_URL=https://www.fjarlaekningar.is \
//   SEED_ADMIN_EMAIL=mads@fjarlaekningar.is SEED_ADMIN_NAME="Mads Christian Aanesen" \
//   node scripts/seed-admin.mjs
//
// It reads .env.local automatically if present. Idempotent: re-running reuses
// the existing auth user and upserts the staff row.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function findUser() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data?.users?.find((u) => (u.email || "").toLowerCase() === email) || null;
}

async function main() {
  let user = await findUser();

  if (!user) {
    console.log(`→ Inviting ${email} …`);
    const res = await fetch(
      `${url}/auth/v1/invite?redirect_to=${encodeURIComponent(`${origin}/admin/login`)}`,
      { method: "POST", headers, body: JSON.stringify({ email, data: { name, role: "admin" } }) },
    );
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.id) {
      console.error(`✗ Invite failed: ${j?.msg || j?.error || `HTTP ${res.status}`}`);
      process.exit(1);
    }
    user = { id: j.id, email };
    console.log(`✓ Invite sent — ${email} will get an email to set a password.`);
  } else {
    console.log(`→ Auth user already exists (${user.id}); upserting staff row.`);
  }

  const { error } = await admin.from("staff").upsert(
    { id: user.id, name, email, role: "admin", active: true, invited: true },
    { onConflict: "id" },
  );
  if (error) {
    console.error(`✗ Could not upsert staff row: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Admin staff row ready for ${email} (role=admin).`);
  console.log("  Next: accept the invite email, set a password, then enroll MFA at /admin.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
