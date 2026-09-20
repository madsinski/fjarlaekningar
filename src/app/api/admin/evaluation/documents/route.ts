// Evaluation documents — the paperwork a module needs before its numbers mean
// anything: the agreed code set, the ethics ruling, the data-sharing
// agreement, the survey instrument.
//
// The bucket is private. These files can name a contact at the institution and
// carry a signature, so nothing is ever served publicly — downloads go through
// a short-lived signed URL issued here.
//
// POST   multipart — upload against a module and document slot.
// GET    ?path=    — issue a signed URL for one file.
// DELETE ?id=      — remove the row and the object.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { MODULE_BY_ID } from "@/lib/evaluation/modules";

export const runtime = "nodejs";

const BUCKET = "research-docs";
const MAX_BYTES = 20 * 1024 * 1024;

/** Office documents, PDFs, images and plain text. Deliberately narrow: this is
 *  a filing cabinet for agreements, not general storage. */
const ALLOWED = new Set([
  "application/pdf", "image/png", "image/jpeg", "text/plain", "text/csv", "text/markdown",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const moduleId = String(form?.get("module_id") ?? "");
  const docId = String(form?.get("doc_id") ?? "");
  const note = String(form?.get("note") ?? "").slice(0, 500);

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });

  // The slot has to exist in the catalogue — otherwise a typo silently files a
  // signed agreement somewhere nobody will look for it again.
  const mod = MODULE_BY_ID.get(moduleId);
  if (!mod || !mod.documents.some((d) => d.id === docId)) {
    return NextResponse.json({ ok: false, error: "Unknown module or document slot" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "File larger than 20 MB" }, { status: 400 });
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, error: `Type not accepted: ${file.type}` }, { status: 400 });
  }

  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "document";
  const path = `${moduleId}/${docId}/${Date.now()}-${safe}`;

  const up = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream", upsert: false });
  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  const { data, error } = await supabaseAdmin
    .from("evaluation_documents")
    .insert({
      module_id: moduleId, doc_id: docId, filename: file.name.slice(0, 200), path,
      size_bytes: file.size, mime: file.type || "", note,
      uploaded_by: caller!.id, uploaded_by_name: caller!.name,
    })
    .select()
    .single();

  if (error) {
    // Do not leave an orphan object behind if the row failed to write.
    await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, document: data });
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Sign-in required" }, { status: 401 });

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return NextResponse.json({ ok: false, error: "Path required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
  return NextResponse.json({ ok: true, url: data.signedUrl });
}

export async function DELETE(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Id required" }, { status: 400 });

  const { data: row } = await supabaseAdmin.from("evaluation_documents").select("path").eq("id", id).maybeSingle();
  if (row?.path) await supabaseAdmin.storage.from(BUCKET).remove([row.path]);
  const { error } = await supabaseAdmin.from("evaluation_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
