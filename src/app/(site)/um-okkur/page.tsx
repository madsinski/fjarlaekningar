import type { Metadata } from "next";
import MedaliaButton from "../../components/MedaliaButton";

export const metadata: Metadata = {
  title: "Um okkur — Fjarlækningar ehf.",
  description:
    "Fjarlækningar ehf. er íslenskt fyrirtæki sem býður upp á örugga fjarlæknisþjónustu í gegnum sjúklingagátt Medalia.",
};

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

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-slate-700 leading-relaxed">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Hlutverk okkar
            </h2>
            <p>
              Fjarlækningar var stofnað með því markmiði að auka aðgengi að
              læknisþjónustu á Íslandi. Þú svarar markvissum spurningalista sem
              læknar hafa samið utan um hvert erindi þegar þér hentar, og læknir
              yfirfer svörin og staðfestir meðferð — án þess að þú þurfir að mæta
              á staðinn eða í myndsímtal. Það sparar tíma, dregur úr álagi á
              heilsugæsluna og gerir heilbrigðisþjónustu aðgengilegri fyrir
              alla, óháð staðsetningu.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Örugg þjónusta í gegnum Medalia
            </h2>
            <p>
              Við notum sjúklingagátt Medalia, sem er íslensk heilbrigðisgátt
              byggð samkvæmt ströngustu kröfum um persónuvernd og öryggi
              heilsufarsupplýsinga. Öll samskipti og sjúkraskrár eru dulkóðaðar
              og eingöngu aðgengilegar þér og þeim lækni sem annast þig.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Faglegir og reyndir læknar
            </h2>
            <p>
              Læknar okkar eru með full réttindi og langa reynslu í almennri
              læknisþjónustu. Innbyggt öryggisnet í spurningalistunum vísar
              alvarlegum einkennum strax í rétta þjónustu — Fjarlækningar taka
              aldrei að sér erindi sem eiga heima annars staðar.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Samstarf við Lyfju
            </h2>
            <p>
              Lyfseðill fer rafrænt í lyfjagátt að loknu erindi. Í samstarfi við
              Lyfju, stærstu apótekakeðju landsins, bjóðum við heimsendingu lyfja
              og sjálfsprófa þar sem hún er í boði — svo þú getir lokið erindinu
              án þess að fara að heiman.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Gildin okkar</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Aðgengi.</strong> Læknisþjónusta á að vera einföld og
                aðgengileg fyrir alla.
              </li>
              <li>
                <strong>Öryggi.</strong> Persónuvernd og örugg meðhöndlun
                heilsufarsupplýsinga er forgangsmál.
              </li>
              <li>
                <strong>Fagmennska.</strong> Við fylgjum faglegum stöðlum og
                klínískum leiðbeiningum.
              </li>
              <li>
                <strong>Einfaldleiki.</strong> Þjónustan á að vera auðveld í
                notkun — frá fyrstu spurningu til lyfseðils.
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center">
          <MedaliaButton size="lg" label="Opna sjúklingagátt" />
        </div>
      </section>
    </>
  );
}
