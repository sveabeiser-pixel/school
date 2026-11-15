const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'informatik/kuenstliche-intelligenz2.html');
const solution = path.join(root, 'informatik/kuenstliche-intelligenz2-pergament87.html');
const base = 'https://github.com/sveabeiser-pixel/school/releases/download/trainingsdaten-v1/';
const downloads = [
  ['train_cats.zip', '26,2 MB'], ['train_dogs.zip', '26,3 MB'],
  ['test_cats.zip', '6,2 MB'], ['test_dogs.zip', '8,8 MB']
];
const html = fs.readFileSync(source, 'utf8');
assert.equal([...html.matchAll(/data-ki2-download=/g)].length, 4);
for (const [name, size] of downloads) {
  assert.ok(html.includes(`href="${base + name}" data-ki2-download="${name}"`), name);
  assert.ok(html.includes(size), size);
  assert.ok(fs.readFileSync(solution, 'utf8').includes(name), `Solution: ${name}`);
}
for (const config of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(config[1]);
console.log('Four release downloads, rounded sizes, matching solution and JSON configurations checked.');

async function browserCheck() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [];
  const screenshots = path.join(process.env.TEMP, 'school-ki2-download-check');
  fs.mkdirSync(screenshots, { recursive: true });
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      let archiveRequests = 0;
      await page.route('https://**/*', route => {
        if (route.request().url().startsWith(base)) archiveRequests++;
        return route.abort();
      });
      for (const file of [source, solution]) {
        await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
        await page.waitForSelector('.wb-book');
        const isSolution = file === solution;
        for (const theme of ['default', 'dark', 'dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme);
          await page.locator('.wb-page-list [data-wb-page="6"]').evaluate(node => node.click());
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: page overflow`);
          if (isSolution) {
            assert.equal(await page.locator('input:visible,textarea:visible,.wb-submit-btn:visible').count(), 0);
            assert.match(await page.locator('[data-solution="ki2_versuch_essay"]').textContent(), /trainingsdaten-v1/);
          } else {
            for (const [name] of downloads) {
              const link = page.locator(`[data-ki2-download="${name}"]`);
              assert.ok(await link.isVisible());
              assert.equal(await link.getAttribute('href'), base + name);
              const rect = await link.boundingBox();
              assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, `${width}: ${name}`);
            }
            assert.equal(archiveRequests, 0, 'ZIP archives must not load automatically');
            await page.locator('[data-ki2-downloads]').scrollIntoViewIfNeeded();
          }
          await page.screenshot({ path: path.join(screenshots, `${isSolution ? 'solution' : 'downloads'}-${width}-${theme}.png`) });
        }
      }
      await context.close();
      console.log(`${width}px: downloads, solution, navigation and three color schemes passed.`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
if (process.argv.includes('--browser')) browserCheck().catch(error => { console.error(error); process.exitCode = 1; });
