---
title: ES modules are ideal for vanilla JS refactoring without a build step
date: 2026-06-05
category: pattern
plans: []
tags: [web-app, viewer]
---

# ES modules are ideal for vanilla JS refactoring without a build step

## Context
Refactored `app.js` (1164-line monolithic class) into 11 ES module files. The project has no npm, no webpack, no build step — just a Python server serving static files.

## Insight
`<script type="module" src="js/app.js">` works natively in all modern browsers (Chrome 61+, Firefox 60+, Safari 11+) and provides:
- Clean `import`/`export` syntax
- Proper scoping (no global namespace pollution)
- Single entry point in `index.html` — all dependencies resolved by the browser
- No tooling overhead whatsoever

One caveat: ES modules use strict mode by default, so `'use strict'` is redundant but harmless.

## Evidence
The refactored structure has 11 modules in `viewer/js/` with clear responsibilities (store, controls, wall, grid, fullscreen, slideshow, zoom, touch, details, utils). Each module exports one class (except utils.js which exports pure functions). The `App` class in `app.js` imports all modules and orchestrates them.

## Recommendation
For any vanilla JS project targeting modern browsers, prefer ES modules over multiple `<script>` tags. It provides proper dependency management without requiring a bundler. One `<script type="module">` tag is cleaner than 10+ `<script>` tags.
