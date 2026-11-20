# Übergabe – Stand 20.11.2026

Online-Version **v38** (`sw.js`): https://bindochnichtbambi.github.io/nihongo-trainer/
Git ist auf diesem Computer installiert (`C:\Program Files\Git\cmd\git.exe`), Anmeldung bei GitHub läuft über den Browser. Hochladen am besten im Terminal-Tab des Benutzers (`git push`), weil die Anmeldung dort ein Fenster öffnen kann.

Konzept, Technik und Konventionen stehen in `CLAUDE.md`.

## Neu in v37 (20.11.2026, online)

- Vorlesen: Fragewörter, Kanji-Karten, Kanji-Quiz und Satzbau lesen die Kana vor (何 wurde als „ka“ gelesen). In Gesprächen werden Wörter mit 何 aus den Kana gelesen (`sayForm`).
- Vokabeln, Stufe Aussprechen: Bei sehr kurzen Wörtern (z. B. え) gibt es einen Hinweis, sie in einem kleinen Satz zu sagen („え です“). Ein Rahmen wie これは … です wird beim Vergleich entfernt.
- Zählwörter, Kanji (Lernen) und Schreiben haben denselben Aufbau: Auswahl-Karte oben, Kacheln „Was willst du üben?“, Tipp unten. Kanji hat dort einen Memory-Knopf.
- Offen: Die Stimmen gefallen der Person nicht. Optionen besprochen (Stimme auf dem Handy wählen oder fertige Aufnahmen, z. B. mit VOICEVOX), noch nicht entschieden.
- Kursunterlagen liegen in `C:\Users\Admin\Claude\Kursunterlagen` (nur lokal, nie hochladen, nicht abschreiben): Inhaltsverzeichnisse Rikai + Katsudoo (alle 18 Lektionen: Themen, Sätze, Kanji je Lektion) und Lektion 13 aus beiden Heften. Die Person ist bei **Lektion 13**.
- Danach angepasst:
  - Wortschatz: Gruppe „L13-14“ geteilt in `L13-13` (neu nach Kursbuch, dazu トラム/ケーブルカー der Person) und `L14-14` (vorläufig, gekürzt). Migration in app.js übernimmt Auswahl und Lernstand.
  - Kanji: Gruppen „nach Kurs-Lektion“ (`COURSE` in kanji.js, `course: true`), neue Kanji 口 卵 京. Kacheln in Kanji und Schreiben in Abschnitte geteilt (Kana / Kurs-Lektion / Thema).
  - Grammatik: neu „から・まで・で・のります“ und „〜が いいです・〜から“ (beide L13). 〜て ください bleibt bei L13 (kommt im Katsudoo-Heft L13 vor).
  - Fragewörter: どうやって neu; Lektionen von いつ, だれ, いくら, いくつ, どちら, どう, どんな nach Inhaltsverzeichnis.
  - Gespräche: „Mit dem Taxi“ und „Wie kommst du zum Flughafen?“ (Lektion 13, selbst geschrieben).

## Neu in v38 (20.11.2026, online)

- Inzwischen liegen **beide Hefte komplett** als Scans vor (`Kursunterlagen\Katsudo\topic1–9…pdf`, `Kursunterlagen\Rikai\topic1–9…pdf`).
- Wortschatz **Lektion 14–18 mit dem Kursbuch abgeglichen** (20.11.2026): `L14-14`, `L15-16`, `L17-18` enthalten jetzt nur Wörter aus Rikai und Katsudoo plus selbst geschriebene Beispielsätze. Wörter, die schon in früheren Lektionen stehen, sind nicht doppelt drin. Frühere geratene Zusatzwörter (z. B. ゆびわ, セーター, てんき, はる/なつ …) wurden entfernt. Gruppen-IDs unverändert, keine Migration nötig.
- Kanji `COURSE` für L16 (買百千万円) und L18 (行来会休本京) passt zum Kursbuch.
- Grammatik nach den Scans (20.11.2026): 〜ませんか jetzt L12 (Kurs: „いっしょに いきませんか“), Adjektive in der Vergangenheit jetzt L17 (nicht L12), 〜たいです jetzt L18. Neu: L14 „〜の まえ・となり・ちかく“ und „ゆうめいな おてら・ふるい じんじゃ“, L15 „〜が ほしいです“ und „あげます・もらいます“, L16 „この 〜・いくらですか・〜を ください“, L17 „どこにも・なにも 〜ません“, L18 „でも・そして・それから“.
- Fragewörter: neu なにいろ (L16); Beispiel von どう auf „やすみは どうでしたか“ (L17) geändert.
- Gespräche (selbst geschrieben): „Meine Stadt“ und „Wo bist du gerade?“ (L14), „Mitbringsel kaufen“ (L15), „Im Kleiderladen“ (L16), „Wie war das Wochenende?“ (L17), „Wie war die Reise?“ (L18). GLOSS um häufige Formen ergänzt (ありますか, でした, しました …).
- Nächster Schritt: passende Bücher (Bildergeschichten) für Lektion 14–18; Satz-Puzzles für L14–18.

