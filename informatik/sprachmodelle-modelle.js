/* Explicit teaching data, not a pretrained neural language model. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Sprachmodelle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const corpus = [
    ['<s>', 'löwenherz', 'verließ', 'sein', 'schloss', '</s>'],
    ['<s>', 'löwenherz', 'schloss', 'die', 'tür', '</s>'],
    ['<s>', 'löwenherz', 'drehte', 'den', 'schlüssel', 'im', 'schloss', '</s>'],
    ['<s>', 'sein', 'schloss', 'ist', 'schön', '</s>'],
    ['<s>', 'er', 'verließ', 'den', 'garten', '</s>']
  ];
  const transitions = {
    ',': { denn: .4, ein: .1, folge: .2, Francisco: .1, San: .1, wie: .1 },
    '.': {},
    allein: { ',': .3, '.': .1, "zuhaus'": .6 },
    Applaus: { '.': .6, durch: .2, führt: .2 },
    bau: { dir: .5, ein: .2, "zuhaus'": .3 },
    bleib: { allein: .3, dir: .1, folge: .1, geradeaus: .1, nie: .1, sein: .1, soll: .1, "zuhaus'": .1 },
    denn: { es: .1, führt: .1, ging: .2, lieben: .1, sein: .3, So: .2 },
    dir: { ein: .3, folge: .1, ich: .2, Mein: .2, sich: .2 },
    durch: { ein: .3, folge: .3, San: .4 },
    ein: { Herz: .2, Schloss: .5, Weg: .3 },
    es: { '.': .3, allein: .1, folge: .2, öffnet: .1, sein: .1, wie: .2 },
    folge: { Applaus: .3, bleib: .1, Herz: .2, ich: .1, sich: .2, So: .1 },
    Francisco: { ',': .4, und: .6 },
    führt: { geradeaus: .7, öffnet: .2, soll: .1 },
    geradeaus: { ',': .1, '.': .2, dir: .1, Mein: .2, wie: .4 },
    ging: { durch: .3, ich: .1, nie: .5, sein: .1 },
    // Faithful transcription: this source row sums to 1.1, not to 1.
    Herz: { ',': .1, '.': .1, allein: .1, führt: .1, lieben: .1, nie: .1, öffnet: .4, soll: .1 },
    ich: { bau: .7, soll: .3 },
    lieben: { ',': .1, '.': .5, nie: .4 },
    Marino: { ich: .1, nie: .1, Schloss: .8 },
    Mein: { Applaus: .2, bleib: .3, ein: .2, Herz: .1, Schloss: .1, und: .1 },
    nie: { durch: .4, ging: .1, lieben: .2, sein: .1, So: .1, "zuhaus'": .1 },
    öffnet: { '.': .4, sich: .6 },
    San: { Francisco: .6, ich: .1, Marino: .3 },
    Schloss: { '.': .1, dir: .1, nie: .2, öffnet: .4, soll: .2 },
    sein: { '.': .2, ich: .1, Weg: .7 },
    sich: { '.': .6, bau: .2, lieben: .2 },
    So: { allein: .2, denn: .1, folge: .1, nie: .2, sein: .1, soll: .3 },
    soll: { ',': .1, bau: .1, bleib: .1, dir: .1, es: .2, geradeaus: .1, ich: .1, sein: .1, Weg: .1 },
    und: { allein: .1, bau: .1, ein: .1, es: .1, ging: .2, öffnet: .1, sein: .1, So: .1, "zuhaus'": .1 },
    Weg: { '.': .1, führt: .5, "zuhaus'": .4 },
    wie: { Applaus: .9, "zuhaus'": .1 },
    "zuhaus'": { ',': .7, '.': .3 }
  };
  const collator = new Intl.Collator('de', { sensitivity: 'base' });
  function alphabetical(a, b) {
    const markerA = /^<\/?s>$/.test(a), markerB = /^<\/?s>$/.test(b);
    if (markerA !== markerB) return markerA ? 1 : -1;
    return collator.compare(a, b);
  }
  function counts(sentences = corpus) {
    const table = Object.create(null);
    for (const sentence of sentences) for (let i = 0; i + 1 < sentence.length; i++) {
      const row = table[sentence[i]] || (table[sentence[i]] = Object.create(null));
      row[sentence[i + 1]] = (row[sentence[i + 1]] || 0) + 1;
    }
    return table;
  }
  function greedy(table, start, tie = 'first', limit = 32) {
    const words = start.slice(), steps = [], visited = new Set();
    while (steps.length < limit) {
      const current = words[words.length - 1];
      if (current === '.' || current === '</s>') return { words, steps, reason: 'end' };
      const key = Object.keys(table).find(key => key.toLocaleLowerCase('de') === current.toLocaleLowerCase('de'));
      if (!key || !Object.keys(table[key]).length) return { words, steps, reason: 'unknown' };
      if (visited.has(key)) return { words, steps, reason: 'cycle' };
      visited.add(key);
      const entries = Object.entries(table[key]);
      const best = Math.max(...entries.map(([, value]) => value));
      const candidates = entries.filter(([, value]) => value === best).map(([word]) => word).sort(alphabetical);
      const next = tie === 'last' ? candidates[candidates.length - 1] : candidates[0];
      steps.push({ current, next, weight: best, candidates }); words.push(next);
    }
    return { words, steps, reason: 'limit' };
  }
  function sampling(logits, temperature, strategy = 'all', k = 3, p = .9) {
    if (!logits.length || logits.some(value => !Number.isFinite(value)) || !Number.isFinite(temperature) || temperature < 0) throw new Error('Invalid logits or temperature');
    const max = Math.max(...logits);
    const exp = logits.map(value => temperature === 0 ? (value === max ? 1 : 0) : Math.exp((value - max) / temperature));
    const total = exp.reduce((sum, value) => sum + value, 0);
    const base = exp.map(value => value / total);
    const ranked = base.map((probability, index) => ({ probability, index })).sort((a, b) => b.probability - a.probability || a.index - b.index);
    let retained = ranked;
    if (temperature === 0) retained = ranked.slice(0, 1);
    else if (strategy === 'topk') retained = ranked.slice(0, Math.max(1, Math.min(logits.length, Math.floor(k))));
    else if (strategy === 'topp') {
      retained = []; let cumulative = 0;
      for (const entry of ranked) { retained.push(entry); cumulative += entry.probability; if (cumulative + 1e-12 >= p) break; }
    }
    const retainedTotal = retained.reduce((sum, entry) => sum + entry.probability, 0);
    return { base, final: base.map((value, index) => retained.some(entry => entry.index === index) ? value / retainedTotal : 0), retained: retained.map(entry => entry.index) };
  }
  return { corpus, transitions, counts, greedy, sampling, alphabetical };
});
