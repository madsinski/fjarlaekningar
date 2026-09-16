// Persónuverndarstefna fyrir starfsfólk og samstarfsaðila Fjarlækninga —
// birt á /personuvernd-starfsfolks. Sjúklingar hafa sína eigin stefnu
// (legal_documents: notkunarskilmalar-og-personuverndarstefna).
//
// ALLT HÉR Á AÐ LÝSA ÞVÍ SEM KERFIN GERA Í RAUN. Breytist vinnslan — nýr
// þjónustuaðili, ný gögn, ný tenging — þarf að uppfæra textann, hækka útgáfu og
// dagsetningu. Enski kaflinn um Google er það sem Google les við yfirferð
// OAuth-forritsins; hann verður að passa við umfangið í src/lib/google-calendar.ts.

export const STAFF_PRIVACY_VERSION = "1.2";
export const STAFF_PRIVACY_UPDATED = "16.9.2026";

export const STAFF_PRIVACY_IS = `
## 1. Um þessa stefnu

Þessi stefna lýsir því hvernig Fjarlækningar ehf. vinna persónuupplýsingar um fólk sem **vinnur með okkur** — ekki um sjúklinga (um þá gildir [persónuverndarstefna þjónustunnar](/skjol/notkunarskilmalar-og-personuverndarstefna)). Hún á við um:

- **starfsfólk og verktaka Fjarlækninga** sem nota stjórnborðið (fjarlaekningar.is/admin),
- **lækna á vaktaskrá Fjarlækninga** (persónulegur vaktahlekkur),
- **lækna í vaktakerfi HSU** í Vestmannaeyjum (fjarlaekningar.is/hsu),
- **notendur Vinnustöðvar Fjarlækninga** — hjúkrunarfræðinga og annað starfsfólk samstarfsstofnana (fjarlaekningar.is/vinnustod).

Vinnslan fer fram í samræmi við lög nr. 90/2018 um persónuvernd og vinnslu persónuupplýsinga og reglugerð (ESB) 2016/679 (GDPR).

## 2. Ábyrgðaraðili

**Fjarlækningar ehf.**, kt. 480922-0340, Hofsvallagötu 57, 107 Reykjavík, er ábyrgðaraðili þeirrar vinnslu sem hér er lýst.

Persónuverndarfulltrúi / tengiliður: **Mads Christian Aanesen**, [mads@fjarlaekningar.is](mailto:mads@fjarlaekningar.is). Almennar fyrirspurnir: [fjarlaekningar@fjarlaekningar.is](mailto:fjarlaekningar@fjarlaekningar.is).

## 3. Hvaða upplýsingar eru unnar

### Starfsfólk og verktakar (stjórnborð)

- Nafn, netfang, símanúmer, starfsheiti og hlutverk í kerfinu.
- Innskráning: lykilorð og tveggja þrepa auðkenning (hjá innskráningarþjónustu okkar, sjá kafla 6).
- Samþykki trúnaðar- og notkunarskilmála: útgáfa, tími, IP-tala og vafri.
- Verktakasamningar: texti samnings og rafræn undirritun — nafn, kennitala, tími, IP-tala og vafri — ásamt undirrituðu PDF-skjali.
- Upplýsingar til reikningsgerðar: kennitala, símanúmer, bankareikningur, hvort reikningsfært er í eigin nafni eða félags (nafn, kennitala og bankareikningur félags) og VSK-staða.
- Reikningar: tímabil, vaktir, skráður fjöldi sjúklinga, taxti, upphæð og staða greiðslu.
- Skjöl sem þér eða okkur er falið að geyma (t.d. undirrituð skjöl) og upplýsingar í tölvupóstundirskrift.
- Hver skráði eða breytti efni í stjórnborðinu.

### Læknar á vaktaskrá Fjarlækninga

- Nafn, netfang og litur í vaktatöflu.
- Óskir um vaktir: hámarksfjöldi, vikudagar, lengd vaktalota, athugasemdir og fjarvera.
- Vaktir, skráður fjöldi sjúklinga á vakt og vaktaskipti.
- Persónulegur vaktahlekkur og dagatalshlekkur (sjá kafla 5).

### Læknar í vaktakerfi HSU

- Nafn, netfang, símanúmer, starfsheiti, hlutverk og starfshlutfall.
- Lykilorð og fjögurra stafa aðgangskóði — **aðeins geymd sem einstefnutætigildi** (scrypt), aldrei í læsilegu formi.
- Innskráningar: tími, vafri og tæki sem þú hefur treyst; misheppnaðar tilraunir og tímabundin læsing.
- Óskir (dagar, vikudagar, fyrir/eftir hádegi, fjöldi vakta, athugasemdir), vaktaplan, staðfestingar, skráning vinnustunda, vaktaskipti og tilkynningar.
- Aðgerðaskrá yfir breytingar í kerfinu (hver gerði hvað og hvenær).
- Dagatalshlekkur og, ef þú tengir, Google-dagatal (sjá kafla 5).

### Notendur Vinnustöðvar

- Nafn, netfang, vinnustaður og starfsheiti; hvort aðgangur kom með boði eða nýskráningu.
- Lykilorð og aðgangskóði — aðeins sem einstefnutætigildi; innskráningar, vafri og tæki sem þú hefur treyst.

### Allir sem nota Vinnustöðina

Starfsfólk Fjarlækninga og læknar vaktakerfis HSU geta líka notað Vinnustöðina með sinni innskráningu.

- Spurningar og skilaboð milli þín og Fjarlækninga, með nafni, netfangi og vinnustað.
- **SMS-sendingar:** hver sendi, hvenær, símanúmer viðtakanda, texti skeytisins (getur innihaldið fornafn sjúklings sem þú slærð inn) og hvort skeytið komst til skila. Símanúmer og nafn sjúklings eru upplýsingar um sjúklinginn og eru aðeins notuð til að senda hlekkinn og fylgjast með að hann berist.

- **Tilkynningar í tæki (valfrjálst):** ef þú kveikir á tilkynningum vistum við áskriftarslóðina sem vafrinn gefur upp og tegund vafrans, svo hægt sé að láta þig vita af nýjum skilaboðum þótt síðan sé lokuð. Tilkynningin fer um tilkynningaþjónustu vafrans (t.d. Google, Apple eða Mozilla) og inniheldur fyrirsögn samtalsins. Þú slekkur á þeim í Vinnustöðinni eða í stillingum vafrans, og þá er áskriftinni eytt.
- **Gervigreindarmat („Hentar erindið Fjarlækningum?“):** textinn sem þú límir inn er sendur til OpenAI til mats og svarið birt þér. Áður en hann er sendur eru kennitölur, símanúmer og netföng fjarlægð sjálfkrafa. Hvorki textinn né svarið eru vistuð hjá okkur. Við skráum aðeins að mat hafi verið gert, til að takmarka fjölda mata.

Vinsamlega skrifaðu **aldrei** heilsufarsupplýsingar um nafngreinda sjúklinga í spurningar eða skilaboð í Vinnustöðinni, og settu ekki nöfn eða aðrar persónuupplýsingar í gervigreindarmatið.

### Allir hópar

- Til að verjast innbrotstilraunum eru IP-tala og netfang skráð við innskráningartilraunir í vaktakerfi HSU og Vinnustöðinni og þeirri skráningu eytt þegar sólarhringur er liðinn.
- Villur í kerfinu eru skráðar með slóð og upplýsingum um vafra.
- Tölvupóstar sem kerfið sendir þér (boð, staðfestingar, tilkynningar, svör).

## 4. Tilgangur og heimild

- **Samningur (6. gr. 1. mgr. b-liður GDPR):** að veita þér aðgang, skipuleggja vaktir, gera verktakasamninga og greiða fyrir unnin störf.
- **Lagaskylda (c-liður):** bókhald og reikningar samkvæmt lögum nr. 145/1994 um bókhald.
- **Lögmætir hagsmunir (f-liður):** öryggi kerfanna (innskráningarskrár, læsing, aðgerðaskrá, villuskrá), samskipti við samstarfsstofnanir og að gera starfsfólki þeirra kleift að vísa sjúklingum á þjónustuna.
- **Samþykki (a-liður):** tenging við Google-dagatal. Tengingin er valfrjáls og þú getur rofið hana hvenær sem er.

Upplýsingarnar eru ekki notaðar til markaðssetningar, ekki seldar og ekki notaðar til sjálfvirkrar ákvarðanatöku sem hefur réttaráhrif á þig.

## 5. Dagatöl

**Dagatalshlekkur (Apple, Outlook, Google o.fl.).** Þú getur gerst áskrifandi að vöktunum þínum með leynilegum hlekk. Hver sem hefur hlekkinn sér vaktirnar þínar og nafn, svo farðu með hann eins og lykilorð. Í vaktakerfi HSU geturðu búið til nýjan hlekk hvenær sem er, og þá hættir sá gamli að virka; á vaktaskrá Fjarlækninga gerir stjórnandi það fyrir þig. Hlekkurinn hættir að virka ef aðgangur er óvirkjaður.

**Google-dagatal.** Ef þú velur að tengja Google-reikning:

- Við biðjum aðeins um heimildina *calendar.app.created* („sjá, búa til og breyta dagatölum sem forritið býr til“). Við búum til **eitt sérstakt dagatal** („Fjarlækningar — vaktir“ eða „HSU — vaktir“) og skrifum vaktirnar þínar í það: dagsetningu, tíma, tegund vaktar og athugasemd við vaktina.
- Við **getum ekki** lesið önnur dagatöl þín, atburði, tengiliði, tölvupóst eða annað í Google-reikningnum.
- Frá Google fáum við netfang og auðkenni reikningsins, til að sýna þér hvaða reikningur er tengdur, og aðgangslykla sem gera okkur kleift að uppfæra dagatalið þegar vaktir breytast. Lyklarnir eru geymdir í gagnagrunni okkar sem er lokaður öllum nema netþjóni kerfisins.
- Upplýsingar frá Google eru aðeins notaðar til að halda vaktadagatalinu uppfærðu. Þær eru ekki seldar, ekki deilt með öðrum, ekki notaðar í auglýsingaskyni og ekki notaðar til að þjálfa gervigreind.
- **Aftenging:** þegar þú aftengir (á vaktasíðunni þinni) eyðum við dagatalinu sem við bjuggum til, ógildum heimildina hjá Google og eyðum lyklunum. Það sama gerist ef aðgangi þínum er eytt. Þú getur líka afturkallað heimildina á [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

Notkun og flutningur Fjarlækninga á upplýsingum sem fást frá Google API fylgir [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), þar á meðal kröfum um takmarkaða notkun (Limited Use).

## 6. Vinnsluaðilar og hvar gögnin eru

Við notum eftirfarandi þjónustuaðila, sem vinna upplýsingar aðeins samkvæmt fyrirmælum okkar:

- **Supabase** — gagnagrunnur, innskráning starfsfólks og skjalageymsla. Gögnin eru hýst á Írlandi (innan EES).
- **Vercel** — hýsing vefsins og kerfanna. Netþjónaföllin keyra í Dublin á Írlandi.
- **Resend** — sending tölvupósts frá kerfunum.
- **Twilio** — sending SMS úr Vinnustöðinni (fær símanúmer viðtakanda og texta skeytisins).
- **OpenAI** — gervigreindarmat í Vinnustöðinni (fær aðeins textann sem límdur er inn, eftir að kennitölur, símanúmer og netföng hafa verið fjarlægð). Samkvæmt skilmálum OpenAI er efni sem sent er um forritaskil þess ekki notað til að þjálfa líkön; við biðjum OpenAI um að vista það ekki.
- **Google** — aðeins ef þú tengir Google-dagatal (sjá kafla 5).
- **Tilkynningaþjónusta vafrans** (Google, Apple eða Mozilla, eftir vafra) — aðeins ef þú kveikir á tilkynningum í tæki; ber tilkynninguna til tækisins.

Resend, Twilio, OpenAI, Google og Vercel eru bandarísk fyrirtæki. Berist upplýsingar út fyrir EES byggir flutningurinn á gildum flutningsheimildum samkvæmt GDPR, svo sem stöðluðum samningsákvæðum framkvæmdastjórnar ESB eða EU–US Data Privacy Framework.

Upplýsingum er ekki miðlað til annarra nema lög krefjist þess. Stjórnendur HSU sjá upplýsingar um lækna í vaktakerfi HSU (nafn, óskir, vaktir) eins og þarf til að skipuleggja vaktir, og stjórnandi Fjarlækninga sér samtöl og SMS-skrá Vinnustöðvar.

## 7. Varðveislutími

- Í vaktakerfi HSU og Vinnustöðinni gilda **innskráningarlotur** í 12 klukkustundir og **traust tæki** í 90 daga. Þeim er eytt við útskráningu, breytingu á lykilorði eða þegar aðgangur er óvirkjaður.
- **Skráning innskráningartilrauna** er eytt þegar sólarhringur er liðinn.
- **Aðgangur og tengdar upplýsingar** eru varðveittar meðan þú starfar með okkur. Þegar samstarfi lýkur er aðgangi lokað og upplýsingum eytt þegar þeirra er ekki lengur þörf.
- **Samningar, reikningar og bókhaldsgögn** eru varðveitt í sjö ár samkvæmt lögum nr. 145/1994 um bókhald.
- **Vaktasaga** er varðveitt vegna uppgjörs og eftirlits; sé læknisprófíl eytt stendur vaktin eftir án tengingar við hann.
- **Samtöl og SMS-skrá** eru varðveitt meðan þeirra er þörf vegna þjónustunnar og eftirlits með henni.

## 8. Öryggi

- Öll samskipti við kerfin fara um dulkóðaða tengingu (HTTPS).
- Starfsfólk Fjarlækninga skráir sig inn með tveggja þrepa auðkenningu.
- Lykilorð og aðgangskóðar eru aðeins geymd sem einstefnutætigildi; aðgangur læsist tímabundið eftir endurteknar rangar tilraunir og aðgangskóði virkar aðeins á tæki sem áður hefur verið skráð inn á með lykilorði.
- Innskráningarkökur vaktakerfis HSU og Vinnustöðvar eru ekki aðgengilegar forskriftum á vefsíðum.
- Gagnagrunnurinn er lokaður vöfrum; aðeins netþjónn kerfisins les og skrifar gögn, og hver notandi sér aðeins það sem hlutverk hans leyfir.
- Starfsfólk Fjarlækninga er bundið þagnarskyldu.

Verði öryggisbrestur sem varðar persónuupplýsingar þínar tilkynnum við hann til Persónuverndar innan 72 klukkustunda þegar það á við, og þér ef hann er líklegur til að hafa í för með sér mikla áhættu fyrir þig.

## 9. Réttindi þín

Þú átt rétt á að fá aðgang að upplýsingum um þig, fá þær leiðréttar, fá þeim eytt, takmarka vinnslu, fá þær afhentar á tölvutæku formi og andmæla vinnslu sem byggir á lögmætum hagsmunum. Þú getur afturkallað samþykki (t.d. Google-tengingu) hvenær sem er. Réttindin geta sætt takmörkunum, t.d. þegar lög krefjast þess að gögn séu varðveitt.

Sendu beiðni á [mads@fjarlaekningar.is](mailto:mads@fjarlaekningar.is) eða um [beiðnaform okkar](/personuverndarbeidni). Við svörum innan mánaðar.

Þú getur einnig lagt fram kvörtun hjá **Persónuvernd**, Laugavegi 166, 4. hæð, 105 Reykjavík, [postur@personuvernd.is](mailto:postur@personuvernd.is).

## 10. Breytingar

Við uppfærum þessa stefnu þegar vinnslan breytist. Útgáfunúmer og dagsetning efst á síðunni sýna hvenær henni var síðast breytt.
`;

