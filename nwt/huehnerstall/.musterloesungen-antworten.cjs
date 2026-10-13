const p = text => `<p>${text}</p>`;
const example = text => '<span class="answer-label">Eine mögliche Antwort</span>' + p(text);
const code = text => `<pre><code>${text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</code></pre>`;
const task = (id, title, body) => ({id, title, body});
const table = (heads, rows) => `<div class="table-scroll" tabindex="0" role="region" aria-label="Auswertung"><table><thead><tr>${heads.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const sensorCode = `#include <DHT.h>
#include <math.h>
constexpr int DHTPIN = 4;
DHT dht(DHTPIN, DHT11);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  delay(2000);
  float temperatur = dht.readTemperature();
  float luftfeuchtigkeit = dht.readHumidity();
  if (isnan(temperatur) || isnan(luftfeuchtigkeit)) {
    Serial.println("DHT11: Lesefehler");
    return;
  }
  Serial.printf("Temperatur: %.1f C; Feuchte: %.1f %%RH\\n",
                temperatur, luftfeuchtigkeit);
  if (temperatur > 30.0f) Serial.println("Zu warm!");
}`;
const combinedCode = `#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <math.h>

// Beispielkonfiguration; im Schulnetz gelten die freigegebenen Zugangsdaten.
const char* ssid = "Schul-Labornetz";
const char* password = "BeispielzugangNurLokal";
constexpr int LDRPIN = 34;
DHT dht(4, DHT11);
WebServer server(80);
float temperatur = NAN, feuchte = NAN;
int licht = 0;
bool gueltig = false, gemessen = false, wlanWarVerbunden = false;
unsigned long letzteMessung = 0, letzterVersuch = 0;

String datensatz() {
  String s = "{\\\"temp\\\":";
  s += gueltig ? String(temperatur, 1) : "null";
  s += ",\\\"humidity\\\":";
  s += gueltig ? String(feuchte, 1) : "null";
  s += ",\\\"light_raw\\\":";
  s += gemessen ? String(licht) : "null";
  s += ",\\\"sample_uptime_ms\\\":";
  s += gemessen ? String(letzteMessung) : "null";
  s += ",\\\"age_ms\\\":";
  s += gemessen ? String(millis() - letzteMessung) : "null";
  s += ",\\\"interval_ms\\\":2000,\\\"status\\\":\\\"";
  s += !gemessen ? "pending" : (gueltig ? "ok" : "dht_error");
  s += "\\\"}";
  return s;
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  analogReadResolution(12);
  pinMode(LDRPIN, INPUT);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  server.on("/", []() {
    server.send(200, "text/html; charset=utf-8",
      "<!doctype html><html lang='de'><meta charset='utf-8'>"
      "<title>Stallmessung</title><h1>Stallmessung</h1>"
      "<p>Temperatur in C, Feuchte in %RH, Licht als ADC-Rohwert.</p>"
      "<a href='/api'>Aktueller Datensatz</a></html>");
  });
  server.on("/api", []() {
    server.sendHeader("Cache-Control", "no-store");
    server.send(200, "application/json", datensatz());
  });
  server.begin();
}

