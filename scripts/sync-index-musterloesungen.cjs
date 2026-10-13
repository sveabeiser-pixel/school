const fs = require('node:fs');
const path = require('node:path');
const { metadata } = require('./check-musterloesungen.cjs');
const root = path.resolve(__dirname, '..');
const labels = JSON.parse(fs.readFileSync(path.join(__dirname, 'lernseiten-links.json'), 'utf8'));
const skip = new Set(['.git', '.codex', '.agents', 'node_modules', 'assets', 'public', 'legacy_dont_read']);
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const link = (href, label, className) => `<a class="${className}" href="${escape(href)}">${escape(label)}</a>`;
const solutions = new Map();

function scan(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && !skip.has(entry.name)) scan(full);
    else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
      const meta = metadata(fs.readFileSync(full, 'utf8'));
      if (!meta['musterloesung-source']) continue;
      const source = path.relative(root, path.resolve(directory, meta['musterloesung-source'])).replaceAll('\\','/');
      if (solutions.has(source)) throw new Error(`Mehrere Musterlösungen für ${source}`);
      solutions.set(source, path.relative(root, full).replaceAll('\\','/'));
    }
  }
}

function entry(source) {
  const label = labels[source];
  if (!label) throw new Error(`Beschreibenden Linktext in scripts/lernseiten-links.json ergänzen: ${source}`);
  return link(source, label, 'index-material-link') + (solutions.has(source) ? `<span class="index-solution-line">${link(solutions.get(source), `Musterlösung: ${label}`, 'index-solution-link')}</span>` : '');
}

async function main() {
  scan(root);
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page = await browser.newPage();
    const file = path.join(root, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    const lines = html.split(/\r?\n/);
    const changes = await page.evaluate(({lines,labels}) => {
      const changes = [];
      for (let index = 0; index < lines.length; index++) {
        const doc = new DOMParser().parseFromString(lines[index], 'text/html');
        const anchors = [...doc.querySelectorAll('a[href]')];
        const sourceLinks = anchors.filter(anchor => labels[anchor.getAttribute('href')]);
        if (sourceLinks.length !== 1) continue;
        const anchor = sourceLinks[0];
        const source = anchor.getAttribute('href');
        const container = anchor.closest('li,p');
        if (!container) continue;
        changes.push({index,source,paragraph:container.tagName === 'P'});
      }
      return changes;
    }, {lines,labels});
    for (let position = 0; position < changes.length; position++) {
      const change = changes[position];
      const indent = lines[change.index].match(/^\s*/)[0];
      const item = `<li class="index-material-item">${entry(change.source)}</li>`;
      if (!change.paragraph) {
        lines[change.index] = indent + item;
        continue;
      }
      const startsList = !changes[position - 1]?.paragraph || changes[position - 1].index !== change.index - 1;
      const endsList = !changes[position + 1]?.paragraph || changes[position + 1].index !== change.index + 1;
      lines[change.index] = (startsList ? `${indent}<ul class="index-material-list">\n` : '') + indent + '  ' + item + (endsList ? `\n${indent}</ul>` : '');
    }
    let updated = lines.join('\n');
    const groups = [
      ['Für Lehrkräfte', source => source === 'howto-lehrkraefte.html' || source.startsWith('assets/')],
      ['Medienbildung', source => source.startsWith('medien/') || source.startsWith('misc/')],
      ['Informatik', source => source.startsWith('informatik/')],
      ['Arduino', source => source.startsWith('nwt/') && !source.startsWith('nwt/huehnerstall/')],
      ['Smart Chicken Coop', source => source.startsWith('nwt/huehnerstall/')],
      ['Physik: Felder und Induktion', source => source.startsWith('felder/')],
      ['Physik: Schwingungen und Wellen', source => source.startsWith('wellen/')],
      ['Physik: Quanten und Atome', source => source.startsWith('quanten/')],
      ['Physik: Weitere Themen und Planung', source => source.startsWith('physik_misc/') || source.startsWith('physik_1/')]
    ];
    const contents = groups.map(([title,filter]) => `      <h2>${escape(title)}</h2>\n      <ul class="index-material-list">\n${Object.keys(labels).filter(filter).map(source => `        <li class="index-material-item">${entry(source)}</li>`).join('\n')}\n      </ul>`).join('\n\n');
    const catalog = `    <section data-wb-page="7" data-wb-page-title="Alle Links">\n      <h1>Alle Lernseiten und Musterlösungen</h1>\n      <p>Wähle eine Lernseite oder die zugehörige Musterlösung.</p>\n\n${contents}\n    </section>`;
    const sectionPattern = /    <section data-wb-page="7"[^>]*>[\s\S]*?    <\/section>/;
    if (!sectionPattern.test(updated)) throw new Error('Die Index-Seite Alle Links wurde nicht gefunden.');
    updated = updated.replace(sectionPattern,catalog);
    fs.writeFileSync(file,updated,'utf8');
    const directory = `# Lernseiten und Musterlösungen\n\nAutomatisch erzeugt mit \`node scripts/sync-index-musterloesungen.cjs\`.\n\n| Lernseite | Musterlösung |\n| --- | --- |\n${[...solutions].sort(([a],[b])=>a.localeCompare(b)).map(([source,solution])=>`| [${labels[source]}](${source}) | [Musterlösung](${solution}) |`).join('\n')}\n`;
    fs.writeFileSync(path.join(root,'MUSTERLOESUNGEN-VERZEICHNIS.md'),directory,'utf8');
    console.log(`Index aktualisiert: ${solutions.size} Musterlösungen, beschreibende Linktexte und Verzeichnis.`);
  } finally {await browser.close();}
}

if (require.main === module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
