const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'informatik/kuenstliche-intelligenz3.htm');
const html = fs.readFileSync(file, 'utf8');
const configs = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const ids = configs.filter(c => c.id).map(c => c.id);
assert.equal(new Set(ids).size, ids.length);
assert.equal([...html.matchAll(/<section data-wb-page=/g)].length, 10);
for (const type of ['mcq', 'verify', 'cloze', 'categorize', 'trace', 'reveal', 'essay', 'order']) assert.ok(html.includes(`data-wb-type="${type}"`), type);
assert.ok(html.includes('data-p2'));
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(https?:|#)/.test(match[1])) continue;
  assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), `Missing asset: ${match[1]}`);
}
assert.equal([...html.matchAll(/<img /g)].length, 11);
const webhooks = JSON.parse(fs.readFileSync(path.join(root, 'wb-webhooks.json'), 'utf8'));
assert.equal(webhooks.map['informatik/kuenstliche-intelligenz3.htm'], webhooks.map['informatik/kuenstliche-intelligenz2.html']);
const context = { window: {}, console, Math, Float64Array, Uint8Array, Uint32Array, ArrayBuffer, setTimeout, clearTimeout };
vm.runInNewContext(fs.readFileSync(path.join(root, 'informatik/vendor/ki3-libraries.bundle.js'), 'utf8'), context);
const { KNN, kmeansGenerator, TDSolver } = context.window.KI3Libraries;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const knn = new KNN([[3.3, 6.7], [3.2, 7]], [0, 1], { k: 1, distance });
assert.equal(knn.predict([3.4, 6.5]), 0);
assert.ok(Math.abs(distance([3.4, 6.5], [3.3, 6.7]) - Math.sqrt(.05)) < 1e-9);
const data = [[0, 0], [1, 1], [2, 0], [8, 8], [9, 9], [10, 8]];
let lastCost = Infinity;
for (const result of kmeansGenerator(data, 2, { initialization: [[0, 0], [10, 10]] })) {
  const cost = data.reduce((sum, p, i) => sum + distance(p, result.centroids[result.clusters[i]]) ** 2, 0);
  assert.ok(cost <= lastCost + 1e-9); lastCost = cost;
}
const config = { alpha: .5, epsilon: .25, gamma: .9, update: 'qlearn', smoothPolicyUpdate: false, beta: .01, lambda: 0, replacingTraces: true, qInitVal: 0, numberOfPlanningSteps: 0 };
const agent = new TDSolver({ get: key => ({ numberOfStates: 2, numerOfActions: 1 })[key], allowedActions: state => state === 1 ? [] : [0] }, { get: key => config[key] });
agent.Q[0] = 2; agent.learnFromTuple(0, 0, 10, 1, 0, 0); assert.equal(agent.Q[0], 6);
assert.ok([...agent.Q].every(Number.isFinite));
console.log(`Static checks: 10 pages, ${configs.length - 1} JSON blocks, 11 images, all interaction types, NWT webhook. Library checks passed.`);

