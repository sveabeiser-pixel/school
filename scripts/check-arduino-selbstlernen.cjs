const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL,fileURLToPath} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP,'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname,'..');
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['arduino-3','arduino-4','arduino-5','arduino-6','arduino-motoren'];
const output = path.join(process.env.TEMP,'school-arduino-selbstlernen-check');
fs.mkdirSync(output,{recursive:true});

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const issues = [];
  let views = 0;
  try {
    for(const width of [1440,390,320]) {
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page = await context.newPage();
      await page.route('https://**/*',route=>route.abort());
      let errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      for(const name of names) {
        const spec=JSON.parse(fs.readFileSync(path.join(root,'nwt/musterantworten',name+'.json'),'utf8'));
        for(const [file,solution] of [[spec.source,false],[spec.output,true]]) {
          errors=[];
          await page.goto(pathToFileURL(path.join(root,file)).href,{waitUntil:'load'});
          await page.waitForSelector('.wb-book');
          for(const link of await page.locator('img[src],script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(node=>node.src||node.href))) {
            if(link.startsWith('file:')&&!fs.existsSync(fileURLToPath(new URL(link)))) issues.push(`${file}: Datei fehlt ${link}`);
          }
          if(solution) assert.equal(await page.locator('input:visible,textarea:visible,.wb-submit-btn:visible').count(),0,file);
          else {
            const missing=await page.locator('[data-wb-type]:not([data-wb-rendered]),[data-p2]').evaluateAll(nodes=>nodes.filter(node=>!node.hasAttribute('data-wb-mounted')&&!node.hasAttribute('data-p2-mounted')&&!node.querySelector('[data-wb-mounted],[data-p2-mounted]')).length);
            assert.equal(missing,0,`${file}: nicht initialisierte Aufgaben`);
            await page.locator('[data-p2]').evaluateAll(nodes=>{
              for(const node of nodes) {
                if(!node.__p2) continue;
                node.__p2.reset();
                const pairs=[...node.querySelectorAll('[data-side="L"][data-pair]')].map(piece=>piece.dataset.pair);
                for(const pair of pairs) {
                  node.querySelector(`[data-side="L"][data-pair="${CSS.escape(pair)}"]`).click();
                  node.querySelector(`[data-side="R"][data-pair="${CSS.escape(pair)}"]`).click();
                }
                node.__p2.check();
                if(node.querySelectorAll('.p2-joined[data-correct="1"]').length!==pairs.length) throw new Error('Paarprüfung fehlgeschlagen');
              }
            });
            if(name==='arduino-4') {
              await page.locator('[data-pudding-flow]').evaluate(node=>{
                for(const drop of node.querySelectorAll('[data-accept]')) {
                  node.querySelector(`[data-token="${CSS.escape(drop.dataset.accept)}"]`).click();
                  drop.click();
                }
                node.querySelector('[data-pudding-check]').click();
              });
              assert.equal(await page.locator('.pudding-drop.ok').count(),9,'Pudding-Zuordnung');
            }
          }
          const numbers=await page.locator('section[data-wb-page]:not([data-wb-results])').evaluateAll(nodes=>nodes.map(node=>node.dataset.wbPage));
          for(const theme of ['default','dark','dark-blue']) {
            await page.locator('.wb-theme-select').selectOption(theme,{force:true});
            for(const number of numbers) {
              await page.locator(`.wb-page-list [data-wb-page="${number}"]`).first().evaluate(node=>node.click());
              const problems=await page.locator(`section[data-wb-page="${number}"]`).evaluate((section,{theme})=>{
                const problems=[];
                const paper=section.closest('.wb-paper').getBoundingClientRect();
                if(document.documentElement.scrollWidth>innerWidth+1) problems.push('Seitenüberlauf');
                for(const node of section.querySelectorAll('h1,h2,h3,p,ol,ul,figure,.wb-block,.p2-piece')) {
                  if(node.closest('.wb-trace-scroll,.solution-table,pre,[hidden]')) continue;
                  const rect=node.getBoundingClientRect();
                  if(!rect.width) continue;
                  if(rect.left<paper.left-2||rect.right>paper.right+2) problems.push(`Inhalt außerhalb: ${node.tagName}.${node.className} ${node.textContent.trim().slice(0,45)}`);
                  if(/^H[123]$/.test(node.tagName)&&node.scrollWidth>node.clientWidth+1) problems.push('Überschrift läuft über: '+node.textContent.trim().slice(0,50));
                }
                for(const image of section.querySelectorAll('img')) if(!image.complete||!image.naturalWidth) problems.push('Bild fehlt: '+image.getAttribute('src'));
                for(const drop of section.querySelectorAll('.pudding-drop.filled')) {
                  const parent=drop.getBoundingClientRect();
                  const child=drop.querySelector('.pudding-chip').getBoundingClientRect();
                  if(child.width&& !drop.classList.contains('pudding-diamond')&&(child.left<parent.left-1||child.right>parent.right+1||child.top<parent.top-1||child.bottom>parent.bottom+1)) problems.push('Pudding-Text läuft aus seinem Feld');
                }
                for(const node of document.querySelectorAll('.wb-topbar select,.wb-topbar button')) {
                  const rect=node.getBoundingClientRect();
                  if(rect.width&&(rect.left < -1||rect.right>innerWidth+1)) problems.push('Kopfzeilen-Bedienelement nicht erreichbar');
                }
                if(theme!=='default') {
                  const rgb=value=>{const values=value.match(/[\d.]+/g)?.map(Number);return values?.length>=3?[...values.slice(0,3),values[3]??1]:[0,0,0,0];};
                  const over=(front,back)=>[...front.slice(0,3).map((value,i)=>value*front[3]+back[i]*(1-front[3])),1];
                  const luminance=color=>color.slice(0,3).map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
                  const walker=document.createTreeWalker(section,NodeFilter.SHOW_TEXT);
                  let node;
                  while((node=walker.nextNode())) {
                    const text=node.textContent.trim();
                    const parent=node.parentElement;
                    if(!text||parent.closest('script,style,button,select,option')||!parent.getClientRects().length) continue;
                    const ancestors=[];
                    for(let element=parent;element;element=element.parentElement) ancestors.push(element);
                    const background=ancestors.reverse().reduce((back,element)=>{
                      const style=getComputedStyle(element);
                      const flat=over(rgb(style.backgroundColor),back);
                      const stops=style.backgroundImage.match(/rgba?\([^)]+\)/g);
                      return stops?.length?over(rgb(stops.at(-1)),flat):flat;
                    },[255,255,255,1]);
                    const foreground=over(rgb(getComputedStyle(parent).color),background);
                    const ratio=(Math.max(luminance(foreground),luminance(background))+.05)/(Math.min(luminance(foreground),luminance(background))+.05);
                    if(ratio<3) problems.push(`Kontrast ${ratio.toFixed(2)}: ${text.slice(0,65)}`);
                  }
                }
                return [...new Set(problems)];
              },{theme});
              for(const problem of problems) issues.push(`${file}, ${width}px/${theme}, Seite ${number}: ${problem}`);
              if(!solution&&[1,2,3,5].includes(Number(number))) await page.screenshot({path:path.join(output,`${name}-${number}-${width}-${theme}.png`),fullPage:true});
              if(!solution&&width===1440&&theme==='default') {
                const figures=page.locator(`section[data-wb-page="${number}"] figure,section[data-wb-page="${number}"] .pdfpage`);
                for(let index=0;index<await figures.count();index++) {
                  const figure=figures.nth(index);
                  const height=Math.ceil(await figure.evaluate(node=>node.getBoundingClientRect().height));
                  if(height>20) {
                    await page.setViewportSize({width,height:Math.max(1000,height+240)});
                    await figure.screenshot({path:path.join(output,`${name}-${number}-material-${index}.png`)});
                    await page.setViewportSize({width,height:1000});
                  }
                }
              }
              views++;
            }
          }
          if(!solution) {
            const field=page.locator('[data-wb-key][data-wb-field="1"],textarea[data-wb-key]').first();
            if(await field.count()) {
              await field.evaluate(node=>{node.value='Test: Aufbau, Vorhersage und Beobachtung.';node.dispatchEvent(new Event('input',{bubbles:true}));});
              const key=await field.getAttribute('data-wb-key');
              await page.reload({waitUntil:'load'});
              assert.equal(await page.locator(`[data-wb-key="${key}"]`).first().inputValue(),'Test: Aufbau, Vorhersage und Beobachtung.',file);
            }
          }
          for(const error of errors) issues.push(`${file}: JavaScript ${error}`);
        }
      }
      await context.close();
      console.log(`${width}px: ${names.length} Lernseiten samt Lösungen und drei Designs geprüft.`);
    }
  } finally {await browser.close();}
  const distinct=[...new Set(issues)];
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(distinct,null,2),'utf8');
  for(const issue of distinct.slice(0,50)) console.error(issue);
  console.log(`${views} Ansichten, ${distinct.length} Probleme. Bericht: ${output}`);
  if(distinct.length) process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
