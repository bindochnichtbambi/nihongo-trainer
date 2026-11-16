# CLAUDE.md – Nihongo Trainer

Hinweise für Claude (und andere Mitwirkende) zu diesem Projekt. Der aktuelle Arbeitsstand steht in `HANDOFF.md`.

## Ziel und Konzept

Persönliche Lern-App für Japanisch, gebaut für **eine Person**:
- deutschsprachig (Schweiz), kein Programmierhintergrund
- lernt mit dem Online-Kurs **Marugoto A1** (ca. 1×/Woche, Stand Nov. 2026: Lektion 12)
- Hiragana sitzt besser als Katakana, wenige Kanji bekannt
- Ziele: Reisen, Songtexte und Anime verstehen, sich orientieren, einfache Gespräche
- benutzt die App als installierte PWA auf einem **Google Pixel (Chrome)**

**Lernansatz**
- Vokabeln in 5 Stufen: Kennenlernen → Bedeutung wählen → Erinnern (mit Timer) → Aussprechen (Mikrofon) → Schreiben.
- Danach folgt eine **Wiederholung in wachsenden Abständen** (Spaced Repetition, 1-2-4-7-14-30-60-120 Tage). Wer beim Lernen Fehler macht, bekommt 1–2 zusätzliche tägliche Wiederholungen (`progress.h`).
- **Schrift-Umschalter** (oben rechts): Romaji („müde-Modus“), Kana oder Kanji mit Furigana. Gilt überall.
- Wörter antippen = anhören, lange drücken = Übersetzung.
- Viel Hören und Sprechen: Sprachausgabe (TTS) und Spracherkennung (Web Speech API, `ja-JP`).

**Kernfunktionen (Startseite)**
- Vokabeln lernen / Gelernte üben (Extra-Übung, ändert den Lernplan nicht)
- Lektionen (Wortgruppen ein- und ausschalten)
- Wortliste mit eigenen Wörtern
- Grammatik (14 A1-Themen mit Übung)
- Gespräche (Lesen, Lückentext, Rollenspiel per Sprache; Stimmen passend zur Figur) + Füllwörter & Reaktionen mit Quiz
- Bücher (eigene Bildergeschichten mit Quiz und Links zu Tadoku; hiess früher „Lesebücher“)
- Zählwörter
- Kalender (Entdecken und Üben)
- Familie (Stammbaum, bescheidene/höfliche Wörter, Anrede, Quiz)
- Kanji (Lernkarten mit Merkbild, Eselsbrücke, Lesungen, Beispielen; Lernrunden mit Wiederholung; Liste aller Kanji; Kana-Tabelle)
- Schreiben (Kana und Kanji mit Strichprüfung)
- Spiele (Kana-Regen, Sushi-Band, Satz-Puzzle, Kanji-Memory)
- Einstellungen (blauer Knopf oben)

## Tech-Stack

- **Reines HTML/CSS/JavaScript**, keine Frameworks, kein Build-Schritt, keine npm-Abhängigkeiten.
- Klassische `<script>`-Dateien (keine Module), Reihenfolge in `index.html` beachten: Daten-Dateien zuerst, `app.js` zuletzt.
- **PWA**: `manifest.webmanifest` + Service Worker `sw.js` (network-first, Offline-Cache).
- **Speicher**: nur `localStorage` im Browser, Schlüssel `nihongo-trainer-v1`. Es gibt keinen Server und kein Konto. Eine Sicherung ist per Export/Import in den Einstellungen möglich.
- **Externe Quellen zur Laufzeit**:
  - Google Fonts (Barlow, Noto Sans JP)
  - KanjiVG-Strichdaten: `raw.githubusercontent.com/KanjiVG/kanjivg/r20240807/kanji/{hex5}.svg`, Fallback jsDelivr. Lizenz CC BY-SA 3.0, Quellenangabe im README.
- **Hosting**: GitHub Pages aus Branch `main`, Repo `bindochnichtbambi/nihongo-trainer`, URL https://bindochnichtbambi.github.io/nihongo-trainer/

