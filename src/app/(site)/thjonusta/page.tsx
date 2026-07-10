import type { Metadata } from "next";
import MedaliaButton from "../../components/MedaliaButton";

export const metadata: Metadata = {
  title: "Þjónusta — Fjarlækningar ehf.",
  description:
    "Algeng heilsugæsluerindi leyst í gegnum örugga sjúklingagátt Medalia — spurningalistar samdir af læknum, sjálfspróf heima og lyfseðill rafrænt í lyfjagátt.",
};

const services = [
  {
    title: "Kvef, hósti og hálsbólga",
    description:
      "CRP heimapróf notað í upplýsingasöfnun ef þarf. Alvarlegum einkennum vísað í annan farveg.",
  },
  {
    title: "Þvagfærasýkingar",
    description:
      "Alvarlegum einkennum vísað í annan farveg. Þvag-stix heimapróf notað í upplýsingasöfnun.",
  },
  {
    title: "Sveppasýkingar í leggöngum",
    description: "Greining og meðferð.",
  },
  {
    title: "Bakteríusýkingar í leggöngum",
    description: "Greining og meðferð.",
  },
  {
    title: "Frjókornaofnæmi",
    description: "Meðferð við árstíðabundnu ofnæmi.",
  },
  {
    title: "Frunsa",
    description:
      "Meðferð við endurtekna frunsu. Frumgreiningu vísað í annan farveg.",
  },
  {
    title: "Ristill á húð",
    description:
      "Meðferð við endurteknum ristli. Frumgreiningu vísað í annan farveg.",
  },
  {
    title: "Njálgur",
    description: "Greining og meðferð.",
  },
  {
    title: "Risvandamál",
    description: "Mat og meðferð.",
  },
  {
    title: "Getnaðarvörn",
    description:
      "Fyrsta ávísun, endurnýjun eða breyting á getnaðarvörn.",
  },
  {
    title: "Lyfjaendurnýjun",
    description:
      "Endurnýjun á föstum lyfjum fyrir utan ávanabindandi lyf.",
  },
  {
    title: "Læknisvottorð",
    description:
      "Veikindavottorð fyrir vinnu eða skóla, tengt vandamálum sem hafa verið sinnt í gegnum Fjarlækningar.",
  },
];

const features = [
  {
    title: "Ósamtíma þjónusta",
    description:
      "Þú svarar spurningalista heima eða þar sem þú ert — læknir svarar erindum innan tveggja klukkustunda á opnunartíma milli 10 og 22.",
  },
  {
    title: "Spurningalistar sérhannaðir",
    description:
      "Spurningalistar eru sérhannaðir í samstarfi við íslenska sérfræðilækna tengt hverju vandamáli. Ferlið er hannað eins og viðtal við lækni.",
  },
  {
    title: "Sjálfspróf heima",
    description:
      "Þegar sjálfspróf bætir greiningu er þér leiðbeint að taka það — t.d. þvagpróf sem sækja má á heilsugæslu eða í næsta apóteki — og skrá niðurstöðuna beint í gáttina.",
  },
  {
    title: "Meðferð og lyfseðill",
    description:
      "Læknir leggur til meðferð út frá svörum og læknisfræðilegu mati. Engin meðferð án mats læknis — lyfseðill fer rafrænt í lyfjagátt og er tilbúinn í næsta apóteki.",
  },
  {
    title: "Innbyggt öryggisnet",
    description:
      "Rauð flögg í spurningalistunum vísa alvarlegum einkennum strax í rétta þjónustu. Fjarlækningar taka ekki að sér erindi sem eiga heima annars staðar — og þú greiðir ekki ef þér er vísað frá.",
  },
  {
    title: "Fræðsluefni fylgir",
    description:
      "Niðurstöðunni fylgir fræðsluefni tengt þínu vandamáli: ráðleggingar, fyrirbyggjandi ráð og vörur án lyfseðils sem geta hjálpað.",
  },
];

export default function ThjonustaPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Þjónusta
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Fjarlækningar leysa algeng heilsugæsluerindi í gegnum örugga
            sjúklingagátt Medalia — án þess að þú þurfir að mæta á staðinn.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Algeng erindi
            </h2>
            <p className="mt-3 text-slate-600">
              Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.
            </p>
          </div>
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
          <p className="mt-8 text-sm text-slate-500">
            Listinn lengist jafnt og þétt eftir því sem þjónustan þróast.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Hvernig þjónustan virkar
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 p-8"
              >
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {f.title}
                </h3>
                <p className="text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-600 mb-6">Tilbúin(n) að senda inn erindi?</p>
            <MedaliaButton size="lg" label="Opna sjúklingagátt" />
          </div>
        </div>
      </section>
    </>
  );
}
