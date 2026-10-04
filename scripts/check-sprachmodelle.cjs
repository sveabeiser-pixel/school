const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'informatik/sprachmodelle.html');
const html = fs.readFileSync(file, 'utf8');
const configs = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const blocks = configs.filter(config => config.id);
assert.equal(new Set(blocks.map(config => config.id)).size, blocks.length);
assert.equal([...html.matchAll(/<section data-wb-page=/g)].length, 11);
assert.ok(!/konsti/i.test(html));
for (const type of ['mcq', 'verify', 'cloze', 'categorize', 'trace', 'reveal', 'essay', 'order']) assert.ok(html.includes(`data-wb-type="${type}"`), type);
assert.equal([...html.matchAll(/data-p2-id=/g)].length, 2);
for (const config of blocks) {
  assert.ok(config.title && config.hint, config.id);
  if (config.rows) for (const row of config.rows) {
    assert.equal(row.cells.length, config.columns.length, config.id);
    for (const cell of row.cells) assert.ok('given' in cell || (Array.isArray(cell.answers) && cell.answers.length), config.id);
  }
}
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(https?:|#)/.test(match[1])) continue;
  assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), `Missing asset: ${match[1]}`);
}
assert.equal([...html.matchAll(/<img /g)].length, 7);
const webhooks = JSON.parse(fs.readFileSync(path.join(root, 'wb-webhooks.json'), 'utf8'));
assert.equal(webhooks.map['informatik/sprachmodelle.html'], webhooks.map['nwt/arduino-einstieg.html']);
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal([...index.matchAll(/href="informatik\/sprachmodelle.html"/g)].length, 3);
assert.ok(fs.readFileSync(path.join(root, 'informatik/kuenstliche-intelligenz3.htm'), 'utf8').includes('href="sprachmodelle.html"'));
const model = require('../informatik/sprachmodelle-modelle.js');
const table = model.counts();
assert.equal(Object.values(table).reduce((sum, row) => sum + Object.values(row).reduce((sum, count) => sum + count, 0), 0), 27);
assert.equal(Object.values(table).reduce((sum, row) => sum + Object.keys(row).length, 0), 23);
assert.equal(table['<s>']['löwenherz'], 3);
assert.equal(table.sein.schloss, 2);
assert.equal(table.schloss['</s>'], 2);
assert.equal(table.schloss.die, 1);
assert.equal(table.schloss.ist, 1);
const cases = [
  ['first', ['<s>', 'sein'], 'schloss </s>'],
  ['first', ['<s>', 'er'], 'verließ den garten </s>'],
  ['first', ['<s>'], 'löwenherz drehte den garten </s>'],
  ['last', ['<s>', 'sein'], 'schloss </s>'],
  ['last', ['<s>', 'er'], 'verließ sein schloss </s>'],
  ['last', ['<s>'], 'löwenherz verließ sein schloss </s>']
];
const generation = blocks.find(config => config.id === 'sm_generate_trace');
cases.forEach(([tie, start, expected], index) => {
  const result = model.greedy(table, start, tie);
  assert.equal(result.reason, 'end');
  assert.equal(result.words.slice(start.length).join(' '), expected);
  assert.equal(generation.rows[index].cells[2].answers[0], expected);
});
for (const [start, expected, reason] of [
  ['Ich', 'Ich bau dir ein Schloss öffnet sich .', 'end'],
  ['Ging', 'Ging nie durch San Francisco und ging', 'cycle'],
  ['Du', 'Du', 'unknown'],
  ['So', 'So soll es .', 'end'],
  ['Bleib', "Bleib allein zuhaus' , denn sein Weg führt geradeaus wie Applaus .", 'end']
]) {
  const result = model.greedy(model.transitions, [start]);
  assert.equal(result.words.join(' '), expected); assert.equal(result.reason, reason);
}
for (const [word, row] of Object.entries(model.transitions)) {
  const total = Object.values(row).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - (word === '.' ? 0 : word === 'Herz' ? 1.1 : 1)) < 1e-9, word);
}
const logits = [3, 2, 1, 0, -1];
for (const temperature of [0, .2, 1, 1.5, 2]) for (const strategy of ['all', 'topk', 'topp']) {
  const result = model.sampling(logits, temperature, strategy, 3, .9);
  assert.ok(Math.abs(result.base.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
  assert.ok(Math.abs(result.final.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
  assert.ok(result.final.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
}
assert.deepEqual(model.sampling(logits, 1, 'topk', 1).final, [1, 0, 0, 0, 0]);
assert.deepEqual(model.sampling(logits, 0).final, [1, 0, 0, 0, 0]);
assert.deepEqual(model.sampling([2, 2], 0).final, [1, 0]);
const topP = model.sampling(logits, 1, 'topp', 3, .9);
assert.deepEqual(topP.retained, [0, 1, 2]);
assert.ok(topP.base[0] + topP.base[1] < .9 && topP.base[0] + topP.base[1] + topP.base[2] >= .9);
assert.ok(model.sampling(logits, .2).base[0] > model.sampling(logits, 1.5).base[0]);
console.log(`Static checks: 11 pages, ${blocks.length} JSON blocks, 2 matching tasks, 7 images, all interaction types, links and NWT webhook. Löwenherz corpus, greedy generation and sampling checks passed.`);

async function browserCheck() {
  const { chromium } = require(path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
  const mime = { '.htm': 'text/html', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
  const server = http.createServer((req, res) => {
    const target = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', `${mime[path.extname(target)] || 'application/octet-stream'}; charset=utf-8`);
    fs.createReadStream(target).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [], posts = [];
  try {
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const setRange = async (selector, value) => page.locator(selector).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/powerautomate/**', async route => { posts.push(route.request().postData()); await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
      const url = `http://127.0.0.1:${server.address().port}/informatik/sprachmodelle.html`;
      await page.goto(url);
      await page.waitForFunction(() => document.getElementById('sm-sampling-status').textContent.includes('100,0'));
      assert.equal(await page.locator('[data-p2-mounted="1"]').count(), 2);
      assert.equal(await page.locator('.wb-block').count(), blocks.length + 2);
      assert.equal(await page.locator('section[data-wb-page]').count(), 12);
      assert.equal(await page.locator('section[data-wb-page="3"] h1').textContent(), 'Dein Trainingskorpus: Löwenherz und das Schloss');
      assert.equal(await page.locator('section[data-wb-page="3"] [data-sm-corpus-trace]').count(), 1);
      assert.equal(await page.locator('section[data-wb-page="3"] .wb-block[data-wb-type="trace"]').count(), 2);
      assert.equal(await page.locator('section[data-wb-page="4"] h1').textContent(), 'Eine zweite Übergangstabelle');
      assert.equal(await page.locator('section[data-wb-page="4"] [data-sm-problem-selects]').count(), 1);
      assert.equal(await page.locator('[data-sm-corpus-trace] tbody tr').count(), 23);
      assert.equal(await page.locator('[data-sm-corpus-trace] [data-wb-trace-field]').count(), 44);
      assert.equal(await page.locator('[data-sm-problem-selects] select').count(), 5);
      for (let n = 1; n <= 11; n++) {
        if (n > 1) { await page.locator('[data-wb-next]').click(); await page.waitForFunction(n => document.querySelector('[data-wb-pagenow]').textContent === String(n), n); }
        const section = page.locator(`section[data-wb-page="${n}"]`);
        const bad = await section.evaluate(section => [...section.querySelectorAll('img,input,select,button,.p2-piece')].filter(el => {
          const scroll = el.closest('.wb-trace-scroll,.ki-table-scroll,.sm-table-image');
          if (scroll) { const rect = scroll.getBoundingClientRect(); if (rect.left >= -1 && rect.right <= innerWidth + 1) return false; }
          const rect = el.getBoundingClientRect(); return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
        }).map(el => el.id || el.tagName));
        assert.deepEqual(bad, [], `Overflow at ${width}px page ${n}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page width ${width} page ${n}`);
        const broken = await section.locator('img').evaluateAll(images => images.filter(img => !img.complete || !img.naturalWidth).map(img => img.src));
        assert.deepEqual(broken, []);
        if (n === 6) {
          const sentences = section.locator('.sm-position-examples li');
          assert.deepEqual(await sentences.allTextContents(), ['„Julia hat nur die Aufgabe gelöst“', '„Nur Julia hat die Aufgabe gelöst“']);
          assert.deepEqual(await sentences.locator('strong').allTextContents(), ['nur', 'Nur']);
          assert.ok(await sentences.evaluateAll(items => items[1].getBoundingClientRect().top >= items[0].getBoundingClientRect().bottom));
          const diagram = section.locator('.sm-bank-diagram');
          const meanings = diagram.locator('.sm-bank-meaning');
          assert.deepEqual(await meanings.locator('h3').allTextContents(), ['Sitzgelegenheit', 'Geldinstitut']);
          const positions = await meanings.evaluateAll(items => items.map(item => {
            const rect = item.getBoundingClientRect();
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, background: getComputedStyle(item).backgroundColor };
          }));
          positions.forEach(item => assert.ok(item.left >= 0 && item.right <= width));
          assert.notEqual(positions[0].background, positions[1].background);
          if (width <= 640) assert.ok(positions[1].top >= positions[0].bottom);
          else assert.ok(positions[1].left >= positions[0].right);
          if ([1440, 390].includes(width)) {
            await diagram.scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(process.env.TEMP, `sprachmodelle-${width}-bank.png`) });
          }
        }
        if (n === 7) {
          const examples = section.locator('.sm-context-examples li');
          assert.equal(await examples.count(), 3);
          const appearance = await examples.evaluateAll(items => items.map(item => {
            const rect = item.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, background: getComputedStyle(item).backgroundColor };
          }));
          assert.equal(new Set(appearance.map(item => item.background)).size, 3);
          appearance.forEach((item, index) => {
            assert.ok(item.left >= 0 && item.right <= width);
            if (index) assert.ok(item.top >= appearance[index - 1].bottom);
          });
          if ([1440, 390].includes(width)) {
            await section.locator('h1').scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(process.env.TEMP, `sprachmodelle-${width}-context.png`) });
          }
        }
        for (const block of await section.locator('[data-wb-type="trace"]').all()) {
          await block.locator('[data-wb-trace-field]').evaluateAll(fields => fields.forEach(field => { field.value = JSON.parse(field.dataset.wbTraceAnswers)[0]; field.dispatchEvent(new Event('input', { bubbles: true })); }));
          await block.locator('.wb-trace-controls button').first().click();
          assert.equal(await block.locator('[data-wb-trace-field].is-wrong').count(), 0);
          assert.equal(await block.locator('[data-wb-trace-field].is-correct').count(), await block.locator('[data-wb-trace-field]').count());
        }
        if (n === 4) {
          const block = page.locator('[data-sm-problem-selects]');
          await block.locator('.wb-trace-controls button').nth(1).click();
          assert.deepEqual(await block.locator('select').evaluateAll(fields => fields.map(field => field.value)), ['', '', '', '', '']);
          for (let i = 0; i < 5; i++) {
            const input = block.locator('[data-wb-trace-column="1"]').nth(i);
            await input.fill(JSON.parse(await input.getAttribute('data-wb-trace-answers'))[0]);
            const answer = JSON.parse(await block.locator('[data-wb-trace-column="2"]').nth(i).getAttribute('data-wb-trace-answers'))[0];
            await block.locator('select').nth(i).selectOption(answer);
          }
          await block.locator('.wb-trace-controls button').first().click();
          assert.equal(await block.locator('select.is-correct').count(), 5);
          assert.match(await block.locator('.wb-trace-status').textContent(), /10 von 10/);
          if ([1440, 390].includes(width)) {
            await block.scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(process.env.TEMP, `sprachmodelle-${width}-transitions.png`) });
          }
        }
        if (n === 8 || n === 9) {
          const pairs = section.locator('[data-p2]');
          await pairs.evaluate(root => {
            [...root.querySelectorAll('[data-side="L"]')].forEach(left => {
              left.click(); root.querySelector(`[data-side="R"][data-pair="${left.dataset.pair}"]`).click();
            });
            root.querySelector('[data-check]').click();
          });
          assert.equal(await pairs.locator('.p2-bad').count(), 0);
          assert.equal(await pairs.locator('.p2-ok').count(), n === 8 ? 6 : 5);
        }
        if (n === 9) {
          const initial = Number.parseFloat((await page.locator('#sm-sampling-rows tr').first().locator('td').nth(2).textContent()).replace(',', '.'));
          await setRange('#sm-temperature', '.2');
          const cold = Number.parseFloat((await page.locator('#sm-sampling-rows tr').first().locator('td').nth(2).textContent()).replace(',', '.'));
          assert.ok(cold > initial);
          await setRange('#sm-temperature', '1.5');
          await page.locator('#sm-draw-batch').click();
          assert.match(await page.locator('#sm-draw-output').textContent(), /100 Ziehung/);
          await page.locator('[data-sm-snapshot]').click();
          await setRange('#sm-temperature', '1');
          await page.locator('#sm-strategy').selectOption('topp');
          assert.equal(await page.locator('.sm-bar-row.excluded').count(), 2);
          assert.ok(await page.locator('#sm-topk').isDisabled());
          assert.ok(await page.locator('#sm-topp').isEnabled());
          await page.locator('#sm-strategy').selectOption('topk');
          await page.locator('#sm-topk').fill('1'); await page.locator('#sm-topk').dispatchEvent('change');
          assert.equal(await page.locator('.sm-bar-row.excluded').count(), 4);
          await page.locator('#sm-draw-batch').click();
          assert.deepEqual(await page.locator('#sm-sampling-rows td:nth-child(5)').allTextContents(), ['100', '0', '0', '0', '0']);
          await page.locator('[data-sm-snapshot]').click();
          assert.match(await section.locator('[data-wb-type="essay"] textarea').inputValue(), /Top-K = 1/);
          await page.locator('#sm-sampling-reset').click();
          await setRange('#sm-temperature', '0');
          assert.deepEqual(await page.locator('#sm-sampling-rows td:nth-child(4)').allTextContents(), ['100,0 %', '0,0 %', '0,0 %', '0,0 %', '0,0 %']);
          await page.locator('#sm-sampling-reset').click();
          assert.equal(await page.locator('#sm-bars .sm-bar-row').count(), 5);
          assert.ok(await page.locator('.sm-bar-fill').first().evaluate(el => el.getBoundingClientRect().width > 10));
          assert.equal(await page.locator('.ki-tool svg').count(), 4);
          if ([1440, 390].includes(width)) {
            await page.locator('#sm-sampling-lab').scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(process.env.TEMP, `sprachmodelle-${width}-sampling.png`) });
          }
        }
      }
      await page.reload();
      await page.waitForFunction(() => document.getElementById('sm-sampling-status').textContent.includes('100,0'));
      assert.equal(await page.locator('[data-sm-problem-selects] select').first().inputValue(), 'Fehlender Kontext');
      assert.equal(await page.locator('[data-sm-corpus-trace] [data-wb-trace-field]').first().inputValue(), 'er');
      assert.match(await page.locator('section[data-wb-page="9"] [data-wb-type="essay"] textarea').inputValue(), /Top-K = 1/);
      await page.locator('[data-wb-student-name]').evaluate(input => { input.value = 'Browserprüfung'; input.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.locator('.wb-submit-btn').evaluate(button => button.click());
      await page.waitForFunction(() => document.querySelector('[data-wb-pagenow]').textContent === '12');
      const results = await page.locator('[data-wb-results]').textContent();
      assert.ok(results.includes('Top-K = 1'), 'Results include saved sampling settings');
      assert.ok(results.includes('Fülle die vollständige Bigramm-Tabelle'), 'Results include corpus task');
      await page.waitForSelector('.wb-results-webhook-status.is-success');
      const report = JSON.parse(posts[posts.length - 1]).message;
      assert.ok(report.includes('Fehlender Kontext') && report.includes('Häufigkeit') && report.includes('Top-K = 1'), 'Export includes dropdown, corpus and sampling answers');
      await page.close(); console.log(`Browser ${width}px: navigation, 7 images, layout, trace grading, dropdowns, both matching tasks, sampling, persistence and results passed.`);
    }
    assert.deepEqual(errors, []);
    assert.ok(posts.length > 0 && posts.some(post => post && post.includes('Top-K = 1')), 'Mock webhook receives saved experiment');
    const local = await browser.newPage();
    await local.goto(require('node:url').pathToFileURL(file).href);
    await local.waitForFunction(() => document.getElementById('sm-sampling-status').textContent.includes('100,0'));
    assert.equal(await local.locator('.wb-block').count(), blocks.length + 2);
    await local.close();
    console.log('Direct local HTML opening passed. Webhook tested with mock; no real submission sent.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (process.argv.includes('--browser')) browserCheck().catch(error => { console.error(error); process.exitCode = 1; });
