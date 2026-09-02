# Gmail Always Ask Save As

A tiny, ultra-light Chrome extension that **forces the "Save As" dialog only when downloading from Gmail**.

Leave Chrome's global setting `Ask where to save each file` **OFF** — this extension will still prompt you on `mail.google.com` and save everywhere else silently to your default folder.

## Why this exists

Chrome only has a global "Ask where to save" toggle. There's no per-site setting. If you want Save As *only* on Gmail (to sort attachments), you're stuck.

`chrome.downloads.onDeterminingFilename` with `saveAs: true` *should* do it, but Gmail serves attachments as `view=att&disp=safe` from `mail.google.com` / `mail-attachment.googleusercontent.com` and Chrome ignores `saveAs` for those. This extension uses a guaranteed fallback instead.

## How it works

**Ultra-light, wake-only-on-download** — no content scripts, no polling.

1. Listens to `chrome.downloads.onCreated` (wakes only when a download starts)
2. One sync check (hostname-based, no false positives on `github.com/.../gmail-extension`):
   ```js
   hostname === "mail.google.com" || hostname === "mail-attachment.googleusercontent.com"
   ```
3. If Gmail → `cancel()` the silent download → `download({ url, saveAs: true })` (always prompts)
4. If not Gmail → `return` immediately (~0.1ms)

**Hardened against loops:**
* `byExtensionId` check — ignores its own re-downloads (handles the `mail.google.com` → `googleusercontent.com` redirect)
* `startTime` age check — ignores old/resumed downloads from crashes (no startup spam)
* Rate-limit 1 prompt per 3s — hammering Cancel won't spawn 99 dialogs

Manifest V3 service worker sleeps until next download. No `tabs` permission needed in v1.0.6+.

## Install (Load unpacked)

1. Clone or download this repo
2. Go to `chrome://extensions/` → enable **Developer mode** (top right)
3. Click **Load unpacked** → select this folder
4. Done. Download an attachment on Gmail → picker appears. Download elsewhere → saves normally.

## Permissions

* `downloads` — to intercept and re-trigger downloads with `saveAs:true`. That's it.

No `tabs`, no host permissions, no data collection.

## Files

```
manifest.json   — Manifest V3, permissions: downloads only
background.js   — 1.6KB service worker, single onCreated listener
icon*.png       — icons
```

## Versions

* **v1.0.9** — Fix startup spam (age check) + Cancel loop (byExtensionId + rate-limit)
* **v1.0.8** — Fix Cancel re-trigger via `byExtensionId` + debounce
* **v1.0.7** — Fix infinite loop from URL mismatch after Gmail redirect
* **v1.0.6** — Ultra-light: wake only on `downloads.onCreated`, hostname check only
* **v1.0.5** — Fixed `Invalid filename` loop (don't pass `filename` to `download()`)
* **v1.0.4** — Switched from `onDeterminingFilename` (ignored) to `cancel+redownload` fallback
* **v1.0.1-1.0.3** — Diagnostic builds proving `saveAs` is ignored for `disp=safe`

## License

MIT — do what you want.
