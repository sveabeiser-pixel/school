const fs = require('node:fs');
const path = require('node:path');

const [regular, bold] = process.argv.slice(2);
if (!regular || !bold) throw new Error('Aufruf: node scripts/build-pdf-fonts.cjs NotoSans-Regular.ttf NotoSans-Bold.ttf');
const fonts = { regular: fs.readFileSync(regular).toString('base64'), bold: fs.readFileSync(bold).toString('base64') };
const output = path.resolve(__dirname, '../assets/vendor/noto-sans-pdf.js');
fs.writeFileSync(output, '// Noto Sans; SIL Open Font License 1.1. See NotoSans-OFL.txt.\nwindow.WBResultsPDFFonts = ' + JSON.stringify(fonts) + ';\n', 'utf8');
console.log('PDF-Schriften erstellt: ' + output);
