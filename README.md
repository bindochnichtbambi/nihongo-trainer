# Nihongo Trainer

Persönliche Lern-App für Japanisch (Niveau A1, angelehnt an den Kurs „Marugoto“).
Läuft im Browser und lässt sich auf dem Handy als App installieren.

## Funktionen
- **Vokabeltrainer** in 5 Stufen (Kennenlernen, Bedeutung wählen, Erinnern, Aussprechen, Schreiben) mit Wiederholung in wachsenden Abständen
- **Schrift-Umschalter**: Romaji / Kana / Kanji mit Furigana
- **Zählwörter**: つ, 人, 匹, 本, 枚, 杯, 個, 冊, 台, Alter, Datum, Wochentage, Monate, Uhrzeit, Minuten, Zahlen, Preise
- **Schreiben üben**: Hiragana, Katakana und A1-Kanji mit dem Finger zeichnen, mit Prüfung von Reihenfolge und Richtung
- **Eigene Wörter** ergänzen

Der Lernfortschritt wird nur lokal im Browser gespeichert.

## Lokal testen
```
pwsh -File tools/serve.ps1
```
Dann http://localhost:8123 öffnen.

## Quellen
- Strichdaten: [KanjiVG](https://kanjivg.tagaini.net) von Ulrich Apel, Lizenz [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
