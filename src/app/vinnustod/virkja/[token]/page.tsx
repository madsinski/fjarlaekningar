import ActivateClient from "./ActivateClient";

export const metadata = { title: "Virkja aðgang" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ActivateClient token={token} />;
}
