const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {metadata} = require('./check-musterloesungen.cjs');
const playwrightPath=process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP,'school-ki2-check/node_modules/playwright');
const {chromium} = require(playwrightPath);
const {PNG}=require(path.join(path.dirname(require.resolve(playwrightPath)),'../playwright-core/lib/utilsBundle.js'));
const root = path.resolve(__dirname,'..');
const output = path.join(process.env.TEMP,'school-reset-all-check');
const ignored = new Set(['.git','.codex','.agents','node_modules','assets','public','legacy_dont_read']);
function solutions(directory) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()) return ignored.has(entry.name)?[]:solutions(file);
    if(!/\.html?$/i.test(file)) return [];
    const source=metadata(fs.readFileSync(file,'utf8'))['musterloesung-source'];
    return source?[{source:path.resolve(directory,source),solution:file}]:[];
  });
}
const block=(type,cfg)=>`<div data-wb-type="${type}"><script class="wb-config" type="application/json">${JSON.stringify(cfg)}</script></div>`;
const fixture=`<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/allgemeines_format.css"></head><body>
<div data-wb-book><script class="wb-book-config" type="application/json">{"bookTitle":"Reset-Test","autoNav":true,"studentNameStorageKey":"fixture-name","onSubmit":"exportResults"}</script>
<section data-wb-page="1"><h1>Start</h1><p>Testmaterial</p></section>
<section data-wb-page="2"><h1>Aufgaben</h1>
${block('mcq',{id:'mcq',title:'Auswahl',questions:[{text:'Richtig?',choices:[{id:'a',label:'Ja'},{id:'b',label:'Nein'}],correct:['a']}]})}
${block('verify',{id:'verify',title:'Pruefen',statement:'Eine Aussage',answer:true})}
${block('cloze',{id:'cloze',title:'Luecke',bank:['Wort'],segments:[{t:'text',v:'Ein '},{t:'gap',a:'Wort'}]})}
${block('trace',{id:'trace',title:'Spur',columns:[{label:'Wert',hint:'Zahl'}],rows:[{cells:[{answers:['2']}]}]})}
${block('order',{id:'order',title:'Reihenfolge',items:['Erstens','Zweitens']})}
${block('categorize',{id:'categorize',title:'Sortieren',categories:[{id:'a',title:'Kategorie'}],items:[{label:'Begriff',category:'a'}]})}
${block('essay',{id:'essay',title:'Text',fields:[{key:'text',label:'Antwort',kind:'textarea'}]})}
${block('reveal',{id:'reveal',title:'Aufdecken',question:'Warum?',answer:'Darum.'})}
${block('reveal-img',{id:'revealimg',title:'Bild',question:'Bild?',src:'/assets/trace.svg'})}
<div data-p2 data-p2-id="pair"><div data-side="L" data-pair="one">Begriff</div><div data-side="R" data-pair="one">Erklaerung</div></div>
<div data-p2 data-p2-id="nested-pair"><div><div class="p2-banks"><div data-left-bank><div class="p2-piece" data-side="L" data-pair="one">Links</div></div><div data-right-bank><div class="p2-piece" data-side="R" data-pair="one">Rechts</div></div></div><div data-solved></div></div></div>
<textarea id="manual" data-wb-export="1" data-wb-label="Protokoll"></textarea></section></div>
<script src="/assets/allgemeines_format.js"></script><script>
SBLibrary.autoMountAll({storagePrefix:'fixture_'});
const key=SBBook.registerResetStorageKey('fixture-manual');
const field=document.getElementById('manual');field.value=localStorage.getItem(key)||'';
field.addEventListener('input',()=>localStorage.setItem(key,field.value));
</script></body></html>`;

