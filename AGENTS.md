# AGENTS.md - cf-turnstile-auto-userscript

Single-file userscript. `cf-turnstile-auto-userscript.user.js` at repo root IS the product. No build, no deps, `@grant none`.

## Method

| Mechanism | What it does |
|-----------|--------------|
| isTrusted spoof | Patches `EventTarget.prototype.addEventListener` so synthetic `PointerEvent`s report `isTrusted: true` |
| Shadow-DOM watch | MutationObserver on `document.documentElement`; finds `input[type=checkbox]` / `[aria-label*=checkbox]` / `.cb-c` inside Turnstile's shadow root |
| Click sequence | `pointerdown → pointerup → click` on the checkbox |

Settings open **only** from the right-click context menu (transient DOM menu on `contextmenu`
event). No floating panels/chips. `@grant none`, `@run-at document-start`.

## Rules

- One file, zero build step. `@match` includes the Cloudflare challenge domains + `*://*/*`.
- Auto-click is OFF by default (safe); the user opts in via the right-click menu.
- This script does NOT bypass managed challenges (the "Verifying you are human" full-page
  interstitial) — only the non-interactive checkbox. Managed challenges need the
  `captcha-solver` AI path or a headless-browser tool.
- Gray zone: bypassing Turnstile violates Cloudflare's ToS. The user bears the risk.

## Install docs

Shared guide: https://github.com/chirag127/userscript-install-guide

## Test

`sctl install ./cf-turnstile-auto-userscript.user.js`, open a page with a Turnstile widget,
right-click → **Click now (manual)**, confirm the checkbox clicks (console logs "manual
click ok").

Documentation is single-sourced at `c:\ws\docs\okf\`. Your note: `c:\ws\docs\okf\scripts\cf-turnstile-auto-userscript.md`. Do not create an `okf/` folder here.
