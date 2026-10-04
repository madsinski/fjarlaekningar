import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/bokasmidja/auth";
import { UUID_RE, loadBooks } from "@/lib/bokasmidja/server";
import BookRoom from "../../_components/BookRoom";

// Ein bók: sögurnar hennar, auð sæti og næsta skref.
export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getViewer())) redirect("/bokasmidja");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [[book], all] = await Promise.all([loadBooks({ bookId: id, covers: true }), loadBooks()]);
  if (!book) notFound();
  return <BookRoom book={book} others={all.filter((b) => b.id !== id).map((b) => ({ id: b.id, title: b.title, emoji: b.emoji, color: b.color }))} />;
}
