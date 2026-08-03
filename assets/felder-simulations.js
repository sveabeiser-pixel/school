(function (window, document) {
  "use strict";

  var registry = Object.create(null);
  var EPS0 = 8.854e-12;

  function register(key, initFn) {
    registry[key] = initFn;
  }

  function find(root, role) {
    return root.querySelector('[data-role="' + role + '"]');
  }

  function formatNumber(value, digits) {
    return Number(value).toLocaleString("de-DE", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var size = 10;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function initCapacitorSim(root) {
    if (!root || (root.dataset && root.dataset.fieldCapacitorMounted === "1")) return;

    var canvas = find(root, "canvas");
    var readout = find(root, "readout");
    var voltageEl = find(root, "voltage");
    var distanceEl = find(root, "distance");
    var areaEl = find(root, "area");
    var epsEl = find(root, "epsilon");
    var sourceEl = find(root, "source-connected");
    var voltageVal = find(root, "voltage-value");
    var distanceVal = find(root, "distance-value");
    var areaVal = find(root, "area-value");
    var epsVal = find(root, "epsilon-value");
    var resetBtn = find(root, "reset");
    if (!canvas || !readout || !voltageEl || !distanceEl || !areaEl || !epsEl) return;

    root.dataset.fieldCapacitorMounted = "1";
    var ctx = canvas.getContext("2d");
    var frozenQ = null;

    function capacitance(d, A, epsr) {
      return EPS0 * epsr * A / d;
    }

    function values() {
      var sourceConnected = !sourceEl || sourceEl.checked;
      var sourceU = Number(voltageEl.value) * 1000;
      var d = Number(distanceEl.value) / 100;
      var A = Number(areaEl.value) / 10000;
      var epsr = Number(epsEl.value);
      var C = capacitance(d, A, epsr);
      if (frozenQ === null) frozenQ = C * sourceU;
      var Q = sourceConnected ? C * sourceU : frozenQ;
      var U = sourceConnected ? sourceU : Q / C;
      var E = U / d;
      var sigma = Q / A;
      if (sourceConnected) frozenQ = Q;
      return { U: U, d: d, A: A, epsr: epsr, E: E, C: C, Q: Q, sigma: sigma, sourceConnected: sourceConnected };
    }

    function syncLabels(v) {
      if (voltageVal) voltageVal.textContent = formatNumber(v.U / 1000, 1);
      if (distanceVal) distanceVal.textContent = formatNumber(v.d * 100, 1);
      if (areaVal) areaVal.textContent = formatNumber(v.A * 10000, 0);
      if (epsVal) epsVal.textContent = formatNumber(v.epsr, 1);
      voltageEl.disabled = !v.sourceConnected;
      voltageEl.title = v.sourceConnected ? "" : "Die Spannungsquelle ist getrennt. Die Ladung Q bleibt konstant.";
    }

    function plusMinus(ctx, text, x, y, color, size) {
      ctx.fillStyle = color;
      ctx.font = "700 " + size + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
    }

    function draw() {
      var v = values();
      syncLabels(v);

      var W = canvas.width;
      var H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      var centerX = W * 0.52;
      var gap = 110 + (v.d - 0.01) / 0.09 * 210;
      var plateH = 190 + (v.A - 0.005) / 0.035 * 170;
      plateH = Math.max(150, Math.min(370, plateH));
      var plateW = 18;
      var leftX = centerX - gap / 2;
      var rightX = centerX + gap / 2;
      var topY = H / 2 - plateH / 2;
      var bottomY = H / 2 + plateH / 2;

      var grad = ctx.createLinearGradient(leftX, 0, rightX, 0);
      grad.addColorStop(0, "rgba(239,68,68,.16)");
      grad.addColorStop(.5, "rgba(37,99,235,.08)");
      grad.addColorStop(1, "rgba(59,130,246,.16)");
      ctx.fillStyle = grad;
      ctx.fillRect(leftX + plateW, topY, rightX - leftX - plateW * 2, plateH);

      if (v.epsr > 1.05) {
        ctx.fillStyle = "rgba(245,158,11,.18)";
        ctx.fillRect(leftX + plateW + 8, topY + 12, rightX - leftX - plateW * 2 - 16, plateH - 24);
        ctx.strokeStyle = "rgba(180,83,9,.45)";
        ctx.setLineDash([8, 7]);
        ctx.strokeRect(leftX + plateW + 8, topY + 12, rightX - leftX - plateW * 2 - 16, plateH - 24);
        ctx.setLineDash([]);
      }

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(leftX, topY, plateW, plateH);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(rightX - plateW, topY, plateW, plateH);

      ctx.fillStyle = "#334155";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("positive Platte", leftX + plateW / 2, topY - 18);
      ctx.fillText("negative Platte", rightX - plateW / 2, topY - 18);

      var chargeLevel = Math.abs(v.Q) / 1e-9;
      var chargeCount = Math.max(2, Math.min(9, Math.round(2 + chargeLevel * 1.15)));
      for (var i = 0; i < chargeCount; i++) {
        var y = topY + 30 + i * ((plateH - 60) / Math.max(1, chargeCount - 1));
        plusMinus(ctx, "+", leftX + plateW / 2, y, "#fff", 24);
        plusMinus(ctx, "-", rightX - plateW / 2, y, "#fff", 28);
      }

      var fieldCount = Math.max(4, Math.min(24, Math.round(3 + v.E / 35000)));
      for (var j = 0; j < fieldCount; j++) {
        var fy = topY + 18 + j * ((plateH - 36) / Math.max(1, fieldCount - 1));
        drawArrow(ctx, leftX + plateW + 16, fy, rightX - plateW - 16, fy, "rgba(30,64,175,.74)");
      }

      if (v.epsr > 1.05) {
        var dipoles = Math.min(8, Math.max(3, Math.round(v.epsr)));
        for (var k = 0; k < dipoles; k++) {
          var dx = leftX + plateW + 42 + k * ((rightX - leftX - plateW * 2 - 84) / Math.max(1, dipoles - 1));
          var dy = bottomY - 30;
          plusMinus(ctx, "-", dx - 7, dy, "#2563eb", 14);
          plusMinus(ctx, "+", dx + 7, dy, "#ef4444", 14);
        }
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Plattenkondensator", 26, 34);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("Mehr Zeichen: größere gespeicherte Ladungsmenge Q", 26, 61);
      ctx.fillText("Mehr Feldlinien: größere Feldstärke E = U / d", 26, 84);
      ctx.fillText(v.sourceConnected ? "Quelle angeschlossen: U fest, Q passt sich an" : "Quelle getrennt: Q fest, U passt sich an", 26, 107);

      var wireY = bottomY + 42;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftX + plateW / 2, bottomY);
      ctx.lineTo(leftX + plateW / 2, wireY);
      ctx.lineTo(rightX - plateW / 2, wireY);
      ctx.lineTo(rightX - plateW / 2, bottomY);
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.fillRect(centerX - 78, wireY - 22, 156, 44);
      ctx.strokeRect(centerX - 78, wireY - 22, 156, 44);
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(v.sourceConnected ? formatNumber(v.U / 1000, 1) + " kV" : "getrennt", centerX, wireY + 1);

      readout.textContent =
        (v.sourceConnected ? "Spannungsquelle angeschlossen: U vorgegeben, Q verändert sich.\n" : "Spannungsquelle getrennt: Q bleibt konstant, U = Q/C verändert sich.\n") +
        "U = " + formatNumber(v.U / 1000, 2) + " kV\n" +
        "d = " + formatNumber(v.d * 100, 1) + " cm, A = " + formatNumber(v.A * 10000, 0) + " cm², εr = " + formatNumber(v.epsr, 1) + "\n" +
        "E = U/d = " + formatNumber(v.E / 1000, 1) + " kV/m\n" +
        "C = ε0·εr·A/d = " + formatNumber(v.C * 1e12, 2) + " pF\n" +
        "Q = C·U = " + formatNumber(v.Q * 1e9, 2) + " nC\n" +
        "σ = Q/A = " + formatNumber(v.sigma * 1e9, 2) + " nC/m²";
    }

    function reset() {
      voltageEl.value = "2.0";
      distanceEl.value = "4.0";
      areaEl.value = "200";
      epsEl.value = "1.0";
      if (sourceEl) sourceEl.checked = true;
      frozenQ = null;
      draw();
    }

    [voltageEl, distanceEl, areaEl, epsEl].forEach(function (el) {
      el.addEventListener("input", draw);
    });
    if (sourceEl) {
      sourceEl.addEventListener("change", function () {
        var v = values();
        if (!sourceEl.checked) frozenQ = v.Q;
        draw();
      });
    }
    if (resetBtn) resetBtn.addEventListener("click", reset);
    draw();
  }

  function initParticleTrajectorySim(root) {
    if (!root || (root.dataset && root.dataset.fieldParticleMounted === "1")) return;

    var canvas = find(root, "canvas");
    var readout = find(root, "readout");
    var chargeEl = find(root, "charge");
    var voltageEl = find(root, "voltage");
    var fieldEl = find(root, "field");
    var directionEl = find(root, "direction");
    var chargeVal = find(root, "charge-value");
    var voltageVal = find(root, "voltage-value");
    var fieldVal = find(root, "field-value");
    var resetBtn = find(root, "reset");
    if (!canvas || !readout || !chargeEl || !voltageEl || !fieldEl || !directionEl) return;

    root.dataset.fieldParticleMounted = "1";
    var ctx = canvas.getContext("2d");
    var fixedD = 0.05;
    var particleMass = 1.2e-12;
    var vx = 36000;
    var animT = 0;
    var lastTs = null;
    var syncing = false;

    function syncFromVoltage() {
      if (syncing) return;
      syncing = true;
      fieldEl.value = String(Math.round((Number(voltageEl.value) / fixedD) * 2) / 2);
      syncing = false;
      draw();
    }

    function syncFromField() {
      if (syncing) return;
      syncing = true;
      voltageEl.value = String(Math.round((Number(fieldEl.value) * fixedD) * 10) / 10);
      syncing = false;
      draw();
    }

    function values() {
      var q = Number(chargeEl.value) * 1e-9;
      var U = Number(voltageEl.value) * 1000;
      var E = Number(fieldEl.value) * 1000;
      var direction = directionEl.value === "up" ? -1 : 1;
      var signedE = E * direction;
      var F = q * signedE;
      var a = F / particleMass;
      return { q: q, U: U, E: E, signedE: signedE, F: F, a: a, direction: direction };
    }

    function syncLabels(v) {
      if (chargeVal) chargeVal.textContent = formatNumber(v.q * 1e9, 1);
      if (voltageVal) voltageVal.textContent = formatNumber(v.U / 1000, 1);
      if (fieldVal) fieldVal.textContent = formatNumber(v.E / 1000, 0);
    }

    function drawPlateLabel(text, x, y, color) {
      ctx.fillStyle = color;
      ctx.font = "800 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
    }

    function trajectoryPoint(v, x, startX, startY, scaleY) {
      var t = Math.max(0, (x - startX) / vx);
      return startY + 0.5 * v.a * t * t * scaleY;
    }

    function draw() {
      var v = values();
      syncLabels(v);

      var W = canvas.width;
      var H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      var left = 110;
      var right = W - 70;
      var topPlate = 100;
      var bottomPlate = H - 105;
      var plateH = 20;
      var startX = 45;
      var startY = (topPlate + bottomPlate) / 2;
      var exitX = right - 55;
      var scaleY = 0.0000065;

      ctx.fillStyle = "rgba(37,99,235,.08)";
      ctx.fillRect(left, topPlate + plateH, right - left, bottomPlate - topPlate - plateH);

      var topPositive = v.direction === 1;
      ctx.fillStyle = topPositive ? "#ef4444" : "#2563eb";
      ctx.fillRect(left, topPlate, right - left, plateH);
      ctx.fillStyle = topPositive ? "#2563eb" : "#ef4444";
      ctx.fillRect(left, bottomPlate, right - left, plateH);

      var signs = 16;
      for (var i = 0; i < signs; i++) {
        var sx = left + 28 + i * ((right - left - 56) / Math.max(1, signs - 1));
        drawPlateLabel(topPositive ? "+" : "-", sx, topPlate + plateH / 2, "#ffffff");
        drawPlateLabel(topPositive ? "-" : "+", sx, bottomPlate + plateH / 2, "#ffffff");
      }

      var fieldCount = Math.max(4, Math.min(18, Math.round(v.E / 6500)));
      for (var j = 0; j < fieldCount; j++) {
        var fx = left + 42 + j * ((right - left - 84) / Math.max(1, fieldCount - 1));
        if (v.direction === 1) {
          drawArrow(ctx, fx, topPlate + 42, fx, bottomPlate - 20, "rgba(30,64,175,.72)");
        } else {
          drawArrow(ctx, fx, bottomPlate - 20, fx, topPlate + 42, "rgba(30,64,175,.72)");
        }
      }

      ctx.strokeStyle = "rgba(15,23,42,.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(exitX + 45, startY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (var x = startX; x <= exitX; x += 8) {
        var y = trajectoryPoint(v, x, startX, startY, scaleY);
        y = Math.max(topPlate + 36, Math.min(bottomPlate - 20, y));
        if (x === startX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      var pX = startX + ((animT % 1) * (exitX - startX));
      var pY = trajectoryPoint(v, pX, startX, startY, scaleY);
      pY = Math.max(topPlate + 36, Math.min(bottomPlate - 20, pY));
      ctx.fillStyle = v.q < 0 ? "#2563eb" : (v.q > 0 ? "#ef4444" : "#64748b");
      ctx.beginPath();
      ctx.arc(pX, pY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.q < 0 ? "-" : (v.q > 0 ? "+" : "0"), pX, pY);

      var forceScale = Math.max(-95, Math.min(95, v.F * 1.8e7));
      if (Math.abs(forceScale) > 4) {
        drawArrow(ctx, pX + 26, pY, pX + 26, pY + forceScale, "#dc2626");
        ctx.fillStyle = "#dc2626";
        ctx.font = "700 14px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("F_el", pX + 34, pY + forceScale / 2);
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Teilchenbahn im homogenen Kondensatorfeld", 24, 36);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("Feldrichtung: von Plus nach Minus", 24, 62);
      ctx.fillText("Gelbe Kurve: berechnete Bahn bei konstanter horizontaler Geschwindigkeit", 24, 84);

      var hit = pY <= topPlate + 37 || pY >= bottomPlate - 21;
      readout.textContent =
        "q = " + formatNumber(v.q * 1e9, 2) + " nC\n" +
        "U = " + formatNumber(v.U / 1000, 2) + " kV, d = 5,0 cm\n" +
        "E = U/d = " + formatNumber(v.E / 1000, 1) + " kV/m\n" +
        "F_el = q·E = " + formatNumber(v.F * 1e6, 3) + " µN\n" +
        "Ablenkung: " + (v.F > 0 ? "nach unten" : (v.F < 0 ? "nach oben" : "keine")) + "\n" +
        (hit ? "Hinweis: Bei diesen Werten würde das Teilchen eine Platte treffen." : "Das Teilchen verlässt den Kondensator zwischen den Platten.");
    }

    function tick(ts) {
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.04, (ts - lastTs) / 1000);
      lastTs = ts;
      animT += dt * 0.22;
      draw();
      window.requestAnimationFrame(tick);
    }

    function reset() {
      chargeEl.value = "-2";
      voltageEl.value = "2.0";
      fieldEl.value = "40";
      directionEl.value = "down";
      animT = 0;
      draw();
    }

    chargeEl.addEventListener("input", draw);
    voltageEl.addEventListener("input", syncFromVoltage);
    fieldEl.addEventListener("input", syncFromField);
    directionEl.addEventListener("change", draw);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    draw();
    window.requestAnimationFrame(tick);
  }

  function mount(root) {
    if (!root || !root.getAttribute) return;
    var key = root.getAttribute("data-field-sim");
    var initFn = registry[key];
    if (initFn) initFn(root);
  }

  function mountAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll ? scope.querySelectorAll("[data-field-sim]") : [];
    Array.prototype.forEach.call(nodes, mount);
  }

  register("capacitor", initCapacitorSim);
  register("particle-trajectory", initParticleTrajectorySim);
  window.FieldSim = { mountAll: mountAll, mount: mount };
})(window, document);
