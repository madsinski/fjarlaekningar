"use client";

import { useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { ui } from "@/lib/site-content/ui-strings";
import type { Locale } from "@/lib/site-content/types";

// Public newsletter opt-in.
//
// GDPR-shaped: the consent line states plainly what they're signing up for and
// there is no pre-ticked box — submitting the form IS the affirmative action.
// All copy is CMS-driven (home page, "Fréttabréf" group) with defaults here so
// the section renders correctly before anything is published.

export default function NewsletterSignup({
  heading,
  body,
  cta,
  success,
  consent,
  locale = "is",
}: {
  locale?: Locale;
  /** ReactNode so the caller can pass renderHighlighted() for ==word== support. */
  heading?: React.ReactNode;
  body?: string;
  cta?: string;
  success?: string;
  consent?: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const t = {
    heading: heading || "Fylgstu með því sem er að gerast",
    body:
      body ||
      "Fáðu fréttir af Fjarlækningum, nýju samstarfi við heilsugæslur og nýrri þjónustu þegar hún bætist við.",
    cta: cta || "Skrá mig",
    success: success || "Takk! Þú ert komin(n) á listann.",
    consent:
      consent ||
      "Með því að skrá þig samþykkir þú að fá tölvupóst frá Fjarlækningum ehf. um fréttir, nýtt samstarf og nýja þjónustu. Þú getur afskráð þig hvenær sem er.",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setErr(j.error || "Ekki tókst að skrá netfangið.");
        return;
      }
      setSent(true);
    } catch {
      setErr("Netvilla — reyndu aftur.");
    } finally {
      setBusy(false);
    }
  };

  return (
    // Sits directly below the primary CTA, so this is deliberately the quietest
    // block on the page: flat white card, no gradient, no glow, smaller heading.
    // It should be findable by someone who wants it, not compete for the click.
    <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary-dark)] mb-4">
          <Mail className="w-3.5 h-3.5" />
          {ui(locale).newsletter}
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t.heading}</h2>
        <p className="mt-2 text-slate-600">{t.body}</p>

        {sent ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {t.success}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nafn (valfrjálst)"
                autoComplete="name"
                className="sm:w-52 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-cyan-200"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Netfang"
                required
                autoComplete="email"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-cyan-200"
              />
              <button
                type="submit"
                disabled={busy || !email}
                className="shrink-0 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {busy ? "Skrái…" : t.cta}
              </button>
            </div>
            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
            <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-xl">{t.consent}</p>
          </form>
        )}
      </div>
    </div>
  );
}
