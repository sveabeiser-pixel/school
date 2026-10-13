const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-freitext-check');
const ignored = new Set(['.git', '.codex', '.agents', 'node_modules', 'legacy_dont_read']);
function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : htmlFiles(file);
    return /\.html?$/i.test(file) ? [file] : [];
  });
}
const files = htmlFiles(root).map(file => ({file:path.relative(root, file), html:fs.readFileSync(file, 'utf8')}));
const asset = name => pathToFileURL(path.join(root, 'assets', name)).href;
const configs = [
  {id:'default', title:'Standard-Freitext'},
  {id:'legacy', title:'Gespeicherte Antwort', fields:[{key:'name',label:'Dein Name',kind:'text'}, {key:'answer',label:'Begründung',kind:'textarea'}, {key:'functionName',label:'Funktionsname',kind:'text'}]},
  {id:'empty', title:'Noch offene Aufgabe', fields:[{key:'name',label:'Name',kind:'text'}, {key:'text',label:'Antwort',kind:'textarea'}]}
];
fs.mkdirSync(output, {recursive:true});
const fixture = path.join(output, 'fixture.html');
fs.writeFileSync(fixture, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Freitext-Prüfung</title><link rel="stylesheet" href="${asset('allgemeines_format.css')}"></head><body><div data-wb-book><script class="wb-book-config" type="application/json">${JSON.stringify({bookTitle:'Freitext-Prüfung',onSubmit:'exportResults',autoNav:true,webhookUrl:'https://example.test/submission'})}</script><section data-wb-page="1"><h1>Freitextaufgaben</h1>${configs.map(cfg => `<div data-wb-type="essay"><script class="wb-config" type="application/json">${JSON.stringify(cfg)}</script></div>`).join('')}</section></div><script src="${asset('allgemeines_format.js')}"></script><script>SBLibrary.autoMountAll();</script></body></html>`, 'utf8');

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      await page.route('**/wb-results-pdf.js', route => route.fulfill({contentType:'text/javascript',body:'window.WBResultsPDF = {save:async report => {window.report = report;}};'}));
      await page.addInitScript(() => {
        window.fetch = async (url, options) => {window.submission = JSON.parse(options.body); return new Response('{}', {status:200});};
      });
      await page.goto(pathToFileURL(fixture).href);
      if (width === 1440) {
        const audit = await page.evaluate(files => {
          let count = 0;
          const issues = [];
          for (const {file,html} of files) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            for (const block of doc.querySelectorAll('[data-wb-type="essay"]')) {
              const config = block.querySelector('script.wb-config');
              if (!config) {issues.push(file + ': Konfiguration fehlt'); continue;}
              const cfg = JSON.parse(config.textContent);
              count++;
              if ((cfg.fields || []).some(field => /^name$/i.test(field.key) || /^(?:dein\s+)?name$/i.test(field.label))) issues.push(file + ': ' + cfg.id + ' fragt den Namen ab');
              const rendered = SBBlocks.createEssay(cfg).node;
              if (rendered.querySelector('[data-wb-key="name"]')) issues.push(file + ': ' + cfg.id + ' zeigt ein Namensfeld');
            }
          }
          return {count,issues};
        }, files);
        assert.deepEqual(audit.issues, []);
        console.log(`${files.length} HTML-Dateien und ${audit.count} Freitextblöcke geprüft (einschließlich public/ und Vorlagen).`);
      }
      await page.evaluate(() => {
        const prefix = 'wb_' + location.pathname + '_';
        localStorage.setItem(prefix + 'legacy__name', 'ALTER-AUFGABENNAME');
        localStorage.setItem(prefix + 'legacy__answer', 'Meine gespeicherte Begründung bleibt erhalten.');
        localStorage.setItem(prefix + 'legacy__functionName', 'blinken');
        localStorage.setItem(prefix + 'empty__name', 'NUR-ALTER-NAME');
        localStorage.setItem('wbStudentName', 'Mia Müller');
      });
      await page.reload();
      assert.equal(await page.locator('[data-wb-student-name]').count(), 1);
      assert.equal(await page.locator('[data-wb-student-name]').inputValue(), 'Mia Müller');
      assert.equal(await page.locator('[data-wb-type="essay"] [data-wb-key="name"]').count(), 0);
      assert.equal(await page.locator('[data-wb-key="answer"]').inputValue(), 'Meine gespeicherte Begründung bleibt erhalten.');
      assert.equal(await page.locator('[data-wb-key="functionName"]').inputValue(), 'blinken');
      await page.locator('[data-wb-key="answer"]').fill('Meine neue Begründung wird gespeichert.');
      await page.reload();
      assert.equal(await page.locator('[data-wb-key="answer"]').inputValue(), 'Meine neue Begründung wird gespeichert.');
      await page.evaluate(() => {
        const field = document.createElement('input');
        field.setAttribute('data-wb-key', 'name');
        field.value = 'VERALTETES-DOM-NAMENSFELD';
        document.querySelectorAll('[data-wb-type="essay"]')[2].appendChild(field);
      });
      await page.locator('.wb-submit-btn').evaluate(button => button.click());
      await page.waitForFunction(() => window.report && window.submission);
      const {report,submission} = await page.evaluate(() => ({report:window.report,submission:window.submission}));
      assert.equal(report.name, 'Mia Müller');
      assert.equal(submission.name, 'Mia Müller');
      assert.equal(report.summary.taskTotal, 3);
      assert.equal(report.summary.taskDone, 1);
      assert.equal(report.chapters[0].tasks[2].completed, false);
      assert(report.chapters[0].tasks[2].items.every(item => item.status === 'empty'));
      for (const value of ['ALTER-AUFGABENNAME','NUR-ALTER-NAME','VERALTETES-DOM-NAMENSFELD']) {
        assert(!JSON.stringify(report).includes(value));
        assert(!submission.message.includes(value));
      }
      assert(submission.message.includes('Meine neue Begründung wird gespeichert.'));
      assert.equal((submission.message.match(/Name: Mia Müller/g) || []).length, 1);
      assert.deepEqual(errors, []);
      await page.screenshot({path:path.join(output, `ergebnisse-${width}.png`),fullPage:true});
      await context.close();
      console.log(`OK ${width}px: zentrale Namenseingabe, gespeicherte Antworten, Fortschritt und Export.`);
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
