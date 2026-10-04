import { redirect } from "next/navigation";
import { getViewer } from "@/lib/bokasmidja/auth";
import { loadBooks } from "@/lib/bokasmidja/server";
import Shelf from "../_components/Shelf";

// Bókahillan: allar bækur fjölskyldunnar og stóri takkinn „Búa til nýja bók“.
export default async function BooksPage() {
  if (!(await getViewer())) redirect("/bokasmidja");
  return <Shelf books={await loadBooks()} />;
}