## Projektstruktur

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, frühes Theme-Skript im `<head>`, **SVG-Sprite** mit allen selbst gezeichneten Symbolen (`i-…` Menü/Deko, `s-…` Szenen, `c-…` Zählwort-Bilder, `av-…` Avatare), Hintergrund-Deko, Skript-Einbindung |
| `css/style.css` | Gesamtes Design. Themen-Variablen auf `:root[data-theme="stamp"]`, Hell/Dunkel über `data-mode`. Neue Regeln werden unten angehängt (spätere überschreiben frühere). |
| `js/app.js` | Gesamte App-Logik (≈2000 Zeilen, ein IIFE): Speicher, Startseite, Lern-Session/SRS, Wortliste, Zählwörter, Kalender, Schreiben, Gespräche, Lesebücher, Tadoku, Grammatik, Spiele, Einstellungen, Zurück-Geste |
| `js/vocab.js` | Wortschatz `window.VOCAB_GROUPS`: Kurs L1–18 und Zusatzgruppen. Eintrag `[kana, kanji, deutsch, "p"?]` („p“ = Satz/Ausdruck). Gruppen mit `off: true` sind anfangs ausgeschaltet. |
| `js/kana.js` | `Kana.kanaToRomaji`, Vergleich von Eingaben, Bewertung der Spracherkennung |
| `js/counters.js` | Zählwörter, Zahlenlesungen, Datum/Monate/Wochentage, Kalender-SVG |
| `js/kanji.js` | Schreib-Sets: Hiragana, Katakana, Kanji-Gruppen, „alle JLPT N5 (79)“ |
| `js/kanji-info.js` | `KANJI_INFO`: je Kanji Merkbild (Sprite-Symbol oder gezeichnet: `n:`, `dir:`, `col:`, `pos:`), Eselsbrücke, Beispielwörter, Beispielsatz (alles selbst geschrieben) |
| `js/family.js` | `FAMILY` (Stammbaum: mein Wort / Wort für andere / Anrede, Position) und `FAMILY_WORDS` |
| `js/dialogs.js` | 9 Dialoge, 8 Bücher (`STORIES`), Szenen (`SCENES`), Glossar (`GLOSS`), Füllwörter (`FILLERS`). Rollen: `[Name, Avatar, Stimme?]`, Stimme m/f/g/b/o, sonst nach Avatar |
| `js/grammar.js` | 14 Grammatik-Themen (eigene Erklärungen, Beispiele, Lückensätze; erste Antwort = richtig) |
| `js/games-data.js` | Daten für die Spiele: Kana-Listen und Verwechslungspaare, Sushi-Kategorien, Satz-Puzzles |
| `js/tadoku.js` | Linkliste zu kostenlosen Tadoku-Büchern (nur Titel und ID) |
| `sw.js` | Service Worker mit `VERSION` und `FILES` |
| `tools/serve.ps1` | Mini-Webserver zum lokalen Testen (PowerShell 7) |
| `icons/` | App-Icons (PNG 192/512 + SVG) |

**Gespeicherte Daten (`DB`)**
- `settings` – Einstellungen, z. B. `script`, `furigana`, `mode`, `decoAnim`, `newPerSession` …
- `groups` – aktive Wortgruppen
- `progress` – Lernstand je Wort-ID `gruppe|kana`: `{ s: Stufe, b: Box, d: fällig-Zeitpunkt, h: Extra-Tage }`
- `custom` – eigene Wörter
- `log` – Karten pro Tag
- `story` – Ergebnisse der Lesebücher
- `dlg` – Ergebnisse der Gespräche
- `gram` – Ergebnisse der Grammatik-Übungen
- `games` – Rekorde und Spiel-Einstellungen (`games.mem` = Kanji-Memory: Modus, Gruppe, Bestwerte)
- `kanji` – Lernstand der Kanji je Zeichen `{ b: Box, d: fällig }`; dazu `kanjiSet`, `kanjiTab`, `kanaTab`
- `tadoku` – gelesene Tadoku-Bücher
- `counterCats` – gewählte Zählwort-Kategorien
- `write` – Fortschritt beim Schreiben
- `showDe` – Übersetzung in Lesebüchern anzeigen

## Installieren, starten, testen

Es braucht keine Installation, keine Abhängigkeiten, keine Umgebungsvariablen und keine Secrets.

1. Repo klonen: `git clone https://github.com/bindochnichtbambi/nihongo-trainer.git`
2. Lokalen Server starten (im Repo-Ordner):
   - Windows / PowerShell 7: `pwsh -NoProfile -File tools/serve.ps1 -Port 8123`
   - Alternativ (z. B. macOS/Linux): `python3 -m http.server 8123`
3. Im Browser http://localhost:8123 öffnen, am besten in Handy-Grösse (375×812).
4. Optional für Claude Code: eine `.claude/launch.json` im Arbeitsordner anlegen. Den Pfad zu `serve.ps1` ggf. relativ zum Arbeitsordner anpassen:
   ```json
   { "version": "0.0.1", "configurations": [ { "name": "nihongo", "runtimeExecutable": "pwsh",
     "runtimeArgs": ["-NoProfile", "-File", "tools/serve.ps1", "-Port", "8123"], "port": 8123 } ] }
   ```

**Testen**
- Es gibt keine automatischen Tests. Geprüft wird im Browser in Handy-Grösse: Seiten durchklicken, JS-Snippets in der Konsole ausführen und auf Konsolenfehler achten.
- Spracherkennung und Mikrofon funktionieren nur in echtem Chrome (z. B. auf dem Pixel), nicht in eingebetteten Vorschau-Browsern.
- **Achtung, Nutzerdaten:** Die Person testet selbst auch im lokalen Browser.
  - Vor Tests, die Fortschritt, Rekorde oder Einstellungen verändern, die betroffenen `localStorage`-Teile sichern und danach wiederherstellen.
  - Niemals pauschal löschen.

