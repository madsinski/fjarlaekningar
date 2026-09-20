// Uppsetning árangursmælinga — verkferlið, skrifað niður einu sinni.
//
// Skipt eftir TÍÐNI en ekki efni, því það er spurningin sem fólk er raunverulega
// að spyrja: hvað þarf ég að gera einu sinni, og hvað þarf ég að muna í hverjum
// mánuði? Efnisflokkun lítur betur út og hjálpar engum.
//
// Nokkur atriði eru merkt TÍMANÆM. Þau eiga það sameiginlegt að vera ekki
// bætanleg eftir á: mæling sem byrjar of seint mælir ekki lengur það sem hún
// átti að mæla, og grunnlína sem er ekki sótt meðan velviljinn er nýr fæst
// ekki seinna. Allt annað má gera í næstu viku án þess að tapa neinu.

export type GatlistiAtridi = {
  id: string;
  label: string;
  detail?: string;
  /** Ekki bætanlegt eftir á — hver dagur sem líður kostar gögn. */
  timanaemt?: boolean;
  link?: string;
  linkLabel?: string;
};

export type Tidni = "einu-sinni" | "manadarlega" | "arsfjordungslega" | "arlega";

export type GatlistiKafli = {
  id: string;
  tidni: Tidni;
  title: string;
  blurb?: string;
  items: GatlistiAtridi[];
};

export const TIDNI_HEITI: Record<Tidni, string> = {
  "einu-sinni": "Einu sinni — uppsetning",
  manadarlega: "Í hverjum mánuði",
  arsfjordungslega: "Á hverjum ársfjórðungi",
  arlega: "Einu sinni á ári",
};

