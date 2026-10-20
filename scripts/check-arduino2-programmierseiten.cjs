const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP,'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname,'..');
const output = path.join(process.env.TEMP,'school-arduino2-programmierseiten-check');
fs.mkdirSync(output,{recursive:true});

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    for(const width of [1440,390,320]) {
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('https://**/*',route=>route.abort());
      for(const solution of [false,true]) {
        const file = solution ? 'arduino-2-kupferband71.html' : 'arduino-2.html';
        await page.goto(pathToFileURL(path.join(root,'nwt',file)).href,{waitUntil:'domcontentloaded'});
        const numbers = await page.locator('section[data-wb-page]:not([data-wb-results])').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.wbPage)));
        assert.deepEqual(numbers,[1,2,3,4,5,6,7,8]);
        if(!solution) {
          assert.equal(await page.locator('section[data-wb-page="3"] h3#blink-start').textContent(),'Aufgabe: Selber programmieren');
          assert.equal(await page.locator('section[data-wb-page="4"] .error-example').count(),5);
          assert.equal(await page.locator('section[data-wb-page="4"] img[src*="pdf-bilder/"]').count(),0);
          assert.equal(await page.locator('section[data-wb-page="5"] .programming-task').count(),5);
          assert.equal(await page.locator('section[data-wb-page="5"] img[src$="seite09.png"]').count(),5);
          for(const id of ['material-4-3','material-4-4','material-4-5','material-4-6','material-4-7']) {
            assert.equal(await page.locator(`#${id} .task-excerpt img`).count(),1,id);
            assert.equal(await page.locator(`#${id} .task-excerpt`).evaluate(node=>getComputedStyle(node).maxWidth),'320px',id);
          }
          assert.equal(await page.locator('section[data-wb-page="5"] .programming-task pre').count(),3);
          assert.equal(await page.locator('[data-wb-type][data-wb-mounted],[data-p2][data-p2-mounted]').count(),25);
          assert.equal(await page.locator('#ide-orientierung').count(),1);
          assert.equal(await page.locator('[data-p2-id="arduino2_command_pairs"] [data-side="L"]').count(),6);
          assert.equal(await page.locator('section[data-wb-page="6"] .task-excerpt').count(),3);
          assert.equal(await page.locator('section[data-wb-page="7"] .task-excerpt').count(),3);
          for(const [selector,limit] of [['.speaker-excerpt','140px'],['.keyboard-excerpt','220px'],['.function-excerpt','220px'],['.melody-excerpt','500px'],['.transistor-excerpt','110px'],['.circuit-excerpt','180px']]) {
            assert.equal(await page.locator(selector).evaluate(node=>getComputedStyle(node).maxWidth),limit,selector);
          }
          assert.equal(await page.locator('section[data-wb-page="6"] .pdfpage,section[data-wb-page="7"] .pdfpage').count(),0);
          assert((await page.locator('#material-5-3').textContent()).includes('1-kΩ-Widerstand'));
          assert((await page.locator('#material-5-3').textContent()).includes('330 Ω'));
          assert(!(await page.locator('section[data-wb-page="8"]').textContent()).includes('TXT-Datei'));
        } else {
          assert.equal(await page.locator('input:visible,textarea:visible,.wb-submit-btn:visible').count(),0);
          for(const id of ['material_4_3','material_4_4','material_4_5','material_4_6','material_4_7','arduino2_programming_protocol']) {
            assert.equal(await page.locator(`section[data-wb-page="5"] [data-solution="${id}"]`).count(),1,id);
          }
          assert.equal(await page.locator('section[data-wb-page="4"] [data-solution="arduino2_error_diagnosis"]').count(),1);
          assert.equal(await page.locator('section[data-wb-page="6"] [data-solution="material_5_1"]').count(),1);
          assert.equal(await page.locator('section[data-wb-page="7"] [data-solution="material_5_2"]').count(),1);
          for(const id of ['arduino2_command_pairs','ide-orientierung','lautsprecher-anschliessen','ton-test','material_5_3']) {
            assert.equal(await page.locator(`[data-solution="${id}"]`).count(),1,id);
          }
        }
        assert.equal(await page.locator('section[data-wb-page="6"] .speaker-schematic img[src$="lautsprecher-mit-vorwiderstand.svg"]').count(),1);
        for(const theme of ['default','dark','dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme,{force:true});
          for(const number of numbers) {
            await page.locator(`.wb-page-list [data-wb-page="${number}"]`).first().evaluate(button=>button.click());
            const issues = await page.locator(`section[data-wb-page="${number}"]`).evaluate(section=>{
              const issues = [];
              const paper = section.closest('.wb-paper').getBoundingClientRect();
              if(document.documentElement.scrollWidth>innerWidth+1) issues.push('Horizontaler Seitenüberlauf');
              for(const node of section.querySelectorAll('h2,h3,h4,.programming-task,.error-example,.error-code-pair,.code-card,.task-excerpt,.speaker-schematic,.sound-layout,.wire-path,.note-table,.p2-piece')) {
                const rect = node.getBoundingClientRect();
                if(rect.width && (rect.right>paper.right+1 || rect.left<paper.left-1)) issues.push('Inhalt ragt aus der Seite');
                if(/^H[23]$/.test(node.tagName) && node.scrollWidth>node.clientWidth+1) issues.push('Überschrift läuft über');
              }
              for(const image of section.querySelectorAll('img')) if(!image.complete || !image.naturalWidth) issues.push('Bild fehlt');
              for(const excerpt of section.querySelectorAll('.task-excerpt')) {
                const style = getComputedStyle(excerpt);
                const crop = excerpt.querySelector('.task-excerpt-window').getBoundingClientRect();
                const image = excerpt.querySelector('img').getBoundingClientRect();
                const width = Number(style.getPropertyValue('--crop-width'));
                const height = Number(style.getPropertyValue('--crop-height'));
                const left = Number(style.getPropertyValue('--crop-left'));
                const top = Number(style.getPropertyValue('--crop-top'));
                const scale = crop.width / width;
                const sourceWidth = Number(style.getPropertyValue('--source-width')) || 1188;
                if(Math.abs(crop.height - height*scale)>1 || Math.abs(image.width-sourceWidth*scale)>1) issues.push('Bildmaßstab stimmt nicht');
                if(Math.abs(image.left-(crop.left-left*scale))>1 || Math.abs(image.top-(crop.top-top*scale))>1) issues.push('Falscher Bildausschnitt');
                if(image.right<crop.right-1 || image.bottom<crop.bottom-1) issues.push('Bild deckt den Ausschnitt nicht ab');
              }
              if(['dark','dark-blue'].includes(section.closest('.wb-book').dataset.theme)) {
                const rgba = color=>{
                  const values=color.match(/[\d.]+/g)?.map(Number);
                  return values?.length>=3 ? [...values.slice(0,3),values[3]??1] : [0,0,0,0];
                };
                const blend = (front,back)=>[...front.slice(0,3).map((value,i)=>value*front[3]+back[i]*(1-front[3])),1];
                const light = color=>color.slice(0,3).map(value=>value/255).map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
                for(const node of section.querySelectorAll('.task-excerpt figcaption,.speaker-schematic figcaption,.wire-path,.note-table th,.note-table td,.p2-piece')) {
                  const ancestors=[];
                  for(let parent=node;parent;parent=parent.parentElement) ancestors.push(parent);
                  const background=ancestors.reverse().reduce((back,parent)=>{
                    const style=getComputedStyle(parent);
                    const flat=blend(rgba(style.backgroundColor),back);
                    const stops=style.backgroundImage.match(/rgba?\([^)]+\)/g);
                    return stops?.length ? blend(rgba(stops.at(-1)),flat) : flat;
                  },[255,255,255,1]);
                  const foreground=blend(rgba(getComputedStyle(node).color),background);
                  const contrast=(Math.max(light(foreground),light(background))+.05)/(Math.min(light(foreground),light(background))+.05);
                  if(contrast<4.5) issues.push(`Textkontrast ${contrast.toFixed(2)}: ${node.textContent.trim().slice(0,50)}`);
                }
              }
              return issues;
            });
            assert.deepEqual(issues,[],`${file}, ${number}, ${width}px/${theme}`);
            if(!solution && [2,3,4,5,6,7].includes(number)) {
              await page.screenshot({path:path.join(output,`seite-${number}-${width}-${theme}.png`),fullPage:true});
              if(number===5) {
                for(const id of ['material-4-3','material-4-4','material-4-5','material-4-6','material-4-7']) {
                  const excerpt = page.locator(`#${id} .task-excerpt`);
                  const height = Math.ceil(await excerpt.evaluate(node=>node.getBoundingClientRect().height));
                  await page.setViewportSize({width,height:Math.max(1000,height+240)});
                  await excerpt.screenshot({path:path.join(output,`${id}-${width}-${theme}.png`)});
                  await page.setViewportSize({width,height:1000});
                }
              }
              if([6,7].includes(number)) {
                const excerpts = page.locator(`section[data-wb-page="${number}"] .task-excerpt`);
                for(let index=0;index<await excerpts.count();index++) {
                  const excerpt = excerpts.nth(index);
                  const height = Math.ceil(await excerpt.evaluate(node=>node.getBoundingClientRect().height));
                  await page.setViewportSize({width,height:Math.max(1000,height+240)});
                  await excerpt.screenshot({path:path.join(output,`seite-${number}-ausschnitt-${index}-${width}-${theme}.png`)});
                  await page.setViewportSize({width,height:1000});
                }
                if(number===6) await page.locator('.speaker-schematic').screenshot({path:path.join(output,`lautsprecher-schaltbild-${width}-${theme}.png`)});
              }
            }
          }
        }
        if(!solution) {
          await page.locator('.wb-page-list [data-wb-page="5"]').first().evaluate(button=>button.click());
          await page.locator('[data-wb-key="protokoll"]').fill('Pin 13; 1000, 500, 1000 und 1500 ms. Beobachtung und Vorhersage stimmen überein.');
          const pairs = page.locator('[data-p2-id="arduino2_command_pairs"]');
          await pairs.evaluate(node=>{
            for(let index=1;index<=6;index++) {
              node.querySelector(`[data-side="L"][data-pair="${index}"]`).click();
              node.querySelector(`[data-side="R"][data-pair="${index}"]`).click();
            }
            node.__p2.check();
          });
          assert.equal(await pairs.locator('.p2-joined[data-correct="1"]').count(),6);
          assert.equal(await pairs.evaluate(node=>[...node.querySelectorAll('.p2-joined')].some(pair=>pair.scrollWidth>pair.clientWidth+1)),false);
          await page.locator('.wb-page-list [data-wb-page="6"]').first().evaluate(button=>button.click());
          await page.locator('[data-wb-key="s10_q1"]').fill('Eine höhere Frequenz ergibt einen höheren Ton.');
          await page.reload();
          assert.equal(await page.locator('[data-wb-key="s10_q1"]').inputValue(),'Eine höhere Frequenz ergibt einen höheren Ton.');
          assert((await page.locator('[data-wb-key="protokoll"]').inputValue()).includes('Pin 13'));
          assert.equal(await pairs.locator('.p2-joined[data-correct="1"]').count(),6);
          assert.equal(await page.locator('[data-p2-id="arduino2_tone_pairs"] .p2-piece').count(),8);
        }
      }
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`OK ${width}px: acht Kapitel, getrennte Fehler-/Aufgabenseiten, Musterlösung, drei Designs und gespeicherte Antworten.`);
    }
  } finally {
    await browser.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
