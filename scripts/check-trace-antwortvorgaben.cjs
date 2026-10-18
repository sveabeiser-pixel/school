const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git','.codex','.agents','node_modules','legacy_dont_read']);
function htmlFiles(directory) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory,entry.name);
    if(entry.isDirectory()) return ignored.has(entry.name) ? [] : htmlFiles(file);
    return /\.html?$/i.test(file) ? [file] : [];
  });
}
async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const output = path.join(process.env.TEMP,'school-trace-hints-check');
  fs.mkdirSync(output,{recursive:true});
  let blocks = 0, fields = 0;
  try {
    for(const width of [1440,390,320]) {
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      await page.route('https://**/*',route => route.abort());
      for(const file of htmlFiles(root)) {
        if(!/data-wb-type\s*=\s*["']trace["']/.test(fs.readFileSync(file,'utf8'))) continue;
        await page.goto(pathToFileURL(file).href,{waitUntil:'domcontentloaded'});
        const audit = await page.evaluate(() => {
          const issues = [];
          let blocks = 0, fields = 0;
          const normalize = value => String(value).trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ').replace(/\s*([=<>+\-*/])\s*/g,'$1').replace(/,/g,'.');
          for(const block of document.querySelectorAll('[data-wb-type="trace"][data-wb-mounted]')) {
            blocks++;
            const cfg = block.__wbConfig;
            const hints = block.querySelectorAll('.wb-trace-column-hint');
            if(new Set([...hints].map(node=>node.id)).size !== hints.length) issues.push(cfg.id + ': doppelte Hinweis-ID');
            for(const input of block.querySelectorAll('[data-wb-trace-field]')) {
              const answers = JSON.parse(input.dataset.wbTraceAnswers);
              if(!answers.length) continue;
              fields++;
              const column = cfg.columns[Number(input.dataset.wbTraceColumn)];
              const hint = document.getElementById(input.getAttribute('aria-describedby'));
              if(!hint || !block.contains(hint) || !hint.closest('thead')) issues.push(cfg.id + ': Antwortvorgabe fehlt im Spaltenkopf');
              const accepts = value => answers.some(answer=>input.dataset.wbTraceMatch==='contains' ? normalize(value).includes(normalize(answer)) : normalize(value)===normalize(answer));
              const advertised = (column.answerOptions || []).find(accepts);
              if(column.answerOptions?.length && !advertised && !column.hint) issues.push(cfg.id + ': Kein Wort aus dem Wortvorrat wird akzeptiert');
              input.value = advertised || answers[0];
              input.dispatchEvent(new Event('input',{bubbles:true}));
            }
            const result = block.__wbInstance.check();
            if(result.correctCount !== result.total) issues.push(cfg.id + ': Vorgeschlagene Eingabe wird abgelehnt');
            block.__wbInstance.reset();
          }
          return {issues,blocks,fields};
        });
        assert.deepEqual(audit.issues,[],path.relative(root,file));
        if(path.relative(root,file) === path.join('informatik','sprachmodelle.html')) {
          const solution = fs.readFileSync(path.join(root,'informatik','sprachmodelle-kaleidoskop29.html'),'utf8');
          const comparison = await page.evaluate(html => {
            const block = document.querySelector('[data-sm-corpus-trace]');
            const expected = block.__wbConfig.rows.map(row=>row.cells.map(cell=>String(Object.hasOwn(cell,'given') ? cell.given : cell.answers[0])));
            const doc = new DOMParser().parseFromString(html,'text/html');
            const actual = [...doc.querySelectorAll('[data-solution="sm_corpus_trace"] tbody tr')].map(row=>[...row.cells].map(cell=>cell.textContent));
            return {expected,actual};
          },solution);
          assert.deepEqual(comparison.actual,comparison.expected,'Musterlösung muss auch alle dynamisch erzeugten Bigramm-Zeilen enthalten');
          assert.equal(comparison.actual.length,23);
        }
        if(width===1440) {blocks+=audit.blocks;fields+=audit.fields;}
        const pageNumbers = await page.locator('[data-wb-type="trace"][data-wb-mounted]').evaluateAll(nodes => [...new Set(nodes.map(node=>node.closest('section[data-wb-page]').dataset.wbPage))]);
        for(const number of pageNumbers) {
          await page.locator(`.wb-page-list [data-wb-page="${number}"]`).first().evaluate(button => button.click());
          for(const theme of ['default','dark','dark-blue']) {
            await page.locator('.wb-theme-select').selectOption(theme,{force:true});
            const issues = await page.locator(`section[data-wb-page="${number}"] .wb-trace-column-hint`).evaluateAll(nodes => nodes.flatMap(node => {
              const rect = node.getBoundingClientRect(),style = getComputedStyle(node);
              const header = node.closest('th').getBoundingClientRect();
              const issues = [];
              if(!rect.height || style.visibility==='hidden' || style.display==='none') issues.push('Hinweis ist verborgen');
              if(node.scrollWidth > node.clientWidth+1 || rect.bottom > header.bottom+1) issues.push('Hinweis läuft über');
              return issues;
            }));
            assert.deepEqual(issues,[],`${file}, Seite ${number}, ${width}px/${theme}`);
          }
        }
      }
      await page.goto(pathToFileURL(path.join(root,'nwt/arduino-2.html')).href);
      await page.locator('.wb-page-list [data-wb-page="3"]').first().evaluate(button => button.click());
      const block = page.locator('[data-wb-type="trace"][data-wb-mounted]');
      for(const theme of ['default','dark','dark-blue']) {
        await page.locator('.wb-theme-select').selectOption(theme,{force:true});
        await block.screenshot({path:path.join(output,`arduino2-${width}-${theme}.png`)});
        if(width < 600) {
          await block.locator('.wb-trace-scroll').evaluate(node=>{node.scrollLeft=node.scrollWidth;});
          await block.screenshot({path:path.join(output,`arduino2-antwortvorgaben-${width}-${theme}.png`)});
          await block.locator('.wb-trace-scroll').evaluate(node=>{node.scrollLeft=0;});
        }
      }
      await page.evaluate(() => {
        const block = document.querySelector('[data-wb-type="trace"][data-wb-mounted]');
        const inputs = [...block.querySelectorAll('[data-wb-trace-field]')];
        inputs.forEach(input => {
          input.value=JSON.parse(input.dataset.wbTraceAnswers)[0];
          input.dispatchEvent(new Event('input',{bubbles:true}));
        });
      });
      await page.reload();
      const restored = await block.evaluate(block => {
        const result=block.__wbInstance.check();
        return {correct:result.correctCount,total:result.total};
      });
      assert.equal(restored.correct,12);
      assert.equal(restored.total,12);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`OK ${width}px: Wortvorräte, Prüfung, Hinweisverknüpfungen, drei Farbschemata und gespeicherte Eingaben.`);
    }
  } finally {
    await browser.close();
  }
  console.log(`${blocks} Ablaufspuren und ${fields} Eingabezellen geprüft.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
