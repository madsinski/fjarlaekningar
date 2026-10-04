import { redirect } from "next/navigation";
import { getViewer } from "@/lib/bokasmidja/auth";
import { UUID_RE, loadBooks } from "@/lib/bokasmidja/server";
import IdeaMaker from "../_components/IdeaMaker";
import NewBook from "../_components/NewBook";

// Ný bók eða ný saga.
//   /bokasmidja/new            → búa til bók (nafn strax eða seinna), svo fyrstu söguna
//   /bokasmidja/new?book=<id>  → ný saga í þeirri bók
export default async function NewPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  if (!(await getViewer())) redirect("/bokasmidja");
  const { book: bookId } = await searchParams;
  const [book] = bookId && UUID_RE.test(bookId) ? await loadBooks({ bookId }) : [];
  return book ? <IdeaMaker book={{ id: book.id, title: book.title }} /> : <NewBook />;
}
