const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-simulation-navigation');
const ignored = new Set(['.git', '.codex', '.agents', 'assets', 'public', 'legacy_dont_read', 'node_modules']);
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : htmlFiles(file);
    return /\.html$/.test(entry.name) ? [file] : [];
  });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  let current = '';
  page.on('pageerror', error => errors.push(`${current}: ${error.message}`));
  try {
    const sources = htmlFiles(root).map(file => ({ file: path.relative(root, file).replaceAll('\\', '/'), html: fs.readFileSync(file, 'utf8') }));
    const inventory = await page.evaluate(sources => sources.map(source => {
      const doc = new DOMParser().parseFromString(source.html, 'text/html');
      const attributes = ['data-field-sim', 'data-wave-sim', 'data-photoeffect-sim', 'data-ep-lab', 'data-system-lab', 'data-code-sim', 'data-analog-sim', 'data-variable-sim', 'data-pwm-sim', 'data-array-sim'];
      return {
        file: source.file,
        solution: !!doc.querySelector('meta[name="musterloesung-source"]'),
        book: !!doc.querySelector('[data-wb-book]'),
        pages: [...doc.querySelectorAll('section[data-wb-page]')].filter(section => [...section.querySelectorAll('*')].some(node => attributes.some(attr => node.hasAttribute(attr)))).map(section => section.dataset.wbPage).sort((a, b) => Number(a) - Number(b))
      };
    }).filter(item => item.book), sources);
    const candidates = inventory.filter(item => item.pages.length && !item.solution);
    const expectedExamples = {
      'felder/elektrische-felder.html': ['5', '7', '9'],
      'felder/elektrische-felder2.html': ['2', '4', '8'],
      'felder/felder-simulationen.html': ['1', '2', '3', '4', '5'],
      'wellen/wellen-simulationen.html': ['1', '2', '4', '5', '6', '7', '8', '9'],
      'nwt/arduino-6.html': ['3'],
      'felder/induktion.html': ['6']
    };
    for (const [file, pages] of Object.entries(expectedExamples)) assert.deepEqual(candidates.find(item => item.file === file)?.pages, pages, file);
    for (const item of [...candidates, ...inventory.filter(item => item.solution && item.pages.length), { file: 'informatik/kuenstliche-intelligenz2.html', pages: [] }, { file: 'felder/induktion2.html', pages: [] }]) {
      current = item.file;
      await page.goto(pathToFileURL(path.join(root, item.file)).href, { waitUntil: 'domcontentloaded' });
      const actual = await page.locator('.wb-page-list .wb-nav-item').evaluateAll(links => links.filter(link => link.querySelector('.wb-nav-sim-badge')).map(link => link.dataset.wbPage));
      assert.deepEqual(actual, item.solution ? [] : item.pages, item.file);
      for (const number of actual) {
        const link = page.locator(`.wb-page-list [data-wb-page="${number}"]`);
        assert.match(await link.getAttribute('aria-label'), /mit Simulation/);
        await link.evaluate(node => node.click());
        assert.equal(await page.locator(`section[data-wb-page="${number}"]`).isVisible(), true);
        assert.equal(await link.locator('.wb-nav-sim-badge').count(), 1);
      }
      console.log(`${item.file}: SIM auf Seite ${actual.join(', ') || '-'}`);
    }

    current = 'synthetic navigation cases';
    await page.setContent('<div data-wb-book><script class="wb-book-config" type="application/json">{"bookTitle":"Simulationstest","autoNav":false,"enableResultsPage":true}</script><section data-wb-page="1"><h1>Nur Text</h1><a href="simulation.html">Simulation</a><canvas></canvas></section><section data-wb-page="2" data-wb-simulation><h1>Eigene Simulation</h1></section><section data-wb-page="3" data-wb-simulation="false"><h1>Ausgeschlossen</h1><div data-wave-sim="demo"></div></section><section data-wb-page="4"><h1>Unterelement</h1><div data-wb-simulation></div></section><section data-wb-page="5"><h1>Unterelement ausgeschlossen</h1><div data-wb-simulation="false"><div data-field-sim="demo"></div></div></section></div>');
    await page.addStyleTag({ path: path.join(root, 'assets/allgemeines_format.css') });
    await page.addScriptTag({ path: path.join(root, 'assets/allgemeines_format.js') });
    await page.evaluate(() => SBLibrary.autoMountAll());
    assert.deepEqual(await page.locator('.wb-page-list .wb-nav-item:has(.wb-nav-sim-badge)').evaluateAll(nodes => nodes.map(n => n.dataset.wbPage)), ['2', '4']);

    current = 'responsive navigation';
    await page.goto(pathToFileURL(path.join(root, 'wellen/wellen-simulationen.html')).href, { waitUntil: 'domcontentloaded' });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['default', 'dark', 'dark-blue']) {
        await page.locator('.wb-theme-select').selectOption(theme, { force: true });
        if (width < 1000) {
          await page.locator('.wb-hamburger').click();
          await page.waitForFunction(() => document.querySelector('.wb-sidebar').getBoundingClientRect().left >= -1);
        }
        const issues = await page.locator('.wb-page-list .wb-nav-item').evaluateAll(links => links.flatMap(link => {
          const badge = link.querySelector('.wb-nav-sim-badge');
          if (!badge) return [];
          const b = badge.getBoundingClientRect(), l = link.getBoundingClientRect(), text = link.querySelector('.wb-nav-page-label').getBoundingClientRect();
          return b.left < text.right - 1 || b.right > l.right + 1 || b.top < l.top || b.bottom > l.bottom || l.left < -1 || b.right > innerWidth ? [link.textContent] : [];
        }));
        assert.deepEqual(issues, [], `${width}px ${theme}`);
        await page.screenshot({ path: path.join(output, `sidebar-${width}-${theme}.png`) });
        if (width < 1000) await page.locator('.wb-hamburger').click();
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ files: candidates.length, simulationPages: candidates.reduce((sum, item) => sum + item.pages.length, 0), inventory: candidates, errors }, null, 2));
    console.log(`Simulation navigation: ${candidates.length} files, ${candidates.reduce((sum, item) => sum + item.pages.length, 0)} pages; desktop/mobile checks passed.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
