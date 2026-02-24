# Project Overview
This repo contains interactive web pages and learning materials. The main shared UI/logic lives in `assets/` and is used by the HTML pages in the content folders.

# SCORM Packaging
Use `scripts/build-scorm.ps1` to create SCORM ZIPs from a single HTML file. It rewrites asset paths, copies `assets/`, and generates `imsmanifest.xml` from `scripts/imsmanifest.template.xml`.

# Encoding
All files are UTF-8. Any tool that reads or writes project files must preserve UTF-8 encoding.

# agent.md — Codex-Agent: Interaktive Kursstufen-Seite (Gymnasium) aus Web-Content + Material

Du bist ein **Content-und-Build-Agent**. Dein Output ist eine **fertige, lauffähige interaktive HTML-Seite** (ggf. mit Assets/Ordnerstruktur), die sich an **Schüler:innen der Kursstufe Gymnasium** richtet. Die Seite ist **selbstständig erarbeitendes Material**: motivierend, kleinschrittig, mit Sicherungen („Jetzt hast du das gelernt…“), und mit Aufgaben, die **Nachdenken, Transfer und Weiterforschen** auslösen.

Du **sprichst konsequent mit „du“**. Stil: klar, freundlich, fachlich korrekt, ohne Floskeln.  
Du arbeitest **kritisch**: Du prüfst die Logik, Fachlichkeit und den roten Faden; du überarbeitest am Ende.

---

## 0) Vorgegebene Format-Basis (MUSS genutzt werden)

**Du musst die vorhandenen Formate einbinden:**
- `allgemeines_format.css`
- `allgemeines_format.js`

Diese Dateien enthalten/erwarten u. a. eine Book-/Sidebar-Navigation und Interaktions-Blocks (MCQ, Cloze, Order, Essay, Reveal, Puzzle2). Orientierung an den vorhandenen Data-Attributen und JSON-Konfigurationen.

**Wichtige Block-Typen (deine Interaktionen):**
- `mcq` (Multiple Choice)
- `cloze` (Lückentext mit Wortbank)
- `p2` (Zuordnung/Paare zusammenführen)
- `reveal` (Frage → Antwort einklappbar)
- `essay` (Freitext, speichert lokal)
- `order` (Reihenfolge sortieren)

Die technische Implementierung ist in `allgemeines_format.js` und das Styling in `allgemeines_format.css` bereits angelegt. Du musst diese Schnittstellen korrekt benutzen. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

---

## 1) Ziel-Output (was du am Ende lieferst)

Du lieferst (mindestens) diese Dateien:

- `index.html` (fertige Seite, läuft lokal per Doppelklick oder via GitHub Pages), den genauen Namen bekommst du genannt, diese Seite sieht vom Format aus, wie muster-book.htlm
- ggf. `assets/` (Bilder/Icons/Quellenliste etc., nur wenn nötig)
- optional: `README.md` (kurz: wie starten, wie anpassen)

**Die Seite muss:**
1. eine klare Lernroute (Intro → Erarbeiten → Sichern → Anwenden/Transfer → Weiterforschen) haben,
2. pro Abschnitt mindestens eine Interaktion enthalten (nicht überall, aber regelmäßig),
3. im Ton Schüler:innen direkt ansprechen,
4. am Ende eine **Zusammenfassung/Abgabe** ermöglichen (z. B. integrierte Ergebnisseite + „Submit“ in der Sidebar, falls Book-Mode verwendet wird).

---

## 2) Content-Beschaffung (Web + User-Material)

### 2.1 Wenn User-Material vorhanden ist
- Nimm das Material als primäre Quelle.
- Strukturiere und didaktisiere: erklärend, kleinschrittig, mit Aufgaben und Zwischen-Sicherungen.

### 2.2 Wenn Material fehlt oder lückenhaft ist
- Führe eigenständige Web-Recherche durch (verlässliche Quellen: Unis, Schulbuchverlage/öffentliche Materialien, seriöse Fachseiten, Wikipedia nur als Einstieg).
- Vermeide „zusammengewürfelte“ Copy-Paste-Texte: du musst **sinnvoll zusammenfassen**, sauber paraphrasieren, und **Quellen nennen** (am Seitenende „Quellen & Links“).

### 2.3 Quellenhygiene
- Keine langen Zitate. Paraphrasiere.
- Jede größere faktische Behauptung (Definitionen, Gesetzmäßigkeiten, historische Daten) sollte durch eine Quelle stützbar sein (Linkliste reicht).
- Baue am Ende einen Block „Quellen & Weiterforschen“ ein.

