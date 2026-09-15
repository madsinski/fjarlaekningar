import ActivateClient from "./ActivateClient";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Virkja aðgang — Vaktakerfi HSU" } };

export default async function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ActivateClient token={token} />;
}
