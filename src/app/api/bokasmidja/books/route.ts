// Ný bók. Nafnið má gefa strax eða sleppa því: nafnlaus bók tekur nafn fyrstu
// sögunnar þar til einhver nefnir hana sjálfur.
//   POST /api/bokasmidja/books  { lang, title? }

import { supabaseAdmin } from "@/lib/supabase-admin";
import { throttle } from "@/lib/bokasmidja/auth";
import { cleanLine, fail, json, readJson, requireViewer, viewerId } from "@/lib/bokasmidja/server";
import { COLORS, isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

const BOOK_EMOJI = ["📕", "📗", "📘", "📙", "📔", "📒"];

export async function POST(req: Request) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { viewer } = auth;
  if (!(await throttle(`book:${viewerId(viewer) ?? "parent"}`, viewer.role === "parent" ? 40 : 10, 86400))) return fail("daily_limit", 429);

  const body = await readJson(req);
  if (!isLang(body.lang)) return fail("bad_request");
  const title = cleanLine(body.title, 80);
  const { count } = await supabaseAdmin.from("bk_books").select("id", { count: "exact", head: true });
  const n = count ?? 0;
  const { data: book, error } = await supabaseAdmin.from("bk_books").insert({
    title: title ? { [body.lang]: title } : {},
    title_auto: !title,
    color: COLORS[n % COLORS.length],
    emoji: BOOK_EMOJI[n % BOOK_EMOJI.length],
    planned_stories: 1,
    created_by: viewerId(viewer),
  }).select("id").single();
  if (error || !book) return fail("failed", 500);
  return json({ ok: true, bookId: book.id });
}
