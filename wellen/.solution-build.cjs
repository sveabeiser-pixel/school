const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {files,P}=require('./.solution-answers.cjs');
const {chromium}=require(path.join(process.env.TEMP,'school-ki2-check/node_modules/playwright'));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rich=s=>Array.isArray(s)?s.join(''):String(s??'');
const article=(id,title,body)=>`<div class="wb-section-break"></div>\n<article class="sample-answer" data-solution="${esc(id)}"><h3>${title}</h3>${body}</article>`;
const table=(heads,rows)=>`<div class="table-scroll" tabindex="0"><table><thead><tr>${heads.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const css=`
.wb-book .wb-side-footer{display:none}
.sample-answer{min-width:0}.sample-answer h3{font-size:18px;line-height:1.45}
.sample-answer img{display:block;width:auto;max-width:100%;height:auto;margin:12px 0}
.sample-answer :is(.grid2,.wb-soft-callout){display:block;background:transparent;color:var(--wb-text);border:0;box-shadow:none;padding:0}
.sample-answer svg{display:block;width:100%;max-width:720px;height:auto;background:white;color:#172033;border:1px solid var(--wb-line)}
.table-scroll{max-width:100%;overflow-x:auto;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:9px 10px;border:1px solid var(--wb-line);text-align:left;vertical-align:top}th{background:var(--wb-head-bg);color:var(--wb-text)}
.sample-answer p{overflow-wrap:anywhere}.sample-answer h3{overflow-wrap:anywhere}
@media(max-width:600px){
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
}`;
function closed(b,file,page,index){
 const c=b.cfg;
 if(b.type==='mcq'){
  return c.questions.map((q,i)=>{
   let keys=q.correct;
   if(file==='wellen-book-wellenfunktion.html'&&page==='5'&&i===2)keys=['a','c'];
   if(file==='Akustik-Versuche.html'&&c.id==='ak_mcq_abschluss'&&i===2)keys=['a','b','c','d'];
   let text=q.choices.filter(x=>keys.includes(x.id)).map(x=>P(`<strong>${esc(x.id)}</strong>: ${x.label}`)).join('');
   if(file==='wellen-book-stehende-Welle.html'&&c.id==='mcq-stehend-1'&&i===1)text=P('Keine Option ist uneingeschränkt richtig. Fachlich: Die Amplitude ist ortsabhängig; innerhalb eines Abschnitts zwischen Knoten sind Punkte gleichphasig, benachbarte Abschnitte gegenphasig. Die vorgesehene Option b („Alle Punkte … phasengleich“) muss entsprechend eingeschränkt werden.');
   if(c.id==='mcq-int2-recap-1'&&i===1)text+=P('Zusätzlich muss |a| ≪ e gelten. e ≫ d ist eine Fernfeldbedingung, aber allein keine ausreichende Kleinwinkelbedingung.');
   if(c.id==='mcq-grund-oberschwingung-2'&&i===1)text=P('Die n-te Eigenschwingung hat f<sub>n</sub> = nf₁. Wörtlich ist die n-te Oberschwingung dagegen f = (n+1)f₁. Die Quelle verwendet in dieser Frage n als Modennummer; unter dieser Konvention ist die konfigurierte Antwort f<sub>n</sub> = nf₁ richtig.');
   if(c.id==='ak_mcq_abschluss'&&i===2)text+=P('Inhaltlich bedeutet auch „Alle drei“ dasselbe. Die Lernseite wertet nur a, b und c als Treffer; d ist dort ausdrücklich als nicht separat gewertete Sammelantwort definiert.');
   let explanation=q.explain||'';
   if(c.id==='mcq-stehend-1'&&i===1)explanation='';
   if(c.id==='mcq-int-4'&&i===1)explanation='Orthogonal polarisierte Wellen überlagern sich vektoriell, besitzen aber keinen Interferenzterm in der Gesamtintensität eines polarisationsunabhängigen Detektors. Ein gemeinsamer Analysator kann interferierende Komponenten auswählen.';
   return `<h4>${i+1}. ${q.text}</h4>${text}${explanation?P(explanation):''}`;
  }).join('');
 }
 if(b.type==='verify')return (c.questions||[c]).map(item=>P(`<strong>${(Array.isArray(item.correct)?item.correct.includes('true'):item.answer!==false)?'Wahr':'Falsch'}:</strong> ${item.statement||item.text}`)+P(item.explain||c.explain||'')).join('');
 if(b.type==='cloze')return P(c.segments.map(s=>s.t==='gap'?`<strong>${rich(Array.isArray(s.a)?s.a[0]:s.a)}</strong>`:rich(s.v)).join(''));
 if(b.type==='order')return `<ol>${c.items.map(x=>`<li>${typeof x==='string'?x:x.label||x.text}</li>`).join('')}</ol>`;
 if(b.type==='categorize')return table(['Kategorie','Begriffe'],c.categories.map(cat=>[cat.title,c.items.filter(x=>x.category===cat.id).map(x=>x.label).join('<br>')]));
 if(b.type==='reveal')return c.answerHtml?rich(c.answerHtml):P(c.answer);
 if(b.type==='trace')return table(c.columns.map(x=>x.label),c.rows.map(r=>r.cells.map(x=>x.given??x.answers?.[0]??'')));
 if(b.type==='reveal-img')return `<img src="${esc(c.src)}" alt="${esc(c.alt||c.title)}">`;
 throw Error('Missing authored answer: '+file+' page '+page+' '+c.id+' '+b.type);
}
async function inventory(page,file){
 const html=fs.readFileSync(file,'utf8');
 await page.setContent(html.replace(/<script\b(?![^>]*type=["']application\/json)[\s\S]*?<\/script>/gi,''));
 return page.evaluate(()=>({title:document.title,css:[...document.querySelectorAll('link[rel="stylesheet"]')].map(n=>n.getAttribute('href')),style:[...document.querySelectorAll('style')].map(n=>n.textContent).join('\n'),book:JSON.parse(document.querySelector('.wb-book-config').textContent),pages:[...document.querySelectorAll('section[data-wb-page]')].map(s=>({number:s.dataset.wbPage,title:s.dataset.wbPageTitle||s.querySelector('h1,h2')?.textContent,heading:s.querySelector('h1,h2')?.innerHTML,blocks:[...s.querySelectorAll('[data-wb-type]')].map(n=>({type:n.dataset.wbType,cfg:JSON.parse(n.querySelector('.wb-config').textContent)})),pairs:[...s.querySelectorAll('[data-p2]')].map(n=>({id:n.dataset.p2Id||n.id||'p2_'+[...document.querySelectorAll('[data-p2]')].indexOf(n),title:n.dataset.p2Title||'Finde Paare',pieces:[...n.querySelectorAll('[data-pair]')].map(p=>({side:p.dataset.side,pair:p.dataset.pair,html:p.innerHTML}))}))}))}));
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage();
  for(const [name,data] of Object.entries(files)){
   const dir=name==='Akustik-Versuche.html'?'physik_1':'wellen',file=dir+'/'+name;
   const inv=name==='wellen-book..html'?{title:'Wellen',css:['../assets/allgemeines_format.css'],style:'',book:{bookTitle:'Wellen',sectionTitle:'Wellen',themeDefault:'default'},pages:[{number:'1',title:'Wellen',heading:'Wellen',blocks:[],pairs:[]}]}:await inventory(page,file);
   const config={bookTitle:(inv.book.bookTitle||inv.title)+' · Musterlösung',sectionTitle:(inv.book.sectionTitle||inv.title)+' · Musterlösung',autoNav:true,autoNavHeadings:['h1','h2'],autoNavIncludeBlocks:false,enableResultsPage:false,themeDefault:inv.book.themeDefault||'default'};
   let count=0;
   const usedIds=new Map();
   const solutionId=(id,page)=>{const occurrence=(usedIds.get(id)||0)+1;usedIds.set(id,occurrence);return occurrence===1?id:`${id}__page_${page}_${occurrence}`;};
   const sections=inv.pages.map((p,pi)=>{
    let content=pi===0?'<h1>Musterlösung</h1>':'';
    content+=`<h2>${p.heading||esc(p.title)}</h2>`;
    for(const [i,b] of p.blocks.entries()){
     const body=data.answers[`${p.number}:${b.cfg.id}:${i}`]??data.answers[`${p.number}:${b.cfg.id}`]??data.answers[b.cfg.id]??closed(b,name,p.number,i);
     content+=article(solutionId(b.cfg.id,p.number),b.cfg.title,body);count++;
    }
    for(const pairs of p.pairs){const rows=pairs.pieces.filter(x=>x.side==='L').map(x=>[x.html,pairs.pieces.filter(y=>y.side==='R'&&y.pair===x.pair).map(y=>y.html).join('<br>')]);content+=article(solutionId(pairs.id,p.number),pairs.title,table(['Begriff','Zuordnung'],rows));count++;}
    for(const [id,title,body] of data.extras[p.number]||[]){content+=article(solutionId(id,p.number),title,body);count++;}
    return `<section data-wb-page="${esc(p.number)}" data-wb-page-title="${esc(p.title)}">${content}</section>`;
   }).join('\n');
   const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
   const output=dir+'/'+name.slice(0,-5)+'-'+data.suffix+'.html';
   const doc=`<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(inv.book.sectionTitle||inv.title)} · Musterlösung</title><meta name="musterloesung-source" content="${esc(name)}"><meta name="musterloesung-source-sha256" content="${hash}">\n${inv.css.map(h=>`<link rel="stylesheet" href="${esc(h)}">`).join('\n')}\n<style>${inv.style}\n${css}</style>\n<script>window.MathJax={tex:{inlineMath:[['$','$'],['\\\\(','\\\\)']]}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script></head><body><div data-wb-book><script class="wb-book-config" type="application/json">${JSON.stringify(config)}</script>\n${sections}\n</div><script src="../assets/allgemeines_format.js"></script><script>SBLibrary.autoMountAll();</script></body></html>\n`;
   fs.writeFileSync(output,doc.replace('</head>','<link rel="stylesheet" href="../assets/musterloesungen.css"></head>'),'utf8');console.log(output+' ('+count+' Lösungen)');
  }
 }finally{await browser.close();}
})();
