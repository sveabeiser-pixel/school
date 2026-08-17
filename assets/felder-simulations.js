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
    var velocityEl = find(root, "velocity");
    var directionEl = find(root, "direction");
    var chargeVal = find(root, "charge-value");
    var voltageVal = find(root, "voltage-value");
    var fieldVal = find(root, "field-value");
    var velocityVal = find(root, "velocity-value");
    var playBtn = find(root, "play");
    var resetBtn = find(root, "reset");
    if (!canvas || !readout || !chargeEl || !voltageEl || !fieldEl || !velocityEl || !directionEl) return;

    root.dataset.fieldParticleMounted = "1";
    var ctx = canvas.getContext("2d");
    var fixedD = 0.05;
    var particleMass = 1.2e-12;
    var trajectoryScale = 0.0025;
    var progress = 0;
    var running = false;
    var rafId = null;
    var lastTs = null;
    var syncing = false;

    function syncFromVoltage() {
      if (syncing) return;
      syncing = true;
      fieldEl.value = String(Math.round((Number(voltageEl.value) / fixedD) * 2) / 2);
      syncing = false;
      restartAtBeginning();
    }

    function syncFromField() {
      if (syncing) return;
      syncing = true;
      voltageEl.value = String(Math.round((Number(fieldEl.value) * fixedD) * 10) / 10);
      syncing = false;
      restartAtBeginning();
    }

    function values() {
      var q = Number(chargeEl.value) * 1e-9;
      var U = Number(voltageEl.value) * 1000;
      var E = Number(fieldEl.value) * 1000;
      var vx = Number(velocityEl.value) * 1000;
      var direction = directionEl.value === "up" ? -1 : 1;
      var signedE = E * direction;
      var F = q * signedE;
      var a = F / particleMass;
      return { q: q, U: U, E: E, signedE: signedE, F: F, a: a, vx: vx, direction: direction };
    }

    function syncLabels(v) {
      if (chargeVal) chargeVal.textContent = formatNumber(v.q * 1e9, 1);
      if (voltageVal) voltageVal.textContent = formatNumber(v.U / 1000, 1);
      if (fieldVal) fieldVal.textContent = formatNumber(v.E / 1000, 0);
      if (velocityVal) velocityVal.textContent = formatNumber(v.vx / 1000, 0);
    }

    function drawPlateLabel(text, x, y, color) {
      ctx.fillStyle = color;
      ctx.font = "800 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
    }

    function trajectoryPoint(v, x, startX, startY, scaleY) {
      var t = Math.max(0, (x - startX) / v.vx);
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
      var scaleY = trajectoryScale;

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

      ctx.strokeStyle = "rgba(245,158,11,.24)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      var predictedStopped = false;
      for (var x = startX; x <= exitX; x += 8) {
        var rawY = trajectoryPoint(v, x, startX, startY, scaleY);
        var y = Math.max(topPlate + 36, Math.min(bottomPlate - 20, rawY));
        if (x === startX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        if (rawY <= topPlate + 36 || rawY >= bottomPlate - 20) {
          predictedStopped = true;
          break;
        }
      }
      if (!predictedStopped) {
        var fullY = trajectoryPoint(v, exitX, startX, startY, scaleY);
        ctx.lineTo(exitX, Math.max(topPlate + 36, Math.min(bottomPlate - 20, fullY)));
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      var trailEndX = startX + (progress * (exitX - startX));
      var trailStopped = false;
      for (var tx = startX; tx <= trailEndX; tx += 6) {
        var trailRawY = trajectoryPoint(v, tx, startX, startY, scaleY);
        var trailY = Math.max(topPlate + 36, Math.min(bottomPlate - 20, trailRawY));
        if (tx === startX) ctx.moveTo(tx, trailY);
        else ctx.lineTo(tx, trailY);
        if (trailRawY <= topPlate + 36 || trailRawY >= bottomPlate - 20) {
          trailStopped = true;
          break;
        }
      }
      if (trailEndX > startX && !trailStopped) {
        var endRawY = trajectoryPoint(v, trailEndX, startX, startY, scaleY);
        var endY = Math.max(topPlate + 36, Math.min(bottomPlate - 20, endRawY));
        ctx.lineTo(trailEndX, endY);
      }
      ctx.stroke();
      ctx.lineCap = "butt";

      var pX = startX + (progress * (exitX - startX));
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

      var finalY = trajectoryPoint(v, exitX, startX, startY, scaleY);
      var hit = pY <= topPlate + 37 || pY >= bottomPlate - 21;
      var willHit = finalY <= topPlate + 37 || finalY >= bottomPlate - 21;
      readout.textContent =
        "q = " + formatNumber(v.q * 1e9, 2) + " nC\n" +
        "U = " + formatNumber(v.U / 1000, 2) + " kV, d = 5,0 cm\n" +
        "E = U/d = " + formatNumber(v.E / 1000, 1) + " kV/m\n" +
        "v_x = " + formatNumber(v.vx / 1000, 0) + " km/s\n" +
        "F_el = q·E = " + formatNumber(v.F * 1e6, 3) + " µN\n" +
        "Modell: x = v_x·t, y = 1/2·a·t² wie beim waagrechten Wurf\n" +
        "Ablenkung: " + (v.F > 0 ? "nach unten" : (v.F < 0 ? "nach oben" : "keine")) + "\n" +
        (hit ? "Treffer: Das Teilchen hat eine Platte erreicht." : (willHit ? "Hinweis: Bei diesen Werten wird das Teilchen eine Platte treffen." : "Das Teilchen verlässt den Kondensator zwischen den Platten."));
    }

    function tick(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.04, (ts - lastTs) / 1000);
      lastTs = ts;
      var v = values();
      progress = Math.min(1, progress + dt * 0.34 * Math.max(0.4, Math.min(2.2, v.vx / 26000)));
      draw();
      var W = canvas.width;
      var H = canvas.height;
      var left = 110;
      var right = W - 70;
      var topPlate = 100;
      var bottomPlate = H - 105;
      var startX = 45;
      var startY = (topPlate + bottomPlate) / 2;
      var exitX = right - 55;
      var scaleY = trajectoryScale;
      var pX = startX + (progress * (exitX - startX));
      var pY = trajectoryPoint(v, pX, startX, startY, scaleY);
      var hit = pY <= topPlate + 37 || pY >= bottomPlate - 21;
      if (progress >= 1 || hit) {
        running = false;
        if (playBtn) playBtn.textContent = "Start";
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    }

    function startStop() {
      running = !running;
      if (playBtn) playBtn.textContent = running ? "Stop" : "Start";
      if (running) {
        var v = values();
        var W = canvas.width;
        var H = canvas.height;
        var right = W - 70;
        var topPlate = 100;
        var bottomPlate = H - 105;
        var startX = 45;
        var startY = (topPlate + bottomPlate) / 2;
        var exitX = right - 55;
        var pX = startX + (progress * (exitX - startX));
        var pY = trajectoryPoint(v, pX, startX, startY, trajectoryScale);
        if (progress >= 1 || pY <= topPlate + 37 || pY >= bottomPlate - 21) progress = 0;
        lastTs = null;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function restartAtBeginning() {
      progress = 0;
      running = false;
      lastTs = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
      if (playBtn) playBtn.textContent = "Start";
      draw();
    }

    function reset() {
      chargeEl.value = "-2";
      voltageEl.value = "2.0";
      fieldEl.value = "40";
      velocityEl.value = "26";
      directionEl.value = "down";
      restartAtBeginning();
    }

    chargeEl.addEventListener("input", restartAtBeginning);
    voltageEl.addEventListener("input", syncFromVoltage);
    fieldEl.addEventListener("input", syncFromField);
    velocityEl.addEventListener("input", restartAtBeginning);
    directionEl.addEventListener("change", restartAtBeginning);
    if (playBtn) playBtn.addEventListener("click", startStop);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    draw();
  }

  function initMagneticTrajectorySim(root) {
    if (!root || (root.dataset && root.dataset.fieldMagneticMounted === "1")) return;

    var canvas = find(root, "canvas");
    var readout = find(root, "readout");
    var chargeEl = find(root, "charge");
    var speedEl = find(root, "speed");
    var fieldEl = find(root, "field");
    var directionEl = find(root, "direction");
    var chargeVal = find(root, "charge-value");
    var speedVal = find(root, "speed-value");
    var fieldVal = find(root, "field-value");
    var playBtn = find(root, "play");
    var resetBtn = find(root, "reset");
    if (!canvas || !readout || !chargeEl || !speedEl || !fieldEl || !directionEl) return;

    root.dataset.fieldMagneticMounted = "1";
    var ctx = canvas.getContext("2d");
    var particleMass = 1.2e-12;
    var progress = 0;
    var running = false;
    var rafId = null;
    var lastTs = null;

    function values() {
      var q = Number(chargeEl.value) * 1e-9;
      var speed = Number(speedEl.value) * 1000;
      var B = Number(fieldEl.value) * 1e-3;
      var direction = directionEl.value === "out" ? 1 : -1;
      var F = q * speed * B * direction;
      var absF = Math.abs(q) * speed * B;
      var radiusMeters = Math.abs(q) > 1e-18 && B > 1e-12 ? particleMass * speed / (Math.abs(q) * B) : Infinity;
      return { q: q, speed: speed, B: B, direction: direction, F: F, absF: absF, radiusMeters: radiusMeters };
    }

    function visualRadius(v) {
      if (Math.abs(v.q) < 1e-18 || v.B <= 0) return Infinity;
      var speedKm = v.speed / 1000;
      var absChargeNc = Math.max(0.05, Math.abs(v.q) * 1e9);
      var fieldMt = Math.max(0.05, v.B * 1000);
      var radius = 170 * (speedKm / 30) * (2 / absChargeNc) * (8 / fieldMt);
      return Math.max(45, Math.min(1600, radius));
    }

    function syncLabels(v) {
      if (chargeVal) chargeVal.textContent = formatNumber(v.q * 1e9, 1);
      if (speedVal) speedVal.textContent = formatNumber(v.speed / 1000, 0);
      if (fieldVal) fieldVal.textContent = formatNumber(v.B * 1000, 1);
    }

    function curveDirection(v) {
      if (Math.abs(v.q) < 1e-18 || v.B <= 0) return 0;
      return -Math.sign(v.q) * v.direction;
    }

    function drawMagneticSymbol(x, y, out) {
      ctx.strokeStyle = "rgba(30,64,175,.62)";
      ctx.fillStyle = "rgba(30,64,175,.62)";
      ctx.lineWidth = 2;
      if (out) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 7);
        ctx.lineTo(x + 7, y + 7);
        ctx.moveTo(x + 7, y - 7);
        ctx.lineTo(x - 7, y + 7);
        ctx.stroke();
      }
    }

    function positionOnPath(v, angle, startX, startY, exitX, turn, radiusPx) {
      if (turn === 0 || !isFinite(radiusPx)) {
        var x = startX + (exitX - startX) * Math.min(1, angle / (Math.PI * 1.25));
        return { x: x, y: startY };
      }
      var cx = startX;
      var cy = startY + turn * radiusPx;
      return {
        x: cx + radiusPx * Math.sin(angle),
        y: cy - turn * radiusPx * Math.cos(angle)
      };
    }

    function drawPath(v, maxAngle, startX, startY, exitX, turn, radiusPx, color, width, dashed) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (dashed) ctx.setLineDash([7, 7]);
      ctx.beginPath();
      var started = false;
      var step = Math.max(0.025, maxAngle / 180);
      for (var a = 0; a <= maxAngle; a += step) {
        var p = positionOnPath(v, a, startX, startY, exitX, turn, radiusPx);
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      var end = positionOnPath(v, maxAngle, startX, startY, exitX, turn, radiusPx);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = "butt";
    }

    function draw() {
      var v = values();
      syncLabels(v);

      var W = canvas.width;
      var H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      var left = 58;
      var right = W - 56;
      var top = 86;
      var bottom = H - 70;
      var startX = left + 34;
      var startY = (top + bottom) / 2;
      var exitX = right - 34;
      var turn = curveDirection(v);
      var radiusPx = visualRadius(v);
      var maxAngle = turn === 0 ? Math.PI * 1.25 : Math.PI * 2;
      var currentAngle = maxAngle * progress;
      var centerX = startX;
      var centerY = isFinite(radiusPx) ? startY + turn * radiusPx : startY;

      ctx.fillStyle = "rgba(37,99,235,.08)";
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.strokeStyle = "rgba(30,64,175,.28)";
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, right - left, bottom - top);

      var density = Math.max(4, Math.min(11, Math.round(3 + v.B * 1000 / 3)));
      for (var row = 0; row < density; row++) {
        for (var col = 0; col < density + 4; col++) {
          var x = left + 34 + col * ((right - left - 68) / Math.max(1, density + 3));
          var y = top + 34 + row * ((bottom - top - 68) / Math.max(1, density - 1));
          drawMagneticSymbol(x, y, v.direction === 1);
        }
      }

      ctx.strokeStyle = "rgba(15,23,42,.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(exitX, startY);
      ctx.stroke();
      ctx.setLineDash([]);

      drawPath(v, maxAngle, startX, startY, exitX, turn, radiusPx, "rgba(245,158,11,.24)", 2, true);
      drawPath(v, currentAngle, startX, startY, exitX, turn, radiusPx, "#f59e0b", 5, false);

      var p = positionOnPath(v, currentAngle, startX, startY, exitX, turn, radiusPx);
      ctx.fillStyle = v.q < 0 ? "#2563eb" : (v.q > 0 ? "#ef4444" : "#64748b");
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.q < 0 ? "-" : (v.q > 0 ? "+" : "0"), p.x, p.y);

      var vxDir = turn === 0 ? 1 : Math.cos(currentAngle);
      var vyDir = turn === 0 ? 0 : turn * Math.sin(currentAngle);
      var vLen = Math.max(1, Math.hypot(vxDir, vyDir));
      vxDir /= vLen;
      vyDir /= vLen;
      drawArrow(ctx, p.x, p.y, p.x + vxDir * 58, p.y + vyDir * 58, "#0f172a");
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 14px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("v", p.x + vxDir * 66, p.y + vyDir * 66);
      if (turn !== 0) {
        var fxDir = centerX - p.x;
        var fyDir = centerY - p.y;
        var fLen = Math.max(1, Math.hypot(fxDir, fyDir));
        fxDir /= fLen;
        fyDir /= fLen;
        drawArrow(ctx, p.x, p.y, p.x + fxDir * 62, p.y + fyDir * 62, "#dc2626");
        ctx.fillStyle = "#dc2626";
        ctx.fillText("F_L", p.x + fxDir * 70, p.y + fyDir * 70);
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Kreisbahn im homogenen Magnetfeld", 24, 36);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(v.direction === 1 ? "Magnetfeld: aus der Fläche heraus (Punkte)" : "Magnetfeld: in die Fläche hinein (Kreuze)", 24, 62);

      readout.textContent =
        "q = " + formatNumber(v.q * 1e9, 2) + " nC\n" +
        "v = " + formatNumber(v.speed / 1000, 0) + " km/s\n" +
        "B = " + formatNumber(v.B * 1000, 1) + " mT\n" +
        "F_L = q·v·B = " + formatNumber(v.F * 1e6, 3) + " µN\n" +
        "Radius: r = m·v/(|q|·B) = " + (isFinite(v.radiusMeters) ? formatNumber(v.radiusMeters, 2) + " m" : "unendlich") + "\n" +
        "Darstellung: größerer Radius bei größerem v, kleinerer Radius bei größerem |q| oder B.\n" +
        (turn === 0 ? "Keine Kreisbahn: Ohne Ladung oder ohne Magnetfeld wirkt keine Lorentzkraft." : "Die Lorentzkraft steht immer senkrecht zur momentanen Bewegungsrichtung. Deshalb ändert sich die Richtung der Geschwindigkeit, aber nicht ihr Betrag.");
    }

    function tick(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.04, (ts - lastTs) / 1000);
      lastTs = ts;
      var v = values();
      var speedFactor = Math.max(0.35, Math.min(2.5, v.speed / 30000));
      var bendFactor = Math.max(0.25, Math.min(2.2, Math.abs(v.q) * v.B / (2e-9 * 8e-3)));
      progress = Math.min(1, progress + dt * 0.16 * speedFactor * bendFactor);
      draw();
      if (progress >= 1) {
        running = false;
        if (playBtn) playBtn.textContent = "Start";
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    }

    function startStop() {
      running = !running;
      if (playBtn) playBtn.textContent = running ? "Stop" : "Start";
      if (running) {
        if (progress >= 1) progress = 0;
        lastTs = null;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function restartAtBeginning() {
      progress = 0;
      running = false;
      lastTs = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
      if (playBtn) playBtn.textContent = "Start";
      draw();
    }

    function reset() {
      chargeEl.value = "2";
      speedEl.value = "30";
      fieldEl.value = "8";
      directionEl.value = "out";
      restartAtBeginning();
    }

    chargeEl.addEventListener("input", restartAtBeginning);
    speedEl.addEventListener("input", restartAtBeginning);
    fieldEl.addEventListener("input", restartAtBeginning);
    directionEl.addEventListener("change", restartAtBeginning);
    if (playBtn) playBtn.addEventListener("click", startStop);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    draw();
  }

  function initHelixTrajectorySim(root) {
    if (!root || (root.dataset && root.dataset.fieldHelixMounted === "1")) return;

    var canvas = find(root, "canvas");
    var readout = find(root, "readout");
    var chargeEl = find(root, "charge");
    var speedEl = find(root, "speed");
    var electricEl = find(root, "electric");
    var magneticEl = find(root, "magnetic");
    var chargeVal = find(root, "charge-value");
    var speedVal = find(root, "speed-value");
    var electricVal = find(root, "electric-value");
    var magneticVal = find(root, "magnetic-value");
    var playBtn = find(root, "play");
    var resetBtn = find(root, "reset");
    if (!canvas || !readout || !chargeEl || !speedEl || !electricEl || !magneticEl) return;

    root.dataset.fieldHelixMounted = "1";
    var ctx = canvas.getContext("2d");
    var particleMass = 1.2e-12;
    var progress = 0;
    var running = false;
    var rafId = null;
    var lastTs = null;

    function values() {
      var q = Number(chargeEl.value) * 1e-9;
      var speed = Number(speedEl.value) * 1000;
      var E = Number(electricEl.value) * 1000;
      var B = Number(magneticEl.value) * 1e-3;
      var vParallel = speed * 0.55;
      var vPerp = speed * 0.835;
      var radiusMeters = Math.abs(q) > 1e-18 && B > 1e-12 ? particleMass * vPerp / (Math.abs(q) * B) : Infinity;
      var omega = Math.abs(q) > 1e-18 ? Math.abs(q) * B / particleMass : 0;
      var aParallel = q * E / particleMass;
      var axialFactor = Math.max(0.45, Math.min(2.35, 1 + Math.abs(E) / 45000));
      return { q: q, speed: speed, E: E, B: B, vParallel: vParallel, vPerp: vPerp, radiusMeters: radiusMeters, omega: omega, aParallel: aParallel, axialFactor: axialFactor };
    }

    function syncLabels(v) {
      if (chargeVal) chargeVal.textContent = formatNumber(v.q * 1e9, 1);
      if (speedVal) speedVal.textContent = formatNumber(v.speed / 1000, 0);
      if (electricVal) electricVal.textContent = formatNumber(v.E / 1000, 0);
      if (magneticVal) magneticVal.textContent = formatNumber(v.B * 1000, 1);
    }

    function visualRadius(v) {
      if (Math.abs(v.q) < 1e-18 || v.B <= 0) return 0;
      var speedKm = v.vPerp / 1000;
      var absChargeNc = Math.max(0.05, Math.abs(v.q) * 1e9);
      var fieldMt = Math.max(0.05, v.B * 1000);
      var radius = 105 * (speedKm / 25) * (2 / absChargeNc) * (8 / fieldMt);
      return Math.max(22, Math.min(165, radius));
    }

    function pointOnHelix(v, s, left, right, axisY, radiusPx) {
      var axisLength = right - left;
      var dir = Math.abs(v.q) < 1e-18 || v.B <= 0 ? 1 : Math.sign(v.q);
      var electricShift = Math.max(-0.08, Math.min(0.08, v.aParallel / 2.5e8));
      var x = left + axisLength * Math.max(0, Math.min(1, s + electricShift * s * (1 - s)));
      var turns = Math.max(0.35, Math.min(8.0, (Math.abs(v.q) * 1e9) * (v.B * 1000) / (Math.max(6, v.speed / 1000) * v.axialFactor) * 1.18));
      var angle = dir * s * turns * Math.PI * 2;
      var depth = Math.cos(angle);
      var y = axisY + Math.sin(angle) * radiusPx * 0.64;
      return { x: x, y: y, depth: depth, angle: angle, turns: turns };
    }

    function drawHelixSegments(v, maxS, left, right, axisY, radiusPx, future) {
      var step = 0.009;
      for (var pass = -1; pass <= 1; pass += 2) {
        for (var s = 0; s < maxS; s += step) {
          var p1 = pointOnHelix(v, s, left, right, axisY, radiusPx);
          var p2 = pointOnHelix(v, Math.min(maxS, s + step), left, right, axisY, radiusPx);
          var depth = (p1.depth + p2.depth) / 2;
          if ((pass < 0 && depth >= 0) || (pass > 0 && depth < 0)) continue;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          if (future) {
            ctx.strokeStyle = depth >= 0 ? "rgba(245,158,11,.30)" : "rgba(37,99,235,.18)";
            ctx.lineWidth = depth >= 0 ? 2.4 : 1.6;
            ctx.setLineDash([7, 7]);
          } else {
            ctx.strokeStyle = depth >= 0 ? "#f59e0b" : "rgba(37,99,235,.58)";
            ctx.lineWidth = depth >= 0 ? 6 : 3.2;
            ctx.setLineDash([]);
          }
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      ctx.lineCap = "butt";
    }

    function drawFieldArrow(x1, y1, x2, y2, color, label) {
      drawArrow(ctx, x1, y1, x2, y2, color);
      ctx.fillStyle = color;
      ctx.font = "800 14px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, x2 + 8, y2 + 4);
    }

    function draw() {
      var v = values();
      syncLabels(v);

      var W = canvas.width;
      var H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      var left = 92;
      var right = W - 90;
      var top = 82;
      var bottom = H - 78;
      var axisY = (top + bottom) / 2;
      var radiusPx = visualRadius(v);
      var current = progress;

      ctx.fillStyle = "rgba(37,99,235,.08)";
      ctx.fillRect(left - 32, top, right - left + 64, bottom - top);
      ctx.strokeStyle = "rgba(30,64,175,.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(left - 32, top, right - left + 64, bottom - top);

      var bLines = Math.max(4, Math.min(14, Math.round(3 + v.B * 1000 / 1.5)));
      for (var i = 0; i < bLines; i++) {
        var y = top + 32 + i * ((bottom - top - 64) / Math.max(1, bLines - 1));
        drawArrow(ctx, left - 4, y, right + 4, y, "rgba(30,64,175,.42)");
      }

      var eLines = Math.max(0, Math.min(11, Math.round(Math.abs(v.E) / 9000)));
      for (var j = 0; j < eLines; j++) {
        var ey = top + 48 + j * ((bottom - top - 96) / Math.max(1, eLines - 1));
        if (v.E >= 0) {
          drawArrow(ctx, left + 10, ey + 13, right - 10, ey + 13, "rgba(220,38,38,.32)");
        } else {
          drawArrow(ctx, right - 10, ey + 13, left + 10, ey + 13, "rgba(220,38,38,.32)");
        }
      }

      ctx.strokeStyle = "rgba(15,23,42,.22)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(left, axisY);
      ctx.lineTo(right, axisY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (radiusPx === 0) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(left, axisY);
        ctx.lineTo(left + (right - left) * current, axisY);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse((left + right) / 2, axisY + radiusPx * 0.72 + 18, (right - left) / 2, Math.max(12, radiusPx * 0.16), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "rgba(15,23,42,.16)";
        ctx.lineWidth = 1.5;
        for (var ring = 0.08; ring <= 0.96; ring += 0.12) {
          var rp = pointOnHelix(v, ring, left, right, axisY, radiusPx);
          ctx.beginPath();
          ctx.ellipse(rp.x, axisY, Math.max(8, radiusPx * 0.26), Math.max(10, radiusPx * 0.64), 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        drawHelixSegments(v, 1, left, right, axisY, radiusPx, true);
        drawHelixSegments(v, current, left, right, axisY, radiusPx, false);
      }

      var particle = pointOnHelix(v, current, left, right, axisY, radiusPx);
      var size = 11 + 5 * ((particle.depth + 1) / 2);
      ctx.fillStyle = particle.depth > 0 ? "rgba(239,68,68,.96)" : "rgba(37,99,235,.78)";
      if (v.q < 0) ctx.fillStyle = particle.depth > 0 ? "rgba(37,99,235,.96)" : "rgba(239,68,68,.72)";
      if (Math.abs(v.q) < 1e-18) ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 17px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.q < 0 ? "-" : (v.q > 0 ? "+" : "0"), particle.x, particle.y);

      drawFieldArrow(28, 38, 94, 38, "#1d4ed8", "B");
      if (v.E >= 0) {
        drawFieldArrow(28, 64, 94, 64, "#dc2626", "E");
      } else {
        drawFieldArrow(94, 64, 28, 64, "#dc2626", "E");
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Schraubenbahn im kombinierten E- und B-Feld", 24, 118);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("B erzeugt die Kreisbewegung, E verändert die Bewegung entlang der Feldrichtung.", 24, 142);

      readout.textContent =
        "q = " + formatNumber(v.q * 1e9, 2) + " nC\n" +
        "v = " + formatNumber(v.speed / 1000, 0) + " km/s\n" +
        "E = " + formatNumber(v.E / 1000, 1) + " kV/m, B = " + formatNumber(v.B * 1000, 1) + " mT\n" +
        "F_L = q·v_senkrecht·B, Radius r = m·v_senkrecht/(|q|·B)\n" +
        "r = " + (isFinite(v.radiusMeters) ? formatNumber(v.radiusMeters, 2) + " m" : "unendlich") + "\n" +
        "axiale Geschwindigkeit durch |E|: Faktor " + formatNumber(v.axialFactor, 2) + "\n" +
        "Je größer B oder |q| ist, desto enger wird die Schraube. Je größer |E| ist, desto schneller läuft das Teilchen entlang der Achse.";
    }

    function tick(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.04, (ts - lastTs) / 1000);
      lastTs = ts;
      var v = values();
      var speedFactor = Math.max(0.4, Math.min(2.4, v.speed / 30000));
      progress = Math.min(1, progress + dt * 0.13 * speedFactor * v.axialFactor);
      draw();
      if (progress >= 1) {
        running = false;
        if (playBtn) playBtn.textContent = "Start";
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    }

    function startStop() {
      running = !running;
      if (playBtn) playBtn.textContent = running ? "Stop" : "Start";
      if (running) {
        if (progress >= 1) progress = 0;
        lastTs = null;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function restartAtBeginning() {
      progress = 0;
      running = false;
      lastTs = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
      if (playBtn) playBtn.textContent = "Start";
      draw();
    }

    function reset() {
      chargeEl.value = "2";
      speedEl.value = "32";
      electricEl.value = "20";
      magneticEl.value = "8";
      restartAtBeginning();
    }

    chargeEl.addEventListener("input", restartAtBeginning);
    speedEl.addEventListener("input", restartAtBeginning);
    electricEl.addEventListener("input", restartAtBeginning);
    magneticEl.addEventListener("input", restartAtBeginning);
    if (playBtn) playBtn.addEventListener("click", startStop);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    draw();
  }

  function initInductionLab(root) {
    if (!root || (root.dataset && root.dataset.fieldInductionMounted === "1")) return;

    var canvas = find(root, "canvas");
    var readout = find(root, "readout");
    var modeEl = find(root, "mode");
    var magneticEl = find(root, "magnetic");
    var areaEl = find(root, "area");
    var turnsEl = find(root, "turns");
    var rateEl = find(root, "rate");
    var directionEl = find(root, "direction");
    var magneticVal = find(root, "magnetic-value");
    var areaVal = find(root, "area-value");
    var turnsVal = find(root, "turns-value");
    var rateVal = find(root, "rate-value");
    var modeTitle = find(root, "mode-title");
    var modeHelp = find(root, "mode-help");
    var playBtn = find(root, "play");
    var resetBtn = find(root, "reset");
    if (!canvas || !readout || !modeEl || !magneticEl || !areaEl || !turnsEl || !rateEl || !directionEl) return;

    root.dataset.fieldInductionMounted = "1";
    var ctx = canvas.getContext("2d");
    var phase = 0;
    var running = false;
    var rafId = null;
    var lastTs = null;
    var FIELD_LEFT = 350;
    var FIELD_RIGHT = 700;
    var FIELD_TOP = 62;
    var FIELD_BOTTOM = 305;

    var modeCopy = {
      translate: {
        title: "Schleife hinein- und herausfahren",
        help: "Beim Eintreten wächst die vom Feld durchsetzte Fläche, im vollständig eingetauchten Zustand bleibt sie konstant und beim Austreten nimmt sie wieder ab."
      },
      rotate: {
        title: "Schleife im Magnetfeld drehen",
        help: "Die Fläche bleibt gleich, aber ihre Projektion senkrecht zum Feld ändert sich. Fluss und Spannung sind um eine Viertelperiode verschoben."
      },
      resize: {
        title: "Schleifenfläche verändern",
        help: "Die Schleife bleibt vollständig im Feld. Bei gleichmäßiger Vergrößerung oder Verkleinerung ändert sich der Fluss linear und die Spannung bleibt abschnittsweise konstant."
      },
      "field-change": {
        title: "Magnetfeld zeitlich verändern",
        help: "Die Schleife ruht und ihre Fläche bleibt konstant. Nur die Dichte der Feldsymbole und damit B ändern sich; trotzdem wird eine Spannung induziert."
      }
    };

    function wrap(value) {
      value %= 1;
      return value < 0 ? value + 1 : value;
    }

    function triangle(value) {
      value = wrap(value);
      return value < 0.5 ? value * 2 : (1 - value) * 2;
    }

    function values() {
      return {
        mode: modeEl.value,
        maxB: Number(magneticEl.value) * 1e-3,
        area: Number(areaEl.value) * 1e-4,
        turns: Number(turnsEl.value),
        rate: Number(rateEl.value),
        fieldSign: directionEl.value === "out" ? 1 : -1
      };
    }

    function visualLoopSize(v) {
      var factor = Math.sqrt(v.area / 0.04);
      return {
        width: Math.max(88, Math.min(230, 170 * factor)),
        height: Math.max(78, Math.min(205, 155 * factor))
      };
    }

    function sampleAt(rawPhase, v) {
      var p = wrap(rawPhase);
      var size = visualLoopSize(v);
      var signedB = v.maxB * v.fieldSign;
      var areaPerp = v.area;
      var currentB = signedB;
      var angle = 0;
      var scale = 1;
      var loopX = 505;
      var loopY = (FIELD_TOP + FIELD_BOTTOM) / 2;
      var overlap = 1;

      if (v.mode === "translate") {
        loopX = 105 + p * 810;
        var loopLeft = loopX - size.width / 2;
        var loopRight = loopX + size.width / 2;
        var overlapWidth = Math.max(0, Math.min(loopRight, FIELD_RIGHT) - Math.max(loopLeft, FIELD_LEFT));
        overlap = overlapWidth / size.width;
        areaPerp = v.area * overlap;
      } else if (v.mode === "rotate") {
        angle = p * Math.PI * 2;
        areaPerp = v.area * Math.cos(angle);
      } else if (v.mode === "resize") {
        scale = 0.35 + 0.65 * triangle(p);
        areaPerp = v.area * scale;
      } else if (v.mode === "field-change") {
        currentB = signedB * triangle(p);
      }

      return {
        phase: p,
        B: currentB,
        areaPerp: areaPerp,
        phi: currentB * areaPerp,
        angle: angle,
        scale: scale,
        loopX: loopX,
        loopY: loopY,
        overlap: overlap,
        width: size.width,
        height: size.height
      };
    }

    function stateAt(rawPhase, v) {
      var sample = sampleAt(rawPhase, v);
      var delta = 0.0005;
      var plus = sampleAt(rawPhase + delta, v).phi;
      var minus = sampleAt(rawPhase - delta, v).phi;
      var cycleRate = 0.12 * v.rate;
      var dPhiDt = (plus - minus) / (2 * delta) * cycleRate;
      var voltage = -v.turns * dPhiDt;
      sample.dPhiDt = dPhiDt;
      sample.voltage = voltage;
      sample.cycleRate = cycleRate;
      return sample;
    }

    function syncLabels(v) {
      if (magneticVal) magneticVal.textContent = formatNumber(v.maxB * 1000, 0);
      if (areaVal) areaVal.textContent = formatNumber(v.area * 10000, 0);
      if (turnsVal) turnsVal.textContent = formatNumber(v.turns, 0);
      if (rateVal) rateVal.textContent = formatNumber(v.rate, 2);
      var copy = modeCopy[v.mode];
      if (modeTitle) modeTitle.textContent = copy.title;
      if (modeHelp) modeHelp.textContent = copy.help;
    }

    function drawMagneticSymbol(x, y, sign, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#1d4ed8";
      ctx.fillStyle = "#1d4ed8";
      ctx.lineWidth = 2;
      if (sign >= 0) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 6);
        ctx.lineTo(x + 6, y + 6);
        ctx.moveTo(x + 6, y - 6);
        ctx.lineTo(x - 6, y + 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawField(state, v) {
      ctx.fillStyle = "rgba(37,99,235,.075)";
      ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOTTOM - FIELD_TOP);
      ctx.strokeStyle = "rgba(30,64,175,.32)";
      ctx.lineWidth = 2;
      ctx.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOTTOM - FIELD_TOP);

      var strength = Math.max(0, Math.min(1, Math.abs(state.B) / 0.1));
      var cols = strength === 0 ? 0 : 3 + Math.round(strength * 12);
      var rows = strength === 0 ? 0 : 2 + Math.round(strength * 7);
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var x = FIELD_LEFT + 28 + col * ((FIELD_RIGHT - FIELD_LEFT - 56) / Math.max(1, cols - 1));
          var y = FIELD_TOP + 30 + row * ((FIELD_BOTTOM - FIELD_TOP - 60) / Math.max(1, rows - 1));
          drawMagneticSymbol(x, y, state.B >= 0 ? 1 : -1, 0.42 + strength * 0.4);
        }
      }

      ctx.fillStyle = "#1e3a8a";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "left";
      if (Math.abs(state.B) < 1e-8) {
        ctx.fillText("B = 0", FIELD_LEFT + 12, FIELD_TOP + 22);
      } else {
        ctx.fillText(state.B > 0 ? "B aus der Fläche" : "B in die Fläche", FIELD_LEFT + 12, FIELD_TOP + 22);
      }
    }

    function drawCurrentArrows(x, y, width, height, direction) {
      if (!direction || width < 34 || height < 34) return;
      var left = x - width / 2;
      var right = x + width / 2;
      var top = y - height / 2;
      var bottom = y + height / 2;
      var color = "#dc2626";
      if (direction > 0) {
        drawArrow(ctx, right - 16, top, left + 16, top, color);
        drawArrow(ctx, left, top + 16, left, bottom - 16, color);
        drawArrow(ctx, left + 16, bottom, right - 16, bottom, color);
        drawArrow(ctx, right, bottom - 16, right, top + 16, color);
      } else {
        drawArrow(ctx, left + 16, top, right - 16, top, color);
        drawArrow(ctx, right, top + 16, right, bottom - 16, color);
        drawArrow(ctx, right - 16, bottom, left + 16, bottom, color);
        drawArrow(ctx, left, bottom - 16, left, top + 16, color);
      }
    }

    function drawLoop(state, v) {
      var x = state.loopX;
      var y = state.loopY;
      var width = state.width;
      var height = state.height;

      if (v.mode === "rotate") {
        width = Math.max(8, Math.abs(Math.cos(state.angle)) * state.width);
      } else if (v.mode === "resize") {
        var sideScale = Math.sqrt(state.scale);
        width *= sideScale;
        height *= sideScale;
      }

      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 7;
      ctx.lineJoin = "round";
      ctx.strokeRect(x - width / 2, y - height / 2, width, height);
      ctx.lineJoin = "miter";

      if (v.mode === "translate" && state.overlap > 0 && state.overlap < 1) {
        var loopLeft = x - width / 2;
        var overlapLeft = Math.max(loopLeft, FIELD_LEFT);
        var overlapRight = Math.min(x + width / 2, FIELD_RIGHT);
        ctx.fillStyle = "rgba(5,150,105,.17)";
        ctx.fillRect(overlapLeft, y - height / 2, Math.max(0, overlapRight - overlapLeft), height);
      }

      if (v.mode === "rotate") {
        var depth = Math.sin(state.angle) * 24;
        ctx.strokeStyle = "rgba(4,120,87,.38)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - width / 2, y - height / 2);
        ctx.lineTo(x - width / 2 + depth, y - height / 2 - 14);
        ctx.moveTo(x + width / 2, y - height / 2);
        ctx.lineTo(x + width / 2 + depth, y - height / 2 - 14);
        ctx.stroke();
      }

      if (v.mode === "resize") {
        ctx.fillStyle = "#f59e0b";
        [[x - width / 2, y - height / 2], [x + width / 2, y - height / 2], [x - width / 2, y + height / 2], [x + width / 2, y + height / 2]].forEach(function (point) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 7, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      var threshold = 1e-5;
      drawCurrentArrows(x, y, width, height, Math.abs(state.voltage) > threshold ? Math.sign(state.voltage) : 0);
    }

    function drawMetrics(state) {
      var x = 732;
      var y = 66;
      var width = 224;
      var height = 238;
      ctx.fillStyle = "rgba(248,250,252,.94)";
      ctx.strokeStyle = "rgba(100,116,139,.35)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 17px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Momentanwerte", x + 14, y + 26);
      ctx.font = "14px ui-monospace, monospace";
      var lines = [
        "B = " + formatNumber(state.B * 1000, 1) + " mT",
        "A⊥ = " + formatNumber(state.areaPerp * 10000, 1) + " cm²",
        "Φ = " + formatNumber(state.phi * 1000, 3) + " mWb",
        "dΦ/dt = " + formatNumber(state.dPhiDt * 1000, 3) + " mWb/s",
        "Uind = " + formatNumber(state.voltage * 1000, 2) + " mV"
      ];
      lines.forEach(function (line, index) {
        ctx.fillText(line, x + 14, y + 56 + index * 25);
      });
      ctx.font = "700 13px system-ui, sans-serif";
      var induced = Math.abs(state.dPhiDt) < 1e-7 ? "kein Gegenfeld" : (state.dPhiDt > 0 ? "Bind in die Fläche" : "Bind aus der Fläche");
      ctx.fillStyle = Math.abs(state.dPhiDt) < 1e-7 ? "#64748b" : "#b91c1c";
      ctx.fillText(induced, x + 14, y + 218);
    }

    function drawGraph(v, y, height, key, color, label, unitFactor, unit) {
      var left = 60;
      var right = 950;
      var top = y;
      var bottom = y + height;
      var samples = [];
      var maxAbs = 0;
      for (var i = 0; i <= 180; i++) {
        var p = i / 180;
        var value = stateAt(p, v)[key] * unitFactor;
        samples.push(value);
        maxAbs = Math.max(maxAbs, Math.abs(value));
      }
      maxAbs = Math.max(maxAbs, 1e-9);
      var mid = (top + bottom) / 2;
      ctx.strokeStyle = "rgba(100,116,139,.34)";
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, right - left, height);
      ctx.beginPath();
      ctx.moveTo(left, mid);
      ctx.lineTo(right, mid);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      samples.forEach(function (value, index) {
        var x = left + index / 180 * (right - left);
        var py = mid - value / maxAbs * (height * 0.39);
        if (index === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      });
      ctx.stroke();

      var markerX = left + phase * (right - left);
      ctx.strokeStyle = "rgba(15,23,42,.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(markerX, top);
      ctx.lineTo(markerX, bottom);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label + "  ±" + formatNumber(maxAbs, maxAbs < 0.1 ? 3 : 2) + " " + unit, left + 8, top + 16);
      ctx.fillStyle = "#475569";
      ctx.textAlign = "right";
      ctx.fillText("eine Periode", right - 8, bottom - 7);
    }

    function draw() {
      var v = values();
      var state = stateAt(phase, v);
      syncLabels(v);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0f172a";
      ctx.font = "800 20px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(modeCopy[v.mode].title, 24, 32);
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText("Grün: Leiterschleife · Rot: technischer Induktionsstrom · Blau: äußeres Magnetfeld", 24, 53);

      drawField(state, v);
      drawLoop(state, v);
      drawMetrics(state);
      drawGraph(v, 350, 82, "phi", "#2563eb", "magnetischer Fluss Φ", 1000, "mWb");
      drawGraph(v, 456, 82, "voltage", "#ea580c", "Induktionsspannung Uind", 1000, "mV");

      var change = Math.abs(state.dPhiDt) < 1e-7 ? "konstant" : (state.dPhiDt > 0 ? "nimmt zu" : "nimmt ab");
      var currentDirection = Math.abs(state.voltage) < 1e-5 ? "kein Induktionsstrom" : (state.voltage > 0 ? "gegen den Uhrzeigersinn" : "im Uhrzeigersinn");
      var inducedField = Math.abs(state.dPhiDt) < 1e-7 ? "kein induziertes Gegenfeld" : (state.dPhiDt > 0 ? "in die Fläche hinein" : "aus der Fläche heraus");
      readout.textContent =
        modeCopy[v.mode].title + "\n" +
        "Φ = B·A⊥ = " + formatNumber(state.phi * 1000, 4) + " mWb; der Fluss " + change + ".\n" +
        "U_ind = -n·dΦ/dt = " + formatNumber(state.voltage * 1000, 3) + " mV\n" +
        "Technische Stromrichtung: " + currentDirection + ".\n" +
        "Lenz: " + inducedField + ".";
    }

    function tick(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      phase = wrap(phase + dt * 0.12 * Number(rateEl.value));
      draw();
      rafId = window.requestAnimationFrame(tick);
    }

    function startStop() {
      running = !running;
      if (playBtn) playBtn.textContent = running ? "Stop" : "Start";
      if (running) {
        lastTs = null;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(tick);
      } else if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function stopAtBeginning() {
      running = false;
      phase = 0;
      lastTs = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
      if (playBtn) playBtn.textContent = "Start";
      draw();
    }

    function reset() {
      modeEl.value = "translate";
      magneticEl.value = "40";
      areaEl.value = "400";
      turnsEl.value = "20";
      rateEl.value = "1";
      directionEl.value = "out";
      stopAtBeginning();
    }

    modeEl.addEventListener("change", stopAtBeginning);
    [magneticEl, areaEl, turnsEl, rateEl].forEach(function (control) {
      control.addEventListener("input", draw);
    });
    directionEl.addEventListener("change", draw);
    if (playBtn) playBtn.addEventListener("click", startStop);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    draw();
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
  register("magnetic-trajectory", initMagneticTrajectorySim);
  register("helix-trajectory", initHelixTrajectorySim);
  register("induction-lab", initInductionLab);
  window.FieldSim = { mountAll: mountAll, mount: mount };
})(window, document);