## Neu in v36 (Rückmeldungen nach ein paar Tagen Testen)

- „Lesebücher“ heisst jetzt **„Bücher“**.
- **Zählwörter**: Antwortmodus und Reihenfolge stehen oben. Alle Kategorie-Kacheln sind gleich hoch, das Bild steht links neben dem Zeichen.
- **Gespräche**:
  - Stimmen passend zur Figur (Mann, Frau, Kind, älterer Mann). Tonhöhe angepasst, bei mehreren Stimmen eine passende gewählt.
  - Rollenspiel: Die Aufnahme stoppt nicht mehr zu früh. Pausen sind erlaubt; Ende durch nochmals Tippen.
  - Neu: **Füllwörter & Reaktionen** (えっと, あのう, そうですか, なるほど …) mit Erklärung, Beispielen und Quiz.
- **Wortschatz**: パートナー ersetzt durch かれし (彼氏), dazu かのじょ (彼女). Der Lernstand von パートナー wird übernommen. Familienwörter erklären jetzt, wann man welches Wort braucht (eigene Familie / Familie von anderen / Anrede).
- **Neu: Familie** (Kachel): Stammbaum zum Antippen, Umschalter „Meine Familie“ / „Familie von anderen“, Erklärung zur Anrede, Sammelwörter, Quiz mit 10 Fragen.
- **Neu: Kanji** (Kachel):
  - Lernkarten für alle 114 Kanji: Merkbild, Eselsbrücke, kun-/on-Lesungen zum Anhören, Beispielwörter, Beispielsatz, Knopf „Schreiben üben“.
  - Lernrunden: 5 neue Kanji kennenlernen, dann Bedeutung, Zeichen und Lesung abfragen. Wiederholung in wachsenden Abständen.
  - Liste aller Kanji und **Kana-Tabelle** (Hiragana/Katakana mit ゛゜ und ゃゅょ, antippen = anhören).