async function main() {
  fs.mkdirSync(output,{recursive:true});
  const server=http.createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/__reset-fixture.html') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.htm':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  let views=0;
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.setDefaultTimeout(10000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**/*',route=>route.abort());
    await page.goto(base+'/__reset-fixture.html');
    await page.locator('.wb-theme-select').selectOption('dark');
    await page.locator('[data-wb-student-name]').fill('Vorheriger Name');
    await page.locator('.wb-page-list [data-wb-page="2"]').click();
    await page.locator('[data-wb-type="essay"] textarea').fill('Ein alter Freitext');
    await page.locator('#manual').fill('Ein altes Protokoll');
    await page.locator('[data-wb-type="trace"] input').fill('2');
    await page.locator('[data-wb-type="mcq"] input').first().check();
    const keys=await page.evaluate(()=>{
      const pageKey=location.pathname;
      const list=['mcq_mcq','mcq_verify','cloze_cloze','trace_trace','order_order','categorize_categorize','reveal_reveal','revealimg_revealimg'].map(item=>{
        const split=item.indexOf('_');return 'fixture_'+item.slice(0,split)+'_'+pageKey+'_'+item.slice(split+1);
      });
      list.push(`fixture_${pageKey}_essay__text`,`wb_p2_${pageKey}_pair`,`wb_p2_${pageKey}_nested-pair`,'fixture-manual','fixture-name');
      for(const key of list) if(localStorage.getItem(key)===null) localStorage.setItem(key,'previous answer');
      localStorage.setItem('other-lesson-answer','Bitte behalten');
      localStorage.setItem('wb_submit_cooldown_test','12345');
      return list;
    });
    await page.locator('.wb-page-list [data-wb-page="1"]').click();
    const before=await page.evaluate(()=>({...localStorage}));
    page.once('dialog',dialog=>dialog.dismiss());
    await page.locator('[data-wb-reset-all]').click();
    assert.deepEqual(await page.evaluate(()=>({...localStorage})),before,'Abbrechen veraendert keine gespeicherten Daten');
    assert.equal(await page.locator('#manual').inputValue(),'Ein altes Protokoll');
    assert.equal(await page.locator('[data-wb-type="essay"] textarea').inputValue(),'Ein alter Freitext');
    page.once('dialog',dialog=>dialog.accept());
    await Promise.all([page.waitForEvent('load'),page.locator('[data-wb-reset-all]').click()]);
    for(const key of keys) assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null,`Schluessel geloescht: ${key}`);
    assert.equal(await page.evaluate(()=>localStorage.getItem('other-lesson-answer')),'Bitte behalten');
    assert.equal(await page.evaluate(()=>localStorage.getItem('wb_submit_cooldown_test')),'12345');
    assert.equal(await page.locator('.wb-theme-select').inputValue(),'dark');
    assert.equal(await page.locator('[data-wb-student-name]').inputValue(),'');
    assert.equal(await page.locator('[data-wb-type="essay"] textarea').inputValue(),'');
    assert.equal(await page.locator('#manual').inputValue(),'');
    assert.equal(await page.locator('[data-wb-type="trace"] input').inputValue(),'');
    assert.equal(await page.locator('[data-wb-type="mcq"] input:checked').count(),0);
    assert(await page.locator('[data-wb-reset-all]').isVisible());
    assert.equal(await page.locator('[data-wb-reset-all]').count(),1);
    assert.deepEqual(errors,[]);
    console.log('Loeschen, Abbrechen, alle Aufgabentypen, Name, Zusatzfelder und Schutz fremder Daten geprueft.');

    for(const [file,key,selector] of [
      ['nwt/arduino-einstieg.html','nwt-arduino-einstieg-traces-v1','[data-trace]'],
      ['nwt/arduino-wiederholung.html','nwt-arduino-wiederholung-traces-v1','[data-trace]'],
      ['physik_misc/Einstieg.html','physik-einstieg-groessentabelle-v1','[data-entry]']
    ]) {
      await page.goto(base+'/'+file);
      await page.locator(selector).first().evaluate(node=>{node.value='Alter Eintrag';node.dispatchEvent(new Event('input',{bubbles:true}));});
      assert((await page.evaluate(key=>localStorage.getItem(key),key)).includes('Alter Eintrag'),file);
      await page.locator('.wb-page-list [data-wb-page="1"]').first().evaluate(node=>node.click());
      page.once('dialog',dialog=>dialog.accept());
      await Promise.all([page.waitForEvent('load'),page.locator('[data-wb-reset-all]').click()]);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null,file);
      assert.equal(await page.locator(selector).first().inputValue(),'',file);
    }
    console.log('Eigene Speichertabellen in Arduino-Einstieg, Arduino-Wiederholung und Physik-Einstieg geloescht.');

    await page.goto(base+'/__reset-fixture.html');
    await page.locator('[data-wb-student-name]').fill('Nicht verlieren');
    await page.evaluate(()=>{Storage.prototype.removeItem=function(){throw new DOMException('Speicher gesperrt','SecurityError');};});
    page.once('dialog',dialog=>dialog.accept());
    const failure=page.waitForEvent('dialog',dialog=>dialog.type()==='alert');
    const failedClick=page.locator('[data-wb-reset-all]').click();
    await (await failure).accept();
    await failedClick;
    assert.equal(await page.locator('[data-wb-student-name]').inputValue(),'Nicht verlieren');
    assert.equal(await page.evaluate(()=>localStorage.getItem('fixture-name')),'Nicht verlieren');
    console.log('Gesperrter Speicher: Fehlermeldung ohne Leeren der sichtbaren Antworten.');

    const files=solutions(root);
    for(const width of [1440,390,320]) {
      await page.setViewportSize({width,height:1000});
      for(const [index,{source}] of files.entries()) {
        const label=path.relative(root,source).replaceAll('\\','/');
        await page.goto(base+'/'+encodeURI(label),{waitUntil:'load'});
        const legacy=label==='wellen/wellen-book..html';
        const standalone=legacy||label==='felder/2026-Phy-Unterricht-Elektrische-Felder-Modus-B.html';
        const reset=page.locator(legacy?'#lesson-reset-all':standalone?'#reset':'[data-wb-reset-all]');
        assert.equal(await reset.count(),1,label);
        assert.equal(await reset.textContent(),'Alle Einträge löschen',label);
        if(!standalone) {
          assert.equal(await reset.evaluate(node=>node.closest('section[data-wb-page]').dataset.wbPage),'1',label);
          await page.locator('.wb-page-list [data-wb-page="1"]').first().evaluate(node=>node.click());
          const present=page.locator('.wb-present-btn[aria-pressed="true"]');
          if(await present.count()) await present.evaluate(node=>node.click());
        }
        for(const theme of standalone?['default']:['default','dark','dark-blue']) {
          if(!standalone) await page.locator('.wb-theme-select').selectOption(theme,{force:true});
          assert(await reset.isVisible(),`${label}/${width}/${theme}: Button auf erster Seite sichtbar`);
          await reset.scrollIntoViewIfNeeded();
          const geometry=await reset.evaluate(node=>{
            const r=node.getBoundingClientRect(),s=getComputedStyle(node);
            return {width:r.width,left:r.left,right:r.right,scroll:node.scrollWidth,client:node.clientWidth,color:s.color};
          });
          assert(geometry.width>60&&geometry.left>=-1&&geometry.right<=width+1,`${label}/${width}: Button erreichbar`);
          assert(geometry.scroll<=geometry.client+1,`${label}/${width}: Text passt`);
          // Screenshot pixels include translucent controls and the gradients behind them.
          const png=PNG.sync.read(await reset.screenshot()),channels=[[],[],[]];
          for(let y=5;y<png.height-5;y+=2) for(let x=5;x<png.width-5;x+=2) {
            const offset=(y*png.width+x)*4;
            channels.forEach((values,i)=>values.push(png.data[offset+i]));
          }
          const bg=channels.map(values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]);
          const rgba=geometry.color.match(/[\d.]+/g).map(Number),alpha=rgba[3]??1;
          const fg=bg.map((value,i)=>value*(1-alpha)+rgba[i]*alpha);
          const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
          const a=luminance(fg),b=luminance(bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          assert(contrast>=4.5,`${label}/${width}/${theme}: Textkontrast ${contrast.toFixed(1)}`);
          views++;
        }
        if(label==='nwt/arduino-3.html') {
          await reset.screenshot({path:path.join(output,`button-${width}.png`)});
          if(width===1440) {
            await page.locator('textarea[data-wb-export]').first().evaluate(node=>{node.value='Altes Protokoll';node.dispatchEvent(new Event('input',{bubbles:true}));});
            page.once('dialog',dialog=>dialog.accept());
            await Promise.all([page.waitForEvent('load'),reset.click()]);
            assert.equal(await page.locator('textarea[data-wb-export]').first().inputValue(),'');
          }
        }
        if((index+1)%10===0) console.log(`${width}px: ${index+1}/${files.length} Lernseiten geprueft.`);
      }
      console.log(`${width}px: ${files.length} Lernseiten mit Loeschbutton geprueft.`);
    }
    for(const {solution} of files) {
      await page.goto(pathToFileURL(solution).href,{waitUntil:'load'});
      assert.equal(await page.locator('[data-wb-reset-all]').count(),0,path.relative(root,solution));
    }
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    assert.equal(await page.locator('[data-wb-reset-all]').count(),0,'Kein Loeschbutton in der Uebersicht');
    console.log(`${views} Ansichten und ${files.length} Musterloesungen erfolgreich geprueft. Screenshots: ${output}`);
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
