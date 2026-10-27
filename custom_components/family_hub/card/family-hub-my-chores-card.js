// family-hub-my-chores-card.js - DEPRECATED since v1.168.66.
//
// "My Chores" used to be its own small card: the signed-in person's own
// chores plus a claimable Chore Bin. The Chores card can now do the same
// thing with its "People on this card" option set to "Just me" (whoever is
// signed in - on a kiosk, whoever logged in with their PIN) plus the Chore
// Bin, so this separate ~1,500-line copy of the chores plumbing was retired
// (household ask: "depreciate my chores ... any current dashboards with my
// chores switches over to chores set as just me").
//
// Two layers keep existing dashboards working:
//  1. On startup the integration rewrites every saved (UI-edited)
//     dashboard, replacing `custom:family-hub-my-chores-card` with
//     `custom:family-hub-chores-card` + `people: [me, chore_bin]` (see
//     _migrate_my_chores_cards in __init__.py).
//  2. This file: anything that still says family-hub-my-chores-card (a
//     YAML-mode dashboard the integration can't rewrite, or a browser that
//     loaded the old config before the rewrite) renders a Chores card with
//     that same config instead. It's no longer offered in the card picker.
//
// The conversion below must stay identical to __init__.py's
// _my_chores_to_chores_config.
// ---- Family Hub shared translation helper (v1.168.76) -------------------
// __fhT(key, english, vars, mode) looks a string up in Home Assistant's
// loaded "fh_ui" translations (translations/<language>.json → fh_ui.text.*)
// and falls back to the English text written right here in the source.
// vars fill %0%, %1%, ... placeholders. mode "h" escapes the translated
// text (not the vars, which callers already prepared) for use inside HTML
// markup or an attribute value. Identical copy in every Family Hub card and
// in the Theme Builder panel - whichever loads first sets it up.
// __fhSweep(root) re-translates markup that was drawn before the language
// file finished loading (elements tagged data-fh-t / data-fh-title /
// data-fh-placeholder / data-fh-aria / data-fh-alt), but only while they
// still show the English original, so text a card later replaced with
// something else is never overwritten.
var __fhI18n = (window.__familyHubI18n = window.__familyHubI18n || { hass: null, fb: {}, loading: null, loaded: null });
var __fhEsc = function (s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
};
var __fhT = function (key, fb, vars, mode) {
  var g = window.__familyHubI18n || __fhI18n;
  if (g.fb[key] === undefined) g.fb[key] = fb;
  var str = "";
  try {
    if (g.hass && typeof g.hass.localize === "function") str = g.hass.localize("component.family_hub.fh_ui." + key) || "";
  } catch (e) {
    str = "";
  }
  if (!str) str = fb;
  if (mode === "h") str = __fhEsc(str);
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      var v = vars[k];
      str = str.split("%" + k + "%").join(v === null || v === undefined ? "" : String(v));
    });
  }
  return str;
};
var __fhUseHass = function (hass) {
  if (hass && typeof hass.localize === "function") (window.__familyHubI18n || __fhI18n).hass = hass;
};
var __fhSweep = function (root) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  var g = window.__familyHubI18n || __fhI18n;
  root.querySelectorAll("[data-fh-t]").forEach(function (el) {
    var key = el.getAttribute("data-fh-t");
    var fb = g.fb[key];
    if (fb === undefined) return;
    var cur = (el.textContent || "").trim();
    if (cur !== fb && cur !== el.__fhShown) return;
    var next = __fhT(key, fb);
    if (cur !== next) el.textContent = next;
    el.__fhShown = next;
  });
  [["data-fh-title", "title"], ["data-fh-placeholder", "placeholder"], ["data-fh-aria", "aria-label"], ["data-fh-alt", "alt"]].forEach(function (pair) {
    root.querySelectorAll("[" + pair[0] + "]").forEach(function (el) {
      var key = el.getAttribute(pair[0]);
      var fb = g.fb[key];
      if (fb === undefined) return;
      var cur = el.getAttribute(pair[1]);
      var shownKey = "__fhShown_" + pair[1];
      if (cur !== fb && cur !== el[shownKey]) return;
      var next = __fhT(key, fb);
      if (cur !== next) el.setAttribute(pair[1], next);
      el[shownKey] = next;
    });
  });
};
// -------------------------------------------------------------------------

(function () {
  if (customElements.get("family-hub-my-chores-card")) return;

  function myChoresToChoresConfig(config) {
    const out = {};
    Object.keys(config || {}).forEach((key) => {
      if (key !== "type") out[key] = config[key];
    });
    out.title = (config && config.title) || __fhT("text.my_chores", "My Chores");
    out.people = ["me", "chore_bin"];
    out.show_waiting_to_recur = false;
    return out;
  }
  window.__familyHubMyChoresToChoresConfig = myChoresToChoresConfig;

  class FamilyHubMyChoresCard extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this._root.innerHTML = "<style>:host { display: block; height: 100%; } .fh-my-chores-wait { padding: 12px; font-size: 13px; opacity: .7; }</style>";
    }
    static getStubConfig() {
      return { title: "My Chores" };
    }
    setConfig(config) {
      this._choresConfig = myChoresToChoresConfig(config);
      if (this._inner) this._inner.setConfig(this._choresConfig);
      else this._mount();
    }
    set hass(hass) {
      this._hass = hass;
      __fhUseHass(hass);
      if (this._inner) this._inner.hass = hass;
    }
    get hass() {
      return this._hass;
    }
    _mount() {
      if (this._mounting) return;
      this._mounting = true;
      // The Chores card is its own dashboard resource (registered
      // automatically alongside this one). If it somehow never loads, say
      // so instead of staying blank.
      const waitTimer = setTimeout(() => {
        if (this._inner) return;
        const note = document.createElement("div");
        note.className = "fh-my-chores-wait";
        note.textContent = __fhT("text.my_chores_is_now_part_of_the_chores", "My Chores is now part of the Chores card. Waiting for the Family Hub Chores card to load - if this stays, reload the page or replace this card with the Chores card (People on this card: Just me).");
        this._root.appendChild(note);
      }, 8000);
      customElements.whenDefined("family-hub-chores-card").then(() => {
        clearTimeout(waitTimer);
        const stale = this._root.querySelector(".fh-my-chores-wait");
        if (stale) stale.remove();
        const el = document.createElement("family-hub-chores-card");
        el.style.display = "block";
        el.style.height = "100%";
        el.setConfig(this._choresConfig);
        if (this._hass) el.hass = this._hass;
        this._inner = el;
        this._root.appendChild(el);
      });
    }
    getCardSize() {
      return this._inner && typeof this._inner.getCardSize === "function" ? this._inner.getCardSize() : 6;
    }
  }

  customElements.define("family-hub-my-chores-card", FamilyHubMyChoresCard);
})();
