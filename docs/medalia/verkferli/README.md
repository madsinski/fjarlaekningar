# Verkferli — þrjú ný erindi

Textar fyrir sjúklingagáttina og svarsniðmát fyrir lækni, fyrir erindin þrjú sem
bættust við í ágúst 2026.

| Erindi | Skrá | Spurningalisti |
|---|---|---|
| Almenn læknisþjónusta | [almenn-laeknisthjonusta.md](almenn-laeknisthjonusta.md) | `opin-beidni.json` (eða `opin-beidni-stutt.json`) |
| Húðvandamál og útbrot | [hudvandamal-utbrot.md](hudvandamal-utbrot.md) | `hudvandamal.json` |
| Augnsýkingar og augnlokavandamál | [augnsykingar-augnlokavandamal.md](augnsykingar-augnlokavandamal.md) | `augnsykingar.json` |

## Hvað er í hverri skrá

**Stuttur texti** — ein lína. Það sem stendur undir heitinu í valmyndinni
„Hvernig getum við aðstoðað þig?“. Sjúklingurinn les hana til að vita hvort hann
sé á réttum stað, svo hún þarf að nefna dæmi frekar en að lýsa þjónustunni.

**Langur texti** — það sem sjúklingurinn les eftir að hann velur erindið, áður en
hann byrjar á spurningalistanum. Þrír hlutar í fastri röð: hvað hentar, hvað
hentar ekki, og hvað gerist næst. Sá miðhluti er sá sem sparar bæði sjúklingi og
lækni tíma, því hann stöðvar erindi sem hvort eð er hefði endað í tilvísun.

**Svarsniðmát** — það sem læknirinn sendir til baka. Fastur rammi með reitum sem
læknirinn fyllir í. Ramminn er eins í öllum þremur svo svarið líti eins út
óháð erindi, en innihaldið er sérsniðið.

## Um sniðmátin

Ramminn er sá sami alls staðar:

```
Ávarp → MAT → MEÐFERÐ → HVERS MÁ VÆNTA → LEITAÐU AÐSTOÐAR EF → EFTIRFYLGD → Kveðja
```

Tveir hlutar eru fastir og á ekki að stytta:

- **LEITAÐU AÐSTOÐAR EF** er öryggisnetið. Í skriflegri þjónustu, þar sem enginn
  sér sjúklinginn aftur nema hann hafi samband sjálfur, er þetta sá hluti svarsins
  sem ber ábyrgðina. Hann á alltaf að nefna tiltekin einkenni fyrir þetta tiltekna
  vandamál, ekki bara „ef þér versnar“.
- **Neyðarlínan** — 112 og Læknavaktin 1700 — stendur í hverju einasta svari.

Textinn í hornklofum `[…]` er það sem læknirinn skrifar. Allt annað má standa
óbreytt.

## Staða

**Drög.** Klínískt innihald — hvað er meðhöndlað, hvaða meðferð er lögð til,
hvaða viðvörunarmerki eru talin upp — þarf yfirferð og samþykki læknis
Fjarlækninga áður en það fer í gáttina. Sama regla og gildir um texta
þjónustusíðanna, þar sem klínísku listarnir eru vísvitandi skildir eftir auðir
fyrir lækni að fylla.

Uppbyggingin sjálf, orðalag gagnvart sjúklingi og öryggisnetið eru tilbúin til
notkunar.
