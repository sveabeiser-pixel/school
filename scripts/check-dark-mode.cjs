const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const playwright = process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright');
const { chromium } = require(playwright);
const reportPath = path.join(process.env.TEMP, 'school-dark-mode-report.json');
const screenshotMode = process.argv.includes('--screenshots');
const requested = process.argv.slice(2).filter(arg => arg !== '--screenshots');
const files = requested.length ? requested : execFileSync('rg', ['--files', '-g', '*.html', '-g', '*.htm', '-g', '!legacy_dont_read/**', '-g', '!node_modules/**'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);

// Composite transparent backgrounds with their ancestors before measuring text.
function inspectContrast() {
  const parse = color => {
    const values = color.match(/[\d.]+/g);
    return values && values.length >= 3 ? [...values.slice(0, 3).map(Number), values.length > 3 ? Number(values[3]) : 1] : [0, 0, 0, 0];
  };
  const blend = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]));
  const luminance = rgb => rgb.map(value => {
    const v = value / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const backgroundCache = new Map();
  const layers = image => {
    const result = [];
    let start = 0, depth = 0;
    for (let i = 0; i < image.length; i++) {
      if (image[i] === '(') depth++;
      if (image[i] === ')') depth--;
      if (image[i] === ',' && !depth) { result.push(image.slice(start, i)); start = i + 1; }
    }
    result.push(image.slice(start));
    return result;
  };
  const background = element => {
    if (!element) return { rgb: [255, 255, 255], gradient: false };
    if (backgroundCache.has(element)) return backgroundCache.get(element);
    const style = getComputedStyle(element);
    const parent = background(element.parentElement);
    let rgb = blend(parse(style.backgroundColor), parent.rgb);
    const gradient = /gradient/.test(style.backgroundImage);
    if (gradient) {
      // Gradient colors are an estimate; screenshots cover the main regressions.
      for (const layer of layers(style.backgroundImage).reverse()) {
        const colors = [...layer.matchAll(/rgba?\([^)]+\)/g)].map(match => blend(parse(match[0]), rgb));
        if (colors.length) rgb = colors[colors.length - 1];
      }
    }
    const result = { rgb, gradient: gradient || parent.gradient };
    backgroundCache.set(element, result);
    return result;
  };
  const issues = new Map();
  const elements = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.trim()) elements.add(walker.currentNode.parentElement);
  }
  document.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=range]),textarea,select').forEach(element => elements.add(element));
  for (const element of elements) {
    if (element.closest('script,style,svg,mjx-container,.MathJax,.hidden-but-read') || !element.getClientRects().length) continue;
    const style = getComputedStyle(element);
    if (style.visibility !== 'visible' || style.opacity === '0' || element.disabled) continue;
    const bg = background(element);
    const foreground = blend(parse(style.color), bg.rgb);
    const a = luminance(foreground), b = luminance(bg.rgb);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight, 10) >= 700);
    if (ratio >= (large ? 3 : 4.5)) continue;
    const selector = element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + [...element.classList].map(name => '.' + name).join('');
    const section = element.closest('[data-wb-page]');
    const parent = element.parentElement;
    const surface = parent.tagName.toLowerCase() + [...parent.classList].map(name => '.' + name).join('');
    const key = selector + surface + style.color + bg.rgb.join(',');
    if (!issues.has(key)) issues.set(key, {
      selector, surface, page: section?.dataset.wbPage || '',
      text: (element.value || element.textContent).trim().replace(/\s+/g, ' ').slice(0, 100),
      color: style.color, background: bg.rgb.map(Math.round), ratio: Number(ratio.toFixed(2)),
      gradient: bg.gradient, count: 0
    });
    issues.get(key).count++;
  }
  return [...issues.values()];
}

