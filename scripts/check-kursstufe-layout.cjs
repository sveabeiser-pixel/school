const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-kursstufe-layout');
const before = process.argv.includes('--before');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  let current = '';
  page.on('pageerror', error => errors.push({ file: current, message: error.message }));
  try {
    await page.setContent(fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, ''));
    const requested = process.argv.flatMap((arg, i, args) => arg === '--source' ? [args[i + 1]] : []);
    const files = (await page.locator('section[data-wb-page="4"] a.index-material-link').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('href').split('#')[0]))])).filter(file => !requested.length || requested.includes(file));
    assert.ok(files.length, 'No matching course pages');
    const report = [];
    const responsive = [];
    for (const file of files) {
      current = file;
      await page.goto(pathToFileURL(path.join(root, file)).href, { waitUntil: 'domcontentloaded' });
      const numbers = await page.locator('section[data-wb-page]').evaluateAll(nodes => nodes.map(n => n.dataset.wbPage));
      const inventory = { file, images: 0, broken: [], pairs: [], pictures: [] };
      for (const number of numbers) {
        const nav = page.locator(`.wb-page-list [data-wb-page="${number}"]`);
        if (await nav.count()) await nav.evaluate(n => n.click());
        const section = page.locator(`section[data-wb-page="${number}"]`);
        await section.locator('img').evaluateAll(nodes => Promise.all(nodes.map(async n => { n.loading = 'eager'; try { await n.decode(); } catch {} })));
        const data = await section.evaluate(section => {
          const images = [...section.querySelectorAll('img')].filter(n => !n.closest('.wb-task-icon,.wb-head'));
          const pairs = new Map();
          for (const image of images) {
            for (let parent = image.parentElement; parent && parent !== section; parent = parent.parentElement) {
              if (!['grid', 'flex'].includes(getComputedStyle(parent).display)) continue;
              const children = [...parent.children];
              const visual = children.find(n => n.contains(image));
              const text = children.filter(n => n !== visual && !n.querySelector('img') && n.textContent.trim().length > 80);
              if (!visual || !text.length || children.length > 3) continue;
              const r = parent.getBoundingClientRect();
              if (!r.width) continue;
              const ir = image.getBoundingClientRect(), tr = text[0].getBoundingClientRect();
              const naturalRatio = image.naturalWidth / Math.max(1, image.naturalHeight);
              const paintedWidth = Math.min(ir.width, ir.height * naturalRatio);
              const paintedHeight = Math.min(ir.height, ir.width / naturalRatio);
              pairs.set(parent, { page: section.dataset.wbPage, cls: parent.className, index: [...section.querySelectorAll('*')].indexOf(parent), image: image.getAttribute('src'), alt: image.alt, text: text[0].textContent.trim().slice(0, 160), textLength: text[0].textContent.trim().length, gridWidth: Math.round(r.width), imageWidth: Math.round(ir.width), paintedWidth: Math.round(paintedWidth), imageHeight: Math.round(paintedHeight), textWidth: Math.round(tr.width), textHeight: Math.round(tr.height), stacked: Math.abs(visual.getBoundingClientRect().left - tr.left) < 8 });
              break;
            }
          }
          return { images: images.length, broken: images.filter(n => !n.naturalWidth).map(n => n.getAttribute('src')), pairs: [...pairs.values()], pictures: images.map(n => ({ src: n.src, alt: n.alt, page: section.dataset.wbPage })) };
        });
        inventory.images += data.images;
        inventory.broken.push(...data.broken);
        inventory.pairs.push(...data.pairs);
        inventory.pictures.push(...data.pictures);
        const custom = section.locator('[data-course-media]');
        if (!before && await custom.count()) {
          for (let i = 0; i < await custom.count(); i++) {
            const node = custom.nth(i);
            await node.screenshot({ path: path.join(output, `${file.replaceAll('/', '_')}-${number}-${i}.png`), style: '.wb-topbar{visibility:hidden!important}' });
          }
        }
      }
      report.push(inventory);
      console.log(`${file}: ${inventory.images} Bilder, ${inventory.pairs.length} Bild-Text-Gruppen`);
      if (!before && await page.locator('[data-course-media],.ef-mixed-tasks').count()) {
        for (const width of [1440, 820, 390, 320]) {
          await page.setViewportSize({ width, height: 1100 });
          for (const theme of ['default', 'dark', 'dark-blue']) {
            await page.locator('.wb-theme-select').selectOption(theme, { force: true });
            for (const number of numbers) {
              const section = page.locator(`section[data-wb-page="${number}"]`);
              if (!await section.locator('[data-course-media],.ef-mixed-tasks').count()) continue;
              await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(n => n.click());
              const issues = await section.evaluate(section => {
                const issues = [];
                for (const group of section.querySelectorAll('[data-course-media]')) {
                  const visual = [...group.children].find(n => n.matches('figure,.wb-img'));
                  const text = [...group.children].find(n => n !== visual);
                  if (!visual || !text) { issues.push('missing visual or explanation'); continue; }
                  const vr = visual.getBoundingClientRect(), tr = text.getBoundingClientRect(), gr = group.getBoundingClientRect();
                  const mode = group.dataset.courseMedia;
                  const stacked = mode === 'stack' || innerWidth <= 900;
                  if (stacked && tr.top < vr.bottom - 1) issues.push(`${mode}: explanation not below image`);
                  if (!stacked && tr.width < vr.width) issues.push(`${mode}: explanation column too narrow`);
                  for (const node of [visual, text, ...visual.querySelectorAll('img')]) {
                    const r = node.getBoundingClientRect();
                    if (r.left < gr.left - 2 || r.right > gr.right + 2) issues.push(`${mode}: child outside group`);
                  }
                }
                for (const node of section.querySelectorAll('.ef-mixed-tasks > li,.ef-task-data,.ef-task-image')) {
                  const r = node.getBoundingClientRect();
                  if (r.width && (r.left < -1 || r.right > innerWidth + 1)) issues.push('chapter task outside viewport');
                }
                const rgb = value => {
                  const parts = value.match(/[\d.]+/g)?.map(Number);
                  return parts?.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : [0, 0, 0, 0];
                };
                const over = (front, back) => [...front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3])), 1];
                const light = color => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
                for (const node of section.querySelectorAll('[data-course-media] :is(p,h3,figcaption),.ef-mixed-tasks :is(p,h3,dt,dd)')) {
                  if (!node.getClientRects().length) continue;
                  const ancestors = [];
                  for (let n = node; n; n = n.parentElement) ancestors.push(n);
                  const background = ancestors.reverse().reduce((color, n) => {
                    const style = getComputedStyle(n);
                    const flat = over(rgb(style.backgroundColor), color);
                    const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
                    return stops?.length ? over(rgb(stops.at(-1)), flat) : flat;
                  }, [255, 255, 255, 1]);
                  const foreground = over(rgb(getComputedStyle(node).color), background);
                  const contrast = (Math.max(light(foreground), light(background)) + .05) / (Math.min(light(foreground), light(background)) + .05);
                  if (contrast < 3) issues.push(`text contrast ${contrast.toFixed(2)}: ${node.textContent.trim().slice(0, 40)}`);
                }
                return issues;
              });
              responsive.push({ file, page: number, width, theme, issues });
              if (file === 'felder/elektrische-felder3.html' && number === '10' && [1440, 390].includes(width) && ['default', 'dark'].includes(theme)) {
                await section.locator('#ef3-mixed-1').scrollIntoViewIfNeeded();
                await page.screenshot({ path: path.join(output, `mixed-tasks-${width}-${theme}.png`) });
              }
            }
          }
        }
        await page.setViewportSize({ width: 1440, height: 1100 });
      }
    }
    fs.writeFileSync(path.join(output, before ? 'before.json' : 'after.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output, 'errors.json'), JSON.stringify(errors, null, 2));
    fs.writeFileSync(path.join(output, 'responsive.json'), JSON.stringify(responsive, null, 2));
    console.log(JSON.stringify({ files: files.length, images: report.reduce((n, f) => n + f.images, 0), pairs: report.reduce((n, f) => n + f.pairs.length, 0), errors, output }, null, 2));
    if (!before) {
      assert.deepEqual(errors, []);
      assert.deepEqual(report.flatMap(f => f.broken), [], 'Broken material images');
      assert.deepEqual(responsive.filter(r => r.issues.length), [], 'Responsive layout problems');
      const baselinePath = path.join(output, 'before.json');
      if (fs.existsSync(baselinePath)) {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const inventory = rows => rows.flatMap(f => f.pictures.map(p => `${f.file}|${p.page}|${p.src}|${p.alt}`)).sort();
        assert.deepEqual(inventory(report), inventory(baseline.filter(row => files.includes(row.file))), 'Material images changed');
      }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
