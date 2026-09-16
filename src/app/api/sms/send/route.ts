// Senda sjúklingi hlekk á þjónustuna, og lesa sendingasöguna.
//
// Opið bæði starfsfólki Fjarlækninga (Bearer) og læknum í HSU-vaktakerfinu
// (kexlota) — sjá sms-actor.ts. Hver sending er skráð: símanúmer er
// persónuupplýsing og verður að vera rekjanleg til þess sem sendi.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { SMS_SENDER, prettyPhone, sendSms, smsSegments, toE164 } from "@/lib/sms";
import { SMS_TEMPLATES, renderTemplate } from "@/lib/sms-templates";

export const runtime = "nodejs";

const deny = () => NextResponse.json({ ok: false, error: "Ekki heimild" }, { status: 403 });

export async function GET(req: Request) {
  const actor = await getSmsActor(req);
  if (!actor) return deny();

  // Stjórnandi (og yfirlæknir) sjá allar sendingar; aðrir sínar eigin.
  let q = supabaseAdmin
    .from("sms_messages")
    .select("id, created_at, sent_by_name, to_number, body, template, segments, status, error_code, error_text, delivered_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!actor.isAdmin) {
    q = actor.kind === "staff" ? q.eq("sent_by_staff", actor.id) : q.eq("sent_by_hsu", actor.id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    messages: data ?? [],
    templates: SMS_TEMPLATES,
    sender: SMS_SENDER,
    me: { name: actor.name, kind: actor.kind, isAdmin: actor.isAdmin },
  });
}

export async function POST(req: Request) {
  const actor = await getSmsActor(req);
  if (!actor) return deny();

  const body = (await req.json().catch(() => ({}))) as { to?: string; template?: string; name?: string };
  const to = toE164(String(body.to ?? ""));
  if (!to) return NextResponse.json({ ok: false, error: "Ógilt símanúmer. Sláðu inn 7 tölustafi, t.d. 555 1234." }, { status: 400 });

  const tpl = SMS_TEMPLATES.find((t) => t.key === body.template) ?? SMS_TEMPLATES[0];
  const text = renderTemplate(tpl, { name: String(body.name ?? "").trim() });
  const size = smsSegments(text);

  const origin = new URL(req.url).origin;
  const result = await sendSms({ to, body: text, statusCallback: `${origin}/api/sms/status` });

  const { data: row } = await supabaseAdmin
    .from("sms_messages")
    .insert({
      sent_by_staff: actor.kind === "staff" ? actor.id : null,
      sent_by_hsu: actor.kind === "hsu" ? actor.id : null,
      sent_by_name: actor.name,
      to_number: to,
      sender_id: SMS_SENDER,
      body: text,
      template: tpl.key,
      segments: size.segments,
      encoding: size.encoding,
      provider_sid: result.sid ?? "",
      status: result.status ?? (result.ok ? "queued" : "failed"),
      error_code: result.code ?? null,
      error_text: result.ok ? "" : result.error ?? "",
    })
    .select("id, created_at, to_number, body, status, segments")
    .single();

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, code: result.code, id: row?.id }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    message: row,
    dryRun: result.dryRun ?? false,
    pretty: prettyPhone(to),
    size,
  });
}
