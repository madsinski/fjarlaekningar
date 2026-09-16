import { redirect } from "next/navigation";

// SMS-gáttin er orðin hluti af vinnustöðinni.
export default function SmsRedirect() {
  redirect("/vinnustod?t=sms");
}
