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
      const number = file === 'felder-simulationen.html' ? '1' : '6';
      await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(node => node.click());
      assert.equal(await page.locator(`.wb-page-list [data-wb-page="${number}"] .wb-nav-sim-badge`).count(), 1);
      const lab = page.locator('[data-field-sim="rc-circuit"]');
      assert.equal(await lab.evaluate(el => el.closest('[data-wb-page]').dataset.wbPage), number);
      if (file === 'felder-simulationen.html') {
        assert.equal(await page.locator('section[data-wb-page="6"] [data-field-sim]').count(), 0);
        assert.equal(await lab.evaluate(el => !!(document.querySelector('[data-field-sim="capacitor"]').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
      }
      assert.equal(await lab.getAttribute('data-rc-mounted'), '1');
      const control = role => lab.locator(`[data-role="${role}"]`);
      const state = () => lab.evaluate(el => Object.fromEntries(['time','voltage','current','charge','energy','tau','initialVoltage'].map(key => [key, Number(el.dataset[key])])));
      const set = async (role, value) => { await control(role).fill(String(value)); await control(role).dispatchEvent('input'); };
      const electronDrawing = position => control('canvas').evaluate((canvas, position) => {
        const ctx = canvas.getContext('2d'), originalArc = ctx.arc, originalStroke = ctx.stroke;
        const originalBegin = ctx.beginPath, originalMove = ctx.moveTo, originalLine = ctx.lineTo, originalText = ctx.fillText;
        const dots = [], arrows = [];
        let positivePlate = 0, negativePlate = 0;
        let points = [];
        ctx.arc = function(x,y,r,...rest) {
          if(this.fillStyle === '#2563eb' && r === 4.2) dots.push({x,y});
          if(this.fillStyle === '#2563eb' && r === 3.4) negativePlate += this.globalAlpha;
          return originalArc.call(this,x,y,r,...rest);
        };
        ctx.fillText = function(text,x,y,...rest) {
          if(text==='+' && this.fillStyle==='#be123c' && (y===143 || y===131)) positivePlate += this.globalAlpha;
          return originalText.call(this,text,x,y,...rest);
        };
        ctx.beginPath = function() { points=[]; return originalBegin.call(this); };
        ctx.moveTo = function(x,y) { points.push({x,y}); return originalMove.call(this,x,y); };
        ctx.lineTo = function(x,y) { points.push({x,y}); return originalLine.call(this,x,y); };
        ctx.stroke = function(...args) { if(this.strokeStyle === '#2563eb' && Math.abs(this.lineWidth-2.2)<.00001 && points.length === 2) arrows.push(points.slice()); return originalStroke.apply(this,args); };
        try {
          const time = canvas.closest('[data-field-sim]').querySelector('[data-role="time"]');
          time.value=position; time.dispatchEvent(new Event('input',{bubbles:true}));
        } finally {
          ctx.arc=originalArc; ctx.stroke=originalStroke; ctx.beginPath=originalBegin; ctx.moveTo=originalMove; ctx.lineTo=originalLine; ctx.fillText=originalText;
        }
        return {dots,arrows,positivePlate,negativePlate,width:canvas.getBoundingClientRect().width};
      }, position);
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
      assert.match(await lab.locator('.rc-check').innerText(), /Elektronen/);
      for (const mode of ['charge','discharge']) {
        await control('mode').selectOption(mode);
        const drawings = [];
        for (const position of [0,10,20,600,610,620]) {
          const drawing = await electronDrawing(position);
          const physical = await state();
          assert.ok(Math.abs(drawing.positivePlate - physical.charge / .0001) < 1e-5, 'Plate symbols must represent the physical charge, including partial packets');
          close(drawing.positivePlate, drawing.negativePlate);
          drawings.push(drawing);
        }
        const earlyChange = Math.abs(drawings[2].positivePlate - drawings[0].positivePlate);
        const lateChange = Math.abs(drawings[5].positivePlate - drawings[3].positivePlate);
        assert.ok(earlyChange > lateChange * 15, 'Plate charge must change faster while the current is larger');
        assert.ok(mode==='charge' ? drawings[2].positivePlate>drawings[0].positivePlate : drawings[2].positivePlate<drawings[0].positivePlate);
        const first = await electronDrawing(0), next = await electronDrawing(1);
        const xC = first.width - 34;
        assert.ok(first.dots.length > 12, 'Electrons must cover the circuit, not only the top wire');
        assert.ok(first.dots.some(p => Math.abs(p.x-xC)<.01 && p.y>80 && p.y<155));
        assert.ok(first.dots.some(p => Math.abs(p.x-xC)<.01 && p.y>175 && p.y<248));
        assert.equal(first.dots.some(p => Math.abs(p.x-xC)<.01 && p.y>155 && p.y<175),false,'No electrons in the dielectric');
        assert.equal(first.dots.some(p => Math.abs(p.x-35)<.01 && p.y>141 && p.y<157),false,'No electron animation through the source interior');
        if(mode==='discharge') {
          assert.equal(first.dots.some(p => Math.abs(p.x-35)<.01),false,'Disconnected source branch must have no moving electrons');
          assert.ok(first.dots.some(p => Math.abs(p.x-60)<.01 && p.y>105 && p.y<248));
        } else {
          assert.ok(first.dots.some(p => Math.abs(p.x-35)<.01 && p.y>55 && p.y<141));
          assert.ok(first.dots.some(p => Math.abs(p.x-35)<.01 && p.y>157 && p.y<248));
        }
        const top = first.dots.findIndex((p,i)=>p.y===80 && next.dots[i].y===80 && p.x>110 && p.x<xC-10);
        const bottom = first.dots.findIndex((p,i)=>p.y===248 && next.dots[i].y===248 && p.x>75 && p.x<xC-10);
        assert.ok(top>=0 && bottom>=0);
        const direction = mode==='charge' ? -1 : 1;
        assert.equal(Math.sign(next.dots[top].x-first.dots[top].x),direction);
        assert.equal(Math.sign(next.dots[bottom].x-first.dots[bottom].x),-direction);
        assert.equal(first.arrows.length,4);
        assert.equal(Math.sign(first.arrows[0][1].x-first.arrows[0][0].x),direction);
        assert.equal(Math.sign(first.arrows[1][1].x-first.arrows[1][0].x),-direction);
        assert.equal(Math.sign(first.arrows[2][1].y-first.arrows[2][0].y),direction);
        assert.equal(Math.sign(first.arrows[3][1].y-first.arrows[3][0].y),-direction);
      }
      await control('mode').selectOption('charge'); await control('half').click();
      const plateBeforeSwitch = await electronDrawing(Number(await control('time').inputValue()));
      await control('switch').click();
      const plateAfterSwitch = await electronDrawing(0);
      assert.ok(Math.abs(plateBeforeSwitch.positivePlate-plateAfterSwitch.positivePlate)<1e-5, 'Switching must not jump the plate charge');
      await control('mode').selectOption('charge');
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
