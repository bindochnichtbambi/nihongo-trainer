# Übergabe – Stand 20.11.2026

Online-Version **v44** (`sw.js`): https://bindochnichtbambi.github.io/nihongo-trainer/
Git ist auf diesem Computer installiert (`C:\Program Files\Git\cmd\git.exe`), Anmeldung bei GitHub läuft über den Browser. Hochladen am besten im Terminal-Tab des Benutzers (`git push`), weil die Anmeldung dort ein Fenster öffnen kann.

Konzept, Technik und Konventionen stehen in `CLAUDE.md`.

## Neu in v45 (20.11.2026)

- **Sicherung**: Erinnerung auf der Startseite (nach 14 Tagen bzw. nie gesichert nach 7 Tagen und 3 Lerntagen), „Später“ = 3 Tage Ruhe. In den Einstellungen „Sicherung speichern (z. B. Google Drive)“ über das Teilen-Menü des Handys, dazu „Letzte Sicherung: vor X Tagen“.
- **Lern-Serie**: in der Statistik-Karte 7 Trittsteine (letzte 7 Tage). Der Kranich steht auf dem letzten Lerntag und springt beim ersten Öffnen nach dem Lernen auf den heutigen Stein. Rekord in `DB.streakBest`. Tage wie `DB.log` (UTC-Datum).
- **Verb-Formen** (Grammatik-Seite): ます / ません / ました / ませんでした, ab L12 ませんか / ましょう, ab L18 たいです; Quiz mit Form wählen, Form erkennen, Form schreiben. Verben ohne Willen (あります, できます …) ohne Einladung/Wunsch. Auch im Test (Bereich Grammatik).
- **Gespräche „Hören“**: Text versteckt, Gespräch abspielen, danach 4 Fragen (Satz anhören → Bedeutung wählen).
- **Reise-Spickzettel** (`js/travel.js`, breite Kachel unten): 7 Situationen inkl. Allergien und Notfall (110/119), „Zeigen“ als Vollbild zum Hinhalten, ★ für eigene Liste.
- Nächste Idee aus der Liste: bessere Stimmen (z. B. VOICEVOX-Aufnahmen).

## Neu in v44 (20.11.2026, online)

- **Lektionen** kompakt: pro Topic beide Lektionen nebeneinander („L5 49“ + Name, grün = gelernt).
- **Grammatik**: blasse Themen = Lektion noch nicht eingeschaltet (bewusst so, im Tipp erklärt).
- **Gespräche/Bücher** ohne Lektion („Reise“) zeigen kein rotes Feld mehr.
- **Neu: Haus** (`js/house.js`): drei Bilder zum Antippen (von aussen mit Stockwerken, Grundriss 3LDK, Zimmer mit Möbeln), Wohnformen, Stockwerk-Lesungen, Anzeigen-Kürzel (1K, 1LDK …), Quiz mit markierten Bildteilen.
- **Neu: Test** (Kachel mit Origami-Kranich `#i-crane`): 10/25 gemischte Fragen aus Wortschatz, Hören, Grammatik, Satzbau, Lesen, Kanji, Zahlen bis zur höchsten aktiven Lektion. Auswertung nach Bereichen, falsche Antworten, 合格-Stempel ab 50 %. Kranich: ≥75 % fliegt hoch, 50–74 % hüpft, <50 % faltet sich zurück zum Papier (Person wünschte erst „zerknüllen“, dies als freundlichere Variante umgesetzt). Speichert `DB.test`.
- Startseite: 12 Kacheln (… Schreiben | Spiele, Haus neben Familie, Test neben Spiele).

## Neu in v37 (20.11.2026, online)

- Vorlesen: Fragewörter, Kanji-Karten, Kanji-Quiz und Satzbau lesen die Kana vor (何 wurde als „ka“ gelesen). In Gesprächen werden Wörter mit 何 aus den Kana gelesen (`sayForm`).
- Vokabeln, Stufe Aussprechen: Bei sehr kurzen Wörtern (z. B. え) gibt es einen Hinweis, sie in einem kleinen Satz zu sagen („え です“). Ein Rahmen wie これは … です wird beim Vergleich entfernt.
- Zählwörter, Kanji (Lernen) und Schreiben haben denselben Aufbau: Auswahl-Karte oben, Kacheln „Was willst du üben?“, Tipp unten. Kanji hat dort einen Memory-Knopf.
- Offen: Die Stimmen gefallen der Person nicht. Optionen besprochen (Stimme auf dem Handy wählen oder fertige Aufnahmen, z. B. mit VOICEVOX), noch nicht entschieden.
- Kursunterlagen liegen in `C:\Users\Admin\Claude\Kursunterlagen` (nur lokal, nie hochladen, nicht abschreiben): Unterordner `Katsudo` und `Rikai`, je ein PDF pro Topic (alle 9 Topics) plus Inhaltsverzeichnisse. Die Scans sind Bilder; zum Lesen die JPEG-Streams aus dem PDF herausziehen (kleines PowerShell-Skript, Bilder auf ~1150 px verkleinern). Die Person ist bei **Lektion 13**.
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

