(function (window, document) {
  "use strict";

  var global = window;
  var registry = Object.create(null);

  function createScopedIdGetter(root) {
    return function getById(id) {
      if (root && root.querySelector) {
        var local = root.querySelector('[id="' + id + '"]');
        if (local) return local;
      }
      return document.getElementById(id);
    };
  }

  function register(key, initFn) { registry[key] = initFn; }

  function mount(root) {
    if (!root || !root.getAttribute) return;
    var key = root.getAttribute('data-wave-sim');
    var initFn = registry[key];
    if (!initFn) return;
    if (root.dataset && root.dataset.waveSimMounted === "1") return;
    initFn(root);
    if (root.dataset) root.dataset.waveSimMounted = "1";
  }

  function mountAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll ? scope.querySelectorAll('[data-wave-sim]') : [];
    Array.prototype.forEach.call(nodes, mount);
  }

  function destroy(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll ? scope.querySelectorAll('[data-wave-sim]') : [];
    Array.prototype.forEach.call(nodes, function (node) {
      if (!node.dataset || node.dataset.waveSimMounted !== "1") return;
      var targets = [node];
      if (node.querySelectorAll) {
        Array.prototype.push.apply(targets, node.querySelectorAll('*'));
      }
      Array.prototype.forEach.call(targets, function (target) {
        if (target && target.dispatchEvent) {
          target.dispatchEvent(new Event('wb-destroy'));
        }
        if (!target || !target.dataset) return;
        Object.keys(target.dataset).forEach(function (key) {
          if (/^wb.*Init$/.test(key)) delete target.dataset[key];
        });
      });
      delete node.dataset.waveSimMounted;
    });
  }

function initTransversalSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("transversalWaveCanvas");
      const readout = getById("transversalWaveReadout");
      const ampEl = getById("transAmp");
      const freqEl = getById("transFreq");
      const speedEl = getById("transSpeed");
      const ampVal = getById("transAmpVal");
      const freqVal = getById("transFreqVal");
      const speedVal = getById("transSpeedVal");
      const pauseBtn = getById("transPauseBtn");
      const resetBtn = getById("transResetBtn");
      if (!canvas || !readout || !ampEl || !freqEl || !speedEl || !pauseBtn || !resetBtn) return;
      if (canvas.dataset.wbTransversalInit === "1") return;
      canvas.dataset.wbTransversalInit = "1";

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const baseY = H * 0.58;
      const left = 56;
      const right = W - 48;
      const points = 32;
      let phase = 0;
      let paused = false;
      let rafId = 0;
      let lastTs = 0;

      function syncLabels() {
        ampVal.textContent = Number(ampEl.value).toFixed(2);
        freqVal.textContent = Number(freqEl.value).toFixed(2);
        speedVal.textContent = Number(speedEl.value).toFixed(2);
      }

      function drawAxes() {
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(left, baseY);
        ctx.lineTo(right, baseY);
        ctx.stroke();
        ctx.fillStyle = "#64748b";
        ctx.font = "18px sans-serif";
        ctx.fillText("Ausbreitungsrichtung", right - 180, baseY - 14);
        ctx.beginPath();
        ctx.moveTo(right - 18, baseY - 8);
        ctx.lineTo(right, baseY);
        ctx.lineTo(right - 18, baseY + 8);
        ctx.stroke();
      }

      function draw(ts) {
        if (!canvas.isConnected) return;
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        if (!paused) {
          phase += dt * Number(freqEl.value) * 2.3;
        }

        const A = Number(ampEl.value) * 70;
        const c = Number(speedEl.value) * 2.4;
        const lambdaPx = 230 / Math.max(0.35, Number(freqEl.value));

        ctx.clearRect(0, 0, W, H);
        drawAxes();

        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 360; i++) {
          const x = left + (right - left) * (i / 359);
          const y = baseY - A * Math.sin((x / lambdaPx) - phase * c);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        for (let i = 0; i < points; i++) {
          const x0 = left + (right - left) * (i / (points - 1));
          const y = baseY - A * Math.sin((x0 / lambdaPx) - phase * c);

          ctx.strokeStyle = "rgba(100,116,139,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x0, baseY - 85);
          ctx.lineTo(x0, baseY + 85);
          ctx.stroke();

          ctx.fillStyle = "#0f766e";
          ctx.beginPath();
          ctx.arc(x0, y, 8.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "#334155";
        ctx.font = "20px sans-serif";
        ctx.fillText("Transversalwelle", left, 36);
        readout.textContent =
          "Teilchenbewegung: senkrecht zur Ausbreitungsrichtung\n" +
          "Momentaufnahme: Wellenberge und Wellentäler\n" +
          "Beobachte: Die Punkte schwingen auf und ab, während die Form nach rechts läuft.";
        rafId = requestAnimationFrame(draw);
      }

      ampEl.addEventListener("input", syncLabels);
      freqEl.addEventListener("input", syncLabels);
      speedEl.addEventListener("input", syncLabels);
      pauseBtn.addEventListener("click", () => {
        paused = !paused;
        pauseBtn.textContent = paused ? "Weiter" : "Pause";
      });
      resetBtn.addEventListener("click", () => {
        phase = 0;
        lastTs = 0;
      });
      syncLabels();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initLongitudinalSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("longitudinalWaveCanvas");
      const readout = getById("longitudinalWaveReadout");
      const ampEl = getById("longAmp");
      const freqEl = getById("longFreq");
      const speedEl = getById("longSpeed");
      const ampVal = getById("longAmpVal");
      const freqVal = getById("longFreqVal");
      const speedVal = getById("longSpeedVal");
      const pauseBtn = getById("longPauseBtn");
      const resetBtn = getById("longResetBtn");
      if (!canvas || !readout || !ampEl || !freqEl || !speedEl || !pauseBtn || !resetBtn) return;
      if (canvas.dataset.wbLongitudinalInit === "1") return;
      canvas.dataset.wbLongitudinalInit = "1";

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const left = 56;
      const right = W - 48;
      const baseY = H * 0.54;
      const points = 33;
      let phase = 0;
      let paused = false;
      let rafId = 0;
      let lastTs = 0;

      function syncLabels() {
        ampVal.textContent = Number(ampEl.value).toFixed(2);
        freqVal.textContent = Number(freqEl.value).toFixed(2);
        speedVal.textContent = Number(speedEl.value).toFixed(2);
      }

      function draw(ts) {
        if (!canvas.isConnected) return;
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        if (!paused) {
          phase += dt * Number(freqEl.value) * 2.3;
        }

        const A = Number(ampEl.value) * 34;
        const c = Number(speedEl.value) * 2.4;
        const lambdaPx = 230 / Math.max(0.35, Number(freqEl.value));
        const spacing = (right - left) / (points - 1);

        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(left, baseY);
        ctx.lineTo(right, baseY);
        ctx.stroke();

        let compressionScore = 0;
        for (let i = 0; i < points; i++) {
          const xRest = left + spacing * i;
          const offset = A * Math.sin((xRest / lambdaPx) - phase * c);
          const x = xRest + offset;
          const neighborOffset = A * Math.sin(((xRest + spacing) / lambdaPx) - phase * c);
          compressionScore += Math.abs(neighborOffset - offset);

          ctx.strokeStyle = "rgba(100,116,139,0.24)";
          ctx.beginPath();
          ctx.moveTo(xRest, baseY - 70);
          ctx.lineTo(xRest, baseY + 70);
          ctx.stroke();

          ctx.fillStyle = "#2563eb";
          ctx.beginPath();
          ctx.arc(x, baseY, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, baseY - 20);
          ctx.lineTo(x + (offset >= 0 ? 18 : -18), baseY - 20);
          ctx.stroke();
        }

        ctx.fillStyle = "#334155";
        ctx.font = "20px sans-serif";
        ctx.fillText("Longitudinalwelle", left, 36);

        const compressionHint = compressionScore < 180 ? "gering" : (compressionScore < 270 ? "mittel" : "stark");
        readout.textContent =
          "Teilchenbewegung: parallel zur Ausbreitungsrichtung\n" +
          "Momentaufnahme: Verdichtungen und Verdünnungen\n" +
          "Aktuelle Verdichtungsstärke: " + compressionHint;

        rafId = requestAnimationFrame(draw);
      }

      ampEl.addEventListener("input", syncLabels);
      freqEl.addEventListener("input", syncLabels);
      speedEl.addEventListener("input", syncLabels);
      pauseBtn.addEventListener("click", () => {
        paused = !paused;
        pauseBtn.textContent = paused ? "Weiter" : "Pause";
      });
      resetBtn.addEventListener("click", () => {
        phase = 0;
        lastTs = 0;
      });
      syncLabels();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initHuygensDiffractionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("huygensDiffractionCanvas");
      const readout = getById("huygensDiffractionReadout");
      const slitEl = getById("huygensSlit");
      const slitVal = getById("huygensSlitVal");
      const pauseBtn = getById("huygensPauseBtn");
      const resetBtn = getById("huygensResetBtn");
      if (!canvas || !readout || !slitEl || !slitVal || !pauseBtn || !resetBtn) return;
      if (canvas.dataset.wbHuygensInit === "1") return;
      canvas.dataset.wbHuygensInit = "1";

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const wallX = W * 0.46;
      const topPad = 52;
      const bottomPad = H - 52;
      const centerY = H * 0.54;
      const leftStart = 56;
      const wavelength = 58;
      let phase = 0;
      let paused = false;
      let rafId = 0;
      let lastTs = 0;

      function syncLabels() {
        slitVal.textContent = Number(slitEl.value).toFixed(2);
      }

      function drawIncomingFronts(nowPhase) {
        ctx.save();
        ctx.strokeStyle = "rgba(14, 116, 144, 0.95)";
        ctx.lineWidth = 2.3;
        for (let x = wallX - 6; x >= leftStart; x -= wavelength) {
          const shiftedX = x + (nowPhase % wavelength);
          if (shiftedX < leftStart || shiftedX > wallX - 6) continue;
          ctx.beginPath();
          ctx.moveTo(shiftedX, topPad);
          ctx.lineTo(shiftedX, bottomPad);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawWall(slitHalf) {
        ctx.save();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(wallX, topPad);
        ctx.lineTo(wallX, centerY - slitHalf);
        ctx.moveTo(wallX, centerY + slitHalf);
        ctx.lineTo(wallX, bottomPad);
        ctx.stroke();
        ctx.restore();
      }

      function drawNormals(slitHalf) {
        ctx.save();
        ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
        ctx.lineWidth = 1.2;
        const yStep = Math.max(14, slitHalf / 3);
        for (let y = centerY - slitHalf; y <= centerY + slitHalf + 1; y += yStep) {
          ctx.beginPath();
          ctx.moveTo(wallX - 18, y);
          ctx.lineTo(wallX + 30, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawWavelets(sources, radius) {
        ctx.save();
        ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
        ctx.lineWidth = 1;
        sources.forEach((y) => {
          ctx.beginPath();
          ctx.arc(wallX, y, radius, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      function drawEnvelopeCapsule(radius, slitHalf) {
        const topY = centerY - slitHalf;
        const bottomY = centerY + slitHalf;
        const xLine = wallX + radius;
        ctx.save();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xLine, topY);
        ctx.lineTo(xLine, bottomY);
        ctx.moveTo(xLine, topY);
        ctx.arc(wallX, topY, radius, 0, -Math.PI / 2, true);
        ctx.moveTo(xLine, bottomY);
        ctx.arc(wallX, bottomY, radius, 0, Math.PI / 2, false);
        ctx.stroke();
        ctx.restore();
      }

      function drawPropagatingFronts(step, slitHalf) {
        ctx.save();
        ctx.strokeStyle = "rgba(220, 38, 38, 0.72)";
        ctx.lineWidth = 2.2;
        for (let n = 0; n < 5; n++) {
          const radius = 36 + ((phase + step * n) % wavelength);
          const topY = centerY - slitHalf;
          const bottomY = centerY + slitHalf;
          const xLine = wallX + radius;
          ctx.beginPath();
          if (xLine <= W - 18) {
            ctx.moveTo(xLine, topY);
            ctx.lineTo(xLine, bottomY);
          }
          ctx.moveTo(xLine, topY);
          ctx.arc(wallX, topY, radius, 0, -Math.PI / 2, true);
          ctx.moveTo(xLine, bottomY);
          ctx.arc(wallX, bottomY, radius, 0, Math.PI / 2, false);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawLabels(slitHalf) {
        ctx.save();
        ctx.fillStyle = "#334155";
        ctx.font = "20px sans-serif";
        ctx.fillText("Ebene Welle", 70, 36);
        ctx.fillText("Spalt", wallX - 18, topPad - 14);
        ctx.fillText("Elementarwellen", wallX + 120, topPad + 18);
        ctx.fillStyle = "#475569";
        ctx.font = "16px sans-serif";
        ctx.fillText("neue Wellenfront", wallX + 150, centerY - slitHalf - 34);
        ctx.restore();
      }

      function draw(ts) {
        if (!canvas.isConnected) return;
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        if (!paused) {
          phase += dt * 72;
        }

        const slitValue = Number(slitEl.value);
        const slitHalf = 4 + slitValue * 124;
        const radius = 36 + (phase % wavelength);
        const sourceCount = slitValue < 0.08 ? 1 : Math.max(3, Math.round(4 + slitValue * 10));
        const sources = [];
        for (let i = 0; i < sourceCount; i++) {
          const t = sourceCount === 1 ? 0.5 : i / (sourceCount - 1);
          sources.push(centerY - slitHalf + t * slitHalf * 2);
        }

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
        ctx.fillRect(0, 0, W, H);

        drawIncomingFronts(phase);
        drawNormals(slitHalf);
        drawWavelets(sources, radius);
        drawPropagatingFronts(wavelength, slitHalf);
        drawEnvelopeCapsule(radius, slitHalf);
        drawWall(slitHalf);

        ctx.fillStyle = "#0f766e";
        sources.forEach((y) => {
          ctx.beginPath();
          ctx.arc(wallX, y, 3.6, 0, Math.PI * 2);
          ctx.fill();
        });

        drawLabels(slitHalf);

        const spread = slitValue < 0.08 ? "sehr stark" : (slitValue < 0.34 ? "stark" : (slitValue < 0.62 ? "mittel" : "gering"));
        readout.textContent =
          "Beobachtung: Hinter dem Spalt entsteht aus vielen Elementarwellen eine neue Wellenfront, die nach rechts weiterläuft.\n" +
          "aktuelle Beugung: " + spread + "\n" +
          "Regel: Je schmaler der Spalt, desto deutlicher fächert sich die Welle auf.";

        rafId = requestAnimationFrame(draw);
      }

      slitEl.addEventListener("input", syncLabels);
      pauseBtn.addEventListener("click", () => {
        paused = !paused;
        pauseBtn.textContent = paused ? "Weiter" : "Pause";
      });
      resetBtn.addEventListener("click", () => {
        phase = 0;
        lastTs = 0;
      });
      syncLabels();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initCoherentScreenSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("coherentScreenCanvas");
      const readout = getById("coherentScreenReadout");
      const yEl = getById("cohCursorY");
      const speedEl = getById("cohSpeed");
      const freqEl = getById("cohFreq");
      const startBtn = getById("cohStartBtn");
      const resetBtn = getById("cohResetBtn");
      const toggleAlphaBtn = getById("cohToggleAlphaBtn");
      const toggleDsBtn = getById("cohToggleDsBtn");
      const yVal = getById("cohCursorYVal");
      const speedVal = getById("cohSpeedVal");
      const freqVal = getById("cohFreqVal");
      if (!canvas || !readout || !yEl || !speedEl || !freqEl) return;
      if (canvas.dataset.wbCohInit === "1") return;
      canvas.dataset.wbCohInit = "1";

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const xS = 110;
      const yMid = H * 0.44;
      const dPix = 160;
      const yS1 = yMid - dPix / 2;
      const yS2 = yMid + dPix / 2;
      const xScreen = W * 0.58;
      const xOutEnd = W - 150;
      const ampPath = 12;
      const ampOut = 15;
      const fRef = 1.1;
      const lamRef = 82;
      const cPix = lamRef * fRef; // konstante Ausbreitungsgeschwindigkeit in px/s
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = true;
      let showAlpha = true;
      let showDs = true;
      let rafId = 0;

      function drawWavePath(ax, ay, bx, by, t, kVal, omega, color) {
        const dx = bx - ax;
        const dy = by - ay;
        const L = Math.hypot(dx, dy);
        if (L < 1e-6) return;
        const tx = dx / L;
        const ty = dy / L;
        const nx = -ty;
        const ny = tx;
        const steps = Math.max(140, Math.floor(L / 2));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const s = (i / steps) * L;
          const ph = kVal * s - omega * t;
          const off = ampPath * Math.sin(ph);
          const x = ax + tx * s + nx * off;
          const y = ay + ty * s + ny * off;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      function draw(tNow) {
        if (!canvas.isConnected) {
          cancelAnimationFrame(rafId);
          return;
        }
        const speed = Number(speedEl.value);
        const freq = Number(freqEl.value);
        const lam = cPix / Math.max(freq, 0.05);
        const k = 2 * Math.PI / lam;
        const omega = 2 * Math.PI * freq;
        const t = isRunning ? ((tNow - t0) / 1000) * speed : tFrozen;
        const yOff = Number(yEl.value);
        const yE = yMid + yOff;
        if (yVal) yVal.textContent = String(Math.round(yOff));
        if (speedVal) speedVal.textContent = speed.toFixed(1);
        if (freqVal) freqVal.textContent = freq.toFixed(1);

        const L1 = Math.hypot(xScreen - xS, yE - yS1);
        const L2 = Math.hypot(xScreen - xS, yE - yS2);
        const dS = L1 - L2;

        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(120,130,150,0.75)";
        ctx.lineWidth = 1.1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(xS - 24, yMid);
        ctx.lineTo(xScreen + 10, yMid);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(20,20,20,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xS, yS1 - 16);
        ctx.lineTo(xS, yS2 + 16);
        ctx.stroke();

        ctx.strokeStyle = "rgba(20,20,20,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xScreen, 34);
        ctx.lineTo(xScreen, H - 30);
        ctx.stroke();

        // Interferenzmuster rechts neben dem Schirm
        const xPatL = xOutEnd + 18;
        const xPatR = W - 24;
        const yPatT = 34;
        const yPatB = H - 30;
        for (let yPix = yPatT; yPix <= yPatB; yPix++) {
          const L1y = Math.hypot(xScreen - xS, yPix - yS1);
          const L2y = Math.hypot(xScreen - xS, yPix - yS2);
          const phaseY = k * (L1y - L2y);
          const aNorm = Math.min(1, Math.abs(Math.cos(phaseY / 2))); // 0..1
          // Gewuenschte Darstellung: hell bei A=max, dunkel bei A=0
          const gray = Math.round(45 + 210 * aNorm);
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
          ctx.fillRect(xPatL, yPix, xPatR - xPatL, 1);
        }
        ctx.strokeStyle = "rgba(20,20,20,0.75)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(xPatL, yPatT, xPatR - xPatL, yPatB - yPatT);
        ctx.fillStyle = "#374151";
        ctx.font = "14px sans-serif";
        ctx.fillText("Interferenzmuster", xPatL - 2, 24);

        ctx.strokeStyle = "rgba(20,20,20,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xS, yS1);
        ctx.lineTo(xScreen, yE);
        ctx.moveTo(xS, yS2);
        ctx.lineTo(xScreen, yE);
        ctx.stroke();

        // Mittellinie nur sichtbar, wenn alpha sichtbar ist
        if (showAlpha) {
          ctx.strokeStyle = "rgba(15,118,110,0.9)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(xS, yMid);
          ctx.lineTo(xScreen, yE);
          ctx.stroke();
        }

        const alpha = Math.atan2(yE - yMid, xScreen - xS);
        if (showAlpha) {
          const rA = 46;
          ctx.strokeStyle = "#0f766e";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(xS, yMid, rA, 0, alpha, alpha < 0);
          ctx.stroke();
          ctx.fillStyle = "#0f766e";
          ctx.font = "24px serif";
          const aLabelX = xS + 30;
          const aLabelY = yMid + (alpha < 0 ? -10 : 24);
          ctx.fillText("α", aLabelX, aLabelY);
        }

        if (showDs) {
          const upperLong = L1 >= L2;
          const Llong = upperLong ? L1 : L2;
          const Lshort = upperLong ? L2 : L1;
          const ySrc = upperLong ? yS1 : yS2;
          const dxL = xScreen - xS;
          const dyL = yE - ySrc;
          const inv = 1 / Math.max(1e-6, Llong);
          const txL = dxL * inv;
          const tyL = dyL * inv;
          // Delta s direkt an der jeweiligen Quelle S1/S2 markieren.
          const s0 = 10;
          const dsLen = Math.abs(Llong - Lshort);
          const s1 = Math.min(Llong - 8, s0 + dsLen);
          const ax = xS + txL * s0;
          const ay = ySrc + tyL * s0;
          const bx = xS + txL * s1;
          const by = ySrc + tyL * s1;
          const nx = -tyL;
          const ny = txL;
          const tick = 7;
          ctx.strokeStyle = "#d946ef";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.moveTo(ax - nx * tick, ay - ny * tick);
          ctx.lineTo(ax + nx * tick, ay + ny * tick);
          ctx.moveTo(bx - nx * tick, by - ny * tick);
          ctx.lineTo(bx + nx * tick, by + ny * tick);
          ctx.stroke();
          ctx.fillStyle = "#d946ef";
          ctx.font = "21px serif";
          ctx.fillText("Δs", (ax + bx) * 0.5 + 8, (ay + by) * 0.5 - 8);
        }

        drawWavePath(xS, yS1, xScreen, yE, t, k, omega, "#57b84a");
        drawWavePath(xS, yS2, xScreen, yE, t, k, omega, "#2f36ff");

        const outLen = xOutEnd - xScreen;
        const stepsOut = Math.max(220, Math.floor(outLen / 2));
        ctx.strokeStyle = "rgba(20,20,20,0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xScreen, yE);
        ctx.lineTo(xOutEnd, yE);
        ctx.stroke();

        ctx.strokeStyle = "#57b84a";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i <= stepsOut; i++) {
          const xr = (i / stepsOut) * outLen;
          const y = yE - ampOut * Math.sin(k * xr - omega * t + k * L1);
          const x = xScreen + xr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#2f36ff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i <= stepsOut; i++) {
          const xr = (i / stepsOut) * outLen;
          const y = yE - ampOut * Math.sin(k * xr - omega * t + k * L2);
          const x = xScreen + xr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let i = 0; i <= stepsOut; i++) {
          const xr = (i / stepsOut) * outLen;
          const y1 = ampOut * Math.sin(k * xr - omega * t + k * L1);
          const y2 = ampOut * Math.sin(k * xr - omega * t + k * L2);
          const y = yE - (y1 + y2);
          const x = xScreen + xr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#57b84a";
        ctx.beginPath();
        ctx.arc(xS, yS1, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2f36ff";
        ctx.beginPath();
        ctx.arc(xS, yS2, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(xScreen, yE, 6.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#374151";
        ctx.font = "28px serif";
        ctx.fillText("S1", xS - 56, yS1 - 10);
        ctx.fillText("S2", xS - 56, yS2 - 10);
        ctx.fillStyle = "#dc2626";
        ctx.fillText("E", xScreen + 8, yE + 26);
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#374151";
        ctx.fillText("Schirm", xScreen - 26, 22);

        let hint = "gemischt";
        const frac = Math.abs(dS / lam - Math.round(dS / lam));
        if (frac < 0.12) hint = "nahe konstruktiv";
        else if (Math.abs(frac - 0.5) < 0.12) hint = "nahe destruktiv";
        readout.textContent =
          `lambda = ${lam.toFixed(1)} px, dS = ${dS.toFixed(1)} px, dS/lambda = ${(dS / lam).toFixed(2)} (${hint})\n` +
          `f = ${freq.toFixed(1)}, alpha = ${(alpha * 180 / Math.PI).toFixed(1)}°\n` +
          "gruen/blau: Einzelwellen bis E und rechts weiterlaufend\n" +
          "rot: Ueberlagerung rechts von E";

        rafId = requestAnimationFrame(draw);
      }

      function startAnim() {
        if (isRunning) return;
        isRunning = true;
        const speed = Number(speedEl.value);
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim() {
        if (!isRunning) return;
        const speed = Number(speedEl.value);
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function resetAnim() {
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn() {
        if (!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim() {
        if (isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      yEl.addEventListener("input", () => { });
      speedEl.addEventListener("input", () => { });
      freqEl.addEventListener("input", () => { });
      if (startBtn) startBtn.addEventListener("click", toggleAnim);
      if (resetBtn) resetBtn.addEventListener("click", resetAnim);
      if (toggleAlphaBtn) toggleAlphaBtn.addEventListener("click", () => {
        showAlpha = !showAlpha;
        toggleAlphaBtn.textContent = showAlpha ? "Alpha ausblenden" : "Alpha einblenden";
      });
      if (toggleDsBtn) toggleDsBtn.addEventListener("click", () => {
        showDs = !showDs;
        toggleDsBtn.textContent = showDs ? "Delta s ausblenden" : "Delta s einblenden";
      });
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initSingleSlitSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("singleSlitCanvas");
      const readout = getById("singleSlitReadout");
      if(!canvas || !readout) return;

      const lamNm = getById("esLamNm");
      const lMm = getById("esLMm");
      const aM = getById("esAM");
      const thetaDeg = getById("esThetaDeg");

      const lamNmVal = getById("esLamNmVal");
      const lMmVal = getById("esLMmVal");
      const aMVal = getById("esAMVal");
      const thetaDegVal = getById("esThetaDegVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      function sinc(x){
        if(Math.abs(x) < 1e-8) return 1;
        return Math.sin(x) / x;
      }

      function intensity(thetaRad, l, lam){
        const beta = Math.PI * l * Math.sin(thetaRad) / lam;
        const s = sinc(beta);
        return s * s;
      }

      function draw(){
        const lam = Number(lamNm.value) * 1e-9;
        const l = Number(lMm.value) * 1e-3;
        const a = Number(aM.value);
        const thMark = Number(thetaDeg.value) * Math.PI / 180;

        lamNmVal.textContent = String(lamNm.value);
        lMmVal.textContent = Number(lMm.value).toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
        aMVal.textContent = Number(aM.value).toFixed(1);
        thetaDegVal.textContent = Number(thetaDeg.value).toFixed(1);

        const thMin = -12 * Math.PI / 180;
        const thMax = 12 * Math.PI / 180;

        ctx.clearRect(0, 0, W, H);

        const padL = 56, padR = 18, padT = 18, padB = 44;
        const x0 = padL, x1 = W - padR;
        const y0 = padT, y1 = H - padB;

        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.stroke();

        [0, 0.5, 1].forEach(v => {
          const y = y1 - v * (y1 - y0);
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x1, y);
          ctx.stroke();
          ctx.fillText(String(v), 10, y + 4);
        });

        [-12, -8, -4, 0, 4, 8, 12].forEach(d => {
          const th = d * Math.PI / 180;
          const x = x0 + (th - thMin) / (thMax - thMin) * (x1 - x0);
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y1);
          ctx.stroke();
          ctx.fillText(d + "°", x - 10, H - 16);
        });

        ctx.beginPath();
        const N = 900;
        for(let i = 0; i <= N; i++){
          const th = thMin + (thMax - thMin) * i / N;
          const I = intensity(th, l, lam);
          const x = x0 + (i / N) * (x1 - x0);
          const y = y1 - I * (y1 - y0);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const xM = x0 + (thMark - thMin) / (thMax - thMin) * (x1 - x0);
        const IM = intensity(thMark, l, lam);
        const yM = y1 - IM * (y1 - y0);

        ctx.beginPath();
        ctx.moveTo(xM, y0);
        ctx.lineTo(xM, y1);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(xM, yM, 6, 0, Math.PI * 2);
        ctx.fill();

        const kMax = Math.floor(l / lam);
        const kShow = Math.min(kMax, 8);
        const minima = [];
        for(let k = 1; k <= kShow; k++){
          const s = (k * lam) / l;
          if(s >= 1) break;
          const thk = Math.asin(s);
          minima.push({k, th: thk});
          minima.push({k, th: -thk});
        }
        minima.forEach(m => {
          const x = x0 + (m.th - thMin) / (thMax - thMin) * (x1 - x0);
          if(x < x0 || x > x1) return;
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y1 + 10);
          ctx.stroke();
        });

        const yApprox = a * Math.tan(thMark);
        const yCm = yApprox * 100;
        readout.textContent =
          "Markierung:\n" +
          `alpha = ${(thMark * 180 / Math.PI).toFixed(2)} deg\n` +
          `I(alpha)/I0 ≈ ${IM.toFixed(4)}\n` +
          `y ≈ a*tan(alpha) ≈ ${yCm.toFixed(2)} cm (a=${a.toFixed(1)} m)\n\n` +
          "Minima (l*sin(alpha)=k*lambda):\n" +
          (minima
            .filter(m => m.th >= 0)
            .map(m => `k=${m.k}: alpha_k≈${(m.th * 180 / Math.PI).toFixed(2)} deg`)
            .join(", ") || "—");
      }

      [lamNm, lMm, aM, thetaDeg].forEach(el => el && el.addEventListener("input", draw));
      draw();
    }

function initDoubleSlitWithEnvelopeSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("dsCanvas");
      const readout = getById("dsReadout");
      if(!canvas || !readout) return;

      const lamNm = getById("dsLamNm");
      const bMm = getById("dsbMm");
      const gMm = getById("dsgMm");
      const aM = getById("dsAM");
      const thetaDeg = getById("dsThetaDeg");

      const lamNmVal = getById("dsLamNmVal");
      const bMmVal = getById("dsbMmVal");
      const gMmVal = getById("dsgMmVal");
      const aMVal = getById("dsAMVal");
      const thetaDegVal = getById("dsThetaDegVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      function sinc(x){
        if(Math.abs(x) < 1e-8) return 1;
        return Math.sin(x) / x;
      }

      function intensity(thetaRad, b, g, lam){
        const s = Math.sin(thetaRad);
        const beta = Math.PI * b * s / lam;
        const delta = Math.PI * g * s / lam;
        const env = sinc(beta);
        const inter = Math.cos(delta);
        return (env * env) * (inter * inter);
      }

      function envelope(thetaRad, b, lam){
        const beta = Math.PI * b * Math.sin(thetaRad) / lam;
        const env = sinc(beta);
        return env * env;
      }

      function draw(){
        const lam = Number(lamNm.value) * 1e-9;
        const b = Number(bMm.value) * 1e-3;
        const g = Number(gMm.value) * 1e-3;
        const a = Number(aM.value);
        const thMark = Number(thetaDeg.value) * Math.PI / 180;

        lamNmVal.textContent = String(lamNm.value);
        bMmVal.textContent = Number(bMm.value).toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
        gMmVal.textContent = Number(gMm.value).toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
        aMVal.textContent = Number(aM.value).toFixed(1);
        thetaDegVal.textContent = Number(thetaDeg.value).toFixed(1);

        const thMin = -12 * Math.PI / 180;
        const thMax = 12 * Math.PI / 180;

        ctx.clearRect(0, 0, W, H);

        const padL = 56, padR = 18, padT = 18, padB = 44;
        const x0 = padL, x1 = W - padR;
        const y0 = padT, y1 = H - padB;

        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.stroke();

        [0, 0.5, 1].forEach(v => {
          const y = y1 - v * (y1 - y0);
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x1, y);
          ctx.stroke();
          ctx.fillText(String(v), 10, y + 4);
        });

        [-12, -8, -4, 0, 4, 8, 12].forEach(d => {
          const th = d * Math.PI / 180;
          const x = x0 + (th - thMin) / (thMax - thMin) * (x1 - x0);
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y1);
          ctx.stroke();
          ctx.fillText(d + "°", x - 10, H - 16);
        });

        ctx.beginPath();
        const N = 1200;
        for(let i = 0; i <= N; i++){
          const th = thMin + (thMax - thMin) * i / N;
          const I = intensity(th, b, g, lam);
          const x = x0 + (i / N) * (x1 - x0);
          const y = y1 - I * (y1 - y0);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        for(let i = 0; i <= N; i++){
          const th = thMin + (thMax - thMin) * i / N;
          const E = envelope(th, b, lam);
          const x = x0 + (i / N) * (x1 - x0);
          const y = y1 - E * (y1 - y0);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        const xM = x0 + (thMark - thMin) / (thMax - thMin) * (x1 - x0);
        const IM = intensity(thMark, b, g, lam);
        const EM = envelope(thMark, b, lam);
        const yM = y1 - IM * (y1 - y0);

        ctx.beginPath();
        ctx.moveTo(xM, y0);
        ctx.lineTo(xM, y1);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(xM, yM, 6, 0, Math.PI * 2);
        ctx.fill();

        const kMax = Math.floor(b / lam);
        const kShow = Math.min(kMax, 8);
        for(let k = 1; k <= kShow; k++){
          const s = (k * lam) / b;
          if(s >= 1) break;
          const thk = Math.asin(s);
          [thk, -thk].forEach(t => {
            const x = x0 + (t - thMin) / (thMax - thMin) * (x1 - x0);
            if(x < x0 || x > x1) return;
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y1 + 10);
            ctx.stroke();
          });
        }

        const yApprox = a * Math.tan(thMark);
        const yCm = yApprox * 100;

        readout.textContent =
          "Markierung:\n" +
          `alpha = ${(thMark * 180 / Math.PI).toFixed(2)} deg\n` +
          `I(alpha)/I0 ≈ ${IM.toFixed(4)} (Doppelspalt * Huellkurve)\n` +
          `Huellkurve E(alpha) ≈ ${EM.toFixed(4)}\n` +
          `y ≈ a*tan(alpha) ≈ ${yCm.toFixed(2)} cm (a=${a.toFixed(1)} m)\n\n` +
          "Einzelspalt-Minima (b*sin(alpha)=k*lambda) sind unten markiert.\n" +
          "Beobachte: Liegt ein Doppelspalt-Maximum in einem Einzelspalt-Minimum, verschwindet es praktisch.";
      }

      [lamNm, bMm, gMm, aM, thetaDeg].forEach(el => el && el.addEventListener("input", draw));
      draw();
    }

function initGratingSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("gratingCanvas");
      const readout = getById("gratingReadout");
      if(!canvas || !readout) return;

      const lamNm = getById("gtLamNm");
      const gUm = getById("gtGUm");
      const bUm = getById("gtBUm");
      const nSlits = getById("gtN");
      const eM = getById("gtEM");
      const thetaDeg = getById("gtThetaDeg");

      const lamNmVal = getById("gtLamNmVal");
      const gUmVal = getById("gtGUmVal");
      const bUmVal = getById("gtBUmVal");
      const nSlitsVal = getById("gtNVal");
      const eMVal = getById("gtEMVal");
      const thetaDegVal = getById("gtThetaDegVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      function sinc(x){
        if(Math.abs(x) < 1e-8) return 1;
        return Math.sin(x) / x;
      }

      function nSlitFactor(thetaRad, N, g, lam){
        const dlt = Math.PI * g * Math.sin(thetaRad) / lam;
        const den = Math.sin(dlt);
        if(Math.abs(den) < 1e-8) return 1;
        const num = Math.sin(N * dlt);
        const q = num / (N * den);
        return q * q;
      }

      function envelope(thetaRad, b, lam){
        const beta = Math.PI * b * Math.sin(thetaRad) / lam;
        const env = sinc(beta);
        return env * env;
      }

      function intensity(thetaRad, N, b, g, lam){
        return envelope(thetaRad, b, lam) * nSlitFactor(thetaRad, N, g, lam);
      }

      function draw(){
        const lam = Number(lamNm.value) * 1e-9;
        const g = Number(gUm.value) * 1e-6;
        const b = Number(bUm.value) * 1e-6;
        const N = Number(nSlits.value);
        const e = Number(eM.value);
        const thMark = Number(thetaDeg.value) * Math.PI / 180;

        lamNmVal.textContent = String(lamNm.value);
        gUmVal.textContent = Number(gUm.value).toFixed(1);
        bUmVal.textContent = Number(bUm.value).toFixed(1);
        nSlitsVal.textContent = String(N);
        eMVal.textContent = Number(eM.value).toFixed(1);
        thetaDegVal.textContent = Number(thetaDeg.value).toFixed(1);

        const thMin = -25 * Math.PI / 180;
        const thMax = 25 * Math.PI / 180;

        ctx.clearRect(0, 0, W, H);

        const padL = 56, padR = 18, padT = 18, padB = 44;
        const x0 = padL, x1 = W - padR;
        const y0 = padT, y1 = H - padB;

        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.stroke();

        [0, 0.5, 1].forEach(v => {
          const y = y1 - v * (y1 - y0);
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x1, y);
          ctx.stroke();
          ctx.fillText(String(v), 10, y + 4);
        });

        [-25, -15, -5, 0, 5, 15, 25].forEach(d => {
          const th = d * Math.PI / 180;
          const x = x0 + (th - thMin) / (thMax - thMin) * (x1 - x0);
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y1);
          ctx.stroke();
          ctx.fillText(d + "°", x - 10, H - 16);
        });

        ctx.beginPath();
        const steps = 1600;
        for(let i = 0; i <= steps; i++){
          const th = thMin + (thMax - thMin) * i / steps;
          const I = intensity(th, N, b, g, lam);
          const x = x0 + (i / steps) * (x1 - x0);
          const y = y1 - I * (y1 - y0);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const xM = x0 + (thMark - thMin) / (thMax - thMin) * (x1 - x0);
        const IM = intensity(thMark, N, b, g, lam);
        const yM = y1 - IM * (y1 - y0);

        ctx.beginPath();
        ctx.moveTo(xM, y0);
        ctx.lineTo(xM, y1);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(xM, yM, 6, 0, Math.PI * 2);
        ctx.fill();

        const principal = [];
        const kMax = Math.floor(g / lam);
        for(let k = -kMax; k <= kMax; k++){
          const s = (k * lam) / g;
          if(Math.abs(s) > 1) continue;
          const th = Math.asin(s);
          if(th < thMin || th > thMax) continue;
          principal.push({k, th});
          const x = x0 + (th - thMin) / (thMax - thMin) * (x1 - x0);
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y1 + 10);
          ctx.stroke();
        }

        const yApprox = e * Math.tan(thMark);
        const yCm = yApprox * 100;
        const linesPerMm = (1e-3 / g);
        const kPos = principal.filter(p => p.k >= 0)
          .slice(0, 5)
          .map(p => `k=${p.k}: ${(p.th * 180 / Math.PI).toFixed(2)} deg`)
          .join(", ");

        readout.textContent =
          "Markierung:\n" +
          `alpha = ${(thMark * 180 / Math.PI).toFixed(2)} deg\n` +
          `I(alpha)/I0 ≈ ${IM.toFixed(4)}\n` +
          `y ≈ e*tan(alpha) ≈ ${yCm.toFixed(2)} cm (e=${e.toFixed(1)} m)\n` +
          `n ≈ ${Math.round(linesPerMm)} Linien/mm\n\n` +
          "Hauptmaxima (g*sin(alpha_k)=k*lambda):\n" +
          (kPos || "keine im sichtbaren Winkelbereich");
      }

      [lamNm, gUm, bUm, nSlits, eM, thetaDeg].forEach(el => el && el.addEventListener("input", draw));
      draw();
    }

function initGratingPhasorSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("phasorCanvas");
      const patternCanvas = getById("phasorPatternCanvas");
      const readout = getById("phasorReadout");
      if(!canvas || !patternCanvas || !readout){
        if(!global.__wbPhasorObserver){
          const observer = new MutationObserver(() => {
            const c = getById("phasorCanvas");
            const pc = getById("phasorPatternCanvas");
            const r = getById("phasorReadout");
            if(c && pc && r){
              initGratingPhasorSim(root);
            }
          });
          observer.observe(document.body, {childList:true, subtree:true});
          global.__wbPhasorObserver = observer;
        }
        return;
      }
      if(canvas.dataset.wbPhasorInit === "1") return;
      canvas.dataset.wbPhasorInit = "1";

      const nEl = getById("phN");
      const uEl = getById("phU");
      const scaleEl = getById("phScale");
      const nVal = getById("phNVal");
      const uVal = getById("phUVal");
      const scaleVal = getById("phScaleVal");

      const ctx = canvas.getContext("2d");
      const pctx = patternCanvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const PW = patternCanvas.width, PH = patternCanvas.height;

      function factorI(u, N){
        const x = Math.PI * u;
        const den = Math.sin(x);
        if(Math.abs(den) < 1e-10) return 1;
        const q = Math.sin(N * x) / (N * den);
        return q * q;
      }

      function drawArrow(c, x1, y1, x2, y2){
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const hl = 9;
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x2 - hl * Math.cos(ang - Math.PI / 7), y2 - hl * Math.sin(ang - Math.PI / 7));
        c.lineTo(x2 - hl * Math.cos(ang + Math.PI / 7), y2 - hl * Math.sin(ang + Math.PI / 7));
        c.closePath();
        c.fill();
      }

      function draw(){
        const N = Number(nEl.value);
        const u = Number(uEl.value);
        const scl = Number(scaleEl.value);
        const phi = 2 * Math.PI * u;

        nVal.textContent = String(N);
        uVal.textContent = Number(u).toFixed(3);
        scaleVal.textContent = Number(scl).toFixed(2);

        ctx.clearRect(0, 0, W, H);
        const cx = W * 0.45;
        const cy = H * 0.50;
        const unit = Math.min(W, H) * 0.11 * scl;
        const pts = [{x:0, y:0}];
        for(let m = 0; m < N; m++){
          const a = m * phi;
          const last = pts[pts.length - 1];
          pts.push({x: last.x + Math.cos(a), y: last.y + Math.sin(a)});
        }
        const ext = pts.reduce((o,p) => ({
          minX: Math.min(o.minX, p.x), maxX: Math.max(o.maxX, p.x),
          minY: Math.min(o.minY, p.y), maxY: Math.max(o.maxY, p.y)
        }), {minX:0,maxX:0,minY:0,maxY:0});
        const spanX = Math.max(2, ext.maxX - ext.minX);
        const spanY = Math.max(2, ext.maxY - ext.minY);
        const fit = Math.min((W * 0.75) / (spanX * unit), (H * 0.75) / (spanY * unit), 1.6);
        const s = unit * fit;

        ctx.strokeStyle = "rgba(110,120,140,0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(40, cy); ctx.lineTo(W - 20, cy);
        ctx.moveTo(cx, 20); ctx.lineTo(cx, H - 20);
        ctx.stroke();

        ctx.fillStyle = "#111827";
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 2;
        for(let i = 0; i < N; i++){
          const p1 = pts[i], p2 = pts[i + 1];
          const x1 = cx + p1.x * s, y1 = cy - p1.y * s;
          const x2 = cx + p2.x * s, y2 = cy - p2.y * s;
          drawArrow(ctx, x1, y1, x2, y2);
          ctx.fillText(String(i + 1), x1 + 4, y1 - 6);
        }

        const r = pts[pts.length - 1];
        const rx = cx + r.x * s, ry = cy - r.y * s;
        ctx.strokeStyle = "#dc2626";
        ctx.fillStyle = "#dc2626";
        ctx.lineWidth = 3;
        drawArrow(ctx, cx, cy, rx, ry);
        ctx.fillText("Resultierende", rx + 8, ry - 6);

        pctx.clearRect(0, 0, PW, PH);
        const padL = 56, padR = 18, padT = 16, padB = 38;
        const x0 = padL, x1 = PW - padR, y0 = padT, y1 = PH - padB;
        const uMin = -1.5, uMax = 1.5;
        pctx.strokeStyle = "#9ca3af";
        pctx.lineWidth = 1;
        pctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        [0,0.25,0.5,0.75,1].forEach(v => {
          const y = y1 - v * (y1 - y0);
          pctx.beginPath(); pctx.moveTo(x0, y); pctx.lineTo(x1, y); pctx.stroke();
          pctx.fillStyle = "#6b7280";
          pctx.fillText(v.toFixed(2), 10, y + 4);
        });
        [-1.5,-1,-0.5,0,0.5,1,1.5].forEach(uv => {
          const x = x0 + ((uv - uMin) / (uMax - uMin)) * (x1 - x0);
          pctx.beginPath(); pctx.moveTo(x, y0); pctx.lineTo(x, y1); pctx.stroke();
          pctx.fillStyle = "#6b7280";
          pctx.fillText(String(uv), x - 10, PH - 14);
        });

        pctx.strokeStyle = "#1f2937";
        pctx.lineWidth = 2;
        pctx.beginPath();
        const steps = 1200;
        for(let i = 0; i <= steps; i++){
          const uu = uMin + (uMax - uMin) * i / steps;
          const I = factorI(uu, N);
          const x = x0 + (i / steps) * (x1 - x0);
          const y = y1 - I * (y1 - y0);
          if(i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
        }
        pctx.stroke();

        const Iu = factorI(u, N);
        const xm = x0 + ((u - uMin) / (uMax - uMin)) * (x1 - x0);
        const ym = y1 - Iu * (y1 - y0);
        pctx.strokeStyle = "#dc2626";
        pctx.fillStyle = "#dc2626";
        pctx.lineWidth = 2;
        pctx.beginPath(); pctx.moveTo(xm, y0); pctx.lineTo(xm, y1); pctx.stroke();
        pctx.beginPath(); pctx.arc(xm, ym, 5, 0, Math.PI * 2); pctx.fill();

        const amp = Math.hypot(r.x, r.y);
        const relAmp = amp / N;
        readout.textContent =
          "Aktueller Ort:\n" +
          `u = ${u.toFixed(3)}\n` +
          `Phasenschritt Delta-phi = ${(phi * 180 / Math.PI).toFixed(2)} deg\n` +
          `Relative Amplitude A/Amax = ${(relAmp).toFixed(4)}\n` +
          `Relative Intensitaet I/Imax = ${(Iu).toFixed(4)}\n\n` +
          "Merke:\n" +
          "Hauptmaxima bei u = k (ganzzahlig).\n" +
          "Minima zwischen zwei Hauptmaxima bei u = m/N (m=1..N-1).";
      }

      [nEl, uEl, scaleEl].forEach(elm => elm && elm.addEventListener("input", draw));
      draw();
    }

function initDoubleSlitParticleSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("dsParticleCanvas");
      const modeEl = getById("dspMode");
      const rateEl = getById("dspRate");
      const rateVal = getById("dspRateVal");
      const startBtn = getById("dspStartBtn");
      const resetBtn = getById("dspResetBtn");
      const readout = getById("dspReadout");
      if(!canvas || !modeEl || !rateEl || !rateVal || !startBtn || !resetBtn || !readout) return;
      if(canvas.dataset.wbDsParticleInit === "1") return;
      canvas.dataset.wbDsParticleInit = "1";

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      const sourceX = 88;
      const sourceY = H * 0.5;
      const barrierX = 360;
      const slitGap = 132;
      const slitOpen = 46;
      const slitAY = H * 0.5 - slitGap * 0.5;
      const slitBY = H * 0.5 + slitGap * 0.5;
      const screenX = 742;
      const yMin = 34;
      const yMax = H - 34;
      const bins = 44;
      const binH = (yMax - yMin) / bins;

      const colorA = "#0891b2";
      const colorB = "#c026d3";
      const colorTotal = "#0f172a";

      const countsA = new Array(bins).fill(0);
      const countsB = new Array(bins).fill(0);
      const particles = [];
      const flashes = [];
      const cdfCache = new Map();
      let displayScaleMax = 1;

      let running = false;
      let spawnAcc = 0;
      let rafId = 0;
      let lastTs = performance.now();

      function modeLabel(mode){
        if(mode === "slitA") return "Nur Spalt A";
        if(mode === "slitB") return "Nur Spalt B";
        if(mode === "bothWhich") return "Beide Spalte mit Welcher-Weg-Information";
        return "Beide Spalte ohne Welcher-Weg-Information";
      }

      function gaussian(x, mean, sigma){
        const z = (x - mean) / sigma;
        return Math.exp(-0.5 * z * z);
      }

      function intensityAt(normY, mode, slit){
        const sigma = 0.30;
        const shift = 0.11;
        const fringeFreq = 13.5;
        const visibility = 1.0;
        const iA = gaussian(normY, -shift, sigma);
        const iB = gaussian(normY, +shift, sigma);

        if(mode === "slitA") return iA;
        if(mode === "slitB") return iB;
        if(mode === "bothWhich") return slit === "A" ? iA : iB;

        const env = iA + iB;
        const fringe = 0.5 * (1 + visibility * Math.cos(2 * Math.PI * fringeFreq * normY));
        return Math.max(0, env * fringe);
      }

      function buildCdf(mode, slit){
        const key = mode + "|" + slit;
        if(cdfCache.has(key)) return cdfCache.get(key);
        const samples = 720;
        const cdf = new Array(samples);
        let sum = 0;
        for(let i = 0; i < samples; i++){
          const t = i / (samples - 1);
          const n = -1 + 2 * t;
          const w = intensityAt(n, mode, slit) + 1e-6;
          sum += w;
          cdf[i] = sum;
        }
        for(let i = 0; i < samples; i++) cdf[i] /= sum;
        cdfCache.set(key, cdf);
        return cdf;
      }

      function sampleNorm(mode, slit){
        const cdf = buildCdf(mode, slit);
        const r = Math.random();
        let lo = 0;
        let hi = cdf.length - 1;
        while(lo < hi){
          const mid = (lo + hi) >> 1;
          if(cdf[mid] < r) lo = mid + 1;
          else hi = mid;
        }
        const t = lo / (cdf.length - 1);
        return -1 + 2 * t;
      }

      function normToY(normY){
        const n = Math.max(-1, Math.min(1, normY));
        return yMin + (0.5 * (n + 1)) * (yMax - yMin);
      }

      function pickSlit(mode){
        if(mode === "slitA") return "A";
        if(mode === "slitB") return "B";
        return Math.random() < 0.5 ? "A" : "B";
      }

      function stepTowards(p, tx, ty, step){
        const dx = tx - p.x;
        const dy = ty - p.y;
        const dist = Math.hypot(dx, dy);
        if(dist < 1e-6 || step >= dist){
          p.x = tx;
          p.y = ty;
          return true;
        }
        p.x += dx / dist * step;
        p.y += dy / dist * step;
        return false;
      }

      function registerHit(y, slit, withFlash = true){
        const mode = modeEl.value;
        const idx = Math.max(0, Math.min(bins - 1, Math.floor((y - yMin) / binH)));
        let sigmaBins = 1.35;
        let gain = 5.6;
        if(mode === "bothWhich"){
          sigmaBins = 1.20;
          gain = 5.0;
        }else if(mode === "bothInterf"){
          sigmaBins = 0.20;
          gain = 4.9;
        }
        let norm = 0;
        const w = new Array(bins).fill(0);
        for(let j = 0; j < bins; j++){
          const d = (j - idx) / sigmaBins;
          const ww = Math.exp(-0.5 * d * d);
          w[j] = ww;
          norm += ww;
        }
        const arr = slit === "A" ? countsA : countsB;
        for(let j = 0; j < bins; j++){
          arr[j] += gain * (w[j] / norm);
        }
        if(withFlash) flashes.push({y, slit, life: 0.45});
      }

      function spawnParticle(){
        const mode = modeEl.value;
        const slit = pickSlit(mode);
        const slitY = slit === "A" ? slitAY : slitBY;
        const targetNorm = sampleNorm(mode, slit);
        const targetY = normToY(targetNorm);
        particles.push({
          x: sourceX,
          y: sourceY,
          slit,
          phase: 1,
          sx: barrierX - 8,
          sy: slitY + (Math.random() - 0.5) * 8,
          tx: screenX,
          ty: targetY,
          speed: 370 + Math.random() * 45
        });
      }

      function resetAll(){
        countsA.fill(0);
        countsB.fill(0);
        particles.length = 0;
        flashes.length = 0;
        spawnAcc = 0;
        displayScaleMax = 1;
      }

      function drawColumn(x, title, color, data, maxCount){
        const colW = 50;
        ctx.fillStyle = "#111827";
        ctx.font = "12px sans-serif";
        ctx.fillText(title, x + 4, yMin - 12);

        for(let i = 0; i < bins; i++){
          const y = yMin + (i + 0.5) * binH;
          ctx.strokeStyle = "rgba(107,114,128,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + colW, y);
          ctx.stroke();

          const dots = Math.max(0, Math.round((data[i] / maxCount) * 5));
          for(let d = 0; d < dots; d++){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x + 7 + d * 8, y, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      function drawScene(){
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 18, screenX - 2, H - 36);

        ctx.fillStyle = "#9ca3af";
        ctx.fillRect(sourceX - 36, sourceY - 18, 64, 36);
        ctx.strokeStyle = "#111827";
        ctx.strokeRect(sourceX - 36, sourceY - 18, 64, 36);
        ctx.beginPath();
        ctx.arc(sourceX + 28, sourceY, 9, 0, Math.PI * 2);
        ctx.fillStyle = "#e5e7eb";
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(107,114,128,0.55)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(sourceX + 28, sourceY);
        ctx.lineTo(barrierX - 8, slitAY);
        ctx.lineTo(screenX, yMin + (yMax - yMin) * 0.33);
        ctx.moveTo(sourceX + 28, sourceY);
        ctx.lineTo(barrierX - 8, slitBY);
        ctx.lineTo(screenX, yMin + (yMax - yMin) * 0.67);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#0b0b0b";
        ctx.fillRect(barrierX - 8, 20, 16, H - 40);

        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(barrierX - 10, slitAY - slitOpen * 0.5, 20, slitOpen);
        ctx.fillRect(barrierX - 10, slitBY - slitOpen * 0.5, 20, slitOpen);
        ctx.strokeStyle = "#111827";
        ctx.strokeRect(barrierX - 10, slitAY - slitOpen * 0.5, 20, slitOpen);
        ctx.strokeRect(barrierX - 10, slitBY - slitOpen * 0.5, 20, slitOpen);

        for(let i = 0; i < bins; i++){
          const y = yMin + i * binH + 3;
          ctx.strokeStyle = "#374151";
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX - 10, y, 18, Math.max(6, binH - 6));
        }

        const total = countsA.map((v, i) => v + countsB[i]);
        const mode = modeEl.value;
        const theory = new Array(bins).fill(0);
        let thMax = 0;
        for(let i = 0; i < bins; i++){
          const y = yMin + (i + 0.5) * binH;
          const norm = 2 * ((y - yMin) / (yMax - yMin)) - 1;
          let t = 0;
          if(mode === "slitA") t = intensityAt(norm, "slitA", "A");
          else if(mode === "slitB") t = intensityAt(norm, "slitB", "B");
          else if(mode === "bothWhich"){
            t = intensityAt(norm, "bothWhich", "A") + intensityAt(norm, "bothWhich", "B");
          }else{
            t = intensityAt(norm, "bothInterf", "A");
          }
          theory[i] = t;
          if(t > thMax) thMax = t;
        }
        const maxCount = Math.max(1, ...total);
        for(let i = 0; i < bins; i++){
          const y = yMin + (i + 0.5) * binH;
          const len = 2 + 28 * (total[i] / maxCount);
          ctx.strokeStyle = "rgba(15,23,42,0.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX + 10, y);
          ctx.lineTo(screenX + 10 + len, y);
          ctx.stroke();
        }

        ctx.beginPath();
        for(let i = 0; i < bins; i++){
          const y = yMin + (i + 0.5) * binH;
          const len = 2 + 28 * (thMax > 0 ? (theory[i] / thMax) : 0);
          const x = screenX + 10 + len;
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.stroke();

        for(const p of particles){
          ctx.beginPath();
          ctx.fillStyle = p.slit === "A" ? colorA : colorB;
          ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        for(const f of flashes){
          const alpha = Math.max(0, f.life / 0.45);
          ctx.beginPath();
          ctx.fillStyle = f.slit === "A" ? `rgba(8,145,178,${alpha})` : `rgba(192,38,211,${alpha})`;
          ctx.arc(screenX + 8, f.y, 4.8, 0, Math.PI * 2);
          ctx.fill();
        }

        const xA = screenX + 44;
        const xB = screenX + 104;
        const xC = screenX + 164;
        const total2 = countsA.map((v, i) => v + countsB[i]);
        const dataA = countsA;
        const dataB = countsB;
        const modeHits = total2.reduce((s, v) => s + v, 0);
        const rawMax = Math.max(1, ...dataA, ...dataB, ...total2);
        const smoothFac = Math.min(0.35, 0.06 + modeHits / 3200);
        displayScaleMax = Math.max(1, displayScaleMax * (1 - smoothFac) + rawMax * smoothFac);
        drawColumn(xA, "a", colorA, dataA, displayScaleMax);
        drawColumn(xB, "b", colorB, dataB, displayScaleMax);
        drawColumn(xC, "c", colorTotal, total2, displayScaleMax);
      }

      function updateReadout(){
        const total = countsA.reduce((s, v) => s + v, 0) + countsB.reduce((s, v) => s + v, 0);
        const mode = modeEl.value;
        const txt =
          "Modus:\n" +
          `${modeLabel(mode)}\n` +
          `Treffer gesamt: ${total}\n` +
          `Spalt A (cyan): ${countsA.reduce((s, v) => s + v, 0)}\n` +
          `Spalt B (magenta): ${countsB.reduce((s, v) => s + v, 0)}\n\n` +
          "Am Schirm:\n" +
          "dunkle Balken = gemessene Treffer\n" +
          "orange Linie = theoretische Kurve\n\n" +
          "Rechts:\n" +
          "a = Einzelverteilung Spalt A\n" +
          "b = Einzelverteilung Spalt B\n" +
          "c = Gesamtverteilung auf dem Schirm";
        readout.textContent = txt;
      }

      function animate(ts){
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;

        if(running){
          const rate = Number(rateEl.value);
          spawnAcc += rate * dt;
          while(spawnAcc >= 1){
            spawnParticle();
            spawnAcc -= 1;
            if(particles.length > 420) break;
          }
        }

        for(let i = particles.length - 1; i >= 0; i--){
          const p = particles[i];
          const step = p.speed * dt;
          if(p.phase === 1){
            if(stepTowards(p, p.sx, p.sy, step)) p.phase = 2;
          }else{
            if(stepTowards(p, p.tx, p.ty, step)){
              registerHit(p.ty, p.slit);
              particles.splice(i, 1);
            }
          }
        }

        for(let i = flashes.length - 1; i >= 0; i--){
          flashes[i].life -= dt;
          if(flashes[i].life <= 0) flashes.splice(i, 1);
        }

        drawScene();
        updateReadout();
        rafId = requestAnimationFrame(animate);
      }

      function syncStartLabel(){
        startBtn.textContent = running ? "Pause" : "Start";
      }

      rateVal.textContent = String(rateEl.value);
      rateEl.addEventListener("input", () => {
        rateVal.textContent = String(rateEl.value);
      });
      modeEl.addEventListener("change", () => {
        resetAll();
      });
      startBtn.addEventListener("click", () => {
        running = !running;
        syncStartLabel();
      });
      resetBtn.addEventListener("click", () => {
        resetAll();
      });

      syncStartLabel();
      resetAll();
      rafId = requestAnimationFrame(animate);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initBuildStandingSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("buildStandingCanvas");
      const readout = getById("buildStandingReadout");
      if(!canvas || !readout){
        if(!window.__wbBuildStandingObserver){
          const obs = new MutationObserver(() => {
            if(getById("buildStandingCanvas") && getById("buildStandingReadout")){
              initBuildStandingSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbBuildStandingObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbBuildStandingInit === "1") return;
      canvas.dataset.wbBuildStandingInit = "1";

      const modeEl = getById("bsMode");
      const ampEl = getById("bsAmp");
      const freqEl = getById("bsFreq");
      const cEl = getById("bsC");
      const startBtn = getById("bsStartBtn");
      const resetBtn = getById("bsResetBtn");
      const ampVal = getById("bsAmpVal");
      const freqVal = getById("bsFreqVal");
      const cVal = getById("bsCVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const xL = 40, xR = W - 30, y0 = H * 0.55;
      const Lpx = xR - xL;
      const L = 1; // normierte Seillaenge
      let rafId = 0;
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;

      function waveLeft(x, t, A, f, c, phi){
        if(t < x / c) return 0;
        return A * Math.sin(2 * Math.PI * f * (t - x / c) + phi);
      }
      function waveRight(x, t, A, f, c, phi){
        if(t < (L - x) / c) return 0;
        return A * Math.sin(2 * Math.PI * f * (t - (L - x) / c) + phi);
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }

        const mode = modeEl ? modeEl.value : "inphase";
        const A = ampEl ? Number(ampEl.value) : 0.8;
        const f = freqEl ? Number(freqEl.value) : 0.9;
        const c = cEl ? Number(cEl.value) : 0.9;
        const phiR = (mode === "antiphase") ? Math.PI : 0;
        const t = isRunning ? ((now - t0) / 1000) : tFrozen;

        if(ampVal) ampVal.textContent = A.toFixed(2);
        if(freqVal) freqVal.textContent = f.toFixed(2);
        if(cVal) cVal.textContent = c.toFixed(2);

        const scaleY = H * 0.20;
        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(xR, y0);
        ctx.stroke();

        ctx.fillStyle = "#374151";
        ctx.font = "15px sans-serif";
        ctx.fillText("Quelle links", xL + 4, 20);
        ctx.fillText("Quelle rechts", xR - 100, 20);

        const steps = 700;
        // Welle von links
        ctx.strokeStyle = "#8b5e3c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const xPix = xL + xn * Lpx;
          const y = y0 - scaleY * waveLeft(xn, t, A, f, c, 0);
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Welle von rechts
        ctx.strokeStyle = "#0f9d58";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const xPix = xL + xn * Lpx;
          const y = y0 - scaleY * waveRight(xn, t, A, f, c, phiR);
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Überlagerung
        ctx.strokeStyle = "#d946ef";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const xPix = xL + xn * Lpx;
          const y = y0 - scaleY * (
            waveLeft(xn, t, A, f, c, 0) +
            waveRight(xn, t, A, f, c, phiR)
          );
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Knoten der stehenden Welle (rote Punkte) zur Veranschaulichung
        // Bestimmt aus dem ortsabhängigen Cosinus-Faktor der Überlagerung.
        const k = 2 * Math.PI * f / c;
        const nodeXs = [];
        const nodeScan = 1600;
        const tol = 0.012;
        let prevVal = null;
        for(let i = 0; i <= nodeScan; i++){
          const xn = i / nodeScan;
          const s = Math.cos((k * L - phiR) / 2 - k * xn);
          const a = Math.abs(s);
          if(a < tol){
            if(prevVal == null || Math.abs(xn - prevVal) > 0.012){
              nodeXs.push(xn);
              prevVal = xn;
            }
          }
        }
        ctx.fillStyle = "#dc2626";
        nodeXs.forEach(xn => {
          const xPix = xL + xn * Lpx;
          ctx.beginPath();
          ctx.arc(xPix, y0, 4.2, 0, Math.PI * 2);
          ctx.fill();
        });

        const filled = Math.min(1, t * c);
        ctx.fillStyle = "rgba(99,102,241,0.08)";
        ctx.fillRect(xL, 24, Lpx * filled, H - 50);
        ctx.fillRect(xR - Lpx * filled, 24, Lpx * filled, H - 50);

        readout.textContent =
          "braun = von links, gruen = von rechts, pink = Summe\n" +
          "rote Punkte = Knoten der stehenden Welle\n" +
          `Modus: ${mode === "inphase" ? "im Takt (gleichphasig)" : "gegenlaeufig (gegenphasig)"}\n` +
          `t = ${t.toFixed(2)} s\n` +
          "Wenn beide Wellen den ganzen Bereich erreicht haben, bildet sich das stehende Muster.";

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        t0 = performance.now() - tFrozen * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        tFrozen = (performance.now() - t0) / 1000;
        isRunning = false;
      }
      function resetAnim(){
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      if(resetBtn) resetBtn.addEventListener("click", resetAnim);
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
    }

function initFixedPulseReflectionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("fixedPulseCanvas");
      const readout = getById("fixedPulseReadout");
      if(!canvas || !readout){
        if(!window.__wbFixedPulseObserver){
          const obs = new MutationObserver(() => {
            if(getById("fixedPulseCanvas") && getById("fixedPulseReadout")){
              initFixedPulseReflectionSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbFixedPulseObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbFixedPulseInit === "1") return;
      canvas.dataset.wbFixedPulseInit = "1";

      const startBtn = getById("fpStartBtn");
      const resetBtn = getById("fpResetBtn");
      const speedEl = getById("fpSpeed");
      const speedVal = getById("fpSpeedVal");
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const xL = 40;
      const xR = W - 24;
      const y0 = H * 0.58;
      const plotW = xR - xL;
      const L = 1.0;
      const x0 = -0.10;
      const c = 0.28;
      const halfWidth = 0.07;
      const A = 1.0;
      const tReflect = (L - x0) / c;
      const tCycle = (2 * L - 2 * x0) / c;
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let rafId = 0;

      function pulse(x, center){
        // Kompakter Puls: außerhalb der Breite exakt 0 (kein "Vorschatten").
        const u = x - center;
        if(Math.abs(u) > halfWidth) return 0;
        return 0.5 * (1 + Math.cos(Math.PI * u / halfWidth));
      }
      function yIncident(x, tau){
        const s = x0 + c * tau;
        return A * pulse(x, s);
      }
      function yReflected(x, tau){
        const s = x0 + c * tau;
        const sMirror = 2 * L - s; // Spiegelung an der y-Achse (Wand)
        return -A * pulse(x, sMirror); // Minuszeichen = Spiegelung an der x-Achse
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        if(speedVal) speedVal.textContent = speed.toFixed(1);
        const tRaw = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const tau = ((tRaw % tCycle) + tCycle) % tCycle;
        const scaleY = H * 0.28;
        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(xR, y0);
        ctx.stroke();

        ctx.strokeStyle = "rgba(55,65,81,0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(xR, 26);
        ctx.lineTo(xR, H - 26);
        ctx.stroke();
        ctx.fillStyle = "#374151";
        ctx.font = "15px sans-serif";
        ctx.fillText("festes Ende", xR - 78, 20);
        // Markierung des festen Endes: fester Punkt auf der Ruhelage
        ctx.fillStyle = "#d946ef";
        ctx.beginPath();
        ctx.arc(xR, y0, 5.2, 0, Math.PI * 2);
        ctx.fill();

        const steps = 900;

        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * L;
          const y = y0 - scaleY * yIncident(x, tau);
          const xPix = xL + xn * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#0f9d58";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * L;
          const y = y0 - scaleY * yReflected(x, tau);
          const xPix = xL + xn * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#d946ef";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * L;
          const y = y0 - scaleY * (yIncident(x, tau) + yReflected(x, tau));
          const xPix = xL + xn * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        readout.textContent =
          "braun = einlaufender Puls\n" +
          "gruen = reflektierter Puls (Phasensprung)\n" +
          "pink = Summation (Ueberlagerung)\n" +
          "Reflexion am festen Ende: Spiegelung an y- und x-Achse\n" +
          `v = ${speed.toFixed(1)}\n` +
          `t = ${tau.toFixed(2)} s (zyklisch), erster Wandkontakt bei t = ${tReflect.toFixed(2)} s`;

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function resetAnim(){
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      if(resetBtn) resetBtn.addEventListener("click", resetAnim);
      if(speedEl) speedEl.addEventListener("input", () => {});
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initLoosePulseReflectionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("loosePulseCanvas");
      const readout = getById("loosePulseReadout");
      if(!canvas || !readout){
        if(!window.__wbLoosePulseObserver){
          const obs = new MutationObserver(() => {
            if(getById("loosePulseCanvas") && getById("loosePulseReadout")){
              initLoosePulseReflectionSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbLoosePulseObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbLoosePulseInit === "1") return;
      canvas.dataset.wbLoosePulseInit = "1";

      const startBtn = getById("lpStartBtn");
      const resetBtn = getById("lpResetBtn");
      const speedEl = getById("lpSpeed");
      const speedVal = getById("lpSpeedVal");
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const xL = 40;
      const xR = W - 24;
      const y0 = H * 0.58;
      const plotW = xR - xL;
      const L = 1.0;
      const x0 = -0.10;
      const c = 0.28;
      const halfWidth = 0.07;
      const A = 1.0;
      const tReflect = (L - x0) / c;
      const tCycle = (2 * L - 2 * x0) / c;
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let rafId = 0;

      function pulse(x, center){
        const u = x - center;
        if(Math.abs(u) > halfWidth) return 0;
        return 0.5 * (1 + Math.cos(Math.PI * u / halfWidth));
      }
      function yIncident(x, tau){
        const s = x0 + c * tau;
        return A * pulse(x, s);
      }
      function yReflected(x, tau){
        const s = x0 + c * tau;
        const sMirror = 2 * L - s; // nur Spiegelung an der y-Achse
        return A * pulse(x, sMirror);
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        if(speedVal) speedVal.textContent = speed.toFixed(1);
        const tRaw = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const tau = ((tRaw % tCycle) + tCycle) % tCycle;
        const scaleY = H * 0.28;
        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(xR, y0);
        ctx.stroke();

        ctx.strokeStyle = "rgba(55,65,81,0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(xR, 26);
        ctx.lineTo(xR, H - 26);
        ctx.stroke();
        ctx.fillStyle = "#374151";
        ctx.font = "15px sans-serif";
        ctx.fillText("loses Ende", xR - 72, 20);

        const steps = 900;

        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * L;
          const y = y0 - scaleY * yIncident(x, tau);
          const xPix = xL + xn * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#0f9d58";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * L;
          const y = y0 - scaleY * yReflected(x, tau);
          const xPix = xL + xn * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#d946ef";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * L;
          const y = y0 - scaleY * (yIncident(x, tau) + yReflected(x, tau));
          const xPix = xL + xn * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        const yEnd = y0 - scaleY * (yIncident(L, tau) + yReflected(L, tau));
        ctx.fillStyle = "#d946ef";
        ctx.beginPath();
        ctx.arc(xR, yEnd, 5.2, 0, Math.PI * 2);
        ctx.fill();

        readout.textContent =
          "braun = einlaufender Puls\n" +
          "gruen = reflektierter Puls (kein Phasensprung)\n" +
          "pink = Summation (Ueberlagerung)\n" +
          "Reflexion am losen Ende: nur Spiegelung an der y-Achse\n" +
          `v = ${speed.toFixed(1)}\n` +
          `t = ${tau.toFixed(2)} s (zyklisch), erster Wandkontakt bei t = ${tReflect.toFixed(2)} s`;

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function resetAnim(){
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      if(resetBtn) resetBtn.addEventListener("click", resetAnim);
      if(speedEl) speedEl.addEventListener("input", () => {});
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initThinDenseTransitionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("thinDenseCanvas");
      const readout = getById("thinDenseReadout");
      if(!canvas || !readout){
        if(!window.__wbThinDenseObserver){
          const obs = new MutationObserver(() => {
            if(getById("thinDenseCanvas") && getById("thinDenseReadout")){
              initThinDenseTransitionSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbThinDenseObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbThinDenseInit === "1") return;
      canvas.dataset.wbThinDenseInit = "1";

      const startBtn = getById("tdStartBtn");
      const resetBtn = getById("tdResetBtn");
      const speedEl = getById("tdSpeed");
      const speedVal = getById("tdSpeedVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const xL = 36;
      const xR = W - 24;
      const y0 = H * 0.58;
      const plotW = xR - xL;
      const L = 1.0;
      const xB = 0.58;
      const x0 = -0.12;
      const c1 = 0.30; // duennes Medium
      const c2 = 0.18; // dichteres Medium
      const halfWidth = 0.065; // links: groessere Wellenlaenge / breiterer Puls
      const halfWidthT = halfWidth * (c2 / c1); // rechts: kleinere Wellenlaenge / schmalerer Puls
      const A = 1.0;
      const r = -0.58; // Reflexion mit Phasensprung
      const tCoef = 1 + r; // stetiger Anschluss am Uebergang (links/rechts gleich)
      const tFront = (xB - (x0 + halfWidth)) / c1; // erste Beruehrung der Flanke
      const tBack = (xB - (x0 - halfWidth)) / c1; // letzte Beruehrung der Flanke
      const tLeftOut = tBack + (xB + halfWidth) / c1;
      const tRightOut = tBack + (L - xB + halfWidthT) / c2;
      const tCycle = Math.max(tLeftOut, tRightOut) + 1.4;

      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let rafId = 0;

      function pulse(x, center, width){
        const u = x - center;
        if(Math.abs(u) > width) return 0;
        return 0.5 * (1 + Math.cos(Math.PI * u / width));
      }

      function yIncident(x, tau){
        const s = x0 + c1 * tau;
        return A * pulse(x, s, halfWidth);
      }
      function boundaryDrive(tauLocal){
        const s = x0 + c1 * tauLocal;
        return pulse(xB, s, halfWidth);
      }
      function yReflected(x, tau){
        const tLocal = tau - (xB - x) / c1;
        if(tLocal < tFront) return 0;
        return r * A * boundaryDrive(tLocal);
      }
      function yTransmitted(x, tau){
        const tLocal = tau - (x - xB) / c2;
        if(tLocal < tFront) return 0;
        return tCoef * A * boundaryDrive(tLocal);
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }
        const speed = speedEl ? Number(speedEl.value) : 0.6;
        if(speedVal) speedVal.textContent = speed.toFixed(1);
        const tRaw = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const tau = ((tRaw % tCycle) + tCycle) % tCycle;
        const scaleY = H * 0.30;

        ctx.clearRect(0, 0, W, H);

        const xBoundary = xL + xB * plotW;
        ctx.fillStyle = "rgba(59,130,246,0.08)";
        ctx.fillRect(xL, 24, xBoundary - xL, H - 48);
        ctx.fillStyle = "rgba(16,185,129,0.10)";
        ctx.fillRect(xBoundary, 24, xR - xBoundary, H - 48);

        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(xR, y0);
        ctx.stroke();

        ctx.strokeStyle = "rgba(31,41,55,0.95)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xBoundary, 24);
        ctx.lineTo(xBoundary, H - 24);
        ctx.stroke();
        ctx.fillStyle = "#374151";
        ctx.font = "14px sans-serif";
        ctx.fillText("duennes Seil (links)", xL + 8, 20);
        ctx.fillText("dichteres Seil (rechts)", xBoundary + 8, 20);
        ctx.fillText("Uebergang", xBoundary - 34, H - 10);

        const steps = 1100;

        // Einlaufende Welle links
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * xB;
          const y = y0 - scaleY * yIncident(x, tau);
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Reflektierte Welle links (mit Phasensprung)
        ctx.strokeStyle = "#0f9d58";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * xB;
          const y = y0 - scaleY * yReflected(x, tau);
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Transmittierte Welle rechts (kleiner)
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xB + xn * (L - xB);
          const y = y0 - scaleY * yTransmitted(x, tau);
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Summation als "schwingendes Seil": links duenn, rechts dicker
        ctx.strokeStyle = "#d946ef";
        const yJoin = yTransmitted(xB, tau);
        const yJoinPix = y0 - scaleY * yJoin;
        ctx.beginPath();
        ctx.lineWidth = 2.4; // duennes Seil links
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * xB;
          const ySum = (i === steps) ? yJoin : (yIncident(x, tau) + yReflected(x, tau));
          const y = y0 - scaleY * ySum;
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = 4.8; // dichteres Seil rechts
        ctx.moveTo(xBoundary, yJoinPix);
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xB + xn * (L - xB);
          const ySum = (i === 0) ? yJoin : yTransmitted(x, tau);
          const y = y0 - scaleY * ySum;
          const xPix = xL + x * plotW;
          ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        readout.textContent =
          "braun = einlaufender Puls (duennes Medium)\n" +
          "gruen = reflektierter Puls (kleiner, Phasensprung)\n" +
          "blau  = transmittierter Puls (kleiner und schmaler)\n" +
          "pink  = Seil (Summation), links duenn / rechts dicker\n" +
          `v = ${speed.toFixed(1)}\n` +
          `t = ${tau.toFixed(2)} s (zyklisch), Beginn am Uebergang bei t = ${tFront.toFixed(2)} s`;

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 0.6;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 0.6;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function resetAnim(){
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      if(resetBtn) resetBtn.addEventListener("click", resetAnim);
      if(speedEl) speedEl.addEventListener("input", () => {});
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initDenseThinTransitionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("denseThinCanvas");
      const readout = getById("denseThinReadout");
      if(!canvas || !readout){
        if(!window.__wbDenseThinObserver){
          const obs = new MutationObserver(() => {
            if(getById("denseThinCanvas") && getById("denseThinReadout")){
              initDenseThinTransitionSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbDenseThinObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbDenseThinInit === "1") return;
      canvas.dataset.wbDenseThinInit = "1";

      const startBtn = getById("dtStartBtn");
      const resetBtn = getById("dtResetBtn");
      const speedEl = getById("dtSpeed");
      const speedVal = getById("dtSpeedVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const xL = 36;
      const xR = W - 24;
      const y0 = H * 0.58;
      const plotW = xR - xL;
      const L = 1.0;
      const xB = 0.58;
      const x0 = -0.12;
      const c1 = 0.18; // dichteres Medium links
      const c2 = 0.30; // duenneres Medium rechts
      const halfWidth = 0.052; // links: kleinere Wellenlaenge / schmalerer Puls
      const halfWidthT = halfWidth * (c2 / c1); // rechts: groessere Wellenlaenge / breiterer Puls
      const A = 1.0;
      const r = 0.36; // kleinere Reflexion, kein Phasensprung
      const tCoef = 1.25; // groessere Transmission
      // Start der Wechselwirkungen beim Eintreffen der vorderen Pulsflanke am Uebergang
      const tReflect = (xB - (x0 + halfWidth)) / c1;
      const tLeftOut = tReflect + (xB + 2 * halfWidth) / c1;
      const tRightOut = tReflect + (L - xB + 2 * halfWidthT) / c2;
      const tCycle = Math.max(tLeftOut, tRightOut) + 1.4;

      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let rafId = 0;

      function pulse(x, center, width){
        const u = x - center;
        if(Math.abs(u) > width) return 0;
        return 0.5 * (1 + Math.cos(Math.PI * u / width));
      }
      function yIncident(x, tau){
        const s = x0 + c1 * tau;
        return A * pulse(x, s, halfWidth);
      }
      function yReflected(x, tau){
        if(tau < tReflect) return 0;
        // Startet mit Flanke am Uebergang und laeuft nach links.
        const s = xB + halfWidth - c1 * (tau - tReflect);
        return r * pulse(x, s, halfWidth);
      }
      function yTransmitted(x, tau){
        if(tau < tReflect) return 0;
        // Startet mit Flanke am Uebergang und laeuft nach rechts.
        const s = xB - halfWidthT + c2 * (tau - tReflect);
        return tCoef * A * pulse(x, s, halfWidthT);
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }
        const speed = speedEl ? Number(speedEl.value) : 0.6;
        if(speedVal) speedVal.textContent = speed.toFixed(1);
        const tRaw = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const tau = ((tRaw % tCycle) + tCycle) % tCycle;
        const scaleY = H * 0.30;

        ctx.clearRect(0, 0, W, H);

        const xBoundary = xL + xB * plotW;
        ctx.fillStyle = "rgba(16,185,129,0.10)";
        ctx.fillRect(xL, 24, xBoundary - xL, H - 48);
        ctx.fillStyle = "rgba(59,130,246,0.08)";
        ctx.fillRect(xBoundary, 24, xR - xBoundary, H - 48);

        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(xR, y0);
        ctx.stroke();

        ctx.strokeStyle = "rgba(31,41,55,0.95)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xBoundary, 24);
        ctx.lineTo(xBoundary, H - 24);
        ctx.stroke();
        ctx.fillStyle = "#374151";
        ctx.font = "14px sans-serif";
        ctx.fillText("dichteres Seil (links)", xL + 8, 20);
        ctx.fillText("duennes Seil (rechts)", xBoundary + 8, 20);
        ctx.fillText("Uebergang", xBoundary - 34, H - 10);

        const steps = 1100;

        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * xB;
          const y = y0 - scaleY * yIncident(x, tau);
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#0f9d58";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * xB;
          const y = y0 - scaleY * yReflected(x, tau);
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xB + xn * (L - xB);
          const y = y0 - scaleY * yTransmitted(x, tau);
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#d946ef";
        // Gleicher Anschlusswert am Uebergang -> keine sichtbare Sprungstelle.
        const yJoin = yTransmitted(xB, tau);
        const yJoinPix = y0 - scaleY * yJoin;
        ctx.beginPath();
        ctx.lineWidth = 4.8; // dichteres Seil links
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xn * xB;
          const ySum = (i === steps) ? yJoin : (yIncident(x, tau) + yReflected(x, tau));
          const y = y0 - scaleY * ySum;
          const xPix = xL + x * plotW;
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = 2.4; // duennes Seil rechts
        ctx.moveTo(xBoundary, yJoinPix);
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xB + xn * (L - xB);
          const ySum = (i === 0) ? yJoin : yTransmitted(x, tau);
          const y = y0 - scaleY * ySum;
          const xPix = xL + x * plotW;
          ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        readout.textContent =
          "braun = einlaufender Puls (dichteres Medium)\n" +
          "gruen = reflektierter Puls (kleiner, kein Phasensprung)\n" +
          "blau  = transmittierter Puls (groesser und breiter)\n" +
          "pink  = Seil (Summation), links dicker / rechts duenn\n" +
          `v = ${speed.toFixed(1)}\n` +
          `t = ${tau.toFixed(2)} s (zyklisch), erster Uebergangskontakt bei t = ${tReflect.toFixed(2)} s`;

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 0.6;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 0.6;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function resetAnim(){
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      if(resetBtn) resetBtn.addEventListener("click", resetAnim);
      if(speedEl) speedEl.addEventListener("input", () => {});
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initLooseReflectionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("looseReflectCanvas");
      const readout = getById("looseReflectReadout");
      if(!canvas || !readout){
        if(!window.__wbLooseRefObserver){
          const obs = new MutationObserver(() => {
            if(getById("looseReflectCanvas") && getById("looseReflectReadout")){
              initLooseReflectionSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbLooseRefObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbLooseRefInit === "1") return;
      canvas.dataset.wbLooseRefInit = "1";

      const ampEl = getById("lrAmp");
      const lamEl = getById("lrLam");
      const speedEl = getById("lrSpeed");
      const startBtn = getById("lrStartBtn");
      const ampVal = getById("lrAmpVal");
      const lamVal = getById("lrLamVal");
      const speedVal = getById("lrSpeedVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const y0 = H * 0.56;
      const xL = 40;
      const xWall = W * 0.72; // y-Achse / Reflexionsstelle
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let rafId = 0;

      function yIncident(x, t, A, lam, f){
        const k = 2 * Math.PI / lam;
        const w = 2 * Math.PI * f;
        return A * Math.sin(w * t - k * x);
      }
      function yReflected(x, t, A, lam, f){
        const k = 2 * Math.PI / lam;
        const w = 2 * Math.PI * f;
        return A * Math.sin(w * t + k * x);
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }

        const A = ampEl ? Number(ampEl.value) : 0.8;
        const lamNorm = lamEl ? Number(lamEl.value) : 1.2;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        const t = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const f = 0.8;

        if(ampVal) ampVal.textContent = A.toFixed(2);
        if(lamVal) lamVal.textContent = lamNorm.toFixed(2);
        if(speedVal) speedVal.textContent = speed.toFixed(1);

        const Lpx = xWall - xL;
        const lamPx = lamNorm * Lpx;
        const scaleY = A * (H * 0.24);

        ctx.clearRect(0, 0, W, H);

        // Achsen
        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(W - 20, y0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xWall, 24);
        ctx.lineTo(xWall, H - 24);
        ctx.stroke();
        ctx.fillStyle = "#374151";
        ctx.font = "15px sans-serif";
        ctx.fillText("y-Achse / loses Ende (Reflexion)", xWall - 120, 20);

        // Einfallende Welle (braun), links von y-Achse
        ctx.strokeStyle = "#8b5e3c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 700;
        for(let i = 0; i <= steps; i++){
          const xPix = xL + (i / steps) * (xWall - xL);
          const xRel = (xPix - xWall) / lamPx; // x<=0 links der Achse
          const y = y0 - scaleY * yIncident(xRel, t, 1, 1, f);
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Reflektierte Welle (grün), an y-Achse gespiegelt, ohne Phasensprung
        ctx.strokeStyle = "#0f9d58";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xL + (i / steps) * (xWall - xL);
          const xRel = (xPix - xWall) / lamPx;
          const y = y0 - scaleY * yReflected(xRel, t, 1, 1, f);
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Überlagerung (pink), nur links von y-Achse
        ctx.strokeStyle = "#d946ef";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xL + (i / steps) * (xWall - xL);
          const xRel = (xPix - xWall) / lamPx;
          const yi = yIncident(xRel, t, 1, 1, f);
          const yr = yReflected(xRel, t, 1, 1, f);
          const y = y0 - scaleY * (yi + yr);
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Einfallende Welle als Fortsetzung rechts der y-Achse
        ctx.strokeStyle = "#8b5e3c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xWall + (i / steps) * (W - xWall - 20);
          const xRel = (xPix - xWall) / lamPx;
          const y = y0 - scaleY * yIncident(xRel, t, 1, 1, f);
          if(i === 0) ctx.moveTo(xPix, y);
          else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Knoten der pinken stehenden Welle (lose Reflexion): cos(2*pi*xRel)=0
        const nodesLoose = [];
        const nodeScanLoose = 1200;
        let prevLoose = null;
        for(let i = 0; i <= nodeScanLoose; i++){
          const xn = i / nodeScanLoose;
          const xRel = (xL + xn * (xWall - xL) - xWall) / lamPx;
          const s = Math.cos(2 * Math.PI * xRel);
          if(Math.abs(s) < 0.012){
            if(prevLoose == null || Math.abs(xn - prevLoose) > 0.012){
              nodesLoose.push(xn);
              prevLoose = xn;
            }
          }
        }
        ctx.fillStyle = "#dc2626";
        nodesLoose.forEach(xn => {
          const xPix = xL + xn * (xWall - xL);
          ctx.beginPath();
          ctx.arc(xPix, y0, 4.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Bereich rechts der y-Achse markieren (nur einlaufende Welle gezeichnet)
        ctx.fillStyle = "rgba(148,163,184,0.07)";
        ctx.fillRect(xWall, 24, W - xWall - 20, H - 48);
        ctx.fillStyle = "#64748b";
        ctx.fillText("rechts: nur einfallende Welle", xWall + 10, y0 - 10);

        readout.textContent =
          "Links der y-Achse:\n" +
          "braun = einfallend  y1 = A*sin(2pi*(t/T - x/lambda))\n" +
          "gruen = reflektiert y2 = A*sin(2pi*(t/T + x/lambda))\n" +
          "pink  = ueberlagert y = y1 + y2\n" +
          "Rechts der y-Achse: Fortsetzung der einfallenden Welle\n" +
          "rote Punkte = Knoten der stehenden Welle\n" +
          "Reflexion am losen Ende: ohne Phasensprung.";

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      [ampEl, lamEl, speedEl].forEach(el => el && el.addEventListener("input", () => {
        if(!isRunning) return;
      }));
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
    }

function initStandingModesSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("standingModesCanvas");
      const readout = getById("standingModesReadout");
      if(!canvas || !readout){
        if(!window.__wbStandingObserver){
          const obs = new MutationObserver(() => {
            if(getById("standingModesCanvas") && getById("standingModesReadout")){
              initStandingModesSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbStandingObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbStandingInit === "1") return;
      canvas.dataset.wbStandingInit = "1";

      const boundaryEl = getById("standingBoundary");
      const nEl = getById("standingN");
      const ampEl = getById("standingAmp");
      const speedEl = getById("standingSpeed");
      const startBtn = getById("smStartBtn");
      const resetBtn = getById("smResetBtn");
      const nVal = getById("standingNVal");
      const ampVal = getById("standingAmpVal");
      const speedVal = getById("standingSpeedVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const L = 1;
      const yMid = H * 0.55;
      const xL = 50;
      const xR = W - 30;
      const plotW = xR - xL;
      let rafId = 0;
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;

      function yNorm(x, mode, n, phase){
        const xn = x / L;
        if(mode === "fixed-fixed"){
          return Math.sin(n * Math.PI * xn) * Math.cos(phase);
        }
        if(mode === "free-free"){
          return Math.cos(n * Math.PI * xn) * Math.cos(phase);
        }
        const m = 2 * n - 1;
        return Math.sin(0.5 * m * Math.PI * xn) * Math.cos(phase);
      }

      function nodePositions(mode, n){
        const arr = [];
        if(mode === "fixed-fixed"){
          for(let k = 0; k <= n; k++) arr.push(k / n);
          return arr;
        }
        if(mode === "free-free"){
          for(let k = 0; k <= n; k++) arr.push((k + 0.5) / n);
          return arr.filter(v => v > 0 && v < 1);
        }
        const m = 2 * n - 1;
        for(let k = 0; k <= n - 1; k++) arr.push((2 * k) / m);
        return arr;
      }

      function freqFactor(mode, n){
        if(mode === "fixed-free") return (2 * n - 1);
        return n;
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }
        const mode = boundaryEl ? boundaryEl.value : "fixed-fixed";
        const n = nEl ? Number(nEl.value) : 1;
        const A = ampEl ? Number(ampEl.value) : 0.8;
        const speed = speedEl ? Number(speedEl.value) : 1;

        if(nVal) nVal.textContent = String(n);
        if(ampVal) ampVal.textContent = A.toFixed(2);
        if(speedVal) speedVal.textContent = speed.toFixed(1);

        const t = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const phase = 2 * Math.PI * freqFactor(mode, n) * 0.6 * t;

        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(120,130,150,0.6)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, yMid);
        ctx.lineTo(xR, yMid);
        ctx.stroke();

        const ampPx = A * (H * 0.22);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 600;
        for(let i = 0; i <= steps; i++){
          const xn = i / steps;
          const x = xL + xn * plotW;
          const y = yMid - ampPx * yNorm(xn, mode, n, phase);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const nodes = nodePositions(mode, n);
        ctx.fillStyle = "#dc2626";
        nodes.forEach(v => {
          const x = xL + v * plotW;
          ctx.beginPath();
          ctx.arc(x, yMid, 4.2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "#374151";
        ctx.font = "16px sans-serif";
        ctx.fillText("Knoten", xL + 8, 26);
        ctx.fillText("Baeuche schwingen mit", xL + 8, 48);

        let endText = "";
        if(mode === "fixed-fixed") endText = "Enden: fest/fest -> Knoten an beiden Enden";
        else if(mode === "free-free") endText = "Enden: lose/lose -> Baeuche an beiden Enden";
        else endText = "Enden: fest/lose -> nur ungerade Harmonische";

        readout.textContent =
          `Modus: ${mode}\n` +
          `n = ${n}\n` +
          `${endText}\n` +
          `Frequenzverhaeltnis: f_n/f_1 = ${freqFactor(mode, n)}`;

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function resetAnim(){
        isRunning = false;
        tFrozen = 0;
        updateToggleBtn();
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      if(resetBtn) resetBtn.addEventListener("click", resetAnim);
      [boundaryEl, nEl, ampEl, speedEl].forEach(el => el && el.addEventListener("input", () => {}));
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
      canvas.addEventListener("wb-destroy", () => cancelAnimationFrame(rafId));
    }

function initFixedReflectionSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("fixedReflectCanvas");
      const readout = getById("fixedReflectReadout");
      if(!canvas || !readout){
        if(!window.__wbFixedRefObserver){
          const obs = new MutationObserver(() => {
            if(getById("fixedReflectCanvas") && getById("fixedReflectReadout")){
              initFixedReflectionSim(root);
            }
          });
          obs.observe(document.body, {childList:true, subtree:true});
          window.__wbFixedRefObserver = obs;
        }
        return;
      }
      if(canvas.dataset.wbFixedRefInit === "1") return;
      canvas.dataset.wbFixedRefInit = "1";

      const ampEl = getById("frAmp");
      const lamEl = getById("frLam");
      const speedEl = getById("frSpeed");
      const startBtn = getById("frStartBtn");
      const ampVal = getById("frAmpVal");
      const lamVal = getById("frLamVal");
      const speedVal = getById("frSpeedVal");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const y0 = H * 0.56;
      const xL = 40;
      const xWall = W * 0.72;
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let rafId = 0;

      function yIncident(x, t, f){
        const w = 2 * Math.PI * f;
        return Math.sin(w * t - 2 * Math.PI * x);
      }
      function yReflectedFixed(x, t, f){
        const w = 2 * Math.PI * f;
        return -Math.sin(w * t + 2 * Math.PI * x); // Spiegelung an y- und x-Achse
      }

      function draw(now){
        if(!canvas.isConnected){
          cancelAnimationFrame(rafId);
          return;
        }

        const A = ampEl ? Number(ampEl.value) : 0.8;
        const lamNorm = lamEl ? Number(lamEl.value) : 1.2;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        const t = isRunning ? ((now - t0) / 1000) * speed : tFrozen;
        const f = 0.8;

        if(ampVal) ampVal.textContent = A.toFixed(2);
        if(lamVal) lamVal.textContent = lamNorm.toFixed(2);
        if(speedVal) speedVal.textContent = speed.toFixed(1);

        const Lpx = xWall - xL;
        const lamPx = lamNorm * Lpx;
        const scaleY = A * (H * 0.24);

        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(120,130,150,0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xL, y0);
        ctx.lineTo(W - 20, y0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xWall, 24);
        ctx.lineTo(xWall, H - 24);
        ctx.stroke();
        ctx.fillStyle = "#374151";
        ctx.font = "15px sans-serif";
        ctx.fillText("y-Achse / festes Ende (Reflexion)", xWall - 120, 20);

        const steps = 700;

        ctx.strokeStyle = "#f59e0b"; // einfallend links
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xL + (i / steps) * (xWall - xL);
          const xRel = (xPix - xWall) / lamPx;
          const y = y0 - scaleY * yIncident(xRel, t, f);
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#0f9d58"; // reflektiert mit Phasensprung
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xL + (i / steps) * (xWall - xL);
          const xRel = (xPix - xWall) / lamPx;
          const y = y0 - scaleY * yReflectedFixed(xRel, t, f);
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#d946ef"; // Überlagerung nur links der y-Achse
        ctx.lineWidth = 3;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xL + (i / steps) * (xWall - xL);
          const xRel = (xPix - xWall) / lamPx;
          const yi = yIncident(xRel, t, f);
          const yr = yReflectedFixed(xRel, t, f);
          const y = y0 - scaleY * (yi + yr);
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Einfallende Welle als Fortsetzung rechts der y-Achse
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i <= steps; i++){
          const xPix = xWall + (i / steps) * (W - xWall - 20);
          const xRel = (xPix - xWall) / lamPx;
          const y = y0 - scaleY * yIncident(xRel, t, f);
          if(i === 0) ctx.moveTo(xPix, y); else ctx.lineTo(xPix, y);
        }
        ctx.stroke();

        // Knoten der pinken stehenden Welle (feste Reflexion): sin(2*pi*xRel)=0
        const nodesFixed = [];
        const nodeScanFixed = 1200;
        let prevFixed = null;
        for(let i = 0; i <= nodeScanFixed; i++){
          const xn = i / nodeScanFixed;
          const xRel = (xL + xn * (xWall - xL) - xWall) / lamPx;
          const s = Math.sin(2 * Math.PI * xRel);
          if(Math.abs(s) < 0.012){
            if(prevFixed == null || Math.abs(xn - prevFixed) > 0.012){
              nodesFixed.push(xn);
              prevFixed = xn;
            }
          }
        }
        ctx.fillStyle = "#dc2626";
        nodesFixed.forEach(xn => {
          const xPix = xL + xn * (xWall - xL);
          ctx.beginPath();
          ctx.arc(xPix, y0, 4.2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "rgba(148,163,184,0.07)";
        ctx.fillRect(xWall, 24, W - xWall - 20, H - 48);
        ctx.fillStyle = "#64748b";
        ctx.fillText("rechts: nur einfallende Welle", xWall + 10, y0 - 10);

        readout.textContent =
          "Links der y-Achse:\n" +
          "orange = einfallend  y1 = A*sin(2pi*(t/T - x/lambda))\n" +
          "gruen  = reflektiert y2 = -A*sin(2pi*(t/T + x/lambda))\n" +
          "pink   = ueberlagert y = y1 + y2\n" +
          "Rechts der y-Achse: Fortsetzung der einfallenden Welle\n" +
          "rote Punkte = Knoten der stehenden Welle\n" +
          "Reflexion am festen Ende: mit Phasensprung (Spiegelung an y- und x-Achse).";

        rafId = requestAnimationFrame(draw);
      }

      function startAnim(){
        if(isRunning) return;
        isRunning = true;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        t0 = performance.now() - (tFrozen / speed) * 1000;
      }
      function stopAnim(){
        if(!isRunning) return;
        const speed = speedEl ? Number(speedEl.value) : 1.0;
        tFrozen = ((performance.now() - t0) / 1000) * speed;
        isRunning = false;
      }
      function updateToggleBtn(){
        if(!startBtn) return;
        startBtn.textContent = isRunning ? "Stop" : "Start";
      }
      function toggleAnim(){
        if(isRunning) stopAnim();
        else startAnim();
        updateToggleBtn();
      }

      if(startBtn) startBtn.addEventListener("click", toggleAnim);
      updateToggleBtn();
      rafId = requestAnimationFrame(draw);
    }

function initLeifiWaveSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("leifiWaveCanvas");
      if (!canvas) return;
      if (canvas.dataset.wbLeifiInit === "1") return;
      canvas.dataset.wbLeifiInit = "1";

      const ampEl = getById("lwAmp");
      const freqEl = getById("lwFreq");
      const speedEl = getById("lwSpeed");
      const ampVal = getById("lwAmpVal");
      const freqVal = getById("lwFreqVal");
      const speedVal = getById("lwSpeedVal");
      const lamVal = getById("lwLamVal");

      const cbAmp = getById("cbAmp");
      const cbPer = getById("cbPer");
      const cbVel = getById("cbVel");
      const cbLam = getById("cbLam");
      const cbCoord = getById("cbCoord");

      const playBtn = getById("lwPlayBtn");
      const resetBtn = getById("lwResetBtn");

      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const originX = 50;
      const originY = H / 2;
      const viewWidth = W - originX - 30;

      let rafId = 0;
      let t0 = performance.now();
      let tFrozen = 0;
      let isRunning = false;
      let scaleX = 30; // pixels per meter
      let scaleY = 40; // pixels per meter

      function draw(now) {
        if (!canvas.isConnected) {
          cancelAnimationFrame(rafId);
          return;
        }

        const A = Number(ampEl.value);
        const f = Number(freqEl.value);
        const c = Number(speedEl.value);
        const lam = c / f;

        ampVal.textContent = A.toFixed(1);
        freqVal.textContent = f.toFixed(2);
        speedVal.textContent = c.toFixed(1);
        lamVal.textContent = lam.toFixed(2);

        const realTime = isRunning ? ((now - t0) / 1000) : tFrozen;

        ctx.clearRect(0, 0, W, H);

        if (cbCoord.checked) {
          ctx.strokeStyle = "#999";
          ctx.lineWidth = 1.5;
          // x axis
          ctx.beginPath();
          ctx.moveTo(originX - 20, originY);
          ctx.lineTo(W - 10, originY);
          ctx.stroke();
          // y axis
          ctx.beginPath();
          ctx.moveTo(originX, 10);
          ctx.lineTo(originX, H - 10);
          ctx.stroke();
          // arrows
          ctx.fillStyle = "#999";
          ctx.beginPath(); ctx.moveTo(W - 10, originY); ctx.lineTo(W - 20, originY - 5); ctx.lineTo(W - 20, originY + 5); ctx.fill();
          ctx.beginPath(); ctx.moveTo(originX, 10); ctx.lineTo(originX - 5, 20); ctx.lineTo(originX + 5, 20); ctx.fill();
        }

        // Generate particle positions
        const numParticles = 45;
        const dx = viewWidth / numParticles;

        let pathPts = [];
        for (let i = 0; i <= numParticles; i++) {
          const pixX = originX + i * dx;
          const realX = (pixX - originX) / scaleX;
          const phase = 2 * Math.PI * (realTime * f - realX / lam);
          const realY = A * Math.sin(phase);
          const pixY = originY - realY * scaleY;
          pathPts.push({ i, x: pixX, y: pixY, realX, phase });
        }

        // Draw circles for particles
        for (let p of pathPts) {
          ctx.fillStyle = "#a855f7";
          ctx.strokeStyle = "#4c1d95";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }

        // Find a peak
        let bestPeak = pathPts[0];
        let maxVal = -Infinity;
        for (let p of pathPts) {
          const pval = Math.sin(p.phase);
          if (pval > maxVal) { maxVal = pval; bestPeak = p; }
        }

        if (cbAmp.checked && bestPeak) {
          ctx.strokeStyle = "#000";
          ctx.fillStyle = "#000";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(bestPeak.x, originY);
          ctx.lineTo(bestPeak.x, originY - A * scaleY);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(bestPeak.x, originY - A * scaleY, 3, 0, 2 * Math.PI);
          ctx.fill();

          ctx.font = "bold 16px sans-serif";
          ctx.fillText("y\u0302", bestPeak.x + 8, originY - (A * scaleY) / 2 + 5);
        }

        if (cbPer.checked) {
          const T = 1 / f;
          ctx.fillStyle = "#3b82f6";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText(`Periodendauer T = ${T.toFixed(2)} s`, W - 250, 30);

          const p = pathPts[0];
          ctx.fillStyle = "#3b82f6";
          ctx.strokeStyle = "#1e3a8a";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 9, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }

        if (cbVel.checked && bestPeak) {
          ctx.strokeStyle = "#16a34a";
          ctx.fillStyle = "#16a34a";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(bestPeak.x, bestPeak.y - 25);
          ctx.lineTo(bestPeak.x + 50, bestPeak.y - 25);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(bestPeak.x + 50, bestPeak.y - 25);
          ctx.lineTo(bestPeak.x + 35, bestPeak.y - 32);
          ctx.lineTo(bestPeak.x + 35, bestPeak.y - 18);
          ctx.fill();

          ctx.font = "bold 16px sans-serif";
          ctx.fillText(`c`, bestPeak.x + 20, bestPeak.y - 32);
        }

        if (cbLam.checked) {
          let peaks = [];
          for (let i = 1; i < pathPts.length - 1; i++) {
            // Detect peaks using y values (smaller y is higher peak on canvas)
            if (pathPts[i].y < pathPts[i - 1].y && pathPts[i].y < pathPts[i + 1].y) {
              peaks.push(pathPts[i]);
            }
          }
          if (peaks.length >= 2) {
            const p1 = peaks[0];
            const p2 = peaks[1];
            ctx.strokeStyle = "#dc2626";
            ctx.fillStyle = "#dc2626";
            ctx.lineWidth = 2.5;

            const yLine = Math.min(p1.y, p2.y) - 55;

            ctx.beginPath(); ctx.moveTo(p1.x, p1.y - 10); ctx.lineTo(p1.x, yLine - 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p2.x, p2.y - 10); ctx.lineTo(p2.x, yLine - 5); ctx.stroke();

            ctx.beginPath(); ctx.moveTo(p1.x, yLine); ctx.lineTo(p2.x, yLine); ctx.stroke();

            ctx.beginPath(); ctx.moveTo(p1.x, yLine); ctx.lineTo(p1.x + 10, yLine - 5); ctx.lineTo(p1.x + 10, yLine + 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(p2.x, yLine); ctx.lineTo(p2.x - 10, yLine - 5); ctx.lineTo(p2.x - 10, yLine + 5); ctx.fill();

            ctx.font = "bold 18px sans-serif";
            ctx.fillText(`\u03BB`, (p1.x + p2.x) / 2 - 6, yLine - 10);
          }
        }

        rafId = requestAnimationFrame(draw);
      }

      function togglePlay() {
        if (isRunning) {
          isRunning = false;
          tFrozen = ((performance.now() - t0) / 1000);
        } else {
          isRunning = true;
          t0 = performance.now() - tFrozen * 1000;
        }
      }

      function resetSim() {
        isRunning = false;
        tFrozen = 0;
      }

      if (playBtn) playBtn.addEventListener("click", togglePlay);
      if (resetBtn) resetBtn.addEventListener("click", resetSim);

      rafId = requestAnimationFrame(draw);
    }

function initCoupledWaveSim(root) {
      var getById = createScopedIdGetter(root);
      const canvas = getById("coupledWaveCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const readout = getById("coupledWaveReadout");

      const ampSlider = getById("cwAmp");
      const freqSlider = getById("cwFreq");
      const x1Slider = getById("cwX1");
      const speedSlider = getById("cwSpeed");

      const ampVal = getById("cwAmpVal");
      const freqVal = getById("cwFreqVal");
      const x1Val = getById("cwX1Val");
      const speedVal = getById("cwSpeedVal");

      const startBtn = getById("cwStartBtn");
      const resetBtn = getById("cwResetBtn");

      let isPlaying = false;
      let lastTime = 0;
      let simTime = 0; // physics time
      const c = 1.0; // wave speed const

      let A = parseFloat(ampSlider.value);
      let f = parseFloat(freqSlider.value);
      let x1 = parseFloat(x1Slider.value);
      let simSpeed = parseFloat(speedSlider.value);
      let rafId;

      function updateVals() {
        A = parseFloat(ampSlider.value);
        f = parseFloat(freqSlider.value);
        x1 = parseFloat(x1Slider.value);
        simSpeed = parseFloat(speedSlider.value);

        ampVal.textContent = A.toFixed(1);
        freqVal.textContent = f.toFixed(2);
        x1Val.textContent = x1.toFixed(1);
        speedVal.textContent = simSpeed.toFixed(1);
        if (!isPlaying) draw();
      }

      ampSlider.addEventListener("input", updateVals);
      freqSlider.addEventListener("input", updateVals);
      x1Slider.addEventListener("input", updateVals);
      speedSlider.addEventListener("input", updateVals);

      startBtn.addEventListener("click", () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
          lastTime = performance.now();
          rafId = requestAnimationFrame(loop);
        } else {
          cancelAnimationFrame(rafId);
        }
      });

      resetBtn.addEventListener("click", () => {
        isPlaying = false;
        cancelAnimationFrame(rafId);
        simTime = 0;
        updateVals(); // calls draw()
      });

      function loop(now) {
        if (!isPlaying) return;
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        simTime += dt * simSpeed;
        if (simTime > 20) {
          simTime = 20;
          isPlaying = false;
        }
        draw();
        if (isPlaying) {
          rafId = requestAnimationFrame(loop);
        }
      }

      function draw() {
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const topH = H / 2;
        const marginX = 80;
        const graphW = W - marginX * 2;
        const scaleX = graphW / 20; // 0 to 20
        const scaleY = (topH / 2) - 50;

        const lambda = c / f;
        const T = 1 / f;

        // --- TOP y(x) ---
        const originX1 = marginX;
        const originY1 = topH / 2;

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX1, originY1);
        ctx.lineTo(originX1 + graphW + 20, originY1);
        ctx.moveTo(originX1, originY1 - scaleY * 2);
        ctx.lineTo(originX1, originY1 + scaleY * 2);
        ctx.stroke();

        ctx.fillStyle = "#333";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("y(x)", originX1 - 40, originY1 - scaleY * 1.8);
        ctx.fillText("x", originX1 + graphW + 25, originY1 + 6);

        ctx.font = "16px sans-serif";
        for (let i = 2; i <= 20; i += 2) {
          ctx.beginPath();
          ctx.moveTo(originX1 + i * scaleX, originY1 - 5);
          ctx.lineTo(originX1 + i * scaleX, originY1 + 5);
          ctx.stroke();
          ctx.fillText(i, originX1 + i * scaleX - 5, originY1 + 20);
        }
        ctx.beginPath();
        ctx.moveTo(originX1 - 5, originY1 - scaleY); ctx.lineTo(originX1 + 5, originY1 - scaleY);
        ctx.moveTo(originX1 - 5, originY1 + scaleY); ctx.lineTo(originX1 + 5, originY1 + scaleY);
        ctx.stroke();
        ctx.fillText("1", originX1 - 20, originY1 - scaleY + 5);
        ctx.fillText("-1", originX1 - 25, originY1 + scaleY + 5);

        ctx.beginPath();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        const waveFrontX = c * simTime;

        for (let px = 0; px <= graphW; px++) {
          const x = px / scaleX;
          if (x > waveFrontX) break;
          // y(x,t) = A * sin(2*pi * (t/T - x/lambda))
          // For positive upward peak initially at x=0, we draw negative Canvas Y
          const y = A * Math.sin(2 * Math.PI * (simTime / T - x / lambda));
          const plotX = originX1 + px;
          const plotY = originY1 - y * scaleY;
          if (px === 0) ctx.moveTo(plotX, plotY);
          else ctx.lineTo(plotX, plotY);
        }
        ctx.stroke();

        const p1x = x1;
        let p1y = 0;
        if (p1x <= waveFrontX) {
          p1y = A * Math.sin(2 * Math.PI * (simTime / T - p1x / lambda));
        }
        const p1PlotX = originX1 + p1x * scaleX;
        const p1PlotY = originY1 - p1y * scaleY;

        ctx.beginPath();
        ctx.arc(p1PlotX, p1PlotY, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#1e3a8a";
        ctx.fill();
        ctx.stroke();

        ctx.fillText("x\u2081 = " + x1.toFixed(1) + " m", originX1 + graphW / 5, originY1 - scaleY * 1.5);
        ctx.fillText("t = " + simTime.toFixed(1) + " s", originX1 + graphW / 2, originY1 - scaleY * 1.5);

        // --- BOTTOM y(t) ---
        const originX2 = marginX;
        const originY2 = topH + topH / 2;

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX2, originY2);
        ctx.lineTo(originX2 + graphW + 20, originY2);
        ctx.moveTo(originX2, originY2 - scaleY * 2);
        ctx.lineTo(originX2, originY2 + scaleY * 2);
        ctx.stroke();

        ctx.font = "bold 18px sans-serif";
        ctx.fillText("y(t)", originX2 - 40, originY2 - scaleY * 1.8);
        ctx.fillText("t", originX2 + graphW + 25, originY2 + 6);

        ctx.font = "16px sans-serif";
        for (let i = 2; i <= 20; i += 2) {
          ctx.beginPath();
          ctx.moveTo(originX2 + i * scaleX, originY2 - 5);
          ctx.lineTo(originX2 + i * scaleX, originY2 + 5);
          ctx.stroke();
          ctx.fillText(i, originX2 + i * scaleX - 5, originY2 + 20);
        }
        ctx.beginPath();
        ctx.moveTo(originX2 - 5, originY2 - scaleY); ctx.lineTo(originX2 + 5, originY2 - scaleY);
        ctx.moveTo(originX2 - 5, originY2 + scaleY); ctx.lineTo(originX2 + 5, originY2 + scaleY);
        ctx.stroke();
        ctx.fillText("1", originX2 - 20, originY2 - scaleY + 5);
        ctx.fillText("-1", originX2 - 25, originY2 + scaleY + 5);

        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;

        const timeOffset = x1 / c;
        for (let pt = 0; pt <= graphW; pt++) {
          const t_plot = pt / scaleX;
          if (t_plot > simTime) break;

          let y_t = 0;
          if (t_plot >= timeOffset) {
            y_t = A * Math.sin(2 * Math.PI * (t_plot / T - x1 / lambda));
          }

          const plotX = originX2 + pt;
          const plotY = originY2 - y_t * scaleY;
          if (pt === 0) ctx.moveTo(plotX, plotY);
          else ctx.lineTo(plotX, plotY);
        }
        ctx.stroke();

        let current_yt = 0;
        if (simTime >= timeOffset) {
          current_yt = A * Math.sin(2 * Math.PI * (simTime / T - x1 / lambda));
        }
        const p2PlotX = originX2 + simTime * scaleX;
        const p2PlotY = originY2 - current_yt * scaleY;

        ctx.beginPath();
        ctx.arc(p2PlotX, p2PlotY, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#b45309";
        ctx.fill();
        ctx.stroke();

        if (simTime > 0) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(180, 83, 9, 0.4)";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.moveTo(p1PlotX, p1PlotY);

          const cpX = (p1PlotX + p2PlotX) / 2;
          const cpY = originY1 + topH / 2;
          ctx.quadraticCurveTo(cpX, cpY, p2PlotX, p2PlotY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.fillStyle = "rgba(180, 83, 9, 0.4)";
          const dx = p2PlotX - cpX;
          const dy = p2PlotY - cpY;
          const ang = Math.atan2(dy, dx);
          ctx.moveTo(p2PlotX, p2PlotY);
          ctx.lineTo(p2PlotX - 15 * Math.cos(ang - Math.PI / 6), p2PlotY - 15 * Math.sin(ang - Math.PI / 6));
          ctx.lineTo(p2PlotX - 15 * Math.cos(ang + Math.PI / 6), p2PlotY - 15 * Math.sin(ang + Math.PI / 6));
          ctx.fill();
        }

        readout.textContent = `Aktuelle y-Auslenkung am Ort x1: ${p1y.toFixed(2)} m`;
      }

      updateVals();
    }
  register('transversal', initTransversalSim);
  register('longitudinal', initLongitudinalSim);
  register('huygens-diffraction', initHuygensDiffractionSim);
  register('coherent-screen', initCoherentScreenSim);
  register('single-slit', initSingleSlitSim);
  register('double-slit-envelope', initDoubleSlitWithEnvelopeSim);
  register('grating', initGratingSim);
  register('grating-phasor', initGratingPhasorSim);
  register('double-slit-particles', initDoubleSlitParticleSim);
  register('build-standing', initBuildStandingSim);
  register('fixed-pulse-reflection', initFixedPulseReflectionSim);
  register('loose-pulse-reflection', initLoosePulseReflectionSim);
  register('thin-dense-transition', initThinDenseTransitionSim);
  register('dense-thin-transition', initDenseThinTransitionSim);
  register('loose-reflection', initLooseReflectionSim);
  register('standing-modes', initStandingModesSim);
  register('fixed-reflection', initFixedReflectionSim);
  register('leifi-wave', initLeifiWaveSim);
  register('coupled-wave', initCoupledWaveSim);

  window.WellenSim = { mount: mount, mountAll: mountAll, destroy: destroy };
})(window, document);
