# NWT-Projekt: Hühnerkamera / Smart Chicken Coop

## Ausgearbeitete Unterrichtsplanung und Theoriegrundlagen

**Zielgruppe:** NWT, Anfängerinnen und Anfänger ohne Raspberry-Pi-Vorkenntnisse  
**Format:** 14 Doppelstunden à etwa 90 Minuten, bei Bedarf auf mehrere Termine erweiterbar  
**Leitfrage:** Wie bauen wir ein technisches System, das einen Hühnerstall beobachtet, Messwerte verständlich darstellt und nach einem Stromausfall selbstständig wieder funktioniert?

> Diese Datei ist als fachliche und didaktische Grundlage für spätere interaktive Lernseiten gedacht. Die Unterrichtseinheiten sind deshalb bereits in Lernziel, Theorie-Input, Problemstellung, Arbeitsauftrag, Ergebnis, Fehlersuche und Erweiterung gegliedert.

---

## 1. Projektidee und Zielsystem

Die Schülerinnen und Schüler entwickeln schrittweise ein vernetztes System aus zwei unterschiedlichen Rechnern:

```text
KY-015 Temperatur/Luftfeuchtigkeit ─┐
                                    ├─ ESP32 ─ WLAN ─ Messwert-Webseite
KY-018 Helligkeit ──────────────────┘                   │
                                                        └─ spätere Schulhomepage

Camera Module 3 Wide NoIR ── Raspberry Pi ── Video ── externer Streamingdienst
```

Der Raspberry Pi übernimmt kamera- und linuxbezogene Aufgaben. Der ESP32 übernimmt das zyklische Einlesen der Sensoren und eine kleine Webanwendung. Die Schülerinnen und Schüler vergleichen dadurch nicht nur zwei Geräte, sondern zwei unterschiedliche Systemklassen:

| Gerät | Fachliche Rolle | Typische Aufgaben |
|---|---|---|
| ESP32 | Mikrocontroller und IoT-Knoten | GPIO, ADC, Sensoren, WLAN, kleiner Webserver |
| Raspberry Pi 4 | Linux-Computer | Betriebssystem, Kamera, Dateien, Video, Netzwerkdienste, Autostart |
| Schulhomepage bzw. Streamingdienst | öffentlich erreichbare Darstellung | Stream einbetten, Messwerte anzeigen, Datenschutz beachten |

### Angestrebtes Endsystem

Am Ende soll ein Prototyp folgende Funktionen zeigen:

1. Temperatur und relative Luftfeuchtigkeit werden vom ESP32 erfasst.
2. Ein LDR liefert einen experimentell kalibrierten Helligkeitswert.
3. Der ESP32 stellt Messwerte im lokalen WLAN als Webseite bereit.
4. Der Raspberry Pi erkennt die Kamera und kann Foto und Video aufnehmen.
5. Ein ausgehender Stream kann von einem dafür geeigneten Dienst verteilt werden.
6. Eine vorbereitete Schulwebseite kann Stream und Messwerte zusammenführen.
7. Die Systemteile starten nach einem Neustart möglichst automatisch.
8. Kamera und Netzwerk werden so eingerichtet, dass keine unnötigen Personen- oder Außenbereichsdaten erfasst werden.

### Sicherheits- und Realitätscheck vor Beginn

- **Keine Netzspannung im Schüleraufbau:** Es werden nur geprüfte USB-Netzteile, Kleinspannung und ungefährliche Stecksysteme verwendet.
- **Versorgung des KY-015 prüfen:** Das aktuelle Joy-IT-Produktblatt nennt für das KY-015-Modul 5 V Betriebsspannung, 0–50 °C, 20–90 % relative Luftfeuchtigkeit und eine Messung etwa alle zwei Sekunden. Vor dem Einsatz am ESP32 müssen Modulvariante, Datenpin und Pegel geprüft werden. Ein 5-V-Signal darf nicht direkt an einen 3,3-V-GPIO des ESP32 gelangen.
- **Messbereich ist keine Stallfreigabe:** Die verwendeten Lern-Sensoren sind nicht automatisch für eine dauerhafte, kalibrierte Tierwohlüberwachung geeignet.
- **Kamera zunächst lokal:** Der Raspberry Pi wird nicht direkt aus dem Schulnetz oder Internet erreichbar gemacht. Ein späterer Stream läuft ausgehend über einen freigegebenen Dienst.
- **Keine Tonaufzeichnung:** Audio bleibt deaktiviert.
- **Datenschutz vor Montage:** Bildausschnitt, Speicherort, Zugriffsrechte, Hinweisschild und Löschfristen werden vor der Installation geklärt.

---

## 2. Grobplanung der 14 Doppelstunden

| Einheit | Schwerpunkt | Meilenstein |
|---:|---|---|
| 1 | Systemidee, Mikrocontroller vs. Computer, Sicherheits- und Datenschutzdesign | Projektplan steht |
| 2 | ESP32, Arduino IDE, Upload, `setup()` und `loop()` | Serielle Ausgabe funktioniert |
| 3 | KY-015: digitale Temperatur- und Feuchtemessung | Zwei Messwerte werden ausgegeben |
| 4 | KY-018: LDR, Spannungsteiler und ADC | Helligkeitswert verändert sich nachvollziehbar |
| 5 | Beide Sensoren, Messintervalle und Datenqualität | Kombinierter Datensatz |
| 6 | WLAN, IP-Adresse und Fehlersuche im Netzwerk | ESP32 ist im WLAN erreichbar |
| 7 | HTTP und ESP32-Webserver | Messwert-Webseite funktioniert lokal |
| 8 | Raspberry Pi OS, SSH und Linux-Grundlagen | Raspberry Pi ist per SSH erreichbar |
| 9 | Kamera anschließen und testen | Livebild, Foto und Video funktionieren |
| 10 | NoIR, Infrarot und Videokompression | Nacht- und Datenmengenexperiment |
| 11 | Streamingarchitektur und verantwortungsvolle Veröffentlichung | Stream-Konzept ohne direkte Portfreigabe |
| 12 | Schulhomepage, Datenformat und Diagrammidee | Anzeigeentwurf mit Messwerten und Stream |
| 13 | Autostart, `systemd` und Ausfallsicherheit | Neustarttest gelingt |
| 14 | Installation, Abnahme, Dokumentation und Reflexion | Funktionsfähiger Prototyp |

Die Einheiten sind bewusst als Problemlöseaufgaben angelegt. Die Anleitung beschreibt den sicheren Rahmen, aber die Gruppen müssen jeweils eine Teilentscheidung treffen, Messungen durchführen und Fehler eingrenzen.

### Empfohlener Ablauf jeder Doppelstunde

1. **Einstieg und Problem:** Ein Fehlerbild, eine Designfrage oder ein Messauftrag.
2. **Theorie-Input:** maximal 15–20 Minuten mit Skizze und Fachbegriffen.
3. **Teamarbeit:** Aufbau, Programmierung oder Analyse.
4. **Sicherung:** Messwert, Screenshot, Schaltbild, Logauszug oder kurze Erklärung.
5. **Transfer:** Was ändert sich bei einem anderen Sensor, Netzwerk oder Einsatzort?

### Teamrollen

Die Rollen wechseln nach jeder Einheit:

- **Hardware:** Verdrahtung, Versorgung, Steckverbindungen
- **Software:** Code, Bibliotheken, Fehlermeldungen
- **Messung:** Messprotokoll, Vergleichswerte, Diagramm
- **Dokumentation:** Skizze, Screenshots, Meilenstein und offene Fragen

## 2.1 Gemeinsames Lernen und parallele Gruppenarbeit

Die Klasse arbeitet in zwei Projektgruppen, aber nicht in zwei getrennten Kursen. Alle Schülerinnen und Schüler erhalten denselben Theorie-Input, bearbeiten dieselben Grundbegriffe und schreiben dieselben individuellen Lernzielkontrollen. Die Gruppen teilen sich anschließend die praktische Vertiefung.

### Fester Ablauf für jede Doppelstunde

| Phase | Wer arbeitet? | Ergebnis |
|---|---|---|
| Einstieg und Theorie-Input | ganze Klasse | gemeinsames Tafelbild / Lernblatt |
| Individueller Theorie-Check | jede Person | drei bis fünf beantwortete Kontrollfragen |
| paralleler Arbeitsauftrag | Gruppe A und B | zwei verschiedene, aber zusammengehörige Teilergebnisse |
| Gruppenübergabe | beide Gruppen | Kurzpräsentation, Demo oder Messwertvergleich |
| individuelle Sicherung | jede Person | Eintrag im Grundlagenheft und Exit-Ticket |

Der Theorie-Input bleibt für alle verbindlich. Die praktische Aufteilung dient der Zeit und der Arbeit an verschiedenen Systemteilen. Sie darf nicht dazu führen, dass eine Person beispielsweise „HTTP“ gar nicht lernt, nur weil die eigene Gruppe in dieser Stunde am Kameraaufbau arbeitet.

### Gemeinsamer Klassenarbeitskern

Für Klassenarbeiten werden aus jeder Einheit verbindliche Grundlagen gesammelt. Jede Person muss erklären oder anwenden können:

- Systemaufbau: Sensor → Verarbeitung → Netzwerk → Ausgabe
- Unterschied zwischen Mikrocontroller und Linux-Computer
- `setup()`, `loop()`, GPIO und serielle Diagnose
- analoges und digitales Signal
- Widerstand, Spannung, Stromstärke und Ohmsches Gesetz
- LDR, Spannungsteiler und ADC
- Temperatur, relative Luftfeuchtigkeit, Messbereich und Messfehler
- WLAN, IP-Adresse, Client, Server und HTTP-Anfrage/Antwort
- Kamera, NoIR, Infrarot, Auflösung, Bildrate, Bitrate und H.264
- Datenminimierung, Zugriffsschutz und verantwortungsvolle Veröffentlichung
- Bootvorgang, Dienst, Logdatei und systematische Fehlersuche

### Drei mögliche Klassenarbeiten

Die Klassenarbeiten greifen den gemeinsamen Theorie-Input auf und verwenden neue, aber ähnliche Situationen. So wird nicht das Auswendiglernen eines bestimmten Aufbaus geprüft, sondern das Verständnis.

