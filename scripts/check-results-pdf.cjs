const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'school-ki2-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const output = path.join(process.env.TEMP, 'school-results-pdf-check');
const pdfText = process.env.PDFTOTEXT || 'C:/Program Files/poppler-25.12.0/Library/bin/pdftotext.exe';
fs.mkdirSync(output, { recursive:true });

const configs = [
  ['mcq', {id:'mcq', title:'Auswahl: Größen', questions:[{text:'Was ist eine Größe?', choices:[{id:'A',label:'Temperatur'},{id:'B',label:'Ein Dateiname'}],correct:['A'],explain:'Temperatur ist eine messbare Größe.'}]}],
  ['verify', {id:'verify', title:'Wahr oder falsch?',statement:'Ein Ausgang kann eine LED steuern.',answer:true,explain:'Der Ausgang steuert die Schaltung.'}],
  ['cloze', {id:'cloze',title:'Lückentext',bank:['Strom','Spannung'],segments:[{t:'text',v:'Es fließt '},{t:'gap',a:'Strom'},{t:'text',v:'. Gemessen wird die '},{t:'gap',a:'Spannung'},{t:'text',v:'.'}]}],
  ['order', {id:'order',title:'Ablauf ordnen',items:['Start','Blinken']}],
  ['categorize', {id:'categorize',title:'Eingänge und Ausgänge',categories:[{id:'in',title:'Eingang'},{id:'out',title:'Ausgang'}],items:[{label:'Taster',category:'in'},{label:'LED',category:'out'}]}],
  ['trace', {id:'trace',title:'Ablaufspur',columns:[{label:'Schritt'},{label:'Anweisung'},{label:'Wert danach'}],rows:[{cells:[{given:'1'},{given:'x = 10',code:true},{answers:['10']}]},{cells:[{given:'2'},{given:'x = x + 2',code:true},{answers:['12']}]}]}],
  ['essay', {id:'essay',title:'Code und Begründung',fields:[{key:'answer',label:'Deine Begründung',kind:'textarea'}]}]
];
const block = ([type,config]) => `<div data-wb-type="${type}"><script class="wb-config" type="application/json">${JSON.stringify(config)}</script></div>`;
const asset = name => pathToFileURL(path.join(root, 'assets', name)).href;
const fixture = path.join(output, 'fixture.html');
fs.writeFileSync(fixture, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF-Test</title><link rel="stylesheet" href="${asset('allgemeines_format.css')}"><link rel="stylesheet" href="${asset('musterloesungen.css')}"></head><body><div data-wb-book><script class="wb-book-config" type="application/json">${JSON.stringify({bookTitle:'PDF-Test',sectionTitle:'Größen, Kräfte und Code',onSubmit:'exportResults',exportName:'test-ergebnisse.txt',autoNav:true,webhookUrl:'https://example.test/submission',webhookEmail:'lehrkraft@example.test'})}</script><section data-wb-page="1" data-wb-page-title="Geschlossene Aufgaben"><h1>Geschlossene Aufgaben</h1>${configs.slice(0,6).map(block).join('')}<div data-p2 data-p2-title="Bauteile zuordnen"><div data-side="L" data-pair="1">LED</div><div data-side="R" data-pair="1">Licht</div><div data-side="L" data-pair="2">Taster</div><div data-side="R" data-pair="2">Eingabe</div></div></section><section data-wb-page="2" data-wb-page-title="Begründung"><h1>Begründung</h1>${block(configs[6])}<textarea data-wb-export data-wb-label="Notizen"></textarea></section></div><script src="${asset('allgemeines_format.js')}"></script><script>SBLibrary.autoMountAll();</script></body></html>`, 'utf8');

function extract(filename){
  const result = spawnSync(pdfText, ['-layout', filename, '-'], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

async function main(){
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    for(const variant of ['filled','empty','scorm','retry','webhook-failure']){
      const context = await browser.newContext({acceptDownloads:true, viewport:{width:variant === 'filled' ? 1440 : variant === 'retry' ? 320 : 390,height:1000},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      const downloads = [];
      page.on('download', download => downloads.push(download.suggestedFilename()));
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      await page.addInitScript(settings => {
        window.sent = [];
        window.scormValues = {};
        window.fetch = async (url, options) => {
          window.sent.push({url, body:JSON.parse(options.body)});
          if(settings.fail) throw new Error('Simulierter Webhook-Fehler');
          return new Response('{}', {status:200});
        };
        if(settings.scorm) window.API = {LMSInitialize:()=> 'true', LMSSetValue:(key,value) => {window.scormValues[key]=value;return 'true';}, LMSGetValue:()=> '', LMSCommit:()=> 'true', LMSFinish:()=> 'true'};
      }, {scorm:variant === 'scorm', fail:variant === 'webhook-failure'});
      if(variant === 'retry') await page.route('**/wb-results-pdf.js', route => route.abort());
      await page.goto(pathToFileURL(fixture).href);
      await page.evaluate(() => {
        const puzzle = document.querySelector('[data-p2]');
        const left = document.createElement('div'); left.setAttribute('data-left-bank', '');
        const right = document.createElement('div'); right.setAttribute('data-right-bank', '');
        const solved = document.createElement('div'); solved.setAttribute('data-solved', '');
        for(const piece of puzzle.querySelectorAll('[data-side]')){
          piece.classList.add('p2-piece');
          (piece.dataset.side === 'L' ? left : right).appendChild(piece);
        }
        puzzle.replaceChildren(left, right, solved);
        SBPuzzle2.mountOne(puzzle);
      });
      await page.evaluate(filled => {
        document.querySelector('[data-wb-student-name]').value = 'Lena Müller';
        if(!filled) return;
        document.querySelector('[data-wb-type="mcq"] input[value="A"]').checked = true;
        document.querySelector('[data-wb-type="verify"] input[value="true"]').checked = true;
        const cloze = [...document.querySelectorAll('.wb-gap')];
        cloze.forEach(gap => {const chip=document.createElement('span');chip.className='wb-chip';chip.dataset.token='Strom';chip.textContent='Strom';gap.appendChild(chip);});
        const order = document.querySelector('[data-wb-type="order"]');
        const drops = [...order.querySelectorAll('.wb-order-drop')];
        const chips = [...order.querySelectorAll('.wb-order-chip')];
        drops.forEach(drop => drop.appendChild(chips.find(chip => chip.dataset.id !== drop.dataset.expectedId)));
        const cat = document.querySelector('[data-wb-type="categorize"]');
        const zone = cat.querySelector('[data-category="in"]');
        [...cat.querySelectorAll('.wb-categorize-chip')].forEach(chip => zone.appendChild(chip));
        document.querySelectorAll('[data-wb-trace-field]').forEach((field,index) => {field.value=index ? '11' : '10';});
        const puzzle = document.querySelector('[data-p2]');
        puzzle.querySelector('[data-side="L"][data-pair="1"]').click();
        puzzle.querySelector('[data-side="R"][data-pair="1"]').click();
        document.querySelector('[data-wb-key="answer"]').value = 'Ich prüfe Größe und äußere Kräfte. 5 µm; α + β = 90°.\n<script>window.pwned=true</script>\n' + Array.from({length:140},(_,i)=>`Zeile ${i + 1}: Die Spannung beträgt 5 V. Meine Begründung bleibt auch auf der nächsten PDF-Seite vollständig lesbar.`).join('\n') + '\nENDE-DER-LANGEN-ANTWORT';
        document.querySelector('[data-wb-export]').value = 'Zusätzliche Notiz: Wärme, Ω und Δ. Mathematik: ∝ ≤ ≥ → √ ∞. Code: while(x<limit).';
      }, variant === 'filled' || variant === 'scorm');
      let download;
      if(variant === 'retry'){
        await page.locator('.wb-submit-btn').evaluate(button => button.click());
        await page.waitForFunction(() => document.querySelector('.wb-results-pdf-status').textContent.includes('konnte nicht'));
        await page.unroute('**/wb-results-pdf.js');
        const waiting = page.waitForEvent('download');
        await page.locator('[data-wb-pdf-download]').click();
        download = await waiting;
      }else{
        const waiting = page.waitForEvent('download');
        await page.locator('.wb-submit-btn').evaluate(button => button.click());
        download = await waiting;
      }
      assert.equal(download.suggestedFilename(), 'test-ergebnisse.pdf');
      const filename = path.join(output, variant + '.pdf');
      await download.saveAs(filename);
      const geometry = await page.evaluate(() => {
        const problems = [];
        for(const card of document.querySelectorAll('.wb-results-card')){
          const rect = card.getBoundingClientRect();
          const content = card.querySelector('.wb-results-card-text').getBoundingClientRect();
          const ring = card.querySelector('.wb-results-ring').getBoundingClientRect();
          if(content.right > ring.left + 1 || rect.right > innerWidth + 1) problems.push('Fortschrittsanzeige überlappt');
        }
        return problems;
      });
      assert.deepEqual(geometry, []);
      assert.equal(fs.readFileSync(filename).subarray(0,5).toString(), '%PDF-');
      const text = extract(filename);
      for(const value of ['Deine Ergebnisse','Lena Müller','Geschlossene Aufgaben','Bauteile zuordnen','Taster']) assert(text.includes(value), value);
      assert(!text.includes('<b>Temperatur</b>'));
      assert(!text.includes('Keine Eingabe'));
      assert(!/Lücke \d/.test(text));
      if(variant === 'filled' || variant === 'scorm'){
        for(const value of ['α + β = 90°','5 µm','äußere Kräfte','window.pwned=true','ENDE-DER-LANGEN-ANTWORT','Zusätzliche Notiz','Ω und Δ','∝ ≤ ≥ → √ ∞','while(x<limit)','Nicht richtig','Nicht automatisch bewertet','50%']) assert(text.includes(value), value);
        assert.equal(await page.evaluate(() => window.pwned), undefined);
        assert(text.split('\f').length > 5);
        for(const value of ['Erwartete Antwort','Temperatur','Ausgang']) assert(text.includes(value), value);
        assert.equal((text.match(/Erwartete Antwort/g) || []).length, 4, 'Vier einzelne Korrekturen; der Lückentext wird als Ganzes verglichen.');
        assert(text.includes('Dein Lückentext'));
        assert(text.includes('Korrigierter Lückentext'));
      }else{
        assert(text.includes('Noch offen'));
        assert(/0\s*\/\s*9/.test(text));
        assert(!text.includes('Erwartete Antwort'));
        assert(!text.includes('Korrigierter Lückentext'));
        assert(!text.includes('Temperatur ist eine messbare Größe.'));
        assert(!text.includes('Der Ausgang steuert die Schaltung.'));
        assert(!text.includes('Temperatur'));
        assert(!/\bDeine Antwort\b/.test(text));
      }
      const sent = await page.evaluate(() => window.sent);
      assert.equal(sent.length, variant === 'scorm' ? 0 : 1);
      if(sent.length){
        assert.deepEqual(Object.keys(sent[0].body).sort(), ['email','message','name','submittedAt','submittedAtLocal','submittedAtTimeZone']);
        assert.equal(sent[0].body.name, 'Lena Müller');
        assert.equal(sent[0].body.email, 'lehrkraft@example.test');
        assert(sent[0].body.message.includes('Gesamtpunkte:'));
        assert(sent[0].body.message.includes('Ausgewaehlt:'));
      }
      if(variant === 'scorm') assert.equal(await page.evaluate(() => window.scormValues['cmi.core.score.raw']), '6');
      if(variant === 'webhook-failure') assert(await page.locator('.wb-results-webhook-status.is-error').count());
      const repeat = page.waitForEvent('download');
      await page.locator('[data-wb-pdf-download]').click();
      await repeat;
      assert.deepEqual(downloads, ['test-ergebnisse.pdf', 'test-ergebnisse.pdf'], 'Nur PDFs, kein zusätzlicher TXT-Download.');
      assert.equal((await page.evaluate(() => window.sent)).length, sent.length, 'PDF-Download darf keinen zusätzlichen Webhook senden.');
      if(variant !== 'retry') assert.deepEqual(errors, []);
      await page.locator('.wb-theme-select').selectOption('dark');
      await page.screenshot({path:path.join(output,variant+'-results.png'),animations:'disabled'});
      await context.close();
      console.log('OK ' + variant + ': PDF, Unicode, Aufgabentypen, Webhook und erneuter Download');
    }
    for(const mode of ['correct','partial']){
      const context = await browser.newContext({acceptDownloads:true});
      const page = await context.newPage();
      await page.addInitScript(() => {window.fetch=async()=>new Response('{}');});
      await page.goto(pathToFileURL(fixture).href);
      await page.evaluate(mode => {
        document.querySelector('[data-wb-student-name]').value = 'Lückentext-Test';
        for(const block of document.querySelectorAll('[data-wb-type]')) if(block.dataset.wbType !== 'cloze') block.remove();
        document.querySelector('[data-p2]')?.remove();
        document.querySelector('[data-wb-export]')?.remove();
        const mount = document.querySelector('[data-wb-type="cloze"]');
        const gaps = [...mount.querySelectorAll('.wb-gap')];
        const entered = mode === 'correct' ? ['Strom','elektrische Spannung'] : ['Spannung'];
        if(mode === 'correct'){
          mount.__wbConfig.segments[3].a = ['Spannung','elektrische Spannung'];
          gaps[1].setAttribute('data-answers',JSON.stringify(['Spannung','elektrische Spannung']));
        }else mount.__wbConfig.segments[3].a = 'HIDDEN-PARTIAL-SOLUTION';
        entered.forEach((word,index) => {
          const chip=document.createElement('span');chip.className='wb-chip';chip.dataset.token=word;chip.textContent=word;gaps[index].appendChild(chip);
        });
      },mode);
      const waiting = page.waitForEvent('download');
      await page.locator('.wb-submit-btn').evaluate(button => button.click());
      const download = await waiting;
      const filename = path.join(output,'cloze-'+mode+'.pdf');
      await download.saveAs(filename);
      const text = extract(filename);
      assert(!/Lücke \d/.test(text));
      if(mode === 'correct'){
        assert(text.includes('Es fließt Strom. Gemessen wird die elektrische Spannung.'));
        assert(!text.includes('Korrigierter Lückentext'));
        assert.equal((text.match(/elektrische Spannung/g) || []).length,1);
      }else{
        assert(text.includes('Korrigierter Lückentext'));
        assert(!text.includes('HIDDEN-PARTIAL-SOLUTION'));
        assert.equal((text.match(/\[offen\]/g) || []).length,2);
      }
      await context.close();
      console.log('OK Lückentext '+mode+': vollständiger Text, keine Einzelblöcke, offene Lösung bleibt verborgen');
    }
    const preview = await browser.newPage();
    await preview.goto(pathToFileURL(fixture).href);
    await preview.addScriptTag({url:asset('wb-results-pdf.js')});
    const example = await preview.evaluate(async () => {
      const report = {
        title:'Beispielauswertung: Arduino 2 – Upload, Blink und Funktionen', name:'Lena Müller (Beispiel)',
        submittedAt:{local:'13.10.2026, 14:30 Uhr',timeZone:'Europe/Berlin'},
        summary:{correct:3,total:4,taskDone:3,taskTotal:3,pageDone:2,pageTotal:2},
        chapters:[
          {number:1,title:'Arduino-IDE und Upload',tasks:[
            {title:'Board und Verbindung prüfen',type:'Multiple Choice',score:{correct:2,total:2},items:[
              {label:'Wozu dient die Arduino-IDE?',answer:'Ein Programm schreiben, prüfen und auf den Arduino übertragen.',expected:'Ein Programm schreiben, prüfen und auf den Arduino übertragen.',status:'correct'},
              {label:'Was wählst du vor dem Upload aus?',answer:'Das passende Board und den Port der USB-Verbindung.',expected:'Das passende Board und den Port der USB-Verbindung.',status:'correct'}
            ]}
          ]},
          {number:2,title:'Blinkprogramm verstehen',tasks:[
            {title:'setup() und loop()',type:'Wahr oder falsch',score:{correct:1,total:2},items:[
              {label:'setup() wird nach dem Start einmal ausgeführt.',answer:'Wahr',expected:'Wahr',status:'correct',explanation:'Hier legst du die Anfangseinstellungen fest, zum Beispiel die Verwendung eines Pins als Ausgang.'},
              {label:'delay(500) wartet 500 Sekunden.',answer:'Wahr',expected:'Falsch',status:'wrong',explanation:'Die Zeit ist in Millisekunden angegeben. 500 ms entsprechen einer halben Sekunde.'}
            ]},
            {title:'Den Blinkrhythmus erklären',type:'Freitext',items:[
              {label:'Deine Begründung',answer:'Die LED wird eingeschaltet. Nach delay(500) wird sie ausgeschaltet. Danach wartet das Programm wieder eine halbe Sekunde. Ein vollständiger Zyklus dauert damit ungefähr eine Sekunde. Weil diese Anweisungen in loop() stehen, wiederholt sich der Ablauf.',status:'open'}
            ]}
          ]}
        ]
      };
      const doc = await WBResultsPDF.create(report);
      return Array.from(new Uint8Array(doc.output('arraybuffer')));
    });
    fs.writeFileSync(path.join(output,'beispiel-arduino-ergebnisse.pdf'),Buffer.from(example));
    const comparison = await preview.evaluate(async () => {
      const report = {
        title:'Vergleich und Lösungsschutz', name:'Test', submittedAt:{local:'Test'},
        summary:{correct:1,total:3,taskDone:2,taskTotal:3,pageDone:1,pageTotal:1},
        chapters:[{number:1,title:'Korrekturen',tasks:[{title:'Drei Antwortzustände',type:'Test',items:[
          {label:'Richtige Eingabe',answer:'Meine richtige Auswahl',expected:'HIDDEN-CORRECT-SOLUTION',status:'correct'},
          {label:'Unbearbeitete Eingabe',answer:'',expected:'HIDDEN-EMPTY-SOLUTION',explanation:'HIDDEN-EMPTY-EXPLANATION',status:'empty'},
          {label:'Langer Vergleich',answer:'LEFT-BEGIN\n' + Array.from({length:100},(_,i)=>`LEFT-${i}: Eine lange falsche Eingabe mit Umlauten und einer nachvollziehbaren Begründung.`).join('\n') + '\nLEFT-END',expected:'RIGHT-BEGIN\n' + Array.from({length:100},(_,i)=>`RIGHT-${i}: Die korrigierte Antwort mit einer ausführlichen Erklärung.`).join('\n') + '\nRIGHT-END',status:'wrong'}
        ]}]}]
      };
      const doc = await WBResultsPDF.create(report);
      return Array.from(new Uint8Array(doc.output('arraybuffer')));
    });
    const comparisonFile = path.join(output,'vergleich-mehrseitig.pdf');
    fs.writeFileSync(comparisonFile,Buffer.from(comparison));
    const comparisonText = extract(comparisonFile);
    for(const marker of ['LEFT-BEGIN','LEFT-END','RIGHT-BEGIN','RIGHT-END']) assert(comparisonText.includes(marker));
    assert(!comparisonText.includes('HIDDEN-'));
    const bbox = spawnSync(pdfText,['-bbox',comparisonFile,'-'],{encoding:'utf8'});
    assert.equal(bbox.status,0,bbox.stderr);
    const layoutIssues = await preview.evaluate(xml => {
      const doc = new DOMParser().parseFromString(xml,'application/xml');
      const issues = [];
      for(const page of doc.querySelectorAll('page')){
        for(const word of page.querySelectorAll('word')){
          const left=Number(word.getAttribute('xMin')),right=Number(word.getAttribute('xMax'));
          const top=Number(word.getAttribute('yMin')),bottom=Number(word.getAttribute('yMax'));
          if(left<0 || right>Number(page.getAttribute('width'))+1 || top<0 || bottom>Number(page.getAttribute('height'))+1) issues.push('Text außerhalb des Papiers');
          if(word.textContent.startsWith('LEFT-') && right>310) issues.push('Linke Spalte überlappt');
          if(word.textContent.startsWith('RIGHT-') && left<310) issues.push('Rechte Spalte überlappt');
        }
      }
      return issues;
    },bbox.stdout);
    assert.deepEqual(layoutIssues,[]);
    console.log('OK Vergleich: richtige/offene Lösungen verborgen, zwei Spalten und mehrseitiger Umbruch');
    await preview.close();
  }finally{await browser.close();}
  console.log('PDF-Prüfung erfolgreich. Dateien: ' + output);
}
main().catch(error => { console.error(error); process.exitCode=1; });
