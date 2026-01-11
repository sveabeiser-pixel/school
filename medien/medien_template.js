// ===== Utilities =====
const qs  = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

// ===== Multiple Choice renderer =====
function renderMCQ(container){
  const cfgEl = qs('.mcq-config', container.parentElement);
  const cfg = JSON.parse(cfgEl.textContent);

  container.innerHTML = '';
  cfg.questions.forEach((q, qi) => {
    const qEl = document.createElement('div');
    qEl.className = 'q';
    qEl.dataset.qi = String(qi);

    const h = document.createElement('h3');
    h.textContent = `${qi+1}. ${q.text}`;
    qEl.appendChild(h);

    const chWrap = document.createElement('div');
    chWrap.className = 'choices';

    const type = q.multiple ? 'checkbox' : 'radio';
    const name = `q_${qi}`;

    q.choices.forEach(c => {
      const label = document.createElement('label');
      label.className = 'choice';

      const inp = document.createElement('input');
      inp.type = type;
      inp.name = name;
      inp.value = c.id;

      const span = document.createElement('span');
      span.textContent = c.label;

      label.appendChild(inp);
      label.appendChild(span);
      chWrap.appendChild(label);
    });

    qEl.appendChild(chWrap);

    const fb = document.createElement('div');
    fb.className = 'feedback';
    fb.dataset.feedback = '1';
    fb.textContent = '';
    qEl.appendChild(fb);

    container.appendChild(qEl);
  });

  const block = container.closest('.block');
  const checkBtn = qs('[data-mcq-check]', block);
  const resetBtn = qs('[data-mcq-reset]', block);
  const scoreEl  = qs('[data-mcq-score]', block);

  function check(){
    let correctCount = 0;

    qsa('.q', container).forEach(qEl => {
      qEl.classList.remove('correct','wrong');
      const qi = Number(qEl.dataset.qi);
      const q = cfg.questions[qi];

      const selected = qsa('input', qEl).filter(i => i.checked).map(i => i.value).sort();
      const expected = [...q.correct].sort();

      const ok = selected.length === expected.length && selected.every((v,i) => v === expected[i]);

      qEl.classList.add(ok ? 'correct' : 'wrong');

      const fb = qs('[data-feedback]', qEl);
      fb.textContent = q.explain ? q.explain : (ok ? 'Richtig.' : 'Nicht ganz.');
      if(ok) correctCount += 1;
    });

    scoreEl.textContent = `Punkte: ${correctCount}/${cfg.questions.length}`;
  }

  function reset(){
    qsa('input', container).forEach(i => i.checked = false);
    qsa('.q', container).forEach(qEl => {
      qEl.classList.remove('correct','wrong');
      const fb = qs('[data-feedback]', qEl);
      if(fb) fb.textContent = '';
    });
    scoreEl.textContent = '';
  }

  checkBtn.addEventListener('click', check);
  resetBtn.addEventListener('click', reset);

  return {check, reset};
}

// ===== Drag & Drop Cloze =====
function initCloze(root){
  const bank = qs('[data-bank]', root);
  const gaps = qsa('.gap', root);
  const checkBtn = qs('[data-cloze-check]', root);
  const resetBtn = qs('[data-cloze-reset]', root);
  const scoreEl  = qs('[data-cloze-score]', root);

  function clearGap(g){
  g.classList.remove('filled','ok','bad');
  g.innerHTML = '&nbsp;';
}


  function attachChipDnD(chip){
    chip.addEventListener('dragstart', () => {
      chip.classList.add('dragging');
      window.__dragChip = chip;
    });
    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      window.__dragChip = null;
    });
  }

  qsa('.chip', bank).forEach(chip => {
    attachChipDnD(chip);
   chip.addEventListener('click', () => {
  const fromGap = chip.parentElement && chip.parentElement.closest('.gap'); // MERKEN (VORHER!)
  bank.appendChild(chip);                                                  // zurück in Bank
  if(fromGap) clearGap(fromGap);                                           // Lücke wieder groß machen
});


  });

  // --- Wörter in der Bank zufällig anordnen (einmal beim Init) ---