- **Neu: Kanji-Memory** bei den Spielen (Kanji ↔ Bedeutung, Bild oder Lesung; Rekord = wenigste Züge).
- 14 neue selbst gezeichnete Merkbilder (`k-…`), Kachel-Symbole `i-kanji`, `i-sakuratree` (Familie, Kirschbaum), Avatar `av-oldwoman`. (`i-famtree` ist im Sprite, wird aber nicht mehr verwendet.)
- Zählwörter: Bilder auch für Alter, Datum, Wochentage (`c-daynight`), Monate (`c-twelve`), Uhrzeit, Minuten (`c-stopwatch`), Zahlen (`c-zero`), Preise (`c-banknote`). „Üben“ steht direkt unter Antwortmodus und Reihenfolge.
- Familie: „Üben“ steht zuoberst, der Tipp zuunterst.
- Emojis in Knöpfen durch Symbole ersetzt („Mehr Bücher“, „Liste: alle der Reihe nach“, „Schreiben üben“).
- Kanji-Merkbilder im Marugoto-Stil (eigene Zeichnungen, `km-…`): Bild + Striche des Kanji rot darübergelegt. Fertig für 21 Kanji: 一二三人大小山川木日月田上下中子女火水休金 (zweite, detailliertere Fassung mit eigenem Hintergrund).
- Rückmeldung Merkbilder: 一二三 zeigen nur noch die Striche (Hand gefiel nicht), Mond jetzt zunehmend. Die Person ist mit den Bildern insgesamt noch nicht zufrieden und **sucht selbst passendere Vorlagen** – abwarten, bis sie sich meldet; nicht ungefragt weiterzeichnen.
- Grammatik: neue Rubrik **Satzbau** (breite Kachel oben, `satzbauView()` in app.js): Verb am Ende, Partikeln als Etiketten, Baukasten zum Ein-/Ausschalten von Satzteilen, lockere Reihenfolge, Fragen mit か, A は B です, Beschreibung davor; Knopf zum Satz-Puzzle.
- Grammatik: neue Rubrik **Fragewörter** (`QWORDS` in grammar.js, 24 Wörter mit Frage + Antwort, Quiz mit 10 Lückenfragen). Jedes Fragewort hat eine **geschätzte** Lektion (10. Feld); spätere sind ausgegraut, das Quiz nimmt nur Wörter bis zur höchsten eingeschalteten Lektion. **Die Person liefert die genauen Lektionen noch nach** – dann in `QWORDS` anpassen. Tipp-Kasten der Grammatik-Liste steht unten. Satzbau-Beispiel mit あさ statt まいあさ (Person kannte まいあさ nicht), と-Baustein orange.
- Startseite: „Gelernte üben“ ist immer sichtbar (ohne gelernte Wörter kommt ein Hinweis).
- Zählwörter und Schreiben üben: kompakte Auswahl-Karte (Modus/Reihenfolge + Üben/Liste nebeneinander). Schreiben: Gruppen als Kacheln, nur noch ein Tipp-Kasten.
- Spiele-Kacheln abwechselnd weiss/blau.
- Kanji-Memory: Modus „Bild“ entfernt (nur Bedeutung und Lesung).
- Kanji-Karte: „Schreiben üben“ steht oben zwischen den Pfeilen.
- Kanji-Karte: Blättern mit ‹ › Knöpfen, Pfeiltasten oder Wischen (Reihenfolge wie „Alle Kanji“).
- Schreiben üben: Der Modus-Tipp steht jetzt unten. Der Rest hat noch die einfachen Themenbilder – nächster Schritt, falls der Person der Stil gefällt.
- Alle ß in App-Texten durch ss ersetzt (Schweizer Schreibweise).
- Romaji: Einzelwörter werden nie mit Partikel-Lesung umgewandelt (はは = haha, nicht „ha wa“); nur Beispielsätze.

## Was fertig ist (vorher)

**Vokabeln**
- Trainer mit 5 Stufen und Wiederholung in wachsenden Abständen. Fehler beim Lernen bringen Extra-Wiederholungen.
- Extra-Übung „Gelernte üben“ (ändert den Lernplan nicht).
- Wortschatz:
  - Lektion 1–12 (aktiv)
  - Lektion 13–18 (ausgeschaltet)
  - häufige Katakana-Wörter, auf die Lektionen verteilt
  - Zusatzgruppen Begrüssung, Reise, Grundwortschatz, Anime & Songs (aus)
  - eigene Wörter

**Grammatik**
- 14 A1-Themen (L1–L17) mit Erklärung, 3 Beispielen zum Anhören und 4 Lückensätzen.

**Gespräche**
- 9 Dialoge mit Lesen & Hören, Lückentext und Rollenspiel per Spracherkennung (mit „War doch richtig“-Knopf).

**Bücher**
- 8 eigene Bildergeschichten mit Szenen und Verständnisfragen.
- 100 Tadoku-Bücher als Links, nach Stufen geordnet, abhakbar.

**Zählwörter**
- Viele Kategorien mit Bildern.
- Modi: Auswählen, Tippen, Sprechen.
- Zufällig oder der Reihe nach, dazu die Liste „alle der Reihe nach“.

**Kalender**
- Eigene Lektion: Monatskalender zum Antippen (Tag, Woche, Monat, Jahr, Wochentag, 毎…) und eine Übung mit 10 Fragen.

