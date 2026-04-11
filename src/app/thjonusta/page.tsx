import type { Metadata } from "next";
import MedaliaButton from "../components/MedaliaButton";

export const metadata: Metadata = {
  title: "Þjónusta — Fjarlækningar ehf.",
  description:
    "Almenn læknisviðtöl, lyfseðlar, veikindavottorð og tilvísanir í gegnum sjúklingagátt Medalia.",
};

const services = [
  {
    title: "Almenn læknisviðtöl",
    description:
      "Í fjarlæknisviðtali færð þú faglega ráðgjöf og mat á einkennum frá lækni í gegnum öruggt myndsamtal. Viðtalið hentar fyrir algeng vandamál eins og sýkingar, húðvandamál, almenn veikindi og eftirfylgni.",
  },
  {
    title: "Lyfseðlar og endurnýjanir",
    description:
      "Læknirinn getur ávísað nýjum lyfjum eða endurnýjað eldri lyfseðla þegar það á við. Lyfseðillinn er sendur rafrænt í lyfjagátt og er tilbúinn til afgreiðslu í apóteki að vali þínu.",
  },
  {
    title: "Veikindavottorð",
    description:
      "Útgáfa veikindavottorða fyrir vinnuveitanda eða skóla er einföld í fjarlæknaviðtali. Þú færð vottorðið rafrænt beint í sjúklingagáttina.",
  },
  {
    title: "Tilvísanir til sérfræðinga",
    description:
      "Ef þörf er á frekari rannsóknum eða sérfræðiaðstoð útbýr læknirinn tilvísun til viðeigandi sérfræðings eða rannsóknarstofu.",
  },
  {
    title: "Eftirfylgni",
    description:
      "Eftirfylgni með langvinnum sjúkdómum, blóðþrýstingi, sykursýki og öðrum aðstæðum sem krefjast reglulegs eftirlits.",
  },
  {
    title: "Ráðgjöf og fræðsla",
    description:
      "Almenn heilsufarsráðgjöf, forvarnir og fræðsla um lífsstíl og heilbrigði.",
  },
];

export default function ThjonustaPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-sky-50 to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Þjónusta
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Fjarlækningar ehf. bjóða upp á fjölbreytta læknisþjónustu í gegnum
            sjúklingagátt Medalia — án þess að þú þurfir að mæta á heilsugæslu.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-2xl border border-slate-200 p-8"
              >
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {s.title}
                </h3>
                <p className="text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-600 mb-6">
              Tilbúin(n) að bóka viðtal?
            </p>
            <MedaliaButton size="lg" label="Opna sjúklingagátt" />
          </div>
        </div>
      </section>
    </>
  );
}