| Klassenarbeit | Zeitpunkt | Inhalte | Typische Aufgaben |
|---|---|---|---|
| 1 | nach Einheit 5 | Systemidee, ESP32, digitale/analoge Sensoren, Ohmsches Gesetz, LDR, Spannungsteiler, ADC, Messfehler | Schaltbild ergänzen, Messkette erklären, Spannungsteiler berechnen, Messreihe auswerten, Fehler finden |
| 2 | nach Einheit 9 | WLAN, IP, HTTP, Client/Server, Linux, SSH, Kamera und Dateiformate | Netzwerkweg zeichnen, HTTP-Antwort zuordnen, Diagnosebaum erstellen, Raspberry-Pi-Befehl erklären, Kamera-Fehler eingrenzen |
| 3 | nach Einheit 14 | NoIR, H.264, Streaming, Homepage, Datenschutz, `systemd`, Gesamtsystem | Bitrate berechnen, Architektur bewerten, Datenschutzentscheidung begründen, Dienstdiagnose lesen, Gesamtsystem planen |

Ein sinnvolles Verhältnis ist etwa 60 % gemeinsame Grundlagen, 25 % Anwendung auf einen unbekannten Fall und 15 % Begründung/Reflexion. Praktische Gruppenleistungen werden nicht ungeprüft als individuelle Klassenarbeitsleistung übernommen. Jede Person bearbeitet den fachlichen Kern selbst.

Jede Gruppe erstellt zusätzlich ein **Expertenergebnis**. Dieses wird in einer kurzen Übergabe der ganzen Klasse erklärt und in das gemeinsame Projektheft übernommen. In der Klassenarbeit werden Expertenthemen nicht als reine Detailfrage abgefragt, sondern als Anwendung: Die Schülerinnen und Schüler müssen einen Datenweg erklären, eine Messkurve deuten oder einen Fehlerdiagnoseweg begründen.

### Sinnvolle Aufteilung der zwei Gruppen

Die Gruppen werden nicht dauerhaft als „Sensorgruppe“ und „Kameragruppe“ etikettiert. Die Zuständigkeit wechselt, damit alle die Gesamtanlage verstehen. Die folgende Matrix ist ein praktikabler Startpunkt:

| Einheit | Gemeinsamer Pflichtteil für alle | Gruppe A | Gruppe B | Gemeinsame Übergabe |
|---:|---|---|---|---|
| 1 | System, Sicherheit, Datenschutz | Sensor-/ESP32-Datenweg | Kamera-/Pi-Datenweg | Blockdiagramm |
| 2 | Programmablauf, Upload, Serial Monitor | eigenes ESP32-Lebenszeichen | eigenes ESP32-Lebenszeichen plus Diagnosevergleich | Codevergleich |
| 3 | digitaler Sensor, Temperatur, Feuchte | Messreihe und Messintervall | Anschlussprüfung und Datenblattvergleich | Messprotokoll |
| 4 | LDR, Spannungsteiler, ADC | Kalibrierexperiment | Schaltung und ADC-Auswertung | gemeinsame Kennlinie |
| 5 | Datenqualität und Datensätze | Sensorprogramm zusammenführen | Fehlerfälle und Ausgabeformat | gemeinsames Datenformat |
| 6 | WLAN, IP und Diagnosekette | ESP32-WLAN-Code | Netzwerktest mit mehreren Clients | Fehlerbaum |
| 7 | HTTP und Client-Server-Modell | ESP32-Webserver | Browser-Test, HTML und Datenanzeige | Request-Response-Skizze |
| 8 | Linux, Betriebssystem, SSH | ESP32-Webseite stabilisieren | Raspberry Pi OS und SSH | Gerätevergleich |
| 9 | Kamera, Dateien, lokale Tests | lokale Messwertseite testen | Kamera anschließen und testen | Meilenstein-Demo |
| 10 | NoIR, Licht und Kompression | Bitrate-/Speicherberechnung | Nachtversuch mit NoIR | Versuchsprotokoll |
| 11 | Streaming und Datenschutz | Daten- und Zugriffskonzept | Streamingarchitektur | Freigabe-Checkliste |
| 12 | Datenanzeige und Status | JSON-/Messwertanzeige | Stream-Einbettung und Fallback | Homepage-Entwurf |
| 13 | Ausfallsicherheit | WLAN-Wiederverbindung und ESP32-Fehler | `systemd` und Pi-Autostart | Neustartprotokoll |
| 14 | Abnahme und Dokumentation | Sensorinstallation | Kamera- und Pi-Installation | Gesamtabnahme |

### Wo alle praktisch arbeiten sollten

Bei grundlegenden Kompetenzen ist eine Aufteilung nicht sinnvoll. Jede Person sollte mindestens einmal selbst:

1. ein Programm auf einen ESP32 laden,
2. den Serial Monitor verwenden,
3. einen Sensorwert lesen und auf Plausibilität prüfen,
4. eine Spannungsteiler- oder ADC-Aufgabe lösen,
5. eine IP-Adresse und HTTP-Adresse unterscheiden,
6. per SSH einen Befehl auf dem Pi ausführen,
7. die Kameraerkennung und eine Datei prüfen,
8. eine Fehlerdiagnose anhand des letzten funktionierenden Meilensteins durchführen.

Das kann durch kurze Stationswechsel, Tandemarbeit oder einen individuellen Mini-Check erreicht werden. Die Gruppe darf das Ergebnis gemeinsam entwickeln; die zentrale Handlung muss aber jede Person einmal nachvollziehbar durchgeführt oder erklärt haben.

### Wo eine Aufteilung besonders viel Zeit spart

Eine echte Parallelisierung lohnt sich ab Einheit 8. Während Gruppe B am Raspberry Pi arbeitet, kann Gruppe A die ESP32-Webseite und das Datenformat stabilisieren. Ab Einheit 9 können Kamera-/Streamingweg und Sensor-/Datenweg parallel getestet werden. In Einheit 13 ist die Aufteilung besonders sinnvoll, weil ESP32-Wiederverbindung und Raspberry-Pi-`systemd` unterschiedliche Arbeitsumgebungen benötigen.

### Übergabeformat zwischen den Gruppen

Jede Gruppe übergibt am Ende eine kurze technische Notiz:

- **Was funktioniert?**
- **Woran wurde es geprüft?**
- **Welche Werte oder Dateien entstehen?**
- **Welche Schnittstelle braucht die andere Gruppe?**
- **Was ist der letzte bekannte Fehler?**

Beispiel: „Der ESP32 antwortet unter `192.168.1.42` auf `/api/werte` mit JSON. Der LDR-Wert ist ein Rohwert und steigt bei unserem Aufbau bei Dunkelheit. Der Zeitstempel wird noch nicht vom ESP32 geliefert.“

### Leistungsbewertung bei Gruppenarbeit

Die Gruppenleistung bewertet das gemeinsame Teilergebnis, die individuelle Leistung wird durch Lernzielchecks, Erklärungen und das persönliche Grundlagenheft sichtbar. Für jede Doppelstunde eignet sich ein Exit-Ticket mit:

1. einem Begriff,
2. einer Rechnung oder Skizze,
3. einer Fehlerdiagnose,
4. einer Übertragungsfrage auf das Smart-Chicken-Coop-System.

---

## 3. Unterrichtseinheiten im Detail

## Einheit 1: Vom Problem zum System

### Lernziele

Die Schülerinnen und Schüler können den Gesamtaufbau als Teilsysteme beschreiben, Raspberry Pi und ESP32 begründet unterscheiden und erste Datenschutz- und Sicherheitsanforderungen formulieren.

### Material

Raspberry Pi 4, ESP32-Boards, Kamera, Sensoren, Breadboard, Karten mit Begriffen, Beamer, Planungsbogen.

### Theorie-Input für Schülerinnen und Schüler

Ein technisches System besteht aus **Eingaben**, **Verarbeitung**, **Übertragung** und **Ausgaben**. Ein Sensor wandelt eine physikalische Größe in ein elektrisches Signal um. Ein Rechner verarbeitet dieses Signal. Über ein Netzwerk werden Daten zu einem anderen Rechner übertragen. Eine Webseite macht die Daten für Menschen sichtbar.

Ein **Mikrocontroller** ist ein kleiner Rechner auf einem Chip. Er startet schnell, arbeitet meist direkt mit Pins und ist gut für wiederholte Steuer- und Messaufgaben geeignet. Ein Raspberry Pi ist ein vollständiger Linux-Computer. Er kann mehrere Programme und Netzwerkdienste gleichzeitig ausführen und eignet sich deshalb besser für Kamera, Dateien und Streaming.

Die Unterscheidung ist eine Systementscheidung: Der ESP32 soll nicht automatisch alle Aufgaben übernehmen, nur weil er kleiner ist. Der Raspberry Pi soll nicht jede einfache Messung erledigen, nur weil er leistungsfähiger ist.

### Schülerarbeitsauftrag

1. Zeichnet das Gesamtsystem als Blockdiagramm.
2. Ordnet jedem Block Eingabe, Verarbeitung, Übertragung oder Ausgabe zu.
3. Entscheidet, welche Aufgaben auf ESP32 und Raspberry Pi gehören. Begründet jede Entscheidung.
4. Markiert drei mögliche Fehlerstellen und formuliert je eine Prüf-Frage.
5. Zeichnet einen zulässigen und einen unzulässigen Kamerabildausschnitt.

### Erwartete Ergebnisse

Ein beschriftetes Systemdiagramm, eine begründete Aufgabenverteilung und eine erste Datenschutz-Checkliste.

### Typische Fehler und Fehlersuche

- **Fehler:** „WLAN“ wird als eigener Rechner eingezeichnet.  
  **Prüfung:** WLAN ist ein Übertragungsweg; der ESP32 bleibt der Messknoten.
- **Fehler:** Die Homepage greift direkt auf den Pi im Schulnetz zu.  
  **Prüfung:** Der Datenweg wird von innen nach außen geplant; öffentliche Zugriffe werden nicht spontan freigeschaltet.
- **Fehler:** Kamera wird nur als Hardware betrachtet.  
  **Prüfung:** Auch Bildausschnitt, Speicherung, Zugriff und Löschung gehören zum System.

### Differenzierung und Erweiterung

- **Unterstützung:** Vorgegebene Karten mit „Sensor“, „ADC“, „HTTP“, „Stream“, „Datei“.
- **Schnelle Gruppen:** Entwickeln zwei Architekturen und vergleichen Kosten, Latenz, Ausfallfolgen und Datenschutz.

### Sicherung für die spätere Lernseite

