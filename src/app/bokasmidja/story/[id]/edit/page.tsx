import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/bokasmidja/auth";
import { UUID_RE, canEdit, loadStory } from "@/lib/bokasmidja/server";
import Editor from "../../../_components/Editor";

// Ritillinn: texti á öllum málum, myndir, teikningar barnsins og röð síðna.
export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/bokasmidja");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const story = await loadStory(id);
  if (!story) notFound();
  // Aðeins sá sem bjó söguna til (eða foreldri) má breyta; óskrifuð saga hefur ekkert að breyta.
  if (!canEdit(viewer, story.createdBy) || story.status === "idea") redirect(`/bokasmidja/story/${id}`);
  return <Editor initial={story} />;
}
