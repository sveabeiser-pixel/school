const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { metadata } = require('./check-musterloesungen.cjs');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', '.codex', '.agents', 'assets', 'public', 'legacy_dont_read', 'node_modules']);
function solutions(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : solutions(file);
    return /\.html?$/.test(file) && metadata(fs.readFileSync(file, 'utf8'))['musterloesung-source'] ? [file] : [];
  });
}

async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const files = [...solutions(root), path.join(root, 'index.html')];
  const issues = [];
  let views = 0;
  const screenshots = path.join(process.env.TEMP, 'school-musterloesungen-check');
  fs.mkdirSync(screenshots, { recursive: true });
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      let errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const file of files) {
        const label = path.relative(root, file).replaceAll('\\', '/');
        errors = [];
        await page.goto(pathToFileURL(file).href, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.wb-book');
        const isSolution = file !== path.join(root, 'index.html');
        if (isSolution) {
          if (!(await page.locator('.wb-brand').innerText()).includes('Musterlösung')) issues.push(`${label}: Kennzeichnung fehlt.`);
          if (await page.locator('input:visible,textarea:visible,.wb-submit-btn:visible').count()) issues.push(`${label}: Eingabe oder Abgabe sichtbar.`);
          const ids = await page.locator('[data-solution]').evaluateAll(nodes => nodes.map(node => node.dataset.solution));
          if (new Set(ids).size !== ids.length) issues.push(`${label}: doppelte Lösungs-ID.`);
        }
        if (width === 1440) {
          const links = await page.locator('a[href],img[src],link[rel="stylesheet"],script[src]').evaluateAll(nodes => nodes.map(node => ({ url: node.href || node.src, text: node.textContent, tag: node.tagName })));
          for (const item of links) {
            if (!item.url.startsWith('file:')) continue;
            const url = new URL(item.url);
            url.hash = ''; url.search = '';
            if (!fs.existsSync(fileURLToPath(url))) issues.push(`${label}: fehlender lokaler Pfad ${item.url}`);
            if (!isSolution && /\.html?\s*$/.test(item.text.trim())) issues.push(`${label}: Dateiname als Linktext ${item.text.trim()}`);
          }
        }
        const numbers = await page.locator('section[data-wb-page]').evaluateAll(nodes => nodes.map(node => node.dataset.wbPage));
        for (const theme of ['default', 'dark', 'dark-blue']) {
          const selector = page.locator('.wb-theme-select');
          if (!await selector.isVisible()) {
            issues.push(`${label}, ${width}: Farbauswahl verborgen.`);
            await selector.selectOption(theme, { force: true });
          } else await selector.selectOption(theme);
          for (const number of numbers) {
            await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(node => node.click());
            const result = await page.evaluate(({ isSolution, theme }) => {
              const active = [...document.querySelectorAll('section[data-wb-page]')].find(node => getComputedStyle(node).display !== 'none');
              const toolbar = document.querySelector('.wb-topbar').getBoundingClientRect();
              const content = document.querySelector('.wb-content').getBoundingClientRect();
              const problems = [];
              if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('horizontaler Seitenüberlauf');
              for (const node of document.querySelectorAll('.wb-topbar button,.wb-topbar select')) {
                const rect = node.getBoundingClientRect();
                if (!rect.width || getComputedStyle(node).display === 'none') continue;
                if (rect.x < -1 || rect.right > innerWidth + 1 || rect.bottom > toolbar.bottom + 1) problems.push(`Kopfzeile: ${node.getAttribute('aria-label') || node.className}`);
              }
              if (content.top < toolbar.bottom - 1) problems.push('Inhalt überlappt Kopfzeile');
              if (!active) problems.push('keine aktive Book-Seite');
              if (isSolution && active && theme !== 'default') {
                const rgb = value => {
                  const parts = value.match(/[\d.]+/g)?.map(Number);
                  return parts?.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : [0, 0, 0, 0];
                };
                const over = (front, back) => [...front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3])), 1];
                const light = color => color.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
                const walker = document.createTreeWalker(active, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode())) {
                  if (!node.textContent.trim() || node.parentElement.closest('script,style')) continue;
                  const parent = node.parentElement;
                  if (!parent.getClientRects().length) continue;
                  const style = getComputedStyle(parent);
                  const ancestors = [];
                  for (let element = parent; element; element = element.parentElement) ancestors.push(element);
                  const background = ancestors.reverse().reduce((color, element) => {
                    const computed = getComputedStyle(element);
                    const flat = over(rgb(computed.backgroundColor), color);
                    const stops = computed.backgroundImage.match(/rgba?\([^)]+\)/g);
                    return stops?.length ? over(rgb(stops.at(-1)), flat) : flat;
                  }, [255, 255, 255, 1]);
                  const foreground = over(rgb(style.color), background);
                  const ratio = (Math.max(light(foreground), light(background)) + .05) / (Math.min(light(foreground), light(background)) + .05);
                  if (ratio < 3) problems.push(`Kontrast ${ratio.toFixed(2)}: ${node.textContent.trim().slice(0, 65)}`);
                }
              }
              return [...new Set(problems)];
            }, { isSolution, theme });
            for (const problem of result) issues.push(`${label}, ${width}, ${theme}, Seite ${number}: ${problem}`);
            views++;
          }
          if (width === 390 && theme === 'dark' && /arduino-3-tintenfass|kuenstliche-intelligenz2-pergament|index\.html$/.test(file)) {
            await page.locator('.wb-page-list [data-wb-page="1"]').evaluate(node => node.click());
            await page.screenshot({ path: path.join(screenshots, label.replaceAll('/', '_') + '.png'), fullPage: true, animations: 'disabled' });
          }
        }
        for (const error of errors) issues.push(`${label}: JavaScript-Fehler ${error}`);
      }
      await context.close();
      console.log(`${files.length} Dateien bei ${width}px geprüft.`);
    }
  } finally {
    await browser.close();
  }
  const distinct = [...new Set(issues)];
  fs.writeFileSync(path.join(screenshots, 'report.json'), JSON.stringify(distinct, null, 2), 'utf8');
  for (const issue of distinct.slice(0, 40)) console.error(issue);
  console.log(`${views} Seitenansichten; ${distinct.length} Probleme. Bericht und Screenshots: ${screenshots}`);
  process.exitCode = distinct.length ? 1 : 0;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