(function shuffleBank(){
  const chips = qsa('.chip', bank);
  for(let i = chips.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    bank.insertBefore(chips[j], chips[i]);
  }
})();


    function allowDropGap(g){
    g.addEventListener('dragover', (e) => {
      e.preventDefault();
      g.style.borderColor = 'rgba(102,217,239,0.55)';
    });
    g.addEventListener('dragleave', () => {
      g.style.borderColor = '';
    });
    g.addEventListener('drop', (e) => {
      e.preventDefault();
      g.style.borderColor = '';
      const chip = window.__dragChip;
      if(!chip) return;

      // wenn in Ziel-Lücke schon Chip liegt -> zurück in Bank
      const existing = qs('.chip', g);
      if(existing && existing !== chip) bank.appendChild(existing);

      // Chip in die Lücke verschieben
      g.textContent = '';
      g.appendChild(chip);
      g.classList.add('filled');
      g.classList.remove('ok','bad');
    });
  }

  // Drop auf BANK: NICHT leeren, nur hinzufügen
  function allowDropBank(){
    bank.addEventListener('dragover', (e) => {
      e.preventDefault();
      bank.style.borderColor = 'rgba(102,217,239,0.55)';
    });
    bank.addEventListener('dragleave', () => {
      bank.style.borderColor = '';
    });
    bank.addEventListener('drop', (e) => {
  e.preventDefault();
  const chip = window.__dragChip;
  if(!chip) return;

  const fromGap = chip.parentElement && chip.parentElement.closest('.gap'); // MERKEN (VORHER!)
  bank.appendChild(chip);                                                  // zurück in Bank
  if(fromGap) clearGap(fromGap);                                           // Lücke wieder groß machen
});

  }

  gaps.forEach(g => allowDropGap(g));
  allowDropBank();


  function check(){
    let okCount = 0;
    gaps.forEach(g => {
      g.classList.remove('ok','bad');
      const expected = (g.dataset.answer || '').trim();
      const chip = qs('.chip', g);
      const got = chip ? (chip.dataset.token || '').trim() : '';
      const ok = got !== '' && got === expected;
      g.classList.add(ok ? 'ok' : 'bad');
      if(ok) okCount += 1;
    });
    scoreEl.textContent = `Punkte: ${okCount}/${gaps.length}`;
  }

  function reset(){
    gaps.forEach(g => {
      const chip = qs('.chip', g);
      if(chip) bank.appendChild(chip);
      g.classList.remove('filled','ok','bad');
      g.textContent = '';
    });
    gaps.forEach(g => { g.innerHTML = '&nbsp;'; });
    scoreEl.textContent = '';
  }

  gaps.forEach(g => { g.innerHTML = '&nbsp;'; });

  checkBtn.addEventListener('click', check);
  resetBtn.addEventListener('click', reset);

  return {check, reset};
}

// ===== Autosave (LocalStorage) =====
function initAutosave(){
  const els = qsa('[data-autosave]');
  const status = qs('[data-save-status]');
  const setStatus = (t) => { if(status) status.textContent = t; };

  els.forEach(el => {
    const key = el.dataset.autosave;
    const saved = localStorage.getItem(key);
    if(saved !== null) el.value = saved;

    el.addEventListener('input', () => {
      localStorage.setItem(key, el.value);
      setStatus('Gespeichert.');
      window.clearTimeout(window.__saveTimer);
      window.__saveTimer = window.setTimeout(() => setStatus(''), 800);
    });
  });

  const exportBtn = qs('[data-export]');
  const clearBtn  = qs('[data-clear-saved]');
  if(exportBtn){
    exportBtn.addEventListener('click', () => {
      const lines = [];
      els.forEach(el => {
        const label = el.id ? (qs(`label[for="${el.id}"]`)?.textContent || el.id) : el.dataset.autosave;
        lines.push(`## ${label}\n${el.value}\n`);
      });
      const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wellen-ergebnisse.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
  if(clearBtn){
    clearBtn.addEventListener('click', () => {
      els.forEach(el => {
        localStorage.removeItem(el.dataset.autosave);
        el.value = '';
      });
      setStatus('Gespeichertes gelöscht.');
      window.setTimeout(() => setStatus(''), 1200);
    });
  }
}

// ===== Init all =====
function initWellenTemplate(){
  const mcqStates = [];
  qsa('[data-mcq]').forEach(el => mcqStates.push(renderMCQ(el)));

  const clozeStates = [];
  qsa('[data-cloze]').forEach(el => clozeStates.push(initCloze(el)));

  initAutosave();

  const resetAllBtn = qs('#resetAllBtn');
  if(resetAllBtn){
    resetAllBtn.addEventListener('click', () => {
      mcqStates.forEach(s => s.reset());
      clozeStates.forEach(s => s.reset());
    });
  }
}

document.addEventListener('DOMContentLoaded', initWellenTemplate);
