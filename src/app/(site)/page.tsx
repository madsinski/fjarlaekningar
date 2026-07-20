import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import HomeView from "./HomeView";
import { resolveHome, type Locale, type SiteContentBlob } from "@/lib/site-content/home";

// Rendered per request: picks up the `lang` cookie + the latest PUBLISHED
// content. Draft content never touches the public page (it's only read by the
// admin API). If the site_content table/row is missing, resolveHome falls back
// to the Icelandic defaults, so the page looks exactly like before the CMS.
export const dynamic = "force-dynamic";

async function getPublished(): Promise<SiteContentBlob | null> {
  try {
    const { data } = await supabaseAdmin
      .from("site_content")
      .select("published")
      .eq("page", "home")
      .maybeSingle();
    return (data?.published as SiteContentBlob) ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("lang")?.value === "en" ? "en" : "is";
  const published = await getPublished();
  const c = resolveHome(published, locale);
  return <HomeView c={c} />;
}
