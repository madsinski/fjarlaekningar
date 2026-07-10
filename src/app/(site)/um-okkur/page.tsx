import type { Metadata } from "next";
import {
  Target,
  Lock,
  Stethoscope,
  ClipboardPlus,
  Globe,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";
import MedaliaButton from "../../components/MedaliaButton";
import TeamGrid from "../../components/TeamGrid";

export const metadata: Metadata = {
  title: "Um okkur — Fjarlækningar ehf.",
  description:
    "Fjarlækningar ehf. er íslenskt fyrirtæki sem býður upp á örugga fjarlæknisþjónustu í gegnum sjúklingagátt Medalia.",
};

const pillars = [
  {
    title: "Hlutverk okkar",
    body: "Fjarlækningar var stofnað til að auka aðgengi að læknisþjónustu á Íslandi. Sama þjónusta og á læknastofu, sömu spurningar og sömu vandamál — en skilvirkari leið til að leysa þau og styttri biðlistar, óháð staðsetningu.",
    icon: Target,
  },
  {
    title: "Örugg þjónusta í gegnum Medalia",
    body: "Við notum sjúklingagátt Medalia, íslenska heilbrigðisgátt byggða samkvæmt ströngustu kröfum um persónuvernd. Öll samskipti og sjúkraskrár eru dulkóðaðar og eingöngu aðgengilegar þér og þeim lækni sem annast þig.",
    icon: Lock,
  },
  {
    title: "Faglegir og reyndir læknar",
    body: "Læknar okkar eru með full réttindi og langa reynslu í almennri læknisþjónustu. Innbyggt öryggisnet í spurningalistunum vísar alvarlegum einkennum strax í rétta þjónustu — við tökum aldrei að okkur erindi sem eiga heima annars staðar.",
    icon: Stethoscope,
  },
  {
    title: "Lyfseðill og eftirfylgni",
    body: "Læknir leggur til meðferð út frá svörum þínum og lyfseðill fer rafrænt í lyfjagátt, tilbúinn í næsta apóteki. Þú getur valið heimsendingu í gegnum app apóteksins þar sem það er í boði — svo þú getir lokið erindinu án þess að fara að heiman.",
    icon: ClipboardPlus,
  },
];

const values = [
  {
    title: "Aðgengi",
    body: "Læknisþjónusta á að vera einföld og aðgengileg fyrir alla.",
    icon: Globe,
  },
  {
    title: "Öryggi",
    body: "Persónuvernd og örugg meðhöndlun heilsufarsupplýsinga er forgangsmál.",
    icon: ShieldCheck,
  },
  {
    title: "Fagmennska",
    body: "Við fylgjum faglegum stöðlum og klínískum leiðbeiningum.",
    icon: Award,
  },
  {
    title: "Einfaldleiki",
    body: "Þjónustan á að vera auðveld í notkun — frá fyrstu spurningu til lyfseðils.",
    icon: Sparkles,
  },
];

export default function UmOkkurPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Um okkur
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Fjarlækningar ehf. er íslenskt fyrirtæki, stofnað af læknum árið
            2021, sem leysir algeng heilsugæsluerindi í gegnum örugga
            sjúklingagátt.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="group bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-brand-cyan transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-5 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  <p.icon className="w-6 h-6" strokeWidth={1.75} aria-hidden />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-3">
                  {p.title}
                </h2>
                <p className="text-slate-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Gildin okkar
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-white rounded-2xl border border-slate-200 p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                  {v.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Teymið á bakvið Fjarlækningar
            </h2>
            <p className="mt-4 text-slate-600">
              Tveir læknar stofnuðu Fjarlækningar. Í dag stendur að baki
              þjónustunni teymi lækna og sérfræðinga — smelltu á mynd til að sjá
              hana stærri.
            </p>
          </div>
          <TeamGrid />
          <p className="mt-10 text-sm text-slate-500 text-center">
            Auk hóps starfandi lækna sem afgreiða erindi í sjúklingagáttinni.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MedaliaButton size="lg" label="Opna sjúklingagátt" />
        </div>
      </section>
    </>
  );
}