`categorize`: „Gehört eher zum ESP32, zum Raspberry Pi oder zur Homepage?“  
`reveal`: „Warum ist der Raspberry Pi nicht automatisch die beste Sensorzentrale?“  
`essay`: „Welche Information darf öffentlich erscheinen, welche nicht?“

---

## Einheit 2: ESP32 und Arduino-Grundprogramm

### Lernziele

Die Schülerinnen und Schüler installieren die ESP32-Unterstützung, wählen Board und Port aus, laden ein Programm hoch und erklären `setup()`, `loop()` und die serielle Ausgabe.

### Theorie-Input

Ein Programm besteht aus Anweisungen, die der Mikrocontroller ausführt. In der Arduino-Umgebung wird `setup()` einmal nach dem Start ausgeführt. `loop()` wird danach immer wieder durchlaufen. `Serial.println()` sendet Text über die USB-Verbindung an den Serial Monitor. Das ist zunächst keine Internetübertragung, sondern eine lokale Diagnoseverbindung.

Der Programmablauf ist zeitlich: Eine Ausgabe in `loop()` ohne Pause kann den Serial Monitor überfluten. Eine kurze Pause macht das Verhalten beobachtbar, ist aber keine gute allgemeine Zeitsteuerung. Später kann mit Zeitstempeln über `millis()` gearbeitet werden.

### Arbeitsauftrag: „Lebenszeichen“

Installiert die Arduino IDE und die passende ESP32-Board-Unterstützung. Wählt Board und COM-Port aus. Verändert anschließend das Programm so, dass eine Gruppe eine eindeutige Gerätekennung und einen Zähler ausgibt.

```cpp
void setup() {
  Serial.begin(115200);
  Serial.println("huehnercam-start");
}

void loop() {
  static unsigned long zaehler = 0;
  Serial.print("Lebenszeichen ");
  Serial.println(zaehler++);
  delay(1000);
}
```

### Erwartetes Ergebnis

Alle Sekunden erscheint eine neue Zeile mit wachsendem Zähler. Die Gruppe dokumentiert Boardname, Port, Baudrate und den letzten erfolgreichen Upload.

### Fehlersuche

1. Leuchtet die Stromversorgungs-LED?
2. Wird das USB-Gerät vom Computer erkannt?
3. Ist der richtige Boardtyp ausgewählt?
4. Ist der richtige Port ausgewählt?
5. Stimmen Baudrate im Programm und Serial Monitor überein?
6. Wird vielleicht ein anderes Terminalprogramm geöffnet gehalten?

### Differenzierung und Erweiterung

- **Unterstützung:** Start mit einem vorhandenen Blink- oder Serial-Beispiel.
- **Schnelle Gruppen:** Ersetzen `delay()` durch eine Zeitsteuerung mit `millis()` und erklären den Unterschied.

### Lernseitensicherung

`order`: Start, `setup()`, erster `loop()`-Durchlauf, weiterer `loop()`-Durchlauf.  
`verify`: „`setup()` wird bei jedem Durchlauf von `loop()` erneut ausgeführt.“ Lösung: falsch.

---

## Einheit 3: KY-015 als digitaler Sensor

### Lernziele

Die Schülerinnen und Schüler unterscheiden analoge und digitale Sensoren, schließen den KY-015 nach Datenblatt an, lesen Temperatur und relative Luftfeuchtigkeit aus und beurteilen Messbereich und Messintervall.

### Theorie-Input

Der KY-015 enthält einen DHT11. Er liefert seine Daten digital in einem festgelegten Protokoll. Der ESP32 erhält also nicht einfach eine Spannung, die er selbst in eine Zahl umwandelt. Eine Bibliothek übernimmt die zeitkritische Kommunikation und liefert Werte wie Temperatur in Grad Celsius und relative Luftfeuchtigkeit in Prozent.

**Relative Luftfeuchtigkeit** gibt an, wie viel Wasserdampf die Luft im Verhältnis zu ihrer temperaturabhängigen maximalen Aufnahme enthält. Sie ist nicht dasselbe wie die absolute Wassermenge in Gramm pro Kubikmeter. Der Sensor ist ein günstiger Lernsensor mit begrenztem Messbereich und begrenzter Genauigkeit. Neue Messungen sind nicht beliebig schnell verfügbar.

Physikalisch werden im DHT11 zwei unterschiedliche Effekte ausgewertet. Für die Temperatur verändert ein temperaturabhängiger Widerstand seinen Wert. Für die Feuchte verändert sich die Kapazität eines feuchteempfindlichen Materials. Die Elektronik misst diese Änderungen, verarbeitet sie und sendet das Ergebnis als digitale Daten. Der ESP32 misst hier also nicht selbst eine analoge DHT-Spannung über seinen ADC.

**Gemeinsamer Theorie-Check:** Zeichnet die Kette `Temperatur/Feuchte → Sensorelement → elektrische Änderung → Auswerteelektronik → digitale Daten → ESP32`. Markiert, an welcher Stelle der DHT11 eine eigene Auswertung vornimmt und warum eine DHT-Bibliothek trotzdem nötig ist.

### Anschluss und Sicherheitscheck

Die Belegung wird nicht nur nach Kabelfarbe, sondern nach dem konkreten Modulaufdruck und Datenblatt geprüft. Joy-IT gibt für die aktuelle KY-015-Variante 5 V Betriebsspannung an. Vor dem ESP32-Einsatz klärt die Gruppe:

- Welche Spannung benötigt genau dieses Modul?
- Welcher Pegel liegt am Datenpin an?
- Ist eine Pegelanpassung nötig?
- Ist der gewählte GPIO für das Signal geeignet?

Die Lehrkraft gibt den finalen, geprüften Anschluss frei. Das Beispiel nutzt als Datenpin GPIO 4, aber die Pinwahl ist dokumentiert und nicht blind übernommen.

### Arbeitsauftrag

1. Erstellt ein eigenes Anschlussbild mit VCC, GND und DATA.
2. Vergleicht das Modul-Datenblatt mit dem ESP32-Datenblatt.
3. Installiert eine passende DHT-Bibliothek und lest Temperatur und Feuchtigkeit aus.
4. Messt mindestens fünfmal mit sinnvoller Wartezeit.
5. Notiert Messwert, Uhrzeit und sichtbare Bedingungen.

```cpp
#include <DHT.h>

const int DHT_PIN = 4;
const int DHT_TYPE = DHT11;
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  float temperatur = dht.readTemperature();
  float feuchte = dht.readHumidity();

  if (isnan(temperatur) || isnan(feuchte)) {
    Serial.println("Messung fehlgeschlagen");
  } else {
    Serial.printf("Temperatur: %.1f C | Feuchte: %.1f %%\n",
                  temperatur, feuchte);
  }
  delay(2500);
}
```

### Erwartetes Ergebnis

Stabile, plausibel formatierte Werte und ein Messprotokoll. Die Schülerinnen und Schüler können erklären, warum ein DHT11 nicht im Sekundentakt beliebig neue Präzisionswerte liefert.

### Typische Fehler

- falscher Sensortyp in der Bibliothek, etwa DHT22 statt DHT11
- vertauschte Pins oder fehlende Masseverbindung
- zu kurze Messabstände
- nicht geprüfte Versorgungsspannung
- `nan` wird als echter Messwert weiterverarbeitet

### Erweiterung

Ermittelt den Mittelwert aus fünf gültigen Messungen und ergänzt im Protokoll eine Spalte „Messunsicherheit / mögliche Ursache“.

### Lernseitensicherung

`cloze`: „Der KY-015 liefert digital codierte Messdaten. Die relative Feuchtigkeit wird in Prozent RH angegeben. Der Messbereich und das Messintervall begrenzen die Aussagekraft.“  
`reveal`: „Warum ist ein einzelner Messwert keine zuverlässige Diagnose des Stallklimas?“

---

## Einheit 4: KY-018, LDR und ADC

### Lernziele

Die Schülerinnen und Schüler erklären den lichtabhängigen Widerstand, beschreiben einen Spannungsteiler und lesen einen analogen Eingang des ESP32 ein.

### Theorie-Input

Ein LDR ist ein **lichtabhängiger Widerstand**. Bei vielen LDRs sinkt der Widerstand bei mehr Licht. Der LDR liefert aber nicht automatisch einen Messwert in Lux. Zusammen mit einem festen Widerstand bildet er einen Spannungsteiler. Je nach Einbaurichtung steigt oder fällt die Ausgangsspannung bei mehr Licht.

Der **ADC** (Analog-Digital-Converter) wandelt eine Spannung in eine Zahl um. Diese Zahl beschreibt zunächst nur die Stellung innerhalb des Messbereichs des ADC. Sie ist keine universelle Helligkeitseinheit. Für eine sinnvolle Anzeige muss die Gruppe experimentell festlegen, welche Werte im eigenen Aufbau „dunkel“, „normal“ und „hell“ bedeuten.

Physikalisch ist der ADC eine Abtast- und Quantisierungseinrichtung: Eine kontinuierliche Spannung wird zu diskreten Zeitpunkten erfasst und auf eine endliche Zahl von Stufen gerundet. Bei 12 Bit sind idealisiert 4096 Codes möglich. Die elektrische Auflösung kann klein sein, während der LDR selbst ungenau, temperaturabhängig und nichtlinear ist. Deshalb darf die Zahl 1430 nicht als „1430 Lux“ gelesen werden.

**Gemeinsamer Theorie-Check:** Berechnet für `0 bis 3,3 V` und 12 Bit die theoretische Spannung pro ADC-Stufe. Erklärt anschließend, warum ein Messwert trotz kleiner ADC-Stufe nicht automatisch eine genaue Helligkeitsmessung ist.

Beim klassischen ESP32 ist GPIO 34 ein Eingang und gehört zu ADC1. Das ist für den Versuch geeignet. Bei WLAN-Projekten sollte ADC1 bevorzugt werden, weil ADC2 durch WLAN-Funktionen eingeschränkt sein kann.

### Arbeitsauftrag: „Was ist hell?“

1. Zeichnet den LDR als Widerstand, der von Licht abhängt.
2. Schließt den Analogausgang des KY-018 an einen geprüften ADC1-Pin an, zum Beispiel GPIO 34.
3. Gebt den Rohwert über den Serial Monitor aus.
4. Messt mit abgedecktem Sensor, normaler Raumbeleuchtung und Taschenlampe.
5. Prüft, ob der Wert bei mehr Licht steigt oder fällt.
6. Legt eine eigene Anzeige-Skala fest, ohne den Rohwert fälschlich als Lux zu bezeichnen.

