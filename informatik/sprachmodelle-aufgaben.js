/* Keep the shared workbook responsible for grading, storage and submission. */
window.SprachmodellAufgaben = (() => {
  'use strict';
  const model = window.Sprachmodelle;
  const $ = id => document.getElementById(id);
  const number = (value, digits = 1) => value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  function cell(value, heading = false) {
    const node = document.createElement(heading ? 'th' : 'td');
    node.textContent = value;
    if (heading) node.scope = 'row';
    return node;
  }
  function prepare() {
    const config = document.querySelector('[data-sm-corpus-trace] .wb-config');
    const data = JSON.parse(config.textContent), table = model.counts();
    const prefixes = ['<s>', 'löwenherz', 'verließ', 'sein', 'schloss', 'die', 'tür', 'drehte', 'den', 'schlüssel', 'im', 'ist', 'schön', 'er', 'garten'];
    data.rows = prefixes.flatMap(prefix => {
      const successors = prefix === '<s>' ? ['löwenherz', 'er', 'sein'] : Object.keys(table[prefix]).sort(model.alphabetical);
      return successors.map(next => ({ cells: prefix === '<s>' && next === 'löwenherz' ? [
        { given: prefix, code: true }, { given: next, code: true }, { given: table[prefix][next] }
      ] : [
        { given: prefix, code: true },
        { answers: [next], ariaLabel: `Folgewort nach ${prefix}: ${successors.indexOf(next) + 1}` },
        { answers: [String(table[prefix][next])], ariaLabel: `Häufigkeit von ${next} nach ${prefix}` }
      ] }));
    });
    config.textContent = JSON.stringify(data);
    $('sm-transition-rows').replaceChildren(...Object.entries(model.transitions).map(([word, successors]) => {
      const row = document.createElement('tr');
      row.append(cell(word, true), cell(Object.entries(successors).map(([next, value]) => `${next}: ${number(value)}`).join(' | ') || 'Satzende'));
      return row;
    }));
  }
  function problemSelects() {
    const block = document.querySelector('[data-sm-problem-selects]');
    const names = ['Verpasstes Satzende', 'Fehlender Kontext', 'Früher Satzabbruch', 'Zyklus', 'Unbekanntes Wort'];
    const pairs = [...block.querySelectorAll('[data-wb-trace-column="2"]')].map(input => {
      const select = document.createElement('select');
      select.className = 'wb-trace-input sm-table-select';
      select.setAttribute('aria-label', input.getAttribute('aria-label'));
      for (const name of ['', ...names]) {
        const option = document.createElement('option');
        option.value = name; option.textContent = name || 'Problem auswählen'; select.append(option);
      }
      // Original fields remain in the shared block's grading and storage closure.
      input.hidden = true; input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
      input.after(select);
      const sync = () => {
        select.value = input.value;
        select.classList.toggle('is-correct', input.classList.contains('is-correct'));
        select.classList.toggle('is-wrong', input.classList.contains('is-wrong'));
      };
      select.addEventListener('change', () => {
        input.value = select.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      input.addEventListener('input', sync);
      new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['class'] });
      sync();
      return { sync };
    });
    block.querySelectorAll('.wb-trace-controls button').forEach(button => button.addEventListener('click', () => pairs.forEach(pair => pair.sync())));
  }
  function samplingLab() {
    const words = ['Pizza', 'Pasta', 'Suppe', 'Salat', 'Eis'], logits = [3, 2, 1, 0, -1];
    let counts = words.map(() => 0), distribution, last = '', draws = 0;
    const percent = value => `${number(value * 100)} %`;
    function render() {
      $('sm-bars').replaceChildren(...words.map((word, index) => {
        const row = document.createElement('div'); row.className = 'sm-bar-row';
        if (!distribution.retained.includes(index)) row.classList.add('excluded');
        const label = document.createElement('span'); label.textContent = word;
        const track = document.createElement('div'); track.className = 'sm-bar-track';
        const fill = document.createElement('div'); fill.className = 'sm-bar-fill';
        fill.style.setProperty('--sm-value', `${distribution.final[index] * 100}%`); track.append(fill);
        const value = document.createElement('output'); value.textContent = percent(distribution.final[index]);
        row.append(label, track, value); return row;
      }));
      $('sm-sampling-rows').replaceChildren(...words.map((word, index) => {
        const row = document.createElement('tr');
        [word, logits[index], percent(distribution.base[index]), percent(distribution.final[index]), counts[index]].forEach(value => row.append(cell(value)));
        return row;
      }));
      const strategy = $('sm-strategy').value;
      const selection = strategy === 'topk' ? `Top-K = ${$('sm-topk').value}` : strategy === 'topp' ? `Top-P = ${number(Number($('sm-topp').value), 2)}` : 'Alle Kandidaten';
      $('sm-sampling-status').textContent = `T = ${number(Number($('sm-temperature').value))}; ${selection}. ${distribution.retained.length} Kandidat(en); Summe nach Filter: ${percent(distribution.final.reduce((sum, value) => sum + value, 0))}.${Number($('sm-temperature').value) === 0 ? ' Greedy-Auswahl: nur der größte Logit zählt.' : ''}`;
      $('sm-draw-output').textContent = draws ? `${draws} Ziehung(en). Zuletzt: ${last}.` : 'Noch keine Ziehung.';
    }
    function update() {
      const input = $('sm-topk');
      input.value = input.value === '' || !Number.isFinite(Number(input.value)) ? 3 : Math.max(1, Math.min(5, Math.round(Number(input.value))));
      $('sm-topk').disabled = $('sm-strategy').value !== 'topk';
      $('sm-topp').disabled = $('sm-strategy').value !== 'topp';
      $('sm-temperature-value').value = number(Number($('sm-temperature').value));
      $('sm-topp-value').value = number(Number($('sm-topp').value), 2);
      distribution = model.sampling(logits, Number($('sm-temperature').value), $('sm-strategy').value, Number(input.value), Number($('sm-topp').value));
      counts = words.map(() => 0); draws = 0; last = ''; render();
    }
    function draw(amount) {
      for (let n = 0; n < amount; n++) {
        let remaining = Math.random(), index = distribution.retained[distribution.retained.length - 1];
        for (let i = 0; i < words.length; i++) {
          remaining -= distribution.final[i];
          if (remaining < 0) { index = i; break; }
        }
        counts[index]++; draws++; last = words[index];
      }
      render();
    }
    $('sm-temperature').addEventListener('input', update);
    $('sm-topp').addEventListener('input', update);
    $('sm-topk').addEventListener('change', update);
    $('sm-strategy').addEventListener('change', update);
    $('sm-draw').addEventListener('click', () => draw(1));
    $('sm-draw-batch').addEventListener('click', () => draw(100));
    $('sm-sampling-reset').addEventListener('click', () => {
      $('sm-temperature').value = 1; $('sm-strategy').value = 'all'; $('sm-topk').value = 3; $('sm-topp').value = .9; update();
    });
    document.querySelector('[data-sm-snapshot="sampling"]').addEventListener('click', event => {
      const button = event.currentTarget;
      const field = button.closest('section').querySelector('[data-wb-type="essay"] textarea');
      const text = `${$('sm-sampling-status').textContent} Ziehungen: ${draws}; ${words.map((word, index) => `${word}: ${counts[index]} (${percent(distribution.final[index])})`).join('; ')}.`;
      field.value += `${field.value ? '\n' : ''}${text}`;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      const label = button.getAttribute('aria-label');
      button.setAttribute('aria-label', 'Messwerte übernommen');
      setTimeout(() => button.setAttribute('aria-label', label), 1400);
    });
    update();
  }
  function mount() {
    problemSelects(); samplingLab(); window.KI3Libraries.mountIcons();
    document.querySelectorAll('.ki-tool').forEach(button => {
      const placeTooltip = () => button.style.setProperty('--ki-tooltip-offset', `${Math.min(0, innerWidth - 12 - button.getBoundingClientRect().left - 180)}px`);
      button.addEventListener('pointerenter', placeTooltip);
      button.addEventListener('focus', placeTooltip);
    });
  }
  return { prepare, mount };
})();
