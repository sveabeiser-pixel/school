# Musterlösungen für Lernseiten

Diese Anweisung ergänzt die `AGENTS.md` im Projektstamm. Sie gilt für alle Fachordner, wenn Codex Lernseiten erstellt oder bearbeitet. Lernseite und Musterlösung gehören zu derselben Änderung und müssen gemeinsam fertiggestellt werden.

## Geltungsbereich

- Zu jeder Lernseite mit Aufgaben gehört eine eigene HTML-Datei mit den Musterlösungen.
- Berücksichtige Aufgaben in Interaktionsblöcken, normalen HTML-Abschnitten, eingebetteten Materialbildern und PDF-Ausschnitten.
- Übersichtsseiten, reine Navigation, technische Hilfsseiten, Vorlagen, Kopien in `public/` und archivierte Dateien in `legacy_dont_read/` brauchen keine zusätzliche Lösung. Reine Simulationen benötigen nur dann eine Lösungsseite, wenn sie Aufgaben enthalten.
- Erzeuge keine Lösung zur Lösungsseite. Prüfe vorhandene Lösungen, bevor du eine neue Datei anlegst.
- Die normale Lernroute, Mindestanzahl von Seiten, Vielfalt interaktiver Blöcke und Abgabe gelten für Lernseiten. Eine Musterlösung ist eine lesbare Ergebnisdarstellung und braucht diese Elemente nicht.

## Dateien und Zuordnung

- Lege die Lösungsdatei im selben Ordner wie ihre Lernseite ab.
- Der Name beginnt mit dem Basisnamen der Lernseite. Ergänze ein unabhängiges Wort und eine nicht fortlaufende Zahl, beispielsweise `arduino-1-fensterglas34.html` zu `arduino-1.html`.
- Wähle für neue Seiten jeweils ein anderes Wort und eine andere Zahl. Verwende weder eine Zahlenreihe noch einen aus dem Thema ableitbaren Zusatz.
- Behalte einen vorhandenen Namen bei. Benenne eine Lösungsdatei nur auf ausdrücklichen Wunsch um.
- Füge im Kopf der Lösungsdatei folgende Zuordnung hinzu; der Pfad ist relativ zur Lösungsdatei:

```html
<meta name="musterloesung-source" content="arduino-1.html">
<meta name="musterloesung-source-sha256" content="SHA256_DER_GEPRUEFTEN_LERNSEITE">
```

- Jeder Lösungsblock trägt `data-solution="AUFGABEN_ID"`. Nutze die ID aus der `wb-config`, `data-p2-id` oder dem vorhandenen Aufgaben-HTML. Mehrere Fragen eines MCQ-Blocks dürfen in einem gemeinsamen Lösungsblock stehen.
- Bei älteren Paarblöcken ohne explizite ID gilt wie in der Bibliothek `p2_0`, `p2_1` usw., über die Paarblöcke der Quelldatei gezählt.
- Wiederholt eine ältere Lernseite dieselbe Aufgaben-ID in mehreren Kapiteln, behält der erste Lösungsblock diese ID. Weitere Vorkommen erhalten den Zusatz `__page_SEITENNUMMER_VORKOMMEN`, damit die Lösungsblöcke eindeutig bleiben. Die Kapitelzuordnung und Antworten müssen jeweils zum konkreten Vorkommen passen.
- Bei Aufgaben ohne vorhandene ID verwende eine nachvollziehbare lokale Kennung und ordne sie durch Kapitel- und Aufgabentitel eindeutig zu.
- Trage die Musterlösung in der zentralen `index.html` unmittelbar bei der Lernseite ein; die Lehrkraft hat diese zentrale Verlinkung ausdrücklich angefordert. Nutze beschreibende Linktexte zum Inhalt, zum Beispiel `Arduino 1: Board, Pins und LED-Schaltung` und `Musterlösung: Board, Pins und LED-Schaltung`. Zeige keine Dateipfade als Linktext. Halte sämtliche Einträge derselben Seite im Index synchron.
- Stelle Materiallinks im Index als Bullet-Liste dar. Pro Eintrag steht der hervorgehobene Lernseiten-Link oben, der kleinere und farblich dezentere Musterlösungslink in einer eigenen Zeile darunter. Zwischen Einträgen bleibt eine freie Zeile. Bewahre diese Darstellung auch beim Aktualisieren mit dem Index-Werkzeug.
- Verlinke die Musterlösung auf der Lernseite oder in deren Lernroute nur auf ausdrücklichen Wunsch. Die zentrale Index-Verlinkung reicht aus.

## Darstellung

