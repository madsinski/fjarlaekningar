import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/bokasmidja/auth";
import { UUID_RE, canEdit, loadBooks, loadStory } from "@/lib/bokasmidja/server";
import StoryRoom from "../../_components/StoryRoom";

// Ein saga: smíðin (ef hún er ekki tilbúin) og lesarinn.
export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/bokasmidja");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const story = await loadStory(id);
  if (!story) notFound();
  const [book] = await loadBooks({ bookId: story.bookId });
  if (!book) notFound();
  return (
    <StoryRoom
      initial={story}
      editable={canEdit(viewer, story.createdBy)}
      book={{ id: book.id, title: book.title, subtitle: book.subtitle, color: book.color, emoji: book.emoji, collection: true }}
    />
  );
}
