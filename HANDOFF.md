# Übergabe – Stand 16.11.2026

Online-Version **v35** (`sw.js`): https://bindochnichtbambi.github.io/nihongo-trainer/

Konzept, Technik und Konventionen stehen in `CLAUDE.md`.

## Was fertig ist

**Vokabeln**
- Trainer mit 5 Stufen und Wiederholung in wachsenden Abständen. Fehler beim Lernen bringen Extra-Wiederholungen.
- Extra-Übung „Gelernte üben“ (ändert den Lernplan nicht).
- Wortschatz:
  - Lektion 1–12 (aktiv)
  - Lektion 13–18 (ausgeschaltet)
  - 99 häufige Katakana-Wörter, auf die Lektionen verteilt
  - Zusatzgruppen Begrüssung, Reise, Grundwortschatz, Anime & Songs (aus)
  - eigene Wörter

**Grammatik**
- 14 A1-Themen (L1–L17) mit Erklärung, 3 Beispielen zum Anhören und 4 Lückensätzen.

**Gespräche**
- 9 Dialoge mit Lesen & Hören, Lückentext und Rollenspiel per Spracherkennung (mit „War doch richtig“-Knopf).

**Lesebücher**
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
- Kana-Regen (Katakana, Hiragana, gemischt oder Wörter → deutsche Bedeutung)
- Sushi-Band (Nigiri-Teller, 10 Themen)
- Satz-Puzzle (35 Sätze, gefiltert nach den aktiven Lektionen)
- Alle mit Rekorden.

**Bedienung & Design**
- Japan-Design, Hell/Dunkel.
- Bewegter Hintergrund auf der Startseite (abschaltbar).
- Tipp-Kästen mit Glühbirne.
- Android-Zurück-Geste.
- Sicherung per Export/Import.

## Halbfertig / ungeprüft

- **v31–v35 sind nicht auf dem Pixel getestet** (nur lokal in Handy-Grösse): Knöpfe nebeneinander, bewegter Hintergrund, Tipp-Kästen, Spiel-Ende ohne Scrollen.
- **Wortschatz Lektion 13–18**:
  - Romaji und Deutsch stammen aus dem Marugoto Starter Wordbook.
  - Die japanische Schrift war im PDF-Text nicht lesbar. Kana und Kanji wurden deshalb aus Romaji und Bedeutung erschlossen.
  - Sollte beim Erreichen der Lektionen mit dem Kurs abgeglichen werden.
- **Eigene Inhalte**: Grammatik, Dialoge, Geschichten und Puzzle-Sätze sind selbst geschrieben und nicht von Muttersprachlern geprüft.
- **README.md** listet nicht alle neuen Funktionen auf (Spiele, Grammatik, Kalender, Tadoku). Es sollte aktualisiert werden.

## Offene Probleme / bekannte Bugs

- **Daten nur lokal**: Der Fortschritt liegt nur im Browser-Speicher des Handys. Geht er verloren (App-Daten gelöscht, neues Handy), ist alles weg, ausser die Person hat exportiert.
- **Spracherkennung** hängt vom Browser ab (Chrome/Android ok). Japanische Erkennung liefert manchmal Kanji oder Varianten. Dafür gibt es den „War doch richtig“-Knopf.
- **Startseiten-Erkennung** über den Titeltext `日本語 Trainer` in `show()`. Das ist zerbrechlich, wenn der Titel geändert wird.
- **Tadoku-Liste** ist ein fester Schnappschuss vom 13.11.2026. Neue Bücher erscheinen nicht automatisch, entfernte Links könnten ins Leere führen.
- **KanjiVG** wird beim ersten Öffnen eines Zeichens aus dem Internet geladen. Offline geht es erst, wenn das Zeichen schon einmal geladen wurde.
- **Doppelte Lesungen**: きます (来ます/着ます) und とまります (止まります/泊まります) gibt es absichtlich zweimal.
- Kleinere Unschönheit: Auf dem Handy verdecken die Kacheln einen Grossteil der Hintergrund-Deko. Das ist so gewollt und dezent.

## Nächste Schritte (Vorschlag)

1. **Auf dem Pixel testen** (v35) und Rückmeldungen der Person einarbeiten.
2. **README.md aktualisieren** (Funktionsliste).
3. **Lektion 13–18 prüfen**, sobald die Person sie im Kurs erreicht: Wortschatz mit den Kurs-Unterlagen abgleichen und ggf. eigene Zusatzwörter ergänzen (wie bei Lektion 7–8).
4. Passende **Gespräche und Lesebücher für Lektion 13–18** schreiben (Stadt/Wegbeschreibung, Einkaufen, Ferien/Reisen).
5. **Grammatik erweitern**, sobald der Kurs weiter ist (z. B. て-Form genauer, 〜ています, Vergleiche より/ほうが).
6. Später **A2 in derselben App**: in „Lektionen“ eine Unterteilung A1/A2, A2-Wortschatz in eigener Datei (z. B. `js/vocab-a2.js`). Die Person liefert dann die Wortlisten ihres Kurses.

## Besprochen, aber (noch) nicht umgesetzt

- **Push-Erinnerungen** zum Lernen. Lösung wäre Web Push über einen GitHub-Actions-Zeitplan. Die Person hat **vorerst verzichtet**; nicht erneut anbieten, ausser sie fragt.
- **Freie Gespräche mit KI.** Bräuchte einen API-Schlüssel und einen Server, das passt nicht zum aktuellen „nur statische Seite“-Ansatz.
- **Tagesserie** (wie viele Tage in Folge gespielt oder gelernt).
- **Weitere Spiel-Ideen**:
  - Memory (Japanisch ↔ Deutsch, Kana ↔ Romaji)
  - Shiritori (Wortkette gegen die App, optional mit Mikrofon)
- **Satz-Puzzle „Profi“-Modus** mit einem falschen Zusatz-Partikel.
- Sichtbarerer Deko-Streifen auf der Startseite. Angeboten, die Person hat es nicht weiterverfolgt.
