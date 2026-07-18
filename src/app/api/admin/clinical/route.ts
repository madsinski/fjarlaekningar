// Create a clinical protocol (active staff). Seeds version 1 + the first
// immutable change-log record.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

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
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const summary = String(body.summary || "").trim();
  const slug = String(body.slug || "").trim() || slugify(title);
  if (!title) return NextResponse.json({ ok: false, error: "Titill vantar" }, { status: 400 });
  if (!slug) return NextResponse.json({ ok: false, error: "Slóð vantar" }, { status: 400 });

  const { data: protocol, error } = await supabaseAdmin
    .from("clinical_protocols")
    .insert({ slug, title, summary, version: 1, status: "draft", updated_by: caller.id })
    .select()
    .single();
  if (error || !protocol) {
    const dup = error?.code === "23505";
    return NextResponse.json(
      { ok: false, error: dup ? "Reiknirit fyrir þetta erindi er þegar til" : error?.message || "Villa" },
      { status: dup ? 409 : 500 },
    );
  }

  await supabaseAdmin.from("clinical_protocol_changes").insert({
    protocol_id: protocol.id,
    version: 1,
    change_type: "created",
    summary: "Reiknirit stofnað",
    algorithm_snapshot: "",
    title_snapshot: title,
    changed_by: caller.id,
    changed_by_name: caller.name,
  });

  return NextResponse.json({ ok: true, protocol });
}
