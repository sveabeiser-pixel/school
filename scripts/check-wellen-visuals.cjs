const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-wellen-visuals');
const baseline = process.argv.includes('--baseline');
const groups = { 4: ['huygens-diffraction'], 6: ['fixed-pulse-reflection', 'loose-pulse-reflection', 'thin-dense-transition', 'dense-thin-transition', 'build-standing', 'standing-modes', 'loose-reflection', 'fixed-reflection'], 8: ['double-slit-particles', 'single-slit', 'double-slit-envelope', 'grating-phasor', 'grating'] };

async function checkOpticalValues(page) {
  await page.locator('.wb-page-list [data-wb-page="8"]').evaluate(n => n.click());
  for (const [type, prefix] of [['single-slit', 'es'], ['double-slit-envelope', 'ds'], ['grating', 'gt']]) {
    const sim = page.locator(`[data-wave-sim="${type}"]`);
    const result = await sim.evaluate((node, prefix) => {
      const read = id => Number(node.querySelector(`[id="${id}"]`).value);
      const theta = read(prefix + 'ThetaDeg') * Math.PI / 180;
      const wavelength = read(prefix + 'LamNm') * 1e-9;
      const width = prefix === 'es' ? read('esLMm') * 1e-3 : prefix === 'ds' ? read('dsbMm') * 1e-3 : read('gtBUm') * 1e-6;
      const beta = Math.PI * width * Math.sin(theta) / wavelength;
      let expected = Math.abs(beta) < 1e-10 ? 1 : (Math.sin(beta) / beta) ** 2;
      if (prefix === 'ds') expected *= Math.cos(Math.PI * read('dsgMm') * 1e-3 * Math.sin(theta) / wavelength) ** 2;
      if (prefix === 'gt') {
        const delta = Math.PI * read('gtGUm') * 1e-6 * Math.sin(theta) / wavelength;
        const count = read('gtN');
        expected *= Math.abs(Math.sin(delta)) < 1e-8 ? 1 : (Math.sin(count * delta) / (count * Math.sin(delta))) ** 2;
      }
      const reported = Number(node.querySelector('[data-role="readout"]').textContent.match(/I\(alpha\)\/I0 ≈ ([\d.]+)/)[1]);
      return { expected, reported };
    }, prefix);
    assert(Math.abs(result.expected - result.reported) < 0.000051, `${type}: incorrect intensity`);
  }
  const phasor = page.locator('[data-wave-sim="grating-phasor"]');
  for (const u of [0, 1 / 3, 1]) {
    await phasor.locator('#phU').evaluate((n, value) => { n.value = value; n.dispatchEvent(new Event('input', { bubbles: true })); }, u);
    const { reported, expected } = await phasor.evaluate(node => {
      const n = Number(node.querySelector('#phN').value), u = Number(node.querySelector('#phU').value);
      let x = 0, y = 0;
      for (let i = 0; i < n; i++) { x += Math.cos(i * 2 * Math.PI * u); y += Math.sin(i * 2 * Math.PI * u); }
      return { expected: (x * x + y * y) / (n * n), reported: Number(node.querySelector('[data-role="readout"]').textContent.match(/I\/Imax = ([\d.]+)/)[1]) };
    });
    assert(Math.abs(expected - reported) < 0.000051, 'Phasor intensity must equal squared vector sum');
  }
  await phasor.locator('#phU').evaluate(n => { n.value = n.defaultValue; n.dispatchEvent(new Event('input', { bubbles: true })); });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const snapshot = {};
  try {
    await page.goto(pathToFileURL(path.join(root, 'wellen/wellen-simulationen.html')).href, { waitUntil: 'domcontentloaded' });
    await checkOpticalValues(page);
    if (process.argv.includes('--models')) { console.log('Optical intensities and phasor sums verified.'); return; }
    for (const [number, types] of Object.entries(groups)) {
      await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(node => node.click());
      for (const type of types) {
        const sim = page.locator(`[data-wave-sim="${type}"]`);
        await sim.scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        const readout = sim.locator('[data-role="readout"]');
        assert((await readout.textContent()).trim(), `${type}: empty readout`);
        snapshot[type] = await sim.locator('input, select, button').evaluateAll(nodes => nodes.map(n => ({ id: n.id, tag: n.tagName, type: n.type, min: n.min, max: n.max, step: n.step, value: n.value, options: n.options ? [...n.options].map(o => o.value) : undefined })));
        assert.equal(await sim.locator('canvas').evaluateAll(nodes => nodes.every(n => {
          const p = n.getContext('2d').getImageData(0, 0, n.width, n.height).data;
          let colored = 0;
          for (let i = 0; i < p.length; i += 16) if (p[i + 3] && Math.min(p[i], p[i + 1], p[i + 2]) < 180) colored++;
          return colored > 30;
        })), true, `${type}: blank canvas`);
        await sim.screenshot({ path: path.join(output, `${baseline ? 'before' : 'after'}-${type}.png`), style: '.wb-topbar { visibility: hidden !important; }' });
        if (!baseline) {
          for (const input of await sim.locator('input[type="range"]').all()) {
            for (const limit of ['min', 'max']) {
              await input.evaluate((n, which) => { n.value = n[which]; n.dispatchEvent(new Event('input', { bubbles: true })); }, limit);
              await page.waitForTimeout(30);
              assert(!/NaN|Infinity/.test(await readout.textContent()), `${type}: invalid output at ${limit}`);
            }
            await input.evaluate(n => { n.value = n.defaultValue; n.dispatchEvent(new Event('input', { bubbles: true })); });
          }
          for (const select of await sim.locator('select').all()) {
            const original = await select.inputValue();
            for (const value of await select.locator('option').evaluateAll(nodes => nodes.map(n => n.value))) await select.selectOption(value);
            await select.selectOption(original);
          }
          const start = sim.locator('[data-role="start"]');
          if (await start.count()) {
            const first = await sim.locator('canvas').first().evaluate(n => n.toDataURL());
            await start.evaluate(n => n.click());
            await page.waitForTimeout(type.includes('pulse') || type.includes('transition') ? 800 : 300);
            const next = await sim.locator('canvas').first().evaluate(n => n.toDataURL());
            assert.notEqual(first, next, `${type}: animation did not move`);
            await start.evaluate(n => n.click());
          }
          const reset = sim.locator('[data-role="reset"]');
          if (await reset.count()) await reset.evaluate(n => n.click());
        }
      }
    }
    if (baseline) fs.writeFileSync(path.join(output, 'controls-before.json'), JSON.stringify(snapshot, null, 2));
    else {
      const referenceFile = path.join(output, 'controls-before.json');
      const reference = fs.existsSync(referenceFile) ? JSON.parse(fs.readFileSync(referenceFile, 'utf8')) : await page.evaluate(({ html, types }) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return Object.fromEntries(types.map(type => [type, [...doc.querySelector(`[data-wave-sim="${type}"]`).querySelectorAll('input, select, button')].map(n => ({ id: n.id, tag: n.tagName, type: n.type, min: n.min, max: n.max, step: n.step, value: n.value, options: n.options ? [...n.options].map(o => o.value) : undefined }))]));
      }, { html: fs.readFileSync(path.join(root, 'wellen/wellen-simulationen.html'), 'utf8'), types: Object.values(groups).flat() });
      assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), JSON.parse(JSON.stringify(reference)), 'Control contracts changed');
      for (const width of [820, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const [number, types] of Object.entries(groups)) {
          await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(node => node.click());
          for (const type of types) {
            const sim = page.locator(`[data-wave-sim="${type}"]`);
            await sim.scrollIntoViewIfNeeded();
            await sim.screenshot({ path: path.join(output, `${width}-${type}.png`), style: '.wb-topbar { visibility: hidden !important; }' });
            assert(await sim.evaluate(n => n.scrollWidth <= n.clientWidth + 2), `${width}px: ${type} horizontal overflow`);
            assert(await sim.locator('canvas').evaluateAll(nodes => nodes.every(n => Math.abs(n.getBoundingClientRect().width / n.getBoundingClientRect().height - n.width / n.height) < 0.025)), `${type}: distorted canvas`);
          }
        }
        assert(await page.locator('.wb-topbar').evaluate(n => n.scrollWidth <= n.clientWidth + 2), `${width}px: toolbar overflow`);
      }
      await page.setViewportSize({ width: 1440, height: 1100 });
      for (const theme of ['dark', 'dark-blue']) {
        await page.locator('.wb-theme-select').selectOption(theme);
        for (const number of ['4', '6', '8']) {
          await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(n => n.click());
          const sim = page.locator(`[data-wave-sim="${groups[number][0]}"]`);
          await sim.screenshot({ path: path.join(output, `${theme}-${groups[number][0]}.png`), style: '.wb-topbar { visibility: hidden !important; }' });
          assert(await sim.locator('[data-role="readout"]').isVisible());
          assert(await sim.locator('h2, p, .wb-soft-callout strong, .wb-soft-callout li').evaluateAll(nodes => nodes.every(n => {
            const rgb = getComputedStyle(n).color.match(/[\d.]+/g).slice(0, 3).map(Number);
            return rgb.reduce((sum, channel) => sum + channel, 0) / 3 > 130;
          })), `${theme}: dark text in simulation`);
        }
      }
      const solution = await browser.newPage();
      await solution.goto(pathToFileURL(path.join(root, 'wellen/wellen-simulationen-balkon82.html')).href);
      for (const width of [1440, 390, 320]) {
        await solution.setViewportSize({ width, height: 1000 });
        for (const theme of ['default', 'dark', 'dark-blue']) {
          await solution.locator('.wb-theme-select').selectOption(theme);
          for (const number of Object.keys(groups)) {
            await solution.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(n => n.click());
            assert(await solution.locator('.wb-theme-select').isVisible());
            assert.equal(await solution.locator('input:visible, textarea:visible, .wb-submit-btn:visible').count(), 0);
          }
        }
      }
      await solution.close();
    }
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(`${baseline ? 'Baseline' : 'Verified'}: ${Object.values(groups).flat().length} simulations; screenshots: ${output}`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
