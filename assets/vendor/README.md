# PDF-Export: lokale Abhängigkeiten

- `jspdf.umd.min.js`: jsPDF 4.2.1, MIT; Original-Lizenz in `jspdf-LICENSE.txt`. Quelle: https://github.com/parallax/jsPDF/tree/v4.2.1
- `noto-sans-pdf.js`: unveränderte Noto-Sans-Schriften (Regular und Bold) als Base64 für jsPDF, SIL Open Font License 1.1; Original-Lizenz in `NotoSans-OFL.txt`. Quelle: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans

Die Dateien werden erst beim PDF-Export geladen. Es werden keine Schülerantworten an Bibliotheksanbieter übertragen. Die Schriftdaten lassen sich mit `node scripts/build-pdf-fonts.cjs Pfad/zu/NotoSans-Regular.ttf Pfad/zu/NotoSans-Bold.ttf` neu erzeugen.
