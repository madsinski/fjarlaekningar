// Breyta eigin lykilorði.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, SESSION_COOKIE, hashSecret, passwordProblem, sha256, verifySecret } from "@/lib/hsu/auth";
import { fail, json, originOf, readJson, requireDoctor } from "@/lib/hsu/server";
import { notifyDoctors } from "@/lib/hsu/notify";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const next = String(body.next ?? "");
  const problem = passwordProblem(next);
  if (problem) return fail(problem);

  const { data: d } = await supabaseAdmin.from("hsu_doctors").select("password_hash, must_change_password").eq("id", auth.doctor.id).single();
  if (!(await verifySecret(String(body.current ?? ""), d?.password_hash))) return fail("Núverandi lykilorð er rangt.", 401);
  if (await verifySecret(next, d?.password_hash)) return fail("Nýja lykilorðið má ekki vera það sama og það gamla.");

  await supabaseAdmin
    .from("hsu_doctors")
    .update({ password_hash: await hashSecret(next), must_change_password: false })
    .eq("id", auth.doctor.id);

  // Aðrar lotur og önnur traust tæki falla úr gildi; þetta tæki lifir. Sá sem
  // skiptir um lykilorð af ótta við að sími hafi glatast á ekki að þurfa að
  // vita að aðgangskóðinn þar virkaði annars áfram.
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  const device = jar.get(DEVICE_COOKIE)?.value ?? "";
  await supabaseAdmin.from("hsu_sessions").delete().eq("doctor_id", auth.doctor.id).neq("token_hash", sha256(token));
  await supabaseAdmin.from("hsu_devices").delete().eq("doctor_id", auth.doctor.id).neq("token_hash", sha256(device));
  notifyDoctors({
    origin: originOf(req), subject: "Lykilorði þínu var breytt", heading: "Lykilorði breytt",
    notices: [{ doctorId: auth.doctor.id, line: "Lykilorðinu að vaktakerfinu var breytt og önnur tæki skráð út. Ef þetta varst ekki þú skaltu strax velja nýtt lykilorð með „Gleymt lykilorð“ og láta yfirlækni vita." }],
    cta: { label: "Skrá inn", path: "/hsu" },
  });
  return json({ ok: true });
}