async function main() {
  const mime = { '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const server = http.createServer((req, res) => {
    const target = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', (mime[path.extname(target)] || 'application/octet-stream') + '; charset=utf-8');
    fs.createReadStream(target).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const report = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const file of files) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
      await context.route('**/*', route => route.request().url().startsWith(base) && route.request().method() === 'GET' ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/' + file.replaceAll('\\', '/'), { waitUntil: 'load' });
      await page.evaluate(() => {
        document.querySelectorAll('[data-wb-page]').forEach(section => { section.hidden = false; section.style.setProperty('display', 'block', 'important'); });
        document.querySelectorAll('details').forEach(details => { details.open = true; });
        document.querySelectorAll('.wb-trace-input').forEach(input => { if (!input.value) input.value = 'Kontrastprobe'; });
      });
      const book = await page.locator('.wb-book').count();
      const themes = book ? ['dark', 'dark-blue'] : ['existing'];
      for (const theme of themes) {
        if (book) await page.locator('.wb-book').evaluateAll((books, id) => books.forEach(book => book.dataset.theme = id), theme);
        const issues = await page.evaluate(inspectContrast);
        if (issues.length || errors.length) report.push({ file, theme, state: 'initial', issues, errors });
      }

      if (book) {
        // Exercise both feedback states and light category zones after moving chips.
        await page.evaluate(() => {
          document.querySelectorAll('.wb-trace-input').forEach((input, index) => input.classList.add(index % 2 ? 'is-wrong' : 'is-correct'));
          document.querySelectorAll('.wb-block[data-wb-type="categorize"]').forEach(block => {
            const zone = block.querySelector('.wb-categorize-zone-body');
            if (!zone) return;
            [...block.querySelectorAll('.wb-categorize-chip')].slice(0, 3).forEach((chip, index) => { zone.append(chip); chip.classList.add(index % 2 ? 'wrong' : 'correct'); });
          });
        });
        for (const theme of themes) {
          await page.locator('.wb-book').evaluateAll((books, id) => books.forEach(book => book.dataset.theme = id), theme);
          const issues = (await page.evaluate(inspectContrast)).filter(issue => /wb-trace-input|wb-categorize-chip/.test(issue.selector));
          if (issues.length) report.push({ file, theme, state: 'feedback', issues, errors: [] });
        }
      }

      if (file.replaceAll('\\', '/') === 'informatik/sprachmodelle.html') {
        await page.evaluate(() => {
          const name = document.querySelector('[data-wb-student-name]');
          name.value = 'Kontrastpruefung';
          name.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.wb-submit-btn').click();
        });
        await page.waitForSelector('.wb-results-panel');
        for (const theme of themes) {
          await page.locator('.wb-book').evaluate((book, id) => book.dataset.theme = id, theme);
          const issues = await page.evaluate(inspectContrast);
          if (issues.length) report.push({ file, theme, state: 'results', issues, errors: [] });
        }
      }

      if (screenshotMode) {
        const scenes = {
          'informatik/sprachmodelle.html': 9,
          'nwt/arduino-schleifen-ifelse.html': 2,
          'nwt/arduino-wiederholung.html': 6,
          'physik_misc/Einstieg.html': 8,
          'quanten/photoeffekt-simulationen.html': 2
        };
        const number = scenes[file.replaceAll('\\', '/')];
        if (number) {
          const directory = path.join(process.env.TEMP, 'school-dark-mode-screenshots');
          fs.mkdirSync(directory, { recursive: true });
          for (const width of [1440, 390]) for (const theme of themes) {
            await page.setViewportSize({ width, height: 1000 });
            await page.reload({ waitUntil: 'load' });
            await page.locator('.wb-theme-select').evaluate((select, id) => { select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); }, theme);
            await page.locator(`.wb-nav-item[data-wb-page="${number}"]`).first().evaluate(link => link.click());
            await page.locator(`section[data-wb-page="${number}"]`).waitFor({ state: 'visible' });
            await page.screenshot({ path: path.join(directory, `${path.parse(file).name}-${theme}-${width}.png`) });
            const issues = await page.evaluate(inspectContrast);
            if (issues.length) report.push({ file, theme, state: `viewport-${width}`, issues, errors: [] });
          }
        }
      }
      await context.close();
      console.log(`Checked ${file}`);
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    const severe = report.reduce((sum, item) => sum + item.issues.filter(issue => issue.ratio < 3).length, 0);
    console.log(`${files.length} files checked; ${severe} severe contrast combinations. Report: ${reportPath}`);
    if (severe) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
