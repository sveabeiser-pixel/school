(function (window, document) {
  "use strict";

  var C = 299792458;
  var H_EV_S = 4.135667696e-15;
  var HC_EV_NM = 1239.841984;
  var E_CHARGE = 1.602176634e-19;
  var registry = Object.create(null);

  function register(key, initFn) {
    registry[key] = initFn;
  }

  function mount(root) {
    if (!root || !root.getAttribute) return;
    var key = root.getAttribute("data-photoeffect-sim");
    var initFn = registry[key];
    if (!initFn) return;
    if (root.dataset && root.dataset.photoeffectSimMounted === "1") return;
    initFn(root);
    if (root.dataset) root.dataset.photoeffectSimMounted = "1";
  }

  function mountAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll ? scope.querySelectorAll("[data-photoeffect-sim]") : [];
    Array.prototype.forEach.call(nodes, mount);
  }

  function q(root, selector) {
    return root.querySelector(selector);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatCurrent(currentA) {
    var abs = Math.abs(currentA);
    if (abs >= 1e-3) return currentA.toFixed(3) + " A";
    if (abs >= 1e-6) return (currentA * 1e6).toFixed(3) + " �A";
    if (abs >= 1e-9) return (currentA * 1e9).toFixed(3) + " nA";
    if (abs >= 1e-12) return (currentA * 1e12).toFixed(2) + " pA";
    return "0 A";
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wavelengthToColor(nm) {
    var wavelength = clamp(nm, 100, 850);
    if (wavelength < 380) return "rgba(120, 70, 255, 0.35)";
    if (wavelength > 740) return "rgba(120, 20, 20, 0.28)";

    var r = 0;
    var g = 0;
    var b = 0;

    if (wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      b = 1;
    } else if (wavelength < 490) {
      g = (wavelength - 440) / (490 - 440);
      b = 1;
    } else if (wavelength < 510) {
      g = 1;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1;
    } else if (wavelength < 645) {
      r = 1;
      g = -(wavelength - 645) / (645 - 580);
    } else {
      r = 1;
    }

    var factor = 1;
    if (wavelength > 700) factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
    if (wavelength < 420) factor = 0.35 + 0.65 * (wavelength - 380) / (420 - 380);

    return "rgba(" +
      Math.round(255 * r * factor) + "," +
      Math.round(255 * g * factor) + "," +
      Math.round(255 * b * factor) + ",0.42)";
  }

  function initOuterPhotoeffect(root) {
    var canvas = q(root, '[data-role="canvas"]');
    var wavelengthEl = q(root, '[data-role="wavelength"]');
    var intensityEl = q(root, '[data-role="intensity"]');
    var voltageEl = q(root, '[data-role="voltage"]');
    var materialEl = q(root, '[data-role="material"]');
    var pauseBtn = q(root, '[data-role="pause"]');
    var resetBtn = q(root, '[data-role="reset"]');
    if (!canvas || !wavelengthEl || !intensityEl || !voltageEl || !materialEl || !pauseBtn || !resetBtn) return;
    if (canvas.dataset.peInit === "1") return;
    canvas.dataset.peInit = "1";

    var materials = {
      sodium: { label: "Natrium", phi: 2.28, tone: "#d8b44c" },
      zinc: { label: "Zink", phi: 4.27, tone: "#8da4b8" },
      copper: { label: "Kupfer", phi: 4.70, tone: "#bf7b52" },
      platinum: { label: "Platin", phi: 5.36, tone: "#95a5b0" },
      calcium: { label: "Calcium", phi: 2.90, tone: "#d7cf91" }
    };

    var valueEls = {
      wavelength: q(root, '[data-role="wavelength-value"]'),
      intensity: q(root, '[data-role="intensity-value"]'),
      voltage: q(root, '[data-role="voltage-value"]'),
      materialPhi: q(root, '[data-role="phi-value"]'),
      lambda: q(root, '[data-role="lambda-out"]'),
      freq: q(root, '[data-role="freq-out"]'),
      eph: q(root, '[data-role="eph-out"]'),
      phi: q(root, '[data-role="phi-out"]'),
      ekin: q(root, '[data-role="ekin-out"]'),
      ustop: q(root, '[data-role="ustop-out"]'),
      current: q(root, '[data-role="current-out"]'),
      collection: q(root, '[data-role="collection-out"]'),
      status: q(root, '[data-role="status"]'),
      statusText: q(root, '[data-role="status-text"]'),
      threshold: q(root, '[data-role="threshold-out"]'),
      voltageReadout: q(root, '[data-role="voltage-readout"]')
    };

    var ctx = canvas.getContext("2d");
    var W = canvas.width;
    var H = canvas.height;
    var tube = { x: W * 0.58, y: H * 0.47, rx: 220, ry: 130 };
    var anodeX = tube.x - 120;
    var cathodeX = tube.x + 145;
    var cathodeTop = tube.y - 72;
    var cathodeBottom = tube.y + 72;
    var electrons = [];
    var spawnAccumulator = 0;
    var rafId = 0;
    var lastTs = 0;
    var paused = false;

    var state = {
      wavelength: Number(wavelengthEl.value),
      intensity: Number(intensityEl.value),
      voltage: Number(voltageEl.value),
      material: materialEl.value
    };

    function compute() {
      var material = materials[state.material];
      var photonEnergy = HC_EV_NM / state.wavelength;
      var freqHz = C / (state.wavelength * 1e-9);
      var ekinMax = Math.max(0, photonEnergy - material.phi);
      var stoppingVoltage = ekinMax;
      var collectionFraction = ekinMax <= 0 ? 0 : clamp(1 - state.voltage / Math.max(stoppingVoltage, 1e-6), 0, 1);
      var opticalPower = (state.intensity / 100) * 2.2e-5;
      var photonFlux = photonEnergy > 0 ? opticalPower / (photonEnergy * E_CHARGE) : 0;
      var quantumYield = ekinMax > 0 ? clamp(0.015 + 0.018 * ekinMax, 0.015, 0.09) : 0;
      var emittedPerSecond = photonFlux * quantumYield;
      var collectedPerSecond = emittedPerSecond * collectionFraction;
      var currentA = collectedPerSecond * E_CHARGE;
      var lambdaThreshold = HC_EV_NM / material.phi;
      var fThreshold = material.phi / H_EV_S;
      return {
        material: material,
        photonEnergy: photonEnergy,
        freqHz: freqHz,
        ekinMax: ekinMax,
        stoppingVoltage: stoppingVoltage,
        collectionFraction: collectionFraction,
        opticalPower: opticalPower,
        emittedPerSecond: emittedPerSecond,
        currentA: currentA,
        lambdaThreshold: lambdaThreshold,
        fThreshold: fThreshold
      };
    }

    function syncUI() {
      var model = compute();
      root.style.setProperty("--pe-marker", ((state.wavelength - 100) / 750 * 100).toFixed(2) + "%");

      valueEls.wavelength.textContent = state.wavelength.toFixed(0) + " nm";
      valueEls.intensity.textContent = state.intensity.toFixed(0) + " %";
      valueEls.voltage.textContent = state.voltage.toFixed(2) + " V";
      valueEls.materialPhi.textContent = model.material.phi.toFixed(2) + " eV";

      valueEls.lambda.textContent = state.wavelength.toFixed(0) + " nm";
      valueEls.freq.textContent = (model.freqHz / 1e14).toFixed(2) + " � 10^14 Hz";
      valueEls.eph.textContent = model.photonEnergy.toFixed(2) + " eV";
      valueEls.phi.textContent = model.material.phi.toFixed(2) + " eV";
      valueEls.ekin.textContent = model.ekinMax.toFixed(2) + " eV";
      valueEls.ustop.textContent = model.stoppingVoltage.toFixed(2) + " V";
      valueEls.current.textContent = formatCurrent(model.currentA);
      valueEls.collection.textContent = Math.round(model.collectionFraction * 100) + " %";
      valueEls.threshold.textContent = model.lambdaThreshold.toFixed(0) + " nm / " + (model.fThreshold / 1e14).toFixed(2) + " � 10^14 Hz";
      valueEls.voltageReadout.textContent = state.voltage.toFixed(2) + " V";

      valueEls.status.classList.remove("pe-status-on", "pe-status-off");
      if (model.ekinMax > 0) {
        valueEls.status.classList.add("pe-status-on");
        valueEls.statusText.textContent =
          "Photoeffekt aktiv. Einzelne Photonen tragen genug Energie, um die Austrittsenergie zu �berwinden.";
      } else {
        valueEls.status.classList.add("pe-status-off");
        valueEls.statusText.textContent =
          "Kein Photoeffekt. Die Photonenenergie liegt unter der Austrittsenergie des gew�hlten Materials.";
      }
    }

    function spawnElectron(model) {
      if (model.ekinMax <= 0) return;
      var launchY = cathodeTop + 10 + Math.random() * (cathodeBottom - cathodeTop - 20);
      var collected = Math.random() < model.collectionFraction;
      var speed = 130 + 55 * Math.sqrt(Math.max(model.ekinMax, 0));
      electrons.push({
        x: cathodeX - 8,
        y: launchY,
        vy: (Math.random() - 0.5) * 18,
        speed: speed,
        collected: collected,
        turnAge: 0.18 + Math.random() * 0.22 + Math.max(0, state.voltage) * 0.05,
        age: 0,
        size: 4 + Math.random() * 1.4
      });
    }

    function updateElectrons(dt, model) {
      var spawnRate = model.ekinMax > 0 ? (state.intensity / 100) * 22 : 0;
      spawnAccumulator += dt * spawnRate;
      while (spawnAccumulator >= 1) {
        spawnElectron(model);
        spawnAccumulator -= 1;
      }

      electrons = electrons.filter(function (electron) {
        electron.age += dt;
        electron.y += electron.vy * dt;
        if (electron.collected) {
          electron.x -= electron.speed * dt;
          electron.vy *= 0.992;
          return electron.x > anodeX - 20;
        }

        if (electron.age < electron.turnAge) {
          electron.x -= electron.speed * dt * 0.88;
          electron.vy *= 0.992;
          return true;
        }

        electron.x += electron.speed * dt * 0.62;
        electron.vy += (Math.random() - 0.5) * 8 * dt;
        return electron.x < cathodeX + 25 && electron.age < 1.5;
      });
    }

    function drawMeter(model) {
      var meterX = W - 150;
      var meterY = H * 0.63;
      ctx.save();
      ctx.translate(meterX, meterY);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 3;
      roundedRectPath(ctx, -46, -52, 92, 110, 12);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      for (var i = -2; i <= 2; i++) {
        var angle = -Math.PI * 0.85 + (i + 2) * (Math.PI * 0.42 / 4);
        var x1 = Math.cos(angle) * 30;
        var y1 = Math.sin(angle) * 30;
        var x2 = Math.cos(angle) * 40;
        var y2 = Math.sin(angle) * 40;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      var currentScale = clamp(model.currentA / 1.2e-6, 0, 1);
      var needleAngle = -Math.PI * 0.82 + currentScale * (Math.PI * 0.42);
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(needleAngle) * 34, Math.sin(needleAngle) * 34);
      ctx.stroke();
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1f2937";
      ctx.font = "24px serif";
      ctx.fillText("A", -8, 24);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(-46, 26, 92, 32);
      ctx.restore();
    }

    function drawBattery() {
      var left = tube.x - 110;
      var y = H - 90;
      var width = 260;
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(left, y, width, 18, 9);
      ctx.stroke();

      var sliderX = left + (state.voltage / 5) * width;
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      roundedRectPath(ctx, sliderX - 14, y - 6, 28, 30, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#102a43";
      ctx.font = "18px sans-serif";
      ctx.fillText("U = " + state.voltage.toFixed(2) + " V", left + width + 26, y + 16);
    }

    function drawScene(model) {
      ctx.clearRect(0, 0, W, H);

      var beamColor = wavelengthToColor(state.wavelength);
      ctx.fillStyle = beamColor;
      ctx.beginPath();
      ctx.moveTo(130, tube.y - 18);
      ctx.lineTo(360, tube.y - 88);
      ctx.lineTo(360, tube.y + 88);
      ctx.lineTo(130, tube.y + 18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f4d35e";
      ctx.beginPath();
      ctx.arc(85, tube.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff7cc";
      ctx.beginPath();
      ctx.arc(85, tube.y, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(tube.x, tube.y, tube.rx, tube.ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(anodeX, tube.y, 46, 72, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = model.material.tone;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(cathodeX, cathodeTop);
      ctx.lineTo(cathodeX, cathodeBottom);
      ctx.stroke();

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(anodeX, tube.y + 72);
      ctx.lineTo(anodeX, H - 105);
      ctx.lineTo(tube.x - 120, H - 105);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cathodeX, tube.y);
      ctx.lineTo(W - 250, tube.y);
      ctx.lineTo(W - 250, H - 105);
      ctx.lineTo(tube.x + 140, H - 105);
      ctx.stroke();

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W - 250, H - 150, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.font = "24px serif";
      ctx.fillText("A", W - 258, H - 141);

      electrons.forEach(function (electron) {
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(electron.x, electron.y, electron.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(15, 23, 42, .55)";
        ctx.beginPath();
        ctx.arc(electron.x, electron.y, electron.size * 0.36, 0, Math.PI * 2);
        ctx.fill();
      });

      drawBattery();
      drawMeter(model);

      ctx.fillStyle = "#102a43";
      ctx.font = "16px sans-serif";
      ctx.fillText("Anodenring", anodeX - 80, tube.y - 108);
      ctx.fillText(model.material.label + "-Kathode", cathodeX - 34, tube.y - 108);
      ctx.fillText("E_A = " + model.material.phi.toFixed(2) + " eV", cathodeX + 46, tube.y - 56);
      ctx.fillText("? = " + state.wavelength.toFixed(0) + " nm", 55, H - 150);
      ctx.fillText("f = " + (model.freqHz / 1e14).toFixed(2) + " � 10^14 Hz", 55, H - 120);
      ctx.fillText("I_ph = " + formatCurrent(model.currentA), W - 252, H - 185);
    }

    function frame(ts) {
      if (!canvas.isConnected) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      var model = compute();
      if (!paused) updateElectrons(dt, model);
      drawScene(model);
      rafId = window.requestAnimationFrame(frame);
    }

    function resetSim() {
      electrons = [];
      spawnAccumulator = 0;
      lastTs = 0;
    }

    function handleInput() {
      state.wavelength = Number(wavelengthEl.value);
      state.intensity = Number(intensityEl.value);
      state.voltage = Number(voltageEl.value);
      state.material = materialEl.value;
      syncUI();
    }

    wavelengthEl.addEventListener("input", handleInput);
    intensityEl.addEventListener("input", handleInput);
    voltageEl.addEventListener("input", handleInput);
    materialEl.addEventListener("change", handleInput);
    pauseBtn.addEventListener("click", function () {
      paused = !paused;
      pauseBtn.textContent = paused ? "Weiter" : "Pause";
    });
    resetBtn.addEventListener("click", resetSim);

    syncUI();
    rafId = window.requestAnimationFrame(frame);
    canvas.addEventListener("wb-destroy", function () {
      window.cancelAnimationFrame(rafId);
    });
  }

  register("outer-photoeffect", initOuterPhotoeffect);

  window.PhotoeffektSim = {
    mount: mount,
    mountAll: mountAll
  };
})(window, document);