```cpp
const int LDR_PIN = 34;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int lichtwert = analogRead(LDR_PIN);
  Serial.print("Licht-Rohwert: ");
  Serial.println(lichtwert);
  delay(500);
}
```

### Erwartetes Ergebnis

Die Werte reagieren reproduzierbar auf Abschattung und Beleuchtung. Die Gruppe notiert die Richtung der Änderung und die Grenzen ihrer Skala.

### Typische Fehler

- Analog- und Digitalausgang des Moduls verwechselt
- GPIO nicht ADC-fähig oder als Ausgang verwendet
- Messwertrichtung nicht experimentell geprüft
- Rohwert als absolute physikalische Einheit interpretiert
- offene Masseverbindung oder instabile Versorgung

### Erweiterung

Untersucht den Einfluss von Abstand, Blickwinkel und Taschenlampe. Diskutiert, warum eine Kamera mit automatisch geregelter Belichtung nicht direkt dieselbe Helligkeit misst wie ein LDR.

### Lernseitensicherung

`p2`: LDR – lichtabhängiger Widerstand; ADC – Spannung-zu-Zahl-Umsetzer; Rohwert – geräte- und einstellungsabhängige Messzahl; Lux – physikalische Beleuchtungsgröße.  
`verify`: „Ein LDR-Modul liefert ohne Kalibrierung automatisch Lux.“ Lösung: falsch.

---

## Einheit 5: Sensoren zusammenführen und Datenqualität

### Lernziele

Die Schülerinnen und Schüler führen mehrere Sensorwerte in einem Datensatz zusammen, berücksichtigen unterschiedliche Messintervalle und erkennen ungültige oder unplausible Messwerte.

### Theorie-Input

Ein Messwert ist erst dann gut nutzbar, wenn auch **Zeitpunkt**, **Einheit**, **Quelle** und **Gültigkeit** bekannt sind. Ein Datensatz könnte daher so aussehen:

```text
zeit=12:04:10; temp=18.7 C; feuchte=65.0 %RH; licht_raw=1430; status=ok
```

Sensoren haben unterschiedliche Antwortzeiten und Genauigkeiten. Ein Programm muss deshalb fehlende Werte erkennen und darf nicht einfach den letzten Wert als neue Messung ausgeben, ohne dies kenntlich zu machen. Für erste Versuche reicht eine Zeile pro Messzyklus; später eignet sich JSON besser für Webseiten.

### Arbeitsauftrag

Kombiniert KY-015 und KY-018. Erzeugt alle zwei bis drei Sekunden eine vollständige Zeile. Baut eine Gültigkeitsprüfung ein. Simuliert anschließend einen Fehler, indem ihr den Sensor abzieht, und beobachtet, wie das Programm reagiert.

```cpp
// Ausschnitt: Werte lesen und gemeinsam ausgeben
float temperatur = dht.readTemperature();
float feuchte = dht.readHumidity();
int lichtwert = analogRead(LDR_PIN);

if (isnan(temperatur) || isnan(feuchte)) {
  Serial.println("status=sensor_error");
} else {
  Serial.printf("temp=%.1f;feuchte=%.1f;licht_raw=%d;status=ok\n",
                temperatur, feuchte, lichtwert);
}
```

### Erwartetes Ergebnis

Eine nachvollziehbare Messwertfolge, ein Fehlerprotokoll und eine Aussage darüber, welche Werte bei getrenntem Sensor nicht mehr gültig sind.

### Typische Fehler und Fehlersuche

- Sensorfehler wird als `0` interpretiert
- Werte werden ohne Einheit ausgegeben
- LDR und DHT werden mit unpassenden Intervallen abgefragt
- Ausgabe ist für Menschen lesbar, aber für spätere Software schwer zu parsen

### Differenzierung

- **Unterstützung:** Vorgegebenes Ausgabeformat und Checkliste.
- **Schnelle Gruppen:** Ausgabe zusätzlich als JSON: `{"temp":18.7,"humidity":65,"light":1430}`. Diskutiert Dezimaltrennzeichen und fehlende Werte.

### Lernseitensicherung

`categorize`: gültige Messung, ungültige Messung, Warnung.  
`essay`: „Welche Information muss eine Homepage anzeigen, damit ein Messwert nicht missverstanden wird?“

---

## Einheit 6: WLAN, IP-Adresse und Netzwerkdiagnose

### Lernziele

Die Schülerinnen und Schüler verbinden den ESP32 mit einem freigegebenen WLAN, erklären IP-Adresse und lokale Erreichbarkeit und arbeiten mit einer systematischen Fehlerkette.

### Theorie-Input

Ein Netzwerkgerät benötigt eine Adresse, damit Daten ankommen können. Eine lokale **IP-Adresse** identifiziert ein Gerät innerhalb eines Netzwerks. Der Router verbindet lokale Geräte mit anderen Netzen und übernimmt oft die automatische Vergabe von Adressen. Ein Gerätename wie `huehnercam` ist nicht dasselbe wie die IP-Adresse; Namen werden über Namensauflösung in Adressen übersetzt.

„Mit WLAN verbunden“ bedeutet noch nicht „im Internet erreichbar“. Für das Projekt ist lokale Erreichbarkeit zunächst ausreichend. Öffentliche Erreichbarkeit wird aus Sicherheits- und Datenschutzgründen nicht durch eine spontane Portfreigabe hergestellt.

### Arbeitsauftrag

1. Verbindet den ESP32 mit einem eigens freigegebenen Projekt-WLAN.
2. Gebt nach erfolgreicher Verbindung die IP-Adresse aus.
3. Prüft vom Rechner aus, ob die Adresse erreichbar ist.
4. Erstellt eine Fehlerkette: Stromversorgung → WLAN-Name/Passwort → Verbindung → IP-Adresse → Erreichbarkeit.

```cpp
#include <WiFi.h>

const char* ssid = "PROJEKT_WLAN";
const char* passwort = "PASSWORT_HIER";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, passwort);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("IP-Adresse: ");
  Serial.println(WiFi.localIP());
}

void loop() {}
```

### Erwartetes Ergebnis

Eine protokollierte IP-Adresse und ein reproduzierbarer Verbindungsaufbau.

### Typische Fehler

- Tippfehler bei SSID oder Passwort
- falsches WLAN oder Client-Isolation
- serieller Monitor geschlossen oder falsche Baudrate
- IP-Adresse hat sich nach Neustart geändert
- Testgerät befindet sich in einem anderen Netzsegment

### Erweiterung

Zeigt Statusmeldungen für „verbinde“, „verbunden“ und „Verbindung verloren“ an. Erklärt, warum ein Neustart eine neue IP-Adresse bringen kann.

### Lernseitensicherung

`order`: Strom einschalten, WLAN verbinden, IP erhalten, HTTP-Anfrage beantworten.  
`reveal`: „Warum ist die lokale IP-Adresse keine geeignete Adresse für die Schulhomepage?“

---

## Einheit 7: ESP32 als HTTP-Webserver

### Lernziele

Die Schülerinnen und Schüler erklären Client-Server-Kommunikation, starten einen lokalen HTTP-Server und stellen Sensorwerte als Webseite dar.

### Theorie-Input

Bei HTTP sendet ein **Client**, zum Beispiel ein Browser, eine Anfrage. Ein **Server** verarbeitet sie und sendet eine Antwort zurück. Die Antwort kann HTML oder Daten enthalten. Die Adresse besteht vereinfacht aus Protokoll, IP-Adresse und Pfad, etwa `http://192.168.1.42/`.

Ein kleiner ESP32-Webserver kann eine HTML-Seite ausliefern. Für eine erste Version reicht eine neue Seite bei jedem Browseraufruf. Bei einer späteren Version kann JavaScript einen Daten-Endpunkt regelmäßig abfragen. HTTP allein ist keine Garantie für Zugriffsschutz. Die Lernversion bleibt daher im Projekt-WLAN.

### Arbeitsauftrag

Erweitert den Sensorcode um einen Webserver. Die Startseite soll Temperatur, Feuchte und Helligkeit mit Einheiten und einem Zeitstempel anzeigen. Testet mindestens zwei Geräte gleichzeitig.

```cpp
#include <WebServer.h>

WebServer server(80);

void handleRoot() {
  float temperatur = dht.readTemperature();
  float feuchte = dht.readHumidity();
  int lichtwert = analogRead(LDR_PIN);

  String html = "<!doctype html><html lang='de'><meta charset='utf-8'>";
  html += "<title>Hühnerstall Messwerte</title><body>";
  html += "<h1>Hühnerstall</h1>";
  html += "<p>Temperatur: " + String(temperatur, 1) + " °C</p>";
  html += "<p>Feuchte: " + String(feuchte, 1) + " %RH</p>";
  html += "<p>Helligkeit (Rohwert): " + String(lichtwert) + "</p>";
  html += "</body></html>";
  server.send(200, "text/html; charset=utf-8", html);
}

void setup() {
  // WLAN-Verbindung aus Einheit 6 herstellen.
  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  server.handleClient();
}
```

### Erwartetes Ergebnis

Die Webseite ist unter der lokalen IP-Adresse erreichbar und zeigt Werte mit passenden Einheiten. Die Gruppe kann Request, Serververarbeitung und Response erklären.

### Typische Fehler

- Browser und ESP32 sind nicht im selben Netz
- `server.handleClient()` fehlt in `loop()`
- HTML-String enthält Anführungszeichenfehler
- Messwerte werden beim Seitenaufruf nicht gültig gelesen
- kein Hinweis auf veraltete Werte

### Erweiterung

Implementiert `/api/werte` mit JSON und lasst die Seite die Daten per `fetch()` nachladen. Überlegt, ob die Seite dann ohne vollständiges Neuladen aktualisiert werden kann.

### Lernseitensicherung

`p2`: Browser – Client; ESP32 – Server; URL – Adresse einer Ressource; HTTP-Status 200 – erfolgreiche Antwort; HTTP-Status 404 – Ressource nicht gefunden.  
`mcq`: „Wer initiiert bei einer normalen HTTP-Anfrage den Austausch?“ Lösung: der Client.

---

## Einheit 8: Raspberry Pi OS, SSH und Linux

### Lernziele

