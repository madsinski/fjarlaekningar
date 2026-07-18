"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Me {
  name: string;
  email: string;
  role: string;
  onboarded_at: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [mfaVerified, setMfaVerified] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("staff")
        .select("name, email, role, onboarded_at")
        .eq("id", user.id)
        .maybeSingle();
      setMe((data as Me) || null);
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        setMfaVerified(!!factors?.totp.find((f) => f.status === "verified"));
      } catch {
        setMfaVerified(null);
      }
    })();
  }, []);

  const isAdmin = me?.role === "admin";

  const changePassword = async () => {
    if (!me?.email) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.resetPasswordForEmail(me.email, { redirectTo: `${origin}/admin/login` });
    alert("Endurstillingarhlekkur sendur á netfangið þitt.");
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Stillingar</h1>
      <p className="text-sm text-slate-600 mt-1 mb-8">Aðgangur og starfsfólk.</p>

      {/* My account */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <div className="font-semibold text-slate-900 text-sm mb-4">Aðgangurinn minn</div>
        {me ? (
          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <dt className="text-slate-500">Nafn</dt>
            <dd className="col-span-2 text-slate-900">{me.name}</dd>
            <dt className="text-slate-500">Netfang</dt>
            <dd className="col-span-2 text-slate-900">{me.email}</dd>
            <dt className="text-slate-500">Hlutverk</dt>
            <dd className="col-span-2 text-slate-900">{me.role}</dd>
            <dt className="text-slate-500">Nýliðun</dt>
            <dd className="col-span-2 text-slate-900">
              {me.onboarded_at ? "Lokið" : "Ólokið"}
            </dd>
          </dl>
        ) : (
          <div className="text-sm text-slate-500">Hleð…</div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={changePassword}
            className="inline-flex items-center gap-2 py-2 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="w-4 h-4" /> Breyta lykilorði
          </button>
          <button
            onClick={() => router.push("/admin/mfa?mode=enroll")}
            className="inline-flex items-center gap-2 py-2 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {mfaVerified ? "Endursetja MFA" : "Setja upp MFA"}
          </button>
        </div>
      </section>

      {/* Staff management */}
      {isAdmin && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="font-semibold text-slate-900 text-sm mb-2">Starfsfólk & nýliðun</div>
          <p className="text-sm text-slate-600 mb-4">
            Bjóða nýju starfsfólki, sjá stöðu nýliðunar og hlutverk.
          </p>
          <Link
            href="/admin/team"
            className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold"
          >
            <Users className="w-4 h-4" /> Opna starfsfólk
          </Link>
        </section>
      )}
    </div>
  );
}
