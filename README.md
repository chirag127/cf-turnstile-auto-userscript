# Cloudflare Turnstile Auto

Auto-clicks the Cloudflare Turnstile checkbox so non-interactive challenges complete
themselves. Spoofs `isTrusted` on pointer events (so the click looks "trusted") and
watches the shadow-DOM for the checkbox. No floating UI — settings open from the
**right-click context menu** only.

> ⚠️ Bypassing CAPTCHA / Turnstile challenges violates Cloudflare's ToS and most sites'
> ToS. Cloudflare will flag and block your IP if it detects automation. Use at your own
> risk — this is a gray-zone tool for testing your own sites or legitimate automation,
> not for attacking third parties.

## Install

[Install cf-turnstile-auto-userscript.user.js](https://github.com/chirag127/cf-turnstile-auto-userscript/raw/main/cf-turnstile-auto-userscript.user.js)

## Use

On a page with a Turnstile widget, right-click:

- **Auto-click ON/OFF** — toggles the watcher
- **Click now (manual)** — finds and clicks the checkbox immediately
- **Find checkbox** — logs whether the checkbox was found

## How it works

- `document-start` injection, patches `EventTarget.prototype.addEventListener` so
  synthetic `PointerEvent`s report `isTrusted: true`
- Watches the shadow-DOM for the Turnstile checkbox (usually an
  `input[type=checkbox]` inside an attached shadow root)
- When it appears and is unchecked, fires `pointerdown → pointerup → click`

## License

[MIT](LICENSE) © 2026 chirag127
