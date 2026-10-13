const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const answers = require('./.musterloesungen-antworten.cjs');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const table = (headers, rows) => `<div class="table-scroll" tabindex="0" role="region" aria-label="Lösungstabelle"><table><thead><tr>${headers.map(x => `<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const css = `
@import url('../../assets/musterloesungen.css');
.wb-book .wb-side-footer{display:none}
.wb-book [data-wb-page] .wb-reveal-item-pending,.wb-book [data-wb-page] .wb-reveal-item-done{opacity:1;transform:none;animation:none}
.sample-answer{min-width:0;margin:18px 0;color:var(--wb-text)}
.sample-answer h2{font-size:20px;line-height:1.4}
.answer-label{display:block;font-size:14px;font-weight:700;color:var(--wb-muted)}
.table-scroll{max-width:100%;overflow-x:auto;margin:12px 0}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{border:1px solid var(--wb-line);padding:9px;text-align:left;vertical-align:top}
th{background:var(--wb-head-bg);color:var(--wb-text)}
pre{max-width:100%;overflow-x:auto;white-space:pre;color:var(--wb-text)}
.wb-book .wb-top-left{min-width:0}.wb-book .wb-brand{overflow-wrap:anywhere}
@media(max-width:600px){
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

function closed(block) {
  const c = block.config;
  if (block.type === 'p2') return table(['Begriff / Anschluss', 'Zuordnung'], block.pairs);
  if (block.type === 'mcq') return c.questions.map(q => `<h3>${esc(q.text)}</h3><ul>${q.correct.map(id => {
    const choice = q.choices.find(x => x.id === id);
    if (!choice) throw new Error(`Fehlende Option ${c.id}/${id}`);
    return `<li>${esc(choice.label)}</li>`;
  }).join('')}</ul><p>${esc(q.explain || '')}</p>`).join('');
  if (block.type === 'verify') return `<p><strong>${c.answer ? 'Wahr' : 'Falsch'}.</strong> ${esc(c.statement)}</p><p>${esc(c.explain)}</p>`;
  if (block.type === 'cloze') return `<p>${c.segments.map(s => s.t === 'gap' ? `<strong>${esc(Array.isArray(s.a) ? s.a[0] : s.a)}</strong>` : esc(s.v)).join('')}</p>`;
  if (block.type === 'order') return `<ol>${c.items.map(x => `<li>${esc(typeof x === 'string' ? x : x.label)}</li>`).join('')}</ol>`;
  if (block.type === 'categorize') return table(['Kategorie', 'Begriffe'], c.categories.map(cat => [cat.title, c.items.filter(x => x.category === cat.id).map(x => x.label).join('; ')]));
  if (block.type === 'reveal') return `<p>${esc(c.answer)}</p>`;
  if (block.type === 'trace') return table(c.columns.map(x => x.label), c.rows.map(row => row.cells.map(cell => cell.given ?? cell.answers[0])));
  throw new Error(`Unbeantworteter Block ${block.type}/${c.id}`);
}

(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
  try {
    const page = await browser.newPage();
    for (const [source, entry] of Object.entries(answers.files)) {
      const bytes = fs.readFileSync(path.join(__dirname, source));
      const document = await page.evaluate(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return {
          config: JSON.parse(doc.querySelector('.wb-book-config').textContent),
          sections: [...doc.querySelectorAll('section[data-wb-page]')].map(section => ({
            number: section.dataset.wbPage,
            title: section.dataset.wbPageTitle,
            heading: section.querySelector('h1,h2').textContent,
            blocks: [...section.querySelectorAll('[data-wb-type],[data-p2]')].map((block, i) => {
              if (block.hasAttribute('data-p2')) {
                const left = [...block.querySelectorAll('[data-side="L"]')];
                return {type:'p2', id:block.dataset.p2Id || block.id || `p2_${[...doc.querySelectorAll('[data-p2]')].indexOf(block)}`, title:block.dataset.p2Title, pairs:left.map(l => [l.textContent, block.querySelector(`[data-side="R"][data-pair="${l.dataset.pair}"]`).textContent])};
              }
              const config = JSON.parse(block.querySelector('.wb-config').textContent);
              return {type:block.dataset.wbType, id:config.id, title:config.title, config};
            })
          }))
        };
      }, bytes.toString('utf8'));
      const config = {bookTitle:'Musterlösung', sectionTitle:`${document.config.sectionTitle} · Musterlösung`, startPage:1, autoNav:true, autoNavHeadings:['h1','h2'], autoNavIncludeBlocks:false, autoNavGroupTitle:document.config.autoNavGroupTitle, themeDefault:document.config.themeDefault, enableResultsPage:false};
      const sections = document.sections.map((section, i) => {
        const extra = entry.extra?.[section.number] || [];
        const blocks = section.blocks.map(block => {
          const override = entry.overrides?.[block.id];
          const body = override || closed(block);
          return `<div class="wb-section-break"></div><article class="sample-answer" data-solution="${esc(block.id)}"><h2>${esc(block.title)}</h2>${body}</article>`;
        });
        return `<section data-wb-page="${i + 1}" data-wb-page-title="${esc(section.title)}">${i === 0 ? '<div class="coop-hero"><span class="coop-kicker">Musterlösung</span>' : ''}<h1>${esc(section.heading)}</h1>${i === 0 ? '</div>' : ''}${blocks.join('\n')}${extra.map(x => `<div class="wb-section-break"></div><article class="sample-answer" data-solution="${esc(x.id)}"><h2>${esc(x.title)}</h2>${x.body}</article>`).join('\n')}</section>`;
      });
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      const output = `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${esc(document.config.sectionTitle)} - Musterlösung</title>\n<meta name="musterloesung-source" content="${esc(source)}">\n<meta name="musterloesung-source-sha256" content="${hash}">\n<link rel="stylesheet" href="../../assets/allgemeines_format.css">\n<link rel="stylesheet" href="projekt.css">\n<style>${css}</style>\n</head>\n<body>\n<div data-wb-book>\n<script type="application/json" class="wb-book-config">${JSON.stringify(config)}</script>\n${sections.join('\n')}\n</div>\n<script src="../../assets/allgemeines_format.js"></script>\n<script>SBLibrary.autoMountAll();</script>\n</body>\n</html>\n`;
      fs.writeFileSync(path.join(__dirname, entry.output), output, 'utf8');
      console.log(`${source} -> ${entry.output}: ${document.sections.reduce((n, s) => n+s.blocks.length+(entry.extra?.[s.number]?.length || 0),0)} Lösungen`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
