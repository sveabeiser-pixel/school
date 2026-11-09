const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-laengsfeld-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-laengsfeld-check', 'screenshots');
const e = 1.602176634e-19, me = 9.1093837139e-31;
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-15, Math.abs(expected) * tolerance), `${actual} != ${expected}`);

async function main() {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
  const page = await browser.newPage({viewport:{width:1440, height:1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const reports = [];
  try {
    for (const [file, number] of [['elektrische-felder2.html', '7'], ['felder-simulationen.html', '2']]) {
      await page.goto(pathToFileURL(path.join(root, 'felder', file)).href, {waitUntil:'load'});
      await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(node => node.click());
      assert.equal(await page.locator(`.wb-page-list [data-wb-page="${number}"] .wb-nav-sim-badge`).count(), 1);
      const lab = page.locator('[data-field-sim="longitudinal-field"]');
      assert.equal(await lab.getAttribute('data-longitudinal-mounted'), '1');
      const control = role => lab.locator(`[data-role="${role}"]`);
      const set = async (role, value) => { await control(role).fill(String(value)); await control(role).dispatchEvent('input'); };
      const state = () => lab.evaluate(el => Object.fromEntries(['x','v','a','time','duration'].map(key => [key, Number(el.dataset[key])])));
      const preset = value => control('preset').selectOption(value);
      await set('time', 1000);
      let s = await state();
      close(s.x, .1); close(s.v, Math.sqrt(2 * e * 100 / me)); close(s.a, e * 1000 / me);
      close(s.time, Math.sqrt(.2 / s.a));
      const a = s.a;
      await set('mass', 2); close((await state()).a, a / 2);
      await set('charge', -2); close((await state()).a, a);
      await set('charge', 2); close((await state()).a, -a);
      await set('field', 1000); close((await state()).a, a);
      await set('position', 5); close((await state()).x, .05);
      await set('time', 1000); close((await state()).x, .1);
      await preset('counter');
      await set('time', 500);
      s = await state();
      close(s.x, 16e12 / (2 * e * 1000 / me));
      assert.ok(Math.abs(s.v) < 1e-8);
      assert.ok(s.a < 0);
      await set('time', 750); assert.ok((await state()).v < 0);
      await set('time', 1000); close((await state()).x, 0);
      await preset('neutral'); await set('time', 500);
      s = await state(); close(s.x, .05); close(s.v, 2e6); close(s.a, 0);
      await preset('electron'); await set('field', 0); await set('time', 1000);
      s = await state(); close(s.x, 0); close(s.v, 0); close(s.a, 0);
      await preset('electron'); await set('position', 10);
      close((await state()).duration, 0);
      await preset('positive'); await set('time', 1000);
      s = await state(); close(s.x, .1); close(s.a, e * 1000 / (1836 * me));
      await preset('electron');
      const startImage = await control('canvas').evaluate(canvas => canvas.toDataURL());
      await control('play').click(); await page.waitForTimeout(350); await control('play').click();
      s = await state(); assert.ok(s.time > 0); assert.equal(await control('play').innerText(), 'Start');
      assert.notEqual(await control('canvas').evaluate(canvas => canvas.toDataURL()), startImage);
      const paused = await state(); await page.waitForTimeout(80); close((await state()).time, paused.time);
      await control('step').click(); assert.ok((await state()).time > paused.time);
      await control('reset').click(); close((await state()).time, 0);
      for (const key of ['poles','lines','force','acceleration','speed','axes','trace']) {
        await set('time', 450);
        const before = await control('canvas').evaluate(canvas => canvas.toDataURL());
        await control(`show-${key}`).uncheck();
        assert.notEqual(await control('canvas').evaluate(canvas => canvas.toDataURL()), before, key);
        await control(`show-${key}`).check();
      }
      await control('mass-number').fill('1836'); await control('mass-number').dispatchEvent('input');
      assert.equal(await control('mass').inputValue(), '1836');
      await preset('counter'); await set('time', 500);
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({width, height:1000});
        for (const theme of ['default', 'dark', 'dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme, {force:true});
          await lab.scrollIntoViewIfNeeded(); await page.waitForTimeout(80);
          const geometry = await lab.evaluate(el => {
            const box = el.getBoundingClientRect();
            const canvases = [...el.querySelectorAll('canvas')].map(canvas => {
              const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
              let ink = 0;
              for (let i = 0; i < pixels.length; i += 16) if (pixels[i] < 160 || pixels[i + 1] < 160 || pixels[i + 2] < 160) ink++;
              return {width:canvas.clientWidth, height:canvas.clientHeight, ink};
            });
            return {overflow:el.scrollWidth > el.clientWidth + 1, left:box.left, right:box.right, canvases};
          });
          assert.equal(geometry.overflow, false, `${file} ${width} ${theme}`);
          assert.ok(geometry.left >= 0 && geometry.right <= width + 1);
          assert.ok(geometry.canvases.every(canvas => canvas.width > 200 && canvas.ink > 200));
          assert.ok(geometry.canvases[0].height >= 358, 'Simulation must not be squeezed by the generic canvas aspect ratio');
          if (theme === 'default' || width === 390) await lab.screenshot({path:path.join(output, `${file}-${width}-${theme}.png`)});
          reports.push({file, width, theme, geometry});
        }
      }
      await page.setViewportSize({width:1440, height:1000});
      console.log(`${file}: Physik, Steuerung, Einblendungen, SIM und 15 Layoutvarianten erfolgreich.`);
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(reports, null, 2));
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