**Schreiben**
- Hiragana, Katakana und Kanji-Gruppen inkl. „alle JLPT N5 (79)“.
- Strichprüfung, Pinsel-Optik auf Schriftrolle.
- Modi: Nachzeichnen, Mit Hilfe, Aus dem Kopf.

**Spiele**
- Kana-Regen, Sushi-Band, Satz-Puzzle, Kanji-Memory. Alle mit Rekorden.

**Bedienung & Design**
- Japan-Design, Hell/Dunkel.
- Bewegter Hintergrund auf der Startseite (abschaltbar).
- Tipp-Kästen mit Glühbirne.
- Android-Zurück-Geste.
- Sicherung per Export/Import.

## Halbfertig / ungeprüft

- **v36 ist nur lokal in Handy-Grösse getestet**, nicht auf dem Pixel. Ungeprüft sind vor allem:
  - Stimmen: Auf dem Pixel gibt es meist nur eine japanische Stimme; dann wird nur die Tonhöhe verändert. Ob das gut klingt, muss die Person sagen.
  - Lange Aufnahme im Rollenspiel (Mikrofon geht im Vorschau-Browser nicht).
- **v31–v35** waren ebenfalls noch nicht auf dem Pixel getestet.
- **Wortschatz Lektion 13–18**: mit dem Kursbuch abgeglichen (Stand 20.11.2026).
- **Eigene Inhalte**: Grammatik, Dialoge, Geschichten, Puzzle-Sätze, Füllwörter, Eselsbrücken und Kanji-Beispiele sind selbst geschrieben und nicht von Muttersprachlern geprüft. Die Eselsbrücken sind Merkhilfen, keine echte Herkunft der Zeichen.

## Offene Probleme / bekannte Bugs

- **Daten nur lokal**: Der Fortschritt liegt nur im Browser-Speicher des Handys. Ohne Export ist bei Datenverlust alles weg.
- **Spracherkennung** hängt vom Browser ab (Chrome/Android ok). Japanische Erkennung liefert manchmal Kanji oder Varianten. Dafür gibt es den „War doch richtig“-Knopf.
- **Startseiten-Erkennung** über den Titeltext `日本語 Trainer` in `show()`.
- **Tadoku-Liste** ist ein fester Schnappschuss vom 13.11.2026.
- **KanjiVG** wird beim ersten Öffnen eines Zeichens aus dem Internet geladen.
- **Doppelte Lesungen**: きます (来ます/着ます) und とまります (止まります/泊まります) gibt es absichtlich zweimal.
- Im Stammbaum sind lange Wörter (おとうとさん …) in der Breite etwas zusammengedrückt, damit sie nebeneinander passen.

## Nächste Schritte (Vorschlag)

1. **Git installieren**, dann v36 hochladen (nach „Ja, hochladen“).
2. **Auf dem Pixel testen** (v36) und Rückmeldungen einarbeiten.
3. **Lektion 13–18 prüfen**, sobald die Person sie im Kurs erreicht.
4. Passende **Gespräche und Bücher für Lektion 13–18** schreiben (Stadt/Wegbeschreibung, Einkaufen, Ferien/Reisen).
5. **Grammatik erweitern**, sobald der Kurs weiter ist (z. B. て-Form genauer, 〜ています, Vergleiche より/ほうが).
6. Später **A2 in derselben App** (eigene Wortschatz-Datei `js/vocab-a2.js`).

## Besprochen, aber (noch) nicht umgesetzt

- **Push-Erinnerungen** zum Lernen. Die Person hat **vorerst verzichtet**; nicht erneut anbieten, ausser sie fragt.
- **Freie Gespräche mit KI.** Bräuchte einen API-Schlüssel und einen Server.
- **Tagesserie** (wie viele Tage in Folge gespielt oder gelernt).
- **Weitere Spiel-Ideen**: Memory auch für Wörter / Kana ↔ Romaji, Shiritori.
- **Satz-Puzzle „Profi“-Modus** mit einem falschen Zusatz-Partikel.
- Sichtbarerer Deko-Streifen auf der Startseite.
