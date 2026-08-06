"use client";

import { useState } from "react";

// Compact newsletter opt-in for tight spots (e.g. a card on /hafa-samband).
// Same double opt-in flow as NewsletterSignup — posts to /api/subscribe, which
// emails a confirmation link; here we only collect the email. Strings come from
// the CMS (already locale-resolved) so this stays language-agnostic.
export default function NewsletterInline({
  buttonLabel = "Skrá mig",
  success = "Staðfestingarpóstur sendur — smelltu á hlekkinn til að ljúka skráningu.",
}: {
  buttonLabel?: string;
  success?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setErr(j.error || "Ekki tókst að skrá netfangið.");
        return;
      }
      setDone(true);
    } catch {
      setErr("Villa við tengingu. Reyndu aftur.");
    } finally {
      setBusy(false);
    }
  };

  if (done) return <p className="text-sm font-medium text-emerald-700">{success}</p>;

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Netfang"
        autoComplete="email"
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-cyan-200"
      />
      <button
        type="submit"
        disabled={busy || !email}
        className="w-full rounded-lg bg-[var(--primary-dark)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Skrái…" : buttonLabel}
      </button>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </form>
  );
}