Die Schülerinnen und Schüler installieren ein Raspberry Pi OS auf der microSD-Karte, richten einen eindeutigen Hostnamen ein und greifen ohne Monitor per SSH zu.

### Theorie-Input

Ein Betriebssystem verwaltet Hardware, Dateien, Prozesse und Benutzer. Linux wird auf dem Raspberry Pi über eine Shell administriert. **SSH** ist eine verschlüsselte Fernzugriffsmöglichkeit für eine Shell. Der Befehl `hostname` zeigt den Gerätenamen; `hostname -I` zeigt die lokalen IP-Adressen.

Der Raspberry Pi 4 ist in diesem Projekt kein „großer Arduino“. Er bootet ein Betriebssystem, startet Dienste und kann Dateien sowie Netzwerkprozesse verwalten. Das macht ihn leistungsfähiger, aber auch wartungsintensiver.

### Arbeitsauftrag

1. Schreibt das 64-Bit-Raspberry-Pi-OS auf die microSD-Karte.
2. Vergibt den Hostnamen `huehnercam` oder eine gruppenspezifische Variante.
3. Aktiviert SSH mit sicherem Benutzerkonto und starkem Passwort.
4. Verbindet euch per SSH und dokumentiert `hostname`, `hostname -I`, `uname -a` und den freien Speicherplatz.
5. Erstellt ein Verzeichnis für das Projekt und legt dort eine Textdatei an.

```bash
hostname
hostname -I
uname -a
df -h
mkdir -p ~/huehnercam
cd ~/huehnercam
```

### Erwartetes Ergebnis

Der Pi ist ohne Tastatur und Bildschirm per SSH erreichbar. Jede Gruppe kennt Hostname, IP-Adresse und Zugangsdatenverwaltung, aber speichert Passwörter nicht in öffentlichen Dateien.

### Typische Fehler

- Pi und Arbeitsrechner nicht im selben Netz
- SSH-Dienst nicht aktiviert
- falscher Hostname oder falsche IP-Adresse
- Netzteil oder microSD-Karte instabil
- private Zugangsdaten im Code oder Screenshot veröffentlicht

### Erweiterung

Vergleicht Dateirechte und Prozesse. Erklärt, warum ein Dienst nicht mit unnötig hohen Rechten laufen sollte.

### Lernseitensicherung

`verify`: „SSH überträgt das Passwort und alle Befehle grundsätzlich unverschlüsselt.“ Lösung: falsch; SSH ist für verschlüsselten Fernzugriff gedacht, die Konfiguration und Schlüsselverwaltung bleiben trotzdem wichtig.

---

## Einheit 9: Camera Module 3 anschließen und prüfen

### Lernziele

Die Schülerinnen und Schüler schließen ein CSI-Kameramodul spannungsfrei an, prüfen die Erkennung und unterscheiden Vorschau, Foto und Video.

### Theorie-Input

Die Kamera liefert Bilddaten an den Raspberry Pi. Die aktuelle Raspberry-Pi-Software verwendet seit Raspberry Pi OS Bookworm die `rpicam-*`-Programme. `rpicam-hello` zeigt eine Vorschau, `rpicam-still` nimmt ein Foto auf und `rpicam-vid` zeichnet Video auf. Ein Livebild ist noch kein öffentlicher Livestream.

Das CSI-Kabel ist kein beliebiges Jumperkabel. Vor dem Umstecken wird der Pi ausgeschaltet und spannungsfrei gemacht. Eine Fehlersuche beginnt mit der Geräteerkennung und nicht mit der Homepage.

### Arbeitsauftrag

1. Schaltet den Raspberry Pi aus und montiert das CSI-Kabel in der richtigen Orientierung.
2. Prüft die erkannte Kamera.
3. Startet eine kurze Vorschau.
4. Nehmt ein Foto und ein zehnsekündiges Video auf.
5. Vergleicht Dateigröße und Bildinhalt.

```bash
rpicam-hello --list-cameras
rpicam-hello -t 5000
rpicam-still -o huhn.jpg
rpicam-vid -t 10000 -o huhn.h264
```

### Erwartetes Ergebnis

Die Kamera wird gelistet, ein Vorschaubild erscheint, Foto und Videodatei werden gespeichert.

### Typische Fehler und Diagnosekette

1. Ist der Pi eingeschaltet und stabil versorgt?
2. Sitzt das Kabel gerade und in der richtigen Buchse?
3. Wird die Kamera mit `--list-cameras` erkannt?
4. Funktioniert `rpicam-hello` lokal?
5. Existiert die Ausgabedatei und ist sie größer als null Bytes?

### Erweiterung

Untersucht Auflösung, Bildrate und Autofokus der Camera Module 3. Dokumentiert, wie sich Parameter auf Bildqualität und Dateigröße auswirken.

### Lernseitensicherung

`order`: Pi ausschalten, Kabel anschließen, Pi starten, Kamera auflisten, Vorschau testen, Datei aufnehmen.  
`reveal`: „Warum ist `rpicam-hello` ein besserer erster Test als ein direkter Homepage-Test?“

---

## Einheit 10: NoIR, Infrarot und Videokompression

### Lernziele

Die Schülerinnen und Schüler erklären den Unterschied zwischen sichtbarem Licht und nahem Infrarot, planen einen Nachtversuch und berechnen die Größenordnung einer Videodatenmenge.

### Theorie-Input: NoIR

Eine normale Kamera besitzt einen IR-Sperrfilter. Die NoIR-Variante besitzt diesen Filter nicht und kann daher neben sichtbarem Licht auch nahes Infrarot erfassen. In vollständiger Dunkelheit entsteht trotzdem kein Bild: Es müssen Photonen vorhanden sein. Eine passende IR-Beleuchtung, etwa im Bereich um 850 nm, kann die Szene für die Kamera sichtbar machen.

IR-Licht ist für Menschen je nach Wellenlänge und Leistung kaum sichtbar. Das bedeutet nicht automatisch, dass jede Leuchte sicher ist. Es werden nur geprüfte, geeignete Leuchten verwendet; die Schülerinnen und Schüler richten kein starkes Licht auf Augen oder Tiere.

### Theorie-Input: Video

Ein unkomprimiertes Video besteht aus vielen Einzelbildern. Datenmenge hängt unter anderem von Auflösung, Bildrate, Farbtiefe und Dauer ab. H.264 reduziert die Datenmenge durch räumliche und zeitliche Kompression. Ein niedrigerer Bitratenwert spart Speicher und Bandbreite, kann aber Details und Bewegungen schlechter darstellen.

### Arbeitsauftrag

1. Vergleicht sichtbares Licht, abgedunkelten Raum und IR-Beleuchtung.
2. Notiert, ob die NoIR-Kamera ein Bild erzeugt und wie sich die Szene verändert.
3. Nehmt Videos mit verschiedenen Bildraten oder Bitraten auf.
4. Berechnet die Tagesmenge bei einer Beispielbitrate von 2 Mbit/s.

```text
2 Mbit/s × 60 × 60 × 24 = 172 800 Mbit/Tag
172 800 Mbit / 8 = 21 600 MB ≈ 21,6 GB/Tag
```

Das ist eine Näherung. Container, Audio, variable Bitrate und Metadaten können die tatsächliche Größe verändern. Audio bleibt in unserem Projekt deaktiviert.

### Erwartetes Ergebnis

Ein Versuchsprotokoll zur Nachtfähigkeit und eine begründete Entscheidung für eine praktikable Auflösung, Bildrate und Bitrate.

### Typische Fehler

- NoIR wird mit einer Wärmebildkamera verwechselt
- „Kein sichtbares Licht“ wird mit „keine Strahlung“ verwechselt
- H.264-Datei wird nur nach Dateiendung beurteilt
- Bit und Byte werden verwechselt
- die Kamera liefert in Dunkelheit ohne IR-Quelle kein brauchbares Bild

### Erweiterung

Berechnet Bandbreite und Speichermenge für drei Bitraten. Bewertet, ob 24/7-Aufzeichnung überhaupt notwendig ist oder ob ein Livebild ohne dauerhafte Speicherung genügt.

### Lernseitensicherung

`mcq`: „Warum sieht die NoIR-Kamera im völlig dunklen Stall trotzdem nichts?“ Lösung: Weil ohne Licht keine Bildinformation den Sensor erreicht.  
`cloze`: „8 Bit ergeben 1 Byte. Eine Bitrate beschreibt Daten pro Zeit, nicht automatisch die Dateigröße.“

---

## Einheit 11: Livestream ohne direkte Veröffentlichung des Raspberry Pi

### Lernziele

Die Schülerinnen und Schüler unterscheiden lokale Vorschau, Upload-Stream und öffentliche Auslieferung und entwickeln eine Architektur mit möglichst kleiner Angriffsfläche.

### Theorie-Input

Bei einem direkten öffentlichen Zugriff müsste der Raspberry Pi aus dem Internet erreichbar sein. Das würde Portfreigaben, sichere Authentifizierung, Updates und laufende Absicherung erfordern. Für ein Schulprojekt ist ein ausgehender Stream zu einem freigegebenen Streamingdienst meist übersichtlicher: Der Pi baut die Verbindung nach außen auf; der Dienst verteilt den Stream an Zuschauerinnen und Zuschauer.

Das ist keine automatische Sicherheitsgarantie. Zugangsdaten, Streamschlüssel und Veröffentlichungseinstellungen müssen geschützt werden. Ein Stream kann außerdem personenbezogene Daten enthalten, wenn Menschen, Stimmen oder identifizierbare Bereiche aufgenommen werden.

### Arbeitsauftrag

1. Zeichnet drei Varianten: nur lokal, Pi direkt öffentlich, Pi → Streamingdienst → Homepage.
2. Bewertet jede Variante nach Einrichtung, Wartung, Datenschutz und Ausfallrisiko.
3. Entscheidet euch für eine Architektur und formuliert fünf technische Regeln.
4. Testet zunächst nur mit einem nicht öffentlichen oder schulisch freigegebenen Kanal.

### Erwartetes Ergebnis

Ein Architekturdiagramm und eine Freigabe-Checkliste. Der technische Streamingdienst wird erst verwendet, wenn die Schule die Nutzung, Konten und Veröffentlichung geklärt hat.

### Typische Fehler

- Streamschlüssel wird in Git, Screenshot oder Webseite veröffentlicht
- der Pi wird per Portfreigabe direkt ins Internet gestellt
- Teststream ist unbeabsichtigt öffentlich
- die lokale Kamera funktioniert, aber der Uploadweg nicht

