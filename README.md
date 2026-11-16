# Nihongo Trainer

Persönliche Lern-App für Japanisch (Niveau A1, angelehnt an den Kurs „Marugoto“).
Läuft im Browser und lässt sich auf dem Handy als App installieren.

## Funktionen
- **Vokabeltrainer** in 5 Stufen (Kennenlernen, Bedeutung wählen, Erinnern, Aussprechen, Schreiben) mit Wiederholung in wachsenden Abständen. Fehler beim Lernen bringen Extra-Wiederholungen.
- **Gelernte üben**: Extra-Übung, die den Lernplan nicht verändert
- **Lektionen**: Wortgruppen ein- und ausschalten (Kurs-Lektionen, häufige Katakana-Wörter, Zusatzgruppen wie Reise oder Anime & Songs)
- **Schrift-Umschalter**: Romaji / Kana / Kanji mit Furigana
- **Grammatik**: 14 A1-Themen mit Erklärung, Beispielen zum Anhören und Lückensätzen
- **Gespräche**: 9 Alltagsdialoge – Lesen & Hören (Stimmen passend zur Figur), Lückentext, Rollenspiel mit Spracherkennung; dazu Füllwörter & Reaktionen (えっと, あのう, そうですか …)
- **Bücher**: 8 eigene Bildergeschichten mit Fragen zum Textverständnis, dazu 100 kostenlose Tadoku-Bücher als Links, nach Stufen geordnet und abhakbar
- **Familie**: Stammbaum zum Antippen – welches Wort für die eigene Familie, welches für die Familie von anderen, und wie man wen anspricht
- **Kanji**: Lernkarten mit Merkbild, Eselsbrücke, Lesungen und Beispielen; Lernrunden mit Wiederholung; Liste aller Kanji und Kana-Tabelle
- **Zählwörter**: つ, 人, 匹, 本, 枚, 杯, 個, 冊, 台, Alter, Datum, Wochentage, Monate, Uhrzeit, Minuten, Zahlen, Preise – zum Auswählen, Tippen oder Sprechen
- **Kalender**: Monatskalender zum Antippen (Tag, Woche, Monat, Jahr, Wochentag, 毎…) und eine Übung mit 10 Fragen
- **Schreiben üben**: Hiragana, Katakana und Kanji (inkl. alle 79 JLPT-N5-Kanji) mit dem Finger zeichnen, mit Prüfung von Reihenfolge und Richtung. Modi: Nachzeichnen, Mit Hilfe, Aus dem Kopf
- **Spiele** mit Rekorden:
  - Kana-Regen (Katakana, Hiragana, gemischt oder Wörter)
  - Sushi-Band (10 Themen)
  - Satz-Puzzle (passend zu den aktiven Lektionen)
  - Kanji-Memory (Kanji ↔ Bedeutung, Bild oder Lesung)
- Wörter antippen = anhören, lange drücken = Übersetzung
- **Eigene Wörter** ergänzen
- Hell- und Dunkelmodus, Sicherung per Export/Import

Der Lernfortschritt wird nur lokal im Browser gespeichert. Für eine Sicherung in den Einstellungen „Exportieren“ verwenden.

## Lokal testen
```
pwsh -NoProfile -File tools/serve.ps1 -Port 8123
```
Alternativ: `python3 -m http.server 8123`. Dann http://localhost:8123 öffnen.

## Quellen
- Strichdaten: [KanjiVG](https://kanjivg.tagaini.net) von Ulrich Apel, Lizenz [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Lesebuch-Links: [NPO 多言語多読 – にほんごたどく](https://tadoku.org/japanese/free-books/), Lizenz CC BY-NC-ND 4.0 (nur verlinkt, nicht kopiert)
