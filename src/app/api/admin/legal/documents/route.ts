// Create a new legal document (admin only). Inserts the document as draft v1
// plus its first version-history snapshot.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const CATEGORIES = ["privacy", "terms", "consent", "general"];
const LANGS = ["is", "en"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const category = String(body.category || "general");
  const language = String(body.language || "is");
  const docBody = String(body.body || "");
  let slug = String(body.slug || "").trim();
  if (!slug) slug = slugify(title);

  if (!title) return NextResponse.json({ ok: false, error: "Titill vantar" }, { status: 400 });
  if (!slug) return NextResponse.json({ ok: false, error: "Slóð (slug) vantar" }, { status: 400 });
  if (!CATEGORIES.includes(category)) return NextResponse.json({ ok: false, error: "Invalid category" }, { status: 400 });
  if (!LANGS.includes(language)) return NextResponse.json({ ok: false, error: "Invalid language" }, { status: 400 });

  const { data: doc, error: insErr } = await supabaseAdmin
    .from("legal_documents")
    .insert({
      slug,
      title,
      category,
      language,
      body: docBody,
      version: 1,
      status: "draft",
      updated_by: caller!.id,
    })
    .select()
    .single();

  if (insErr || !doc) {
    const dup = insErr?.code === "23505";
    return NextResponse.json(
      { ok: false, error: dup ? "Slóð (slug) er þegar í notkun" : insErr?.message || "Villa" },
      { status: dup ? 409 : 500 },
    );
  }

  await supabaseAdmin.from("legal_document_versions").insert({
    document_id: doc.id,
    version: 1,
    title,
    body: docBody,
    status: "draft",
    text_hash: createHash("sha256").update(docBody).digest("hex"),
    edited_by: caller!.id,
    edited_by_name: caller!.name,
  });

  return NextResponse.json({ ok: true, document: doc });
}