### Erweiterung

Entwickelt einen Ausfallplan: Was soll die Homepage anzeigen, wenn der Stream nicht verfügbar ist? „Letzter Messwert“, „keine aktuellen Daten“ und „Kamera offline“ müssen unterschieden werden.

### Lernseitensicherung

`categorize`: lokal, ausgehend, öffentlich.  
`essay`: „Welche Information sollte niemals in einer öffentlichen HTML-Datei stehen und warum?“

---

## Einheit 12: Messwerte in der Schulhomepage

### Lernziele

Die Schülerinnen und Schüler entwerfen eine verständliche Datenanzeige, trennen Messwert, Einheit und Zeitpunkt und entscheiden, wie Daten vom ESP32 zur Webseite gelangen.

### Theorie-Input

Eine Messwertanzeige braucht mindestens Wert, Einheit und Zeitpunkt. Zusätzlich sollte erkennbar sein, ob der Wert aktuell ist. Ein Rohwert des LDR darf nicht als Lux bezeichnet werden, wenn keine Kalibrierung vorliegt.

Für die spätere Seite sind zwei Wege denkbar:

1. **Browser fragt ESP32:** einfach für den lokalen Versuch, aber für eine öffentliche Homepage meist nicht geeignet, weil der ESP32 privat adressiert und nicht öffentlich abgesichert ist.
2. **ESP32 sendet an einen vermittelnden Server:** geeigneter für eine öffentliche Darstellung, wenn Authentifizierung, Datenformat, Speicherfrist und Zugriff geregelt sind.

Die Homepage kann einen Stream einbetten, ohne selbst die gesamte Videotechnik zu übernehmen. Stream und Messdaten sind getrennte Datenwege und dürfen unabhängig ausfallen.

### Arbeitsauftrag

1. Entwerft eine Homepage-Anzeige mit Stream-Platzhalter, drei Messwerten, Zeitpunkt und Status.
2. Markiert, welche Daten aktuell, veraltet oder nicht verfügbar sind.
3. Erstellt ein JSON-Beispiel.
4. Zeichnet den Datenweg vom Sensor bis zum Browser.

```json
{
  "timestamp": "2026-08-05T12:04:10+02:00",
  "temperature_c": 18.7,
  "humidity_rh": 65.0,
  "light_raw": 1430,
  "status": "ok"
}
```

### Erwartetes Ergebnis

Ein verständlicher Anzeigeentwurf mit klaren Einheiten, Zeitstempel und Ausfallzustand. Noch keine Veröffentlichung ohne schulische Prüfung.

### Typische Fehler

- Aktualisierungszeitpunkt fehlt
- Rohwert wird als Lux interpretiert
- veraltete Daten sehen wie aktuelle Daten aus
- Stream und Sensorstatus werden zu einer einzigen „online/offline“-Anzeige vermischt

### Erweiterung

Entwerft ein Diagramm für die letzten 24 Stunden und diskutiert, wie fehlende Werte dargestellt werden. Ergänzt eine Warnung, ohne aus einem einzelnen Lernsensorwert eine tiermedizinische Aussage zu machen.

### Lernseitensicherung

`p2`: Wert – Zahl mit Einheit; Zeitstempel – Zeitpunkt; Status – Gültigkeit/Verfügbarkeit; Rohwert – nicht automatisch kalibrierte Größe.  
`reveal`: „Warum darf ein älterer Messwert nicht kommentarlos als aktuell erscheinen?“

---

## Einheit 13: Autostart und Ausfallsicherheit

### Lernziele

Die Schülerinnen und Schüler analysieren eine Fehlerkette nach Stromausfall, erstellen einen Dienst für den Raspberry Pi und testen automatischen Neustart kontrolliert.

### Theorie-Input

Ein System ist ausfallsicherer, wenn es nach einem Neustart selbstständig in einen bekannten Zustand zurückkehrt. Dafür müssen Abhängigkeiten berücksichtigt werden: Erst bootet das Betriebssystem, dann wird das Netzwerk verfügbar, danach startet der Kameraprozess. Ein Dienstmanager wie `systemd` kann Programme starten, protokollieren und bei Fehlern neu starten.

Autostart ersetzt keine Wartung. Ein Prozess, der wegen einer falschen Konfiguration ständig neu startet, ist nicht funktionstüchtig. Deshalb gehören Statusabfrage und Logs zur Lösung.

### Arbeitsauftrag

1. Erstellt zunächst ein kleines ungefährliches Testprogramm, das regelmäßig eine Zeitmarke in eine Logdatei schreibt.
2. Legt dafür einen `systemd`-Dienst an.
3. Prüft Status und Journal.
4. Simuliert einen kontrollierten Prozessfehler.
5. Testet anschließend den Neustart des Pi und dokumentiert die Reihenfolge.

Beispiel für `/etc/systemd/system/huehnercam-test.service`:

```ini
[Unit]
Description=Hühnercam Testdienst
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /home/pi/huehnercam/testdienst.py
Restart=on-failure
RestartSec=5
User=pi

[Install]
WantedBy=multi-user.target
```

