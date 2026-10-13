# Ergebnis-PDF und Webhook

## Schülerdownload

Beim Abschicken erzeugt die gemeinsame Bibliothek ein persönliches PDF. Es enthält Name und Abgabezeit, drei Fortschrittskreise sowie die Ergebnisse pro Lernseite und Aufgabe. Richtige Antworten werden ohne zusätzliche Musterantwort dargestellt. Bei falschen Antworten stehen Eingabe und erwartete Antwort nebeneinander; bei Bedarf folgt eine kurze Erklärung. Unbearbeitete Einträge zeigen nur „Noch offen“, ohne Eingabefeld, erwartete Antwort oder Lösungserklärung. Freitexte werden vollständig übernommen, aber nicht automatisch bewertet. Lange Antworten laufen über mehrere PDF-Seiten; auch die zweispaltigen Korrekturen werden sauber umgebrochen. Die Schrift und die üblichen mathematischen Zeichen bleiben als auswählbarer Text erhalten.

Auf der Ergebnisseite kann dieselbe Abgabe mit **PDF herunterladen** erneut heruntergeladen werden. Dadurch wird kein weiterer Webhook ausgelöst. Der erneute Download verwendet den Stand dieser Abgabe, nicht nachträglich geänderte Eingaben. Für einen neuen Ergebnisstand ist erneut abzuschicken.

Lückentexte erscheinen als zusammenhängender Text mit fett gedruckten Lückeneinträgen, ohne Einzelblöcke „Lücke 1“, „Lücke 2“ usw. Bei falschen Einträgen stehen der eigene und der korrigierte Text nebeneinander. Bereits richtige Einträge bleiben unverändert; leere Lücken bleiben in beiden Texten als `[offen]` stehen und verraten keine Lösung.

Der Export funktioniert lokal ohne Internet und benötigt keinen Druckdialog. Die PDF-Bibliothek und die Schriften werden erst beim ersten Export aus `assets/vendor/` geladen. Die Quellen und Lizenzen stehen dort in `README.md`.

Ein vorhandenes `exportName` wie `arduino-2-ergebnisse.txt` bleibt als Konfiguration gültig. Der Schülerdownload heißt nun `arduino-2-ergebnisse.pdf`. Auch nach erfolgreicher SCORM-Abgabe ist der persönliche PDF-Download möglich; die SCORM-Punkteübermittlung bleibt bestehen. Bei eingebetteten Kursen muss das LMS Downloads im Kursfenster erlauben.

## Bestehender Webhook

Der Webhook und die Konfiguration seiner Zieladressen bleiben unverändert. Gesendet werden weiterhin die bisherigen JSON-Felder `name`, `email`, `message`, `submittedAt`, `submittedAtLocal` und `submittedAtTimeZone`. `message` enthält den detaillierten Textbericht im bisherigen Format, keine PDF-Daten. Die bestehende Sperrzeit gegen mehrfaches Senden bleibt erhalten. Für die Tests werden ausschließlich simulierte Empfänger verwendet.

## Spätere PDF-Übermittlung

Noch nicht umgesetzt; dafür muss der empfangende Flow mit angepasst werden:

1. **Dasselbe PDF zusätzlich senden:** Die Website könnte das erzeugte PDF als Base64 zusammen mit Dateiname und MIME-Typ `application/pdf` im JSON übertragen. Power Automate müsste die zusätzlichen Felder annehmen und das PDF als E-Mail-Anhang oder Datei speichern. Der bestehende Textbericht kann parallel erhalten bleiben. Vorteil: Schüler und Lehrkraft erhalten dieselbe Darstellung.
2. **PDF erst im Flow erzeugen:** Power Automate könnte aus den empfangenen Ergebnissen ein Dokument erstellen und in PDF umwandeln. Die Website benötigt dann keinen PDF-Anhang im Webhook; dafür muss die Formatvorlage im Flow gepflegt werden. Für exakt dieselbe Darstellung wäre die erste Variante einfacher.

Die Größe der Übertragung, Connector-Berechtigungen, Aufbewahrung und der Umgang mit Schülerdaten müssen zur schulischen Umgebung passen. Es wird aktuell kein zusätzlicher Empfänger oder Konvertierungsdienst eingebunden.

Offizielle Dokumentation: [Outlook-Connector: E-Mail-Anhänge](https://learn.microsoft.com/en-us/connectors/office365/), [Binärdaten und Base64 in Workflows](https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-content-type).

## Pflege und Prüfung

- Datensammlung, Textbericht und Einbindung: `assets/allgemeines_format.js`.
- PDF-Layout und Seitenumbrüche: `assets/wb-results-pdf.js`.
- Download-Schaltfläche und Ergebnisseite: `assets/allgemeines_format.css`.
- `node scripts/check-results-pdf.cjs` prüft die Aufgabentypen, leere und ausgefüllte Abgaben, lange Antworten, Umlaute und Mathematikzeichen, SCORM, Ladefehler mit erneutem Versuch sowie unveränderte Webhook-Felder. Playwright/Chrome und Poppler werden lokal benötigt; Pfade sind mit `PLAYWRIGHT_MODULE`, `CHROME_PATH` und `PDFTOTEXT` konfigurierbar. Test-PDFs und Screenshots liegen im temporären Ordner `school-results-pdf-check`.
- Nach Änderungen der gemeinsamen Bibliothek auch `node scripts/check-musterloesungen.cjs` und die betroffenen Musterlösungen prüfen. Für eine vollständige Layoutprüfung gibt es `node scripts/check-musterloesungen-browser.cjs`.

Für SCORM-Pakete wird der gesamte gemeinsame `assets/`-Ordner kopiert, einschließlich der PDF-Bibliothek und Schriftdaten in `vendor/`. Bereits veröffentlichte Pakete müssen neu gebaut werden, um den PDF-Export zu übernehmen.
