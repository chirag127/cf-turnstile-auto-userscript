// ==UserScript==
// @name         Cloudflare Turnstile Auto
// @namespace    https://github.com/chirag127
// @version      1.0.0
// @description  Auto-clicks the Cloudflare Turnstile checkbox so non-interactive challenges complete themselves. Uses isTrusted-spoofed pointer events on the shadow-DOM checkbox. No UI floater — settings open from the right-click context menu only.
// @author       chirag127
// @license      MIT
// @match        https://*.challenges.cloudflare.com/*
// @match        https://*.turnstile.com/*
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Cloudflare Turnstile auto-pass. Patches EventTarget.addEventListener
   * so that synthetic PointerEvents report isTrusted:true, then watches
   * the shadow-DOM for the Turnstile checkbox and clicks it when it
   * appears. Settings (auto-enable / manual trigger) open from the
   * right-click context menu only — no floating UI.
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = "cf-turnstile-auto";

  const getOpts = () => {
    try {
      return Object.assign(
        { enabled: false, autoClick: true, spoofTrusted: true },
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      );
    } catch {
      return { enabled: false, autoClick: true, spoofTrusted: true };
    }
  };
  const setOpts = (o) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch {} };

  /* --------------------------- isTrusted spoofing ------------------- */
  function spoofTrustedEvents() {
    if (!getOpts().spoofTrusted) return;
    try {
      const origAdd = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, listener, opts) {
        if (typeof listener !== "function") {
          origAdd.call(this, type, listener, opts);
          return;
        }
        const wrapped = (evt) => {
          try {
            Object.defineProperty(evt, "isTrusted", {
              get: () => true,
              configurable: true,
            });
          } catch { /* event is frozen on some engines; ignore */ }
          listener.call(this, evt);
        };
        origAdd.call(this, type, wrapped, opts);
      };
    } catch {
      console.warn("[CF Turnstile] isTrusted spoofing failed");
    }
  }

  /* --------------------------- find the checkbox -------------------- */
  function findTurnstileCheckbox() {
    // Turnstile renders its checkbox in an attached shadow root
    const root = document.querySelector("#turnstile") ||
      document.querySelector('[id*="turnstile"]') ||
      document.querySelector('iframe[src*="challenges.cloudflare"]');
    if (!root) return null;

    // The checkbox is often an input[type=checkbox] inside the shadow tree
    const shadow = root.shadowRoot || document;
    return (
      shadow.querySelector('input[type="checkbox"]') ||
      shadow.querySelector('[aria-label*="checkbox" i]') ||
      shadow.querySelector(".cb-c") // Turnstile's internal checkbox class
    );
  }

  function clickCheckbox(cb) {
    if (!cb) return false;
    // Turnstile validates pointer event ordering: pointerdown → pointerup → click
    const opts = { bubbles: true, cancelable: true, composed: true, isPrimary: true, pointerId: -1, view: window };
    cb.dispatchEvent(new PointerEvent("pointerdown", opts));
    cb.dispatchEvent(new PointerEvent("pointerup", opts));
    cb.click();
    return true;
  }

  /* --------------------------- watcher ------------------------------ */
  function startWatcher() {
    const o = getOpts();
    if (!o.enabled || !o.autoClick) return;

    const obs = new MutationObserver(() => {
      const cb = findTurnstileCheckbox();
      if (cb && !cb.checked) {
        // Wait a beat so the checkbox is fully interactive
        setTimeout(() => {
          if (cb && !cb.checked) {
            const ok = clickCheckbox(cb);
            if (ok) console.log("[CF Turnstile] clicked checkbox");
          }
        }, 400);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* --------------------------- right-click menu --------------------- */
  let menuEl = null;
  function dismissMenu() {
    if (document.body.contains(menuEl)) document.body.removeChild(menuEl);
    document.removeEventListener("click", dismissMenu, true);
    document.removeEventListener("keydown", onKey, true);
  }
  function onKey(e) { if (e.key === "Escape") dismissMenu(); }

  function openMenu(x, y) {
    dismissMenu();
    menuEl = document.createElement("div");
    Object.assign(menuEl.style, {
      position: "fixed", left: x + "px", top: y + "px",
      zIndex: 2147483647, background: "#1a1a1a", color: "#eee",
      border: "1px solid #333", borderRadius: "8px",
      boxShadow: "0 10px 30px rgba(0,0,0,.55)",
      font: "13px/1.45 system-ui", minWidth: "240px", overflow: "hidden",
    });

    const row = (label, action, ico, tag) => {
      const a = document.createElement("div");
      Object.assign(a.style, {
        padding: "8px 14px", cursor: "pointer", borderBottom: "1px solid #262626",
        display: "flex", gap: "8px", alignItems: "center",
      });
      a.addEventListener("mouseenter", () => (a.style.background = "#262626"));
      a.addEventListener("mouseleave", () => (a.style.background = "transparent"));
      const s = document.createElement("span"); s.textContent = ico || "•"; s.style.width = "18px"; s.style.textAlign = "center";
      const t = document.createElement("span"); t.style.flex = "1"; t.textContent = label;
      const g = tag ? document.createElement("span") : null;
      if (g) { g.textContent = tag; g.style.color = "#888"; g.style.fontSize = "11px"; }
      a.append(s, t, g);
      a.addEventListener("click", () => { dismissMenu(); action(); });
      menuEl.appendChild(a);
    };

    menuEl.innerHTML = "";
    const o = getOpts();
    row(o.enabled ? "Auto-click: ON" : "Auto-click: OFF", () => {
      const n = getOpts(); n.enabled = !n.enabled; setOpts(n);
      if (n.enabled && n.autoClick) startWatcher();
      console.log("[CF Turnstile] auto-click " + (n.enabled ? "on" : "off"));
    }, "⚡", o.enabled ? "on" : "off");

    row("Click now (manual)", () => {
      const cb = findTurnstileCheckbox();
      if (clickCheckbox(cb)) console.log("[CF Turnstile] manual click ok");
      else console.log("[CF Turnstile] no checkbox found");
    }, "🖱", "");

    row("Find checkbox", () => {
      const cb = findTurnstileCheckbox();
      console.log("[CF Turnstile] checkbox found:", cb ? "yes" : "no");
    }, "🔍", "");

    document.body.appendChild(menuEl);
    document.addEventListener("click", dismissMenu, true);
    document.addEventListener("keydown", onKey, true);
  }

  /* --------------------------- wiring ------------------------------- */
  function init() {
    spoofTrustedEvents();

    document.addEventListener("contextmenu", (e) => {
      const o = getOpts();
      if (!o.enabled) return;
      // Show the menu on any page that could host a Turnstile widget
      const hasWidget =
        document.querySelector("#turnstile, [id*='turnstile'], iframe[src*='challenges.cloudflare']");
      if (!hasWidget) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY);
    });

    startWatcher();
  }

  init();
})();