- Übernimm das Layout der tatsächlichen Lernseite, einschließlich Kapitelreihenfolge, Seitenüberschriften, Navigation und Farbauswahl. Verwechsle ähnlich benannte Dateien nicht miteinander.
- Nutze dieselben gemeinsamen CSS- und JavaScript-Dateien; kopiere die Bibliotheken nicht.
- Zeige oben gut sichtbar `Musterlösung`, sowohl in der Kopfzeile als auch auf der ersten Inhaltsseite.
- Zeige nur Kapitel- und Aufgabenüberschriften sowie die passenden Lösungen. Wiederhole keine Einführung, Lernziele, Bedienungsanleitung, allgemeinen Erklärungstexte oder Abgabehinweise.
- Eine kurze Begründung oder Rechnung, die zur Antwort gehört, ist Bestandteil der Musterlösung.
- Zeige die Antworten direkt. Verwende keine leeren Eingabefelder, Prüfungsknöpfe, Drag-and-drop-Aufgaben, Namenseingabe, Ergebnisabgabe oder Webhooks.
- Keine versteckten Schülerantworten vorausfüllen und keine Schülerdaten in `localStorage` ändern. Die Musterlösung muss unabhängig von vorherigen Eingaben lesbar sein.
- Erhalte deutsche Umlaute und UTF-8. Achte besonders auf helle Schrift auf hellen Flächen in `dark` und `dark-blue`.
- Tabellen dürfen auf kleinen Bildschirmen innerhalb ihres Bereichs seitlich scrollen. Navigation und Seitenwechsel müssen erreichbar bleiben.
- Binde zusätzlich `assets/musterloesungen.css` über den passenden relativen Pfad ein. Die Regeln halten auf Lösungsseiten und in der zentralen Übersicht die mobile Kopfzeile und den Farbschema-Schalter erreichbar, ohne die Lernseiten zu verändern.

## Fachliche Lösungen

| Aufgabentyp | Erwartete Darstellung |
| --- | --- |
| `mcq` | Alle richtigen Optionen pro Frage, mit vollständigem Antworttext. Bei gemischter Auswahl auch mehrere richtige Antworten nennen. Buchstaben nie aus einer zufällig gemischten Reihenfolge ableiten. |
| `verify` | Wahr/Falsch, die zugehörige Aussage und eine kurze Begründung; falsche Aussagen fachlich korrigieren. |
| `cloze` | Vollständig ausgefüllter Text; eingesetzte Begriffe hervorheben. |
| `categorize` | Vollständige Zuordnung aller Begriffe zu ihren Kategorien. |
| `p2` | Tabelle mit sämtlichen richtigen Paaren. |
| `trace` | Ausgefüllte Tabelle mit vorgegebenen und gelösten Zellen. Zahlen, Einheiten, Zustände und Alternativen fachlich prüfen. |
| `order` | Vollständige Liste in der richtigen Reihenfolge. |
| `reveal` | Die vollständige, fachlich geprüfte Antwort. |
| `essay` | Konkrete Beispielantwort, beschriftet mit `Eine mögliche Antwort`, passend zu allen Teilfragen und verlangten Rechnungen, Beispielen oder Begründungen. |
| Codeaufgabe | Lauffähiger Beispielcode in der verlangten Sprache und Umgebung; bei Bedarf Ausgabe oder Ablaufspur. |
| Experiment | Erwartete Beobachtung und Auswertung mit klaren Bedingungen. Keine erfundenen Messwerte als reale Ergebnisse darstellen. |
| Simulation | Konkrete Beobachtung, Vergleich der gefragten Parameter und die geforderte Schlussfolgerung. |

- Geschlossene Antworten zunächst aus den vorhandenen Lösungskonfigurationen entnehmen und dann fachlich prüfen. Ein falscher Lösungsschlüssel wird nicht ungeprüft übernommen.
- Offene Antworten wirklich beantworten. Keine Platzhalter, bloßen Arbeitsanweisungen oder allgemeinen Sätze wie „Begründe deine Antwort“ als Musterlösung einsetzen.
- Bei persönlichen Erwartungen, eigenen Projekten und Reflexionen ist eine plausible Beispielantwort zulässig; behaupte keine einzig richtige persönliche Antwort.
- Bei nicht eindeutigen Aufgaben erläutere die zulässige Annahme oder gib mehrere gültige Lösungen an. Falls nötig, korrigiere die Lernaufgabe gleichzeitig.

## Gemeinsame Pflege bei Änderungen

