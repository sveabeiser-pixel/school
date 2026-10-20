const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      window.waveDraws = {};
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        const key = this.canvas.closest('[data-wave-sim]')?.dataset.waveSim;
        window.waveDraws[key] = (window.waveDraws[key] || 0) + 1;
        return clear.apply(this, args);
      };
    });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../wellen/wellen-simulationen.html')).href);
    const go = async number => {
      await page.locator(`.wb-page-list [data-wb-page="${number}"]`).evaluate(n => n.click());
      await page.waitForTimeout(120);
    };
    const countDraws = async duration => {
      await page.evaluate(() => { window.waveDraws = {}; });
      await page.waitForTimeout(duration);
      return page.evaluate(() => ({ ...window.waveDraws }));
    };
    await go(8);
    assert.deepEqual(await countDraws(300), {}, 'Paused particle scene and hidden pages must not redraw');

    const particle = page.locator('[data-wave-sim="double-slit-particles"]');
    await particle.locator('[data-role="start"]').click();
    let frames = await countDraws(400);
    assert((frames['double-slit-particles'] || 0) > 2, 'Particle animation must start');
    assert.equal(Object.keys(frames).length, 1, 'Only the visible particle scene may animate');

    const single = page.locator('[data-wave-sim="single-slit"]');
    await single.scrollIntoViewIfNeeded();
    await single.evaluate(n => {
      const content = n.closest('.wb-content');
      content.scrollTop += n.getBoundingClientRect().top - content.getBoundingClientRect().top;
    });
    await page.waitForTimeout(120);
    frames = await countDraws(300);
    assert.equal(frames['double-slit-particles'] || 0, 0, 'Offscreen particle scene must stop rendering');
    await particle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    assert((await countDraws(250))['double-slit-particles'] > 2, 'Particle animation must resume on scroll');
    await particle.locator('[data-role="start"]').click();
    await particle.locator('[data-role="reset"]').click();
    await page.waitForTimeout(100);
    assert.deepEqual(await countDraws(200), {}, 'Reset particle scene must become idle');
    await particle.locator('[data-role="mode"]').selectOption('slitA');
    await page.waitForTimeout(60);
    assert((await particle.locator('[data-role="readout"]').textContent()).includes('Nur Spalt A'));

    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const timings = {};
    for (const type of ['single-slit', 'double-slit-envelope', 'grating-phasor', 'grating']) {
      const sim = page.locator(`[data-wave-sim="${type}"]`);
      await sim.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const originalImages = await sim.locator('canvas').evaluateAll(nodes => nodes.map(n => n.toDataURL()));
      timings[type] = await sim.evaluate(async node => {
        const intervals = [], costs = [];
        for (const control of node.querySelectorAll('input[type="range"]')) {
          const original = control.value;
          for (let i = 0; i < 8; i++) {
            const t = performance.now();
            const before = window.waveDraws[node.dataset.waveSim] || 0;
            control.value = Number(control.min) + (Number(control.max) - Number(control.min)) * i / 7;
            control.dispatchEvent(new Event('input', { bubbles: true }));
            if ((window.waveDraws[node.dataset.waveSim] || 0) <= before) throw new Error('No synchronous diagram update');
            costs.push(performance.now() - t);
            await new Promise(requestAnimationFrame);
            intervals.push(performance.now() - t);
          }
          control.value = original;
          control.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const percentile = values => values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
        return { inputP95Ms: percentile(costs), frameP95Ms: percentile(intervals) };
      });
      assert.deepEqual(await sim.locator('canvas').evaluateAll(nodes => nodes.map(n => n.toDataURL())), originalImages, `${type}: cached image differs after restoring controls`);
      assert(timings[type].frameP95Ms < 120, `${type}: slider response exceeded budget`);
    }
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // Switching pages must both suspend the old loop and resume a saved animation.
    await go(4);
    const huygens = page.locator('[data-wave-sim="huygens-diffraction"]');
    await huygens.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    assert((await countDraws(250))['huygens-diffraction'] > 2);
    await go(8);
    assert.deepEqual(await countDraws(250), {}, 'Hidden diffraction animation must not redraw');
    await go(4);
    await huygens.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    assert((await countDraws(250))['huygens-diffraction'] > 2, 'Diffraction must resume after page switch');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ hiddenAndIdleFrames: 0, cpuSlowdown: 4, timings }, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
