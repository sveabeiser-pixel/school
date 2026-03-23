// scorm.js (SCORM 1.2 minimal)
function scormGetAPI() {
  let w = window;
  for (let i = 0; i < 20; i++) {
    if (w.API) return w.API;             // SCORM 1.2
    if (!w.parent || w.parent === w) break;
    w = w.parent;
  }
  return null;
}

const SCORM = {
  api: null,
  inited: false,

  init() {
    this.api = scormGetAPI();
    if (!this.api) return false;
    try {
      this.inited = (this.api.LMSInitialize("") === "true");
    } catch (e) {
      this.inited = false;
    }
    return this.inited;
  },

  setScore(raw, max = 100, min = 0) {
    if (!this.inited) return;
    this.api.LMSSetValue("cmi.core.score.raw", String(raw));
    this.api.LMSSetValue("cmi.core.score.max", String(max));
    this.api.LMSSetValue("cmi.core.score.min", String(min));
  },

  setStatus(status) {
    // "completed" oder "passed"/"failed"
    if (!this.inited) return;
    this.api.LMSSetValue("cmi.core.lesson_status", status);
  },

  commit() {
    if (!this.inited) return;
    this.api.LMSCommit("");
  },

  finish() {
    if (!this.inited) return;
    this.api.LMSCommit("");
    this.api.LMSFinish("");
    this.inited = false;
  }
};

// Auto-init beim Laden
window.addEventListener("load", () => SCORM.init());

// Sicheres Beenden (z. B. Tab schließen)
window.addEventListener("beforeunload", () => {
  try { SCORM.finish(); } catch (e) {}
});
