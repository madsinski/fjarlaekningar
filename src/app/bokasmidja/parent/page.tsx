import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { agentsConfigured } from "@/lib/bokasmidja/agents";
import { CHILD_COLUMNS, getViewer, toChild } from "@/lib/bokasmidja/auth";
import { loadBooks } from "@/lib/bokasmidja/server";
import ParentPanel from "../_components/ParentPanel";

// Svæði fullorðinna: börnin og kóðarnir þeirra, uppsetning og tiltekt í hillunni.
export default async function ParentPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "parent") redirect(viewer ? "/bokasmidja/books" : "/bokasmidja");
  const [{ data }, books] = await Promise.all([
    supabaseAdmin.from("bk_children").select(CHILD_COLUMNS).order("created_at"),
    loadBooks(),
  ]);
  return (
    <ParentPanel
      kids={(data || []).map(toChild)}
      books={books}
      setup={{ writer: agentsConfigured(), voice: !!process.env.OPENAI_API_KEY }}
    />
  );
}
