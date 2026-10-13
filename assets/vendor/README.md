# PDF-Export: lokale Abhängigkeiten

- `jspdf.umd.min.js`: jsPDF 4.2.1, MIT; Original-Lizenz in `jspdf-LICENSE.txt`. Quelle: https://github.com/parallax/jsPDF/tree/v4.2.1
- `dejavu-sans-pdf.js`: unveränderte DejaVu-Sans-Schriften (Regular und Bold) als Base64 für jsPDF, Bitstream-Vera-Lizenz; Original-Lizenz in `DejaVu-LICENSE.txt`. Quelle: https://github.com/matplotlib/matplotlib/tree/v3.10.8/lib/matplotlib/mpl-data/fonts/ttf

Die Dateien werden erst beim PDF-Export geladen. Es werden keine Schülerantworten an Bibliotheksanbieter übertragen. Die Schriftdaten lassen sich mit `node scripts/build-pdf-fonts.cjs Pfad/zu/DejaVuSans.ttf Pfad/zu/DejaVuSans-Bold.ttf` neu erzeugen.
