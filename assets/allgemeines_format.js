/* SB_library_v2.js
   SBBook (Topbar + Sidebar + Paging) + SBBlocks (MCQ/Cloze/Essay)
   autoNav: Navigation automatisch aus Überschriften + Block-Titeln

   Einbindung:
     <link rel="stylesheet" href="wellen_library_v2.css">
     <script src="wellen_library_v2.js"></script>

   Init:
     SBBook.autoMount();
     SBBlocks.autoMount();
*/
(function(global){
  "use strict";
  const qs  = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Tags, die wir als SVG behandeln (erweiterbar)
  const svgTags = new Set([
    "svg","g","path","circle","rect","line","polyline","polygon","ellipse",
    "defs","use","symbol","clipPath","mask",
    "linearGradient","radialGradient","stop",
    "pattern","text","tspan"
  ]);

  const isSvg = svgTags.has(String(tag).toLowerCase());
  const node = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;

    if (k === "class") {
      // class ist auch bei SVG ok
      node.setAttribute("class", v);
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (k === "html") {
      // innerHTML in SVG ist in modernen Browsern ok (wird dann im SVG-NS geparst)
      node.innerHTML = v;
    } else {
      // SVG-Attribute wie viewBox müssen genau so gesetzt werden
      node.setAttribute(k, String(v));
    }
  }

  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}



  function el_(tag, attrs={}, children=[]){
    const node = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k === "class") node.className = v;
      else if(k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if(k === "html") node.innerHTML = v;
      else node.setAttribute(k, String(v));
    }
    for(const c of children){
      if(c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function assetBasePath(){
    const scriptEl = document.querySelector('script[src*="allgemeines_format.js"]');
    if(scriptEl && scriptEl.src){
      return scriptEl.src.replace(/allgemeines_format\.js(\?.*)?$/, "");
    }
    return "../assets/";
  }

  function buildTaskIcon(type){
    const typeMap = {
      "mcq": "mcq.png",
      "reveal": "reveal.png",
      "reveal-img": "reveal.png",
      "cloze": "cloze.png",
      "essay": "essay.png",
      "p2": "p2.png",
      "order": "order.png"
    };
    const key = String(type || "").toLowerCase();
    const imgName = typeMap[key];
    if(!imgName) return null;
    return el_("div", {class:"wb-img wb-task-icon", "data-wb-task-icon": key}, [
      el_("img", {src: assetBasePath() + imgName, alt: `Aufgabentyp: ${key.toUpperCase()}`})
    ]);
  }

  function ensureTaskIcon(mountEl, type){
    if(!mountEl) return;
    const iconEl = buildTaskIcon(type);
    if(!iconEl) return;

    let prev = mountEl.previousElementSibling;
    while(prev && prev.classList && prev.classList.contains("wb-task-icon")){
      const toRemove = prev;
      prev = prev.previousElementSibling;
      toRemove.remove();
    }

    const head = mountEl.querySelector && mountEl.querySelector(".wb-head");
    if(head){
      const existing = head.querySelector(".wb-task-icon");
      if(!existing) head.appendChild(iconEl);
      return;
    }

    mountEl.parentNode.insertBefore(iconEl, mountEl);
  }
  function readJsonScript(mountEl, selector){
    const cfgScript = qs(selector, mountEl);
    if(!cfgScript) throw new Error(`Missing JSON script: ${selector}`);
    return JSON.parse(cfgScript.textContent);
  }
  function slugify(s){
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^À-ɏḀ-ỿA-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item";
  }
  function ensureId(node, suggested){
    if(node.id && node.id.trim()) return node.id;
    let base = suggested ? slugify(suggested) : "wb";
    let id = base;
    let k = 2;
    while(document.getElementById(id)) id = `${base}-${k++}`;
    node.id = id;
    return id;
  }

  function wrapBlock(type, cfg, bodyEl){
    const title = cfg.title || ({mcq:"Multiple Choice", cloze:"Lückentext (Drag the Words)", order:"Reihenfolge", essay:"Essay / Freitext", reveal:"Frage & Antwort", "reveal-img":"Bild anzeigen"}[type] || "Baustein");
    const hint = cfg.hint || "";
    const head = el("div", {class:"wb-head"}, [
      el("div", {}, [
        el("div", {class:"wb-title"}, [title]),
        hint ? el("div", {class:"wb-hint"}, [hint]) : null
      ])
    ]);
    return el("div", {class:"wb-block", "data-wb-rendered":"1", "data-wb-type":type}, [
      head,
      el("div", {class:"wb-body"}, [bodyEl])
    ]);
  }

  // ---------- Blocks ----------
  function createMCQ(cfg){
    if(!Array.isArray(cfg.questions)) throw new Error("MCQ: cfg.questions must be an array");
    const container = el("div", {});
    const scoreEl = el("div", {class:"wb-score", "aria-live":"polite"});
    const qEls = [];
    const storageKey = (cfg.storagePrefix || "wb_") + "mcq_" + (cfg.__wbKey || cfg.id || "mcq");

    function shuffle(arr){
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    cfg.questions.forEach((q, qi) => {
      const qEl = el("div", {class:"wb-q", "data-qi": String(qi)});
      qEl.appendChild(el("h3", {}, [`${qi+1}. ${q.text || ""}`]));
      const type = q.multiple ? "checkbox" : "radio";
      const name = `wbq_${cfg.id || "mcq"}_${qi}`;
      const choices = (q.choices || []).slice();
      if(cfg.shuffleChoices !== false) shuffle(choices);
      choices.forEach(choice => {
        const inp = el("input", {type, name, value: choice.id || ""});
        const label = el("label", {class:"wb-choice"}, [inp, el("span", {}, [choice.label || ""])]);
        qEl.appendChild(label);
      });
      const fb = el("div", {class:"wb-feedback", "data-feedback":"1"});
      qEl.appendChild(fb);
      container.appendChild(qEl);
      qEls.push(qEl);
    });

    function save(){
      try{
        const data = {};
        qEls.forEach(qEl => {
          const qi = Number(qEl.getAttribute("data-qi"));
          data[qi] = qsa("input", qEl).filter(i => i.checked).map(i => i.value);
        });
        localStorage.setItem(storageKey, JSON.stringify(data));
      }catch(_e){}
    }

    function loadSaved(){
      try{
        const raw = localStorage.getItem(storageKey);
        if(!raw) return;
        const data = JSON.parse(raw);
        qEls.forEach(qEl => {
          const qi = Number(qEl.getAttribute("data-qi"));
          const selected = data[qi] || [];
          qsa("input", qEl).forEach(i => i.checked = selected.includes(i.value));
        });
      }catch(_e){}
    }

    qEls.forEach(qEl => {
      qsa("input", qEl).forEach(i => i.addEventListener("change", () => {
        save();
        updateCheckState();
      }));
    });

    function check(){
      let correctCount = 0;
      qEls.forEach(qEl => {
        qEl.classList.remove("correct","wrong");
        const qi = Number(qEl.getAttribute("data-qi"));
        const q = cfg.questions[qi];
        const selected = qsa("input", qEl).filter(i => i.checked).map(i => i.value).sort();
        const expected = (q.correct || []).slice().sort();
        const ok = selected.length === expected.length && selected.every((v,i) => v === expected[i]);
        qEl.classList.add(ok ? "correct" : "wrong");
        const fb = qs("[data-feedback]", qEl);
        fb.textContent = q.explain || (ok ? "Richtig." : "Nicht ganz.");
        if(ok) correctCount += 1;
      });
      scoreEl.textContent = `Punkte: ${correctCount}/${qEls.length}`;
      return {correct: correctCount, total: qEls.length};
    }
    function reset(){
      qEls.forEach(qEl => {
        qsa("input", qEl).forEach(i => i.checked = false);
        qEl.classList.remove("correct","wrong");
        const fb = qs("[data-feedback]", qEl);
        if(fb) fb.textContent = "";
      });
      scoreEl.textContent = "";
      try{ localStorage.removeItem(storageKey); }catch(_e){}
      updateCheckState();
    }
    const requireComplete = cfg.requireComplete !== false;
    const btnCheck = el("button", {class:"wb-btn primary", type:"button", onclick: check}, ["Überprüfen"]);
    function updateCheckState(){
      if(!requireComplete) return;
      const allAnswered = qEls.every(qEl => {
        const inputs = qsa("input", qEl);
        if(inputs.length === 0) return true;
        return inputs.some(i => i.checked);
      });
      btnCheck.disabled = !allAnswered;
    }
    const controls = el("div", {class:"wb-row"}, [
      btnCheck,
      el("button", {class:"wb-btn", type:"button", onclick: reset}, ["Zurücksetzen"]),
      scoreEl
    ]);
    loadSaved();
    updateCheckState();
    return { node: wrapBlock("mcq", cfg, el("div", {}, [container, controls])), check, reset };
  }

  function createCloze(cfg){
    if(!Array.isArray(cfg.bank)) throw new Error("Cloze: cfg.bank must be an array");
    if(!Array.isArray(cfg.segments)) throw new Error("Cloze: cfg.segments must be an array");
    const bank = el("div", {class:"wb-bank", "data-bank":"1"});
    const scoreEl = el("div", {class:"wb-score", "aria-live":"polite"});
    const gaps = [];
    const storageKey = (cfg.storagePrefix || "wb_") + "cloze_" + (cfg.__wbKey || cfg.id || "cloze");

        // --- shuffle (einmal beim Start) ---
    function shuffle(arr){
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function clearGap(g){
      g.classList.remove("filled","ok","bad");
      g.innerHTML = "&nbsp;";
    }

    function attachChip(chip){
      chip.addEventListener("dragstart", (e) => {
        global.__wbDragChip = chip;
        // stabiler in Browsern:
        if(e.dataTransfer){
          e.dataTransfer.setData("text/plain", chip.getAttribute("data-token") || "");
          e.dataTransfer.effectAllowed = "move";
        }
      });
      chip.addEventListener("dragend", () => { global.__wbDragChip = null; });

      // Klick = zurück in Wortbank
      chip.addEventListener("click", () => {
        const fromGap = chip.parentElement && chip.parentElement.closest(".wb-gap");
        bank.appendChild(chip);
        if(fromGap && !qs(".wb-chip", fromGap)) clearGap(fromGap);
        save();
        updateCheckState();
      });
    }

    function makeChip(token){
      const chip = el("div", {class:"wb-chip", draggable:"true", "data-token": token}, [token]);
      attachChip(chip);
      return chip;
    }

    // Bank zufällig befüllen
    shuffle(cfg.bank.map(t => String(t))).forEach(t => bank.appendChild(makeChip(t)));

    // --- Drop auf GAP ---
    function allowDropGap(gap){
      gap.addEventListener("dragover", (e) => e.preventDefault());
      gap.addEventListener("drop", (e) => {
        e.preventDefault();
        const chip = global.__wbDragChip;
        if(!chip) return;

        const fromGap = chip.parentElement && chip.parentElement.closest(".wb-gap");
        if(fromGap && fromGap !== gap && !qs(".wb-chip", fromGap)) clearGap(fromGap);

        const existing = qs(".wb-chip", gap);
        if(existing && existing !== chip) bank.appendChild(existing);

        gap.innerHTML = "";
        gap.appendChild(chip);
        gap.classList.add("filled");
        gap.classList.remove("ok","bad");
        save();
        updateCheckState();
      });
    }

    // --- Drop auf BANK (WICHTIG: NICHT innerHTML leeren!) ---
    bank.addEventListener("dragover", (e) => e.preventDefault());
    bank.addEventListener("drop", (e) => {
      e.preventDefault();
      const chip = global.__wbDragChip;
      if(!chip) return;

      const fromGap = chip.parentElement && chip.parentElement.closest(".wb-gap");
      bank.appendChild(chip);
      if(fromGap && !qs(".wb-chip", fromGap)) clearGap(fromGap);
      save();
      updateCheckState();
    });


    const text = el("div", {class:"wb-text"});
    cfg.segments.forEach(s => {
      if(s.t === "text") text.appendChild(document.createTextNode(String(s.v || "")));
      if(s.t === "gap"){
        const g = el("span", {class:"wb-gap", "data-answer": String(s.a || "")}, []);
        g.innerHTML = "&nbsp;";
        allowDropGap(g);
        gaps.push(g);
        text.appendChild(g);
      }
    });
    

    function save(){
      try{
        const data = gaps.map(g => {
          const chip = qs(".wb-chip", g);
          return chip ? (chip.getAttribute("data-token") || "") : "";
        });
        localStorage.setItem(storageKey, JSON.stringify(data));
      }catch(_e){}
    }

    function loadSaved(){
      try{
        const raw = localStorage.getItem(storageKey);
        if(!raw) return;
        const data = JSON.parse(raw);
        if(!Array.isArray(data)) return;
        const chipMap = {};
        qsa(".wb-chip", bank).forEach(chip => {
          const token = chip.getAttribute("data-token") || "";
          if(!chipMap[token]) chipMap[token] = [];
          chipMap[token].push(chip);
        });
        gaps.forEach((g, idx) => {
          const token = data[idx] || "";
          const pool = chipMap[token];
          if(!token || !pool || pool.length === 0) return;
          const chip = pool.shift();
          g.innerHTML = "";
          g.appendChild(chip);
          g.classList.add("filled");
          g.classList.remove("ok","bad");
        });
      }catch(_e){}
    }

    function check(){
      let okCount = 0;
      gaps.forEach(g => {
        g.classList.remove("ok","bad");
        const expected = (g.getAttribute("data-answer") || "").trim();
        const chip = qs(".wb-chip", g);
        const got = chip ? (chip.getAttribute("data-token") || "").trim() : "";
        const ok = got !== "" && got === expected;
        g.classList.add(ok ? "ok" : "bad");
        if(ok) okCount += 1;
      });
      scoreEl.textContent = `Punkte: ${okCount}/${gaps.length}`;
      return {correct: okCount, total: gaps.length};
    }
    function reset(){
      gaps.forEach(g => {
        const chip = qs(".wb-chip", g);
        if(chip) bank.appendChild(chip);
        g.classList.remove("filled","ok","bad");
        g.innerHTML = "&nbsp;";
      });
      scoreEl.textContent = "";
      try{ localStorage.removeItem(storageKey); }catch(_e){}
      updateCheckState();
    }
    const hint = el("div", {class:"wb-drop-hint"}, [cfg.dropHint || "Hinweis: Ziehe Wörter in die Lücken. Klick = zurück in Wortbank."]);
    const requireComplete = cfg.requireComplete !== false;
    const btnCheck = el("button", {class:"wb-btn primary", type:"button", onclick: check}, ["Überprüfen"]);
    function updateCheckState(){
      if(!requireComplete) return;
      const allFilled = gaps.every(g => !!qs(".wb-chip", g));
      btnCheck.disabled = !allFilled;
    }
    const controls = el("div", {class:"wb-row"}, [
      btnCheck,
      el("button", {class:"wb-btn", type:"button", onclick: reset}, ["Zurücksetzen"]),
      scoreEl
    ]);
    loadSaved();
    updateCheckState();
    return { node: wrapBlock("cloze", cfg, el("div", {}, [bank, text, hint, controls])), check, reset };
  }

  function createOrder(cfg){
    if(!Array.isArray(cfg.items)) throw new Error("Order: cfg.items must be an array");
    const rawItems = cfg.items.map((it, idx) => {
      if(it && typeof it === "object"){
        const label = String(it.label || it.text || it.id || "");
        const id = String(it.id || label || `item_${idx}`);
        return { id, label };
      }
      const label = String(it);
      return { id: label || `item_${idx}`, label };
    });

    const seen = new Set();
    const items = rawItems.map((it, idx) => {
      let id = it.id;
      if(seen.has(id)) id = `${id}__${idx}`;
      seen.add(id);
      return { id, label: it.label };
    });

    const scoreEl = el("div", {class:"wb-score", "aria-live":"polite"});
    const bank = el("div", {class:"wb-order-bank", "data-order-bank":"1"});
    const slotsWrap = el("div", {class:"wb-order-slots"});
    const storageKey = (cfg.storagePrefix || "wb_") + "order_" + (cfg.__wbKey || cfg.id || "order");

    function shuffle(arr){
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function makeChip(item){
      const chip = el("div", {class:"wb-order-chip", draggable:"true", "data-id": item.id}, [item.label]);
      chip.addEventListener("dragstart", (e) => {
        global.__wbOrderDrag = chip;
        if(e.dataTransfer){
          e.dataTransfer.setData("text/plain", item.id);
          e.dataTransfer.effectAllowed = "move";
        }
      });
      chip.addEventListener("dragend", () => { global.__wbOrderDrag = null; });
      chip.addEventListener("click", () => {
        const slot = chip.parentElement && chip.parentElement.closest(".wb-order-drop");
        if(slot) bank.appendChild(chip);
        updateCheckState();
        save();
      });
      return chip;
    }

    const chips = items.map(makeChip);
    const order = (cfg.shuffle === false) ? chips : shuffle(chips.slice());
    order.forEach(ch => bank.appendChild(ch));

    function allowDropSlot(dropEl){
      dropEl.addEventListener("dragover", (e) => e.preventDefault());
      dropEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const chip = global.__wbOrderDrag;
        if(!chip) return;
        const existing = dropEl.querySelector(".wb-order-chip");
        if(existing && existing !== chip) bank.appendChild(existing);
        dropEl.appendChild(chip);
        updateCheckState();
        save();
      });
    }

    bank.addEventListener("dragover", (e) => e.preventDefault());
    bank.addEventListener("drop", (e) => {
      e.preventDefault();
      const chip = global.__wbOrderDrag;
      if(!chip) return;
      bank.appendChild(chip);
      updateCheckState();
      save();
    });

    items.forEach((it, idx) => {
      const drop = el("div", {
        class:"wb-order-drop",
        "data-expected-id": it.id,
        "data-expected-label": it.label
      });
      allowDropSlot(drop);
      const slot = el("div", {class:"wb-order-slot"}, [
        el("div", {class:"wb-order-num"}, [`${idx + 1}.`]),
        drop
      ]);
      slotsWrap.appendChild(slot);
    });

    function save(){
      try{
        const data = Array.from(slotsWrap.querySelectorAll(".wb-order-drop")).map(d => {
          const chip = d.querySelector(".wb-order-chip");
          return chip ? (chip.getAttribute("data-id") || "") : "";
        });
        localStorage.setItem(storageKey, JSON.stringify(data));
      }catch(_e){}
    }

    function loadSaved(){
      try{
        const raw = localStorage.getItem(storageKey);
        if(!raw) return;
        const data = JSON.parse(raw);
        if(!Array.isArray(data)) return;
        const chipMap = {};
        chips.forEach(ch => {
          const id = ch.getAttribute("data-id") || "";
          if(!chipMap[id]) chipMap[id] = [];
          chipMap[id].push(ch);
        });
        Array.from(slotsWrap.querySelectorAll(".wb-order-drop")).forEach((drop, i) => {
          const id = data[i] || "";
          const pool = chipMap[id];
          if(!id || !pool || pool.length === 0) return;
          drop.appendChild(pool.shift());
        });
      }catch(_e){}
    }

    function check(){
      let okCount = 0;
      const drops = Array.from(slotsWrap.querySelectorAll(".wb-order-drop"));
      drops.forEach(drop => {
        const expected = drop.getAttribute("data-expected-id") || "";
        const chip = drop.querySelector(".wb-order-chip");
        const got = chip ? (chip.getAttribute("data-id") || "") : "";
        const slot = drop.closest(".wb-order-slot");
        if(slot) slot.classList.remove("ok","bad");
        const ok = got !== "" && got === expected;
        if(slot) slot.classList.add(ok ? "ok" : "bad");
        if(ok) okCount += 1;
      });
      scoreEl.textContent = `Punkte: ${okCount}/${items.length}`;
      return {correct: okCount, total: items.length};
    }

    function reset(){
      Array.from(slotsWrap.querySelectorAll(".wb-order-slot")).forEach(s => s.classList.remove("ok","bad"));
      chips.forEach(ch => bank.appendChild(ch));
      if(cfg.shuffle !== false) shuffle(chips).forEach(ch => bank.appendChild(ch));
      scoreEl.textContent = "";
      try{ localStorage.removeItem(storageKey); }catch(_e){}
      updateCheckState();
    }

    const requireComplete = cfg.requireComplete !== false;
    const btnCheck = el("button", {class:"wb-btn primary", type:"button", onclick: check}, ["Überprüfen"]);
    function updateCheckState(){
      if(!requireComplete) return;
      const allFilled = Array.from(slotsWrap.querySelectorAll(".wb-order-drop")).every(d => !!d.querySelector(".wb-order-chip"));
      btnCheck.disabled = !allFilled;
    }

    const controls = el("div", {class:"wb-row"}, [
      btnCheck,
      el("button", {class:"wb-btn", type:"button", onclick: reset}, ["Zurücksetzen"]),
      scoreEl
    ]);

    loadSaved();
    updateCheckState();
    return { node: wrapBlock("order", cfg, el("div", {}, [bank, slotsWrap, controls])), check, reset };
  }

  function createEssay(cfg){
    const storagePrefix = (cfg.storagePrefix != null ? String(cfg.storagePrefix) : "wb_");
    const id = String(cfg.id || "essay");
    const fields = Array.isArray(cfg.fields) ? cfg.fields : [
      {label:"Name", key:"name", kind:"text", placeholder:"Vorname Nachname"},
      {label:"Antwort", key:"text", kind:"textarea", placeholder:"Schreibe hier..."}
    ];
    const status = el("div", {class:"wb-score", "aria-live":"polite"});
    const inputs = fields.map(f => {
      const label = el("label", {class:"wb-label"}, [String(f.label || f.key || "")]);
      const input = (f.kind === "textarea")
        ? el("textarea", {class:"wb-textarea", placeholder: String(f.placeholder || ""), "data-wb-key": String(f.key || "")})
        : el("input", {class:"wb-input", type:"text", placeholder: String(f.placeholder || ""), "data-wb-key": String(f.key || "")});
      return {label, input, key: String(f.key || "")};
    });

    const body = el("div", {});
    inputs.forEach((fi, i) => {
      body.appendChild(fi.label);
      body.appendChild(fi.input);
      if(i < inputs.length-1) body.appendChild(el("div", {class:"wb-spacer"}));
    });

    const storageKey = (k) => `${storagePrefix}${id}__${k}`;
    const load = () => inputs.forEach(fi => {
      const v = localStorage.getItem(storageKey(fi.key));
      if(v != null) fi.input.value = v;
    });
    const save = () => {
      inputs.forEach(fi => localStorage.setItem(storageKey(fi.key), fi.input.value || ""));
      status.textContent = "Gespeichert.";
      clearTimeout(global.__wbSaveTimer);
      global.__wbSaveTimer = setTimeout(() => status.textContent = "", 900);
    };
    inputs.forEach(fi => fi.input.addEventListener("input", save));
    load();

    function exportTxt(){
      const lines = [];
      inputs.forEach(fi => {
        const label = fi.label.textContent || fi.key;
        lines.push(`## ${label}
${fi.input.value || ""}
`);
      });
      const text = lines.join("\n");

      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(() => {
          status.textContent = "In Zwischenablage kopiert.";
          setTimeout(() => status.textContent = "", 1200);
        }).catch(() => {
          status.textContent = "Kopieren fehlgeschlagen.";
          setTimeout(() => status.textContent = "", 1200);
        });
        return;
      }

      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try{
        const ok = document.execCommand("copy");
        status.textContent = ok ? "In Zwischenablage kopiert." : "Kopieren fehlgeschlagen.";
      }catch(_e){
        status.textContent = "Kopieren fehlgeschlagen.";
      }
      setTimeout(() => status.textContent = "", 1200);
      ta.remove();
    }
    function clearSaved(){
      inputs.forEach(fi => { localStorage.removeItem(storageKey(fi.key)); fi.input.value = ""; });
      status.textContent = "Gespeichertes gelöscht.";
      setTimeout(() => status.textContent = "", 1200);
    }
    const controls = el("div", {class:"wb-row"}, [
      el("button", {class:"wb-btn", type:"button", onclick: exportTxt}, ["In Zwischenablage kopieren"]),
      el("button", {class:"wb-btn", type:"button", onclick: clearSaved}, ["Gespeichertes löschen"]),
      status
    ]);
    return { node: wrapBlock("essay", cfg, el("div", {}, [body, controls])), exportTxt, clearSaved };
  }


  function normalizeLines(value){
    if(Array.isArray(value)) return value.join("\n");
    if(value == null) return "";
    return String(value);
  }

  function createReveal(cfg){
    const question = String(cfg.question || "");
    const answer = normalizeLines(cfg.answer || "");
    const answerHtml = cfg.answerHtml != null ? normalizeLines(cfg.answerHtml) : "";
    const btnShow = String(cfg.buttonLabel || "Antwort anzeigen");
    const btnHide = String(cfg.buttonHideLabel || "Antwort verbergen");
    const storageKey = (cfg.storagePrefix || "wb_") + "reveal_" + (cfg.__wbKey || cfg.id || "reveal");

    const qEl = el("div", {class:"wb-reveal-q"}, [question]);
    const aEl = el("div", {class:"wb-reveal-a", "data-wb-reveal":"1"}, []);
    if(answerHtml){
      aEl.innerHTML = answerHtml;
    }else{
      aEl.textContent = answer;
      if(answer.indexOf("\n") !== -1) aEl.style.whiteSpace = "pre-line";
    }
    aEl.style.display = "none";

    const btn = el("button", {class:"wb-btn primary wb-reveal-btn", type:"button"}, [btnShow]);
    function setOpen(isOpen){
      aEl.style.display = isOpen ? "" : "none";
      btn.textContent = isOpen ? btnHide : btnShow;
      try{ localStorage.setItem(storageKey, isOpen ? "1" : "0"); }catch(_e){}
    }
    btn.addEventListener("click", () => {
      const isHidden = aEl.style.display === "none";
      setOpen(isHidden);
    });
    try{
      if(localStorage.getItem(storageKey) === "1") setOpen(true);
    }catch(_e){}

    return { node: wrapBlock("reveal", cfg, el("div", {class:"wb-reveal"}, [qEl, btn, aEl])) };
  }

  function createRevealImage(cfg){
    const question = String(cfg.question || "");
    const src = String(cfg.src || cfg.image || "");
    const alt = String(cfg.alt || "");
    const btnShow = String(cfg.buttonLabel || "Bild anzeigen");
    const btnHide = String(cfg.buttonHideLabel || "Bild verbergen");
    const storageKey = (cfg.storagePrefix || "wb_") + "revealimg_" + (cfg.__wbKey || cfg.id || "revealimg");

    const qEl = el("div", {class:"wb-reveal-q"}, [question]);
    const imgEl = el("img", {src, alt, class:"wb-reveal-img"}, []);
    const aEl = el("div", {class:"wb-reveal-a", "data-wb-reveal":"1"}, [imgEl]);
    aEl.style.display = "none";

    const btn = el("button", {class:"wb-btn primary wb-reveal-btn", type:"button"}, [btnShow]);
    function setOpen(isOpen){
      aEl.style.display = isOpen ? "" : "none";
      btn.textContent = isOpen ? btnHide : btnShow;
      try{ localStorage.setItem(storageKey, isOpen ? "1" : "0"); }catch(_e){}
    }
    btn.addEventListener("click", () => {
      const isHidden = aEl.style.display === "none";
      setOpen(isHidden);
    });
    try{
      if(localStorage.getItem(storageKey) === "1") setOpen(true);
    }catch(_e){}

    return { node: wrapBlock("reveal-img", cfg, el("div", {class:"wb-reveal"}, [qEl, btn, aEl])) };
  }

  function mountBlockOne(mountEl, opts={}, idx=0){
  const type = (mountEl.getAttribute("data-wb-type") || "").trim();

  const cfgScript = qs("script.wb-config[type='application/json']", mountEl);
  if(!cfgScript){
    console.warn(`[SBBlocks] Skip: Missing wb-config JSON for data-wb-type="${type}"`, mountEl);
    // Wichtig: NICHT throwen, sonst bricht alles ab
    return null;
  }

  let cfg;
  try{
    cfg = JSON.parse(cfgScript.textContent);
  }catch(err){
    console.warn("[SBBlocks] Skip: Invalid JSON in wb-config", err, mountEl);
    return null;
  }

  mountEl.__wbConfig = cfg;
  mountEl.__wbType = type;

  if(opts.storagePrefix && cfg.storagePrefix == null) cfg.storagePrefix = opts.storagePrefix;
  if(!cfg.__wbKey){
    const elKey = mountEl.getAttribute("data-wb-id");
    cfg.__wbKey = elKey || cfg.id || `${type}_${idx}`;
  }

  let inst;
  if(type === "mcq") inst = createMCQ(cfg);
  else if(type === "cloze") inst = createCloze(cfg);
  else if(type === "order") inst = createOrder(cfg);
  else if(type === "essay") inst = createEssay(cfg);
  else if(type === "reveal") inst = createReveal(cfg);
  else if(type === "reveal-img" || type === "revealimg") inst = createRevealImage(cfg);
  else{
    console.warn(`[SBBlocks] Skip: Unknown data-wb-type="${type}"`, mountEl);
    return null;
  }

  mountEl.innerHTML = "";
  mountEl.appendChild(inst.node);
  return inst;
}



  function autoMountBlocks(opts={}){
  const mounts = qsa("[data-wb-type]").filter(m => !m.hasAttribute("data-wb-mounted") && !m.hasAttribute("data-wb-rendered"));
  return mounts.map((m, idx) => {
    m.setAttribute("data-wb-mounted","1");
    const inst = mountBlockOne(m, opts, idx);
    if(inst) ensureTaskIcon(m, m.getAttribute("data-wb-type") || "");
    return inst;
  }).filter(Boolean);
}



  function downloadText(filename, text){
    const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "ergebnisse.txt";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function postWebhook(url, payload){
    if(!url) return;
    try{
      fetch(url, {
        method: "POST",
        headers: {"Content-Type":"application/json;charset=utf-8"},
        body: JSON.stringify(payload || {})
      });
    }catch(_){}
  }

  function getBlockMounts(root, type){
    return qsa(`[data-wb-type="${type}"]`, root).filter(m => m.__wbConfig || qs("script.wb-config", m));
  }

  function getStudentName(root){
    const inp = qs("[data-wb-student-name]", root);
    return inp ? String(inp.value || "").trim() : "";
  }

  function buildClozePrompt(cfg){
    if(!cfg || !Array.isArray(cfg.segments)) return "";
    return cfg.segments.map(s => {
      if(s.t === "text") return String(s.v || "");
      if(s.t === "gap") return "____";
      return "";
    }).join("");
  }

  function collectMCQ(mountEl){
    const cfg = mountEl.__wbConfig || {};
    const questions = Array.isArray(cfg.questions) ? cfg.questions : [];
    const qEls = qsa(".wb-q", mountEl);
    let correctCount = 0;
    const items = [];

    qEls.forEach((qEl, qi) => {
      const q = questions[qi] || {};
      const selected = qsa("input", qEl).filter(i => i.checked).map(i => i.value).sort();
      const expected = (q.correct || []).slice().sort();
      const ok = selected.length === expected.length && selected.every((v,i) => v === expected[i]);
      qEl.classList.remove("correct","wrong");
      qEl.classList.add(ok ? "correct" : "wrong");
      const fb = qs("[data-feedback]", qEl);
      if(fb) fb.textContent = q.explain || (ok ? "Richtig." : "Nicht ganz.");
      if(ok) correctCount += 1;
      items.push({ text: q.text || "", selected, expected, ok });
    });

    return { correctCount, total: qEls.length, items };
  }

  function collectCloze(mountEl){
    const gaps = qsa(".wb-gap", mountEl);
    let okCount = 0;
    const items = gaps.map(g => {
      const expected = (g.getAttribute("data-answer") || "").trim();
      const chip = qs(".wb-chip", g);
      const got = chip ? (chip.getAttribute("data-token") || "").trim() : "";
      const ok = got !== "" && got === expected;
      g.classList.remove("ok","bad");
      g.classList.add(ok ? "ok" : "bad");
      if(ok) okCount += 1;
      return { expected, got, ok };
    });
    return { correctCount: okCount, total: gaps.length, items };
  }

  function collectOrder(mountEl){
    const drops = qsa(".wb-order-drop", mountEl);
    let okCount = 0;
    const items = drops.map(d => {
      const expected = d.getAttribute("data-expected-label") || "";
      const expectedId = d.getAttribute("data-expected-id") || "";
      const chip = qs(".wb-order-chip", d);
      const got = chip ? String(chip.textContent || "").trim() : "";
      const gotId = chip ? (chip.getAttribute("data-id") || "") : "";
      const ok = gotId !== "" && gotId === expectedId;
      const slot = d.closest(".wb-order-slot");
      if(slot){
        slot.classList.remove("ok","bad");
        slot.classList.add(ok ? "ok" : "bad");
      }
      if(ok) okCount += 1;
      return { expected, got, ok };
    });
    return { correctCount: okCount, total: drops.length, items };
  }

  function collectEssay(mountEl){
    const inputs = qsa("[data-wb-key]", mountEl);
    return inputs.map(inp => ({ key: inp.getAttribute("data-wb-key") || "", value: inp.value || "" }));
  }

  function collectPuzzle(mountEl){
    const p2 = mountEl.__p2;
    if(p2 && typeof p2.check === "function") p2.check();
    const pairs = qsa(".p2-joined", mountEl);
    const okCount = pairs.filter(w => w.dataset.correct === "1").length;
    const totalPairs = new Set(qsa(".p2-piece", mountEl).map(p => (p.getAttribute("data-pair") || "").trim())).size;
    const items = pairs.map(w => {
      const parts = qsa(".p2-piece", w);
      const left = parts.find(p => String(p.getAttribute("data-side") || "").trim().toUpperCase() === "L") || parts[0];
      const right = parts.find(p => String(p.getAttribute("data-side") || "").trim().toUpperCase() === "R") || parts[1];
      return {
        left: left ? String(left.textContent || "").trim() : "",
        right: right ? String(right.textContent || "").trim() : "",
        ok: w.dataset.correct === "1"
      };
    });
    return { correctCount: okCount, total: totalPairs, items };
  }


  function exportResults(root, cfg, showPage){
    const results = [];
    const textLines = [];
    let totalCorrect = 0;
    let totalPossible = 0;
    const pageTotals = new Map();

    const studentName = getStudentName(root);
    if(studentName){
      textLines.push("Name: " + studentName);
      textLines.push("");
    }

    const pages = qsa("[data-wb-page]", root)
      .filter(n => n.closest(".wb-paper"))
      .map(n => ({node:n, page:Number(n.getAttribute("data-wb-page")||"0")}))
      .sort((a,b)=>a.page-b.page);

    pages.forEach(p => {
      const pageNum = p.page;
      const pageRoot = p.node;
      let pageCorrect = 0;
      let pagePossible = 0;

      textLines.push("=== Seite " + pageNum + " ===");

      getBlockMounts(pageRoot, "mcq").forEach((m, idx) => {
        const res = collectMCQ(m);
        const title = (m.__wbConfig && m.__wbConfig.title) ? m.__wbConfig.title : ("Multiple Choice " + (idx+1));
        results.push({type:"mcq", title, res, page: pageNum});
        totalCorrect += res.correctCount;
        totalPossible += res.total;
        pageCorrect += res.correctCount;
        pagePossible += res.total;
        textLines.push("## Seite " + pageNum + ": " + title);
        textLines.push("Punkte: " + res.correctCount + "/" + res.total);
        res.items.forEach((it, qi) => {
          textLines.push((qi+1) + ". " + it.text);
          textLines.push("Ausgewaehlt: " + (it.selected.join(", ") || "-"));
          textLines.push("Richtig: " + (it.expected.join(", ") || "-"));
          textLines.push("Ergebnis: " + (it.ok ? "richtig" : "falsch"));
        });
        textLines.push("");
      });

      getBlockMounts(pageRoot, "cloze").forEach((m, idx) => {
        const res = collectCloze(m);
        const title = (m.__wbConfig && m.__wbConfig.title) ? m.__wbConfig.title : ("Lueckentext " + (idx+1));
        const prompt = buildClozePrompt(m.__wbConfig);
        results.push({type:"cloze", title, res, prompt, page: pageNum});
        totalCorrect += res.correctCount;
        totalPossible += res.total;
        pageCorrect += res.correctCount;
        pagePossible += res.total;
        textLines.push("## Seite " + pageNum + ": " + title);
        if(prompt) textLines.push("Aufgabe: " + prompt);
        textLines.push("Punkte: " + res.correctCount + "/" + res.total);
        res.items.forEach((it, gi) => {
          textLines.push((gi+1) + ". Eingabe: " + (it.got || "-") + " | Erwartet: " + (it.expected || "-") + " | " + (it.ok ? "richtig" : "falsch"));
        });
        textLines.push("");
      });

      getBlockMounts(pageRoot, "order").forEach((m, idx) => {
        const res = collectOrder(m);
        const title = (m.__wbConfig && m.__wbConfig.title) ? m.__wbConfig.title : ("Reihenfolge " + (idx+1));
        results.push({type:"order", title, res, page: pageNum});
        totalCorrect += res.correctCount;
        totalPossible += res.total;
        pageCorrect += res.correctCount;
        pagePossible += res.total;
        textLines.push("## Seite " + pageNum + ": " + title);
        textLines.push("Punkte: " + res.correctCount + "/" + res.total);
        res.items.forEach((it, oi) => {
          textLines.push((oi+1) + ". Eingabe: " + (it.got || "-") + " | Erwartet: " + (it.expected || "-") + " | " + (it.ok ? "richtig" : "falsch"));
        });
        textLines.push("");
      });

      getBlockMounts(pageRoot, "essay").forEach((m, idx) => {
        const fields = collectEssay(m);
        const title = (m.__wbConfig && m.__wbConfig.title) ? m.__wbConfig.title : ("Text " + (idx+1));
        results.push({type:"essay", title, fields, page: pageNum});
        textLines.push("## Seite " + pageNum + ": " + title);
        fields.forEach(f => {
          textLines.push((f.key || "") + ":");
          textLines.push(f.value || "");
        });
        textLines.push("");
      });

      qsa('[data-p2]', pageRoot).forEach((m, idx) => {
        const res = collectPuzzle(m);
        const title = "Puzzle " + (idx+1);
        results.push({type:"puzzle", title, res, page: pageNum});
        totalCorrect += res.correctCount;
        totalPossible += res.total;
        pageCorrect += res.correctCount;
        pagePossible += res.total;
        textLines.push("## Seite " + pageNum + ": " + title);
        textLines.push("Punkte: " + res.correctCount + "/" + res.total);
        res.items.forEach((it, pi) => {
          textLines.push((pi+1) + ". " + (it.left || "-") + " | " + (it.right || "-") + " | " + (it.ok ? "richtig" : "falsch"));
        });
        textLines.push("");
      });

      qsa("[data-wb-export]", pageRoot).forEach((ta, idx) => {
        const title = (ta.getAttribute("data-wb-label") || "Text " + (idx+1)).trim();
        const value = String(ta.value || "");
        results.push({type:"text", title, page: pageNum, value});
        textLines.push("## Seite " + pageNum + ": " + title);
        textLines.push(value || "-");
        textLines.push("");
      });

      if(pagePossible > 0){
        textLines.push("Seitenpunkte: " + pageCorrect + "/" + pagePossible);
        textLines.push("");
        pageTotals.set(pageNum, {correct: pageCorrect, total: pagePossible});
      }else{
        textLines.push("");
      }
    });

    const resultsPage = qs('[data-wb-results="1"]', root);
    if(resultsPage){
      resultsPage.innerHTML = "";
      const wrap = el("div", {class:"wb-results-wrap"}, []);

      const typeLabel = {
        mcq: "Multiple Choice",
        cloze: "Lueckentext",
        order: "Reihenfolge",
        puzzle: "Zuordnung",
        essay: "Essay",
        text: "Text"
      };

      function isCompleted(r){
        if(r.type === "mcq"){
          return r.res.items.every(it => Array.isArray(it.selected) && it.selected.length);
        }
        if(r.type === "cloze"){
          return r.res.items.every(it => String(it.got || "").trim() !== "");
        }
        if(r.type === "essay"){
          return r.fields.some(f => String(f.value || "").trim() !== "");
        }
        if(r.type === "text"){
          return String(r.value || "").trim() !== "";
        }
        return true;
      }

      const allInteractions = results.length;
      const doneInteractions = results.filter(isCompleted).length;
      const allPages = pages.length;
      const pagesWithDone = new Set(results.filter(isCompleted).map(r => r.page));
      const donePages = pagesWithDone.size;

      const scorePct = totalPossible ? Math.round((totalCorrect / totalPossible) * 100) : 0;
      const bookPct = allPages ? Math.round((donePages / allPages) * 100) : 0;
      const intPct = allInteractions ? Math.round((doneInteractions / allInteractions) * 100) : 0;

      const topGrid = el("div", {class:"wb-results-topgrid"}, [
        el("div", {class:"wb-results-card"}, [
          el("div", {class:"wb-results-card-text"}, [
            el("h3", {}, ["Total score"]),
            el("p", {class:"wb-results-big"}, [String(totalCorrect), " / ", String(totalPossible)]),
            el("p", {class:"wb-results-small"}, [String(doneInteractions), " of ", String(allInteractions), " interactions"])
          ]),
          el("div", {class:"wb-results-ring", style:`--p:${scorePct};--ring-color:var(--wb-ok)`}, [])
        ]),
        el("div", {class:"wb-results-card"}, [
          el("div", {class:"wb-results-card-text"}, [
            el("h3", {}, ["Book progress"]),
            el("p", {class:"wb-results-big wb-results-blue"}, [String(bookPct), "%"]),
            el("p", {class:"wb-results-small"}, [String(donePages), " of ", String(allPages), " pages"])
          ]),
          el("div", {class:"wb-results-ring", style:`--p:${bookPct};--ring-color:var(--wb-blue)`}, [])
        ]),
        el("div", {class:"wb-results-card"}, [
          el("div", {class:"wb-results-card-text"}, [
            el("h3", {}, ["Interactions progress"]),
            el("p", {class:"wb-results-big wb-results-blue"}, [String(intPct), "%"]),
            el("p", {class:"wb-results-small"}, [String(doneInteractions), " of ", String(allInteractions), " interactions"])
          ]),
          el("div", {class:"wb-results-ring", style:`--p:${intPct};--ring-color:var(--wb-blue)`}, [])
        ])
      ]);

      const summaryHead = el("div", {class:"wb-results-summary-head"}, [
        el("div", {class:"wb-results-heading"}, ["Summary"])
      ]);

      const panelTitle = cfg.bookTitle || cfg.sectionTitle || "Ergebnisse";
      const panelTopChildren = [
        el("div", {class:"wb-results-panel-title"}, [panelTitle]),
        el("p", {class:"wb-results-panel-sub"}, [String(doneInteractions), " of ", String(allInteractions), " interactions completed"])
      ];
      if(studentName){
        panelTopChildren.push(el("p", {class:"wb-results-name"}, ["Name: " + studentName]));
      }

      const tableRows = results.map(r => {
        const scoreText = (r.type === "mcq" || r.type === "cloze" || r.type === "order" || r.type === "puzzle")
          ? `${r.res.correctCount} / ${r.res.total}`
          : "-";
        const meta = typeLabel[r.type] || "Interaktion";
        return el("div", {class:"wb-results-row"}, [
          el("div", {class:"wb-results-dot"}, []),
          el("div", {}, [
            el("div", {class:"wb-results-name-text"}, [r.title || "Ohne Titel"]),
            el("div", {class:"wb-results-muted"}, [`${meta} - Seite ${r.page}`])
          ]),
          el("div", {class:"wb-results-score"}, [scoreText])
        ]);
      });

      const panel = el("div", {class:"wb-results-panel"}, [
        el("div", {class:"wb-results-panel-top"}, panelTopChildren),
        el("div", {class:"wb-results-table"}, [
          el("div", {class:"wb-results-thead"}, [
            el("div", {}, []),
            el("div", {}, []),
            el("div", {class:"wb-results-score-head"}, ["Score"])
          ]),
          ...tableRows
        ])
      ]);

      const scorePctClamped = Math.max(0, Math.min(100, scorePct));
      const progressBar = el("div", {class:"wb-results-progress", style:`--p:${scorePctClamped}`}, [
        el("div", {class:"wb-results-progress-track"}, [
          el("div", {class:"wb-results-progress-fill"}, [])
        ]),
        el("div", {class:"wb-results-progress-star", "aria-hidden":"true"}, [
          el("svg", {viewBox:"0 0 24 24", class:"wb-results-progress-star-svg"}, [
            el("path", {d:"M12 2.5l2.92 5.92 6.54.95-4.73 4.61 1.12 6.53L12 17.9 6.15 20.51l1.12-6.53L2.54 9.37l6.54-.95L12 2.5z"})
          ])
        ]),
        el("div", {class:"wb-results-progress-score"}, [`${totalCorrect} / ${totalPossible}`])
      ]);

      const essayItems = results
        .filter(r => r.type === "essay")
        .map(r => {
          const values = r.fields
            .map(f => {
              const label = String(f.key || "").trim();
              const value = String(f.value || "").trim();
              return (label ? (label + ": ") : "") + (value || "-");
            })
            .join("\n");
          return el("div", {class:"wb-results-essay-item"}, [
            el("div", {class:"wb-results-essay-title"}, [r.title || "Essay"]),
            el("div", {class:"wb-results-essay-text"}, [values || "-"])
          ]);
        });

      const essaysSection = el("div", {class:"wb-results-essays"}, [
        el("div", {class:"wb-results-essays-head"}, ["Essay-Texte"]),
        essayItems.length ? el("div", {class:"wb-results-essays-list"}, essayItems)
          : el("div", {class:"wb-results-muted"}, ["Keine Essays gefunden."])
      ]);

      wrap.appendChild(topGrid);
      wrap.appendChild(summaryHead);
      wrap.appendChild(panel);
      wrap.appendChild(progressBar);
      wrap.appendChild(essaysSection);
      resultsPage.appendChild(wrap);
    }

    textLines.push("Gesamtpunkte: " + totalCorrect + "/" + totalPossible);

    const fileName = (cfg && cfg.exportName) ? cfg.exportName : "ergebnisse.txt";
    downloadText(fileName, textLines.join("\n"));
    if(cfg && cfg.webhookUrl){
      const url = String(cfg.webhookUrl).trim();
      const email = (cfg.webhookEmail != null) ? String(cfg.webhookEmail) : "";
      if(url) postWebhook(url, { name: studentName, email, message: textLines.join("\n") });
    }

    if(resultsPage && typeof showPage === "function"){
      const pageNum = Number(resultsPage.getAttribute("data-wb-page") || "0");
      if(pageNum) showPage(pageNum);
    }
  }


  // ---------- Book + autoNav ----------
  function buildAutoNav(bookMountEl, cfg){
    const headings = Array.isArray(cfg.autoNavHeadings) && cfg.autoNavHeadings.length ? cfg.autoNavHeadings : ["h1","h2"];
    const includeBlocks = cfg.autoNavIncludeBlocks === true;
    const groupTitle = cfg.autoNavGroupTitle || (cfg.sectionTitle || cfg.bookTitle || "Inhalt");
    const items = [];
    const pageNodes = qsa("[data-wb-page]", bookMountEl).map(n => ({node:n, page:Number(n.getAttribute("data-wb-page")||"1")})).sort((a,b)=>a.page-b.page);

    pageNodes.forEach(p => {
      qsa(headings.join(","), p.node).forEach(h => {
        const label = (h.textContent || "").trim();
        if(!label) return;
        const id = ensureId(h, `h-${p.page}-${label}`);
        items.push({label, target:`#${id}`, page:p.page});
      });

      if(includeBlocks){
        qsa("[data-wb-type]", p.node).forEach(m => {
          let label = "";
          try{
            const cfgScript = qs("script.wb-config[type='application/json']", m);
            if(cfgScript){
              const bc = JSON.parse(cfgScript.textContent);
              label = (bc.title || "").trim();
            }
          }catch(_){}
          if(!label) label = (m.getAttribute("data-wb-type") || "Block").toUpperCase();
          const id = ensureId(m, `block-${p.page}-${label}`);
          items.push({label, target:`#${id}`, page:p.page});
        });
      }
    });
    return [{title: groupTitle, open:true, items}];
  }

  function mountBook(bookEl, opts={}){
    const cfg = readJsonScript(bookEl, "script.wb-book-config[type='application/json']");
    const bookTitle = cfg.bookTitle || "Buch";
    const sectionTitle = cfg.sectionTitle || bookTitle;
    const submitLabel = cfg.submitLabel || "Summary & submit";
    const nameLabel = cfg.studentNameLabel || "Name";
    const namePlaceholder = cfg.studentNamePlaceholder || "Vorname Nachname";
    const nameStorageKey = cfg.studentNameStorageKey || "wbStudentName";

    const pages = qsa("[data-wb-page]", bookEl).map(n => ({node:n, page:Number(n.getAttribute("data-wb-page")||"1")})).sort((a,b)=>a.page-b.page);
    let resultsPage = qs('[data-wb-results="1"]', bookEl);
    if(!pages.length) throw new Error("SBBook: keine Seiten (data-wb-page) gefunden.");
    let maxPage = cfg.maxPage || Math.max(...pages.map(p=>p.page));
    if(!resultsPage && (cfg.onSubmit === "exportResults" || cfg.onSubmit === "alert" || cfg.enableResultsPage === true)) {
      const resultsNum = maxPage + 1;
      resultsPage = document.createElement("section");
      resultsPage.setAttribute("data-wb-page", String(resultsNum));
      resultsPage.setAttribute("data-wb-page-title", String(cfg.resultsPageTitle || "Ergebnisse"));
      resultsPage.setAttribute("data-wb-results", "1");
      resultsPage.innerHTML = "<h1>Ergebnisse</h1><p class='wb-muted'>Hier erscheinen deine Ergebnisse nach dem Absenden.</p>";
      bookEl.appendChild(resultsPage);
      pages.push({node: resultsPage, page: resultsNum});
      pages.sort((a,b)=>a.page-b.page);
      maxPage = resultsNum;
    }


    let groups = cfg.groups;
    if(cfg.autoNav) groups = buildAutoNav(bookEl, {...cfg, bookTitle, sectionTitle});
    if(!Array.isArray(groups)) groups = [];

    const initialHash = (global.location && global.location.hash) ? global.location.hash : "";

    // Build skeleton
    const root = el("div", {class:"wb-book"});
    root.__wbConfig = cfg;
    const topbar = el("header", {class:"wb-topbar"}, [
      el("div", {class:"wb-top-left"}, [
        el("button", {class:"wb-hamburger", type:"button", "aria-label":"Menü"}, [
          el("svg", {width:"26", height:"26", viewBox:"0 0 24 24", html:'<path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"></path>'})
        ]),
        el("div", {class:"wb-brand"}, [bookTitle])
      ]),
      el("div", {class:"wb-top-right"}, [
        el("div", {class:"wb-page-ind"}, [
          el("span", {"data-wb-pagenow":"1"}, ["1"]), " / ",
          el("span", {"data-wb-pagemax":"1"}, [String(maxPage)])
        ]),
        el("button", {class:"wb-icon-btn", type:"button", "data-wb-prev":"1", "aria-label":"Zurück"}, [
          el("svg", {width:"20", height:"20", viewBox:"0 0 24 24", html:'<path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/>'})
        ]),
        el("button", {class:"wb-icon-btn", type:"button", "data-wb-next":"1", "aria-label":"Weiter"}, [
          el("svg", {width:"20", height:"20", viewBox:"0 0 24 24", html:'<path d="m8.6 16.6 1.4 1.4 6-6-6-6-1.4 1.4L13.2 12z"/>'})
        ]),
        el("button", {class:"wb-icon-btn", type:"button", "data-wb-fs":"1", "aria-label":"Vollbild"}, [
          el("svg", {width:"20", height:"20", viewBox:"0 0 24 24", html:'<path d="M9 3H3v6h2V6.41l3.29 3.3 1.42-1.42L6.41 5H9V3zm6 0v2h2.59l-3.3 3.29 1.42 1.42L19 6.41V9h2V3h-6zM9 21v-2H6.41l3.3-3.29-1.42-1.42L5 17.59V15H3v6h6zm6 0h6v-6h-2v2.59l-3.29-3.3-1.42 1.42L17.59 19H15v2z"/>'})
        ])
      ])
    ]);

    const layout = el("div", {class:"wb-layout"});
    const backdrop = el("div", {class:"wb-backdrop"});
    const sidebar = el("aside", {class:"wb-sidebar", "aria-label":"Navigation"});
    const content = el("main", {class:"wb-content"});
    const paper = el("article", {class:"wb-paper"});
    pages.forEach(p => paper.appendChild(p.node));
    content.appendChild(paper);

    // sidebar
    sidebar.appendChild(el("div", {class:"wb-side-top"}, [sectionTitle]));
    const sideNav = el("div", {class:"wb-side-nav"});
    const navLinks = [];
    const pageLabelPrefix = cfg.pageLabelPrefix || "Seite";
    const getPageTitle = (p) => {
      const t = (p && p.node && p.node.getAttribute("data-wb-page-title")) ? p.node.getAttribute("data-wb-page-title").trim() : "";
      return t || "";
    };
    const pageLabelFor = (n) => {
      const p = pages.find(x => x.page === n);
      const t = getPageTitle(p);
      return t ? `${pageLabelPrefix} ${n} - ${t}` : `${pageLabelPrefix} ${n}`;
    };
    const pageListTitle = cfg.pageListTitle || "Seiten";
    const pageNavWrap = el("div", {class:"wb-page-list"}, [
      el("div", {class:"wb-side-section-title"}, [pageListTitle])
    ]);
    const pageNav = el("div", {class:"wb-nav-items"});
    const pageByNum = new Map(pages.map(p => [p.page, p]));
    for(let n = 1; n <= maxPage; n++){
      const p = pageByNum.get(n);
      if(!p) continue;
      const pageId = ensureId(p.node, `page-${n}`);
      const href = `#${pageId}`;
      const a = el("a", {class:"wb-nav-item", href, "data-wb-target": href, "data-wb-page": String(n), "data-wb-page-list":"1"}, [
        el("span", {class:"wb-dot"}), el("span", {}, [pageLabelFor(n)])
      ]);
      pageNav.appendChild(a);
      navLinks.push(a);
    }
    pageNavWrap.appendChild(pageNav);
    sideNav.appendChild(pageNavWrap);

    groups.forEach((g, gi) => {
      const det = el("details", {class:"wb-group", ...(g.open ? {open:""} : {})});
      det.appendChild(el("summary", {}, [
        el("span", {"data-wb-group-title":"1"}, ["Seite 1"]),
        el("span", {class:"wb-chev"}, ["›"])
      ]));
      const itemsWrap = el("div", {class:"wb-nav-items"});
      (g.items || []).forEach((it, ii) => {
        const href = it.target || "#";
        const a = el("a", {class:"wb-nav-item", href, "data-wb-target": href, "data-wb-page": String(it.page || 1)}, [
          el("span", {class:"wb-dot"}), el("span", {}, [it.label || `Item ${ii+1}`])
        ]);
        itemsWrap.appendChild(a);
        navLinks.push(a);
      });
      det.appendChild(itemsWrap);
      sideNav.appendChild(det);
    });

    const nameInput = el("input", {class:"wb-input", type:"text", placeholder: namePlaceholder, "data-wb-student-name":"1"});
    try{
      const storedName = localStorage.getItem(nameStorageKey);
      if(storedName != null) nameInput.value = storedName;
      nameInput.addEventListener("input", () => {
        localStorage.setItem(nameStorageKey, nameInput.value || "");
      });
    }catch(_){}
    const nameWrap = el("div", {class:"wb-name-field"}, [
      el("label", {class:"wb-label"}, [nameLabel]),
      nameInput
    ]);

    sideNav.appendChild(el("div", {class:"wb-side-footer"}, [
      nameWrap,
      el("button", {class:"wb-submit-btn", type:"button"}, [submitLabel])
    ]));
    sidebar.appendChild(sideNav);

    layout.appendChild(backdrop);
    layout.appendChild(sidebar);
    layout.appendChild(content);

    root.appendChild(topbar);
    root.appendChild(layout);

    bookEl.innerHTML = "";
    bookEl.appendChild(root);

    const nowEl = qs("[data-wb-pagenow]", root);
    const prevBtn = qs("[data-wb-prev]", root);
    const nextBtn = qs("[data-wb-next]", root);
    const fsBtn = qs("[data-wb-fs]", root);
    const hamBtn = qs(".wb-hamburger", root);
    const submitBtn = qs(".wb-submit-btn", root);

    const pageSections = () => qsa("[data-wb-page]", root)
      .filter(n => n.closest(".wb-paper"))
      .map(n => ({node:n, page:Number(n.getAttribute("data-wb-page")||"1")}));
    const setActiveByLink = (link) => { navLinks.forEach(x=>x.classList.remove("active")); if(link) link.classList.add("active"); };
    const firstLinkOfPage = (p) => navLinks.find(a => Number(a.getAttribute("data-wb-page")||"1")===p) || null;

    function showPage(n, scrollToSel){
      const idx = Math.max(1, Math.min(maxPage, n));
      nowEl.textContent = String(idx);
      const pageLabel = pageLabelFor(idx);
      qsa("[data-wb-group-title]", root).forEach(el => el.textContent = pageLabel);
      pageSections().forEach(p => p.node.style.display = (p.page === idx) ? "" : "none");
      navLinks.forEach(link => {
        const isPageList = link.hasAttribute("data-wb-page-list");
        const linkPage = Number(link.getAttribute("data-wb-page") || "0");
        link.style.display = (isPageList || linkPage === idx) ? "" : "none";
      });
      prevBtn.disabled = idx <= 1;
      nextBtn.disabled = idx >= maxPage;

      const active = navLinks.find(a => a.classList.contains("active"));
      if(!active || Number(active.getAttribute("data-wb-page")||"1") !== idx) setActiveByLink(firstLinkOfPage(idx));

      const activePage = pageSections().find(p => p.page === idx);
      const target = scrollToSel ? qs(scrollToSel, root) : null;
      const topbarH = (qs(".wb-topbar", root) && qs(".wb-topbar", root).offsetHeight) ? qs(".wb-topbar", root).offsetHeight : 0;
   
      const scrollToNode = (node, smooth) => {
        if(!node) return;
        var y = node.getBoundingClientRect().top + global.pageYOffset - topbarH;
        if (y < 50) y = 0;
        global.scrollTo({top: y, behavior: smooth ? "smooth" : "instant"});
      };
      if(target && activePage && activePage.node.contains(target)){
        scrollToNode(target, true);
      }else if(activePage){
        scrollToNode(activePage.node, false);
      }else{
        scrollToNode(paper, false);
      }
    }

    const closeNav = () => root.classList.remove("nav-open");
    const toggleNav = () => root.classList.toggle("nav-open");
    hamBtn.addEventListener("click", toggleNav);
    backdrop.addEventListener("click", closeNav);

    navLinks.forEach(a => a.addEventListener("click", (e) => {
      e.preventDefault();
      const page = Number(a.getAttribute("data-wb-page")||"1");
      const target = a.getAttribute("data-wb-target") || a.getAttribute("href");
      const isPageList = a.hasAttribute("data-wb-page-list");
      showPage(page, isPageList ? null : target);
      setActiveByLink(a);
      closeNav();
      try{ history.replaceState(null, "", a.getAttribute("href")); }catch(_){}
    }));

    prevBtn.addEventListener("click", () => showPage(Number(nowEl.textContent) - 1));
    nextBtn.addEventListener("click", () => showPage(Number(nowEl.textContent) + 1));

    root.addEventListener("keydown", (e) => {
      if(e.key === "ArrowLeft") showPage(Number(nowEl.textContent) - 1);
      if(e.key === "ArrowRight") showPage(Number(nowEl.textContent) + 1);
    });
    root.tabIndex = -1;
    root.focus({preventScroll:true});

    fsBtn.addEventListener("click", async () => {
      try{
        if(!document.fullscreenElement) await root.requestFullscreen();
        else await document.exitFullscreen();
      }catch(_){}
    });

    submitBtn.addEventListener("click", () => {
      const nameInputEl = qs("[data-wb-student-name]", root);
      if(nameInputEl && !String(nameInputEl.value || "").trim()){
        alert("Bitte gib deinen Namen ein.");
        nameInputEl.focus();
        return;
      }
      if(cfg.onSubmit === "exportResults" || cfg.onSubmit === "alert") {
        exportResults(root, cfg, showPage);
      } else if(typeof opts.onSubmit === "function") {
        opts.onSubmit({root, cfg});
      }
    });

    let startPage = Number(cfg.startPage || 1);
    if(initialHash){
      const link = navLinks.find(a => a.getAttribute("href") === initialHash);
      if(link){
        startPage = Number(link.getAttribute("data-wb-page")||startPage);
        setActiveByLink(link);
        showPage(startPage, initialHash);
        return {root, showPage};
      }
    }
    setActiveByLink(firstLinkOfPage(startPage));
    showPage(startPage);
    return {root, showPage};
  }

  function autoMountBooks(opts={}){
    const mounts = qsa("[data-wb-book]").filter(m => !m.hasAttribute("data-wb-mounted"));
    return mounts.map(m => { m.setAttribute("data-wb-mounted","1"); return mountBook(m, opts); });
  }

  // ---------- Theme ----------
  const DEFAULT_THEMES = [
    {id: "default", label: "Standard"},
    {id: "candy", label: "Candy"},
    {id: "mint", label: "Mint"},
    {id: "sunset", label: "Sunset"},
    {id: "grau", label: "Dark"},
    {id: "dark", label: "Dark Blue"}
  ];

  function normalizeThemes(list){
    const src = Array.isArray(list) && list.length ? list : DEFAULT_THEMES;
    return src.map(t => {
      if(typeof t === "string") return {id: t, label: t};
      if(t && typeof t === "object") return {id: String(t.id || ""), label: String(t.label || t.id || "")};
      return null;
    }).filter(t => t && t.id);
  }

  function mountTheme(bookRoot, opts={}){
    const root = bookRoot;
    if(!root || root.hasAttribute("data-wb-theme-mounted")) return null;

    const topRight = qs(".wb-top-right", root);
    if(!topRight) return null;

    const cfg = root.__wbConfig || {};
    const themes = normalizeThemes(cfg.themes);
    const isKnown = (id) => themes.some(t => t.id === id);
    const defaultTheme = isKnown(cfg.themeDefault) ? String(cfg.themeDefault) : "default";
    const storageKey = String(cfg.themeStorageKey || "wbTheme");
    const stored = localStorage.getItem(storageKey);
    const active = isKnown(stored) ? stored : defaultTheme;

    const applyTheme = (id) => {
      if(id === "default") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", id);
    };
    applyTheme(active);

    const wrap = document.createElement("div");
    wrap.className = "wb-theme-wrap";

    const label = document.createElement("span");
    label.className = "wb-theme-label";
    label.textContent = "Theme";

    const select = document.createElement("select");
    select.className = "wb-theme-select";
    themes.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.label;
      select.appendChild(opt);
    });
    select.value = active;
    select.addEventListener("change", () => {
      applyTheme(select.value);
      localStorage.setItem(storageKey, select.value);
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    topRight.insertBefore(wrap, topRight.firstChild);

    root.setAttribute("data-wb-theme-mounted", "1");
    return {root, themes, active};
  }

  function autoMountThemes(opts={}){
    const mounts = qsa(".wb-book").filter(m => !m.hasAttribute("data-wb-theme-mounted"));
    return mounts.map(m => mountTheme(m, opts)).filter(Boolean);
  }


  // ---------- Puzzle2 (2-Teile zusammenfuehren) ----------
  // ---------- Puzzle2 (STRICT, 2 banks: left/right, NO pointer-capture) ----------
  // ---------- Puzzle2 (STRICT, 2 banks: left/right, Pointer+Touch+Mouse) ----------
function initPuzzle2(root, idx=0){
    const leftBank  = qs("[data-left-bank]", root);
    const rightBank = qs("[data-right-bank]", root);
    const solved    = qs("[data-solved]", root);
    const scoreEl   = qs("[data-score]", root);
    const btnShuffle= qs("[data-shuffle]", root);
    const btnReset  = qs("[data-reset]", root);
    const btnCheck  = qs("[data-check]", root);
    const p2Id = root.getAttribute("data-p2-id") || root.id || `p2_${idx}`;
    const requireComplete = String(root.getAttribute("data-p2-require-complete") || "").toLowerCase() !== "false";
    const storageKey = "wb_p2_" + p2Id;

    if(!leftBank || !rightBank || !solved) return;

    // Diagnose (einmal pro Puzzle)
    try { console.log("[Puzzle2] mount ok", root); } catch(_) {}

    const allPieces = () => qsa(".p2-piece", root);
    const totalPairs = () => new Set(allPieces().map(p => (p.getAttribute("data-pair")||"").trim())).size;

    function shuffleChildren(container){
      const kids = Array.from(container.children);
      for(let i = kids.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        container.appendChild(kids[j]);
        kids.splice(j, 1);
      }
    }
    function shuffleAll(){
      shuffleChildren(leftBank);
      shuffleChildren(rightBank);
    }

    function setScore(graded){
      const pairs = qsa(".p2-joined", solved);
      const okCount = graded
        ? pairs.filter(w => w.dataset.correct === "1").length
        : 0;

      if(scoreEl){
        scoreEl.textContent = graded
          ? `Punkte: ${okCount}/${totalPairs()}`
          : `Paare: ${pairs.length}/${totalPairs()} (noch nicht überprüft)`;
      }
    }

    function updateCheckState(){
      if(!btnCheck || !requireComplete) return;
      const pairs = qsa(".p2-joined", solved);
      btnCheck.disabled = pairs.length !== totalPairs();
    }

    let isLoading = false;

    function saveState(){
      try{
        const pairs = qsa(".p2-joined", solved).map(w => {
          const left = qs(".p2-piece[data-side='L']", w);
          return left ? (left.getAttribute("data-pair") || "") : "";
        }).filter(Boolean);
        localStorage.setItem(storageKey, JSON.stringify(pairs));
      }catch(_e){}
    }

    function loadState(){
      try{
        const raw = localStorage.getItem(storageKey);
        if(!raw) return;
        const pairs = JSON.parse(raw);
        if(!Array.isArray(pairs)) return;
        isLoading = true;
        pairs.forEach(pairId => {
          const left = qs(`.p2-piece[data-side="L"][data-pair="${pairId}"]`, root);
          const right = qs(`.p2-piece[data-side="R"][data-pair="${pairId}"]`, root);
          if(left && right) join(left, right);
        });
        isLoading = false;
        saveState();
      }catch(_e){
        isLoading = false;
      }
    }

    function lockPiece(p){
      p.classList.add("p2-locked");
      p.style.pointerEvents = "none";
    }

    function canJoin(a, b){
      if(!a || !b) return false;
      if(a.classList.contains("p2-locked") || b.classList.contains("p2-locked")) return false;

      const sa = (a.getAttribute("data-side")||"").trim().toUpperCase();
      const sb = (b.getAttribute("data-side")||"").trim().toUpperCase();

      // nur L+R (egal welche Pair-ID)
      return (sa === "L" && sb === "R") || (sa === "R" && sb === "L");
    }

    function isCorrectPair(a, b){
      const pa = (a.getAttribute("data-pair")||"").trim();
      const pb = (b.getAttribute("data-pair")||"").trim();
      return pa && pa === pb;
    }

    function check(){
      qsa(".p2-joined", solved).forEach(w => {
        w.classList.remove("p2-ok","p2-bad");
        w.classList.add(w.dataset.correct === "1" ? "p2-ok" : "p2-bad");
      });
      setScore(true);
    }
    if(btnCheck) btnCheck.addEventListener("click", check);

    function join(a, b){
      const sa = (a.getAttribute("data-side")||"").trim().toUpperCase();
      const left  = (sa === "L") ? a : b;
      const right = (sa === "R") ? a : b;

      const wrap = el("div", {class:"p2-joined"}, [
        left,
        el("div", {class:"p2-seam"}, []),
        right
      ]);

      // Merken f?r sp?tere ?berpr?fung
      wrap.dataset.correct = isCorrectPair(left, right) ? "1" : "0";

      lockPiece(left);
      lockPiece(right);

      solved.appendChild(wrap);
      setScore(false); // noch nicht bewerten
      updateCheckState();
      if(!isLoading) saveState();
    }

    // ---- Drag core ----
    let drag = null;

    function startDrag(piece, clientX, clientY){
      if(!piece || piece.classList.contains("p2-locked")) return;

      const rect = piece.getBoundingClientRect();
      drag = {
        piece,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
        placeholder: document.createElement("div"),
        originParent: piece.parentElement,
        originNext: piece.nextSibling
      };

      drag.placeholder.className = "p2-placeholder";
      drag.placeholder.style.height = rect.height + "px";
      drag.placeholder.style.width  = "100%";

      drag.originParent.insertBefore(drag.placeholder, drag.originNext);

      piece.classList.add("p2-dragging");
      piece.style.position = "fixed";
      piece.style.left = rect.left + "px";
      piece.style.top  = rect.top  + "px";
      piece.style.width = rect.width + "px";
      piece.style.zIndex = 9999;
    }

    function moveDrag(clientX, clientY){
      if(!drag) return;
      drag.piece.style.left = (clientX - drag.offsetX) + "px";
      drag.piece.style.top  = (clientY - drag.offsetY) + "px";
    }

    function restoreDrag(){
      if(!drag) return;
      const { piece, placeholder, originParent } = drag;

      piece.classList.remove("p2-dragging");
      piece.style.position = "";
      piece.style.left = "";
      piece.style.top = "";
      piece.style.width = "";
      piece.style.zIndex = "";

      originParent.insertBefore(piece, placeholder);
      placeholder.remove();
    }

    function endDrag(clientX, clientY){
      if(!drag) return;

      const piece = drag.piece;

      piece.style.display = "none";
      const target = document.elementFromPoint(clientX, clientY);
      piece.style.display = "";

      const targetPiece = target ? target.closest(".p2-piece") : null;

      restoreDrag();

      if(targetPiece && targetPiece !== piece && canJoin(piece, targetPiece)){
        join(piece, targetPiece);
      }

      drag = null;
    }

    // ---- Pointer events (neuere Browser) ----
    const HAS_POINTER = ("PointerEvent" in window);

    if(HAS_POINTER){
      root.addEventListener("pointerdown", (e) => {
        const piece = e.target.closest(".p2-piece");
        if(!piece) return;
        e.preventDefault();
        startDrag(piece, e.clientX, e.clientY);
      }, {passive:false});

      window.addEventListener("pointermove", (e) => {
        if(!drag) return;
        e.preventDefault();
        moveDrag(e.clientX, e.clientY);
      }, {passive:false});

      window.addEventListener("pointerup", (e) => {
        if(!drag) return;
        e.preventDefault();
        endDrag(e.clientX, e.clientY);
      }, {passive:false});

      window.addEventListener("pointercancel", () => {
        if(!drag) return;
        restoreDrag();
        drag = null;
      }, {passive:false});
    } else {
      // ---- Touch fallback (?ltere iPads) ----
      root.addEventListener("touchstart", (e) => {
        const piece = e.target.closest(".p2-piece");
        if(!piece) return;
        const t = e.touches[0];
        if(!t) return;
        e.preventDefault();
        startDrag(piece, t.clientX, t.clientY);
      }, {passive:false});

      window.addEventListener("touchmove", (e) => {
        if(!drag) return;
        const t = e.touches[0];
        if(!t) return;
        e.preventDefault();
        moveDrag(t.clientX, t.clientY);
      }, {passive:false});

      window.addEventListener("touchend", (e) => {
        if(!drag) return;
        const t = e.changedTouches[0];
        if(!t) return;
        e.preventDefault();
        endDrag(t.clientX, t.clientY);
      }, {passive:false});

      window.addEventListener("touchcancel", () => {
        if(!drag) return;
        restoreDrag();
        drag = null;
      }, {passive:false});

      // ---- Mouse fallback ----
      root.addEventListener("mousedown", (e) => {
        const piece = e.target.closest(".p2-piece");
        if(!piece) return;
        e.preventDefault();
        startDrag(piece, e.clientX, e.clientY);

        const mm = (ev) => { if(!drag) return; ev.preventDefault(); moveDrag(ev.clientX, ev.clientY); };
        const mu = (ev) => {
          window.removeEventListener("mousemove", mm);
          window.removeEventListener("mouseup", mu);
          if(!drag) return;
          ev.preventDefault();
          endDrag(ev.clientX, ev.clientY);
        };

        window.addEventListener("mousemove", mm, {passive:false});
        window.addEventListener("mouseup", mu, {passive:false});
      }, {passive:false});
    }

    function reset(){
      qsa(".p2-joined", solved).forEach(w => {
        qsa(".p2-piece", w).forEach(p => {
          p.classList.remove("p2-locked");
          p.style.pointerEvents = "";
          const side = (p.getAttribute("data-side")||"").trim().toUpperCase();
          if(side === "L") leftBank.appendChild(p);
          else rightBank.appendChild(p);
        });
        w.remove();
      });
      shuffleAll();
      setScore(false);
      updateCheckState();
      try{ localStorage.removeItem(storageKey); }catch(_e){}
    }

    root.__p2 = { check, reset };

    if(btnShuffle) btnShuffle.addEventListener("click", shuffleAll);
    if(btnReset)   btnReset.addEventListener("click", reset);

    shuffleAll();
    loadState();
    setScore(false);
    updateCheckState();
  }

function autoMountPuzzle2(){
    const mounts = qsa("[data-p2]").filter(m => !m.hasAttribute("data-p2-mounted"));
    return mounts.map((m, idx) => {
      m.setAttribute("data-p2-mounted", "1");
      initPuzzle2(m, idx);

      let block = m.closest && m.closest(".wb-block");
      if(!block){
        const hasTitleAttr = m.hasAttribute("data-p2-title");
        const title = hasTitleAttr ? m.getAttribute("data-p2-title") : "Finde Paare";
        const hint = m.getAttribute("data-p2-hint") || "";
        const parent = m.parentNode;
        const next = m.nextSibling;
        block = wrapBlock("p2", {title, hint}, m);
        if(parent) parent.insertBefore(block, next);
      }

      ensureTaskIcon(block || m, "p2");
      return block || m;
    });
  }



 
  global.SBPuzzle2 = { autoMount: autoMountPuzzle2, mountOne: initPuzzle2 };
  global.SBBlocks = { createMCQ, createCloze, createOrder, createEssay, createReveal, createRevealImage, autoMount: autoMountBlocks, mountOne: mountBlockOne };
  global.SBBook   = { mount: mountBook, autoMount: autoMountBooks };
  global.SBTheme  = { mountOne: mountTheme, autoMount: autoMountThemes };
  global.SBLibrary = {
  autoMountAll: (opts={}) => ({
    books: autoMountBooks(opts),
    blocks: autoMountBlocks(opts),
    puzzle2: autoMountPuzzle2(),
    themes: autoMountThemes(opts)
  })
};

})(window);