void loop() {
  unsigned long jetzt = millis();
  if (jetzt - letzteMessung >= 2000) {
    temperatur = dht.readTemperature();
    feuchte = dht.readHumidity();
    gueltig = !isnan(temperatur) && !isnan(feuchte);
    long summe = 0;
    for (int i = 0; i < 16; ++i) summe += analogRead(LDRPIN);
    licht = summe / 16;
    letzteMessung = millis();
    gemessen = true;
    Serial.println(datensatz());
  }
  if (WiFi.status() != WL_CONNECTED && jetzt - letzterVersuch >= 10000) {
    letzterVersuch = jetzt;
    WiFi.reconnect();
  }
  bool wlanVerbunden = WiFi.status() == WL_CONNECTED;
  if (wlanVerbunden && !wlanWarVerbunden) {
    Serial.print("HTTP-Adresse: http://");
    Serial.println(WiFi.localIP());
  }
  wlanWarVerbunden = wlanVerbunden;
  if (wlanVerbunden) server.handleClient();
}`;
const sampleSeries = table(['Bedingung / Zeitpunkt','Temperatur','Relative Feuchte','Auswertung'],[
  ['Beispiel 0 s, Raumluft','21 °C','53 %RH','Ausgangszustand'],
  ['Beispiel 2 s, gleicher Ort','21 °C','53 %RH','gleiche Anzeige'],
  ['Beispiel 4 s, gleicher Ort','21 °C','54 %RH','Schwankung um 1 Prozentpunkt'],
  ['Beispiel 6 s, gleicher Ort','21 °C','53 %RH','Mittelwert 53,25 %RH; Anzeige sinnvoll etwa 53 %RH']
]);
const projectPlan = table(['DS','Konkretes Musterergebnis / Nachweis'],[
  ['1','Systemdiagramm: KY-015/KY-018 → ESP32 → lokales HTTP/JSON; Kamera → Pi → freigegebener Dienst → Homepage. Risiken: falscher Pegel, Feuchte, erfasste Personen.'],
  ['2','ESP32-Sketch gibt bei 115200 Baud einen Starttext aus. Für den Pi ist eine verifizierte microSD mit OS Lite 64-bit, Hostname huehnercam und öffentlichem SSH-Schlüssel vorbereitet.'],
  ['3','KY-015 an GPIO4/3V3/GND: Temperatur und %RH nach gültiger Fehlerprüfung. SSH meldet Benutzer bbzstegen und Hostname huehnercam.'],
  ['4','KY-018 an ADC1/GPIO34: Richtung und Streuung unter drei Lichtbedingungen dokumentiert. rpicam-hello --list-cameras listet das Kameramodul nach stromloser Montage.'],
  ['5','Datensatz mit Temperatur, %RH, Lichtrohwert, Messzeit und Status. huhn.jpg wird geöffnet; ein zehnsekündiges huhn.h264 wird gespeichert und abgespielt.'],
  ['6','GET /api liefert HTTP 200 im freigegebenen LAN. Nachtvergleich zeigt Details bei sichtbarem und geeignetem IR-Licht; vollständige Dunkelheit zeigt keine Motivdetails.'],
  ['7','JSON enthält Einheiten und Rohwertkennzeichnung. Beispielrechnung: 2 Mbit/s × 60 s ÷ 8 = 15 MB pro Minute ohne Protokollzuschlag.'],
  ['8','Geschützte Homepage zeigt Messwerte und Aktualität; der Pi baut die Streamverbindung ausgehend zum freigegebenen Dienst auf. Kameraausfall wird als eigener Status angezeigt.'],
  ['9','ESP32 verbindet WLAN erneut; systemd startet den Pi-Dienst nach Neustart. Kontrollierter Dienstausfall und Wiederanlauf werden zeitlich protokolliert.'],
  ['10','Abnahme umfasst lokale Daten, Kamera, Übertragung, Neustart, Montage und Zugriff. Jede Person erklärt einen Datenweg und eine begründete Diagnose.']
]);

exports.files = {
  '01-systemaufbau.html': {
    output:'01-systemaufbau-kiesel83.html',
    overrides: {
      system_safety_categories: table(['Bereich','Maßnahmen'],[
        ['Hardware-/Betriebssicherheit','Keine Netzspannung im Schüleraufbau; konkrete Versorgungsspannung des Sensors prüfen'],
        ['Datenschutz','Kamera auf den Hühnerbereich ausrichten; Zugriffsrechte vor dem Betrieb festlegen'],
        ['Beides berücksichtigen','Keine der vier Maßnahmen betrifft für sich zwingend beide Bereiche.']
      ]) + p('Die Spannungsprüfung schützt vor Fehlbetrieb und Schäden; sie ist keine Datenschutzmaßnahme. Die Zuordnung „Beides“ in der Aufgaben-Konfiguration ist hier fachlich zu korrigieren.'),
      system_transfer_essay: example('Da der lokale Test funktioniert, beginne ich hinter der lokalen Kameraaufnahme im Datenweg. Ich prüfe, ob der Pi tatsächlich Videodaten codiert und an den Streamingdienst sendet. Danach kontrolliere ich das Netzwerk und den Empfang beim Dienst. Ein dort abspielbarer Stream zeigt, dass die Übertragung bis zu diesem Punkt gelingt. Dann prüfe ich den Zugriff auf den Player, seine Freigabe und die Einbettungsadresse auf der Homepage. Funktioniert der Player direkt, aber nicht eingebettet, liegt die Ursache wahrscheinlich an Einbettungsregeln oder der Homepage. So überprüfe ich jeden Übergang mit einem eigenen Test.')
    },
    extra:{'3':[task('text-system-datenformat','Gemeinsame Schnittstelle',p('Messdaten: Temperatur in °C, relative Feuchte in %RH, LDR als ADC-Rohwert, Messzeit, Alter des Datensatzes und Status. Kameradaten: Streamadresse des freigegebenen Dienstes, Kamerastatus und letzter erfolgreicher lokaler Test. Ein fehlender Messwert ist <code>null</code> mit Fehlerstatus und wird niemals als 0 °C ausgegeben.'))]}
  },
  '02-esp32.html': {
    output:'02-esp32-segel47.html',
    overrides:{esp32_abschluss:example('GPIO34 gehört beim klassischen ESP32 zu ADC1 und kann die Spannung am LDR-Spannungsteiler erfassen. ADC1 ist für die analoge Messung bei gleichzeitigem WLAN geeignet. GPIO34 ist nur Eingang, was zur Messaufgabe passt. Interne Pull-Widerstände stehen dort nicht zur Verfügung; der Spannungsteiler legt das Potenzial fest. Vor dem Anschluss des KY-015 prüfe ich die erlaubte Versorgungsspannung der tatsächlichen Modulvariante im Datenblatt. Zusätzlich prüfe ich den HIGH-Pegel und den Pull-up der Datenleitung: Am ESP32 darf dort kein 5-V-Signal liegen. Schließlich muss der Signalanschluss an GPIO4 mit DHTPIN 4 im Programm übereinstimmen.')},
    extra:{
      '3':[task('text-esp32-pinout-bild','Pinbelegung im Materialbild fachlich prüfen',p('GPIO34 bis GPIO39 sind beim klassischen ESP32 ausschließlich <strong>Eingänge</strong>. Die Beschriftung „OUTPUT ONLY“ im Bild ist falsch. Ebenfalls vertauscht sind im Bild die Sensornamen und ADC-Kanäle von GPIO36 und GPIO39: GPIO36 ist SENSOR_VP / ADC1_CH0, GPIO39 ist SENSOR_VN / ADC1_CH3. GPIO12 ist ADC2_CH5, nicht ADC2_CH6. GPIO34 bleibt korrekt ADC1_CH6. Maßgeblich ist die konkrete Platine zusammen mit der <a href="https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html">GPIO-Tabelle von Espressif</a>.'))],
      '7':[task('text-esp32-blinkablauf','Ablauf des gezeigten Steuerprogramms',p('<code>setup()</code> richtet UART mit 115200 Baud und GPIO2 als Ausgang ein. Danach ist GPIO2 jeweils 500 ms HIGH und 500 ms LOW; die Periodendauer beträgt 1 s, die Frequenz 1 Hz, der Tastgrad 50 %. Eine passende externe LED mit Vorwiderstand blinkt, sofern sie angeschlossen ist. Eine eingebaute LED an GPIO2 ist beim DevKitC nicht garantiert; GPIO2 ist außerdem ein Strapping-Pin.'))],
      '8':[task('text-esp32-uart-bild','UART-Tabelle und Codebeispiel',p('UART0 verwendet hier RX=GPIO3 und TX=GPIO1 für Upload und Diagnose. Die im Bild genannten UART1-Defaults GPIO9/10 sind beim WROOM-Modul vom Flash belegt und deshalb zu vermeiden. Der gezeigte Aufruf <code>Serial1.begin(115200, SERIAL_8N1, 16, 17)</code> verlegt ausdrücklich UART1 auf GPIO16/17; er aktiviert nicht UART2, obwohl diese Pins in der Tabelle als UART2-Defaults stehen. Bei einem WROOM-32E ohne dort angebundenen PSRAM sind die Pins geeignet. Für ein externes Gerät kreuzt du TX mit RX, verbindest GND und verwendest passende 3,3-V-Pegel.'))],
      '9':[task('text-esp32-touch-interrupt-bilder','Touch-, Interrupt- und Bluetooth-Material',p('Der Touch-Screenshot zeigt unberührt ungefähr 70–71, bei Berührung zunächst 53 und dann etwa 11–20, mit 10-µF-Kondensator schließlich 0. Es sind kapazitätsabhängige Rohwerte, keine Spannungseinheit. Ein beispielhafter Schwellwert 40 trennt hier die stabilen Zustände, muss aber für den Aufbau geprüft werden. Im Interrupt-Bild verbindet der gedrückte Taster 3,3 V mit GPIO4; <code>INPUT_PULLDOWN</code> legt den offenen Eingang auf LOW. <code>RISING</code> löst bei LOW→HIGH aus, und die kurze ISR setzt <code>event=true</code>. Auswertung und Entprellung gehören in <code>loop()</code>, weil ein mechanischer Taster mehrere Flanken erzeugen kann. Das Bluetooth-Terminal zeigt zweimal die Zeichenfolge <code>+4</code>; ohne den zugehörigen Empfängercode lässt sich daraus keine konkrete Schaltwirkung ableiten.'))]
    }
  },
  '03-sensoren.html': {
    output:'03-sensoren-mosaik92.html',
    overrides:{dht11_reflexion:example('Der DHT11 übermittelt seine Messdaten digital über GPIO4 an den ESP32. Die Temperatur wird in °C und die relative Luftfeuchtigkeit in %RH angezeigt. Im Programm muss DHTPIN zum tatsächlich angeschlossenen GPIO passen. Vor einer Entscheidung prüfe ich mit <code>isnan()</code>, ob beide Werte gültig sind. Bei einem Lesefehler melde ich den Fehler und behandle ihn nicht als 0 °C. Bei gültiger Temperatur über 30 °C kann das Beispielprogramm eine Warnung ausgeben; dieser Grenzwert ist eine Übungsregel und keine vollständige Tierwohlbewertung. Mehrere Messwerte mit bekanntem Einbauort helfen mir, Schwankungen und Wärmeeinflüsse zu beurteilen.')},
    extra:{'6':[
      task('text-sensoren-programmierauftrag','Unterrichtsaufgabe: Luftfeuchtigkeit ergänzen',code(sensorCode)+p('Nach der Temperaturabfrage kommt <code>dht.readHumidity()</code> hinzu. Die gemeinsame Fehlerprüfung verhindert, dass eine ungültige Feuchte als gültige Messung angezeigt wird. Das Programm setzt die Adafruit-DHT-Bibliothek und ein für 3,3 V geeignetes Modul voraus; die erste Abfrage und alle weiteren erfolgen im Abstand von mindestens 2 s.')),
      task('text-sensoren-messreihe','Messreihe mit gleichen Zeitabständen',p('Fiktive Beispielwerte zur Auswertung, keine tatsächlich aufgenommenen Messdaten. Messort: Raumluft, keine Berührung, keine direkte Wärmequelle, 2-s-Intervall.')+sampleSeries+p('Die Temperatur bleibt in dieser kurzen Reihe konstant. Die Feuchte schwankt um einen Prozentpunkt; der Mittelwert beseitigt keine systematische Sensorabweichung. Nach Öffnen eines Fensters sind veränderte Lufttemperatur und Feuchte möglich, ihre Richtung hängt aber von Innen- und Außenbedingungen ab. Berührung oder Nähe zur Elektronik können die Temperatur lokal erhöhen.'))
    ]}
  },
  '04-ldr-adc.html': {
    output:'04-ldr-adc-koffer61.html',
    overrides:{ldr_klausur:example('Ein typischer LDR hat bei mehr Licht einen kleineren Widerstand. Liegt er als R1 zwischen 3,3 V und Mittelabgriff, steigt Uout = 3,3 V · R2 / (RLDR + R2), wenn RLDR kleiner wird. Liegt er als R2 zwischen Mittelabgriff und GND, fällt Uout = 3,3 V · RLDR / (R1 + RLDR) bei zunehmendem Licht. Der ADC-Rohwert folgt der Spannung im nutzbaren Messbereich näherungsweise. Deshalb kann mehr Licht je nach Anordnung höhere oder niedrigere Rohwerte liefern. Erst eine Messreihe am konkreten Modul zeigt die tatsächliche Richtung.')},
    extra:{'2':[task('text-ldr-experiment','Experiment: abgedeckt, Raumlicht, Lampe',p('Erwartung für <strong>LDR oben</strong> und festen Widerstand R2 = 10 kΩ unten; Uin = 3,3 V. Die Widerstände sind angenommene Modellwerte, keine Messdaten.')+table(['Bedingung','Angenommener LDR','Berechnung Uout','Erwarteter Verlauf'],[
      ['Abgedeckt','100 kΩ','3,3 · 10 / 110 = 0,30 V','kleine Spannung und kleiner ADC-Rohwert'],
      ['Raumlicht','10 kΩ','3,3 · 10 / 20 = 1,65 V','mittlere Spannung'],
      ['Helle Lampe','1 kΩ','3,3 · 10 / 11 = 3,00 V','große Spannung; ADC kann nahe Messgrenze sättigen']
    ])+p('Beim vertauschten Aufbau wären es 3,00 V, 1,65 V und 0,30 V: Der Verlauf kehrt sich um. Abstand, Lampenart, ADC-Einstellung und Schaltung bleiben während des Vergleichs konstant. Eine eigene Kategorie „dunkel“ wird aus den beobachteten Bereichen mit ausreichendem Abstand zu den Schwankungen abgeleitet. Die Werte sind keine Luxmessung. Der 12-Bit-ADC hat 4096 Codes (0–4095); 3,3 · Rohwert / 4095 ist nur ein idealisiertes Rechenmodell und keine genaue ESP32-Kalibrierung.'))]}
  },
  '05-messdaten.html': {
    output:'05-messdaten-tulpe28.html',
    extra:{'1':[task('text-messdaten-protokoll','Messprotokoll: Rohdaten und Unsicherheit',p('Eine mögliche Protokollzeile: Messgröße relative Feuchte; Anzeige 53 %RH; Zeitpunkt 10:00:00; Ort Raumluft; KY-015/DHT11 an GPIO4, 3,3 V; Intervall 2 s; keine Berührung, kein geöffnetes Fenster. Die Genauigkeit wird aus dem Datenblatt der konkreten Variante übernommen, nicht aus der Anzahl angezeigter Nachkommastellen. ADC-Rohdaten werden getrennt von der daraus abgeleiteten Projektkategorie gespeichert.')+p('Beispielrechnung mit fiktiven LDR-Rohwerten 1420, 1430, 1440: Mittelwert = (1420 + 1430 + 1440) / 3 = 1430; Spannweite = 20 Codes. Ein falscher GPIO oder eine falsche ADC-Referenz wird durch Mitteln nicht korrigiert.'))],
      '2':[task('text-messdaten-stallstatus','Transfer: Messwert oder Aussage?',example('Die Anzeige zeigt 21 °C, 53 %RH und die Projektkategorie „Raumlicht“, jeweils mit Messzeit und Sensorstatus. Eine grüne Anzeige bedeutet nur, dass die Messwerte innerhalb unserer begründeten Projektgrenzen liegen. Sie bedeutet nicht, dass sämtliche Tierwohlkriterien erfüllt sind. Fällt ein Sensor aus oder ist der letzte Datensatz älter als zehn Sekunden, wird sein Status „nicht aktuell“ statt „gut“.'))]}
  },
  '06-netzwerk-http.html': {
    output:'06-netzwerk-http-bogen75.html',
    extra:{'2':[task('text-http-diagnose','Diagnose einer nicht erreichbaren Webseite',p('Zuerst zeigt der serielle Startlog, dass der ESP32 läuft. Dann muss <code>WiFi.status() == WL_CONNECTED</code> gelten und <code>WiFi.localIP()</code> die aktuelle Adresse liefern. Im freigegebenen LAN wird genau diese Adresse angefragt, etwa <code>http://192.168.1.50/api</code>; die Adresse ist ein Beispiel. Eine HTTP-404-Antwort beweist Erreichbarkeit des Servers, weist aber auf eine falsche Route hin. Eine Zeitüberschreitung führt zurück zu Adresse, WLAN, Client-Isolation oder Serverlauf. Erst nach erfolgreichem HTTP-200-Test werden JSON und Darstellung geprüft. Ein erfolgloser Ping allein beweist keinen ausgefallenen HTTP-Server, da ICMP blockiert sein kann.'))]}
  },
  '07-pi-linux.html': {
    output:'07-pi-linux-prisma39.html',
    overrides:{
      pi_boot_trace:table(['Stufe','Aktiver Teil','Ergebnis danach'],[['1','Spannungsversorgung','Stabile Betriebsspannungen'],['2','Bootloader','Startmedium gefunden'],['3','Linux-Kernel','Treiber und Speicherverwaltung aktiv'],['4','systemd','Konfigurierte Dienste gestartet; Netzwerk und SSH bei passender Einrichtung'],['5','Anwendung','Kamera- und Streamingdienst laufen, sofern installiert, konfiguriert und fehlerfrei gestartet']])+p('Der Bootvorgang startet Kamera und Stream nicht automatisch ohne eine passende Dienstkonfiguration.'),
      pi_linux_transfer:example('Arduino Uno und ESP32 sind Mikrocontroller-Boards, während der Raspberry Pi ein Einplatinencomputer mit Linux ist. Der Uno R3 hat 32 kB Flash und 2 kB SRAM; der ESP32 besitzt mehr Speicher und integriert WLAN. Beide starten ein geflashtes Mess- oder Steuerprogramm, wobei der Arduino-Core des ESP32 intern Tasks eines Echtzeitbetriebssystems nutzt. Der Pi im Projekt hat 2 GB RAM und eine 64-GB-microSD für Betriebssystem, Programme und Dateien. Linux verwaltet mehrere Prozesse, Benutzer und Zugriffsrechte, was Kamera- und Netzwerkdienste erleichtert. Uno und ESP32 besitzen ADC-Eingänge, der Pi braucht für analoge Spannungen einen externen ADC. Beim Uno R3 liegt die Logik typischerweise bei 5 V, beim ESP32 und Pi bei 3,3 V. Der ESP32 übernimmt daher die direkte Sensorabfrage, der Pi die CSI-Kamera, Videoverarbeitung und Dienste.')
    },
    extra:{
      '5':[task('text-pi-headless-projekt','Musterkonfiguration für die Headless-Installation',p('Raspberry Pi 4; OS Lite 64-bit; verifizierte 64-GB-microSD; Hostname <code>huehnercam</code>; Benutzer <code>bbzstegen</code>; Zeitzone <code>Europe/Berlin</code>; Tastatur <code>de</code>; freigegebenes WLAN oder Ethernet; SSH aktiviert mit <strong>öffentlichem</strong> Ed25519-Schlüssel; Connect zunächst deaktiviert. Ein öffentlicher Schlüssel lässt sich nicht sinnvoll erfinden: Er wird aus dem tatsächlich erzeugten Schlüsselpaar übernommen, der private Schlüssel bleibt am Arbeitsrechner. Der erste Login lautet <code>ssh bbzstegen@huehnercam.local</code> oder verwendet die tatsächliche IP-Adresse. Das in der Quelle veröffentlichte Erstinstallationspasswort wird vor Dauerbetrieb ersetzt.')+p('Bei später freigegebenem Connect lautet der Ablauf als normaler Benutzer: <code>rpi-connect status</code>, <code>rpi-connect on</code>, <code>rpi-connect signin</code>, Anmeldung über das vorgesehene Schulkonto, anschließend erneute Statusprüfung. Es handelt sich unter OS Lite um Remote-Shell-Zugriff.'))],
      '6':[
        task('text-pi-terminal-kontrolle','Terminalauftrag: Verbindung und Ordner prüfen',table(['Befehl','Erwartung bei der vorgegebenen Installation'],[['whoami','bbzstegen'],['hostname','huehnercam'],['pwd','/home/bbzstegen nach normalem Login'],['ls','Vorhandene Dateien, bei leerem Ordner keine Einträge']])+p('Eine abweichende Identität beendet den Test: <code>exit</code>, Zieladresse prüfen. <code>sudo apt update</code> erneuert Paketlisten; <code>sudo apt full-upgrade -y</code> installiert Aktualisierungen. Nach <code>sudo reboot</code> endet die Sitzung und wird nach dem Booten erneut aufgebaut.')),
        task('text-pi-python-programm','Erstes Python-Programm und Projektordner',code('print("Hallo vom Hühnerstall!")')+p('Datei <code>test.py</code>; Start <code>python3 test.py</code>; Ausgabe: <code>Hallo vom Hühnerstall!</code>. In nano speichert Strg+O und Enter, Strg+X beendet den Editor. <code>mkdir huehnerstall</code> und <code>cd huehnerstall</code> ergeben bei Start im Home-Ordner mit <code>pwd</code> den Pfad <code>/home/bbzstegen/huehnerstall</code>.')),
        task('text-pi-kameratest','Sicherer Kameraeinbau und Erkennung',p('<code>sudo shutdown -h now</code> beendet Linux kontrolliert; nach vollständigem Herunterfahren und Ende der Aktivität wird die Versorgung getrennt. Erst dann wird das Kamerakabel angeschlossen. Nach Neustart und SSH-Login muss <code>rpicam-hello --list-cameras</code> die Camera Module 3, typischerweise mit Sensorbezeichnung <code>imx708</code>, aufführen. Das ist ein Erkennungsnachweis; die genaue Ausgabe ist modell- und versionsabhängig und wird erst am Gerät protokolliert. Die microSD wird ebenfalls nur nach Herunterfahren und Trennen der Versorgung entnommen.')),
        task('text-pi-diagnoseprotokoll','Diagnosebefehle: erwartete Aussage',table(['Befehl','Auswertung'],[['hostname -I','Tatsächliche lokale IP-Adressen; keine feste Beispiel-IP voraussetzen'],['ip -br address','Zustand der Interfaces und deren Adressen'],['cat /etc/os-release','Installierte OS-Version für die spätere Befehlswahl'],['uname -m','Bei OS 64-bit auf Pi 4 gewöhnlich aarch64'],['free -h','Freier/verfügbarer RAM; keine Speicherbelegung erfinden'],['df -h','Dateisystembelegung und freier Platz'],['systemctl --failed','Namen fehlgeschlagener Dienste oder keine fehlgeschlagenen Units']]))
      ],
      '7':[task('text-pi-lokale-dateien','Lokaler Foto- und Videonachweis',code('rpicam-hello --list-cameras\nrpicam-still --nopreview -o huhn.jpg\nrpicam-vid --nopreview -t 10000 --codec h264 -o huhn.h264')+p('Unter OS Lite und SSH ohne Display wird die Vorschau deaktiviert. Eine Datei allein reicht als Nachweis nicht: Das Foto wird geöffnet und auf Motiv/Schärfe geprüft, das H.264-Video mit geeignetem Player abgespielt. Eine lokale Vorschau ist nur bei verfügbarer Anzeige sinnvoll. Die Optionen entsprechen der <a href="https://www.raspberrypi.com/documentation/computers/camera_software.html">rpicam-Dokumentation</a>.'))],
      '8':[task('text-pi-klausur-grundauftrag','Klausur-Grundauftrag: ESP32 und Pi vergleichen',example('Der ESP32 ist ein Mikrocontroller, der nach einem Reset sein Messprogramm startet; der Pi bootet ein Linux-Betriebssystem. Der Pi verfügt im Projekt über 2 GB RAM und eine microSD, der ESP32 über deutlich weniger Speicher und Firmware im Flash. Der ESP32 liest analoge Spannungen über seinen ADC, während der Pi einen externen ADC braucht. Beide verwenden 3,3-V-GPIO und sind nicht direkt für 5-V-Signale geeignet. Der ESP32 eignet sich für wiederholte Sensorabfragen mit geringem Energiebedarf. Der Pi verwaltet Kamera, Videodateien und mehrere Dienste, benötigt dafür mehr Energie und eine längere Bootphase.'))]
    }
  },
  '08-kamera-noir.html': {
    output:'08-kamera-noir-feder86.html',
    extra:{'2':[task('text-noir-nachtversuch','Nachtversuch: drei Beleuchtungen vergleichen',p('Erwartete Beobachtungen bei gleichem Motiv, Abstand und zunächst gleicher Belichtungszeit/Verstärkung; die Tabelle nennt Erwartungen, keine aufgenommenen Messwerte.')+table(['Beleuchtung','Bildhelligkeit und Details','Schlussfolgerung'],[['Sichtbare Lampe','Motivdetails bei ausreichender Beleuchtung; Farbwirkung abhängig von Kamera/Weißabgleich','Sichtbare Photonen erzeugen Bildsignal'],['Geeignete nahe IR-Beleuchtung','Motivdetails trotz für Menschen kaum sichtbarer Beleuchtung; Farben können unnatürlich sein','NoIR-Sensor erfasst zusätzlich nahes IR'],['Vollständige Dunkelheit, beide Lampen aus','Keine verlässlichen Motivdetails; Dunkelrauschen oder Hotpixel möglich','NoIR erzeugt keine Photonen und ist keine Wärmebildkamera']])+p('Eine automatische Belichtung kann Helligkeit anpassen und den Vergleich verfälschen; ihre Einstellungen werden deshalb dokumentiert oder festgehalten. Größerer Lampenabstand verringert im einfachen Punktquellenmodell die Bestrahlungsstärke ungefähr mit 1/r²; reale Leuchten und Reflexionen können davon abweichen. Gleiche Kameraeinstellungen machen sichtbare und IR-Lichtquellen nicht automatisch gleich stark. Die IR-Leuchte wird auf freigegebene Versorgung, Erwärmung und sichere Montage geprüft; der Ausschnitt erfasst keine Wege oder Personen.'))]}
  },
  '09-streaming-homepage.html': {
    output:'09-streaming-homepage-vase53.html',
    overrides:{stream_homepage_essay:example('Die Homepage zeigt Temperatur in °C und relative Feuchte in %RH mit dem Zeitpunkt der letzten gültigen Messung. Der LDR erscheint als ADC-Rohwert oder als dokumentierte Projektkategorie, niemals ungeprüft als Lux. Ein eigener Kamerastatus unterscheidet „online“, „keine aktuelle Aufnahme“ und „Stream nicht erreichbar“. Der Zugriff erfolgt über die freigegebene Anmeldung, und die Kamera zeigt nur den Hühnerbereich ohne Ton. Der Pi überträgt den Stream ausgehend zum freigegebenen Dienst; sein lokaler Kameraport wird nicht öffentlich freigegeben. Bei Streamausfall bleibt die Sensoranzeige erreichbar und zeigt den Videoausfall ausdrücklich. Ein letztes Bild wird höchstens mit deutlich sichtbarer Aufnahmezeit dargestellt und nie als Livebild bezeichnet. Veraltete Sensordaten erhalten ebenfalls einen Status und werden nicht still als aktuell angezeigt.')},
    extra:{'1':[task('text-streaming-datenrate','Parametervergleich und Beispielrechnung',p('Bei 1280 × 720 Bildpunkten, 24 Bit pro Bildpunkt und 25 Bildern/s wären unkomprimiert 1280 · 720 · 24 · 25 = 552 960 000 bit/s = 552,96 Mbit/s nötig. Ein beispielhaft auf 2 Mbit/s codierter H.264-Stream benötigt in einer Minute 2 000 000 · 60 / 8 = 15 000 000 Byte = 15 MB, zuzüglich Übertragungsaufwand. Eine Minute Datei mit 15 MB entspricht umgekehrt 2 Mbit/s. Bei fest vorgegebener Bitrate bewirkt höhere Auflösung oder Bildrate nicht zwingend mehr Daten, kann aber die Qualität pro Bild reduzieren. Eine begründete Ausgangswahl ist 1280 × 720 bei 15–25 fps; sie wird anhand Detailerkennbarkeit, Netz und tatsächlicher Datenrate geprüft.'))],
      '2':[task('text-homepage-json','Datenformat der gemeinsamen Anzeige',code('{"temp":18.7,"temp_unit":"C","humidity":65,"humidity_unit":"%RH","light_raw":1430,"measured_at":"2026-10-13T08:00:00Z","sensor_status":"ok","camera_status":"offline"}')+p('Dieser Datensatz ist ein fiktives Formatbeispiel. <code>light_raw</code> bezeichnet ausdrücklich den Rohwert. Der UTC-Zeitstempel setzt eine synchronisierte Uhr voraus; alternativ übermittelt der ESP32 Laufzeit und Messalter, und der empfangende Server ergänzt die Empfangszeit. Ein DHT-Ausfall liefert <code>temp:null</code> und <code>humidity:null</code> mit Fehlerstatus; ungültiges <code>NaN</code> ist kein gültiger JSON-Zahlenwert.'))]}
  },
  '10-ausfallsicherheit-abgabe.html': {
    output:'10-ausfallsicherheit-abgabe-wolke19.html',
    overrides:{abgabe_reflexion:example('Unsere wichtigste Entscheidung war die Trennung von Sensorik auf dem ESP32 und Video auf dem Pi. Ein beispielhafter Messwert von 21 °C kann dadurch weiter über HTTP bereitgestellt werden, selbst wenn der Kameraprozess ausfällt. Die Schnittstelle zwischen ESP32 und Anzeige ist ein JSON-Datensatz mit Einheiten und Aktualitätsstatus. Als Fehlerquelle haben wir eine unterbrochene WLAN-Verbindung untersucht; dann muss die Anzeige „nicht aktuell“ zeigen. Der ESP32 versucht die Verbindung erneut, ohne seine Sensorabfrage dauerhaft zu blockieren. Nach einem Neustart startet systemd den Kameradienst und protokolliert Fehler. Ein erfolgreicher Dienststart wird trotzdem mit einer echten lokalen Aufnahme und anschließendem Streamempfang überprüft. Beim Kamerabildausschnitt haben wir uns auf den Hühnerbereich beschränkt und keinen Ton aufgenommen.')},
    extra:{'1':[task('text-abnahme-neustart','Neustart- und Fehlerprotokoll',p('Ein mögliches <strong>Prüfszenario</strong>: kontrollierter Pi-Neustart; SSH erreichbar; Kameradienst aktiv; neues Foto lesbar; Streamempfang beim Dienst; aktualisierter Player. Beim ESP32-Reset startet die Firmware neu und die Messzeitbasis beginnt bei 0; die Anzeige muss einen neuen Datensatz abwarten. Wird WLAN kurz getrennt, laufen die Messungen weiter; HTTP ist zeitweise nicht erreichbar. Nach Wiederverbindung werden neue Daten angezeigt, die alten bleiben als veraltet markiert. Bei kontrolliert beendetem Kameraprozess muss der konfigurierte Dienst neu starten. Diese Erwartungen sind am Gerät mit Zeiten und Logs zu belegen, keine behauptete erfolgreiche Abnahme.')+code('systemctl is-enabled huehnerkamera.service\nsystemctl is-active huehnerkamera.service\njournalctl -u huehnerkamera.service -b --no-pager')+p('<code>enabled</code> bezeichnet die Aktivierung für einen passenden Startzeitpunkt, <code>active</code> den momentanen Dienstzustand. Beides ersetzt keinen Bildtest.'))],
      '2':[task('text-abnahme-individuell','Individuelle Abschlussleistung',example('Datenweg: Licht senkt den LDR-Widerstand, der Spannungsteiler erzeugt eine Spannung, ADC1 an GPIO34 digitalisiert sie, und HTTP übermittelt einen JSON-Rohwert. Eine fiktive Messreihe 1420, 1430, 1440 hat Mittelwert 1430 und Spannweite 20; daraus folgt eine kleine Streuung, keine Lux-Kalibrierung. Gelingt ein lokales Foto, aber kein Stream, prüfe ich zuerst die Videocodierung, danach Verbindung und Freigabe beim Streamingdienst. Ein geöffneter lokaler Kameraport würde unnötigen externen Zugriff ermöglichen; deshalb sendet der Pi ausgehend an den freigegebenen Dienst. Der Kamerabildausschnitt und ausgeschaltetes Audio begrenzen unnötige Erfassung.')),
      task('text-abnahme-checkliste','Musterbewertung der Abnahme-Checkliste',table(['Nachweis','Erfülltes Kriterium'],[['Temperatur / Feuchte','Gültige Werte mit Einheiten, Zeit, Einbauort und Grenzen; Fehlerstatus bei DHT-Ausfall'],['LDR','Messreihe mit drei Beleuchtungen, dokumentierter Richtung und Rohwertkennzeichnung'],['ESP32-Webseite','HTTP-200 und aktueller JSON-Datensatz im erlaubten Netz'],['Pi / Kamera','SSH-Identität korrekt; Kamera erkannt; Foto geöffnet; Video abgespielt'],['Datenschutz / Montage','Nur Stallbereich, kein Audio, Zugriff festgelegt; geprüfte Kleinspannung, trockene geschützte Montage, Zugentlastung, keine erreichbaren losen Leitungen'],['Autostart','Kontrollierter Neustart und Dienstausfall mit Wiederanlauf und tatsächlichem Bildnachweis protokolliert']]))]}
  },
  'gruppe-a.html': {
    output:'gruppe-a-anker64.html',
    extra:{'1':[task('text-groupa-musterprojekt','Musterprojekt: beide Sensoren und lokales HTTP',p('Verdrahtung: KY-015 S→GPIO4, +→3V3, −→GND; KY-018 analoger Mittelabgriff→GPIO34/ADC1, Versorgung und Schaltung nach der tatsächlichen Modulbeschriftung, gemeinsame GND-Verbindung. Beide Signalpegel bleiben innerhalb der 3,3-V-Grenzen. Adafruit-DHT-Bibliothek erforderlich. Das folgende Kernprogramm liest alle 2 s, mittelt 16 LDR-Werte und stellt lokale Messdaten unter <code>/api</code> bereit.')+code(combinedCode)+p('Die WLAN-Werte sind eine gekennzeichnete Beispielkonfiguration. <code>sample_uptime_ms</code> ist Laufzeit seit Reset, kein Kalenderdatum; <code>age_ms</code> zeigt das Messalter. Die Anzeige wartet nach dem Start auf den ersten Datensatz. Die Richtung der Lichtänderung und die Kategoriegrenzen werden am konkreten Spannungsteiler bestimmt.'))],
      '2':[task('text-groupa-uebergabe','Technische Notiz an Gruppe B',example('Schnittstelle: lokales HTTP, GET /api am im seriellen Monitor dokumentierten ESP32-Host; Beispieladresse 192.168.1.50. Datenformat: temp in °C, humidity in %RH, light_raw als 12-Bit-Rohwert; Intervall 2000 ms; Messzeit als Laufzeit plus age_ms. Bei DHT-Lesefehler sind Temperatur und Feuchte null und status=dht_error. Bekannte Grenzen: DHT-Genauigkeit nach Datenblatt, LDR ohne Lux-Kalibrierung und mögliche ADC-Sättigung. Letzter Meilenstein des Musters ist eine gültige HTTP-200-Antwort mit aktuellem Datensatz; im echten Protokoll steht die tatsächlich getestete IP. Als Fehlerfall testen wir gelöste Signalleitung und kurz getrenntes WLAN; ein Fehler darf niemals durch erfundene Nullwerte verdeckt werden.')+p('Beispiel für Mess- und Fehlersuchnachweis: Fiktive Rohwerte 1420/1430/1440 ergeben Mittelwert 1430. Bei <code>dht_error</code> werden vor dem nächsten Test Versorgung, Masse, GPIO4 und DHTPIN geprüft. Ein Screenshot oder Log muss Datum und tatsächliche Ausgabe des eigenen Tests enthalten; die Musterlösung ersetzt keinen Messnachweis.'))]}
  },
  'gruppe-b.html': {
    output:'gruppe-b-laterne97.html',
    extra:{'1':[task('text-groupb-musterprojekt','Musterprojekt: Kamera und überwachter Dienst',p('Aufbau: Pi 4 B mit OS Lite 64-bit, 2 GB RAM, 64-GB-microSD und geeigneter 5,1-V-/3-A-Versorgung; Camera Module 3 Wide NoIR am CSI-Anschluss, nur stromlos gesteckt. Headless-Test erzeugt ein Foto und ein zehnsekündiges Video. Als konkretes lokales Musterprojekt nimmt ein systemd-Dienst fortlaufend ein Bild auf; die spätere Übertragung an den gewählten freigegebenen Streamingdienst wird davon getrennt geprüft.')+code('rpicam-hello --list-cameras\nrpicam-still --nopreview -o huhn.jpg\nrpicam-vid --nopreview -t 10000 --codec h264 --width 1280 --height 720 --framerate 25 --bitrate 2000000 -o huhn.h264')+p('Datei <code>/home/bbzstegen/huehnerstall/kamera.py</code>:')+code(`from pathlib import Path
