const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paragraph = value => `<p>${escape(value)}</p>`;
const table = (columns, rows) => `<div class="solution-table" tabindex="0" role="region" aria-label="Musterlösung als Tabelle"><table><thead><tr>${columns.map(label => `<th scope="col">${escape(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function renderTask(task, answers) {
  const cfg = task.cfg;
  if (Object.hasOwn(answers, cfg.id)) return `<span class="solution-label">Eine mögliche Antwort</span>${answers[cfg.id]}`;
  switch (task.type) {
    case 'mcq':
      return (cfg.questions || []).map(question => `<h4>${escape(question.text)}</h4>${paragraph(question.choices.filter(choice => question.correct.includes(choice.id)).map(choice => choice.label).join('; '))}${question.explain ? paragraph(question.explain) : ''}`).join('');
    case 'verify':
      return (cfg.questions || [cfg]).map(item => {
        const correct = Array.isArray(item.correct) ? item.correct.includes('true') : item.answer !== false;
        return `<p><b>${correct ? 'Wahr' : 'Falsch'}.</b> ${escape(item.statement || item.text)}</p>${paragraph(item.explain || cfg.explain || '')}`;
      }).join('');
    case 'cloze':
      return `<p>${cfg.segments.map(segment => segment.t === 'gap' ? `<b>${escape(Array.isArray(segment.a) ? segment.a[0] : segment.a)}</b>` : escape(segment.v)).join('')}</p>`;
    case 'order':
      return `<ol>${cfg.items.map(item => `<li>${escape(typeof item === 'object' ? item.label || item.text : item)}</li>`).join('')}</ol>`;
    case 'categorize':
      return table(['Kategorie', 'Begriff'], cfg.items.map(item => [(cfg.categories.find(category => category.id === item.category) || {}).title || item.category, item.label]));
    case 'trace':
      return table(cfg.columns.map(column => column.label), cfg.rows.map(row => row.cells.map(cell => Object.hasOwn(cell, 'given') ? cell.given : cell.answers[0])));
    case 'reveal':
    case 'reveal-img':
      if (cfg.src) return `<img src="${escape(cfg.src)}" alt="${escape(cfg.alt || cfg.title)}" style="max-width:100%;height:auto">`;
      if (cfg.answer) return paragraph(cfg.answer);
      throw new Error(`Antwort für ${cfg.id} ergänzen.`);
    case 'p2':
      if (task.htmlPairs) return `<div class="solution-table" tabindex="0" role="region" aria-label="Richtig verbundene Paare"><table><thead><tr><th>Begriff / Aufgabe</th><th>Zuordnung</th></tr></thead><tbody>${task.htmlPairs.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      return table(['Begriff', 'Bedeutung'], task.pairs);
    default:
      throw new Error(`Fachliche Musterantwort für ${cfg.id} (${task.type}) fehlt.`);
  }
}

const styles = `
.wb-book .wb-side-footer{display:none}
.solution-block{min-width:0}
.solution-block h3{font-size:18px;line-height:1.45}
.solution-label{display:block;color:var(--wb-muted);font-size:13px;font-weight:700;margin-bottom:8px}
.solution-table{max-width:100%;overflow-x:auto;margin:12px 0}
.solution-table table{border-collapse:collapse;width:100%;min-width:420px;font-size:14px;color:var(--wb-text)}
.solution-table th,.solution-table td{border:1px solid var(--wb-line);padding:9px 10px;text-align:left;vertical-align:top}
.solution-table th{background:var(--wb-head-bg);color:var(--wb-text)}
.solution-block pre{padding:12px;overflow-x:auto;background:var(--wb-block-bg);color:var(--wb-text);border:1px solid var(--wb-line);border-radius:6px}
.solution-block img{max-width:100%;height:auto}
.solution-block > table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;font-size:14px}
.solution-block > table th,.solution-block > table td{border:1px solid var(--wb-line);padding:8px;text-align:left}
@media(max-width:980px){
.wb-book:not(.wb-present-mode){--wb-topH:112px}
.wb-book:not(.wb-present-mode) .wb-topbar{flex-wrap:wrap;gap:6px;padding:8px 12px;box-sizing:border-box}
.wb-book:not(.wb-present-mode) .wb-top-left{width:100%;min-width:0;gap:10px}
.wb-book:not(.wb-present-mode) .wb-hamburger{width:44px;height:44px;flex-shrink:0}
.wb-book:not(.wb-present-mode) .wb-brand{font-size:17px;line-height:1.25}
.wb-book:not(.wb-present-mode) .wb-top-right{width:100%;justify-content:space-between;gap:4px}
.wb-book:not(.wb-present-mode) .wb-theme-wrap{padding:4px;gap:0}
.wb-book:not(.wb-present-mode) .wb-theme-select{width:90px;padding:6px 4px}
.wb-book:not(.wb-present-mode) .wb-page-ind{min-width:36px;font-size:14px}
.wb-book:not(.wb-present-mode) .wb-icon-btn{width:32px;height:32px;flex-shrink:0}
}`;

async function inspect(browser, filename) {
  const html = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '');
  const page = await browser.newPage();
  try {
    return await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const book = doc.querySelector('[data-wb-book]');
      if (!book) throw new Error('Diese Lernseite verwendet kein Book-Layout; Musterlösung manuell erstellen.');
      const configNode = book.querySelector('.wb-book-config');
      const config = configNode ? JSON.parse(configNode.textContent) : {};
      const pages = [...book.querySelectorAll('section[data-wb-page]')].map(section => {
        const heading = section.querySelector('h1,h2');
        const tasks = [...section.querySelectorAll('[data-wb-type],[data-p2]')].map((element, index) => {
          if (element.hasAttribute('data-p2')) {
            const left = [...element.querySelectorAll('[data-side="L"][data-pair]')];
            const right = [...element.querySelectorAll('[data-side="R"][data-pair]')];
            const id = element.getAttribute('data-p2-id') || element.id || `p2_${[...doc.querySelectorAll('[data-p2]')].indexOf(element)}`;
            return {type:'p2', cfg:{id,title:element.getAttribute('data-p2-title') || 'Begriffspaare'}, pairs:left.map(item => [item.textContent.trim(), (right.find(other => other.dataset.pair === item.dataset.pair)?.textContent || '').trim()]), htmlPairs:left.map(item => [item.innerHTML, right.find(other => other.dataset.pair === item.dataset.pair)?.innerHTML || ''])};
          }
          const cfg = JSON.parse(element.querySelector('.wb-config').textContent);
          if (!cfg.id) throw new Error(`Aufgabe ${index} ohne ID muss manuell zugeordnet werden.`);
          return {type:element.dataset.wbType, cfg};
        });
        return {number:section.dataset.wbPage, title:section.dataset.wbPageTitle || heading?.textContent || '', heading:heading?.textContent || '', headingTag:heading?.tagName.toLowerCase() || 'h2', tasks};
      });
      const head = [...doc.head.querySelectorAll('link[rel="stylesheet"],style,script')].filter(node => node.tagName !== 'SCRIPT' || /mathjax/i.test(node.src) || /window\.MathJax/.test(node.textContent)).map(node => node.outerHTML).join('\n');
      return {title:doc.title,config,head,pages};
    }, html);
  } finally {
    await page.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const playwrightPath = process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP || '', 'school-ki2-check/node_modules/playwright');
  const {chromium} = require(playwrightPath);
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    if (args[0] === '--inspect' && args[1]) {
      console.log(JSON.stringify(await inspect(browser, path.resolve(root, args[1])), null, 2));
      return;
    }
    if (!args.length) throw new Error('Aufruf: node scripts/build-musterloesungen.cjs antwortdatei.json [...] oder --inspect lernseite.html');
    for (const input of args) {
      const parsed = JSON.parse(fs.readFileSync(path.resolve(root, input), 'utf8'));
      for (const spec of Array.isArray(parsed) ? parsed : [parsed]) {
      const sourcePath = path.resolve(root, spec.source);
      const outputPath = path.resolve(root, spec.output);
      if (path.dirname(sourcePath) !== path.dirname(outputPath) || sourcePath === outputPath || !sourcePath.startsWith(root + path.sep)) throw new Error('Quelle und separate Lösung müssen im selben Projektordner liegen.');
      const source = await inspect(browser, sourcePath);
      source.head += `\n<link rel="stylesheet" href="${path.relative(path.dirname(outputPath),path.join(root,'assets/musterloesungen.css')).replaceAll('\\','/')}">`;
      const answers = spec.answers || {};
      const config = {bookTitle:spec.bookTitle || `${path.parse(sourcePath).name} · Musterlösung`, sectionTitle:`${source.config.sectionTitle || source.title} · Musterlösungen`,autoNav:true,autoNavHeadings:['h1','h2','h3'],autoNavIncludeBlocks:false,enableResultsPage:false,studentNameStorageKey:'musterloesung_only_name'};
      const digest = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
      const usedIds = new Map();
      const solutionId = (id, page) => {
        const occurrence = (usedIds.get(id) || 0) + 1;
        usedIds.set(id, occurrence);
        return occurrence === 1 ? id : `${id}__page_${page}_${occurrence}`;
      };
      const pages = source.pages.map((page, index) => {
        const heading = `<${page.headingTag}>${escape(page.heading)}</${page.headingTag}>`;
        const top = index === 0 ? `<div class="course-hero"><div class="course-kicker">Musterlösung</div>${heading}</div>` : heading;
        const tasks = page.tasks.map(task => `<div class="wb-section-break"></div><article class="solution-block" data-solution="${escape(solutionId(task.cfg.id, page.number))}"><h3>${escape(task.cfg.title || task.cfg.id)}</h3>${renderTask(task, answers)}</article>`).join('\n');
        const extras = (spec.extras?.[page.number] || []).map(item => `<div class="wb-section-break"></div><article class="solution-block" data-solution="${escape(solutionId(item.id, page.number))}"><h3>${escape(item.title)}</h3>${item.html}</article>`).join('\n');
        return `<section data-wb-page="${escape(page.number)}" data-wb-page-title="${escape(page.title)}">${top}\n${tasks}\n${extras}</section>`;
      }).join('\n');
      const output = `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="musterloesung-source" content="${escape(path.basename(sourcePath))}">\n<meta name="musterloesung-source-sha256" content="${digest}">\n<title>${escape(source.title)} – Musterlösung</title>\n${source.head}\n<style>${styles}</style>\n</head>\n<body>\n<div data-wb-book>\n<script type="application/json" class="wb-book-config">${JSON.stringify(config).replaceAll('<','\\u003c')}</script>\n${pages}\n</div>\n<script src="${escape(path.relative(path.dirname(outputPath),path.join(root,'assets/allgemeines_format.js')).replaceAll('\\','/'))}"></script>\n<script>SBLibrary.autoMountAll({storagePrefix:${JSON.stringify(path.basename(outputPath)+'__')}});</script>\n</body>\n</html>\n`;
      fs.writeFileSync(outputPath, output, 'utf8');
      console.log(`Erstellt: ${spec.output} (${source.pages.reduce((count,page) => count + page.tasks.length,0)} Aufgabenblöcke)`);
      }
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = { renderTask, escape, table };
