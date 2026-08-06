// A staff member type-signs one of their own pending contracts. Verifies the
// text hash is unchanged, generates an audited PDF, stores it in the private
// staff-documents bucket, marks the contract signed, and files a staff_documents
// row so the signed copy appears in Mín skjöl + the team view.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";
import { buildContractPdf } from "@/lib/contract-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const name = String(body.signatory_name || "").trim();
  const kennitala = String(body.signatory_kennitala || "").trim();
  if (body.agree !== true || !name) {
    return NextResponse.json({ ok: false, error: "Nafn og samþykki vantar" }, { status: 400 });
  }

  const { data: c } = await supabaseAdmin.from("staff_contracts").select("*").eq("id", id).maybeSingle();
  if (!c || c.staff_id !== caller.id) return NextResponse.json({ ok: false, error: "Samningurinn tilheyrir þér ekki" }, { status: 403 });
  if (c.status !== "sent") return NextResponse.json({ ok: false, error: "Samningurinn er ekki lengur til undirritunar" }, { status: 409 });

  // Integrity: the text must not have changed since it was sent.
  if (createHash("sha256").update(c.body).digest("hex") !== c.terms_hash) {
    return NextResponse.json({ ok: false, error: "Samningstexta hefur verið breytt — hafðu samband við stjórnanda" }, { status: 409 });
  }

  const signedAtISO = new Date().toISOString();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const ua = (req.headers.get("user-agent") || "").slice(0, 200);

  const pdf = await buildContractPdf({
    title: c.title,
    body: c.body,
    version: c.version,
    signatoryName: name,
    signatoryKennitala: kennitala || undefined,
    signedAtISO,
    ip,
    userAgent: ua,
    termsHash: c.terms_hash,
  });
  const pdfSha = createHash("sha256").update(Buffer.from(pdf)).digest("hex");
  const path = `${caller.id}/contract-${c.id}.pdf`;

  const { error: upErr } = await supabaseAdmin.storage
    .from("staff-documents")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  await supabaseAdmin
    .from("staff_contracts")
    .update({
      status: "signed",
      signatory_name: name,
      signatory_kennitala: kennitala || null,
      signatory_ip: ip,
      signatory_user_agent: ua,
      signed_at: signedAtISO,
      pdf_storage_path: path,
      pdf_sha256: pdfSha,
    })
    .eq("id", c.id);

  // File the signed copy as a staff document (dedupe on the same storage path).
  await supabaseAdmin.from("staff_documents").delete().eq("storage_path", path);
  await supabaseAdmin.from("staff_documents").insert({
    staff_id: caller.id,
    kind: "employment_contract",
    title: c.title,
    filename: `${c.title}.pdf`,
    storage_path: path,
    content_type: "application/pdf",
    size_bytes: pdf.byteLength,
    signer_name: name,
    signed_at: signedAtISO.slice(0, 10),
    note: "Undirritað rafrænt",
    uploaded_by: caller.id,
  });

  return NextResponse.json({ ok: true });
}