export const STAFF_PRIVACY_EN = `
## Summary

This notice explains how **Fjarlækningar ehf.** (reg. no. 480922-0340, Hofsvallagötu 57, 107 Reykjavík, Iceland) processes personal data about the people who work with us: our staff and contractors, doctors on the Fjarlækningar and HSU Vestmannaeyjar shift rosters, and staff of partner health centres who use the Fjarlækningar workstation. The Icelandic text above is the full notice; this section summarises it. Contact: [mads@fjarlaekningar.is](mailto:mads@fjarlaekningar.is).

We process account details (name, email, phone, role), sign-in data (password and PIN stored only as one-way hashes, sessions, trusted devices, and the IP address of sign-in attempts, deleted after 24 hours), shift preferences and schedules, contract and invoicing details for contractors, and messages and SMS logs from the workstation. Data is hosted by Supabase in Ireland and our server functions run on Vercel in Dublin; email is sent through Resend and SMS through Twilio; if you turn on device notifications, they are delivered through your browser's push service (Google, Apple or Mozilla) and contain the conversation subject. Text pasted into the workstation's AI suitability check is sent to OpenAI after national ID numbers, phone numbers and email addresses are removed; it is not stored by us. Where data leaves the EEA, transfers rely on valid GDPR transfer mechanisms. You have the rights of access, rectification, erasure, restriction, portability and objection, and may complain to Persónuvernd, the Icelandic Data Protection Authority.

## Google user data

Doctors may choose to connect a Google account so their shifts appear in Google Calendar.

- **Data accessed:** we request only the https://www.googleapis.com/auth/calendar.app.created scope. With it we create **one secondary calendar** ("Fjarlækningar — vaktir" or "HSU — vaktir") and create, update and delete shift events in that calendar only. We cannot see your other calendars, events, contacts, email or any other Google data. From Google's sign-in response we receive your Google account email address and account ID, which we use only to show you which account is connected.
- **Data use:** Google user data is used solely to keep your shift calendar up to date. It is not used for advertising, not sold, not used to train AI or machine-learning models, and not used for any other purpose.
- **Data sharing:** we do not share Google user data with anyone. It is processed only by our hosting and database providers (Vercel, Supabase) on our behalf.
- **Storage and protection:** OAuth tokens, the connected email address and the ID of the calendar we created are stored in our database, which is closed to browsers and read only by our server over encrypted connections. Our staff access it only when needed for support, security or legal reasons.
- **Retention and deletion:** when you disconnect (on your shift page), or when your account is deleted, we delete the calendar we created, revoke our access with Google and delete the stored tokens. You can also revoke access at any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

Fjarlækningar' use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.
`;
