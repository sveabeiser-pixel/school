(function () {
  "use strict";

  const slider = document.getElementById("ki2-threshold");
  const cases = document.getElementById("ki2-cases");
  const positiveScores = [0.95, 0.85, 0.75, 0.60, 0.45, 0.20];
  const negativeScores = [0.80, 0.55, 0.40, 0.35, 0.30, 0.25, 0.22, 0.18, 0.15, 0.12, 0.10, 0.08, 0.05, 0.02];
  const examples = positiveScores.map(score => ({score, positive: true}))
    .concat(negativeScores.map(score => ({score, positive: false})));
  const formatNumber = value => value.toLocaleString("de-DE", {maximumFractionDigits: 2});
  const percentage = (count, total) => total === 0 ? "nicht definiert" :
    (100 * count / total).toLocaleString("de-DE", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + " %";

  function updateMetrics() {
    const threshold = Number(slider.value);
    const matrix = {TP: 0, TN: 0, FP: 0, FN: 0};
    cases.replaceChildren();
    examples.forEach((example, index) => {
      const predictedPositive = example.score >= threshold;
      const result = example.positive ? (predictedPositive ? "TP" : "FN") : (predictedPositive ? "FP" : "TN");
      matrix[result]++;
      const tile = document.createElement("span");
      tile.className = "ki-case";
      tile.dataset.result = result;
      tile.textContent = result;
      const label = "Fall " + (index + 1) + ": tatsächlich " + (example.positive ? "positiv" : "negativ") +
        ", Modellwert " + formatNumber(example.score) + ", vorhergesagt " + (predictedPositive ? "positiv" : "negativ") + ", " + result;
      tile.title = label;
      tile.setAttribute("aria-label", label);
      cases.appendChild(tile);
    });
    document.getElementById("ki2-threshold-value").textContent = threshold.toLocaleString("de-DE", {minimumFractionDigits: 2});
    ["TP", "TN", "FP", "FN"].forEach(key => {
      document.getElementById("ki2-" + key.toLowerCase()).textContent = key + ": " + matrix[key];
    });
    document.getElementById("ki2-accuracy").textContent = percentage(matrix.TP + matrix.TN, examples.length);
    document.getElementById("ki2-precision").textContent = percentage(matrix.TP, matrix.TP + matrix.FP);
    document.getElementById("ki2-recall").textContent = percentage(matrix.TP, matrix.TP + matrix.FN);
    document.getElementById("ki2-metric-note").textContent = matrix.TP + matrix.FP === 0 ?
      "Keine positive Vorhersage: Precision hat den Nenner 0 und ist nicht definiert. Der Recall ist 0 %." :
      "Die 20 festen Fälle sind Übungsdaten, keine medizinische Leistungsstudie.";
  }
  slider.addEventListener("input", updateMetrics);
  updateMetrics();

  // First six rows of each class in the UCI Iris data; this is an excerpt, not a test set.
  const iris = [
    [5.1,3.5,1.4,0.2,0],[4.9,3.0,1.4,0.2,0],[4.7,3.2,1.3,0.2,0],
    [4.6,3.1,1.5,0.2,0],[5.0,3.6,1.4,0.2,0],[5.4,3.9,1.7,0.4,0],
    [7.0,3.2,4.7,1.4,1],[6.4,3.2,4.5,1.5,1],[6.9,3.1,4.9,1.5,1],
    [5.5,2.3,4.0,1.3,1],[6.5,2.8,4.6,1.5,1],[5.7,2.8,4.5,1.3,1],
    [6.3,3.3,6.0,2.5,2],[5.8,2.7,5.1,1.9,2],[7.1,3.0,5.9,2.1,2],
    [6.3,2.9,5.6,1.8,2],[6.5,3.0,5.8,2.2,2],[7.6,3.0,6.6,2.1,2]
  ];
  const species = ["Setosa", "Versicolor", "Virginica"];
  const colors = ["#0f766e", "#2563eb", "#c2410c"];
  const canvas = document.getElementById("ki2-iris-canvas");
  const featureSelect = document.getElementById("ki2-iris-features");
  const filters = Array.from(document.querySelectorAll("[data-iris-class]"));
  const dataTable = document.getElementById("ki2-iris-data");
  iris.forEach(row => {
    const tr = document.createElement("tr");
    [species[row[4]], ...row.slice(0, 4).map(formatNumber)].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    dataTable.appendChild(tr);
  });

  function drawIris() {
    const width = canvas.clientWidth;
    if (!width) return;
    const height = width * 10 / 16;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const petal = featureSelect.value === "petal";
    const xIndex = petal ? 2 : 0;
    const yIndex = petal ? 3 : 1;
    const bounds = petal ? {xMin: 0, xMax: 7, yMin: 0, yMax: 3} : {xMin: 4, xMax: 8, yMin: 2, yMax: 4.5};
    const left = 48, right = 18, top = 16, bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = value => left + (value - bounds.xMin) / (bounds.xMax - bounds.xMin) * plotWidth;
    const y = value => top + plotHeight - (value - bounds.yMin) / (bounds.yMax - bounds.yMin) * plotHeight;
    ctx.font = "12px system-ui";
    ctx.textBaseline = "middle";
    for (let tick = bounds.xMin; tick <= bounds.xMax; tick += 1) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath(); ctx.moveTo(x(tick), top); ctx.lineTo(x(tick), top + plotHeight); ctx.stroke();
      ctx.fillStyle = "#475569"; ctx.textAlign = "center";
      ctx.fillText(formatNumber(tick), x(tick), top + plotHeight + 12);
    }
    for (let tick = bounds.yMin; tick <= bounds.yMax; tick += 0.5) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath(); ctx.moveTo(left, y(tick)); ctx.lineTo(width - right, y(tick)); ctx.stroke();
      ctx.fillStyle = "#475569"; ctx.textAlign = "right";
      ctx.fillText(formatNumber(tick), left - 6, y(tick));
    }
    ctx.strokeStyle = "#64748b";
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + plotHeight); ctx.lineTo(width - right, top + plotHeight); ctx.stroke();
    const name = petal ? "Kronblatt" : "Kelchblatt";
    ctx.fillStyle = "#243244"; ctx.textAlign = "center";
    ctx.fillText(name + "länge (cm)", left + plotWidth / 2, height - 10);
    ctx.save(); ctx.translate(12, top + plotHeight / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(name + "breite (cm)", 0, 0); ctx.restore();
    const enabled = filters.filter(filter => filter.checked).map(filter => Number(filter.dataset.irisClass));
    iris.forEach(row => {
      const kind = row[4];
      if (!enabled.includes(kind)) return;
      const px = x(row[xIndex]), py = y(row[yIndex]);
      ctx.fillStyle = colors[kind]; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
      ctx.beginPath();
      if (kind === 0) ctx.arc(px, py, 5, 0, 2 * Math.PI);
      else if (kind === 1) ctx.rect(px - 5, py - 5, 10, 10);
      else {ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py + 5); ctx.lineTo(px - 6, py + 5); ctx.closePath();}
      ctx.fill(); ctx.stroke();
    });
    if (!enabled.length) {
      ctx.fillStyle = "#475569";
      ctx.fillText("Keine Art ausgewählt", left + plotWidth / 2, top + plotHeight / 2);
    }
    canvas.setAttribute("aria-label", "Streudiagramm von " + (enabled.length * 6) + " Iris-Beispielen: " + name + "länge horizontal, " + name + "breite vertikal; jeweils in Zentimetern.");
  }
  featureSelect.addEventListener("change", drawIris);
  filters.forEach(filter => filter.addEventListener("change", drawIris));
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(drawIris).observe(canvas);
  else window.addEventListener("resize", drawIris);
  drawIris();
})();
