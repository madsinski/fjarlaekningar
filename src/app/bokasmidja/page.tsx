import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CHILD_COLUMNS, deviceTrusted, getViewer, parentCodeConfigured, toChild } from "@/lib/bokasmidja/auth";
import Gate from "./_components/Gate";

// Inngangurinn. Nöfn barnanna sjást aðeins á tæki sem fullorðinn hefur opnað.
export default async function BokasmidjaGate() {
  const viewer = await getViewer();
  if (viewer) redirect(viewer.role === "parent" ? "/bokasmidja/parent" : "/bokasmidja/books");

  const trusted = await deviceTrusted();
  const { data } = trusted
    ? await supabaseAdmin.from("bk_children").select(CHILD_COLUMNS).order("created_at")
    : { data: [] };
  return <Gate trusted={trusted} configured={parentCodeConfigured()} kids={(data || []).map(toChild)} />;
}
