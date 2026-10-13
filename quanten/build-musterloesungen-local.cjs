const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {specs,table} = require('./musterloesungen-antworten.cjs');
const root = path.resolve(__dirname,'..');
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// Kleine TeX-Teilmenge der Antworttexte als natives, offline lesbares HTML.
function math(expression) {
  let i = 0;
  const names = {lambda:'λ',varphi:'φ',phi:'φ',rho:'ρ',omega:'ω',Psi:'Ψ',psi:'ψ',Delta:'Δ',mu:'µ',pi:'π',hbar:'ℏ',alpha:'α',beta:'β',cdot:'·',times:'×',ge:'≥',geq:'≥',approx:'≈',gtrsim:'≳',infty:'∞',dots:'…'};
  function group() {
    while(expression[i] === ' ') i++;
    if(expression[i] === '{'){ i++; return sequence('}'); }
    return atom();
  }
  function atom() {
    if(expression[i] === '{'){i++;return sequence('}');}
    if(expression[i] !== '\\') return esc(expression[i++] || '');
    i++;
    const match = /^[a-zA-Z]+/.exec(expression.slice(i));
    if(!match) { const symbol=expression[i++];return symbol===','||symbol===';'||symbol==='!'?' ':esc(symbol); }
    const command=match[0];i+=command.length;
    if(command==='frac'){const a=group(),b=group();return `<span class="math-frac"><span>${a}</span><span>${b}</span></span>`;}
    if(command==='text'||command==='mathrm'||command==='operatorname')return group();
    if(command==='vec')return `${group()}⃗`;
    if(command==='sqrt')return `√(${group()})`;
    if(['left','right'].includes(command))return '';
    if(['quad','qquad'].includes(command))return ' ';
    return names[command] || esc(command);
  }
  function sequence(end) {
    let out='';
    while(i<expression.length){
      if(expression[i]===end){i++;break;}
      if(expression[i]==='^'||expression[i]==='_'){const tag=expression[i++]==='^'?'sup':'sub';out+=`<${tag}>${group()}</${tag}>`;}
      else out+=atom();
    }
    return out;
  }
  return `<span class="solution-math">${sequence()}</span>`;
}
function text(value) {
  const input=String(value??'');
  const re=/\$([^$]+)\$|\\\(([\s\S]*?)\\\)/g;
  let out='',last=0;
  for(const m of input.matchAll(re)){out+=esc(input.slice(last,m.index))+math(m[1]??m[2]);last=m.index+m[0].length;}
  return out+esc(input.slice(last));
}
function render(task, answers) {
  const c=task.cfg;
  if(Object.hasOwn(answers,c.id))return `${task.type==='essay'?'<span class="solution-label">Eine mögliche Antwort</span>':''}${answers[c.id]}`;
  switch(task.type){
    case 'mcq':return c.questions.map((q,i)=>`<h4>${i+1}. ${text(q.text)}</h4><ul>${q.choices.filter(x=>q.correct.includes(x.id)).map(x=>`<li><b>${esc(x.id)}</b>: ${text(x.label)}</li>`).join('')}</ul>${q.explain?`<p>${text(q.explain)}</p>`:''}`).join('');
    case 'verify':return (c.questions||[c]).map(q=>`<p><b>${q.answer?'Wahr':'Falsch'}:</b> ${text(q.statement||q.text)}</p><p>${text(q.explain||'')}</p>`).join('');
    case 'cloze':return `<p>${c.segments.map(s=>s.t==='gap'?`<b>${text(Array.isArray(s.a)?s.a[0]:s.a)}</b>`:text(s.v)).join('')}</p>`;
    case 'order':return `<ol>${c.items.map(x=>`<li>${text(typeof x==='object'?x.label||x.text:x)}</li>`).join('')}</ol>`;
    case 'categorize':return table(['Kategorie','Zuordnung'],c.items.map(x=>[text(c.categories.find(k=>k.id===x.category)?.title||x.category),text(x.label)]));
    case 'trace':return table(c.columns.map(x=>text(typeof x==='string'?x:x.label)),c.rows.map(r=>r.cells.map(x=>text(Object.hasOwn(x,'given')?x.given:x.answers[0]))));
    case 'reveal':return `<p>${text(c.answer)}</p>`;
    case 'p2':return table(['Begriff','Bedeutung'],task.pairs.map(row=>row.map(text)));
    default:throw new Error(`Antwort fehlt: ${c.id} (${task.type})`);
  }
}
const css = `
.wb-book .wb-side-footer{display:none}
.solution-block{min-width:0;color:var(--wb-text)}
.solution-block h3{font-size:18px;line-height:1.45;margin:0 0 10px}
.solution-block h4{font-size:16px;line-height:1.5;margin:14px 0 8px}
.solution-label{display:block;font-size:13px;font-weight:700;color:var(--wb-muted);margin:0 0 8px}
.solution-table{max-width:100%;overflow-x:auto;margin:12px 0}
.solution-table table{width:100%;min-width:480px;border-collapse:collapse;table-layout:auto;font-size:14px;color:var(--wb-text)}
.solution-table th,.solution-table td{border:1px solid var(--wb-line);padding:9px 10px;text-align:left;vertical-align:top;background:transparent;color:var(--wb-text);overflow-wrap:normal}
.solution-table th{background:var(--wb-head-bg)}
.solution-table td{min-width:100px}
.solution-kicker{font-weight:700;color:var(--wb-accent);font-size:18px;margin-bottom:8px}
.solution-math{white-space:normal;font-family:Georgia,serif}
.math-frac{display:inline-flex;flex-direction:column;text-align:center;vertical-align:middle;line-height:1.3;margin:0 .15em}
.math-frac>span:first-child{border-bottom:1px solid currentColor}
.math-vector{text-decoration:overline;text-decoration-style:solid}
@media(max-width:980px){
.wb-book:not(.wb-present-mode){--wb-topH:112px}
.wb-book:not(.wb-present-mode) .wb-topbar{flex-wrap:wrap;gap:6px;padding:8px 12px;box-sizing:border-box}
.wb-book:not(.wb-present-mode) .wb-top-left{width:100%;min-width:0;gap:10px}
.wb-book:not(.wb-present-mode) .wb-hamburger{width:44px;height:44px;flex-shrink:0}
.wb-book:not(.wb-present-mode) .wb-brand{font-size:17px;line-height:1.25}
.wb-book:not(.wb-present-mode) .wb-top-right{width:100%;justify-content:space-between;gap:4px}
.wb-book:not(.wb-present-mode) .wb-theme-wrap{padding:4px;gap:0}
.wb-book:not(.wb-present-mode) .wb-theme-select{width:90px;padding:6px 4px}
.wb-book:not(.wb-present-mode) .wb-page-ind{min-width:36px;font-size:14px}
.wb-book:not(.wb-present-mode) .wb-icon-btn{width:32px;height:32px;flex-shrink:0}
}
`;
async function build(){
  const {chromium}=require(process.env.TEMP+'/school-ki2-check/node_modules/playwright');
  const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await b.newPage();
  try{
    for(const spec of specs){
      const sourcePath=path.join(root,spec.source),outputPath=path.join(root,spec.output);
      if(path.dirname(sourcePath)!==path.dirname(outputPath)||sourcePath===outputPath)throw new Error('Ungültiger Ausgabepfad');
      const bytes=fs.readFileSync(sourcePath);
      const data=await page.evaluate(html=>{
        const doc=new DOMParser().parseFromString(html,'text/html');
        const config=JSON.parse(doc.querySelector('.wb-book-config').textContent);
        const allPairs=[...doc.querySelectorAll('[data-p2]')];
        const pages=[...doc.querySelectorAll('section[data-wb-page]')].map(s=>{
          const heading=s.querySelector('h1,h2');
          const entries=[...s.querySelectorAll('h2,[data-wb-type],[data-p2]')].filter(x=>!x.parentElement.closest('[data-wb-type],[data-p2]')).map(e=>{
            if(e.tagName==='H2')return {heading:e.textContent};
            if(e.hasAttribute('data-p2')){
              const id=e.dataset.p2Id||e.id||`p2_${allPairs.indexOf(e)}`;
              const left=[...e.querySelectorAll('[data-side="L"][data-pair]')],right=[...e.querySelectorAll('[data-side="R"][data-pair]')];
              return {type:'p2',cfg:{id,title:e.dataset.p2Title||'Begriffspaare'},pairs:left.map(x=>[x.textContent.trim(),right.find(y=>y.dataset.pair===x.dataset.pair).textContent.trim()])};
            }
            return {type:e.dataset.wbType,cfg:JSON.parse(e.querySelector('.wb-config').textContent)};
          });
          return {number:s.dataset.wbPage,title:s.dataset.wbPageTitle,heading:heading.textContent,entries};
        });
        return {title:doc.title,config,pages,head:[...doc.head.querySelectorAll('link[rel="stylesheet"],style')].map(x=>x.outerHTML).join('\n')};
      },bytes.toString('utf8').replace(/^\uFEFF/,''));
      data.head += '\n<link rel="stylesheet" href="../assets/musterloesungen.css">';
      const clean=value=>String(value).replaceAll('�berblick','Überblick').replaceAll('�u�erer','Äußerer').replaceAll('Abgabe: ','').replaceAll(' und Abgabe','').replaceAll(', Abgabe','');
      const config={bookTitle:'Physik · Musterlösung',sectionTitle:`${clean(data.config.sectionTitle||data.title)} · Musterlösung`,autoNav:true,autoNavHeadings:['h1','h2','h3'],autoNavIncludeBlocks:false,enableResultsPage:false,themeDefault:data.config.themeDefault||'default',themeStorageKey:'musterloesung-theme',studentNameStorageKey:'musterloesung-unused-name'};
      const used=new Set();
      const sections=data.pages.map((p,i)=>{
        let content='',pendingHeading='';
        for(const entry of p.entries){
          if(entry.heading){pendingHeading=entry.heading;continue;}
          if(pendingHeading){content+=`<h2>${text(clean(pendingHeading))}</h2>\n`;pendingHeading='';}
          if(used.has(entry.cfg.id))throw new Error(`Doppelte Aufgaben-ID ${entry.cfg.id}`);
          used.add(entry.cfg.id);
          content+=`<div class="wb-section-break"></div>\n<article class="solution-block" data-solution="${esc(entry.cfg.id)}"><h3>${text(clean(entry.cfg.title||entry.cfg.id))}</h3>${render(entry,spec.answers)}</article>\n`;
        }
        for(const e of spec.extras?.[p.number]||[]){if(used.has(e.id))throw new Error(`Doppelte Ergänzung ${e.id}`);used.add(e.id);content+=`<div class="wb-section-break"></div>\n<article class="solution-block" data-solution="${esc(e.id)}"><h3>${esc(e.title)}</h3>${e.html}</article>\n`;}
        return `<section data-wb-page="${esc(p.number)}" data-wb-page-title="${esc(clean(p.title))}">\n${i===0?'<div class="solution-kicker">Musterlösung</div>\n':''}<h1>${text(clean(p.heading))}</h1>\n${content}</section>`;
      }).join('\n');
      const digest=crypto.createHash('sha256').update(bytes).digest('hex');
      const html=`<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="musterloesung-source" content="${esc(path.basename(sourcePath))}">\n<meta name="musterloesung-source-sha256" content="${digest}">\n<title>${esc(data.title)} – Musterlösung</title>\n${data.head}\n<style>${css}</style>\n</head>\n<body>\n<div data-wb-book>\n<script class="wb-book-config" type="application/json">${JSON.stringify(config).replaceAll('<','\\u003c')}</script>\n${sections}\n</div>\n<script src="../assets/allgemeines_format.js"></script>\n<script>SBLibrary.autoMountAll();document.querySelectorAll('.wb-side-footer').forEach(function(footer){footer.remove();});</script>\n</body>\n</html>\n`;
      fs.writeFileSync(outputPath,html,'utf8');
      console.log(spec.output,used.size,'Lösungsblöcke');
    }
  }finally{await b.close();}
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build,render};
