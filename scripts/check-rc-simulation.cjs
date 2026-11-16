const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-laengsfeld-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-rc-simulation-check');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < Math.max(1e-12, Math.abs(expected) * 1e-9), `${actual} != ${expected}`);

async function main() {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
  const page = await browser.newPage({viewport:{width:1440, height:1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const file of ['elektrische-felder3.html', 'felder-simulationen.html']) {
      await page.goto(pathToFileURL(path.join(root, 'felder', file)).href, {waitUntil:'load'});
      await page.locator('.wb-page-list [data-wb-page="6"]').evaluate(node => node.click());
      assert.equal(await page.locator('.wb-page-list [data-wb-page="6"] .wb-nav-sim-badge').count(), 1);
      const lab = page.locator('[data-field-sim="rc-circuit"]');
      assert.equal(await lab.getAttribute('data-rc-mounted'), '1');
      const control = role => lab.locator(`[data-role="${role}"]`);
      const state = () => lab.evaluate(el => Object.fromEntries(['time','voltage','current','charge','energy','tau','initialVoltage'].map(key => [key, Number(el.dataset[key])])));
      const set = async (role, value) => { await control(role).fill(String(value)); await control(role).dispatchEvent('input'); };
      let s = await state();
      close(s.voltage, 0); close(s.current, .0012); close(s.tau, 1); close(s.energy, 0);
      await control('half').click();
      s = await state(); close(s.time, Math.LN2); close(s.voltage, 6); close(s.current, .0006); close(s.charge, .0006); close(s.energy, .0018);
      await control('tau').click(); close((await state()).voltage, 12 * (1 - Math.exp(-1)));
      await control('five-tau').click(); assert.ok((await state()).voltage < 12);
      await control('mode').selectOption('discharge');
      s = await state(); close(s.voltage, 12); close(s.current, -.0012); close(s.energy, .0072);
      await control('half').click(); s = await state(); close(s.voltage, 6); close(s.current, -.0006); close(s.energy, .0018);
      await control('tau').click(); close((await state()).voltage, 12 * Math.exp(-1));
      await control('five-tau').click(); assert.ok((await state()).voltage > 0);
      await control('mode').selectOption('charge');
      await set('resistance', 20); s = await state(); close(s.tau, 2); close(s.current, .0006);
      await set('resistance', 10); await set('capacitance', 200); s = await state(); close(s.tau, 2); close(s.current, .0012);
      await set('capacitance', 100); await set('voltage', 24); s = await state(); close(s.tau, 1); close(s.current, .0024);
      await control('mode').selectOption('discharge'); s = await state(); close(s.charge, .0024); close(s.energy, .0288);
      await set('voltage', 12); await control('mode').selectOption('charge'); await control('half').click();
      const before = await state(); await control('switch').click(); const after = await state();
      for (const key of ['voltage','charge','energy']) close(after[key], before[key]);
      close(after.current, -before.current); close(after.time, 0); close(after.initialVoltage, 6);
      await control('tau').click(); close((await state()).voltage, 6 * Math.exp(-1));
      await control('switch').click(); assert.ok((await state()).current > 0);
      await set('resistance-number', 50); assert.equal(await control('resistance').inputValue(), '50');
      await set('resistance', 10); await control('mode').selectOption('charge'); await control('reset').click();
      const canvasBefore = await control('canvas').evaluate(canvas => canvas.toDataURL());
      await control('play').click(); await page.waitForTimeout(250); await control('play').click();
      s = await state(); assert.ok(s.time > 0); assert.equal(await control('play').innerText(), 'Start');
      assert.notEqual(await control('canvas').evaluate(canvas => canvas.toDataURL()), canvasBefore);
      const paused = await state(); await page.waitForTimeout(80); close((await state()).time, paused.time);
      await control('reset').click(); close((await state()).time, 0); close((await state()).voltage, 0);
      await set('time', 200); close((await state()).voltage, 12 * (1 - Math.exp(-1)));
      const withArrow = await control('canvas').evaluate(canvas => canvas.toDataURL());
      await control('show-current').uncheck(); assert.notEqual(await control('canvas').evaluate(canvas => canvas.toDataURL()), withArrow);
      await control('show-current').check();
      await set('resistance', 1); await set('capacitance', 10); await control('play').click(); await page.waitForTimeout(350);
      assert.equal(await control('play').innerText(), 'Start'); close((await state()).time, .05);
      await set('resistance', 10); await set('capacitance', 100); await control('half').click();
      await page.evaluate(() => FieldSim.mountAll()); assert.equal(await lab.locator('.rc-stage').count(), 1);
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({width,height:1000});
        for (const theme of ['default','dark','dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme,{force:true});
          await lab.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
          const geometry = await lab.evaluate(el => {
            const box = el.getBoundingClientRect();
            return {left:box.left, right:box.right, overflow:el.scrollWidth > el.clientWidth + 2,
              canvases:[...el.querySelectorAll('canvas')].map(canvas => {
                const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
                let ink=0; for(let i=0;i<pixels.length;i+=16) if(pixels[i]<160||pixels[i+1]<160||pixels[i+2]<160)ink++;
                return {width:canvas.clientWidth,height:canvas.clientHeight,ink};
              })};
          });
          assert.equal(geometry.overflow,false,`${file} ${width} ${theme}`);
          assert.ok(geometry.left>=0 && geometry.right<=width+1);
          assert.ok(geometry.canvases.every(canvas => canvas.width>200 && canvas.ink>200));
          assert.ok(geometry.canvases[0].height>=318 && geometry.canvases[1].height>=468);
          if (theme==='default' && [1440,390].includes(width)) {
            await control('canvas').screenshot({path:path.join(output,`${file}-${width}-circuit.png`)});
            await control('plot').screenshot({path:path.join(output,`${file}-${width}-plots.png`)});
          }
        }
      }
      await page.setViewportSize({width:1440,height:1000});
      console.log(`${file}: Physik, Umschalten, Steuerung, SIM und 15 Layoutvarianten erfolgreich.`);
    }
    assert.deepEqual(errors,[]);
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
