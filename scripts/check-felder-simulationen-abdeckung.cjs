const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-induktionslabor-check');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const sources = fs.readdirSync(path.join(root, 'felder')).filter(file => file.endsWith('.html')).map(file => ({ file, html: fs.readFileSync(path.join(root, 'felder', file), 'utf8') }));
    const coverage = await page.evaluate(sources => {
      const rows = sources.map(source => {
        const doc = new DOMParser().parseFromString(source.html, 'text/html');
        return { file: source.file, solution: !!doc.querySelector('meta[name="musterloesung-source"]'), simulations: [...doc.querySelectorAll('[data-field-sim]')].map(node => ({ type: node.dataset.fieldSim, page: node.closest('[data-wb-page]')?.dataset.wbPage })) };
      });
      const types = [...new Set(rows.find(row => row.file === 'felder-simulationen.html').simulations.map(sim => sim.type))];
      const lessons = rows.filter(row => !row.solution && row.file !== 'felder-simulationen.html');
      return types.map(type => ({ type, lessons: lessons.flatMap(lesson => lesson.simulations.filter(sim => sim.type === type).map(sim => ({ file: lesson.file, page: sim.page }))) }));
    }, sources);
    assert.equal(coverage.length, 9);
    assert.deepEqual(coverage.filter(row => !row.lessons.length), [], 'Missing simulation in field lessons');
    const markupModes = await page.evaluate(sources => {
      const modes = file => [...new DOMParser().parseFromString(sources.find(s => s.file === file).html, 'text/html').querySelectorAll('[data-field-sim="induction-lab"] [data-role="mode"] option')].map(n => n.value);
      return { overview: modes('felder-simulationen.html'), lesson: modes('induktion.html') };
    }, sources);
    assert.deepEqual(markupModes.lesson, markupModes.overview);

    await page.goto(pathToFileURL(path.join(root, 'felder/induktion.html')).href, { waitUntil: 'domcontentloaded' });
    await page.locator('.wb-page-list [data-wb-page="6"]').evaluate(node => node.click());
    assert.equal(await page.locator('.wb-page-list [data-wb-page="6"] .wb-nav-sim-badge').count(), 1);
    const lab = page.locator('[data-field-sim="induction-lab"]');
    assert.equal(await lab.getAttribute('data-field-induction-mounted'), '1');
    const values = async () => {
      const readout = await lab.locator('[data-role="readout"]').innerText();
      const number = pattern => Number(readout.match(pattern)[1].replace(',', '.'));
      return { phi: number(/A⊥ = ([-\d,.]+) mWb/), voltage: number(/dΦ\/dt = ([-\d,.]+) mV/) };
    };
    const results = [];
    for (const mode of markupModes.lesson) {
      await lab.locator('[data-role="reset"]').click();
      await lab.locator('[data-role="mode"]').selectOption(mode);
      const before = await lab.locator('canvas').evaluate(canvas => canvas.toDataURL());
      await lab.locator('[data-role="play"]').click();
      await page.waitForTimeout(mode === 'translate' ? 2400 : 650);
      await lab.locator('[data-role="play"]').click();
      assert.equal(await lab.locator('[data-role="play"]').innerText(), 'Start');
      const after = await lab.locator('canvas').evaluate(canvas => canvas.toDataURL());
      assert.notEqual(after, before, `${mode}: canvas does not move`);
      const original = await values();
      assert.ok(Math.abs(original.voltage) > .01, `${mode}: no induced voltage during change`);
      await lab.locator('[data-role="turns"]').fill('40');
      await lab.locator('[data-role="turns"]').dispatchEvent('input');
      const doubled = await values();
      assert.ok(Math.abs(doubled.voltage - 2 * original.voltage) < .003, `${mode}: turns factor`);
      assert.equal(doubled.phi, original.phi);
      await lab.locator('[data-role="direction"]').selectOption('in');
      const reversed = await values();
      assert.ok(Math.abs(reversed.voltage + doubled.voltage) < .002, `${mode}: voltage sign`);
      assert.ok(Math.abs(reversed.phi + doubled.phi) < .0002, `${mode}: flux sign`);
      results.push({ mode, original, doubled, reversed });
    }
    await lab.locator('[data-role="reset"]').click();
    const fields = page.locator('section[data-wb-page="6"] textarea');
    assert.equal(await fields.count(), 4);
    await fields.first().fill('Beobachtung: Die Spannung ist bei konstantem Fluss null.');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.wb-page-list [data-wb-page="6"]').evaluate(node => node.click());
    assert.match(await fields.first().inputValue(), /konstantem Fluss/);

    for (const width of [1440, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['default', 'dark', 'dark-blue']) {
        await page.locator('.wb-theme-select').selectOption(theme, { force: true });
        const issues = await lab.evaluate(lab => [...lab.querySelectorAll('canvas,input,select,button,[data-role="readout"]')].flatMap(node => {
          const rect = node.getBoundingClientRect(), parent = lab.getBoundingClientRect();
          return rect.left < parent.left - 1 || rect.right > parent.right + 1 || rect.right > innerWidth + 1 ? [node.outerHTML.slice(0, 100)] : [];
        }));
        assert.deepEqual(issues, [], `${width}px ${theme}`);
        await lab.locator('canvas').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `induktionslabor-${width}-${theme}.png`) });
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ coverage, results, errors }, null, 2));
    console.log(JSON.stringify({ coverage, modesTested: results.length, errors }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
