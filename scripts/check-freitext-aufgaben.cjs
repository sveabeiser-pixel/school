const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-freitext-aufgaben-check');
const ignored = new Set(['.git', '.codex', '.agents', 'node_modules', 'legacy_dont_read']);
function htmlFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : htmlFiles(file);
    return /\.html?$/i.test(file) ? [file] : [];
  });
}
const files = htmlFiles(root).map(file => ({file:path.relative(root, file),html:fs.readFileSync(file, 'utf8')}));
fs.mkdirSync(output, {recursive:true});
const fixture = path.join(output, 'fixture.html');
const asset = name => pathToFileURL(path.join(root, 'assets', name)).href;
fs.writeFileSync(fixture, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aufgabenprüfung</title><link rel="stylesheet" href="${asset('allgemeines_format.css')}"></head><body><div data-wb-book><script class="wb-book-config" type="application/json">{"bookTitle":"Aufgabenprüfung","autoNav":true}</script><section data-wb-page="1"><h1>Aufgabe</h1><div id="test-block"></div></section></div><script src="${asset('allgemeines_format.js')}"></script><script>SBLibrary.autoMountAll();</script></body></html>`, 'utf8');

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    for (const width of [1440,390,320]) {
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      await page.goto(pathToFileURL(fixture).href);
      const audit = await page.evaluate(files => {
        const blocks = [], raw = [];
        for (const {file,html} of files) {
          const doc = new DOMParser().parseFromString(html,'text/html');
          for (const block of doc.querySelectorAll('[data-wb-type="essay"]')) blocks.push({file,cfg:JSON.parse(block.querySelector('script.wb-config').textContent)});
          for (const input of doc.querySelectorAll('textarea[data-wb-export],input[data-wb-export]')) raw.push({file,html:input.outerHTML});
        }
        return {blocks,raw};
      }, files);
      for (const theme of ['default','dark','dark-blue']) {
        await page.locator('.wb-theme-select').selectOption(theme);
        const result = await page.evaluate(({blocks,raw}) => {
          const host = document.getElementById('test-block');
          const issues = [];
          let fields = 0, prompts = 0;
          const generic = text => /^(?:schreibe hier|deine antwort|antwort)[.\s\u2026]*$/i.test(text);
          function check(input, text, label, file) {
            fields++;
            input.value = 'Meine eigene Antwort';
            input.dispatchEvent(new Event('input', {bubbles:true}));
            const descriptions = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
            const prompt = descriptions.map(id => document.getElementById(id)).find(node => node?.classList.contains('wb-field-prompt'));
            if (!text || generic(text) || text === label) return;
            if (!prompt || prompt.textContent !== text) {issues.push(file + ': Aufgabe nicht dauerhaft sichtbar: ' + text); return;}
            prompts++;
            const rect = prompt.getBoundingClientRect(), field = input.getBoundingClientRect();
            const style = getComputedStyle(prompt);
            if (style.display === 'none' || style.visibility === 'hidden' || rect.height === 0) issues.push(file + ': Aufgabe ausgeblendet');
            if (rect.bottom > field.top + 1) issues.push(file + ': Aufgabe nicht über dem Eingabefeld');
            if (prompt.scrollWidth > prompt.clientWidth + 1) issues.push(file + ': Aufgabentext läuft über');
            if (style.color === getComputedStyle(input).backgroundColor) issues.push(file + ': Aufgabentext ohne Kontrast');
            if (input.hasAttribute('placeholder')) issues.push(file + ': Aufgabentext auch noch im Feld');
          }
          for (const {file,cfg} of blocks) {
            host.replaceChildren(SBBlocks.createEssay(cfg).node);
            for (const field of cfg.fields || []) {
              if (field.key === 'name') continue;
              const input = [...host.querySelectorAll('[data-wb-key]')].find(input => input.dataset.wbKey === field.key);
              check(input, String(field.prompt || field.placeholder || '').trim(), field.label, file);
            }
          }
          for (const {file,html} of raw) {
            host.innerHTML = html;
            const input = host.querySelector('textarea,input');
            const text = input.getAttribute('data-wb-prompt') || input.getAttribute('placeholder');
            SBBlocks.autoMount();
            SBBlocks.autoMount();
            check(input, text, input.getAttribute('data-wb-label'), file);
            if (host.querySelectorAll('.wb-field-prompt').length !== 1) issues.push(file + ': fehlende oder doppelte Aufgabenstellung');
          }
          const explicit = {fields:[{key:'text',kind:'textarea',label:'Antwort',prompt:'Begründe mit <script> und α.\nNenne zwei Fälle.',placeholder:'Schreibe hier...'}]};
          host.replaceChildren(SBBlocks.createEssay(explicit).node);
          check(host.querySelector('textarea'), explicit.fields[0].prompt, 'Antwort', 'expliziter prompt');
          if (host.querySelector('script')) issues.push('Aufgabenstellung als HTML ausgeführt');
          return {fields,prompts,issues};
        }, audit);
        assert.deepEqual(result.issues, []);
        console.log(`OK ${width}px/${theme}: ${files.length} HTML-Dateien, ${result.fields} Felder, ${result.prompts} dauerhafte Aufgaben/Leittexte.`);
      }
      await page.goto(pathToFileURL(path.join(root,'informatik/kuenstliche-intelligenz.html')).href);
      await page.locator('.wb-page-list [data-wb-page="8"]').evaluate(button => button.click());
      const block = page.locator('[data-wb-type="essay"][data-wb-mounted]').filter({has:page.locator('[data-wb-key="erklaerung"]')});
      const input = block.locator('textarea');
      const task = 'Erkläre, warum kind(alexiares, heracles) wahr sein kann, vater(heracles, alexiares) aber falsch ausgegeben wird, wenn maennlich(heracles) fehlt.';
      await input.fill('Prolog kann nur ableiten, was durch Fakten und Regeln gedeckt ist.');
      assert.equal(await block.locator('.wb-field-prompt').innerText(), task);
      await page.reload();
      await page.locator('.wb-page-list [data-wb-page="8"]').evaluate(button => button.click());
      assert.equal(await input.inputValue(), 'Prolog kann nur ableiten, was durch Fakten und Regeln gedeckt ist.');
      for (const theme of ['default','dark','dark-blue']) {
        await page.locator('.wb-theme-select').selectOption(theme);
        assert(await block.locator('.wb-field-prompt').isVisible());
        const overlap = await block.locator('.wb-head').evaluate(head => {
          const text = head.firstElementChild.getBoundingClientRect();
          const icon = head.querySelector('.wb-task-icon').getBoundingClientRect();
          return text.right > icon.left || head.firstElementChild.scrollWidth > head.firstElementChild.clientWidth + 1;
        });
        assert.equal(overlap, false, 'Aufgabenbild überlappt die Überschrift');
        await block.screenshot({path:path.join(output, `ki-seite8-${width}-${theme}.png`)});
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => {console.error(error);process.exitCode=1;});
