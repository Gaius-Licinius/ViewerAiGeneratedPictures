---
title: AI Image Viewer — Core
date: 2026-04-28
status: done
ideas:
  - .ai-workflow/ideas/20260428-ai-image-viewer.md
group: ai-image-viewer
phase: 1
tags: [ai-images, metadata, nsfw-detection, viewer, web-app]
---

# AI Image Viewer — Core

## Goal

A working local web app that launches with a single `python server.py` command, scans `C:\IA\Collection` (~1268 images, 64 date folders), extracts Stable Diffusion metadata from PNGs, and provides a zero-chrome glass-style viewer with infinite wall, fullscreen + filmstrip, model/prompt filters, NSFW toggle, and favorites.

## Background

Full context in `.ai-workflow/ideas/20260428-ai-image-viewer.md`. The Windows default viewer is unreliable and cannot navigate across subdirectories. All images are PNGs with SD metadata in the `tEXt` chunk under the key `parameters`.

## Research Summary

- **Stack**: Python 3 built-in `http.server` + vanilla HTML/CSS/JS. Zero npm, zero Node.js.
- **Metadata**: Backend pre-scans PNGs once, writes `index.json` served statically. Browser loads it once.
- **Virtual scrolling**: Vanilla `IntersectionObserver` — keep ~50 DOM nodes active max.
- **Glass UI**: `backdrop-filter: blur()` CSS, supported since 2019.
- **Fullscreen viewer**: Custom implementation with filmstrip — or `viewerjs` (vanilla JS, MIT) for zoom/rotate if needed.
- **Thumbnails**: Serve PNGs directly with `loading="lazy"` and CSS `object-fit: cover` for grid/wall; optional resize endpoint via Pillow if performance demands it.

## Steps

### 1. Project scaffold

Create the `viewer/` directory with all the files this project needs:
```
viewer/
  server.py          # HTTP server + metadata scanner
  index.html         # Single-page app shell
  style.css          # Glass dark theme
  app.js             # All frontend logic
```
`server.py` starts with a shebang, imports (`http.server`, `os`, `json`, `struct`, `pathlib`), and a `main()` that calls `scan_and_build_index()` then starts the HTTP server.

`index.html` is a minimal HTML5 document linking `style.css` and `app.js` (type="module").

`style.css` sets up `:root` dark variables, `body` background `#0a0a0a`, global box-sizing.

`app.js` starts with `'use strict'`, imports nothing, defines the `App` class or module-pattern entry point.

### 2. PNG metadata scanner

In `server.py`, implement `scan_collection(root_dir)`:
- Walk all `.png` files under `root_dir` (C:\IA\Collection)
- For each PNG, read the 8-byte signature, then iterate chunks
- When chunk type equals `tEXt`, read keyword (null-terminated)
- If keyword is `parameters`, decode the value as Latin-1 (`latin-1`) to extract:
  - First line → prompt
  - Lines after → parse `key: value` pairs for steps, sampler, cfg_scale, seed, size, model_hash, model_name, version
  - Also store relative path, folder date, filename
- Write the result as `viewer/index.json` (array of objects)

Add caching: if `index.json` exists and its mtime is newer than the newest file in the collection, skip rescan.

### 3. HTTP server

In `server.py`, extend `http.server.SimpleHTTPRequestHandler`:
- Serve static files from `viewer/` directory (index.html, style.css, app.js, index.json)
- Serve image files from `C:\IA\Collection` via a `/images/` URL prefix that maps to the collection root
- Add proper Content-Type headers for `.png` (image/png), `.json` (application/json), `.html`, `.css`, `.js`
- Bind to `0.0.0.0:8080` for LAN access
- Print a clear startup message: `Viewer running at http://localhost:8080`

### 4. Glass UI shell

In `index.html`:
- A `<div id="app">` container
- A hidden controls overlay (`<div id="controls" class="glass-panel">`) containing:
  - Search input for prompt text
  - Model filter `<select>` dropdown
  - NSFW toggle (checkbox + label)
  - View mode buttons: wall, grid, fullscreen
  - Favorites count / toggle
- An image container (`<div id="viewer">`) that switches content based on mode

