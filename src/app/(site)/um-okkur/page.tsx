import type { Metadata } from "next";
import MedaliaButton from "../../components/MedaliaButton";

export const metadata: Metadata = {
  title: "Um okkur — Fjarlækningar ehf.",
  description:
    "Fjarlækningar ehf. er íslenskt fyrirtæki sem býður upp á örugga fjarlæknisþjónustu í gegnum sjúklingagátt Medalia.",
};

const team = [
  {
    name: "Victor Guðmundsson",
    role: "Framkvæmdastjóri · Læknir",
    flag: "Stofnandi",
  },
  {
    name: "Mads Christian Aanesen",
    role: "Tæknistjóri · Læknir",
    flag: "Stofnandi",
  },
  {
    name: "Guðbjartur Ólafsson",
    role: "Yfirlæknir",
    flag: "Læknateymi",
  },
  {
    name: "Dagbjört Guðbrandsdóttir",
    role: "Læknir",
    flag: "Læknateymi",
  },
  {
    name: "Elvar Páll Sigurðsson",
    role: "Rekstrarstjóri · Markaðsstjóri",
    flag: "Stjórnun",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
              læknisþjónustu á Íslandi. Þú svarar spurningalista sem er
              sérhannaður í samstarfi við íslenska sérfræðilækna, læknir metur
              svörin og leggur til meðferð — sama þjónusta og á læknastofu, sömu
              spurningar og sömu vandamál, en skilvirkari leið til að leysa þau
              og styttri biðlistar. Það dregur úr álagi á heilsugæsluna og gerir
              heilbrigðisþjónustu aðgengilegri fyrir alla, óháð staðsetningu.
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
              Lyfseðill og eftirfylgni
            </h2>
            <p>
              Læknir leggur til meðferð út frá svörum þínum og lyfseðill fer
              rafrænt í lyfjagátt, tilbúinn til afhendingar í næsta apóteki. Þú
              getur valið heimsendingu í gegnum app apóteksins þar sem það er í
              boði — svo þú getir lokið erindinu án þess að fara að heiman.
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

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Teymið á bakvið Fjarlækningar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white rounded-2xl border border-slate-200 p-6 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center text-xl font-bold">
                  {initials(member.name)}
                </div>
                <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-brand-cyan-subtle/60 text-xs font-medium text-[var(--primary-dark)]">
                  {member.flag}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {member.name}
                </h3>
                <p className="text-sm text-slate-600">{member.role}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500 text-center">
            Auk hóps starfandi lækna sem afgreiða erindi í sjúklingagáttinni.
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center">
          <MedaliaButton size="lg" label="Opna sjúklingagátt" />
        </div>
      </section>
    </>
  );
}
