// Bókasmiðjan — interface strings in the four languages.
// One row per string: [English, Icelandic, Norwegian, Hungarian]. The tuple
// type makes a missing language a compile error. Safe for client and server.

import { LANGS, type Lang } from "./types";

type Row = readonly [en: string, is: string, nb: string, hu: string];

const M = {
  "app.name": ["Book Workshop", "Bókasmiðjan", "Bokverkstedet", "Könyvműhely"],

  // Gate
  "gate.parentTitle": ["Grown-ups first", "Fullorðnir fyrst", "Voksne først", "Először a felnőttek"],
  "gate.parentBody": [
    "Type the grown-up code to open the workshop on this device.",
    "Sláðu inn foreldrakóðann til að opna smiðjuna í þessu tæki.",
    "Skriv inn voksenkoden for å åpne verkstedet på denne enheten.",
    "Írd be a felnőtt kódot, hogy megnyíljon a műhely ezen az eszközön.",
  ],
  "gate.code": ["Grown-up code", "Foreldrakóði", "Voksenkode", "Felnőtt kód"],
  "gate.open": ["Open", "Opna", "Åpne", "Megnyitás"],
  "gate.who": ["Who is reading today?", "Hver ætlar að lesa í dag?", "Hvem skal lese i dag?", "Ki olvas ma?"],
  "gate.pin": ["Type your secret code, {name}", "Sláðu inn leynikóðann þinn, {name}", "Skriv inn den hemmelige koden din, {name}", "Írd be a titkos kódodat, {name}"],
  "gate.back": ["Back", "Til baka", "Tilbake", "Vissza"],
  "gate.grownups": ["Grown-ups", "Fullorðnir", "Voksne", "Felnőttek"],
  "gate.noKids": [
    "No children here yet. Ask a grown-up to add you.",
    "Hér eru engin börn enn. Biddu fullorðinn um að bæta þér við.",
    "Ingen barn her ennå. Be en voksen om å legge deg til.",
    "Még nincsenek itt gyerekek. Kérj meg egy felnőttet, hogy adjon hozzá.",
  ],

  // Errors (keyed by the API's error codes)
  "err.wrong_pin": ["That code wasn't right. Try again!", "Þetta var ekki rétti kóðinn. Reyndu aftur!", "Det var ikke riktig kode. Prøv igjen!", "Ez nem a jó kód volt. Próbáld újra!"],
  "err.locked": [
    "Too many tries. Take a break and try again in 15 minutes.",
    "Of margar tilraunir. Taktu þér hlé og reyndu aftur eftir korter.",
    "For mange forsøk. Ta en pause og prøv igjen om 15 minutter.",
    "Túl sok próbálkozás. Tarts szünetet, és próbáld újra 15 perc múlva.",
  ],
  "err.wrong_code": ["That code is not right.", "Kóðinn er ekki réttur.", "Koden er ikke riktig.", "Ez a kód nem jó."],
  "err.device_locked": ["A grown-up has to open this device first.", "Fullorðinn þarf fyrst að opna þetta tæki.", "En voksen må åpne denne enheten først.", "Először egy felnőttnek kell megnyitnia ezt az eszközt."],
  "err.too_many": ["Too many tries. Wait a little.", "Of margar tilraunir. Bíddu aðeins.", "For mange forsøk. Vent litt.", "Túl sok próbálkozás. Várj egy kicsit."],
  "err.daily_limit": [
    "That's enough for today. Come back tomorrow!",
    "Þetta er nóg í dag. Komdu aftur á morgun!",
    "Det er nok for i dag. Kom tilbake i morgen!",
    "Mára ennyi elég. Gyere vissza holnap!",
  ],
  "err.not_configured": [
    "The workshop is not set up yet. Ask a grown-up.",
    "Smiðjan er ekki tilbúin enn. Talaðu við fullorðinn.",
    "Verkstedet er ikke satt opp ennå. Spør en voksen.",
    "A műhely még nincs beállítva. Szólj egy felnőttnek.",
  ],
  "err.agent_failed": ["Oops, that didn't work. Let's try again.", "Úps, þetta tókst ekki. Reynum aftur.", "Oi, det gikk ikke. Vi prøver igjen.", "Hoppá, ez nem sikerült. Próbáljuk újra."],
  "err.refused": [
    "I can't make a story from that idea. Try another one!",
    "Ég get ekki búið til sögu úr þessari hugmynd. Prófaðu aðra!",
    "Jeg kan ikke lage en historie av den ideen. Prøv en annen!",
    "Ebből az ötletből nem tudok mesét írni. Próbálj ki egy másikat!",
  ],
  "err.book_full": ["This book is already full.", "Þessi bók er þegar full.", "Denne boken er allerede full.", "Ez a könyv már megtelt."],
  "err.idea_missing": ["Tell me a little more about your idea.", "Segðu mér aðeins meira frá hugmyndinni þinni.", "Fortell meg litt mer om ideen din.", "Mesélj egy kicsit többet az ötletedről."],
  "err.weak_pin": [
    "Choose four digits that are harder to guess.",
    "Veldu fjóra tölustafi sem erfiðara er að giska á.",
    "Velg fire sifre som er vanskeligere å gjette.",
    "Válassz négy számjegyet, amelyet nehezebb kitalálni.",
  ],
  "err.name_missing": ["A name is missing.", "Það vantar nafn.", "Det mangler et navn.", "Hiányzik a név."],
  "err.not_yours": ["Only the one who made this story can change it.", "Aðeins sá sem bjó söguna til má breyta henni.", "Bare den som laget historien kan endre den.", "Csak az változtathat a mesén, aki készítette."],
  "err.generic": ["Something went wrong.", "Eitthvað fór úrskeiðis.", "Noe gikk galt.", "Valami hiba történt."],

  // Navigation
  "nav.shelf": ["Bookshelf", "Bókahillan", "Bokhyllen", "Könyvespolc"],
  "nav.bye": ["Bye!", "Bless!", "Ha det!", "Szia!"],

  // Bookshelf
  "shelf.hello": ["Hi {name}!", "Hæ {name}!", "Hei {name}!", "Szia {name}!"],
  "shelf.helloParent": ["Hello!", "Halló!", "Hei!", "Sziasztok!"],
  "shelf.what": ["What shall we do today?", "Hvað eigum við að gera í dag?", "Hva skal vi gjøre i dag?", "Mit csináljunk ma?"],
  "shelf.make": ["Make a new book", "Búa til nýja bók", "Lag en ny bok", "Új könyv készítése"],
  "shelf.makeSub": ["Invent your very own story", "Finndu upp þína eigin sögu", "Finn på din helt egen historie", "Találd ki a saját mesédet"],
  "shelf.books": ["The bookshelf", "Bókahillan", "Bokhyllen", "A könyvespolc"],
  "shelf.booksSub": ["Tap a book to open it", "Ýttu á bók til að opna hana", "Trykk på en bok for å åpne den", "Koppints egy könyvre, hogy kinyisd"],
  "shelf.stories": ["{done} of {total} stories", "{done} af {total} sögum", "{done} av {total} historier", "{done} / {total} mese"],
  "shelf.newBook": ["New book", "Ný bók", "Ny bok", "Új könyv"],

  // Book
  "book.story": ["Story {n}", "Saga {n}", "Historie {n}", "{n}. mese"],
  "book.make": ["Make this story", "Búa þessa sögu til", "Lag denne historien", "Készítsd el ezt a mesét"],
  "book.next": ["Next step", "Næsta skref", "Neste steg", "Következő lépés"],
  "book.nextMake": ["Make story number {n}", "Búðu til sögu númer {n}", "Lag historie nummer {n}", "Készítsd el a(z) {n}. mesét"],
  "book.nextContinue": ["Finish “{title}”", "Kláraðu söguna „{title}“", "Gjør ferdig «{title}»", "Fejezd be: „{title}”"],
  "book.nextRead": ["All the stories are here. Time to read!", "Allar sögurnar eru komnar. Nú má lesa!", "Alle historiene er her. Nå kan vi lese!", "Minden mese elkészült. Lehet olvasni!"],
  "book.inProgress": ["Being made…", "Í smíðum…", "Under arbeid…", "Készül…"],
  "book.empty": ["Not made yet", "Ekki til enn", "Ikke laget ennå", "Még nem készült el"],
  "book.by": ["by {name}", "Höfundur: {name}", "av {name}", "írta: {name}"],
  "book.go": ["Let's go!", "Af stað!", "Kom igjen!", "Gyerünk!"],
  "book.pdf": ["Make a PDF", "Búa til PDF", "Lag PDF", "PDF készítése"],

  // New story
  "new.title": ["Make a new book", "Búa til nýja bók", "Lag en ny bok", "Új könyv készítése"],
  "new.into": ["This story goes into “{book}”", "Þessi saga fer í bókina „{book}“", "Denne historien kommer i «{book}»", "Ez a mese ide kerül: „{book}”"],
  "new.how": ["How do you want to start?", "Hvernig viltu byrja?", "Hvordan vil du begynne?", "Hogyan szeretnéd elkezdeni?"],
  "new.prompt": ["Tell my idea", "Segja frá hugmyndinni minni", "Fortell ideen min", "Elmondom az ötletemet"],
  "new.promptSub": ["Write it in your own words", "Skrifaðu hana með þínum eigin orðum", "Skriv den med dine egne ord", "Írd le a saját szavaiddal"],
  "new.wizard": ["Answer questions", "Svara spurningum", "Svar på spørsmål", "Kérdésekre válaszolok"],
  "new.wizardSub": ["I'll help you, one step at a time", "Ég hjálpa þér, eitt skref í einu", "Jeg hjelper deg, ett steg om gangen", "Segítek, lépésről lépésre"],
  "new.promptLabel": ["What is your story about?", "Um hvað er sagan þín?", "Hva handler historien din om?", "Miről szól a meséd?"],
  "new.promptPlaceholder": [
    "A whale who is afraid of the dark and finds a glowing friend…",
    "Hvalur sem er hræddur við myrkrið og eignast lýsandi vin…",
    "En hval som er redd for mørket og finner en lysende venn…",
    "Egy bálna, aki fél a sötétben, és talál egy világító barátot…",
  ],
  "new.lang": ["Which language should the story be in?", "Á hvaða máli á sagan að vera?", "Hvilket språk skal historien være på?", "Milyen nyelven legyen a mese?"],
  "new.langSub": ["You get it in all four languages afterwards.", "Þú færð hana svo á öllum fjórum málunum.", "Etterpå får du den på alle fire språkene.", "Utána mind a négy nyelven megkapod."],
  "new.go": ["Make my book!", "Búðu til bókina mína!", "Lag boken min!", "Készítsd el a könyvemet!"],
  "new.next": ["Next", "Áfram", "Neste", "Tovább"],
  "new.back": ["Back", "Til baka", "Tilbake", "Vissza"],
  "new.own": ["My own idea", "Mín eigin hugmynd", "Min egen idé", "Saját ötlet"],
  "new.ownPlaceholder": ["Write your own…", "Skrifaðu þína eigin…", "Skriv din egen…", "Írd le a sajátodat…"],
  "new.heroName": ["What is the hero called?", "Hvað heitir hetjan?", "Hva heter helten?", "Hogy hívják a főhőst?"],
  "new.heroNamePlaceholder": ["A name (or leave it empty)", "Nafn (eða hafðu autt)", "Et navn (eller la det stå tomt)", "Egy név (vagy hagyd üresen)"],
  "new.extra": ["Anything else that must be in the story?", "Á eitthvað fleira að vera í sögunni?", "Er det noe mer som må være med i historien?", "Legyen még valami a mesében?"],
  "new.extraPlaceholder": ["A purple bike, my cat…", "Fjólublátt hjól, kötturinn minn…", "En lilla sykkel, katten min…", "Egy lila bicikli, a macskám…"],
  "new.step": ["Step {n} of {total}", "Skref {n} af {total}", "Steg {n} av {total}", "{n}. lépés / {total}"],

  // Studio (the making of a story)
  "studio.title": ["Your book is being made", "Bókin þín er í smíðum", "Boken din blir laget", "Készül a könyved"],
  "studio.step1": ["Write the story", "Skrifa söguna", "Skrive historien", "A mese megírása"],
  "studio.step2": ["Paint the pictures", "Mála myndirnar", "Male bildene", "A képek megfestése"],
  "studio.step3": ["The other languages", "Hin tungumálin", "De andre språkene", "A többi nyelv"],
  "studio.writing": ["The writer is inventing your story…", "Höfundurinn er að semja söguna þína…", "Forfatteren dikter historien din…", "Az író éppen kitalálja a mesédet…"],
  "studio.painting": ["Painting picture {n} of {total}…", "Mála mynd {n} af {total}…", "Maler bilde {n} av {total}…", "Készül a(z) {n}. kép a(z) {total}-ból…"],
  "studio.translating": ["Telling the story in the other languages…", "Segi söguna á hinum tungumálunum…", "Forteller historien på de andre språkene…", "A mese elmesélése a többi nyelven…"],
  "studio.wait": [
    "This takes a few minutes. You can start reading while the pictures are painted!",
    "Þetta tekur nokkrar mínútur. Þú mátt byrja að lesa á meðan myndirnar eru málaðar!",
    "Dette tar noen minutter. Du kan begynne å lese mens bildene blir malt!",
    "Ez eltart néhány percig. Már olvashatsz is, amíg a képek készülnek!",
  ],
  "studio.writeWait": [
    "This takes about a minute. Keep this page open.",
    "Þetta tekur um það bil eina mínútu. Hafðu síðuna opna.",
    "Dette tar omtrent ett minutt. La siden stå åpen.",
    "Ez körülbelül egy percig tart. Hagyd nyitva az oldalt.",
  ],
  "studio.done": ["Your book is ready!", "Bókin þín er tilbúin!", "Boken din er ferdig!", "Elkészült a könyved!"],
  "studio.retry": ["Try again", "Reyna aftur", "Prøv igjen", "Újra"],
  "studio.pagePainting": ["The painter is working on this picture…", "Málarinn er að vinna í þessari mynd…", "Maleren jobber med dette bildet…", "A festő éppen ezen a képen dolgozik…"],

  // Reader
  "reader.start": ["Start reading", "Byrja að lesa", "Begynn å lese", "Kezdjük az olvasást"],
  "reader.listen": ["Read to me", "Lestu fyrir mig", "Les for meg", "Olvasd fel"],
  "reader.stop": ["Stop", "Stoppa", "Stopp", "Állj"],
  "reader.magic": ["Magic", "Töfrar", "Magi", "Varázslat"],
  "reader.next": ["Next page", "Næsta síða", "Neste side", "Következő oldal"],
  "reader.prev": ["Previous page", "Fyrri síða", "Forrige side", "Előző oldal"],
  "reader.end": ["The End", "Endir", "Slutt", "Vége"],
  "reader.again": ["Read again", "Lesa aftur", "Les igjen", "Olvassuk újra"],
  "reader.toBook": ["Back to the book", "Aftur í bókina", "Tilbake til boken", "Vissza a könyvhöz"],
  "reader.full": ["Full screen", "Allur skjárinn", "Fullskjerm", "Teljes képernyő"],
  "reader.tapHint": ["Tap the picture — things move!", "Ýttu á myndina — hlutirnir hreyfast!", "Trykk på bildet — ting beveger seg!", "Koppints a képre — megmozdul!"],
  "reader.noVoice": [
    "This device has no voice for this language.",
    "Þetta tæki á enga rödd fyrir þetta tungumál.",
    "Denne enheten har ingen stemme for dette språket.",
    "Ezen az eszközön nincs hang ehhez a nyelvhez.",
  ],
  "reader.more": ["More", "Meira", "Mer", "Több"],
  "reader.edit": ["Fix the text", "Laga textann", "Rett teksten", "Szöveg javítása"],
  "reader.save": ["Save", "Vista", "Lagre", "Mentés"],
  "reader.cancel": ["Cancel", "Hætta við", "Avbryt", "Mégse"],
  "reader.repaint": ["Paint this picture again", "Mála þessa mynd aftur", "Mal dette bildet på nytt", "Fesd újra ezt a képet"],
  "reader.delete": ["Delete the story", "Eyða sögunni", "Slett historien", "Mese törlése"],
  "reader.deleteSure": ["Delete this story forever?", "Eyða þessari sögu fyrir fullt og allt?", "Slette denne historien for alltid?", "Végleg törlöd ezt a mesét?"],
  "reader.missingLang": [
    "This story isn't in this language yet. It is on its way!",
    "Sagan er ekki til á þessu máli enn. Hún er á leiðinni!",
    "Historien finnes ikke på dette språket ennå. Den er på vei!",
    "Ez a mese még nincs meg ezen a nyelven. Már úton van!",
  ],
  "reader.inventedBy": ["Invented by {name}", "Hugmynd: {name}", "Funnet på av {name}", "Kitalálta: {name}"],
  "reader.page": ["Page {n} of {total}", "Síða {n} af {total}", "Side {n} av {total}", "{n}. oldal / {total}"],

  // PDF
  "pdf.title": ["Make a PDF", "Búa til PDF", "Lag PDF", "PDF készítése"],
  "pdf.read": ["For reading", "Til að lesa", "For lesing", "Olvasáshoz"],
  "pdf.readSub": ["A small file for tablets and phones", "Lítil skrá fyrir spjaldtölvur og síma", "En liten fil for nettbrett og mobil", "Kis fájl táblagépre és telefonra"],
  "pdf.print": ["For the printer at home", "Fyrir prentarann heima", "For skriveren hjemme", "Otthoni nyomtatáshoz"],
  "pdf.printSub": ["A4 pages with margins", "A4-síður með spássíum", "A4-sider med marger", "A4-es oldalak margóval"],
  "pdf.publish": ["For a print shop", "Fyrir prentsmiðju", "For et trykkeri", "Nyomdának"],
  "pdf.publishSub": [
    "8 × 10 inches, 300 dpi, with bleed",
    "8 × 10 tommur, 300 dpi, með blæðingu",
    "8 × 10 tommer, 300 dpi, med utfall",
    "8 × 10 hüvelyk, 300 dpi, kifutóval",
  ],
  "pdf.lang": ["Language", "Tungumál", "Språk", "Nyelv"],
  "pdf.making": ["Making page {n} of {total}…", "Bý til síðu {n} af {total}…", "Lager side {n} av {total}…", "Készül a(z) {n}. oldal a(z) {total}-ból…"],
  "pdf.close": ["Close", "Loka", "Lukk", "Bezárás"],
  "pdf.notReady": [
    "Nothing to print yet — the stories are still being made.",
    "Ekkert til að prenta enn — sögurnar eru enn í smíðum.",
    "Ingenting å skrive ut ennå — historiene er fortsatt under arbeid.",
    "Még nincs mit nyomtatni — a mesék még készülnek.",
  ],

  // Grown-ups
  "parent.title": ["Grown-ups", "Fullorðnir", "Voksne", "Felnőttek"],
  "parent.kids": ["Children", "Börn", "Barn", "Gyerekek"],
  "parent.kidsEmpty": [
    "Add the first child so they can log in with their own code.",
    "Bættu við fyrsta barninu svo það geti skráð sig inn með eigin kóða.",
    "Legg til det første barnet, så det kan logge inn med sin egen kode.",
    "Add hozzá az első gyereket, hogy a saját kódjával beléphessen.",
  ],
  "parent.add": ["Add a child", "Bæta við barni", "Legg til et barn", "Gyerek hozzáadása"],
  "parent.edit": ["Change", "Breyta", "Endre", "Módosítás"],
  "parent.name": ["Name", "Nafn", "Navn", "Név"],
  "parent.age": ["Age", "Aldur", "Alder", "Életkor"],
  "parent.pin": ["Four-digit code", "Fjögurra stafa kóði", "Firesifret kode", "Négyjegyű kód"],
  "parent.pinKeep": ["New code (leave empty to keep the old one)", "Nýr kóði (hafðu autt til að halda þeim gamla)", "Ny kode (la stå tomt for å beholde den gamle)", "Új kód (hagyd üresen, ha marad a régi)"],
  "parent.lang": ["Language", "Tungumál", "Språk", "Nyelv"],
  "parent.picture": ["Picture", "Mynd", "Bilde", "Kép"],
  "parent.color": ["Colour", "Litur", "Farge", "Szín"],
  "parent.save": ["Save", "Vista", "Lagre", "Mentés"],
  "parent.cancel": ["Cancel", "Hætta við", "Avbryt", "Mégse"],
  "parent.remove": ["Remove", "Fjarlægja", "Fjern", "Eltávolítás"],
  "parent.removeSure": [
    "Remove {name}? Their stories stay on the shelf.",
    "Viltu fjarlægja þetta barn: {name}? Sögurnar verða áfram í hillunni.",
    "Fjerne {name}? Historiene blir stående i hyllen.",
    "Eltávolítod: {name}? A meséi a polcon maradnak.",
  ],
  "parent.setup": ["Setup", "Uppsetning", "Oppsett", "Beállítás"],
  "parent.writerOk": ["Writer and painter are connected", "Höfundur og málari eru tengdir", "Forfatter og maler er koblet til", "Az író és a festő csatlakoztatva"],
  "parent.writerMissing": [
    "ANTHROPIC_API_KEY is missing — stories cannot be made yet",
    "ANTHROPIC_API_KEY vantar — ekki er hægt að búa til sögur enn",
    "ANTHROPIC_API_KEY mangler — historier kan ikke lages ennå",
    "Hiányzik az ANTHROPIC_API_KEY — még nem készíthetők mesék",
  ],
  "parent.voiceOk": ["The reading voice is connected", "Upplestrarröddin er tengd", "Lesestemmen er koblet til", "A felolvasó hang csatlakoztatva"],
  "parent.voiceMissing": [
    "OPENAI_API_KEY is missing — the device's own voice is used",
    "OPENAI_API_KEY vantar — rödd tækisins sjálfs er notuð",
    "OPENAI_API_KEY mangler — enhetens egen stemme brukes",
    "Hiányzik az OPENAI_API_KEY — az eszköz saját hangja szól",
  ],
  "parent.toShelf": ["Go to the bookshelf", "Fara í bókahilluna", "Gå til bokhyllen", "Irány a könyvespolc"],
  "parent.books": ["Books", "Bækur", "Bøker", "Könyvek"],
  "parent.deleteBook": ["Delete", "Eyða", "Slett", "Törlés"],
  "parent.deleteBookSure": [
    "Delete “{title}” and all its stories?",
    "Eyða bókinni „{title}“ og öllum sögunum í henni?",
    "Slette «{title}» og alle historiene i den?",
    "Törlöd ezt: „{title}”, az összes mesével együtt?",
  ],
} satisfies Record<string, Row>;

export type MsgKey = keyof typeof M;
export type T = (key: MsgKey, vars?: Record<string, string | number>) => string;

export function translator(lang: Lang): T {
  const i = LANGS.indexOf(lang);
  return (key, vars) => {
    const row: Row = M[key];
    const text = row[i] || row[0];
    return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : text;
  };
}

/** Translates an API error code; unknown codes fall back to the generic message. */
export function errorText(t: T, code: unknown): string {
  const key = `err.${typeof code === "string" ? code : ""}`;
  return key in M ? t(key as MsgKey) : t("err.generic");
}
