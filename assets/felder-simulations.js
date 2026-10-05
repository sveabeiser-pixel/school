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

  function initElectrostaticFieldLab(root) {
    if (!root || (root.dataset && root.dataset.electrostaticFieldMounted === "1")) return;

    if (!find(root, "canvas")) {
      root.innerHTML = [
        '<div class="field-sim-grid field-lab-grid">',
          '<div class="field-sim-controls">',
            '<h2>Feldanordnung bauen</h2>',
            '<div class="field-lab-tools" role="toolbar" aria-label="Werkzeug auswählen">',
              '<button class="field-lab-tool is-active" type="button" data-lab-tool="positive" title="Positive Punktladung setzen" aria-label="Positive Punktladung setzen"><span aria-hidden="true">+</span><small>Ladung</small></button>',
              '<button class="field-lab-tool" type="button" data-lab-tool="negative" title="Negative Punktladung setzen" aria-label="Negative Punktladung setzen"><span aria-hidden="true">−</span><small>Ladung</small></button>',
              '<button class="field-lab-tool" type="button" data-lab-tool="positive-plate" title="Positive Platte setzen" aria-label="Positive Platte setzen"><span aria-hidden="true">+▮</span><small>Platte</small></button>',
              '<button class="field-lab-tool" type="button" data-lab-tool="negative-plate" title="Negative Platte setzen" aria-label="Negative Platte setzen"><span aria-hidden="true">−▮</span><small>Platte</small></button>',
              '<button class="field-lab-tool" type="button" data-lab-tool="erase" title="Objekt löschen" aria-label="Objekt löschen"><span aria-hidden="true">⌫</span><small>Löschen</small></button>',
            '</div>',
            '<p class="field-lab-help">Wähle ein Werkzeug und tippe oder klicke in die Zeichenfläche. Ziehe eine vorhandene Ladung oder Platte, um sie zu verschieben.</p>',
            '<label>Ladungsstärke</label>',
            '<input data-role="charge-strength" type="range" min="1" max="5" value="2" step="0.5">',
            '<div class="field-sim-mono">|q| = <span data-role="charge-strength-value">2,0</span> relative Einheiten</div>',
            '<label>Plattenlänge</label>',
            '<input data-role="plate-length" type="range" min="100" max="340" value="260" step="10">',
            '<div class="field-sim-mono">l = <span data-role="plate-length-value">260</span> px</div>',
            '<label>Plattenrichtung</label>',
            '<select data-role="plate-orientation">',
              '<option value="vertical" selected>senkrecht</option>',
              '<option value="horizontal">waagrecht</option>',
            '</select>',
            '<div class="field-lab-switches">',
              '<label><input data-role="show-field-lines" type="checkbox" checked> Feldlinien</label>',
              '<label><input data-role="show-equipotential" type="checkbox"> Äquipotenziallinien</label>',
              '<label><input data-role="show-potential-map" type="checkbox"> Potenzialfläche färben</label>',
            '</div>',
            '<label>Voreinstellung</label>',
            '<div class="field-lab-presets">',
              '<button class="wb-btn" type="button" data-preset="single">Einzelladung</button>',
              '<button class="wb-btn" type="button" data-preset="dipole">Dipol</button>',
              '<button class="wb-btn" type="button" data-preset="capacitor">Kondensator</button>',
            '</div>',
            '<div class="wb-row field-lab-actions">',
              '<button class="wb-btn" type="button" data-role="undo" title="Letzte Änderung rückgängig machen" aria-label="Letzte Änderung rückgängig machen">↶ Rückgängig</button>',
              '<button class="wb-btn" type="button" data-role="clear">Leeren</button>',
            '</div>',
            '<div class="field-sim-note">',
              '<strong>Beobachte gezielt</strong>',
              '<p>Feldlinien zeigen von Plus nach Minus. Äquipotenziallinien schneiden Feldlinien immer senkrecht. Die Potenzialfläche zeigt positives Potenzial rot, negatives blau und den Übergang bei V = 0 hell.</p>',
            '</div>',
          '</div>',
          '<div>',
            '<div class="field-lab-legend" aria-hidden="true"><span class="field-legend-line"></span> Feldlinie <span class="potential-legend-line"></span> Äquipotenziallinie <span class="potential-color-key"></span> Potenzialfläche</div>',
            '<canvas data-role="canvas" width="980" height="560" aria-label="Interaktives elektrisches Feldlabor mit frei platzierbaren Ladungen, Kondensatorplatten, Feldlinien und Äquipotenziallinien"></canvas>',
            '<div class="field-sim-mono" data-role="readout" aria-live="polite"></div>',
          '</div>',
        '</div>'
      ].join("");
    }

    var canvas = find(root, "canvas");
    var readout = find(root, "readout");
    var strengthEl = find(root, "charge-strength");
    var strengthVal = find(root, "charge-strength-value");
    var plateLengthEl = find(root, "plate-length");
    var plateLengthVal = find(root, "plate-length-value");
    var orientationEl = find(root, "plate-orientation");
    var showFieldEl = find(root, "show-field-lines");
    var showEquipotentialEl = find(root, "show-equipotential");
    var showPotentialMapEl = find(root, "show-potential-map");
    var undoBtn = find(root, "undo");
    var clearBtn = find(root, "clear");
    if (!canvas || !readout || !strengthEl || !plateLengthEl || !orientationEl) return;

    root.dataset.electrostaticFieldMounted = "1";
    var ctx = canvas.getContext("2d");
    var objects = [];
    var history = [];
    var tool = "positive";
    var drag = null;
    var probe = null;
    var margin = 24;
    var potentialMapCanvas = document.createElement("canvas");
    var potentialMapSignature = "";

    function cloneObjects() {
      return objects.map(function (item) {
        var copy = {};
        Object.keys(item).forEach(function (key) { copy[key] = item[key]; });
        return copy;
      });
    }

    function remember() {
      history.push(cloneObjects());
      if (history.length > 24) history.shift();
      if (undoBtn) undoBtn.disabled = history.length === 0;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function setPreset(name) {
      remember();
      if (name === "single") {
        objects = [{ type: "charge", x: 490, y: 280, q: 3 }];
      } else if (name === "dipole") {
        objects = [
          { type: "charge", x: 350, y: 280, q: 3 },
          { type: "charge", x: 630, y: 280, q: -3 }
        ];
      } else {
        objects = [
          { type: "plate", x: 330, y: 280, q: 2.5, length: 320, orientation: "vertical" },
          { type: "plate", x: 650, y: 280, q: -2.5, length: 320, orientation: "vertical" }
        ];
      }
      probe = null;
      draw();
    }

    function sourcePoints() {
      var result = [];
      objects.forEach(function (item, objectIndex) {
        if (item.type === "charge") {
          result.push({ x: item.x, y: item.y, q: item.q, objectIndex: objectIndex });
          return;
        }
        var samples = Math.max(7, Math.round(item.length / 18));
        for (var i = 0; i < samples; i += 1) {
          var along = samples === 1 ? 0 : (i / (samples - 1) - 0.5) * item.length;
          result.push({
            x: item.x + (item.orientation === "horizontal" ? along : 0),
            y: item.y + (item.orientation === "vertical" ? along : 0),
            q: item.q * 0.32,
            objectIndex: objectIndex
          });
        }
      });
      return result;
    }

    function fieldAt(x, y, sources) {
      var ex = 0;
      var ey = 0;
      var potential = 0;
      var softening = 15 * 15;
      sources.forEach(function (source) {
        var dx = x - source.x;
        var dy = y - source.y;
        var r2 = dx * dx + dy * dy + softening;
        var r = Math.sqrt(r2);
        var factor = source.q / (r2 * r);
        ex += factor * dx;
        ey += factor * dy;
        potential += source.q / r;
      });
      return { ex: ex, ey: ey, magnitude: Math.sqrt(ex * ex + ey * ey), potential: potential };
    }

    function nearObject(x, y, maxDistance) {
      for (var i = objects.length - 1; i >= 0; i -= 1) {
        var item = objects[i];
        if (item.type === "charge") {
          if (Math.hypot(x - item.x, y - item.y) <= maxDistance + 10) return i;
        } else {
          var dx = item.orientation === "vertical" ? Math.abs(x - item.x) : Math.max(0, Math.abs(x - item.x) - item.length / 2);
          var dy = item.orientation === "horizontal" ? Math.abs(y - item.y) : Math.max(0, Math.abs(y - item.y) - item.length / 2);
          if (Math.hypot(dx, dy) <= maxDistance) return i;
        }
      }
      return -1;
    }

    function traceLine(seedX, seedY, direction, sources) {
      var points = [{ x: seedX, y: seedY }];
      var x = seedX;
      var y = seedY;
      for (var i = 0; i < 520; i += 1) {
        var field = fieldAt(x, y, sources);
        if (field.magnitude < 1e-8) break;
        var step = 4.2;
        x += direction * field.ex / field.magnitude * step;
        y += direction * field.ey / field.magnitude * step;
        if (x < margin || x > canvas.width - margin || y < margin || y > canvas.height - margin) break;
        points.push({ x: x, y: y });
        if (i > 6 && nearObject(x, y, 11) >= 0) break;
      }
      if (direction < 0) points.reverse();
      return points;
    }

    function fieldSeeds() {
      var sourceSeeds = [];
      var sinkSeeds = [];
      objects.forEach(function (item) {
        var direction = item.q > 0 ? 1 : -1;
        var target = direction > 0 ? sourceSeeds : sinkSeeds;
        if (item.type === "charge") {
          var count = Math.min(20, 8 + Math.round(Math.abs(item.q) * 2));
          for (var i = 0; i < count; i += 1) {
            var angle = i / count * Math.PI * 2;
            target.push({ x: item.x + Math.cos(angle) * 20, y: item.y + Math.sin(angle) * 20, direction: direction });
          }
        } else {
          var countPlate = Math.max(7, Math.round(item.length / 34));
          for (var p = 0; p < countPlate; p += 1) {
            var along = (p / Math.max(1, countPlate - 1) - 0.5) * item.length * 0.9;
            [-1, 1].forEach(function (side) {
              target.push({
                x: item.x + (item.orientation === "horizontal" ? along : side * 11),
                y: item.y + (item.orientation === "vertical" ? along : side * 11),
                direction: direction
              });
            });
          }
        }
      });
      return sourceSeeds.concat(sinkSeeds);
    }

    function drawFieldLines(sources) {
      var occupied = Object.create(null);
      var cellSize = 9;

      function cell(point) {
        return { x: Math.floor(point.x / cellSize), y: Math.floor(point.y / cellSize) };
      }

      function overlapRatio(points) {
        var start = Math.floor(points.length * 0.12);
        var end = Math.ceil(points.length * 0.88);
        var checked = 0;
        var overlaps = 0;
        for (var i = start; i < end; i += 3) {
          var current = cell(points[i]);
          var found = false;
          for (var ox = -1; ox <= 1 && !found; ox += 1) {
            for (var oy = -1; oy <= 1; oy += 1) {
              if (occupied[(current.x + ox) + ":" + (current.y + oy)]) {
                found = true;
                break;
              }
            }
          }
          checked += 1;
          if (found) overlaps += 1;
        }
        return checked ? overlaps / checked : 0;
      }

      function rememberLine(points) {
        var start = Math.floor(points.length * 0.1);
        var end = Math.ceil(points.length * 0.9);
        for (var i = start; i < end; i += 2) {
          var current = cell(points[i]);
          occupied[current.x + ":" + current.y] = true;
        }
      }

      ctx.save();
      ctx.strokeStyle = "rgba(13,116,144,.72)";
      ctx.fillStyle = "#0e7490";
      ctx.lineWidth = 1.7;
      fieldSeeds().forEach(function (seed) {
        var points = traceLine(seed.x, seed.y, seed.direction, sources);
        var showArrow = true;
        if (points.length < 6) return;
        if (seed.direction < 0) {
          var startObject = nearObject(points[0].x, points[0].y, 16);
          var startsAtPositive = startObject >= 0 && objects[startObject].q > 0;
          if (overlapRatio(points) > 0.55) return;
          showArrow = !startsAtPositive;
        }
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        var arrowIndex = Math.min(points.length - 2, Math.max(2, Math.floor(points.length * 0.58)));
        var a = points[Math.max(0, arrowIndex - 2)];
        var b = points[arrowIndex];
        if (showArrow) drawArrow(ctx, a.x, a.y, b.x, b.y, "#0e7490");
        rememberLine(points);
      });
      ctx.restore();
    }

    function potentialScale(sources) {
      var values = [];
      var columns = 32;
      var rows = 18;
      for (var y = 0; y <= rows; y += 1) {
        for (var x = 0; x <= columns; x += 1) {
          var px = (x + 0.5) * canvas.width / (columns + 1);
          var py = (y + 0.5) * canvas.height / (rows + 1);
          if (nearObject(px, py, 24) < 0) values.push(Math.abs(fieldAt(px, py, sources).potential));
        }
      }
      values.sort(function (a, b) { return a - b; });
      return values[Math.floor(values.length * 0.86)] || 0.02;
    }

    function drawPotentialMap(sources) {
      var width = 196;
      var height = 112;
      var signature = objects.map(function (item) {
        return [item.type, Math.round(item.x * 10), Math.round(item.y * 10), item.q, item.length || 0, item.orientation || ""].join(":");
      }).join("|");

      if (signature !== potentialMapSignature) {
        potentialMapCanvas.width = width;
        potentialMapCanvas.height = height;
        var mapCtx = potentialMapCanvas.getContext("2d");
        var image = mapCtx.createImageData(width, height);
        var scale = potentialScale(sources);

        for (var y = 0; y < height; y += 1) {
          for (var x = 0; x < width; x += 1) {
            var potential = fieldAt((x + 0.5) * canvas.width / width, (y + 0.5) * canvas.height / height, sources).potential;
            var normalized = Math.tanh(potential / Math.max(1e-9, scale * 0.72));
            var intensity = Math.pow(Math.abs(normalized), 0.72);
            var neutral = { r: 248, g: 250, b: 252 };
            var target = normalized >= 0 ? { r: 248, g: 113, b: 113 } : { r: 96, g: 165, b: 250 };
            var index = (y * width + x) * 4;
            image.data[index] = Math.round(neutral.r + (target.r - neutral.r) * intensity);
            image.data[index + 1] = Math.round(neutral.g + (target.g - neutral.g) * intensity);
            image.data[index + 2] = Math.round(neutral.b + (target.b - neutral.b) * intensity);
            image.data[index + 3] = 255;
          }
        }
        mapCtx.putImageData(image, 0, 0);
        potentialMapSignature = signature;
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.74;
      ctx.drawImage(potentialMapCanvas, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    function crossing(a, b, level) {
      if ((a.value < level && b.value < level) || (a.value > level && b.value > level) || a.value === b.value) return null;
      var t = (level - a.value) / (b.value - a.value);
      if (t < 0 || t > 1) return null;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }

    function drawEquipotentials(sources) {
      var cols = 52;
      var rows = 30;
      var dx = canvas.width / cols;
      var dy = canvas.height / rows;
      var grid = [];
      var absValues = [];
      for (var gy = 0; gy <= rows; gy += 1) {
        grid[gy] = [];
        for (var gx = 0; gx <= cols; gx += 1) {
          var px = gx * dx;
          var py = gy * dy;
          var value = fieldAt(px, py, sources).potential;
          grid[gy][gx] = value;
          if (nearObject(px, py, 18) < 0) absValues.push(Math.abs(value));
        }
      }
      absValues.sort(function (a, b) { return a - b; });
      var scale = absValues[Math.floor(absValues.length * 0.88)] || 0.02;
      var levels = [-0.9, -0.6, -0.35, -0.18, 0, 0.18, 0.35, 0.6, 0.9].map(function (factor) { return factor * scale; });
      levels.forEach(function (level) {
        ctx.save();
        ctx.strokeStyle = level > 1e-9 ? "rgba(220,38,38,.62)" : (level < -1e-9 ? "rgba(37,99,235,.62)" : "rgba(71,85,105,.72)");
        ctx.lineWidth = Math.abs(level) < 1e-9 ? 2.1 : 1.35;
        ctx.setLineDash([7, 5]);
        for (var y = 0; y < rows; y += 1) {
          for (var x = 0; x < cols; x += 1) {
            var p0 = { x: x * dx, y: y * dy, value: grid[y][x] };
            var p1 = { x: (x + 1) * dx, y: y * dy, value: grid[y][x + 1] };
            var p2 = { x: (x + 1) * dx, y: (y + 1) * dy, value: grid[y + 1][x + 1] };
            var p3 = { x: x * dx, y: (y + 1) * dy, value: grid[y + 1][x] };
            var hits = [crossing(p0, p1, level), crossing(p1, p2, level), crossing(p2, p3, level), crossing(p3, p0, level)].filter(Boolean);
            if (hits.length === 2) {
              ctx.beginPath();
              ctx.moveTo(hits[0].x, hits[0].y);
              ctx.lineTo(hits[1].x, hits[1].y);
              ctx.stroke();
            } else if (hits.length === 4) {
              ctx.beginPath();
              ctx.moveTo(hits[0].x, hits[0].y);
              ctx.lineTo(hits[1].x, hits[1].y);
              ctx.moveTo(hits[2].x, hits[2].y);
              ctx.lineTo(hits[3].x, hits[3].y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      });
    }

    function drawGrid(sources) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (sources.length && showPotentialMapEl && showPotentialMapEl.checked) drawPotentialMap(sources);
      ctx.strokeStyle = "rgba(148,163,184,.18)";
      ctx.lineWidth = 1;
      for (var x = 20; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (var y = 20; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.fillStyle = "#334155";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Elektrisches Feldlabor", 20, 30);
    }

    function drawChargeLabel(item, positive, preferredX, preferredY) {
      var chargeLabel = "q = " + (positive ? "+" : "−") + formatNumber(Math.abs(item.q), 1) + " rel.";
      ctx.save();
      ctx.font = "700 13px system-ui, sans-serif";
      var labelWidth = ctx.measureText(chargeLabel).width + 12;
      var labelX = clamp(preferredX, labelWidth / 2 + 4, canvas.width - labelWidth / 2 - 4);
      var labelY = clamp(preferredY, 14, canvas.height - 14);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.fillRect(labelX - labelWidth / 2, labelY - 10, labelWidth, 20);
      ctx.strokeStyle = positive ? "rgba(220,38,38,.55)" : "rgba(37,99,235,.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX - labelWidth / 2, labelY - 10, labelWidth, 20);
      ctx.fillStyle = positive ? "#991b1b" : "#1d4ed8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(chargeLabel, labelX, labelY);
      ctx.restore();
    }

    function drawObjects() {
      objects.forEach(function (item) {
        var positive = item.q > 0;
        var color = positive ? "#dc2626" : "#2563eb";
        if (item.type === "charge") {
          ctx.beginPath();
          ctx.arc(item.x, item.y, 17, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.font = "800 23px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(positive ? "+" : "−", item.x, item.y - 1);
          drawChargeLabel(item, positive, item.x, item.y > canvas.height - 52 ? item.y - 31 : item.y + 31);
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 12;
          ctx.lineCap = "round";
          ctx.beginPath();
          if (item.orientation === "vertical") {
            ctx.moveTo(item.x, item.y - item.length / 2);
            ctx.lineTo(item.x, item.y + item.length / 2);
          } else {
            ctx.moveTo(item.x - item.length / 2, item.y);
            ctx.lineTo(item.x + item.length / 2, item.y);
          }
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.font = "800 17px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          var marks = Math.max(3, Math.floor(item.length / 55));
          for (var i = 0; i < marks; i += 1) {
            var along = (i / Math.max(1, marks - 1) - 0.5) * item.length * 0.82;
            ctx.fillText(positive ? "+" : "−", item.x + (item.orientation === "horizontal" ? along : 0), item.y + (item.orientation === "vertical" ? along : 0));
          }
          if (item.orientation === "vertical") {
            drawChargeLabel(item, positive, item.x + (item.x < canvas.width / 2 ? -62 : 62), item.y);
          } else {
            drawChargeLabel(item, positive, item.x, item.y + (item.y < canvas.height / 2 ? -25 : 25));
          }
        }
      });
    }

    function drawProbe(sources) {
      if (!probe || objects.length === 0) return;
      var field = fieldAt(probe.x, probe.y, sources);
      if (field.magnitude < 1e-9) return;
      var length = 42;
      drawArrow(ctx, probe.x, probe.y, probe.x + field.ex / field.magnitude * length, probe.y + field.ey / field.magnitude * length, "#7c3aed");
      ctx.beginPath();
      ctx.arc(probe.x, probe.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#7c3aed";
      ctx.fill();
    }

    function updateReadout(sources) {
      var charges = objects.filter(function (item) { return item.type === "charge"; }).length;
      var plates = objects.length - charges;
      var text = charges + " Punktladung" + (charges === 1 ? "" : "en") + ", " + plates + " Platte" + (plates === 1 ? "" : "n") + ".";
      if (probe && sources.length) {
        var field = fieldAt(probe.x, probe.y, sources);
        text += "\nVioletter Pfeil: Feldrichtung am Zeiger. Relative Feldstärke: " + formatNumber(field.magnitude * 100000, 2) + "; Potenzial: " + formatNumber(field.potential * 100, 2) + ".";
      } else {
        text += "\nBewege den Zeiger über die Fläche, um die lokale Feldrichtung anzuzeigen.";
      }
      readout.textContent = text;
    }

    function draw() {
      if (strengthVal) strengthVal.textContent = formatNumber(Number(strengthEl.value), 1);
      if (plateLengthVal) plateLengthVal.textContent = formatNumber(Number(plateLengthEl.value), 0);
      var sources = sourcePoints();
      drawGrid(sources);
      if (sources.length && showEquipotentialEl && showEquipotentialEl.checked) drawEquipotentials(sources);
      if (sources.length && (!showFieldEl || showFieldEl.checked)) drawFieldLines(sources);
      drawObjects();
      drawProbe(sources);
      updateReadout(sources);
    }

    function canvasPoint(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: clamp((event.clientX - rect.left) * canvas.width / rect.width, margin, canvas.width - margin),
        y: clamp((event.clientY - rect.top) * canvas.height / rect.height, margin, canvas.height - margin)
      };
    }

    function setTool(nextTool) {
      tool = nextTool;
      Array.prototype.forEach.call(root.querySelectorAll("[data-lab-tool]"), function (button) {
        button.classList.toggle("is-active", button.getAttribute("data-lab-tool") === tool);
      });
      canvas.style.cursor = tool === "erase" ? "not-allowed" : "crosshair";
    }

    Array.prototype.forEach.call(root.querySelectorAll("[data-lab-tool]"), function (button) {
      button.addEventListener("click", function () { setTool(button.getAttribute("data-lab-tool")); });
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-preset]"), function (button) {
      button.addEventListener("click", function () { setPreset(button.getAttribute("data-preset")); });
    });
    [strengthEl, plateLengthEl].forEach(function (control) { control.addEventListener("input", draw); });
    if (showFieldEl) showFieldEl.addEventListener("change", draw);
    if (showEquipotentialEl) showEquipotentialEl.addEventListener("change", draw);
    if (showPotentialMapEl) showPotentialMapEl.addEventListener("change", draw);

    canvas.addEventListener("pointerdown", function (event) {
      var point = canvasPoint(event);
      var index = nearObject(point.x, point.y, 14);
      if (tool === "erase") {
        if (index >= 0) {
          remember();
          objects.splice(index, 1);
          draw();
        }
        return;
      }
      if (index >= 0) {
        remember();
        drag = { index: index, dx: point.x - objects[index].x, dy: point.y - objects[index].y };
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (objects.length >= 18) {
        readout.textContent = "Maximal 18 Objekte. Lösche zuerst eine Ladung oder Platte.";
        return;
      }
      remember();
      var magnitude = Number(strengthEl.value);
      if (tool === "positive" || tool === "negative") {
        objects.push({ type: "charge", x: point.x, y: point.y, q: (tool === "positive" ? 1 : -1) * magnitude });
      } else {
        var length = Number(plateLengthEl.value);
        var orientation = orientationEl.value;
        var half = length / 2;
        var x = orientation === "horizontal" ? clamp(point.x, margin + half, canvas.width - margin - half) : point.x;
        var y = orientation === "vertical" ? clamp(point.y, margin + half, canvas.height - margin - half) : point.y;
        objects.push({ type: "plate", x: x, y: y, q: (tool === "positive-plate" ? 1 : -1) * magnitude, length: length, orientation: orientation });
      }
      draw();
    });

    canvas.addEventListener("pointermove", function (event) {
      var point = canvasPoint(event);
      probe = point;
      if (drag && objects[drag.index]) {
        var item = objects[drag.index];
        var half = item.type === "plate" ? item.length / 2 : 18;
        item.x = clamp(point.x - drag.dx, item.type === "plate" && item.orientation === "horizontal" ? margin + half : margin, item.type === "plate" && item.orientation === "horizontal" ? canvas.width - margin - half : canvas.width - margin);
        item.y = clamp(point.y - drag.dy, item.type === "plate" && item.orientation === "vertical" ? margin + half : margin, item.type === "plate" && item.orientation === "vertical" ? canvas.height - margin - half : canvas.height - margin);
      }
      draw();
    });

    function endDrag(event) {
      if (drag && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      drag = null;
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", function () { if (!drag) { probe = null; draw(); } });

    if (undoBtn) undoBtn.addEventListener("click", function () {
      if (!history.length) return;
      objects = history.pop();
      undoBtn.disabled = history.length === 0;
      draw();
    });
    if (clearBtn) clearBtn.addEventListener("click", function () {
      if (!objects.length) return;
      remember();
      objects = [];
      probe = null;
      draw();
    });

    if (showEquipotentialEl && root.getAttribute("data-show-equipotential") === "true") showEquipotentialEl.checked = true;
    if (showPotentialMapEl && root.getAttribute("data-show-potential-map") === "true") showPotentialMapEl.checked = true;
    setTool("positive");
    setPreset(root.getAttribute("data-initial-preset") || "dipole");
    history = [];
    if (undoBtn) undoBtn.disabled = true;
    draw();
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

  function initElectrostaticShieldingSim(root) {
    if (!root || (root.dataset && root.dataset.electrostaticShieldingMounted === "1")) return;
    root.innerHTML = [
      '<div class="field-sim-grid">',
        '<div class="field-sim-controls">',
          '<h3>Abschirmung untersuchen</h3>',
          '<label>Anordnung</label>',
          '<select data-role="shield-mode">',
            '<option value="grid">Metallgitter zwischen Platte und Probe</option>',
            '<option value="cage">Geschlossener Faraday-Käfig</option>',
          '</select>',
          '<label>Vorzeichen der Platte</label>',
          '<select data-role="shield-polarity"><option value="positive">positiv</option><option value="negative">negativ</option></select>',
          '<label>Äußere Feldstärke</label>',
          '<input data-role="shield-strength" type="range" min="1" max="5" value="3" step="1">',
          '<div class="field-sim-mono">E außen = <span data-role="shield-strength-value">3</span> relative Einheiten</div>',
          '<label>Feinheit des Gitters</label>',
          '<input data-role="shield-mesh" type="range" min="3" max="12" value="7" step="1">',
          '<div class="field-sim-mono">Querstreben = <span data-role="shield-mesh-value">7</span></div>',
          '<label class="field-mini-check"><input data-role="shield-grounded" type="checkbox" checked> Leiter erden</label>',
          '<div class="field-sim-note"><strong>Modellgrenze</strong><p>Die Prozentangabe ist ein qualitativer Vergleich, kein Messwert. Entscheidend ist: Ein Gitter schwächt das Feld; eine geschlossene leitende Hülle hält ihre ladungsfreie Höhlung im elektrostatischen Gleichgewicht feldfrei.</p></div>',
        '</div>',
        '<div>',
          '<canvas data-role="canvas" width="840" height="420" aria-label="Simulation zur elektrostatischen Abschirmung durch Metallgitter und Faraday-Käfig"></canvas>',
          '<div class="field-sim-mono" data-role="readout" aria-live="polite"></div>',
        '</div>',
      '</div>'
    ].join("");

    var canvas = find(root, "canvas");
    var modeEl = find(root, "shield-mode");
    var polarityEl = find(root, "shield-polarity");
    var strengthEl = find(root, "shield-strength");
    var strengthValue = find(root, "shield-strength-value");
    var meshEl = find(root, "shield-mesh");
    var meshValue = find(root, "shield-mesh-value");
    var groundedEl = find(root, "shield-grounded");
    var readout = find(root, "readout");
    if (!canvas || !modeEl || !polarityEl || !strengthEl || !meshEl || !groundedEl || !readout) return;

    root.dataset.electrostaticShieldingMounted = "1";
    var requestedMode = root.getAttribute("data-default-mode");
    if (requestedMode === "cage") modeEl.value = "cage";
    var ctx = canvas.getContext("2d");

    function signFor(side) {
      var positiveSource = polarityEl.value === "positive";
      if (side === "near") return positiveSource ? "−" : "+";
      return positiveSource ? "+" : "−";
    }

    function drawGround(x, y) {
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke();
      [18, 12, 6].forEach(function (width, index) {
        ctx.beginPath(); ctx.moveTo(x - width / 2, y + 18 + index * 6); ctx.lineTo(x + width / 2, y + 18 + index * 6); ctx.stroke();
      });
    }

    function drawSourcePlate() {
      ctx.fillStyle = "#475569";
      ctx.fillRect(72, 70, 22, 280);
      ctx.fillStyle = polarityEl.value === "positive" ? "#b91c1c" : "#1d4ed8";
      ctx.font = "bold 26px system-ui";
      ctx.textAlign = "center";
      for (var y = 105; y <= 325; y += 44) ctx.fillText(polarityEl.value === "positive" ? "+" : "−", 83, y);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px system-ui";
      ctx.fillText("geladene Platte", 83, 382);
    }

    function drawFieldSegment(x1, x2, y, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      var color = "#0e7490";
      if (polarityEl.value === "positive") drawArrow(ctx, x1, y, x2, y, color);
      else drawArrow(ctx, x2, y, x1, y, color);
      ctx.restore();
    }

    function drawGrid(strength, mesh, grounded) {
      var x = 425;
      var attenuation = grounded ? Math.max(0.08, 0.46 - mesh * 0.032) : Math.max(0.24, 0.68 - mesh * 0.03);
      var lineCount = 4 + strength * 3;
      for (var i = 0; i < lineCount; i++) {
        var y = 80 + i * 260 / Math.max(1, lineCount - 1);
        drawFieldSegment(105, x - 20, y, 0.92);
        drawFieldSegment(x + 20, 760, y, attenuation);
      }
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 350); ctx.stroke();
      ctx.lineWidth = 3;
      for (var j = 0; j < mesh; j++) {
        var gy = 72 + j * 266 / Math.max(1, mesh - 1);
        ctx.beginPath(); ctx.moveTo(x - 42, gy); ctx.lineTo(x + 42, gy); ctx.stroke();
      }
      ctx.font = "bold 18px system-ui";
      ctx.fillStyle = signFor("near") === "−" ? "#1d4ed8" : "#b91c1c";
      ctx.fillText(signFor("near"), x - 17, 48);
      ctx.fillStyle = signFor("far") === "−" ? "#1d4ed8" : "#b91c1c";
      ctx.fillText(signFor("far"), x + 17, 48);
      if (grounded) drawGround(x, 352);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px system-ui";
      ctx.fillText("Metallgitter", x, 395);
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath(); ctx.arc(720, 210, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px system-ui";
      ctx.fillText("Probe", 720, 244);
      if (attenuation > 0.12) drawArrow(ctx, 690, 210, 690 + (polarityEl.value === "positive" ? 42 : -42), 210, "#7c3aed");
      return attenuation;
    }

    function drawCage(strength, grounded) {
      var left = 350, top = 75, width = 360, height = 270;
      var lineCount = 4 + strength * 3;
      for (var i = 0; i < lineCount; i++) {
        var y = 90 + i * 240 / Math.max(1, lineCount - 1);
        drawFieldSegment(105, left - 14, y, 0.92);
      }
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 16;
      ctx.strokeRect(left, top, width, height);
      ctx.font = "bold 18px system-ui";
      ctx.fillStyle = signFor("near") === "−" ? "#1d4ed8" : "#b91c1c";
      for (var yq = 120; yq <= 300; yq += 45) ctx.fillText(signFor("near"), left - 20, yq);
      if (!grounded) {
        ctx.fillStyle = signFor("far") === "−" ? "#1d4ed8" : "#b91c1c";
        for (var yr = 120; yr <= 300; yr += 45) ctx.fillText(signFor("far"), left + width + 20, yr);
      }
      if (grounded) drawGround(left + width / 2, top + height + 8);
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath(); ctx.arc(left + width / 2, top + height / 2, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px system-ui";
      ctx.fillText("E innen ≈ 0", left + width / 2, top + height / 2 + 48);
      ctx.fillText("geschlossene Metallhülle", left + width / 2, 395);
      return 0;
    }

    function draw() {
      var strength = Number(strengthEl.value);
      var mesh = Number(meshEl.value);
      var grounded = groundedEl.checked;
      strengthValue.textContent = String(strength);
      meshValue.textContent = String(mesh);
      meshEl.disabled = modeEl.value === "cage";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawSourcePlate();
      var attenuation = modeEl.value === "cage" ? drawCage(strength, grounded) : drawGrid(strength, mesh, grounded);
      if (modeEl.value === "cage") {
        readout.textContent = "Geschlossene Hülle: In der ladungsfreien Höhlung gilt im elektrostatischen Gleichgewicht E ≈ 0. Eine Erdung ist dafür nicht zwingend; sie legt zusätzlich das Potenzial fest und ermöglicht Ladungsaustausch.";
      } else {
        readout.textContent = "Metallgitter: qualitative Restfeldstärke hinter dem Gitter etwa " + Math.round(attenuation * 100) + " %. Kleinere Öffnungen und Erdung verbessern die Abschirmung.";
      }
    }

    [modeEl, polarityEl].forEach(function (control) { control.addEventListener("change", draw); });
    [strengthEl, meshEl].forEach(function (control) { control.addEventListener("input", draw); });
    groundedEl.addEventListener("change", draw);
    draw();
  }

  function initCandleFlameSim(root) {
    if (!root || (root.dataset && root.dataset.candleFlameMounted === "1")) return;
    root.innerHTML = [
      '<div class="field-sim-grid">',
        '<div class="field-sim-controls">',
          '<h3>Kerzenflamme im elektrischen Feld</h3>',
          '<label>Ladung des Stabs</label>',
          '<select data-role="flame-polarity"><option value="negative">negativ</option><option value="positive">positiv</option></select>',
          '<label>Form des Leiters</label>',
          '<select data-role="flame-shape"><option value="blunt">abgerundeter Stab</option><option value="sharp">scharfe Metallspitze</option></select>',
          '<label>Feldstärke</label>',
          '<input data-role="flame-strength" type="range" min="1" max="5" value="3" step="1">',
          '<div class="field-sim-mono">Stärke = <span data-role="flame-strength-value">3</span></div>',
          '<div class="field-mini-actions"><button class="wb-btn primary" type="button" data-role="play">Start</button><button class="wb-btn" type="button" data-role="reset">Zurücksetzen</button></div>',
          '<div class="field-sim-note"><strong>Vergleiche</strong><p>Beim abgerundeten Stab steht die Kraft auf die Ladungsträger der Flamme im Vordergrund. An der Spitze kann zusätzlich ein Ionenwind entstehen, der die Flamme vom Leiter wegdrückt.</p></div>',
        '</div>',
        '<div>',
          '<canvas data-role="canvas" width="840" height="420" aria-label="Animation einer Kerzenflamme neben einem geladenen Stab oder einer geladenen Metallspitze"></canvas>',
          '<div class="field-sim-mono" data-role="readout" aria-live="polite"></div>',
        '</div>',
      '</div>'
    ].join("");

    var canvas = find(root, "canvas");
    var polarityEl = find(root, "flame-polarity");
    var shapeEl = find(root, "flame-shape");
    var strengthEl = find(root, "flame-strength");
    var strengthValue = find(root, "flame-strength-value");
    var playBtn = find(root, "play");
    var resetBtn = find(root, "reset");
    var readout = find(root, "readout");
    if (!canvas || !polarityEl || !shapeEl || !strengthEl || !playBtn || !resetBtn || !readout) return;

    root.dataset.candleFlameMounted = "1";
    var ctx = canvas.getContext("2d");
    var running = false;
    var phase = 0;
    var lastTs = null;
    var rafId = null;

    function flameBend(strength) {
      if (shapeEl.value === "sharp") return 20 + strength * 15;
      return (polarityEl.value === "negative" ? -1 : 1) * strength * 12;
    }

    function drawFlame(baseX, baseY, bend, flicker) {
      var tipX = baseX + bend + flicker;
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(baseX - 30, baseY);
      ctx.bezierCurveTo(baseX - 48, baseY - 65, tipX - 18, baseY - 135, tipX, baseY - 185);
      ctx.bezierCurveTo(tipX + 34, baseY - 120, baseX + 48, baseY - 62, baseX + 30, baseY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(baseX - 11, baseY - 4);
      ctx.quadraticCurveTo(baseX + bend * 0.25, baseY - 62, baseX + 10, baseY - 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 14px system-ui";
      for (var i = 0; i < 4; i++) ctx.fillText("+", baseX - 12 + i * 9 + bend * 0.28, baseY - 55 - i * 21);
    }

    function draw() {
      var strength = Number(strengthEl.value);
      var bend = flameBend(strength);
      var flicker = running ? Math.sin(phase * 7) * 5 : 0;
      strengthValue.textContent = String(strength);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 30; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(35, 205); ctx.lineTo(shapeEl.value === "sharp" ? 245 : 225, 205); ctx.stroke();
      var fieldLineCount = 3 + strength * 2;
      for (var fieldLine = 0; fieldLine < fieldLineCount; fieldLine++) {
        var fieldY = 112 + fieldLine * 184 / Math.max(1, fieldLineCount - 1);
        if (polarityEl.value === "positive") drawArrow(ctx, tip + 18, fieldY, 590, fieldY, "rgba(14,116,144,.48)");
        else drawArrow(ctx, 590, fieldY, tip + 18, fieldY, "rgba(14,116,144,.48)");
      }
      if (shapeEl.value === "sharp") {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(225, 190); ctx.lineTo(270, 205); ctx.lineTo(225, 220); ctx.stroke();
      }
      ctx.fillStyle = polarityEl.value === "positive" ? "#b91c1c" : "#1d4ed8";
      ctx.font = "bold 30px system-ui";
      ctx.fillText(polarityEl.value === "positive" ? "+" : "−", 120, 165);
      var tip = shapeEl.value === "sharp" ? 270 : 240;
      var ionColor = polarityEl.value === "positive" ? "#ef4444" : "#3b82f6";
      if (shapeEl.value === "sharp") {
        for (var i = 0; i < 8; i++) {
          var progress = ((phase * 0.55 + i / 8) % 1);
          var x = tip + progress * 390;
          var y = 205 + Math.sin(i * 2.1 + phase * 2) * (18 + progress * 28);
          ctx.fillStyle = ionColor; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "bold 10px system-ui"; ctx.fillText(polarityEl.value === "positive" ? "+" : "−", x - 3, y + 3);
        }
        drawArrow(ctx, 300, 285, 575, 285, "#0e7490");
        ctx.fillStyle = "#0f172a"; ctx.font = "bold 14px system-ui"; ctx.fillText("Ionenwind", 430, 310);
      }
      ctx.fillStyle = "#d97706"; ctx.fillRect(630, 315, 70, 80);
      ctx.fillStyle = "#1f2937"; ctx.fillRect(662, 300, 6, 24);
      drawFlame(665, 315, bend, flicker);
      ctx.fillStyle = "#0f172a"; ctx.font = "bold 15px system-ui";
      ctx.fillText(shapeEl.value === "sharp" ? "Spitzenentladung" : "Kraft auf Ionen", 150, 375);
      if (shapeEl.value === "sharp") {
        readout.textContent = "Scharfe Spitze: Das starke Feld ionisiert Luft. Der Ionenwind drückt die Flamme nach rechts, unabhängig davon, ob die Spitze positiv oder negativ geladen ist.";
      } else if (polarityEl.value === "negative") {
        readout.textContent = "Negativer Stab: Die in der Flamme häufig dominierenden positiven Ionen werden zum Stab gezogen. Die Flamme neigt sich zum Stab.";
      } else {
        readout.textContent = "Positiver Stab: Positive Ionen der Flamme werden abgestoßen. Die Flamme neigt sich vom Stab weg.";
      }
    }

    function frame(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      phase += Math.min(0.04, (ts - lastTs) / 1000) * Number(strengthEl.value);
      lastTs = ts;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function toggle() {
      running = !running;
      playBtn.textContent = running ? "Stopp" : "Start";
      lastTs = null;
      if (running) rafId = window.requestAnimationFrame(frame);
      else if (rafId) window.cancelAnimationFrame(rafId);
      draw();
    }

    function reset() {
      running = false; phase = 0; lastTs = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      polarityEl.value = "negative"; shapeEl.value = "blunt"; strengthEl.value = "3"; playBtn.textContent = "Start"; draw();
    }

    [polarityEl, shapeEl].forEach(function (control) { control.addEventListener("change", draw); });
    strengthEl.addEventListener("input", draw);
    playBtn.addEventListener("click", toggle);
    resetBtn.addEventListener("click", reset);
    draw();
  }

  function initElectrostaticPropellerSim(root) {
    if (!root || (root.dataset && root.dataset.electrostaticPropellerMounted === "1")) return;
    root.innerHTML = [
      '<div class="field-sim-grid">',
        '<div class="field-sim-controls">',
          '<h3>Elektrostatischer Propeller</h3>',
          '<label>Ladung des Propellers</label>',
          '<select data-role="propeller-polarity"><option value="positive">positiv</option><option value="negative">negativ</option></select>',
          '<label>Enden der Rotorblätter</label>',
          '<select data-role="propeller-tips"><option value="sharp">geschwungen, mit feiner Spitze</option><option value="round">geschwungen, vollständig abgerundet</option></select>',
          '<label>Feldstärke an den Spitzen</label>',
          '<input data-role="propeller-strength" type="range" min="1" max="5" value="3" step="1">',
          '<div class="field-sim-mono">Stärke = <span data-role="propeller-strength-value">3</span></div>',
          '<div class="field-mini-actions"><button class="wb-btn primary" type="button" data-role="play">Start</button><button class="wb-btn" type="button" data-role="reset">Zurücksetzen</button></div>',
          '<div class="field-sim-note"><strong>Prüfe die Richtung</strong><p>Drei geschwungene Rotorblätter enden jeweils in einer kurzen Entladungsspitze. Die Ionen verlassen die Spitzen tangential. Die Reaktionskraft zeigt entgegengesetzt und dreht den Propeller.</p></div>',
        '</div>',
        '<div>',
          '<canvas data-role="canvas" width="840" height="420" aria-label="Animation eines elektrostatischen Propellers mit Ionenwind"></canvas>',
          '<div class="field-sim-mono" data-role="readout" aria-live="polite"></div>',
        '</div>',
      '</div>'
    ].join("");

    var canvas = find(root, "canvas");
    var polarityEl = find(root, "propeller-polarity");
    var tipsEl = find(root, "propeller-tips");
    var strengthEl = find(root, "propeller-strength");
    var strengthValue = find(root, "propeller-strength-value");
    var playBtn = find(root, "play");
    var resetBtn = find(root, "reset");
    var readout = find(root, "readout");
    if (!canvas || !polarityEl || !tipsEl || !strengthEl || !playBtn || !resetBtn || !readout) return;

    root.dataset.electrostaticPropellerMounted = "1";
    var ctx = canvas.getContext("2d");
    var running = false;
    var angle = 0;
    var ionPhase = 0;
    var lastTs = null;
    var rafId = null;

    function draw() {
      var sharp = tipsEl.value === "sharp";
      var strength = Number(strengthEl.value);
      var cx = 430, cy = 210;
      strengthValue.textContent = String(strength);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, 385); ctx.stroke();
      var ionColor = polarityEl.value === "positive" ? "#ef4444" : "#3b82f6";
      for (var arm = 0; arm < 3; arm++) {
        var theta = angle + arm * Math.PI * 2 / 3;
        var ux = Math.cos(theta), uy = Math.sin(theta);
        var tx = -uy, ty = ux;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(theta);
        ctx.fillStyle = "#0f766e";
        ctx.strokeStyle = "#134e4a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(14, -13);
        ctx.bezierCurveTo(54, -30, 108, -30, 142, 14);
        ctx.bezierCurveTo(114, 13, 62, 30, 14, 13);
        ctx.quadraticCurveTo(5, 0, 14, -13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        var tipX = cx + ux * 142 + tx * 14;
        var tipY = cy + uy * 142 + ty * 14;
        if (sharp) {
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + tx * 20, tipY + ty * 20);
          ctx.stroke();
          tipX += tx * 20;
          tipY += ty * 20;
        }
        ctx.fillStyle = ionColor; ctx.font = "bold 17px system-ui";
        ctx.fillText(polarityEl.value === "positive" ? "+" : "−", cx + ux * 96 + tx * 8 - 5, cy + uy * 96 + ty * 8 + 5);
        if (sharp) {
          var particleCount = 2 + strength;
          for (var p = 0; p < particleCount; p++) {
            var distance = 18 + ((ionPhase * 70 + p * (115 / particleCount)) % 115);
            var px = tipX + tx * distance, py = tipY + ty * distance;
            ctx.fillStyle = ionColor; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
          }
          drawArrow(ctx, tipX + tx * 10, tipY + ty * 10, tipX + tx * 76, tipY + ty * 76, "#0e7490");
        }
      }
      ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0f172a"; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
      ctx.fillText(sharp ? "Ionenstrom: gegen den Uhrzeigersinn" : "Kaum Spitzenentladung", cx, 35);
      ctx.fillText(sharp ? "Reaktion und Drehung: im Uhrzeigersinn" : "Kein nennenswertes Drehmoment", cx, 58);
      ctx.textAlign = "start";
      readout.textContent = sharp
        ? "Scharfe Enden: relative Drehzahl " + strength + ". Ein Wechsel des Ladungsvorzeichens ändert die Ionenart, aber nicht die durch die Form festgelegte Drehrichtung."
        : "Abgerundete Enden: Die Feldstärke bleibt kleiner, die Luft wird kaum ionisiert und der Propeller dreht sich im Modell nicht.";
    }

    function frame(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(0.04, (ts - lastTs) / 1000);
      lastTs = ts;
      var strength = Number(strengthEl.value);
      if (tipsEl.value === "sharp") angle -= dt * strength * 0.75;
      ionPhase += dt * strength;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function toggle() {
      running = !running;
      playBtn.textContent = running ? "Stopp" : "Start";
      lastTs = null;
      if (running) rafId = window.requestAnimationFrame(frame);
      else if (rafId) window.cancelAnimationFrame(rafId);
      draw();
    }

    function reset() {
      running = false; angle = 0; ionPhase = 0; lastTs = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      polarityEl.value = "positive"; tipsEl.value = "sharp"; strengthEl.value = "3"; playBtn.textContent = "Start"; draw();
    }

    [polarityEl, tipsEl].forEach(function (control) { control.addEventListener("change", draw); });
    strengthEl.addEventListener("input", draw);
    playBtn.addEventListener("click", toggle);
    resetBtn.addEventListener("click", reset);
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

  register("electrostatic-field", initElectrostaticFieldLab);
  register("capacitor", initCapacitorSim);
  register("particle-trajectory", initParticleTrajectorySim);
  register("magnetic-trajectory", initMagneticTrajectorySim);
  register("helix-trajectory", initHelixTrajectorySim);
  register("induction-lab", initInductionLab);
  register("electrostatic-shielding", initElectrostaticShieldingSim);
  register("candle-flame", initCandleFlameSim);
  register("electrostatic-propeller", initElectrostaticPropellerSim);
  window.FieldSim = { mountAll: mountAll, mount: mount };
})(window, document);
