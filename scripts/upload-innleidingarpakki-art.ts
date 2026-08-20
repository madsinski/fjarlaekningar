// Upload the printable artwork shown in the Innleiðingarpakki deck.
//
// The deck shows the real poster, verklagsblað and ísskápskort rather than
// describing them, so a station's contact person can see exactly what is coming
// up on their wall. The artwork itself lives in the collateral studio and is
// editable there; these are point-in-time renders of it.
//
// To refresh them: open /present/collateral, print each doc to PNG (or
// screenshot the unscaled print surface), drop the files in scripts/art/ under
// the names below, and run this. It writes the public URLs into
// scripts/innleidingarpakki-art.json, which the seed script reads.
//
// Run: npx tsx scripts/upload-innleidingarpakki-art.ts   (reads .env.local)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { DECK_SLUG } from "./seed-innleidingarpakki";

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
const auth = { apikey: key!, Authorization: `Bearer ${key}` };

const BUCKET = "presentation-assets";
const ART_DIR = new URL("./art/", import.meta.url);

/** Local file → key in the manifest the deck reads. */
const FILES: { file: string; key: "poster" | "sheet" | "fridge" }[] = [
  { file: "veggspjald.png", key: "poster" },
  { file: "verklagsblad.png", key: "sheet" },
  { file: "isskapskort.png", key: "fridge" },
];

async function main() {
  const [deck] = (await fetch(
    `${url}/rest/v1/presentation_decks?slug=eq.${DECK_SLUG}&select=id`,
    { headers: auth },
  ).then((r) => r.json())) as { id: string }[];
  if (!deck) {
    console.error(`✗ Deck "${DECK_SLUG}" not found — run seed-innleidingarpakki.ts first.`);
    process.exit(1);
  }

  const manifest: Record<string, string> = {};
  for (const { file, key: k } of FILES) {
    const local = new URL(file, ART_DIR);
    if (!existsSync(local)) {
      console.error(`✗ missing ${file} — put the render in scripts/art/`);
      process.exit(1);
    }
    const path = `${deck.id}/${file}`;
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "image/png", "x-upsert": "true" },
      body: new Uint8Array(readFileSync(local)),
    });
    if (!res.ok) {
      console.error(`✗ ${file}: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    manifest[k] = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
    console.log(`✓ ${file} → ${manifest[k]}`);
  }

  const out = new URL("./innleidingarpakki-art.json", import.meta.url);
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✓ wrote scripts/innleidingarpakki-art.json — re-run seed-innleidingarpakki.ts to apply.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
