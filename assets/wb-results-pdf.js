(function(global){
  'use strict';
  const base = new URL('.', document.currentScript.src);
  let dependencies;
  const clean = value => String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  const colors = {
    ink:[29,43,53], muted:[82,99,111], line:[218,227,232],
    teal:[15,118,110], blue:[30,102,168], green:[22,128,73],
    red:[174,49,61], amber:[150,98,15], pale:[240,246,248]
  };
  const statuses = {
    correct:['Richtig', colors.green], wrong:['Nicht richtig', colors.red],
    empty:['Noch offen', colors.amber], open:['Nicht automatisch bewertet', colors.muted]
  };

  function loadScript(filename){
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(filename, base).href;
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error('PDF-Datei konnte nicht geladen werden: ' + filename)); };
      document.head.appendChild(script);
    });
  }

  function ready(){
    if(!dependencies){
      dependencies = Promise.all([
        global.jspdf ? Promise.resolve() : loadScript('vendor/jspdf.umd.min.js'),
        global.WBResultsPDFFonts ? Promise.resolve() : loadScript('vendor/dejavu-sans-pdf.js')
      ]).catch(error => { dependencies = null; throw error; });
    }
    return dependencies;
  }

  async function create(report){
    await ready();
    const doc = new global.jspdf.jsPDF({unit:'mm', format:'a4', compress:true, putOnlyUsedFonts:true});
    for(const style of ['regular', 'bold']){
      const file = 'DejaVuSans-' + style + '.ttf';
      doc.addFileToVFS(file, global.WBResultsPDFFonts[style]);
      doc.addFont(file, 'DejaVuSans', style === 'regular' ? 'normal' : 'bold');
    }
    doc.setProperties({title:clean(report.title), subject:'Persönliche Aufgabenergebnisse', author:clean(report.name), creator:'Interaktive Lernseiten'});
    doc.setLanguage('de-DE');
    const margin = 18, width = 174, bottom = 277;
    let y = 20, activeTask = '';

    function style(size=10, bold=false, color=colors.ink){
      doc.setFont('DejaVuSans', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    }

    function newPage(){
      doc.addPage();
      style(8, false, colors.muted);
      const header = doc.splitTextToSize(clean(report.title), width).slice(0, 2);
      doc.text(header, margin, 12);
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(.25);
      doc.line(margin, 19, margin + width, 19);
      y = 27;
      if(activeTask){
        style(8, true, colors.muted);
        const continuation = doc.splitTextToSize('Fortsetzung: ' + clean(activeTask), width).slice(0, 2);
        doc.text(continuation, margin, y);
        y += continuation.length * 4 + 4;
      }
    }

    function ensure(height){ if(y + height > bottom) newPage(); }

    // Lines flow independently so long answers remain searchable and never get clipped.
    function paragraph(value, options={}){
      const size = options.size || 10;
      const leading = size * 25.4 / 72 * 1.45;
      const x = margin + (options.indent || 0);
      style(size, options.bold, options.color || colors.ink);
      const lines = doc.splitTextToSize(clean(value), width - (options.indent || 0));
      for(const line of lines){
        ensure(leading);
        style(size, options.bold, options.color || colors.ink);
        doc.text(line, x, y);
        y += leading;
      }
      y += options.after == null ? 2 : options.after;
    }

    function richLines(runs, maxWidth){
      const groups = [];
      for(const run of runs){
        for(const token of clean(run.text).split(/(\n|[^\S\n]+)/).filter(Boolean)){
          const kind = token === '\n' ? 'newline' : /^\s+$/.test(token) ? 'space' : 'word';
          let group = groups.at(-1);
          if(kind !== 'word' || group?.kind !== 'word'){
            group = {kind, parts:[]};
            groups.push(group);
          }
          group.parts.push({text:token, bold:!!run.bold});
        }
      }
      const measured = part => { style(10, part.bold); return doc.getTextWidth(part.text); };
      const lines = [];
      let line = [], used = 0, spaces = [];
      const flush = () => { lines.push(line); line = []; used = 0; spaces = []; };
      const append = part => {
        const previous = line.at(-1);
        if(previous?.bold === part.bold) previous.text += part.text;
        else line.push({...part});
        used += measured(part);
      };
      // Measure both font weights before wrapping; a bold gap may span multiple words.
      for(const group of groups){
        if(group.kind === 'newline'){ flush(); continue; }
        if(group.kind === 'space'){ spaces.push(...group.parts); continue; }
        const wordWidth = group.parts.reduce((sum,part) => sum + measured(part), 0);
        const spaceWidth = spaces.reduce((sum,part) => sum + measured(part), 0);
        if(line.length && used + spaceWidth + wordWidth > maxWidth) flush();
        if(!line.length) spaces = [];
        if(wordWidth <= maxWidth){
          spaces.forEach(append);
          group.parts.forEach(append);
        }else{
          for(const part of group.parts){
            for(const character of Array.from(part.text)){
              const fragment = {text:character, bold:part.bold};
              if(line.length && used + measured(fragment) > maxWidth) flush();
              append(fragment);
            }
          }
        }
        spaces = [];
      }
      if(line.length) lines.push(line);
      return lines;
    }

    function richLine(parts, x){
      for(const part of parts){
        style(10, part.bold);
        doc.text(part.text, x, y);
        x += doc.getTextWidth(part.text);
      }
    }

    function richParagraph(runs){
      const leading = 10 * 25.4 / 72 * 1.45;
      for(const line of richLines(runs, width - 4)){
        ensure(leading);
        richLine(line, margin + 4);
        y += leading;
      }
      y += 3;
    }

    function compareAnswers(answer, expected, labels=['Deine Antwort', 'Erwartete Antwort']){
      const indent = 4, gap = 8;
      const columnWidth = (width - indent - gap) / 2;
      const left = margin + indent, right = left + columnWidth + gap;
      const leading = 10 * 25.4 / 72 * 1.45;
      style(10);
      const lines = value => Array.isArray(value) ? richLines(value, columnWidth) : doc.splitTextToSize(clean(value), columnWidth).map(text => [{text, bold:false}]);
      const answers = lines(answer);
      const corrections = lines(expected);
      const headings = () => {
        ensure(5 + leading);
        style(8, true, colors.muted);
        doc.text(labels[0], left, y);
        doc.text(labels[1], right, y);
        y += 5;
      };
      headings();
      for(let line = 0; line < Math.max(answers.length, corrections.length); line++){
        if(y + leading > bottom){ newPage(); headings(); }
        style(10);
        if(line < answers.length) richLine(answers[line], left);
        if(line < corrections.length) richLine(corrections[line], right);
        y += leading;
      }
      y += 3;
    }

    function ring(cx, cy, percent, color){
      const r = 11;
      doc.setLineWidth(2);
      doc.setDrawColor(...colors.line);
      doc.circle(cx, cy, r, 'S');
      const p = Math.max(0, Math.min(100, percent || 0));
      if(p > 0){
        const steps = Math.max(2, Math.ceil(p * 1.8));
        const points = Array.from({length:steps + 1}, (_, index) => {
          const angle = -Math.PI / 2 + 2 * Math.PI * p / 100 * index / steps;
          return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
        });
        const segments = points.slice(1).map((point, i) => [point[0] - points[i][0], point[1] - points[i][1]]);
        doc.setDrawColor(...color);
        doc.lines(segments, points[0][0], points[0][1], [1,1], 'S', false);
      }
      style(11, true, color);
      doc.text(Math.round(p) + '%', cx, cy + 1.5, {align:'center'});
    }

    doc.setFillColor(...colors.teal);
    doc.rect(margin, 14, 2, 10, 'F');
    paragraph('Deine Ergebnisse', {size:22, bold:true, indent:7, after:3});
    paragraph(report.title, {size:13, bold:true, after:3});
    paragraph('Name: ' + (clean(report.name) || 'Nicht angegeben'), {size:9, color:colors.muted, after:0});
    paragraph('Abgabe: ' + clean(report.submittedAt.local) + (report.submittedAt.timeZone ? ' · ' + clean(report.submittedAt.timeZone) : ''), {size:9, color:colors.muted, after:6});
    ensure(58);
    const summary = report.summary;
    const percent = (done, total) => total ? 100 * done / total : 0;
    const metrics = [
      {title:'Punkte', value:`${summary.correct} / ${summary.total}`, note:summary.total ? 'automatisch bewertet' : 'ohne automatische Bewertung', percent:percent(summary.correct, summary.total), color:colors.green},
      {title:'Seiten', value:`${summary.pageDone} / ${summary.pageTotal}`, note:'mit bearbeiteten Aufgaben', percent:percent(summary.pageDone, summary.pageTotal), color:colors.blue},
      {title:'Aufgaben', value:`${summary.taskDone} / ${summary.taskTotal}`, note:'ausgefüllt', percent:percent(summary.taskDone, summary.taskTotal), color:colors.teal}
    ];
    metrics.forEach((metric, index) => {
      const cx = margin + 29 + index * 58;
      ring(cx, y + 12, metric.percent, metric.color);
      style(9, true, colors.ink);
      doc.text(metric.title, cx, y + 30, {align:'center'});
      style(12, true, metric.color);
      doc.text(metric.value, cx, y + 37, {align:'center'});
      style(7.5, false, colors.muted);
      doc.text(doc.splitTextToSize(metric.note, 52), cx, y + 43, {align:'center'});
    });
    y += 56;
    paragraph('Deine Antworten und Rückmeldungen', {size:14, bold:true, after:5});

    if(!report.chapters.length) paragraph('Für diese Seite wurden keine Aufgabenergebnisse erfasst.', {color:colors.muted});
    for(const chapter of report.chapters){
      activeTask = '';
      ensure(35);
      style(12, true, colors.blue);
      const heading = doc.splitTextToSize(`Seite ${chapter.number} · ${clean(chapter.title)}`, width - 8);
      const headingHeight = heading.length * 6 + 6;
      doc.setFillColor(...colors.pale);
      doc.rect(margin, y - 4, width, headingHeight, 'F');
      doc.text(heading, margin + 4, y + 2);
      y += headingHeight + 5;
      for(const task of chapter.tasks){
        activeTask = '';
        ensure(35);
        activeTask = task.title;
        paragraph(task.title, {size:12, bold:true, after:1});
        paragraph(task.type + (task.score ? ` · ${task.score.correct} / ${task.score.total} Punkte` : ' · ohne automatische Bewertung'), {size:8, color:colors.muted, after:4});
        if(task.cloze){
          if(task.cloze.hasWrong){
            compareAnswers(task.cloze.answer, task.cloze.correction, ['Dein Lückentext', 'Korrigierter Lückentext']);
          }else{
            if(!task.completed) paragraph('Noch offen', {size:8, bold:true, color:colors.amber, after:2});
            richParagraph(task.cloze.answer);
          }
        }else{
          if(task.context) paragraph(task.context, {size:10, after:4});
          for(const item of task.items){
            const answered = item.status !== 'empty' && clean(item.answer).trim() !== '';
            ensure(answered ? 25 : 14);
            const status = answered ? statuses[item.status] || statuses.open : statuses.empty;
            if(answered || !['Deine Antwort', 'Antwort'].includes(clean(item.label).trim())) paragraph(item.label, {size:10, bold:true, after:1});
            paragraph(status[0], {size:8, bold:true, color:status[1], after:answered ? 3 : 1});
            if(answered){
              if(item.status === 'wrong' && item.expected != null){
                compareAnswers(item.answer, item.expected);
              }else{
                paragraph(item.answer, {indent:4, after:3});
              }
              if(item.status === 'wrong' && item.explanation) paragraph(item.explanation, {size:9, color:colors.muted, indent:4, after:4});
            }
            y += 2;
          }
          if(!task.items.length) paragraph('Keine Einträge vorhanden.', {color:colors.muted});
        }
        y += 3;
        doc.setDrawColor(...colors.line);
        doc.setLineWidth(.25);
        if(y < bottom) doc.line(margin, y, margin + width, y);
        y += 7;
      }
    }
    const pageCount = doc.getNumberOfPages();
    for(let page = 1; page <= pageCount; page++){
      doc.setPage(page);
      style(8, false, colors.muted);
      doc.setDrawColor(...colors.line);
      doc.setLineWidth(.25);
      doc.line(margin, 282, margin + width, 282);
      doc.text('Deine Ergebnisse', margin, 288);
      doc.text(`Seite ${page} / ${pageCount}`, margin + width, 288, {align:'right'});
    }
    return doc;
  }

  async function save(report, filename){
    const doc = await create(report);
    const safeFilename = clean(filename || 'ergebnisse.pdf').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
    await doc.save(safeFilename, {returnPromise:true});
  }

  global.WBResultsPDF = {create, save};
})(window);
