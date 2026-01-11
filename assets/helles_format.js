/* wellen_library_v2.js
   WellenBook (Topbar + Sidebar + Paging) + WellenBlocks (MCQ/Cloze/Essay)
   autoNav: Navigation automatisch aus Überschriften + Block-Titeln

   Einbindung:
     <link rel="stylesheet" href="wellen_library_v2.css">
     <script src="wellen_library_v2.js"></script>

   Init:
     WellenBook.autoMount();
     WellenBlocks.autoMount();
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
    const title = cfg.title || ({mcq:"Multiple Choice", cloze:"Lückentext (Drag the Words)", essay:"Essay / Freitext"}[type] || "Baustein");
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

    cfg.questions.forEach((q, qi) => {
      const qEl = el("div", {class:"wb-q", "data-qi": String(qi)});
      qEl.appendChild(el("h3", {}, [`${qi+1}. ${q.text || ""}`]));
      const type = q.multiple ? "checkbox" : "radio";
      const name = `wbq_${cfg.id || "mcq"}_${qi}`;
      (q.choices || []).forEach(choice => {
        const inp = el("input", {type, name, value: choice.id || ""});
        const label = el("label", {class:"wb-choice"}, [inp, el("span", {}, [choice.label || ""])]);
        qEl.appendChild(label);
      });
      const fb = el("div", {class:"wb-feedback", "data-feedback":"1"});
      qEl.appendChild(fb);
      container.appendChild(qEl);
      qEls.push(qEl);
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
    }
    const controls = el("div", {class:"wb-row"}, [
      el("button", {class:"wb-btn primary", type:"button", onclick: check}, ["Überprüfen"]),
      el("button", {class:"wb-btn", type:"button", onclick: reset}, ["Zurücksetzen"]),
      scoreEl
    ]);
    return { node: wrapBlock("mcq", cfg, el("div", {}, [container, controls])), check, reset };
  }

  function createCloze(cfg){
    if(!Array.isArray(cfg.bank)) throw new Error("Cloze: cfg.bank must be an array");
    if(!Array.isArray(cfg.segments)) throw new Error("Cloze: cfg.segments must be an array");
    const bank = el("div", {class:"wb-bank", "data-bank":"1"});
    const scoreEl = el("div", {class:"wb-score", "aria-live":"polite"});
    const gaps = [];

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
    }
    const hint = el("div", {class:"wb-drop-hint"}, [cfg.dropHint || "Hinweis: Ziehe Wörter in die Lücken. Klick = zurück in Wortbank."]);
    const controls = el("div", {class:"wb-row"}, [
      el("button", {class:"wb-btn primary", type:"button", onclick: check}, ["Überprüfen"]),
      el("button", {class:"wb-btn", type:"button", onclick: reset}, ["Zurücksetzen"]),
      scoreEl
    ]);
    return { node: wrapBlock("cloze", cfg, el("div", {}, [bank, text, hint, controls])), check, reset };
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

  function mountBlockOne(mountEl, opts={}){
  const type = (mountEl.getAttribute("data-wb-type") || "").trim();

  const cfgScript = qs("script.wb-config[type='application/json']", mountEl);
  if(!cfgScript){
    console.warn(`[WellenBlocks] Skip: Missing wb-config JSON for data-wb-type="${type}"`, mountEl);
    // Wichtig: NICHT throwen, sonst bricht alles ab
    return null;
  }

  let cfg;
  try{
    cfg = JSON.parse(cfgScript.textContent);
  }catch(err){
    console.warn("[WellenBlocks] Skip: Invalid JSON in wb-config", err, mountEl);
    return null;
  }

  if(opts.storagePrefix && cfg.storagePrefix == null) cfg.storagePrefix = opts.storagePrefix;

  let inst;
  if(type === "mcq") inst = createMCQ(cfg);
  else if(type === "cloze") inst = createCloze(cfg);
  else if(type === "essay") inst = createEssay(cfg);
  else{
    console.warn(`[WellenBlocks] Skip: Unknown data-wb-type="${type}"`, mountEl);
    return null;
  }

  mountEl.innerHTML = "";
  mountEl.appendChild(inst.node);
  return inst;
}



  function autoMountBlocks(opts={}){
  const mounts = qsa("[data-wb-type]").filter(m => !m.hasAttribute("data-wb-mounted"));
  return mounts.map(m => {
    m.setAttribute("data-wb-mounted","1");
    return mountBlockOne(m, opts);
  }).filter(Boolean);
}


  // ---------- Book + autoNav ----------
  function buildAutoNav(bookMountEl, cfg){
    const headings = Array.isArray(cfg.autoNavHeadings) && cfg.autoNavHeadings.length ? cfg.autoNavHeadings : ["h1","h2"];
    const includeBlocks = cfg.autoNavIncludeBlocks !== false;
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

    const pages = qsa("[data-wb-page]", bookEl).map(n => ({node:n, page:Number(n.getAttribute("data-wb-page")||"1")})).sort((a,b)=>a.page-b.page);
    if(!pages.length) throw new Error("WellenBook: keine Seiten (data-wb-page) gefunden.");
    const maxPage = cfg.maxPage || Math.max(...pages.map(p=>p.page));

    let groups = cfg.groups;
    if(cfg.autoNav) groups = buildAutoNav(bookEl, {...cfg, bookTitle, sectionTitle});
    if(!Array.isArray(groups)) groups = [];

    const initialHash = (global.location && global.location.hash) ? global.location.hash : "";

    // Build skeleton
    const root = el("div", {class:"wb-book"});
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
          el("svg", {width:"20", height:"20", viewBox:"0 0 24 24", html:'<path d="M7 14H5v5h5v-2H7v-3zm0-4h2V7h3V5H5v5zm10 9h-3v2h5v-5h-2v3zm0-14V7h-3v2h5V5h-2z"/>'})
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
    sideNav.appendChild(el("div", {class:"wb-side-section-title"}, [sectionTitle]));
    const navLinks = [];

    groups.forEach((g, gi) => {
      const det = el("details", {class:"wb-group", ...(g.open ? {open:""} : {})});
      det.appendChild(el("summary", {}, [
        el("span", {}, [g.title || `Gruppe ${gi+1}`]),
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

    sideNav.appendChild(el("div", {class:"wb-side-footer"}, [
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

    const pageSections = () => qsa("[data-wb-page]", root).map(n => ({node:n, page:Number(n.getAttribute("data-wb-page")||"1")}));
    const setActiveByLink = (link) => { navLinks.forEach(x=>x.classList.remove("active")); if(link) link.classList.add("active"); };
    const firstLinkOfPage = (p) => navLinks.find(a => Number(a.getAttribute("data-wb-page")||"1")===p) || null;

    function showPage(n, scrollToSel){
      const idx = Math.max(1, Math.min(maxPage, n));
      nowEl.textContent = String(idx);
      pageSections().forEach(p => p.node.style.display = (p.page === idx) ? "" : "none");
      prevBtn.disabled = idx <= 1;
      nextBtn.disabled = idx >= maxPage;

      const active = navLinks.find(a => a.classList.contains("active"));
      if(!active || Number(active.getAttribute("data-wb-page")||"1") !== idx) setActiveByLink(firstLinkOfPage(idx));

      if(scrollToSel){
        const target = qs(scrollToSel, root);
        if(target) target.scrollIntoView({behavior:"smooth", block:"start"});
      }else{
        paper.scrollIntoView({behavior:"instant", block:"start"});
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
      showPage(page, target);
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
      if(cfg.onSubmit === "alert") alert("Demo: Hier könntest du eine Zusammenfassung/Abgabe-Funktion einbauen.");
      else if(typeof opts.onSubmit === "function") opts.onSubmit({root, cfg});
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


  // ---------- Puzzle2 (2-Teile zusammenführen) ----------
    // ---------- Puzzle2 (STRICT, 2 banks: left/right, NO pointer-capture) ----------
    // ---------- Puzzle2 (STRICT, 2 banks: left/right, Pointer+Touch+Mouse) ----------
  function initPuzzle2(root){
    const leftBank  = qs("[data-left-bank]", root);
    const rightBank = qs("[data-right-bank]", root);
    const solved    = qs("[data-solved]", root);
    const scoreEl   = qs("[data-score]", root);
    const btnShuffle= qs("[data-shuffle]", root);
    const btnReset  = qs("[data-reset]", root);
    const btnCheck  = qs("[data-check]", root);


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

  // Merken für spätere Überprüfung
  wrap.dataset.correct = isCorrectPair(left, right) ? "1" : "0";

  lockPiece(left);
  lockPiece(right);

  solved.appendChild(wrap);
  setScore(false); // noch nicht bewerten
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
      // ---- Touch fallback (ältere iPads) ----
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
    }

    if(btnShuffle) btnShuffle.addEventListener("click", shuffleAll);
    if(btnReset)   btnReset.addEventListener("click", reset);

    shuffleAll();
    setScore(false);
  }

  function autoMountPuzzle2(){
    const mounts = qsa("[data-p2]").filter(m => !m.hasAttribute("data-p2-mounted"));
    return mounts.map(m => {
      m.setAttribute("data-p2-mounted", "1");
      initPuzzle2(m);
      return m;
    });
  }



 
  global.WellenPuzzle2 = { autoMount: autoMountPuzzle2, mountOne: initPuzzle2 };
  global.WellenBlocks = { createMCQ, createCloze, createEssay, autoMount: autoMountBlocks, mountOne: mountBlockOne };
  global.WellenBook   = { mount: mountBook, autoMount: autoMountBooks };
  global.WellenLibrary = {
  autoMountAll: (opts={}) => ({
    books: autoMountBooks(opts),
    blocks: autoMountBlocks(opts),
    puzzle2: autoMountPuzzle2()
  })
};

})(window);
