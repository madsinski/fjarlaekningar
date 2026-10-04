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

  // New book
  "newbook.question": ["What is your book called?", "Hvað heitir bókin þín?", "Hva heter boken din?", "Mi a könyved címe?"],
  "newbook.placeholder": ["The name of the book", "Nafn bókarinnar", "Navnet på boken", "A könyv címe"],
  "newbook.create": ["Create the book", "Búa bókina til", "Lag boken", "Könyv létrehozása"],
  "newbook.later": ["Choose the name later", "Velja nafnið seinna", "Velg navnet senere", "Később választok címet"],
  "newbook.laterSub": [
    "The book borrows the name of your first story. You can change it any time.",
    "Bókin fær nafn fyrstu sögunnar þinnar að láni. Þú getur breytt því hvenær sem er.",
    "Boken låner navnet til den første historien din. Du kan endre det når som helst.",
    "A könyv az első meséd címét kapja kölcsön. Bármikor megváltoztathatod.",
  ],
  "newbook.or": ["or", "eða", "eller", "vagy"],

  // Cover and moving stories
  "cover.button": ["Cover", "Kápa", "Omslag", "Borító"],
  "cover.title": ["The cover of the book", "Kápa bókarinnar", "Omslaget til boken", "A könyv borítója"],
  "cover.ai": ["Paint a cover", "Mála kápu", "Mal et omslag", "Borító festése"],
  "cover.aiSub": ["The painter makes one from the stories in the book", "Málarinn býr hana til úr sögunum í bókinni", "Maleren lager det ut fra historiene i boken", "A festő a könyv meséiből készíti el"],
  "cover.drawing": ["Use my drawing", "Nota teikninguna mína", "Bruk tegningen min", "A rajzomat használom"],
  "cover.drawingSub": ["The painter turns your drawing into a cover", "Málarinn breytir teikningunni þinni í kápu", "Maleren gjør tegningen din om til et omslag", "A festő borítót készít a rajzodból"],
  "cover.image": ["Use a finished picture", "Nota tilbúna mynd", "Bruk et ferdig bilde", "Kész kép használata"],
  "cover.imageSub": ["It is shown exactly as it is", "Hún er sýnd nákvæmlega eins og hún er", "Det vises akkurat som det er", "Pontosan úgy jelenik meg, ahogy van"],
  "cover.remove": ["Remove the cover", "Fjarlægja kápuna", "Fjern omslaget", "Borító eltávolítása"],
  "cover.working": [
    "The painter is making the cover… This takes a minute or two.",
    "Málarinn er að búa til kápuna… Þetta tekur eina til tvær mínútur.",
    "Maleren lager omslaget… Det tar et minutt eller to.",
    "A festő készíti a borítót… Ez egy-két percig tart.",
  ],
  "move.button": ["Move to another book", "Færa í aðra bók", "Flytt til en annen bok", "Áthelyezés másik könyvbe"],
  "move.title": ["Which book should “{title}” go in?", "Í hvaða bók á sagan „{title}“ að fara?", "Hvilken bok skal «{title}» inn i?", "Melyik könyvbe kerüljön: „{title}”?"],
  "move.none": ["There is no other book yet. Make one first.", "Það er engin önnur bók til enn. Búðu fyrst til nýja.", "Det finnes ingen annen bok ennå. Lag en først.", "Még nincs másik könyv. Előbb készíts egyet."],

  // Book
  "book.rename": ["Change the name", "Breyta nafninu", "Endre navnet", "Cím módosítása"],
  "book.name": ["The name of the book", "Nafn bókarinnar", "Navnet på boken", "A könyv címe"],
  "book.addStory": ["Add a story", "Bæta við sögu", "Legg til en historie", "Új mese hozzáadása"],
  "book.nextFirst": ["Make the first story", "Búðu til fyrstu söguna", "Lag den første historien", "Készítsd el az első mesét"],
  "book.delete": ["Delete the book", "Eyða bókinni", "Slett boken", "Könyv törlése"],
  "shelf.count": ["Stories: {n}", "Sögur: {n}", "Historier: {n}", "Mesék: {n}"],
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
  "studio.polishing": [
    "Proofreading the Icelandic, word by word…",
    "Les yfir íslenskuna, orð fyrir orð…",
    "Leser korrektur på islandsken, ord for ord…",
    "Az izlandi szöveg ellenőrzése, szóról szóra…",
  ],
  "edit.checkIcelandic": ["Proofread the Icelandic", "Lesa yfir íslenskuna", "Les korrektur på islandsken", "Izlandi szöveg ellenőrzése"],
  "edit.checkingIcelandic": [
    "Proofreading the Icelandic… This takes a minute or two.",
    "Les yfir íslenskuna… Þetta tekur eina til tvær mínútur.",
    "Leser korrektur på islandsken… Det tar et minutt eller to.",
    "Az izlandi szöveg ellenőrzése… Ez egy-két percig tart.",
  ],
  "studio.sheet": [
    "The painter is designing the heroes of your story…",
    "Málarinn er að hanna hetjurnar í sögunni þinni…",
    "Maleren tegner heltene i historien din…",
    "A festő megtervezi a meséd hőseit…",
  ],
  "studio.refining": [
    "The painter is looking over picture {n} of {total} and touching it up…",
    "Málarinn fer yfir mynd {n} af {total} og lagar hana til…",
    "Maleren ser over bilde {n} av {total} og pusser på det…",
    "A festő átnézi és csinosítja a(z) {n}. képet a(z) {total}-ból…",
  ],
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

  // Editor (the book workshop: text, pictures, drag and drop)
  "edit.open": ["Change the book", "Breyta bókinni", "Endre boken", "Könyv szerkesztése"],
  "edit.title": ["Change the book", "Breyta bókinni", "Endre boken", "Könyv szerkesztése"],
  "edit.hint": [
    "Hold a ✋ button and drag to move a picture, a text or a whole page.",
    "Haltu ✋-hnappi niðri og dragðu til að færa mynd, texta eða heila síðu.",
    "Hold en ✋-knapp inne og dra for å flytte et bilde, en tekst eller en hel side.",
    "Tartsd lenyomva a ✋ gombot, és húzd arrébb a képet, a szöveget vagy az egész oldalt.",
  ],
  "edit.textLang": ["Which language are you writing in?", "Á hvaða máli ertu að skrifa?", "Hvilket språk skriver du på?", "Milyen nyelven írsz?"],
  "edit.storyTitle": ["Title", "Titill", "Tittel", "Cím"],
  "edit.summary": ["What the story is about", "Um hvað sagan er", "Hva historien handler om", "Miről szól a mese"],
  "edit.page": ["Page {n}", "Síða {n}", "Side {n}", "{n}. oldal"],
  "edit.movePage": ["Move page {n}", "Færa síðu {n}", "Flytt side {n}", "{n}. oldal áthelyezése"],
  "edit.movePicture": ["Move the picture on page {n}", "Færa myndina á síðu {n}", "Flytt bildet på side {n}", "A(z) {n}. oldal képének áthelyezése"],
  "edit.moveText": ["Move the text on page {n}", "Færa textann á síðu {n}", "Flytt teksten på side {n}", "A(z) {n}. oldal szövegének áthelyezése"],
  "edit.picture": ["Picture", "Mynd", "Bilde", "Kép"],
  "edit.text": ["Text", "Texti", "Tekst", "Szöveg"],
  "edit.noPicture": ["No picture yet", "Engin mynd enn", "Ikke noe bilde ennå", "Még nincs kép"],
  "edit.textPlaceholder": ["Write the text for this page…", "Skrifaðu textann á þessa síðu…", "Skriv teksten til denne siden…", "Írd ide az oldal szövegét…"],
  "edit.upload": ["Use my drawing", "Nota teikninguna mína", "Bruk tegningen min", "A rajzomat használom"],
  "edit.paint": ["Paint a picture", "Mála mynd", "Mal et bilde", "Kép festése"],
  "edit.drawingWorking": [
    "The painter is turning your drawing into a book picture… This takes a minute or two.",
    "Málarinn er að breyta teikningunni þinni í bókarmynd… Þetta tekur eina til tvær mínútur.",
    "Maleren gjør tegningen din om til et bokbilde… Det tar et minutt eller to.",
    "A festő könyvillusztrációt készít a rajzodból… Ez egy-két percig tart.",
  ],
  "edit.painting": ["The painter is painting… This takes a minute or two.", "Málarinn er að mála… Þetta tekur eina til tvær mínútur.", "Maleren maler… Det tar et minutt eller to.", "A festő dolgozik… Ez egy-két percig tart."],
  "edit.myDrawing": ["Your drawing", "Teikningin þín", "Tegningen din", "A te rajzod"],
  "edit.flip": ["Swap picture and text", "Víxla mynd og texta", "Bytt om bilde og tekst", "Kép és szöveg cseréje"],
  "edit.up": ["Move page {n} up", "Færa síðu {n} upp", "Flytt side {n} opp", "{n}. oldal feljebb"],
  "edit.down": ["Move page {n} down", "Færa síðu {n} niður", "Flytt side {n} ned", "{n}. oldal lejjebb"],
  "edit.deletePage": ["Delete page {n}", "Eyða síðu {n}", "Slett side {n}", "{n}. oldal törlése"],
  "edit.deletePageSure": ["Delete page {n}, with its picture and text?", "Eyða síðu {n}, með mynd og texta?", "Slette side {n}, med bilde og tekst?", "Törlöd a(z) {n}. oldalt a képpel és a szöveggel együtt?"],
  "edit.addPage": ["Add a page", "Bæta við síðu", "Legg til en side", "Új oldal"],
  "edit.saving": ["Saving…", "Vista…", "Lagrer…", "Mentés…"],
  "edit.saved": ["Saved", "Vistað", "Lagret", "Mentve"],
  "edit.done": ["Done — read the book", "Búið — lesa bókina", "Ferdig — les boken", "Kész — olvassuk el"],
  "edit.dropHere": ["Drop here", "Slepptu hér", "Slipp her", "Engedd el itt"],
  "err.bad_image": ["That picture didn't work. Try another photo.", "Þessi mynd virkaði ekki. Prófaðu aðra mynd.", "Det bildet fungerte ikke. Prøv et annet bilde.", "Ez a kép nem működött. Próbálj egy másikat."],
  "err.busy": ["The painter is already working on this page. Wait a moment.", "Málarinn er þegar að vinna í þessari síðu. Bíddu aðeins.", "Maleren jobber allerede med denne siden. Vent litt.", "A festő már dolgozik ezen az oldalon. Várj egy kicsit."],
  "err.too_many_pages": ["The book can't have more pages.", "Bókin getur ekki haft fleiri síður.", "Boken kan ikke ha flere sider.", "A könyvnek nem lehet több oldala."],
  "err.last_page": ["A book needs at least one page.", "Bók þarf að hafa að minnsta kosti eina síðu.", "En bok må ha minst én side.", "Egy könyvnek legalább egy oldala kell legyen."],

  // Story length
  "len.title": ["How long a story?", "Hversu löng saga?", "Hvor lang historie?", "Milyen hosszú legyen a mese?"],
  "len.short": ["Short", "Stutt", "Kort", "Rövid"],
  "len.medium": ["Medium", "Miðlungs", "Middels", "Közepes"],
  "len.long": ["Long", "Löng", "Lang", "Hosszú"],
  "len.pages": ["{n} pages", "{n} síður", "{n} sider", "{n} oldal"],
  "len.wait": [
    "A longer story takes longer to make.",
    "Lengri saga er lengur í smíðum.",
    "En lengre historie tar lengre tid å lage.",
    "A hosszabb mese tovább készül.",
  ],
  "len.only": ["Only in the {length} version", "Aðeins í útgáfunni: {length}", "Bare i versjonen: {length}", "Csak ebben a változatban: {length}"],

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
    "No AI key is set (OPENAI_API_KEY or ANTHROPIC_API_KEY) — stories cannot be made yet",
    "Engan gervigreindarlykil er að finna (OPENAI_API_KEY eða ANTHROPIC_API_KEY) — ekki er hægt að búa til sögur enn",
    "Ingen KI-nøkkel er satt (OPENAI_API_KEY eller ANTHROPIC_API_KEY) — historier kan ikke lages ennå",
    "Nincs beállítva MI-kulcs (OPENAI_API_KEY vagy ANTHROPIC_API_KEY) — még nem készíthetők mesék",
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