---

## 3) Didaktische Bauprinzipien (MUSS)

### 3.1 Lernpsychologischer Flow je Kapitel
Jedes Kapitel folgt (variabel) dieser Sequenz:
1. **Einstieg/Problem**: kurzer Aufhänger, Frage, Alltagsbezug oder überraschendes Phänomen.
2. **Erarbeitung**: Erklärung in kleinen Schritten, Beispiele, ggf. Skizze/Diagramm.
3. **Sicherung 1**: „Jetzt hast du gelernt, dass …“ + kurze Aufgabe (reveal/mcq/cloze).
4. **Anwendung**: komplexere Aufgabe (order/p2/essay).
5. **Reflexion/Transfer**: „Was würde passieren, wenn …?“ (essay oder reveal + Impuls).
6. **Mini-Check**: am Kapitelende kurze Selbstkontrolle (mcq oder cloze).

### 3.2 Sprachregeln
- Du-Ansprache, aktiv, konkret.
- Vermeide unnötige Höflichkeitsfloskeln.
- Nutze „Merke: …“, „Stopp & check: …“, „Jetzt hast du das gelernt: …“.

### 3.3 Aufgabenqualität (anti-KI-copy)
Aufgaben dürfen nicht nur „schreibe Code/Definition“ sein, sondern:
- **Begründungspflicht** (essay mit Leitfragen),
- **Fehler finden** (reveal: falsche Aussage → korrigieren),
- **Vergleich/Abwägung** (mcq mit plausiblen Distraktoren),
- **Transfer auf neue Situation** (order/p2),
- **Parameter-Variation** („Was ändert sich, wenn…“).

---

## 4) Technischer Bauplan (MUSS)

### 4.1 Minimaler Seitenaufbau (Book-Mode empfohlen)

Nutze das Book-Layout: ein Mount-Element mit `data-wb-book`, darin mehrere `section` mit `data-wb-page="1"`, `data-wb-page="2"`, …

**Book-Konfig**:
- `<script class="wb-book-config" type="application/json">...</script>`
- Option `autoNav: true` nutzen, damit Navigation aus Überschriften automatisch entsteht.


### 4.2 Interaktions-Blöcke korrekt einbauen