1. Lies vor einer Änderung die Lernseite und die zugehörige Musterlösung. Ermittle die Zuordnung über die Metadaten; suche bei älteren Dateien zusätzlich nach Dateiname und Seitentitel.
2. Wenn eine neue Lernseite Aufgaben enthält oder eine bearbeitete Lernseite noch keine Musterlösung hat, erstelle die fehlende Lösung im selben Arbeitsgang.
3. Aktualisiere bei geänderten Aufgaben alle betroffenen Antworten: Wortlaut, Werte, Optionen, Lösungsschlüssel, Code, Tabellen und Annahmen.
4. Ergänze Lösungen zu neuen Aufgaben. Entferne Lösungen zu gelöschten Aufgaben. Übernimm Änderungen von Kapiteltiteln, Reihenfolge, Navigation und relevanten Layoutregeln.
5. Prüfe bei Änderungen gemeinsamer Bibliotheken auch betroffene Lösungsseiten. Nutze die gemeinsamen Dateien, damit Korrekturen an beiden Seiten ankommen.
6. Berechne den SHA-256 der Lernseite erst nach der fachlichen und technischen Prüfung neu und aktualisiere den Prüfvermerk. Aktualisiere ihn niemals nur, um eine veraltete Lösung durch den Prüfer zu bringen.
7. Pflege beschreibende Linktexte in `scripts/lernseiten-links.json`. Aktualisiere mit `node scripts/sync-index-musterloesungen.cjs` die zentrale Übersicht und das `MUSTERLOESUNGEN-VERZEICHNIS.md`. Führe danach `node scripts/check-musterloesungen.cjs` aus. Prüfe Navigation, vollständige Aufgabenabdeckung, mobile Darstellung und dunkle Designs passend zur Änderung.
8. Berichte im Abschluss kurz, welche Lernseiten und Musterlösungen gemeinsam aktualisiert wurden, und benenne echte Einschränkungen.

## Grenze der Automatik

`AGENTS.md` ist eine Arbeitsanweisung für Codex und kein Hintergrunddienst. Wenn eine Lernseite außerhalb von Codex geändert wird, schreibt diese Datei nicht selbstständig neue Antworten. Der Prüfer erkennt eine geänderte Vorlage und meldet die nötige Überarbeitung; Codex muss die Musterlösung bei der nächsten Bearbeitung fachlich aktualisieren. Behaupte keine automatische fachliche Überarbeitung durch einen Datei-Hash oder eine reine Textkopie.

## Vorhandene Werkzeuge

- `node scripts/check-musterloesungen.cjs` prüft Zuordnung, Quell-Hash und Abdeckung der strukturierten Aufgaben. Mit `--source nwt/arduino-1.html` lässt sich eine einzelne Lernseite prüfen.
- `node scripts/check-musterloesungen-browser.cjs` prüft alle Lösungsseiten und den Index mit Playwright bei 1440, 390 und 320 Pixeln in drei Farbschemata. Geprüft werden Seitenwechsel, Kopfzeile, lokale Dateipfade, sichtbare Eingabefelder, JavaScript-Fehler und schwere Textkontrastprobleme in den dunklen Designs. Screenshots und Bericht liegen im temporären Ordner `school-musterloesungen-check`. Die Prüfung ersetzt keine fachliche Kontrolle oder Hardwaretests.
- `node scripts/sync-index-musterloesungen.cjs` aktualisiert die vorhandenen Linkeinträge in `index.html`, das vollständige Verzeichnis auf der Seite „Alle Links“ und die Markdown-Übersicht. Die Linktexte stammen aus `scripts/lernseiten-links.json`; dort müssen neue Seiten vor dem Lauf ergänzt werden.
- `node scripts/build-musterloesungen.cjs --inspect nwt/arduino-2.html` liest das Book und seine Aufgabenkonfigurationen mit dem HTML-Parser des Browsers.
- `node scripts/build-musterloesungen.cjs nwt/musterantworten/arduino-2.json` erzeugt die entsprechende Lösungsseite aus der Lernseite und den fachlich verfassten Antwortdaten. Das Werkzeug nutzt die vorhandene lokale Playwright-/Chrome-Installation; bei Bedarf können `PLAYWRIGHT_MODULE` und `CHROME_PATH` gesetzt werden.
- Die JSON-Antwortdateien enthalten `source`, `output`, `answers` nach Aufgaben-ID und gegebenenfalls `extras` nach Seitennummer für Aufgaben aus Text und Bildern. Änderungen gehören in diese Antwortdaten; danach die HTML-Datei neu erzeugen. Fachbereiche mit eigenen Build-Helfern verwenden ihre dortigen Antwortdateien und Helfer.
- Eine Neuerzeugung übernimmt geschlossene Lösungsschlüssel und das Layout. Sie ersetzt nicht die fachliche Prüfung, die Überarbeitung offener Antworten oder die Prüfung zusätzlicher Text-/Bildaufgaben.

## Definition of Done

- Jede betroffene Lernseite mit Aufgaben hat genau eine eindeutig zugeordnete Musterlösung.
- Sämtliche Aufgaben und Teilfragen sind beantwortet, einschließlich Aufgaben aus Materialbildern.
- Titel, Reihenfolge, Antwortschlüssel, Zahlenwerte und Code passen zur aktuellen Lernseite.
- `Musterlösung` ist sofort sichtbar; die Lehrkraft kann die Datei unabhängig freigeben.
- Die Seite läuft lokal und auf GitHub Pages, ohne Ergebnisübertragung und ohne JavaScript-Fehler.
- Die Prüfung der Zuordnung und Aktualität ist erfolgreich. UTF-8, Lesbarkeit und Navigation sind geprüft.