## Abgleich ältere Lektionen (v39, online)

Vorgehen in Paketen (Person wünscht stückchenweise): Paket 3 = L9–12 ✓, danach Paket 2 = L5–8, Paket 1 = L1–4.
Regel für gelernte Lektionen: nur ergänzen und korrigieren, nichts löschen; Gruppen-IDs bleiben, damit der Lernstand erhalten bleibt. Die „häufigen Katakana-Wörter“ am Ende der Gruppen sind bewusst eigene Zusätze und bleiben.

- **Paket 3 (L9–12)**: Wortschatz ergänzt (L9–10: いちにち, じかん, ざんぎょう, ひま, よてい, スケジュール, バースデーパーティー, かんぱい …; L11–12: おりがみ, はいく, Film-/Musik-/Buchgenres, Sprachen, できます, よく/ときどき/あまり/ぜんぜん, ぼんさい, ゴールデンウィーク, いっしょに, みに いきます, Jポップ …). Dafür aus L15–18 entfernt, was im Kurs schon früher kommt (バースデーパーティー, いっしょに, あまり, みに いきます, Jポップ, はなびたいかい, イベント, コーヒーショップ). おそい (L13) = „langsam; spät“.
- Grammatik neu: L10 „いつが いいですか・〜じかん“, L11 „〜が できます・よく／ときどき“, L12 „みに いきます・〜で 〜が あります“; „Zeit + に“ erklärt jetzt auch ごろ.
- Fragewörter: neu なんじかん (L10), どこで (L11); なんようび → L10, なんがつ/なんにち/いくら → L12.
- Gespräche neu: „Wann passt es dir?“ (L9–10), „Was kannst du?“ (L11–12).
- **Paket 2 (L5–8)** (v40, online): Wortschatz ergänzt (L5–6: いつも, すきな/きらいな, みせ, レストラン, うどんや/そばや/すしや, メニュー, チーズバーガー, ホットドッグ, コーラ, ホット/アイス, ひとつ–みっつ, いちばん, ください, いらっしゃいませ + Bestell-Sätze; L7–8: ひとりで, デパート, よっつ–むっつ, ええっと + Sätze). Dafür aus L14–17 entfernt: みせ, デパート, レストラン, すしや, そばや, すんでいます, いらっしゃいませ, いちばん, ひとりで. よく/あまり bleiben in L11–12 (dort schon gelernt), obwohl sie im Kurs ab L5 vorkommen.
- Grammatik: „〜が すきです“ jetzt L5 (mit と, も, いちばん, すきな); 〜を 〜ます ergänzt um いつも/よく/あまり; neu L6 „Ort で 〜を たべます・〜を ください“, neu L8 „〜の うえ・した・なか・よこ“; Adjektive jetzt L7; あります/います ergänzt um いくつ und すんで います.
- Fragewörter: どこで → L6, いくつ und どんな → L7.
- Gespräche neu: „Wo essen wir heute?“, „Im Hamburger-Laden“ (L5–6), „Wo ist die Tasse?“ (L7–8).
- **Paket 1 (L1–4)** (v41, online): Wortschatz ergänzt (L1–2: にほん, にほんご, とうきょう, ふじさん, そら, ほん, タクシー, ひらがな/カタカナ/かんじ, Länder aus dem Katakana-Kapitel, Grüsse おはよう ございます … おつかれさまでした, Unterrichts-Sätze いますか/まだです; L3–4: わたし(たち), にほんじん, スイスじん, ドイツ, エジプト, オーストラリア, Sprachen, なにご, ひとり–さんにん, なんにん, なんさい, かわいい, かっこいい + Sätze). えいご, ドイツご, フランスご, スペインご, できます, すこし, すごい von L11-12 nach L3-4 verschoben – **Migration in app.js** (Liste neben パートナー→かれし) nimmt den Lernstand mit. Aus späteren (ausgeschalteten) Gruppen entfernt: タクシー (L13), かわいい/かっこいい (L15–16), まんが/ふじさん (L17–18).
- Grammatik: A は B です jetzt L3 (mit じゃないです wie im Kurs), neu L3 „わたしも・〜が できます“, neu L4 „〜と 〜・〜に すんで います“, A の B jetzt L4, これ・それ・あれ jetzt L8 (mit Hinweis, wann was kommt). `GRAMMAR` wird am Ende von grammar.js nach `l` sortiert.
- Fragewörter: なん L3 (おしごとは なんですか), なんさい/なんにん/どこ L4, どちら L3 (どちらからですか), どの L6, どれ L16.
- Gespräche neu: „Im Unterricht“ (L1–2), „Das Familienfoto“ (L3–4).
- Damit sind alle 18 Lektionen mit den Kursheften abgeglichen.

