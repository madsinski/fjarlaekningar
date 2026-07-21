import { getPage } from "@/lib/site-content/server";
import HomeView from "./HomeView";

// Rendered per request: picks up the `lang` cookie + the latest PUBLISHED
// content. Draft content never touches the public page (it's only read by the
// admin API). If the site_content table/row is missing, the resolver falls back
// to the Icelandic defaults, so the page looks exactly like before the CMS.
//
// This used to hand-roll its own Supabase query and locale cookie read, from
// before the shared registry existed. It now goes through the same getPage()
// as every other page, which is also where the section order comes from.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { c, order } = await getPage("home");
  return <HomeView c={c} order={order} />;
}
