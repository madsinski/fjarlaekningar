import type { Metadata } from "next";
import MedaliaButton from "../../components/MedaliaButton";
import { erindi } from "../../../erindi";

export const metadata: Metadata = {
  title: "Þjónusta — Fjarlækningar ehf.",
  description:
    "Algeng heilsugæsluerindi leyst í gegnum örugga sjúklingagátt Medalia — spurningalistar samdir af læknum, sjálfspróf heima og lyfseðill rafrænt í lyfjagátt.",
};

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

const faqs = [
  {
    q: "Hverjir geta notað þjónustuna?",
    a: "Meðan á tilraunaverkefninu stendur er þjónustan aðeins í boði fyrir skjólstæðinga sem eru skráðir hjá Heilbrigðisstofnun Suðurlands (HSU). Þjónustan verður opnuð fyrir fleiri eftir því sem verkefninu vindur fram.",
  },
  {
    q: "Af hverju fæ ég ekki aðstoð við öll vandamál hér?",
    a: "Fjarlækningar leysa afmörkuð erindi þar sem óhætt er að meta einkenni út frá markvissum spurningalista og læknisfræðilegu mati, án líkamsskoðunar. Vandamál sem krefjast skoðunar hjá lækni, myndgreiningar eða frumgreiningar — eða sem gætu verið alvarleg — eiga heima hjá heilsugæslu, Læknavaktinni eða bráðamóttöku. Öryggisnetið í spurningalistunum vísar slíkum erindum strax í rétta þjónustu.",
  },
  {
    q: "Hvar nálgast ég heimapróf (sjálfspróf)?",
    a: "Þegar sjálfspróf bætir greiningu færð þú leiðbeiningar um hvaða próf á að taka. Þvag-stix, strep-próf og CRP má sækja á heilsugæslu þar sem þú ert skráð eða staddur, eða í næsta apóteki. Þú skráir niðurstöðuna beint í sjúklingagáttina og hún fylgir erindinu til læknis.",
  },
  {
    q: "Hvað gerist ef einkennin eru alvarleg?",
    a: "Ef svörin benda til alvarlegri veikinda, t.d. hita yfir 38°C, stöðvast ferlið sjálfkrafa og þú færð skýrar leiðbeiningar um rétt úrræði — vaktþjónustu heilsugæslunnar, Læknavaktina, 1700 eða bráðamóttöku eftir alvarleika.",
  },
  {
    q: "Hvað kostar þjónustan og greiði ég ef mér er vísað frá?",
    a: "Þú greiðir ekki ef þér er vísað frá vegna þess að erindið á heima annars staðar. Fjarlækningar taka ekki að sér erindi sem þarfnast skoðunar hjá lækni á stofu.",
  },
  {
    q: "Hversu fljótt fæ ég svar?",
    a: "Flest erindi eru afgreidd innan tveggja klukkustunda á opnunartíma. Opið er alla daga milli 10 og 22 — beiðnum sem berast eftir kl. 22 er svarað daginn eftir.",
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
            {erindi.map((s) => (
              <div
                key={s.slug}
                className="bg-white rounded-2xl border border-slate-200 p-8 flex items-start gap-5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/erindi-icons/${s.slug}.png`}
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20 shrink-0 object-contain"
                />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-slate-600">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Auk þess læknisvottorð tengt vandamálum sem sinnt hefur verið í
            gegnum Fjarlækningar. Listinn lengist jafnt og þétt eftir því sem
            þjónustan þróast.
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
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Algengar spurningar
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group bg-white rounded-2xl border border-slate-200 p-6 [&_summary]:cursor-pointer"
              >
                <summary className="flex items-center justify-between gap-4 font-semibold text-slate-900 list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 shrink-0 text-[var(--primary)] transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{item.a}</p>
              </details>
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
