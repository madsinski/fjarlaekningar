// Seed the Fjarlækningar-related decks from Lifeline into the Fjarlækningar
// deck studio (presentation_decks table). Uses the SAME buildTemplateData()
// the create API uses, so the decks are identical to "New presentation → …".
//
// Run: npx tsx scripts/seed-fjar-decks.ts   (reads .env.local)
// Idempotent: skips a deck whose slug already exists.

import { readFileSync } from "node:fs";
import { buildTemplateData } from "../src/lib/presentations/templates";

// Minimal .env.local loader.
try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// The two Lifeline decks that carry Fjarlækningar content (joint / shared).
const DECKS = [
  { templateId: "lifeline-fjarlaekningar", title: "Lifeline + Fjarlækningar", slug: "lifeline-fjarlaekningar" },
  { templateId: "investor", title: "Investor — Fjarlækningar + Lifeline", slug: "investor-fjarlaekningar-lifeline" },
];

async function main() {
  for (const d of DECKS) {
    const existing = await fetch(
      `${url}/rest/v1/presentation_decks?slug=eq.${encodeURIComponent(d.slug)}&select=id`,
      { headers },
    ).then((r) => r.json());
    if (Array.isArray(existing) && existing.length) {
      console.log(`→ skip (exists): ${d.slug}`);
      continue;
    }
    const data = buildTemplateData(d.templateId);
    const res = await fetch(`${url}/rest/v1/presentation_decks`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        slug: d.slug,
        title: d.title,
        template_version: d.templateId,
        data,
        is_published: false,
      }),
    });
    if (!res.ok) {
      console.error(`✗ ${d.slug}: ${res.status} ${await res.text()}`);
      continue;
    }
    const slides = (data as { slides?: unknown[] }).slides?.length ?? 0;
    console.log(`✓ created: ${d.title} (${slides} slides) → /admin/presentations`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