export const GATLISTI: GatlistiKafli[] = [
  // ── Einu sinni ────────────────────────────────────────────────────────────
  {
    id: "kodar",
    tidni: "einu-sinni",
    title: "Greiningarkóðar og skilgreiningar",
    blurb:
      "Byrjaðu hér. Kóðarnir eru tengilykillinn milli okkar teljara og nefnara stofnunarinnar — án þeirra eru allar tölurnar okkar sjálfvísandi og ósamanburðarhæfar. Þetta er verkefni númer eitt í öllu settinu.",
    items: [
      {
        id: "kodasett",
        label: "Ákveða 3–5 ICD-10 kóða fyrir hvert erindanna ellefu",
        detail:
          "Með lækni. Frávik frá settinu er síðar sjálfstætt merki um að umfangið sé að reka — svo settið þarf að vera þröngt og skjalfest.",
        timanaemt: true,
      },
      {
        id: "icpc",
        label: "Athuga hvort Medalia styður ICPC-2 samhliða",
        detail: "Alþjóðlega heilsugæsluflokkunin. Gerir samanburð út fyrir landsteinana mögulegan ef hún er til staðar.",
      },
      {
        id: "skilgreiningar",
        label: "Skrifa niður og læsa skilgreiningum",
        detail:
          "„Leyst erindi“, „vísað áfram“, „stöðvað af spurningalista“. Verður að þýða nákvæmlega það sama í fyrsta mánuði og þeim tólfta — breyttar skilgreiningar í miðjum straumi drepa fleiri gæðaverkefni en nokkuð annað.",
        timanaemt: true,
      },
      {
        id: "fravisunarastaedur",
        label: "Fastur listi yfir frávísunarástæður (rauð flögg)",
        detail: "Um tíu flokkar. Frjáls texti hér þýðir handvirkan lestur á þúsund nótum í lok tímabils.",
      },
    ],
  },
  {
    id: "medalia",
    tidni: "einu-sinni",
    title: "Medalia — skráning og útflutningur",
    blurb:
      "Útflutningur er aðeins jafn góður og skráningin. Liggur afgreiðslan í frjálsum texta í læknisbréfinu bjargar enginn útflutningur þér. Gert núna kostar þetta viku; gert eftir ár er það ekki hægt.",
    items: [
      { id: "reitur_kodi", label: "Greiningarkóði gerður að skyldubundnum reit", timanaemt: true },
      { id: "reitur_afgreidsla", label: "Afgreiðsla (leyst / vísað áfram) gerð að kóðuðum skyldureit", timanaemt: true },
      { id: "reitur_tilvisun", label: "Tilvísunarástæða gerð að kóðuðum reit" },
      {
        id: "stodvud_eydublod",
        label: "Staðfesta að stöðvuð eyðublöð skráist og komist í útflutning",
        detail:
          "Brýnasta spurningin til Medalia. Enginn síar sjúklinga klínískt fyrir fram — spurningalistinn gerir það. Stöðvunartíðnin er því eina öryggissönnunin sem við eigum, og hún er einskis virði ef hún er ekki skráð.",
        timanaemt: true,
      },
      { id: "utflutningur", label: "Semja um mánaðarlegan útflutning og snið hans" },
      { id: "vinnslusamningur", label: "Staðfesta að vinnslusamningur nái yfir útflutninginn" },
    ],
  },
  {
    id: "adkomuleidir",
    tidni: "einu-sinni",
    title: "Aðkomuleiðir — sérslóð á hverja leið",
    blurb:
      "Sjúklingar koma fjórar leiðir og við getum ekki talið þá sem aldrei komu. En við getum talið hvaðan þeir komu sem komu — og sá sem kemur BEINT kostar stöðina núll mínútur. Leiðaskiptingin er þannig ekki markaðstala heldur álagsmælikvarði.",
    items: [
      {
        id: "slodir",
        label: "Sérslóð á hverja leið: beint, hjúkrunarfræðingur, móttaka, heilbrigðisgagnafræðingur",
        detail:
          "Engin spurning til sjúklings, engin minnisskekkja, ekkert sem getur gleymst — leiðin skráist af sjálfu sér. Ein breyting í kóðanum: PORTAL_URL er harðkóðað á sex stöðum.",
        timanaemt: true,
      },
      { id: "medalia_slod", label: "Staðfesta við Medalia að leiðin skili sér í útflutning", detail: "Sérstakar gáttarslóðir eða fyrirspurnarbreyta — hvort sem þeir kjósa." },
      { id: "stofnanir_url", label: "Tengja slóðirnar við service_url í /admin/stofnanir", link: "/admin/stofnanir", linkLabel: "Samstarfsstofnanir" },
    ],
  },
  {
    id: "grunnlina",
    tidni: "einu-sinni",
    title: "Grunnlína og nefnari frá stofnuninni",
    blurb:
      "Nefnarinn er ekki hjá okkur og verður það aldrei — hann er í samskiptaskrá stofnunarinnar. Það er betra en nokkuð sem við hefðum getað talið sjálf: þeirra gögn, í þeirra kerfi, samræmd á landsvísu. Enginn efast um tölu úr samskiptaskrá.",
    items: [
      {
        id: "baseline_samskipti",
        label: "Biðja um samskipti í völdum kóðum, 12 mánuði aftur, sundurliðað á stöð",
        detail:
          "Án fyrir-talna er eftir-talan bara tala. Þú færð þessi gögn meðan velviljinn er nýr og samstarfið spennandi; eftir ár, þegar einhver er farinn að spyrja hvað þetta kostar, ekki jafn auðveldlega.",
        timanaemt: true,
      },
      { id: "baseline_rekstur", label: "Biðja um afleysingakostnað, símtalamagn og opnunartíma, sama tímabil", timanaemt: true },
      { id: "samskipti_manadarlega", label: "Semja um mánaðarlega afhendingu sömu talna framvegis" },
      {
        id: "endurkomur",
        label: "Semja um að stofnunin keyri 7-daga endurkomufyrirspurn sín megin",
        detail:
          "Besti öryggismælikvarðinn sem til er, en hann krefst þess að tengja saman tvær sjúkraskrár. Keyri stofnunin hann sín megin og afhendi bara töluna fer engin persónugreinanleg samkeyrsla fram og verkefnið helst gæðaeftirlit.",
      },
      { id: "landstolur", label: "Sækja landstíðni per kóða frá Embætti landlæknis", detail: "Gefur væntanlegt umfang í byggð af þessari stærð án þess að spyrja nokkurn." },
    ],
  },
  {
    id: "konnun",
    tidni: "einu-sinni",
    title: "Könnun, frávik og starfsfólk",
    items: [
      {
        id: "konnun_laest",
        label: "Læsa þriggja spurninga sjúklingakönnun",
        detail:
          "Áreynsla („hversu einfalt var þetta?“), myndir þú nota aftur, og — sú sem má ekki sleppa — „hvert hefðir þú annars leitað?“ með fastan valmöguleika „hvergi, ég hefði látið þetta eiga sig“. Þau svör eru hreinn aðgengisávinningur. Fleiri en þrjár spurningar og svarhlutfallið hrynur.",
        timanaemt: true,
        link: "/admin/surveys",
        linkLabel: "Kannanir",
      },
      { id: "konnun_sjalfvirk", label: "Sjálfvirk sending á föstum tímapunkti eftir erindi", detail: "Sami tímapunktur allt tímabilið, annars er röðin ónýt." },
      {
        id: "fravik",
        label: "Frávikaskráning í loftið",
        detail: "Eitt eyðublað dugar. En setningin „engin alvarleg atvik“ er aðeins trúverðug ef til var kerfi sem hefði gripið þau.",
        timanaemt: true,
      },
      {
        id: "starfsmannakonnun",
        label: "Starfsmannakönnun — hjúkrunarfræðingar OG læknar, sitt hvor",
        detail:
          "Læknar stofnunarinnar eru sérstakur hópur og ráða meiru um framhaldið en virðist. Læknir á næstu stofnun spyr ekki stjórnendur hvernig gekk — hann spyr lækni á staðnum. Besta spurningin: „ef þetta yrði tekið af ykkur á morgun, hvað myndi breytast?“",
      },
    ],
  },
  {
    id: "timamaeling",
    tidni: "einu-sinni",
    title: "Tímamæling — fyrri umferð",
    blurb:
      "Raunverulega áhættan í öllu verkefninu er að þjónustan FÆRI vinnu frekar en að fjarlægja hana: hjúkrunarfræðingurinn þarf nú að meta erindið, útskýra nýja þjónustu, senda hlekk og taka við sjúklingnum aftur ef eitthvað fór úrskeiðis. Það er algengasta niðurstaðan í fjarþjónusturannsóknum og hún er ósýnileg í öllum gögnum sem byrja eftir að sjúklingur er kominn í Medalia.",
    items: [
      {
        id: "timamaeling_1",
        label: "Tvær vikur, strax: mínútur á erindi sem fer til okkar vs. sambærilegt afgreitt í húsi",
        detail:
          "Um 40 erindi í hvorum flokki duga til að sjá hvort talan er jákvæð eða neikvæð. Mæling í lokin gefur þér niðurstöðu; mæling í byrjun gefur þér stýritæki — og níu mánuði til að laga það sem hún sýnir.",
        timanaemt: true,
      },
      { id: "forsenda_skrad", label: "Skrá niðurstöðuna sem forsendu fyrir „frigjörð vinna“", detail: "Sjálfgefnar 20 mín eru ágiskun þar til mælingin liggur fyrir. Forsendan er hluti af fullyrðingunni." },
      { id: "vigtun", label: "Athuga að mælingin nái aðeins yfir erindi sem fara um starfsfólk stofnunarinnar", detail: "Beinar komur kosta ekkert og eiga ekki heima í nettóútreikningnum." },
    ],
  },
  {
    id: "lagalegt",
    tidni: "einu-sinni",
    title: "Lagalegt — gæðaverkefni eða rannsókn",
    blurb:
      "Þetta er ekki spurning um samþykki heldur um eitt bréf. Að meta eigin þjónustu er innra gæðaeftirlit skv. lögum nr. 41/2007 og krefst hvorki samþykkis né siðanefndar. Um leið og þú BIRTIR fer það undir lög nr. 44/2014 — en þau heimila Vísindasiðanefnd að veita undanþágu frá upplýstu samþykki í gagnarannsóknum, og slíkar undanþágur eru veittar reglulega fyrir nákvæmlega svona verkefni.",
    items: [
      {
        id: "vsn",
        label: "Senda fyrirspurn til Vísindasiðanefndar",
        detail:
          "Spurðu hvort verkefnið falli undir lög nr. 44/2014. Þú færð annað hvort staðfestingu á að svo sé ekki — það skjal fylgir ágripi og útboðsgögnum — eða samþykki sem gagnarannsókn með undanþágu. Að eiga hvorugt þegar ágripsfrestur rennur út er eina raunverulega áhættan.",
        timanaemt: true,
      },
      {
        id: "personuvernd",
        label: "Uppfæra persónuverndaryfirlýsingu: fræðsla, ekki samþykki",
        detail: "Segja skýrt að gögn séu notuð til að meta og bæta þjónustuna og að niðurstöður geti birst samanteknar. Upplýsingaskylda skv. GDPR, ekki samþykki.",
        link: "/admin/legal",
        linkLabel: "Lögfræðiskjöl",
      },
      {
        id: "enginn_hnappur",
        label: "Skjalfesta ákvörðun um að setja EKKI upp samþykkishnapp",
        detail:
          "Í þjónustusambandi er samþykki veik vinnsluheimild — sjúklingurinn er ekki í aðstöðu til að neita. Verra: þá verður að útiloka alla sem neita, sem skekkir þýðið, og eftir situr samþykkisskrá sem þarf að viðhalda að eilífu.",
      },
      { id: "abyrgdaradili", label: "Staðfesta hver er ábyrgðaraðili sjúkraskrárinnar", detail: "Lög nr. 55/2009. Ræður því hver má vinna gæðaverkefni á gögnunum." },
      { id: "landlaeknir", label: "Kynna Embætti landlæknis verkefnið", detail: "Í útboði verður spurt hvort þeir þekki þjónustuna. Rétta svarið er „já, frá byrjun“, ekki „já, þeir fengu bréf í fyrra“." },
    ],
  },

  // ── Mánaðarlega ───────────────────────────────────────────────────────────
  {
    id: "manadarlegt",
    tidni: "manadarlega",
    title: "Mánaðarleg skráning",
    blurb: "Um hálftími á stöð þegar útflutningurinn er kominn í gott horf. Slegið inn undir Skráning.",
    items: [
      { id: "m_sakja", label: "Sækja mánaðarútflutning úr Medalia" },
      { id: "m_sla_inn", label: "Slá inn tölur fyrir hverja stöð" },
      { id: "m_samskipti", label: "Sækja samskiptatölur mánaðarins frá stofnuninni", detail: "Nefnarinn. Vantar hann verður hlutdeildartalan ekki reiknuð." },
      {
        id: "m_almenn",
        label: "Flokka „almenn læknisþjónusta“ sem leystust ekki",
        detail:
          "Handvirkt, magnið leyfir það. Ruslakistan er þar sem erindi 12, 13 og 14 fela sig — þetta er vegvísirinn að næstu erindum og glæran sem selur sig sjálf: „við byrjuðum með ellefu, gögnin sögðu okkur hver næstu þrjú eiga að vera.“",
      },
      { id: "m_fravik", label: "Yfirfara frávik mánaðarins" },
      { id: "m_kodar", label: "Athuga hvort erindi eru að detta út fyrir væntanleg kóðasett", detail: "Fyrsta merki um að umfangið sé að reka." },
    ],
  },

  // ── Ársfjórðungslega ──────────────────────────────────────────────────────
  {
    id: "arsfjordungslegt",
    tidni: "arsfjordungslega",
    title: "Árangursskýrsla",
    blurb:
      "Ekki safna í tólf mánuði og skrifa svo skýrslu. Fjórar ársfjórðungsskýrslur plús samantekt ERU ársskýrslan, og hver þeirra er æfing í að verja tölurnar fyrir fólki sem þekkir þjónustuna. Sú sem er skrifuð í einum rykk í lokin er alltaf verri.",
    items: [
      { id: "q_skyrsla", label: "Skrifa skýrslu í sama sniðmáti og síðast", detail: "Sniðmátið má ekki breytast. Samanburðurinn milli ársfjórðunga er hálft verðmætið." },
      {
        id: "q_badir_dalkar",
        label: "Bera báða dálka á sömu blaðsíðu — skjólstæðingar og heilsugæsla",
        detail:
          "Markmiðin tvö geta rekið í sundur án þess að nokkur taki eftir: hægt er að létta álagi með því að afgreiða hraðar og verr, og bæta þjónustu með því að hlaða verkum á hjúkrunarfræðinginn. Þetta gerir ómögulegt að fagna ávinningi í öðru án þess að horfa á kostnaðinn í hinu.",
      },
      { id: "q_laeknir", label: "Fara yfir öryggistölurnar með lækni stofnunarinnar", detail: "Sá sem hefur tekið þátt í að skoða gögnin ver þau seinna." },
      { id: "q_forsendur", label: "Uppfæra forsendur ef tímamæling hefur breyst" },
    ],
  },

  // ── Árlega ────────────────────────────────────────────────────────────────
  {
    id: "arlegt",
    tidni: "arlega",
    title: "Árlega og tímasett",
    items: [
      {
        id: "a_timamaeling_2",
        label: "Seinni tímamæling (um mánuð 9)",
        detail: "Sami háttur og sú fyrri. Tvær mælingar gefa þróun; ein gefur fullyrðingu sem enginn getur athugað.",
      },
      {
        id: "a_agrip",
        label: "Ágrip á Læknadaga — athuga frestinn tímanlega",
        detail:
          "Ágrip skilast að hausti fyrir janúarþing. Með fullt ár að baki ertu í margfalt sterkari stöðu en með nokkurra mánaða gögn, svo veldu árið eftir því en ekki öfugt.",
      },
      {
        id: "a_medmaeli",
        label: "Meðmælabréf frá stofnuninni",
        detail: "Biddu um það snemma og helst sem hluta af samstarfinu frá upphafi, ekki þegar útboðið er auglýst.",
      },
      {
        id: "a_takmarkanir",
        label: "Uppfæra kaflann um takmarkanir",
        detail:
          "Þýðið verður aldrei nógu stórt til að segja neitt um sjaldgæf atvik og einhver í salnum mun segja það upphátt. Segðu það sjálfur á fyrstu glæru: fýsileika- og þjónustumat á fáum stöðvum, ekki slembirannsókn, og styrkurinn liggur í því að hvert erindi er rakið. Sá sem nefnir eigin takmarkanir fyrstur á umræðuna sem á eftir kemur.",
      },
    ],
  },
];

export const GATLISTI_ID = GATLISTI.flatMap((k) => k.items.map((i) => i.id));

export const TIMANAEM_ID = GATLISTI.flatMap((k) => k.items.filter((i) => i.timanaemt).map((i) => i.id));

/** Hlutfall kláraðra atriða í kafla. */
export function kafliStada(kafli: GatlistiKafli, done: Record<string, boolean>): number {
  if (!kafli.items.length) return 0;
  return Math.round((kafli.items.filter((i) => done[i.id]).length / kafli.items.length) * 100);
}

/** Tímanæm atriði sem eru ekki komin í hús — það sem blæðir á hverjum degi. */
export function timanaemtOgOgert(done: Record<string, boolean>): GatlistiAtridi[] {
  return GATLISTI.flatMap((k) => k.items).filter((i) => i.timanaemt && !done[i.id]);
}
