// Fachliche Antwortdaten stehen in den drei benachbarten .muster-*.cjs-Dateien.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {renderTask,escape} = require('../scripts/build-musterloesungen.cjs');
const {electric1,electric2,electric3} = require('./.muster-answers.cjs');
const {magnet1,magnet2} = require('./.muster-magnet.cjs');
const {induction1,induction2,simulations} = require('./.muster-induktion.cjs');
const specs = [electric1,electric2,electric3,magnet1,magnet2,induction1,induction2,simulations];
const root = path.resolve(__dirname,'..');
const {chromium} = require(path.join(process.env.TEMP,'school-ki2-check/node_modules/playwright'));
const style = `
.wb-book .wb-side-footer{display:none}
.solution-block{min-width:0;overflow-wrap:anywhere}
.solution-block h3{font-size:18px;line-height:1.45;margin:0 0 8px}
.solution-block h4{font-size:16px;line-height:1.45;margin:18px 0 8px}
.course-kicker,.solution-label{display:block;font-weight:700;color:var(--wb-muted);margin-bottom:8px}
.course-kicker{font-size:20px;color:var(--wb-text)}
.solution-table{max-width:100%;overflow-x:auto;margin:12px 0}
.solution-table table{width:100%;min-width:420px;border-collapse:collapse;color:var(--wb-text);font-size:14px}
.solution-table th,.solution-table td{border:1px solid var(--wb-line);padding:9px 10px;text-align:left;vertical-align:top}
.solution-table th{background:var(--wb-head-bg);color:var(--wb-text)}
@media(max-width:600px){
.wb-book:not(.wb-present-mode){--wb-topH:112px}
.wb-book:not(.wb-present-mode) .wb-topbar{flex-wrap:wrap;gap:6px;padding:8px 12px;box-sizing:border-box}
.wb-book:not(.wb-present-mode) .wb-top-left{width:100%;min-width:0;gap:10px}
.wb-book:not(.wb-present-mode) .wb-hamburger{width:44px;height:44px;flex-shrink:0}
.wb-book:not(.wb-present-mode) .wb-brand{font-size:17px;line-height:1.25;overflow-wrap:anywhere}
.wb-book:not(.wb-present-mode) .wb-top-right{width:100%;justify-content:space-between;gap:4px}
.wb-book:not(.wb-present-mode) .wb-theme-wrap{padding:4px;gap:0}
.wb-book:not(.wb-present-mode) .wb-theme-select{width:90px;padding:6px 4px}
.wb-book:not(.wb-present-mode) .wb-page-ind{min-width:36px;font-size:14px}
.wb-book:not(.wb-present-mode) .wb-icon-btn{width:32px;height:32px;flex-shrink:0}
}
`;

async function main(){
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page = await browser.newPage();
  for(const spec of specs){
   const sourcePath = path.resolve(root,spec.source);
   const bytes = fs.readFileSync(sourcePath);
   const source = await page.evaluate(html=>{
    const doc = new DOMParser().parseFromString(html,'text/html');
    return {
     title:doc.title,
     head:[...doc.head.querySelectorAll('link[rel="stylesheet"],style')].map(el=>el.outerHTML).join('\n'),
     config:JSON.parse(doc.querySelector('.wb-book-config').textContent),
     pages:[...doc.querySelectorAll('section[data-wb-page]')].map(section=>{
      const heading = section.querySelector('h1,h2');
      return {
       number:section.dataset.wbPage,title:section.dataset.wbPageTitle,heading:heading.textContent,
       tasks:[...section.querySelectorAll('[data-wb-type],[data-p2]')].map((el,index)=>{
        if(!el.hasAttribute('data-p2')) return {type:el.dataset.wbType,cfg:JSON.parse(el.querySelector('.wb-config').textContent)};
        return {type:'p2',cfg:{id:el.getAttribute('data-p2-id') || el.id || `p2_${[...doc.querySelectorAll('[data-p2]')].indexOf(el)}`,title:el.getAttribute('data-p2-title')},pairs:[...el.querySelectorAll('[data-side="L"][data-pair]')].map(left=>[left.textContent.trim(),[...el.querySelectorAll('[data-side="R"][data-pair]')].find(right=>right.dataset.pair===left.dataset.pair).textContent.trim()])};
       })
      };
     })
    };
   },bytes.toString('utf8').replace(/^\uFEFF/,''));
   source.head += '\n<link rel="stylesheet" href="../assets/musterloesungen.css">';
   const config = {bookTitle:spec.bookTitle,sectionTitle:source.config.sectionTitle+' · Musterlösung',autoNav:true,autoNavHeadings:['h1','h2','h3'],autoNavIncludeBlocks:false,enableResultsPage:false,themeDefault:source.config.themeDefault || 'default'};
   const block = (id,title,html)=>`<div class="wb-section-break"></div>\n<article class="solution-block" data-solution="${escape(id)}"><h3>${escape(title)}</h3>\n${html}</article>`;
   const pages = source.pages.map((section,index)=>{
    let body = `<h1>${escape(section.heading)}</h1>`;
    if(!index) body = `<div class="course-kicker">Musterlösung</div>\n${body}`;
    for(const task of section.tasks){
     let answer = renderTask(task,spec.answers);
     if(task.type !== 'essay') answer = answer.replace('<span class="solution-label">Eine mögliche Antwort</span>','');
     answer = answer.replace(/\\+\(|\\+\)/g,'').replace(/T_\{1\/2\}/g,'T₁/₂');
     if(task.type==='p2' && section.number==='7' && spec===electric1){
      answer = answer.replace('Das Feld ist in diesem Bereich homogen.','Parallelität allein genügt nicht: Bei zusätzlich gleicher Feldliniendichte ist das Feld in diesem Bereich homogen.');
     }
     body += '\n'+block(task.cfg.id,task.cfg.title,answer);
    }
    for(const extra of spec.extras[section.number] || []) body += '\n'+block(extra.id,extra.title,extra.html);
    return `<section data-wb-page="${section.number}" data-wb-page-title="${escape(section.title)}">\n${body}\n</section>`;
   }).join('\n');
   const digest = crypto.createHash('sha256').update(bytes).digest('hex');
   const html = `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="musterloesung-source" content="${path.basename(sourcePath)}">\n<meta name="musterloesung-source-sha256" content="${digest}">\n<title>${escape(source.title)} – Musterlösung</title>\n${source.head}\n<style>${style}</style>\n</head>\n<body>\n<div data-wb-book>\n<script class="wb-book-config" type="application/json">${JSON.stringify(config)}</script>\n${pages}\n</div>\n<script src="../assets/allgemeines_format.js"></script>\n<script>SBLibrary.autoMountAll({storagePrefix:${JSON.stringify(path.basename(spec.output)+'__')}});</script>\n</body>\n</html>\n`;
   fs.writeFileSync(path.resolve(root,spec.output),html,'utf8');
   console.log(`${spec.output}: ${source.pages.length} Seiten, ${source.pages.reduce((s,p)=>s+p.tasks.length+(spec.extras[p.number] || []).length,0)} Lösungsblöcke`);
  }
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