Beispielbefehle:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now huehnercam-test.service
systemctl status huehnercam-test.service
journalctl -u huehnercam-test.service -n 50 --no-pager
```

### Erwartetes Ergebnis

Der Dienst startet nach dem Bootvorgang automatisch und wird nach einem kontrollierten Fehler neu gestartet. Die Gruppe kann den Unterschied zwischen „Dienst läuft“, „Dienst ist aktiviert“ und „Dienst ist fehlerfrei“ erklären.

### Typische Fehler

- falscher absoluter Pfad in `ExecStart`
- Dienst nach Änderung nicht neu geladen
- Benutzer besitzt keine Schreibrechte
- Netzwerk ist beim Start noch nicht verfügbar
- Neustartschleife wird nicht anhand des Journals untersucht

### Erweiterung

Ersetzt den Testdienst durch den lokalen Kameraprozess oder Sensorprozess. Definiert, welche Fehler einen Neustart rechtfertigen und welche dauerhaft behoben werden müssen.

### Lernseitensicherung

`order`: Boot, Netzwerk, Dienststart, Kamera-/Sensorprozess, Statusprüfung.  
`verify`: „`Restart=on-failure` behebt automatisch jeden Konfigurationsfehler.“ Lösung: falsch.

---

## Einheit 14: Installation, Abnahme und Reflexion

### Lernziele

Die Schülerinnen und Schüler installieren den Prototyp verantwortungsvoll, prüfen alle Meilensteine, dokumentieren Grenzen und präsentieren eine technische Entscheidung mit Begründung.

### Theorie-Input

Ein Prototyp ist erst dann gelungen, wenn er unter den vorgesehenen Bedingungen nachvollziehbar funktioniert. Zur Abnahme gehören daher nicht nur ein schönes Bild und aktuelle Zahlen, sondern auch Montage, Versorgung, Wärme, Staub, Feuchtigkeit, Zugriffsschutz, Datenschutz und Wiederanlauf.

Die Kamera wird so ausgerichtet, dass möglichst nur der Hühnerbereich sichtbar ist. Personen, Schulhof und öffentliche Wege werden nicht unnötig erfasst. Audio bleibt deaktiviert. Die schulischen Verantwortlichen klären vor dem Betrieb die datenschutzrechtliche Grundlage, Zweckbindung, Zugriffsrechte, Speicher- und Löschregeln sowie die Information betroffener Personen. Die Hinweise der Datenschutzaufsicht sind dabei keine automatische Projektfreigabe, sondern eine Grundlage für die schulische Prüfung.

### Abnahmeauftrag

Jede Gruppe führt einen vollständigen Test durch:

| Prüfschritt | bestanden? | Nachweis |
|---|---|---|
| ESP32 startet und sendet Messwerte |  | Serial-Screenshot |
| Temperatur und Feuchte sind plausibel |  | Messprotokoll |
| LDR reagiert auf Lichtänderung |  | Versuchstabelle |
| WLAN-Verbindung funktioniert |  | IP-Adresse |
| ESP32-Webseite antwortet |  | Browser-Screenshot |
| Pi bootet stabil |  | Bootprotokoll |
| Pi ist per SSH erreichbar |  | Terminalausgabe |
| Kamera wird erkannt |  | `rpicam-hello --list-cameras` |
| Foto und Video funktionieren |  | Testdateien |
| Streamweg ist freigegeben und getestet |  | Freigabevermerk |
| Messwertanzeige unterscheidet Status |  | Seitenentwurf |
| Autostart und Fehlerneustart funktionieren |  | Neustarttest |
| Kamerabildausschnitt ist geprüft |  | Montagefoto/Skizze |

### Fehlersuchstrategie im Gesamtsystem

Immer den letzten funktionierenden Meilenstein prüfen. Beim Livestream lautet die Kette beispielsweise:

1. Wird die Kamera erkannt?
2. Funktioniert die lokale Vorschau?
3. Kann lokal ein Video aufgezeichnet werden?
4. Hat der Pi Netzwerkzugriff?
5. Kann der Streamingdienst erreicht werden?
6. Ist der Stream dort sichtbar?
7. Ist nur noch die Einbettung in der Homepage fehlerhaft?

### Abschlussprodukt

Jede Gruppe gibt ab:

- Systemdiagramm
- Schaltbild und Pin-Tabelle
- kommentierte Kernprogramme
- Messprotokoll mit Einheiten und Grenzen
- Fehlersuchprotokoll mit mindestens einem echten Fehler
- Datenschutz- und Montagecheckliste
- Abnahmebogen
- kurze Reflexion: „Welche Entscheidung hat unser System am stärksten beeinflusst?“

### Lernseitensicherung

`essay`: „Beschreibe einen Fehler, den ihr nicht durch Raten, sondern durch Eingrenzen gefunden habt.“  
`mcq`: „Welche Reihenfolge ist bei einem Livestreamfehler fachlich sinnvoll?“ Lösung: lokale Kamera prüfen, lokale Aufnahme prüfen, Netzwerk prüfen, Streamingweg prüfen, Homepage prüfen.

---

## 4. Fachliche Grundlagen als Nachschlagekapitel

### 4.1 Mikrocontroller, Computer und IoT

Ein Mikrocontroller verbindet Rechenwerk, Speicher und Ein-/Ausgänge auf einem Chip. Er eignet sich für deterministische, energiearme und wiederholte Aufgaben. Ein Einplatinencomputer wie der Raspberry Pi führt ein Betriebssystem aus und kann verschiedene Prozesse, Benutzer und Netzwerkdienste verwalten. Ein IoT-System verbindet solche Geräte mit einem Netzwerk, damit Messwerte übertragen oder Aktionen ausgelöst werden.

**Merksatz:** Der ESP32 ist der nahe, schnelle Messknoten. Der Raspberry Pi ist die flexible Linux-Plattform für Kamera und Dienste.

### 4.2 GPIO, digital und analog

Ein digitaler Eingang unterscheidet idealisiert zwei Zustände, etwa LOW und HIGH. Ein analoger Eingang misst eine Spannung innerhalb eines begrenzten Bereichs und wandelt sie in eine Zahl. Ein GPIO ist nicht automatisch für jede Aufgabe geeignet. Versorgungsspannung, Eingangsspannung, Pull-up/Pull-down, Eingang-only-Pins und Mehrfachfunktionen des Pins müssen zum Board passen.

### 4.3 Physikalische Grundlage: Ladung, Spannung, Strom und Widerstand

Elektrische Vorgänge lassen sich zunächst mit vier Größen beschreiben:

| Größe | Symbol | Einheit | Bedeutung im Projekt |
|---|---|---|---|
| elektrische Ladung | `Q` | Coulomb (C) | bewegte Ladungsträger im Stromkreis |
| Spannung | `U` | Volt (V) | Energieunterschied pro Ladung, der Ladung antreiben kann |
| Stromstärke | `I` | Ampere (A) | Ladungsmenge pro Zeit: `I = ΔQ / Δt` |
| Widerstand | `R` | Ohm (Ω) | Maß dafür, wie stark ein Bauteil den Stromfluss begrenzt |

Für einen ohmschen Widerstand gilt:

```text
U = R · I
I = U / R
R = U / I
```

Das Ohmsche Gesetz ist ein Modell. Ein echter LDR, eine LED oder ein Sensor muss sich nicht über den gesamten Bereich ohmsch verhalten. Trotzdem hilft das Modell, Versorgung, Strombegrenzung und Spannungsteilung zu verstehen. Eine höhere Spannung an einem festen Widerstand führt im einfachen Modell zu einem höheren Strom. Deshalb muss die zulässige Spannung eines GPIO beachtet werden.

### 4.4 Physikalische Grundlage: Halbleiter und Ladungsträger

Metalle leiten elektrischen Strom gut, Isolatoren fast nicht. **Halbleiter** liegen dazwischen. Ihre Leitfähigkeit hängt unter anderem von Temperatur, Licht und eingebrachten Fremdatomen ab. In einem Halbleiter können Elektronen und sogenannte Löcher als bewegliche Ladungsträger zum Strom beitragen.

Bei höherer Temperatur erhalten mehr Ladungsträger genügend Energie, um an der Leitung teilzunehmen. Bei einem LDR erzeugt einfallendes Licht zusätzliche bewegliche Ladungsträger im lichtempfindlichen Material. Dadurch sinkt bei typischen Fotowiderständen der Widerstand bei zunehmender Beleuchtung. Die genaue Kennlinie ist nicht linear und hängt von Material, Wellenlänge, Temperatur und Bauform ab.

Der ESP32 selbst besteht ebenfalls aus Halbleiterbauteilen. Transistoren wirken darin als sehr schnelle elektronische Schalter. Viele Transistoren bilden Logik, Speicher und Recheneinheiten. Ein GPIO liest daher nicht „Licht“ oder „Temperatur“, sondern einen elektrischen Zustand beziehungsweise eine Spannung, die durch ein physikalisches Messprinzip entstanden ist.

**Für die Klassenarbeit:** Erkläre die Kette `Licht → mehr Ladungsträger im LDR → anderer Widerstand → andere Spannung → anderer ADC-Wert`. Dabei muss nicht behauptet werden, dass der ADC direkt die Helligkeit misst.

### 4.5 Physikalische Grundlage: Spannungsteiler und LDR

Zwei Widerstände in Reihe teilen eine Versorgungsspannung. Liegt der Ausgang am unteren Widerstand `R2`, gilt idealisiert:

```text
Uout = Uin · R2 / (R1 + R2)
```

Beim KY-018 ist einer der Widerstände lichtabhängig. Je nachdem, ob der LDR oben oder unten im Spannungsteiler liegt, kann die Ausgangsspannung bei mehr Licht steigen oder fallen. Deshalb wird die Richtung nicht aus einer allgemeinen Zeichnung geraten, sondern mit drei Messsituationen geprüft: Sensor abgedeckt, Raumlicht und helle Lampe.

Beispiel: `Uin = 3,3 V`, `R1 = 10 kΩ`, `R2 = 10 kΩ` ergibt `Uout = 1,65 V`. Wird `R2` kleiner, sinkt `Uout`; wird `R2` größer, steigt `Uout`. Beim LDR verändert sich der Widerstand nicht schlagartig und nicht linear. Ein Rohwert von 1430 ist daher eine vergleichende Zahl für genau diesen Aufbau und keine allgemeingültige Helligkeitsangabe.

### 4.6 Physikalische Grundlage: ADC, Auflösung und Quantisierung

Ein ADC teilt den zulässigen Spannungsbereich in endlich viele Stufen. Bei `n` Bit gibt es idealisiert `2^n` Codes. Ein 12-Bit-ADC kann daher typischerweise die Werte 0 bis 4095 ausgeben. Die kleinste unterscheidbare Spannung heißt Quantisierungsstufe:

```text
Auflösung ≈ Messbereich / (2^n - 1)
```

Bei einem Messbereich von 0 bis 3,3 V und 12 Bit entspricht eine Stufe ungefähr `3,3 V / 4095 ≈ 0,81 mV`. Das ist nur eine theoretische Auflösung. Rauschen, Versorgung, Nichtlinearität und die Genauigkeit des LDR begrenzen die tatsächliche Aussagekraft. Eine größere Zahl bedeutet nicht automatisch eine genauere physikalische Messung.

Beim ESP32 muss zusätzlich die Pin-Funktion beachtet werden. GPIO 34 ist ein Eingang und kann für den LDR-Versuch genutzt werden. Für spätere WLAN-Programme ist ein ADC1-Pin eine robuste Wahl; ADC2 kann bei klassischen ESP32-Varianten durch WLAN-Funktionen eingeschränkt sein.

### 4.7 Physikalische Grundlage: Temperatur und Luftfeuchtigkeit

Im KY-015 werden Temperatur und Luftfeuchtigkeit nicht über denselben Mechanismus gemessen. Vereinfacht nutzt ein DHT11 für die Temperatur einen temperaturabhängigen Widerstand und für die Feuchte ein kapazitives Sensorelement. Bei einem temperaturabhängigen Widerstand verändert sich der Widerstand mit der Temperatur. Eine Auswerteelektronik misst diese Änderung und codiert das Ergebnis digital.

Die **relative Luftfeuchtigkeit** ist das Verhältnis der aktuell enthaltenen Wasserdampfmenge zur maximal möglichen Wasserdampfmenge bei derselben Temperatur. Sie wird in `%RH` angegeben. Warme Luft kann mehr Wasserdampf aufnehmen als kalte Luft. Deshalb kann sich die relative Feuchte ändern, obwohl keine zusätzliche Wassermenge in die Luft gelangt.

Ein Sensorwert hat immer Grenzen: Messbereich, Genauigkeit, Wiederholbarkeit, Reaktionszeit und Einbauort. Der DHT11 ist für das Lernprojekt geeignet, aber nicht automatisch ein kalibriertes Stallmessgerät. Ein Wert von 65 %RH bedeutet nicht ohne weitere Informationen, dass jede Haltungssituation unproblematisch ist.

### 4.8 Physikalische Grundlage: Kamera, Photonen und Infrarot

Ein CMOS-Bildsensor enthält viele lichtempfindliche Halbleiterbereiche. Treffen Photonen auf den Sensor, können sie Elektronen anregen. Die gesammelte Ladung wird ausgelesen und in Bildhelligkeit übersetzt. Die Energie eines Photons hängt von seiner Wellenlänge ab:

```text
E = h · c / λ
```

Kürzere Wellenlängen besitzen bei gleicher Anzahl mehr Energie als längere. Nahes Infrarot liegt jenseits des sichtbaren roten Lichtes. Die NoIR-Kamera besitzt keinen IR-Sperrfilter und kann daher nahes IR erfassen. Ohne sichtbares oder infrarotes Licht entstehen aber auch bei einer NoIR-Kamera keine Bildinformationen.

Für `λ = 850 nm` beträgt die Photonenenergie ungefähr `1,46 eV`. Diese Zahl ist eine gute Erweiterungsaufgabe: Die Schülerinnen und Schüler setzen `h`, `c` und `λ` in SI-Einheiten ein und wandeln Joule in Elektronenvolt um. Für die praktische Sicherheit ist zusätzlich die Leistung und die konkrete IR-Leuchte entscheidend, nicht nur die Wellenlänge.

### 4.9 Messfehler, Kalibrierung und Datenqualität

Es ist sinnvoll, drei Arten von Fehlern zu unterscheiden:

- **zufällige Abweichung:** Messwert schwankt von Messung zu Messung; mehrere Messungen und Mittelwerte helfen
- **systematische Abweichung:** alle Werte liegen ähnlich zu hoch oder zu niedrig; Vergleich mit einer Referenz oder Kalibrierung ist nötig
- **grober Fehler:** falscher Pin, lose Leitung, falscher Sensortyp oder falsche Einheit

Ein Mittelwert kann zufälliges Rauschen reduzieren, aber keinen falschen Anschluss reparieren. Eine Kalibrierung vergleicht den Sensor mit einem geeigneten Referenzmessgerät. Beim LDR kann man für die Homepage eine eigene Skala wie „dunkel / Stalllicht / hell“ definieren; daraus wird noch keine Messung in Lux.

### 4.10 Sensoren und Messfehler

Messungen sind Modelle der Wirklichkeit. Genauigkeit, Auflösung, Messbereich, Reaktionszeit und Einbauort beeinflussen das Ergebnis. Temperatur nahe am warmen Gehäuse ist nicht identisch mit Stalltemperatur. Ein Helligkeits-Rohwert ist von LDR, Widerstand, ADC-Einstellung, Abschattung und Kabeln abhängig. Mehrere Messungen und ein Protokoll machen Aussagen belastbarer, ersetzen aber keine Kalibrierung.

### 4.11 WLAN, IP und HTTP

WLAN ist die Funktechnik für die Verbindung, IP adressiert Geräte, TCP sorgt typischerweise für zuverlässige Übertragung und HTTP beschreibt den Austausch von Anfrage und Antwort auf Anwendungsebene. Ein Browser ist beim normalen Abruf Client; der ESP32-Webserver ist Server. Diese Ebenen sollten in Skizzen getrennt bleiben.

### 4.12 Kamera, Codec und Stream

Eine Kamera erzeugt Einzelbilder. Ein Codec wie H.264 nutzt Kompression, um Video speicher- und übertragbar zu machen. Auflösung, Bildrate und Bitrate sind Designparameter. Ein Livestream ist ein laufender Übertragungsprozess mit zusätzlichen Anforderungen an Latenz, Bandbreite, Verfügbarkeit und Zugriffsschutz.

### 4.13 Stallklima und Tierwohl

Temperatur, Feuchtigkeit, Staub, Ammoniak und Kohlendioxid können die Bedingungen im Stall beeinflussen. Die Messwerte des Schulprojekts dürfen daher als Beobachtungs- und Lernwerte bezeichnet werden, nicht als vollständige Tierwohlbewertung. Lüftung, trockene Einstreu, Wasser, Futter und tiergerechte Haltung bleiben reale Aufgaben und können nicht durch eine Kamera ersetzt werden.

### 4.14 Datenschutz

Ein Kamerabild kann personenbezogene Daten enthalten, wenn Personen erkennbar sind. Für das Projekt gelten daher Datenminimierung, Zweckbindung, Zugriffsschutz, begrenzte Speicherung und eine dokumentierte schulische Freigabe. Der wichtigste technische Schritt ist oft die Kameraposition: Ein Bild, das Personen gar nicht erst erfasst, ist datenschutzfreundlicher als ein späteres Verpixeln.

---

## 5. Vorbereitung für interaktive Internetseiten

Die spätere Umsetzung kann als Book-Mode im vorhandenen Schulformat erfolgen. Pro Doppelstunde eignet sich eine Seite oder ein Kapitel mit der Reihenfolge:

1. Einstieg mit Problem oder Fehlerbild
2. Theorie-Input in kurzen Abschnitten
3. Merke-Box
4. Arbeitsauftrag mit Ergebnisfeld
5. interaktive Sicherung
6. Fehlersuche als Entscheidungsweg
7. Transferfrage
8. „Jetzt hast du das gelernt“

### Vorgeschlagene Seitenstruktur

| Seite | Inhalt | Geeignete Interaktionen |
|---:|---|---|
| 1 | Projektidee und Systemdiagramm | `reveal`, `categorize` |
| 2 | ESP32 und Programmablauf | `order`, `verify` |
| 3 | KY-015 | `cloze`, `mcq` |
| 4 | KY-018 und ADC | `p2`, `verify` |
| 5 | Datenqualität und WLAN | `categorize`, `order` |
| 6 | HTTP-Webserver | `p2`, `mcq` |
| 7 | Raspberry Pi und Kamera | `order`, `reveal` |
| 8 | NoIR, Video und Streaming | `mcq`, `essay` |
| 9 | Homepage, Datenschutz und Ausfallsicherheit | `categorize`, `essay` |
| 10 | Abnahme und Abgabe | `essay`, Ergebnisübersicht |

Die Seiten sollen die vorhandenen Dateien `../assets/allgemeines_format.css` und `../assets/allgemeines_format.js` verwenden. Interaktionen erhalten eindeutige IDs, kurze Hinweise und erklärende Lösungen. Code wird in kopierbaren, aber kontextualisierten Blöcken gezeigt; die eigentliche Aufgabe bleibt die Entscheidung, Messung oder Fehlersuche.

### Geeignete Aufgabenformate

- **MCQ:** Entscheidung zwischen plausiblen Architekturen oder Diagnosewegen
- **Wahr/Falsch:** typische Fehlannahmen wie „NoIR sieht im Dunkeln ohne Licht“
- **Lückentext:** Fachbegriffe wie ADC, Client, Server, relative Feuchte
- **Sortieren:** Start- und Diagnoseabläufe
- **Zuordnung:** Gerät, Protokoll, Messgröße und Funktion
- **Kategorisieren:** lokal, ausgehend, öffentlich; ESP32, Pi, Homepage
- **Freitext:** Begründung einer technischen oder datenschutzbezogenen Entscheidung
- **Aufklappen:** Erklärung nach einer eigenen Vermutung

---

## 6. Bewertungsraster für Prozess und Produkt

| Bereich | Anteil | Kriterien |
|---|---:|---|
| Fachverständnis | 25 % | Begriffe, Messprinzipien, Rechnerklassen und Datenwege korrekt erklärt |
| Problemlösen | 25 % | Fehler systematisch eingegrenzt, Entscheidungen begründet |
| Technische Umsetzung | 25 % | Meilensteine, Code, Verdrahtung und Tests nachvollziehbar |
| Dokumentation | 15 % | Messprotokoll, Schaltbild, Logs und Quellen vollständig |
| Verantwortung | 10 % | Strom-/Hardware-Sicherheit, Datenschutz und Tierwohl reflektiert |

Nicht nur ein funktionierender Prototyp zählt. Ein System, das zufällig läuft, aber nicht erklärt, geprüft oder verantwortungsvoll montiert wurde, ist kein vollständiges NWT-Ergebnis.

---

## 7. Quellen und Weiterforschen

Die folgenden Quellen wurden für diese Planung recherchiert und sollten bei der späteren Internetseite als „Quellen & Weiterforschen“ verlinkt werden. Die Inhalte sind paraphrasiert; die Seiten dienen der fachlichen Kontrolle und zum Weiterlesen.

### Technik

- [Raspberry Pi: Camera software](https://www.raspberrypi.com/documentation/computers/camera_software.html) – `rpicam-hello`, `rpicam-still`, `rpicam-vid`, aktuelle Kamerasoftware und H.264-Ausgabe.
- [Raspberry Pi: Camera Module 3](https://www.raspberrypi.com/products/camera-module-3/) – Wide-/NoIR-Varianten, Sichtfeld, IR-Filter und Videoeigenschaften.
- [Espressif: Arduino-ESP32 Tools Menu](https://docs.espressif.com/projects/arduino-esp32/en/latest/guides/tools_menu.html) – Board- und Portkonfiguration.
- [Espressif: Arduino-ESP32 ADC API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/adc.html) – analoge Eingänge und ADC-Auslesen.
- [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) – Client, Server, Anfrage und Antwort.
- [ITU-T: Recommendation H.264](https://www.itu.int/ITU-T/recommendations/rec.aspx?lang=en&rec=15935) – Zweck und Einsatz der Videokompression H.264.
- [Joy-IT: KY-015 DHT11](https://www.joy-it.net/en/products/SEN-KY015TF) – Messbereich, Messintervall und Produktdaten.
- [Joy-IT: KY-015 Handbuch als PDF](https://joy-it.net/files/files/Produkte/SEN-KY015TF/SEN-KY015TF_Anleitung_2024-03-22.pdf) – Anschluss- und Anwendungshinweise; die konkrete Modulvariante muss vor dem ESP32-Anschluss geprüft werden.

### Tierwohl und Stallklima

- [GOV.UK: Code of practice for the welfare of laying hens and pullets](https://www.gov.uk/government/publications/poultry-on-farm-welfare/poultry-welfare-recommendations) – Hinweise zu Temperatur, Luftqualität, Licht und Lüftung.
- [University of Tennessee: Broiler litter management](https://utia.tennessee.edu/publications/wp-content/uploads/sites/269/2023/10/W1135.pdf) – Zusammenhang von Einstreu, Feuchtigkeit, Ammoniak und Tierwohl.

### Datenschutz

- [BfDI: Videoüberwachung und Datenschutzrecht](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Allgemein/Datenschutz/Videoueberwachung.html) – Grundprobleme und rechtliche Einordnung von Videoaufnahmen.
- [Datenschutzkonferenz: Orientierungshilfe Videoüberwachung](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/DSK/Orientierungshilfen/OH_Video%C3%BCberwachung-n-%C3%B6-Stellen.pdf?__blob=publicationFile&v=5) – weiterführende Orientierung für öffentliche Stellen.

**Für den konkreten Schulbetrieb zusätzlich klären:** schulischer Datenschutzbeauftragter, Schulträger, Hausordnung, Einwilligungs- bzw. Informationspflichten, Hosting-/Streaminganbieter, Kontenverwaltung, Speicher- und Löschfristen sowie der genaue Kamerabildausschnitt.

---

## 8. Selbstprüfung der Planung

- [x] Die grobe Planung des Anhangs wurde in 14 Doppelstunden überführt.
- [x] Jede Einheit enthält Lernziele, Material, Theorie-Input, Arbeitsauftrag und erwartetes Ergebnis.
- [x] Typische Fehler, Fehlersuchstrategien, Differenzierung und Erweiterungen sind vorgesehen.
- [x] ESP32 und Raspberry Pi werden fachlich und didaktisch getrennt behandelt.
- [x] Sensorik, ADC, WLAN, IP, HTTP, Kamera, NoIR, H.264, Streaming, Homepage, Datenschutz und Ausfallsicherheit sind enthalten.
- [x] Der Aufbau führt über überprüfbare Meilensteine zu einem Gesamtsystem.
- [x] Die spätere Umsetzung im vorhandenen Book-/Interaktionsformat ist vorbereitet.
- [x] Quellen sind am Ende verlinkt und die Grenzen der Lernhardware werden benannt.

### Offene Entscheidungen vor dem praktischen Aufbau

1. Exakte KY-015-Modulvariante, Versorgung und Pegelanpassung am ESP32.
2. Freigegebenes Projekt-WLAN und Regelung für lokale Geräte.
3. Streamingdienst, Kontenverwaltung und schulische Veröffentlichung.
4. Standort, Kamerabildausschnitt, IR-Leuchte und mechanischer Schutz.
5. Messwertübertragung zur Homepage, Datenformat und Speicherfrist.

Diese Entscheidungen sind keine Lücken der Unterrichtsplanung, sondern bewusst eingeplante Systementscheidungen, die von Lehrkraft und Lerngruppen begründet getroffen und dokumentiert werden sollen.