## Lektionen einzeln, nach Topic (v42, online)

- Wortgruppen geteilt: statt `L1-2`, `L3-4` … jetzt `L1-1` … `L18-18`, je mit `topic`. Zuteilung der Wörter nach den Scans (z. B. L1 Hiragana-Wörter + Grüsse, L2 Katakana + Unterrichtssätze, L9 Tagesablauf, L10 Wochentage/Termine; „häufige Katakana-Wörter“ meist bei der passenden Lektion). Skript dafür lag nur im Scratchpad.
- `splitPairs()` in app.js (direkt nach der L13/14-Migration) übernimmt `DB.groups` und `DB.progress` von den alten Paar-IDs. Getestet mit Beispieldaten.
- Lektionen-Seite: Topic-Überschriften (rotes „Topic N“-Feld + japanischer/deutscher Name), darunter jede Lektion mit eigenem Häkchen.
- Gespräche und Bücher: eine Lektion je Eintrag, rotes „L5“-Feld oben rechts (ausgegraut, wenn die Lektion noch nicht eingeschaltet ist), Listen nach Lektion sortiert.

## Kanji mit L-Feld (v43, online)

- Kanji- und Schreiben-Seite: Kacheln „Kanji nach Kurs-Lektion“ haben das rote L-Feld (als Etikett auf der oberen Kante) und als Namen das Thema der Lektion aus dem Wortschatz (z. B. „Essen & Trinken“) statt „Lektion 5“. Helfer `setBadge` / `setName` in app.js.
- `.wset-grid` hat jetzt zwei gleich breite Spalten (vorher ragte die rechte Spalte über den Rand).

## Bücher zu den Lektionen (v42, online)

- Neue Bildergeschichten (selbst geschrieben, Bilder aus vorhandenen Symbolen): „あたらしい アパート“ (L7–8), „かいしゃ まで“ (L13), „わたし の まち“ (L14), „たんじょうび の プレゼント“ (L15–16), „なつやすみ の りょこう“ (L17–18). Je 5 Seiten und 4 Fragen.
- `STORIES` werden in dialogs.js nach der ersten Zahl in `lesson` sortiert, „Reise“ ans Ende.
- GLOSS ergänzt (あめ, ひ, プレゼント, あかい, きょうと, たのしかった, いきたい).

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

Stand 20.11.2026 (Sitzungsende): v43 online, alles committet und gepusht. Alle 18 Lektionen sind mit den Kursheften abgeglichen (Wortschatz, Grammatik, Fragewörter, Gespräche, Bücher).

1. **Auf dem Pixel testen** (v37–v43, vor allem: Übernahme des Lernstands auf die einzelnen Lektionen, Lektionen-Seite nach Topic) und Rückmeldungen einarbeiten.
2. Offen: **Stimmen** (gefallen der Person nicht; Optionen Handy-Stimme wählen oder fertige Aufnahmen, z. B. VOICEVOX).
3. Offen: **Kanji-Merkbilder** – Person sucht selbst Vorlagen; abwarten.
4. Ideen: **Satz-Puzzles** für L13–18 ergänzen; Kanji-Gruppen nach Lektion prüfen (L1–4 und L7, L14, L15, L17 haben bisher keine Kurs-Kanji in `COURSE`).
5. **Grammatik erweitern**, sobald der Kurs weiter ist (z. B. て-Form genauer, 〜ています, Vergleiche より/ほうが).
6. Später **A2 in derselben App** (eigene Wortschatz-Datei `js/vocab-a2.js`).

## Besprochen, aber (noch) nicht umgesetzt

- **Push-Erinnerungen** zum Lernen. Die Person hat **vorerst verzichtet**; nicht erneut anbieten, ausser sie fragt.
- **Freie Gespräche mit KI.** Bräuchte einen API-Schlüssel und einen Server.
- **Tagesserie** (wie viele Tage in Folge gespielt oder gelernt).
- **Weitere Spiel-Ideen**: Memory auch für Wörter / Kana ↔ Romaji, Shiritori.
- **Satz-Puzzle „Profi“-Modus** mit einem falschen Zusatz-Partikel.
- Sichtbarerer Deko-Streifen auf der Startseite.