In `style.css`:
- Glass panels with `background: rgba(255,255,255,0.06)`, `backdrop-filter: blur(16px)`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 12px`
- Controls: fixed position, shown on hover/mouse-move, auto-hide after 3s inactivity via CSS transition `opacity`
- Image container: fills viewport, `display: flex`, dark background
- Fullscreen mode: black background, image centered, max-height/max-width 100vh/100vw

### 5. Infinite wall view (default)

In `app.js`:
- Fetch `index.json` on load, store in memory
- Render a virtualized wall using CSS columns + `IntersectionObserver`
- Only ~40-60 `<img>` elements exist in DOM at any time
- Each image is a `<div class="wall-item">` containing an `<img loading="lazy">`
- On click, switch to fullscreen mode for that image
- Handle scroll events to recycle DOM nodes as user scrolls
- Lazy load images as they enter viewport (IntersectionObserver threshold 0.1)

In `style.css`:
- `.wall-container` uses CSS columns (`column-width: 280px`, `column-gap: 8px`)
- `.wall-item` has `break-inside: avoid`, `margin-bottom: 8px`, rounded corners, hover scale effect

### 6. Fullscreen + filmstrip

In `app.js`:
- Fullscreen mode shows selected image centered, max viewport size
- Keyboard navigation: ArrowLeft/ArrowRight for prev/next, Escape to return to wall
- Filmstrip: horizontal bar at bottom (glass-style), shows ~10 adjacent thumbnails, click to jump
- Preload +-5 images around current
- Click on background area outside image returns to wall view

In `style.css`:
- `.fullscreen-overlay`: fixed, full viewport, z-index 1000, background rgba(0,0,0,0.95)
- `.fullscreen-image`: centered, `object-fit: contain`, transition opacity 0.2s on change
- `.filmstrip`: absolute bottom, full width, height ~100px, horizontal scroll, glass-style
- `.filmstrip-thumb`: inline-block, height 80px, margin 4px, border 2px transparent, active border white

### 7. Filters, NSFW, and Favorites

In `app.js`:
- **Search filter**: text input, filters images whose prompt contains the query (case-insensitive)
- **Model filter**: populate `<select>` from unique model names in index.json; selecting filters to that model
- **NSFW detection**: on load, scan each image's prompt against a predefined keyword list. Words: `nsfw`, `nude`, `naked`, `explicit`, `porn`, `hentai`, `erotic`, `nsfw,`, `lewd`, `adult`. Configurable via a `nsfw_keywords` array in code. Toggle shows/hides flagged images.
- **Favorites**: click a heart/star icon on each image (in wall and filmstrip). Store array of image IDs in `localStorage`. Show "Favorites only" toggle in controls. Heart icon filled when favorited.
- All filters combine (AND logic): search + model + nsfw_toggle + favorites_toggle

## Acceptance Criteria

- [ ] `python server.py` starts and prints a local URL
- [ ] Browser at that URL shows the infinite wall view with all ~1268 images
- [ ] Scrolling is smooth — no jank, images lazy-load
- [ ] Clicking an image opens it fullscreen with filmstrip thumbnails
- [ ] Arrow keys navigate fullscreen, Escape returns to wall
- [ ] Prompt search filters images in real-time
- [ ] Model dropdown filters correctly
- [ ] NSFW toggle hides/shows flagged images
- [ ] Favorites persist across page reloads (localStorage)
- [ ] Zero-chrome: controls appear on hover, hide after inactivity
- [ ] Keyboard navigation works reliably (no blocking)
- [ ] Glass-morphism visual style is consistent

## Dependencies

- Python 3.8+ with standard library only (http.server, json, os, struct, pathlib)
- No external Python packages required for core (Pillow optional for thumbnail resize)
- Modern browser with `backdrop-filter` support (Chrome 76+, Edge 79+, Firefox 103+, Safari 9+)

## Related Documents

- .ai-workflow/ideas/20260428-ai-image-viewer.md
- .ai-workflow/learnings/20260428-test-via-http.md
- .ai-workflow/learnings/20260428-css-columns-fixed-height.md
- .ai-workflow/learnings/20260428-multi-format-png-metadata.md
- .ai-workflow/learnings/20260428-shared-config-file.md
- .ai-workflow/learnings/20260603-cache-busting-masks-css-fixes.md
- .ai-workflow/learnings/20260603-windows-select-dropdown-css-fails.md
- .ai-workflow/learnings/20260603-comfyui-ksampler-class-names-vary.md
- .ai-workflow/learnings/20260603-threading-mixin-accelerates-local-server.md
