const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const screenshots = path.join(process.env.TEMP, 'school-kondensator-check');
const initial = { C: 4.427e-12, Q: 8.854e-9, U: 2000, W: 8.854e-6, E: 50000 };

function near(actual, expected, label) {
  assert(Math.abs(actual - expected) <= Math.max(1e-22, Math.abs(expected) * 1e-10), `${label}: ${actual} statt ${expected}`);
}

async function main() {
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const [file, number] of [['felder/elektrische-felder2.html', '4'], ['felder/felder-simulationen.html', '1']]) {
      await page.goto(pathToFileURL(path.join(root, file)).href, { waitUntil: 'domcontentloaded' });
      await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(node => node.click());
      const sim = page.locator('[data-field-sim="capacitor"]');
      const control = role => sim.locator(`[data-role="${role}"]`);
      const set = (role, value) => control(role).evaluate((node, next) => {
        node.value = String(next);
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
      const read = () => sim.evaluate(node => {
        const value = role => Number(node.querySelector(`[data-role="${role}"]`).dataset.siValue);
        return { C: value('capacitance-output'), Q: value('charge-output'), U: value('capacitor-voltage-output'), W: value('energy-output'), E: value('field-output') };
      });
      const check = async expected => {
        const actual = await read();
        for (const [key, value] of Object.entries(expected)) near(actual[key], value, `${file}: ${key}`);
        // Two independent energy formulas must agree in every tested state.
        near(actual.W, actual.Q * actual.U / 2, 'W = QU/2');
        near(actual.W, actual.Q * actual.Q / (2 * actual.C), 'W = Q²/(2C)');
      };
      const reset = () => control('reset').click();
      const toggle = () => control('source-toggle').click();

      await check(initial);
      await set('distance', 8);
      await check({ C: initial.C / 2, Q: initial.Q / 2, U: initial.U, W: initial.W / 2, E: initial.E / 2 });
      await reset();
      await toggle();
      assert(await control('voltage').isDisabled());
      await check(initial); // Opening the source must not change charge or energy.
      await set('distance', 8);
      await check({ C: initial.C / 2, Q: initial.Q, U: initial.U * 2, W: initial.W * 2, E: initial.E });
      assert.equal(await control('voltage-value').textContent(), '2,0'); // Source setting differs from capacitor U.
      assert.equal(await control('source-toggle').getAttribute('aria-pressed'), 'false');
      await toggle();
      await check({ Q: initial.Q / 2, U: initial.U, W: initial.W / 2 });
      assert(await control('voltage').isEnabled());

      await reset();
      await set('area', 400);
      await check({ C: initial.C * 2, Q: initial.Q * 2, U: initial.U, W: initial.W * 2, E: initial.E });
      await reset();
      await toggle();
      await set('area', 400);
      await check({ C: initial.C * 2, Q: initial.Q, U: initial.U / 2, W: initial.W / 2, E: initial.E / 2 });
      await reset();
      await set('epsilon', 2);
      await check({ C: initial.C * 2, Q: initial.Q * 2, W: initial.W * 2, E: initial.E });
      await reset();
      await toggle();
      await set('epsilon', 2);
      await check({ C: initial.C * 2, Q: initial.Q, U: initial.U / 2, W: initial.W / 2 });

      // Repeated detach/reattach uses the most recently supplied charge.
      await reset();
      await set('voltage', 3);
      await control('source-connected').uncheck();
      await set('distance', 10);
      await set('area', 50);
      await set('epsilon', 8);
      await check({ Q: initial.Q * 1.5 });
      await control('source-connected').check();
      await check({ U: 3000 });
      await control('source-connected').uncheck();
      const remembered = await read();
      await set('area', 400);
      await check({ Q: remembered.Q });

      await reset();
      await set('voltage', 0);
      await check({ C: initial.C, Q: 0, U: 0, W: 0, E: 0 });
      await toggle();
      await set('distance', 10);
      await set('area', 400);
      await check({ Q: 0, U: 0, W: 0, E: 0 });
      await reset();

      // Controls remain usable by label and keyboard, without pointer gestures.
      const distance = control('distance');
      assert(await distance.evaluate(node => node.labels.length > 0));
      await distance.focus();
      await distance.press('ArrowRight');
      near(Number(await distance.inputValue()), 4.2, 'Abstandsregler per Tastatur');
      await reset();

      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1100 });
        for (const theme of ['default', 'dark', 'dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme, { force: true });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${file}: Überlauf ${width}/${theme}`);
          for (const role of ['capacitance-output', 'charge-output', 'energy-output', 'source-toggle']) {
            assert(await control(role).isVisible());
            const rect = await control(role).boundingBox();
            assert(rect.x >= -1 && rect.x + rect.width <= width + 1, `${role} außerhalb des Bildschirms`);
          }
        }
        if (file.includes('elektrische-felder2')) {
          await control('canvas').screenshot({ path: path.join(screenshots, `kondensator-${width}.png`) });
          await sim.locator('.capacitor-meters').screenshot({ path: path.join(screenshots, `messwerte-${width}.png`) });
        }
      }
      console.log(`${file}: Physik, Schalten, Nullspannung, Tastatur und 9 Ansichten geprüft.`);
    }

    for (const file of ['felder/elektrische-felder2-regenschirm28.html', 'felder/felder-simulationen-hausschuh19.html']) {
      await page.goto(pathToFileURL(path.join(root, file)).href, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('input:visible,textarea:visible,.wb-submit-btn:visible').count(), 0);
      if (file.includes('regenschirm')) assert.equal(await page.locator('[data-solution="ef2_essay_kondensatorlabor"]').count(), 1);
    }
    assert.deepEqual(errors, []);
    console.log(`Keine JavaScript-Fehler. Screenshots: ${screenshots}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
