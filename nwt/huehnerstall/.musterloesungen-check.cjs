const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require(path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const { files } = require('./.musterloesungen-antworten.cjs');
const { check } = require('../../scripts/check-musterloesungen.cjs');
const root = path.resolve(__dirname, '../..');

(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const screenshots = path.join(process.env.TEMP,'school-huehnerstall-check');
  fs.mkdirSync(screenshots,{recursive:true});
  let pageChecks=0, solutionCount=0;
  try {
    for (const [source, entry] of Object.entries(files)) {
      const checked = check(root,`nwt/huehnerstall/${source}`);
      assert.deepEqual(checked.issues,[],`${source}: Zuordnung/Hash`);
      assert.equal(checked.checked,1);
      const sourceHtml=fs.readFileSync(path.join(__dirname,source),'utf8');
      const solutionHtml=fs.readFileSync(path.join(__dirname,entry.output),'utf8');
      assert(!/onSubmit|webhook|data-wb-type|data-p2\s/.test(solutionHtml));
      const config=JSON.parse(solutionHtml.match(/class="wb-book-config">([\s\S]*?)<\/script>/)[1]);
      assert.equal(config.enableResultsPage,false);
      const pageCount=[...sourceHtml.matchAll(/<section\b[^>]*data-wb-page=/g)].length;
      for (const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
        const context=await browser.newContext({viewport});
        const page=await context.newPage();
        const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.addInitScript(() => {
          localStorage.setItem('wbStudentName','Unveränderter Prüfwert');
        });
        await page.goto(pathToFileURL(path.join(__dirname,entry.output)).href);
        await page.waitForSelector('.wb-book');
        assert.equal(await page.locator('.wb-brand').innerText(),'Musterlösung');
        assert(await page.locator('section[data-wb-page="1"] .coop-kicker').isVisible());
        assert.equal(await page.locator('[data-wb-results]').count(),0);
        assert.equal(await page.locator('input:visible,textarea:visible,.wb-submit-btn:visible').count(),0);
        assert.equal(await page.evaluate(()=>localStorage.getItem('wbStudentName')),'Unveränderter Prüfwert');
        if(viewport.width===1440) solutionCount+=await page.locator('[data-solution]').count();
        const ids=await page.locator('[data-solution]').evaluateAll(nodes=>nodes.map(x=>x.dataset.solution));
        assert.equal(new Set(ids).size,ids.length,`${entry.output}: doppelte Lösungs-ID`);
        if(source==='gruppe-b.html' && viewport.width===1440) {
          const python=await page.locator('pre code').evaluateAll(nodes=>nodes.map(x=>x.textContent).find(x=>x.startsWith('from pathlib')));
          const syntax=spawnSync('python',['-c','import ast,sys; ast.parse(sys.stdin.read()); print("Python-Syntax gueltig")'],{input:python,encoding:'utf8'});
          assert.equal(syntax.status,0,syntax.stderr);
        }
        for (const theme of ['default','dark','dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme);
          for(let number=1;number<=pageCount;number++) {
            const section=page.locator(`section[data-wb-page="${number}"]`);
            assert(await section.isVisible(),`${entry.output}, Seite ${number}`);
            const geometry=await page.evaluate(() => {
              const toolbar=document.querySelector('.wb-topbar').getBoundingClientRect();
              const main=document.querySelector('.wb-content').getBoundingClientRect();
              const controls=[...document.querySelectorAll('.wb-topbar button,.wb-topbar select')].filter(x=>x.getBoundingClientRect().width).map(x=>{
                const r=x.getBoundingClientRect();return {label:x.getAttribute('aria-label')||x.className,x:r.x,right:r.right,bottom:r.bottom};
              });
              const active=document.querySelector('section[data-wb-page]:not([style*="display: none"])');
              const heading=active?.querySelector('h1')?.getBoundingClientRect();
              return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,toolbar:{bottom:toolbar.bottom,right:toolbar.right},mainTop:main.top,headingTop:heading?.top,controls};
            });
            assert(!geometry.overflow,`${entry.output} ${viewport.width} ${theme}: horizontaler Seitenüberlauf`);
            for(const control of geometry.controls) {
              assert(control.x>=-1 && control.right<=geometry.width+1,`${entry.output}: Toolbar ${control.label} abgeschnitten`);
              assert(control.bottom<=geometry.toolbar.bottom+1,`${entry.output}: Toolbarhöhe`);
            }
            assert(geometry.mainTop>=geometry.toolbar.bottom-1,`${entry.output}: Inhaltsbereich unter Toolbar`);
            if(number<pageCount) await page.locator('[data-wb-next]').click();
            pageChecks++;
          }
          if(pageCount>1) {
            await page.locator('[data-wb-prev]').click();
            assert(await page.locator(`section[data-wb-page="${pageCount-1}"]`).isVisible());
          }
          await page.locator('.wb-hamburger').click();
          await page.locator('.wb-page-list [data-wb-page="1"]').click();
          assert(await page.locator('section[data-wb-page="1"]').isVisible());
          if(await page.locator('.wb-book.nav-open').count()) await page.locator('.wb-hamburger').click();
          if(viewport.width<980) await page.waitForFunction(()=>document.querySelector('.wb-sidebar').getBoundingClientRect().right<=1);
          if(viewport.width===390 && theme==='dark-blue' && ['index.html','07-pi-linux.html','gruppe-a.html','gruppe-b.html'].includes(source)) {
            await page.screenshot({path:path.join(screenshots,entry.output.replace('.html','.png')),fullPage:true,animations:'disabled'});
          }
        }
        assert.deepEqual(errors,[],`${entry.output}: Browserfehler`);
        await context.close();
      }
      console.log(`OK ${entry.output}: ${pageCount} Book-Seiten, 3 Viewports, 3 Designs`);
    }
    console.log(`${Object.keys(files).length} Zuordnungen, ${solutionCount} Lösungsblöcke, ${pageChecks} Seitenansichten geprüft. Screenshots: ${screenshots}`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
