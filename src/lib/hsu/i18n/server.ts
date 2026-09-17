// Tungumál á þjóni: síður (kaka), API-svör (kaka í beiðni) og tölvupóstar
// (tungumál læknisins, hsu_doctors.lang).

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_LANG, LANG_COOKIE, isLang, translator, type Catalog, type Lang, type Messages } from "./core";

/** Tungumál síðunnar sem verið er að teikna. */
export async function getHsuLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

/** Tungumál beiðni (kaka), fyrir villuboð í API-svörum. */
export function langOf(req: Request): Lang {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`));
  const v = m?.[1];
  return isLang(v) ? v : DEFAULT_LANG;
}

/** Þýðandi fyrir API-leið: const t = tr(req, apiMessages). */
export function tr<T extends Messages>(req: Request, catalog: Catalog<T>) {
  return translator(catalog, langOf(req));
}

/** Tungumál lækna (fyrir tölvupósta og tilkynningar). */
export async function doctorLangs(ids: string[]): Promise<Map<string, Lang>> {
  const out = new Map<string, Lang>();
  if (!ids.length) return out;
  const { data } = await supabaseAdmin.from("hsu_doctors").select("id, lang").in("id", ids);
  for (const r of data ?? []) out.set(r.id as string, isLang(r.lang) ? r.lang : DEFAULT_LANG);
  return out;
}

export async function doctorLang(id: string): Promise<Lang> {
  return (await doctorLangs([id])).get(id) ?? DEFAULT_LANG;
}
