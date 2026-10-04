/* Local teaching surfaces; learning and prediction use the bundled libraries. */
(() => {
  'use strict';
  const { KNN, kmeansGenerator, TDSolver, mountIcons } = window.KI3Libraries;
  const $ = id => document.getElementById(id);
  const number = (value, digits = 2) => value.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const colors = ['#377dae', '#d98b31', '#0f8b65', '#b54d7b', '#76713b'];
  const light = ['#cfe0ed', '#f5ddba'];
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function random(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function integer(input, min, max, fallback) {
    const value = Number(input.value);
    const result = input.value === '' || !Number.isFinite(value) ? fallback : Math.max(min, Math.min(max, Math.round(value)));
    input.value = result;
    return result;
  }
  function point(ctx, x, y, color, radius = 6) {
    ctx.beginPath(); ctx.arc(x * 6, (100 - y) * 6, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
  function frame(ctx) {
    ctx.clearRect(0, 0, 600, 600); ctx.fillStyle = '#f5f8fa'; ctx.fillRect(0, 0, 600, 600);
    ctx.lineWidth = 1; ctx.strokeStyle = '#e0e7ed';
    for (let i = 0; i <= 600; i += 60) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.moveTo(0, i); ctx.lineTo(600, i); ctx.stroke();
    }
  }
  const snapshots = {};
  document.querySelectorAll('.ki-tool').forEach(button => {
    const positionTooltip = () => {
      const left = button.getBoundingClientRect().left;
      button.style.setProperty('--ki-tooltip-offset', `${Math.min(0, innerWidth - 12 - left - 180)}px`);
    };
    button.addEventListener('pointerenter', positionTooltip);
    button.addEventListener('focus', positionTooltip);
  });
  document.querySelectorAll('[data-snapshot]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.snapshot;
    const field = button.closest('section').querySelector('textarea');
    if (!field || !snapshots[key]) return;
    field.value += `${field.value ? '\n' : ''}${snapshots[key]()}`;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    const old = button.getAttribute('aria-label');
    button.setAttribute('aria-label', 'Messwerte übernommen');
    setTimeout(() => button.setAttribute('aria-label', old), 1400);
  }));
  function toggleIcon(button, running, startLabel) {
    button.innerHTML = `<i data-lucide="${running ? 'pause' : 'play'}"></i>`;
    button.setAttribute('aria-label', running ? 'Anhalten' : startLabel);
    button.title = running ? 'Anhalten' : startLabel;
    mountIcons();
  }

  function initKNN() {
    const canvas = $('knn-canvas'), ctx = canvas.getContext('2d');
    let data, labels, model, query = [52, 48], neighbors, k, region;
    function dataset() {
      const rng = random(739); data = []; labels = [];
      const outlier = $('knn-data').value === 'outlier';
      for (let i = 0; i < 90; i++) {
        let label = i < 45 ? 0 : 1;
        const x = 4 + rng() * 92;
        const y = 4 + rng() * 92;
        if (outlier) label = x < 48 ? 0 : 1;
        else label = y < 48 + 20 * Math.sin(x / 16) ? 0 : 1;
        if (!outlier && i % 13 === 0) label = 1 - label;
        data.push([x, y]); labels.push(label);
      }
      if (outlier) { data.push([75, 55]); labels.push(0); query = [76, 55]; }
      else query = [52, 48];
      $('knn-x').value = query[0]; $('knn-y').value = query[1];
      rebuild();
    }
    function rebuild() {
      k = Number($('knn-k').value); $('knn-k-value').value = k;
      model = new KNN(data, labels, { k, distance });
      // Cache decision regions: moving the probe does not change the model.
      region = document.createElement('canvas'); region.width = region.height = 600;
      const pixels = region.getContext('2d');
      const positions = [];
      for (let y = 0; y < 600; y += 5) for (let x = 0; x < 600; x += 5) positions.push([(x + 2.5) / 6, 100 - (y + 2.5) / 6]);
      const predictions = model.predict(positions);
      predictions.forEach((label, index) => {
        pixels.fillStyle = light[label]; pixels.fillRect((index % 120) * 5, Math.floor(index / 120) * 5, 5, 5);
      });
      render();
    }
    function render() {
      const label = model.predict(query);
      neighbors = model.kdTree.nearest(query, k).sort((a, b) => a[1] - b[1]);
      const votes = [0, 0]; neighbors.forEach(([p]) => votes[p[2]]++);
      ctx.drawImage(region, 0, 0);
      ctx.strokeStyle = '#486277'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      neighbors.forEach(([p]) => { ctx.beginPath(); ctx.moveTo(query[0] * 6, (100 - query[1]) * 6); ctx.lineTo(p[0] * 6, (100 - p[1]) * 6); ctx.stroke(); });
      ctx.setLineDash([]);
      data.forEach((p, i) => point(ctx, p[0], p[1], colors[labels[i]]));
      const x = query[0] * 6, y = (100 - query[1]) * 6;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
      ctx.strokeStyle = '#162a38'; ctx.lineWidth = 3; ctx.stroke();
      $('knn-result').textContent = `Vorhersage: ${label === 0 ? 'Blau' : 'Orange'}`;
      $('knn-votes').textContent = `Stimmen: Blau ${votes[0]} · Orange ${votes[1]}. Probe (${number(query[0], 0)}; ${number(query[1], 0)}).`;
      $('knn-neighbors').replaceChildren(...neighbors.map(([p, d], i) => {
        const row = document.createElement('tr');
        [i + 1, p[2] === 0 ? 'Blau' : 'Orange', number(d)].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
        return row;
      }));
      snapshots.knn = () => `k-NN: k=${k}; Probe=(${number(query[0], 0)}; ${number(query[1], 0)}); Daten=${$('knn-data').selectedOptions[0].textContent}; Blau=${votes[0]}, Orange=${votes[1]}; Ausgabe=${label === 0 ? 'Blau' : 'Orange'}.`;
    }
    function updateQuery() { query = [integer($('knn-x'), 0, 100, 52), integer($('knn-y'), 0, 100, 48)]; render(); }
    $('knn-k').addEventListener('input', rebuild);
    $('knn-data').addEventListener('change', dataset);
    $('knn-x').addEventListener('change', updateQuery); $('knn-y').addEventListener('change', updateQuery);
    $('knn-reset').addEventListener('click', () => { $('knn-k').value = 1; dataset(); });
    function move(event) {
      const rect = canvas.getBoundingClientRect();
      query = [Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))), Math.round(Math.max(0, Math.min(100, 100 - (event.clientY - rect.top) / rect.height * 100)))];
      $('knn-x').value = query[0]; $('knn-y').value = query[1]; render();
    }
    canvas.addEventListener('pointerdown', event => { canvas.setPointerCapture(event.pointerId); move(event); });
    canvas.addEventListener('pointermove', event => { if (canvas.hasPointerCapture(event.pointerId)) move(event); });
    canvas.addEventListener('keydown', event => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
      if (!delta) return; event.preventDefault();
      $('knn-x').value = query[0] + delta[0]; $('knn-y').value = query[1] + delta[1]; updateQuery();
    });
    dataset();
  }

  function initKMeans() {
    const canvas = $('km-canvas'), ctx = canvas.getContext('2d'), rng = random(83);
    const data = [];
    [[24, 72], [76, 68], [51, 23]].forEach(([x, y]) => {
      for (let i = 0; i < 30; i++) data.push([x + (rng() + rng() + rng() - 1.5) * 17, y + (rng() + rng() + rng() - 1.5) * 14]);
    });
    let centers, assignments, generator, iteration = 0, change = 0, converged = false, timer, cost;
    function stop() { clearInterval(timer); timer = null; toggleIcon($('km-play'), false, 'Automatisch laufen lassen'); }
    function render() {
      frame(ctx);
      ctx.globalAlpha = .25; ctx.lineWidth = 1;
      data.forEach((p, i) => {
        const center = centers[assignments[i]]; ctx.strokeStyle = colors[assignments[i]];
        ctx.beginPath(); ctx.moveTo(p[0] * 6, (100 - p[1]) * 6); ctx.lineTo(center[0] * 6, (100 - center[1]) * 6); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      data.forEach((p, i) => point(ctx, p[0], p[1], colors[assignments[i]], 5));
      centers.forEach((center, i) => {
        point(ctx, center[0], center[1], colors[i], 13);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), center[0] * 6, (100 - center[1]) * 6);
      });
      cost = data.reduce((sum, p, i) => sum + distance(p, centers[assignments[i]]) ** 2, 0);
      $('km-iteration').textContent = iteration; $('km-cost').textContent = number(cost, 1);
      $('km-change').textContent = iteration ? number(change) : '–';
      $('km-status').textContent = converged ? 'Die Zentren ändern sich nicht mehr. Ein anderes k oder andere Startplätze können andere Gruppen ergeben.' : iteration ? 'Zuordnung und Mittelwertbildung abgeschlossen. Die nächste Iteration prüft die Nachbarschaft der neuen Zentren.' : 'Startzentren gesetzt; die Farben zeigen die anfängliche Zuordnung. Noch kein Mittelwert-Update.';
      if (centers.some((_, i) => !assignments.includes(i))) $('km-status').textContent += ' Mindestens ein Team hat keine zugeordneten Funde; sein Zentrum bleibt in diesem Versuch unverändert.';
      $('km-step').disabled = converged; $('km-play').disabled = converged;
      $('km-centers').replaceChildren(...centers.map((p, i) => {
        const row = document.createElement('tr');
        [i + 1, number(p[0]), number(p[1]), assignments.filter(a => a === i).length].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
        return row;
      }));
      snapshots.kmeans = () => `k-Means: k=${centers.length}; Start=${$('km-start').selectedOptions[0].textContent}; Iteration=${iteration}; SSE=${number(cost, 1)}; Zentren=${centers.map(p => `(${number(p[0])}; ${number(p[1])})`).join(', ')}.`;
    }
    function reset() {
      stop(); const k = integer($('km-k'), 1, 5, 3);
      const spread = [[12, 88], [85, 87], [82, 12], [15, 16], [52, 52]];
      centers = Array.from({ length: k }, (_, i) => $('km-start').value === 'close' ? [12 + i * 5, 87 - i * 3] : spread[i].slice());
      assignments = new KNN(centers, centers.map((_, i) => i), { k: 1, distance }).predict(data);
      generator = kmeansGenerator(data, k, { initialization: centers.map(p => p.slice()), maxIterations: 100, tolerance: 1e-8 });
      iteration = 0; change = 0; converged = false; render();
    }
    function step() {
      if (converged) return;
      const next = generator.next();
      if (next.done) { converged = true; stop(); render(); return; }
      change = Math.max(...centers.map((p, i) => distance(p, next.value.centroids[i])));
      centers = next.value.centroids.map(p => p.slice()); assignments = next.value.clusters.slice();
      iteration = next.value.iterations; converged = next.value.converged;
      if (converged) stop(); render();
    }
    $('km-k').addEventListener('change', reset); $('km-start').addEventListener('change', reset);
    $('km-reset').addEventListener('click', reset); $('km-step').addEventListener('click', step);
    $('km-play').addEventListener('click', () => {
      if (timer) return stop();
      toggleIcon($('km-play'), true, 'Automatisch laufen lassen');
      timer = setInterval(() => { if (!canvas.getClientRects().length || document.hidden) stop(); else step(); }, 650);
    });
    reset();
  }

  function initRL() {
    const canvas = $('rl-canvas'), ctx = canvas.getContext('2d');
    const size = 6, states = 36, start = 30, goal = 5, traps = new Set([10, 16, 22]), walls = new Set([8, 14, 20, 26]);
    const deltas = [-6, 1, 6, -1], names = ['Oben', 'Rechts', 'Unten', 'Links'], arrows = ['↑', '→', '↓', '←'];
    const terminal = state => state === goal || traps.has(state);
    function allowed(state) {
      if (terminal(state) || walls.has(state)) return [];
      const row = Math.floor(state / size), col = state % size;
      return [0, 1, 2, 3].filter(a => (a !== 0 || row > 0) && (a !== 1 || col < 5) && (a !== 2 || row < 5) && (a !== 3 || col > 0) && !walls.has(state + deltas[a]));
    }
    const env = { get: name => ({ numberOfStates: states, numerOfActions: 4 })[name], allowedActions: allowed };
    // The legacy library's Opt.get loses zero/false values; use its documented
    // solver interface with an exact getter, including zero planning and traces.
    const config = { alpha: .45, epsilon: .25, gamma: .95, update: 'qlearn', smoothPolicyUpdate: false, beta: .01, lambda: 0, replacingTraces: true, qInitVal: 0, numberOfPlanningSteps: 0 };
    let agent, state, episodeSteps, episodeReturn, episodes, outcomes, lastReturn, message, timer, pending;
    const q = (s, a) => agent.Q[a * states + s];
    function stop() { clearInterval(timer); timer = null; toggleIcon($('rl-play'), false, 'Laufen lassen'); }
    function render() {
      ctx.clearRect(0, 0, 600, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let s = 0; s < states; s++) {
        const x = (s % size) * 100, y = Math.floor(s / size) * 100, actions = allowed(s);
        const max = actions.length ? Math.max(...actions.map(a => q(s, a))) : 0;
        ctx.fillStyle = walls.has(s) ? '#44515c' : s === goal ? '#bbefd5' : traps.has(s) ? '#ffd8d6' : `hsl(163 35% ${98 - Math.max(0, max) * 2}%)`;
        ctx.fillRect(x, y, 100, 100); ctx.strokeStyle = '#b7c6ce'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 100, 100);
        ctx.fillStyle = '#243244'; ctx.font = 'bold 28px sans-serif';
        if (terminal(s)) {
          ctx.fillText(s === goal ? 'Z' : 'X', x + 50, y + 20);
          ctx.font = '16px sans-serif'; ctx.fillText(s === goal ? '+10' : '−10', x + 50, y + 78);
        }
        else if (!walls.has(s)) {
          const best = actions.find(a => Math.abs(q(s, a) - max) < 1e-9);
          ctx.fillText(max === 0 && actions.every(a => q(s, a) === 0) ? '·' : arrows[best], x + 50, y + 45);
          ctx.font = '15px sans-serif'; ctx.fillText(number(max, 1), x + 50, y + 77);
          if (s === start) { ctx.font = 'bold 16px sans-serif'; ctx.fillText('S', x + 14, y + 16); }
        }
      }
      const selected = Number($('rl-inspect').value);
      ctx.strokeStyle = '#d98b31'; ctx.lineWidth = 5; ctx.strokeRect((selected % size) * 100 + 4, Math.floor(selected / size) * 100 + 4, 92, 92);
      ctx.fillStyle = '#216ca7'; ctx.beginPath(); ctx.arc((state % size) * 100 + 50, Math.floor(state / size) * 100 + 45, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      $('rl-episodes').textContent = episodes;
      $('rl-success').textContent = outcomes.length ? `${number(outcomes.filter(Boolean).length / outcomes.length * 100, 0)} %` : '–';
      $('rl-return').textContent = number(lastReturn, 1);
      $('rl-status').textContent = message;
      $('rl-q-caption').textContent = `Q-Werte: Zeile ${Math.floor(selected / size) + 1}, Spalte ${selected % size + 1}`;
      $('rl-q').replaceChildren(...allowed(selected).map(a => {
        const row = document.createElement('tr');
        [names[a], number(q(selected, a), 3)].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
        return row;
      }));
      snapshots.rl = () => `Q-Learning: ε=${number(agent.epsilon)}; Lernen=${$('rl-learn').checked ? 'an' : 'aus'}; Episoden=${episodes}; Zielquote letzte ${outcomes.length}=${$('rl-success').textContent}; letzte Belohnung=${number(lastReturn, 1)}; α=0,45; γ=0,95.`;
    }
    function reset() {
      stop(); agent = new TDSolver(env, { get: name => config[name] }); agent.epsilon = Number($('rl-epsilon').value);
      state = start; episodeSteps = 0; episodeReturn = 0; episodes = 0; outcomes = []; lastReturn = 0; pending = false;
      message = 'Alle Q-Werte beginnen bei 0. Start: Zeile 6, Spalte 1. Ziel: Zeile 1, Spalte 6. α = 0,45; γ = 0,95.';
      render();
    }
    function step(draw = true) {
      if (pending) { state = start; episodeSteps = 0; episodeReturn = 0; pending = false; }
      const previous = state, action = agent.decide(state), next = state + deltas[action];
      const reward = next === goal ? 10 : traps.has(next) ? -10 : -.1;
      const old = q(previous, action);
      if ($('rl-learn').checked) agent.learnFromTuple(previous, action, reward, next, 0, 0);
      state = next; episodeSteps++; episodeReturn += reward;
      message = `Zustand (${Math.floor(previous / size) + 1}; ${previous % size + 1}) → ${names[action]} → (${Math.floor(state / size) + 1}; ${state % size + 1}); r=${number(reward, 1)}; Q: ${number(old, 3)} → ${number(q(previous, action), 3)}. ${agent.explored ? 'Exploration.' : 'Aktuell beste Aktion (bei Gleichstand zufällig).'} Schritt ${episodeSteps}.`;
      if (terminal(state) || episodeSteps >= 150) {
        episodes++; outcomes.push(state === goal); if (outcomes.length > 30) outcomes.shift(); lastReturn = episodeReturn; pending = true;
        message += ` Episode beendet: ${state === goal ? 'Ziel erreicht' : traps.has(state) ? 'Falle' : 'Zeitgrenze'}.`;
      }
      if (draw) render();
    }
    for (let s = 0; s < states; s++) if (allowed(s).length) {
      const option = document.createElement('option'); option.value = s; option.textContent = `Z${Math.floor(s / size) + 1} / S${s % size + 1}`; $('rl-inspect').appendChild(option);
    }
    $('rl-inspect').value = start; $('rl-inspect').addEventListener('change', render);
    canvas.addEventListener('pointerdown', event => {
      const rect = canvas.getBoundingClientRect();
      const col = Math.max(0, Math.min(5, Math.floor((event.clientX - rect.left) / rect.width * size)));
      const row = Math.max(0, Math.min(5, Math.floor((event.clientY - rect.top) / rect.height * size)));
      const selected = row * size + col; if (allowed(selected).length) { $('rl-inspect').value = selected; render(); }
    });
    canvas.addEventListener('keydown', event => {
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 }[event.key];
      if (!delta) return; event.preventDefault();
      const selected = Number($('rl-inspect').value); const next = selected + delta;
      if (allowed(selected).includes(deltas.indexOf(delta)) && allowed(next).length) { $('rl-inspect').value = next; render(); }
    });
    $('rl-epsilon').addEventListener('input', () => { agent.epsilon = Number($('rl-epsilon').value); $('rl-epsilon-value').value = number(agent.epsilon); });
    $('rl-step').addEventListener('click', () => step()); $('rl-reset').addEventListener('click', reset);
    $('rl-learn').addEventListener('change', () => {
      const learning = $('rl-learn').checked;
      message = learning ? 'Lernen eingeschaltet. Neue Rückmeldungen verändern die Q-Tabelle.' : 'Lernen ausgeschaltet. Die Q-Tabelle bleibt unverändert; ε steuert weiterhin die Aktionswahl.';
      $('rl-batch').title = learning ? '100 Episoden trainieren' : '100 Episoden ausführen';
      $('rl-batch').setAttribute('aria-label', $('rl-batch').title);
      render();
    });
    $('rl-play').addEventListener('click', () => {
      if (timer) return stop(); toggleIcon($('rl-play'), true, 'Laufen lassen');
      timer = setInterval(() => { if (!canvas.getClientRects().length || document.hidden) stop(); else step(); }, 160);
    });
    $('rl-batch').addEventListener('click', () => {
      stop(); const target = episodes + 100;
      while (episodes < target) step(false);
      render();
    });
    reset();
  }
  mountIcons(); initKNN(); initKMeans(); initRL();
})();