async function browserCheck() {
  const { chromium } = require(path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
  const mime = { '.htm': 'text/html', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
  const server = http.createServer((req, res) => {
    const target = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) { res.writeHead(404); res.end(); return; }
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
      await page.goto(`http://127.0.0.1:${server.address().port}/informatik/kuenstliche-intelligenz3.htm`);
      await page.waitForFunction(() => document.getElementById('knn-result').textContent.includes('Vorhersage'));
      assert.equal(await page.locator('[data-p2-mounted="1"]').count(), 1);
      assert.equal(await page.locator('.wb-block').count(), 24);
      assert.equal(await page.locator('section[data-wb-page]').count(), 11);
      for (let n = 1; n <= 10; n++) {
        if (n > 1) { await page.locator('[data-wb-next]').click(); await page.waitForFunction(n => document.querySelector('[data-wb-pagenow]').textContent === String(n), n); }
        const bad = await page.locator(`section[data-wb-page="${n}"]`).evaluate(section => [...section.querySelectorAll('img,canvas,input,select,button')].filter(el => {
          const scroll = el.closest('.wb-trace-scroll,.ki-table-scroll');
          if (scroll) { const r = scroll.getBoundingClientRect(); if (r.left >= -1 && r.right <= innerWidth + 1) return false; }
          const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        }).map(el => el.id || el.tagName));
        assert.deepEqual(bad, [], `Overflow at ${width}px page ${n}`);
        const broken = await page.locator(`section[data-wb-page="${n}"] img`).evaluateAll(images => images.filter(img => !img.complete || !img.naturalWidth).map(img => img.src));
        assert.deepEqual(broken, []);
        if ([2, 4, 7, 9].includes(n)) {
          const block = page.locator(`section[data-wb-page="${n}"] [data-wb-type="trace"]`);
          await block.locator('[data-wb-trace-field]').evaluateAll(fields => fields.forEach(field => { field.value = JSON.parse(field.dataset.wbTraceAnswers)[0]; field.dispatchEvent(new Event('input', { bubbles: true })); }));
          await block.locator('.wb-trace-controls button').first().click();
          assert.equal(await block.locator('.wb-trace-input.is-wrong').count(), 0);
          assert.equal(await block.locator('.wb-trace-input.is-correct').count(), await block.locator('[data-wb-trace-field]').count());
        }
        if (n === 3) {
          await setRange('#knn-k', '11');
          assert.equal(await page.locator('#knn-neighbors tr').count(), 11);
          await page.locator('#knn-data').selectOption('outlier');
          await setRange('#knn-k', '1');
          assert.match(await page.locator('#knn-result').textContent(), /Blau/);
          await setRange('#knn-k', '11');
          assert.match(await page.locator('#knn-result').textContent(), /Orange/);
          await page.locator('[data-snapshot="knn"]').click();
          assert.match(await page.locator('section[data-wb-page="3"] textarea').inputValue(), /k-NN: k=11/);
        }
        if (n === 8) {
          const initial = await page.locator('#km-cost').textContent();
          await page.locator('#km-play').click(); await page.waitForTimeout(700);
          assert.notEqual(await page.locator('#km-iteration').textContent(), '0');
          await page.locator('#km-play').click();
          for (let i = 0; i < 20; i++) { if (await page.locator('#km-step').isDisabled()) break; await page.locator('#km-step').click(); }
          assert.ok(await page.locator('#km-step').isDisabled());
          assert.notEqual(await page.locator('#km-cost').textContent(), initial);
          await page.locator('[data-snapshot="kmeans"]').click();
        }
        if (n === 9) {
          await page.locator('#rl-play').click(); await page.waitForTimeout(250);
          await page.locator('#rl-play').click();
          assert.match(await page.locator('#rl-status').textContent(), /Schritt/);
          for (let i = 0; i < 3; i++) await page.locator('#rl-batch').click();
          assert.equal(await page.locator('#rl-episodes').textContent(), '300');
          const values = await page.locator('#rl-q td:nth-child(2)').allTextContents();
          assert.ok(values.some(v => Number(v.replace(',', '.')) !== 0));
          await page.locator('#rl-learn').uncheck();
          await setRange('#rl-epsilon', '0');
          for (let i = 0; i < 20; i++) await page.locator('#rl-step').click();
          assert.deepEqual(await page.locator('#rl-q td:nth-child(2)').allTextContents(), values);
          await page.locator('[data-snapshot="rl"]').click();
        }
        if ([3, 8, 9].includes(n) && [1440, 390].includes(width)) {
          const canvas = page.locator(`section[data-wb-page="${n}"] canvas`);
          const filled = await canvas.evaluate(c => { const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let count = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 220) count++; return count; });
          assert.ok(filled > 3000, `Blank canvas page ${n}: ${filled} colored pixels`);
          await canvas.scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(process.env.TEMP, `ki3-${width}-page${n}.png`) });
        }
      }
      await page.locator('[data-wb-student-name]').evaluate(input => { input.value = 'Browserprüfung'; input.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.locator('.wb-submit-btn').evaluate(button => button.click());
      await page.waitForFunction(() => document.querySelector('[data-wb-pagenow]').textContent === '11');
      const results = await page.locator('[data-wb-results]').textContent();
      assert.ok(results.includes('k-NN: k=11') && results.includes('k-Means:') && results.includes('Q-Learning:'));
      await page.close(); console.log(`Browser ${width}px: navigation, images, layout, 3 simulations and saved results passed.`);
    }
    assert.deepEqual(errors, []);
    assert.ok(posts.length > 0, 'Mocked webhook must receive results');
    assert.ok(posts.some(post => post && post.includes('k-NN: k=11')));
    const local = await browser.newPage();
    await local.goto(require('node:url').pathToFileURL(file).href);
    await local.waitForFunction(() => document.getElementById('knn-result').textContent.includes('Vorhersage'));
    assert.equal(await local.locator('.wb-block').count(), 24);
    await local.close();
    console.log('Direct local HTML opening passed.');
    console.log('Mocked webhook passed; no real submission sent.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (process.argv.includes('--browser')) browserCheck().catch(error => { console.error(error); process.exitCode = 1; });