import subprocess
import time

ziel = Path("/home/bbzstegen/huehnerstall")
ziel.mkdir(parents=True, exist_ok=True)
while True:
    temporaer = ziel / "aktuell.tmp.jpg"
    subprocess.run([
        "rpicam-still", "--nopreview", "--timeout", "1000",
        "--width", "1280", "--height", "720", "-o", str(temporaer)
    ], check=True, timeout=20)
    temporaer.replace(ziel / "aktuell.jpg")
    print("Lokales Kamerabild erneuert", flush=True)
    time.sleep(30)
`)+p('Dienstdatei <code>/etc/systemd/system/huehnerkamera.service</code>:')+code(`[Unit]
Description=Lokaler Hühnerstall-Kameratest
After=local-fs.target

[Service]
Type=simple
User=bbzstegen
SupplementaryGroups=video
WorkingDirectory=/home/bbzstegen/huehnerstall
ExecStart=/usr/bin/python3 /home/bbzstegen/huehnerstall/kamera.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
`)+code('sudo systemctl daemon-reload\nsudo systemctl enable --now huehnerkamera.service\nsystemctl status huehnerkamera.service\njournalctl -u huehnerkamera.service -b --no-pager')+p('Die Datei wird erst nach erfolgreicher Aufnahme atomar ersetzt; ein Prozessfehler führt über <code>check=True</code> zum Neustart durch systemd. Die zuletzt vorhandene Datei kann danach alt sein und darf ohne Altersprüfung nicht als Livebild gelten. Der lokale Fotodienst ist kein Livestream und beansprucht die Kamera: Vor dem Videotest wird er mit <code>sudo systemctl stop huehnerkamera.service</code> beendet.'))],
      '2':[task('text-groupb-uebergabe','Übergabe und begründete Kameraeinstellungen',example('Die Messwertanzeige benötigt Temperatur in °C, relative Feuchte in %RH, LDR-Rohwert oder erklärte Kategorie sowie Messzeit und Fehlerstatus. Als Ausgangsprofil verwenden wir 1280×720 bei 25 fps und 2 Mbit/s; das ergibt rechnerisch 15 MB pro Minute ohne Zusatzaufwand. Der Pi prüft Video zunächst lokal und sendet später ausgehend zum freigegebenen Verteilungsdienst. Dessen geschützter Player wird in die Homepage eingebettet. Bei Kameraausfall erscheint „Kamera offline“; gültige Sensordaten bleiben sichtbar. Als Fallback zeigen wir höchstens das letzte zulässige Bild mit Aufnahmezeit oder einen ausdrücklichen Ausfallhinweis. Das Bild erfasst nur den Hühnerbereich, Ton bleibt aus, Zugriff und Aufbewahrung sind schulisch festgelegt.')+p('Muster für die Fehlersuchnotiz: Kamera ist mit <code>--list-cameras</code> erkannt, Foto wurde geöffnet, Video wurde abgespielt; dies sind am Gerät zu belegende Meilensteine. Funktioniert der externe Player, aber die Einbettung nicht, wird zunächst dessen Einbettungsfreigabe geprüft. Bei vollständiger Dunkelheit sind ohne sichtbare oder nahe IR-Beleuchtung keine Motivdetails zu erwarten.'))]}
  },
  'index.html': {
    output:'index-wuerfel72.html',
    overrides:{coop_project_reflection:example('Besonders wichtig wird die gemeinsame Datenschnittstelle zwischen ESP32 und Homepage. Wenn Temperatur, relative Feuchte und ADC-Rohwert ohne Einheit und Messzeit übertragen werden, kann die Anzeige Werte falsch deuten. Deshalb legt unser JSON-Format Einheiten, Messalter und Sensorstatus fest. Außerdem trennen wir den lokalen Sensordienst vom Kamerastream, damit ein Videoausfall nicht sämtliche Informationen verdeckt. Für die Kamera begrenzen wir Bildausschnitt und Zugriff, weil eine technisch funktionierende Übertragung noch keine verantwortungsvolle Veröffentlichung ist.')},
    extra:{
      '1':[task('text-index-leitfrage','Musterprojekt zur Leitfrage',example('Der ESP32 liest KY-015 an GPIO4 und KY-018 an ADC1/GPIO34, prüft Fehler und bietet lokale JSON-Messdaten an. Der Pi 4 verarbeitet die CSI-NoIR-Kamera und betreibt den Kameradienst unter systemd. Die freigegebene Homepage zeigt Temperatur, %RH, LDR-Rohwert beziehungsweise Projektkategorie und Aktualitätsstatus; der Pi sendet einen erlaubten Stream ausgehend zum Verteilungsdienst. Nach Neustarts müssen Sensorwerte, HTTP-Antwort, lokales Kamerabild und Stream einzeln wieder nachgewiesen werden. Versorgung, wettergeschützte Montage, Bildausschnitt und Zugriff werden vor dem realen Stallbetrieb geprüft.'))],
      '3':[task('text-index-team-uebergabe','Musterübergabe: die vier Fragen',table(['Frage','Konkrete mögliche Antwort'],[['Was funktioniert?','ESP32 liest beide Sensoren und liefert lokal einen JSON-Datensatz.'],['Woran geprüft?','Serial Monitor mit Zeit/Status und GET /api mit HTTP 200; tatsächliche Logs im Projektprotokoll.'],['Welche Werte / Dateien entstehen?','Temperatur in °C, Feuchte in %RH, LDR als Rohwert, Messalter; Pi-seitig huhn.jpg und huhn.h264.'],['Letzter bekannter Fehler?','Im Beispielszenario funktioniert das lokale Pi-Video, die Homepage-Einbettung bleibt leer. Nächster Test: Player direkt beim Verteilungsdienst öffnen.']]))],
      '4':[task('text-index-projektunterlagen','Konkrete Bestandteile einer Muster-Projektdokumentation',p('Systemdiagramm: Sensoren→ESP32→WLAN/HTTP/JSON→Anzeige; Kamera→Pi/rpicam→freigegebener Dienst→Player. Pin-Tabelle: KY-015 Signal GPIO4, 3V3, GND; LDR-Mittelabgriff GPIO34. Kernprogramm: alle 2 s lesen, ungültige DHT-Werte abfangen, LDR mitteln, JSON mit Status liefern. Kamera: Erkennung, Foto und Video lokal prüfen, Dienst nach Neustart kontrollieren. Messprotokoll: Ort, Zeit, Einheit, Randbedingungen und Streuung. Fehlersuchprotokoll: letzter erfolgreicher Test und genau der nächste überprüfte Übergang. Datenschutz-Checkliste: Stallbereich, kein Audio, erlaubte Nutzer, festgelegte Aufbewahrung. Reflexion: Aufgabenteilung erhält Sensoranzeige auch bei Kameraausfall.')+p('Die konkreten Sensor- und Kamera-Kernprogramme, Pinbelegung und Übergabedaten stehen vollständig in den eigenständigen Lösungen der Gruppenseiten. Ein Musterprojekt ist ein mögliches Ergebnis; Hardwarelogs und Fotos müssen aus dem tatsächlich geprüften Aufbau stammen.'))],
      '5':[task('text-index-doppelstunden-projektnachweise','Musterergebnisse zu allen zehn Doppelstunden',p('Die folgenden Ergebnisse beschreiben einen möglichen Projektverlauf und die nötigen Nachweise. Sie sind keine Behauptung, dass diese Hardwaretests bereits erfolgt sind.')+projectPlan)],
      '6':[task('text-index-erweiterungen','Musterlösungen zu den Erweiterungsaufträgen',p('Experimentell begründete Lichtschwelle: Für LDR oben sei der fiktive dunkle Bereich 500–650 und der helle 1400–1600. „Hell“ wird ab 1100 gesetzt und erst unter 900 zurückgenommen; diese Hysterese verhindert häufiges Umschalten bei Rauschen. Beim umgekehrten Spannungsteiler kehren sich Vergleichsrichtungen um. Der Wert 1430 ist damit in diesem Modell „hell“, weiterhin keine Luxzahl.')+p('JSON-Erweiterung: Einheiten, synchronisierter Zeitstempel oder Laufzeit/Messalter, Status <code>ok</code>/<code>dht_error</code> und fehlende Zahlen als <code>null</code>. Datenratenmessung: Dateigröße in Byte · 8 / Aufnahmezeit in s; 15 MB in 60 s ergeben 2 Mbit/s. Startzeit: Zeitdifferenz vom kontrollierten Einschalten bis zum ersten gültigen HTTP-Datensatz beziehungsweise Kamerabild. Energie: Bei angenommenen 5 V und 0,4 A ist P = U·I = 2 W und E über 3 h = 6 Wh; das sind Rechenbeispiele, keine gemessenen Gerätewerte.')+p('Automatischer Wiederanlauf: Der ESP32 wiederholt einen fehlgeschlagenen WLAN-Verbindungsversuch in festen Abständen und misst weiter. systemd überwacht den Pi-Prozess mit <code>Restart=on-failure</code>. Ein kontrollierter Verbindungs- oder Prozessausfall wird mit Zeit, erwarteter Reaktion und tatsächlichem Log ausgewertet; die Homepage zeigt bis zum erfolgreichen neuen Nachweis einen Ausfallstatus.'))]
    }
  }
};