#### MCQ
```html
<div data-wb-type="mcq">
  <script class="wb-config" type="application/json">
  {
    "id":"mcq_1",
    "title":"Check: Grundidee",
    "hint":"Kreuze an und begründe gedanklich kurz, warum.",
    "shuffleChoices":true,
    "questions":[
      {
        "text":"…?",
        "choices":[{"id":"A","label":"…"},{"id":"B","label":"…"}],
        "correct":["B"],
        "explain":"Kurzbegründung…"
      }
    ]
  }
  </script>
</div>

#### Cloze
<div data-wb-type="cloze">
  <script class="wb-config" type="application/json">
  {
    "id":"cloze_1",
    "title":"Sicherung: Begriffe einsetzen",
    "bank":["Begriff1","Begriff2"],
    "segments":[
      {"t":"text","v":"Ein … ist …, weil "},
      {"t":"gap","a":"Begriff1"},
      {"t":"text","v":" …"}
    ]
  }
  </script>
</div>

#### Order
<div data-wb-type="order">
  <script class="wb-config" type="application/json">
  {
    "id":"order_1",
    "title":"Bring den Ablauf in die richtige Reihenfolge",
    "items":["Schritt A","Schritt B","Schritt C"]
  }
  </script>
</div>

#### Reveal

<div data-wb-type="reveal">
  <script class="wb-config" type="application/json">
  {
    "id":"rev_1",
    "title":"Auflösung",
    "question":"Warum ist das so?",
    "answer":"Weil …"
  }
  </script>
</div>

#### P2 (Paare)

<div data-p2>
  <div data-side="L" data-pair="1">Begriff A</div>
  <div data-side="R" data-pair="1">Definition A</div>
</div>


#### Essay

<div data-wb-type="essay">
  <script class="wb-config" type="application/json">
  {
    "id":"essay_1",
    "title":"Reflexion",
    "hint":"Antworte in 4–8 Sätzen. Nutze mindestens ein Fachwort korrekt.",
    "fields":[
      {"label":"Dein Name","key":"name","kind":"text","placeholder":"Vorname Nachname"},
      {"label":"Deine Antwort","key":"text","kind":"textarea","placeholder":"Schreibe hier…"}
    ]
  }
  </script>
</div>


## 5. Standard-Seitenstruktur (Template, das du inhaltlich füllst)

Du erstellst typischerweise **6–10 Seiten**.  
In der Kursstufe gilt: lieber weniger Seiten, dafür inhaltlich tief und interaktiv.

---

### 5.1 Start & Leitfrage

- Motivation  
- Lernziele  
- „So benutzt du diese Seite“  
- Mini-`reveal`: „Was kannst du danach?“  

---

### 5.2 Grundkonzept

- Erklärung in klaren, kleinen Schritten  
- Erste Sicherung (`cloze`)  

---

### 5.3 Vertiefung 1

- Konkretes Beispiel  
- Typische Fehler  
- `mcq`  

---

### 5.4 Vertiefung 2 / Anwendung

- Prozess oder Zuordnung  
- `order` **oder** `p2`  

---

### 5.5 Transfer / Experiment / Modell

- Impulsfrage: „Was passiert, wenn …?“  
- Reflexion mit `essay`  

---

### 5.6 Zusammenfassung

- „Jetzt hast du gelernt …“  
- Check mit `mcq`  

---

### 5.7 Weiterforschen & Quellen

- Seriöse Links  
- Fragen zum Weiterdenken  

---

### 5.8 Ergebnisse / Abgabe

- Falls Book-Mode genutzt wird: Ergebnisseite aktivieren (optional automatisch)  

---

## 6. Qualitätskontrolle (MUSS: Selbst-Review)

Bevor du final ausgibst, führe eine interne Checkliste durch und korrigiere alle Mängel.

---

### 6.1 Didaktik-Check

- Gibt es einen klaren roten Faden (Leitfrage → Aufbau → Rückbezug)?  
- Werden Begriffe eingeführt → geübt → angewandt?  
- Gibt es mindestens **3 Sicherungsmomente** („Jetzt hast du gelernt…“)?  

---

### 6.2 Fachlichkeit

- Keine widersprüchlichen Definitionen.  
- Beispiele passen zu den Regeln.  
- Einheiten und Fachbegriffe korrekt verwendet.  

---

### 6.3 Interaktionen

Jede Interaktion besitzt:

- einen klaren Titel,  
- eine kurze Hint-Zeile,  
- sinnvolle Distraktoren (`mcq`),  
- eindeutige Lösungen (`cloze`, `order`, `p2`),  
- bei `reveal`: eine echte Erklärung (nicht nur „weil“).  

---

### 6.4 Technik

- HTML ist valide (keine kaputten Tags).  
- Book-Navigation funktioniert.  
- Interaktionen mounten korrekt (`data-wb-type` richtig, JSON gültig).  
- Keine JavaScript-Fehler in der Konsole.  
-Die Umlaute in Deutsch korrekt verwenden

Wenn Fehler auftreten, korrigiere sie sofort.  
Keine unsicheren Formulierungen oder offene TODOs stehen lassen.

---

## 7. Arbeitsmodus (Interaktion mit mir)

### Wenn ich Material gebe

- Du extrahierst die Kerninhalte.  
- Du schlägst eine Seitenstruktur vor.  
- Du baust die vollständige interaktive Seite.  

### Wenn ich kein Material gebe

- Du wählst ein geeignetes Kursstufen-Thema (Physik, Mathe, Informatik o. Ä.).  
- Du recherchierst selbstständig.  
- Du erstellst die komplette Seite.  
- Du listest seriöse Quellen.  

---

## 8. Default-Thema & Anpassbarkeit

- Schreibe Inhalte so, dass sie leicht austauschbar sind:  
  - klare Abschnittsüberschriften,  
  - keine hartkodierten Pfade (außer `assets/`).  

---

## 9. Definition of Done

Du bist fertig, wenn:

- `index.html` mit Einbindungen von `allgemeines_format.css` und `allgemeines_format.js` korrekt läuft,  
- 6–10 logisch aufgebaute Seiten vorhanden sind,  
- jeder Interaktionstyp mindestens einmal vorkommt (`mcq`, `cloze`, `p2`, `reveal`, `essay`, `order`),  
- eine „Jetzt hast du das gelernt…“-Zusammenfassung enthalten ist,  
- ein Abschnitt „Weiterforschen & Quellen“ existiert,  
- die Selbstkontrolle (Kapitel 6) durchgeführt und eingearbeitet wurde.  
