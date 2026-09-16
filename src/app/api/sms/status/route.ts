// Twilio segir frá afdrifum skeytis: sent → delivered, eða undelivered.
//
// ÞETTA ER MIKILVÆGASTI HLUTINN Í ÍSLANDI. Skeyti sem símafyrirtækið síar
// kemur EKKI til baka sem villa við sendingu — sendingin heppnast, og svo
// berst hingað `undelivered` með villu 30007. Án þessarar slóðar heldur
// starfsmaðurinn að skeytið hafi komist til skila.
//
// Slóðin er opin (Twilio hringir í hana), svo undirskrift hverrar beiðni er
// sannreynd með X-Twilio-Signature.

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { originOf } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

/**
 * Undirskrift Twilio: HMAC-SHA1 af slóðinni með öllum formreitum í
 * stafrófsröð skeyttum aftan við, base64-kóðað.
 */
function validSignature(url: string, params: Record<string, string>, signature: string): boolean {
  if (!AUTH_TOKEN) return false;
  const data = Object.keys(params).sort().reduce((s, k) => s + k + params[k], url);
  const mine = createHmac("sha1", AUTH_TOKEN).update(Buffer.from(data, "utf8")).digest("base64");
  const a = Buffer.from(mine);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new NextResponse("Bad request", { status: 400 });
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!AUTH_TOKEN) {
    // Án leyndarmálsins er ekki hægt að sanna hver hringdi — þá er ekkert skrifað.
    console.warn("[sms] TWILIO_AUTH_TOKEN vantar — staða skeytis ekki vistuð");
    return new NextResponse("", { status: 204 });
  }
  // Twilio undirritar nákvæmlega þá slóð sem var skráð í StatusCallback — og
  // hún var mynduð með originOf í /api/sms/send. Sama fall hér, sama slóð.
  const publicUrl = `${originOf(req)}${new URL(req.url).pathname}`;
  if (!validSignature(publicUrl, params, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sid = params.MessageSid || params.SmsSid;
  const status = params.MessageStatus || params.SmsStatus;
  if (!sid || !status) return new NextResponse("", { status: 204 });

  const code = params.ErrorCode ? Number(params.ErrorCode) : null;
  await supabaseAdmin
    .from("sms_messages")
    .update({
      status,
      error_code: code,
      error_text: code === 30007 ? "Síað af símafyrirtæki — vefslóð líklega ekki á hvítlista" : params.ErrorMessage ?? "",
      delivered_at: status === "delivered" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_sid", sid);

  return new NextResponse("", { status: 204 });
}
