import { redirect } from "next/navigation";
import { getViewer } from "@/lib/bokasmidja/auth";
import { UUID_RE, loadBooks } from "@/lib/bokasmidja/server";
import IdeaMaker from "../_components/IdeaMaker";

// Ný saga: barnið segir frá hugmyndinni eða svarar spurningum skref fyrir skref.
//   /bokasmidja/new            → ný bók
//   /bokasmidja/new?book=<id>  → næsta saga í þeirri bók
export default async function NewPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  if (!(await getViewer())) redirect("/bokasmidja");
  const { book: bookId } = await searchParams;
  const [book] = bookId && UUID_RE.test(bookId) ? await loadBooks({ bookId }) : [];
  return <IdeaMaker book={book ? { id: book.id, title: book.title } : null} />;
}