**Veröffentlichen**
1. In `sw.js` die `VERSION` erhöhen (z. B. `"v35"` → `"v36"`). Neue JS-Dateien zusätzlich in `FILES` und in `index.html` eintragen.
2. Committen und auf `main` pushen. GitHub Pages ist nach ca. 1 Minute aktuell.
3. Prüfen, z. B. mit `curl https://bindochnichtbambi.github.io/nihongo-trainer/sw.js`.
4. Auf dem Handy die App einmal mit Internet öffnen und bei Bedarf ganz schliessen und neu starten.

## Konventionen und Entscheidungen

**Zusammenarbeit**
- Mit der Person auf **Deutsch** sprechen, freundlich und ohne Fachjargon. Sie schreibt Schweizer Hochdeutsch (ss statt ß).
- Änderungen erst lokal testen, dann kurz zusammenfassen und **fragen, ob hochgeladen werden soll**. Committen und pushen erst nach Zustimmung (meist „Ja, hochladen“).
- Git-Autor: `bindochnichtbambi <bindochnichtbambi@users.noreply.github.com>`. Nie die echte E-Mail-Adresse verwenden.
- Commit-Nachrichten auf Deutsch.

**Urheberrecht** (wichtig, bewusst so entschieden)
- Die **Kurs-PDFs** (Marugoto-Wortlisten, Grammatik) liegen nur lokal ausserhalb des Repos und werden **nie** hochgeladen oder wörtlich übernommen. Übernommen werden nur einzelne Vokabeln. Erklärungen, Dialoge, Geschichten und Übungen sind selbst geschrieben.
- **Tadoku-Bücher** stehen unter CC BY-NC-ND (keine Bearbeitung). Deshalb werden sie **nur verlinkt** und nicht in die App kopiert.
- **Design-Vorlagen** (magnific.com) dienten nur als Stil-Inspiration. Alle Symbole sind selbst gezeichnete SVGs im Sprite.

**Design**
- Es gibt nur noch das **Japan-Design** (`data-theme="stamp"`). Der Umschalter auf „Klassisch“ wurde entfernt, die CSS-Reste dafür sind harmlos.
- Farben:
  - Marineblau `#273560`, Rot `#d63a50`, Rosé `#f3c3bd`, Hintergrund `#fbf8f6`
  - Kacheln abwechselnd weiss und hellblau `#e3ecf8`
  - Lektionen-Kachel rosa (`--surface-2`)
  - Hintergrund mit Seigaiha-Wellen, Glückswolken und Sakura
- Schrift: **Barlow** (DIN-artig, Wunsch der Person) + Noto Sans JP.
- **Symbole flach im gleichen Stil**, Farben über CSS-Variablen `--a` (navy), `--b` (rot), `--c` (weiss), `--d` (rosé). Keine Emojis als sichtbare Icons; die Person achtet sehr auf einen einheitlichen Stil.
- Startseite, Reihenfolge bewusst so gewählt:
  1. Statistik + „Vokabeln lernen“ und „Gelernte üben“ nebeneinander
  2. breite Lektionen-Kachel
  3. 10 Kacheln: Wortliste | Grammatik, Gespräche | Bücher, Zählwörter | Kalender, Familie | Kanji, Schreiben | Spiele
- Die Einstellungen sind ein blauer Knopf in der Kopfzeile (keine Kachel).
- Hinweise immer mit `tipBox(html)` (weisser Kasten, roter Streifen, Glühbirne `#i-bulb`), nicht als kleine graue Schrift.
- Hintergrund-Animation nur auf der Startseite (`body.on-home`). Sie ist abschaltbar (`settings.decoAnim`) und respektiert `prefers-reduced-motion`.
- Dunkelmodus: Wie Handy / Hell / Dunkel.

**Technik**
- **Romaji**: は/へ werden nur in Sätzen (`p`) als wa/e gelesen (Bug „はは → hawa“ früher behoben).
- **Lektion 13–18** haben `off: true`. Die Person schaltet sie selbst ein, sobald sie im Kurs drankommen.
- **Doppelte Wörter**: Gleiche Kana und Kanji in mehreren aktiven Gruppen werden in `activeWords()` nur einmal abgefragt. Homographen mit anderem Kanji (来ます/着ます) bleiben getrennt.
- **Zurück-Geste (Android)**: Pro Unterseite gibt es einen History-Eintrag (`syncHistory`). Antippen des Titels wirkt wie „Zurück“.
- Die Startseite wird in `show()` am Titel `日本語 Trainer` erkannt. Bei einer Titeländerung dort mit anpassen.
- **Stimmen**: `say(text, voiceFor(kind))`. Gibt es mehrere japanische Stimmen, wird eine männliche/weibliche gewählt, sonst nur die Tonhöhe angepasst (auf dem Pixel meist nur eine Stimme).
- **Spracherkennung im Rollenspiel**: `listen(…, { long: true })` hört weiter, auch bei Denkpausen. Ende durch erneutes Tippen, nach 4,5 s Stille (10 s vor dem ersten Wort) oder nach 30 s.
- Lokaler Test-Server läuft auch mit Windows PowerShell 5.1 (`powershell -File tools/serve.ps1`), siehe `.claude/launch.json`.
- `show(title, html, { back })` rendert jede Seite. `cleanup` stoppt Timer und Animationen (Spiele) beim Seitenwechsel.
