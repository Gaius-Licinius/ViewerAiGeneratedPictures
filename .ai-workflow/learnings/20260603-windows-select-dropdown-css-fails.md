---
title: Windows renders select dropdown natively — CSS option styling is unreliable
date: 2026-06-03
category: anti-pattern
plans:
  - .ai-workflow/plans/20260428-ai-image-viewer.md
tags: [css, viewer, web-app]
---

# Windows renders select dropdown natively — CSS option styling is unreliable

## Context

The AI Image Viewer has a dark glass theme. The model filter `<select>` inherited `color: var(--text)` (white) from `body`, making dropdown options invisible against the white native Windows dropdown background. Multiple attempts to override `option { color }` or `option { background }` via CSS had no effect.

## Insight

On Windows, the `<select>` dropdown is rendered by the OS, not the browser. CSS properties on `<option>` elements (color, background) are largely ignored. The reliable approach is to control the select's own `color` and `background`, letting the options inherit naturally. This means the select must have a light enough background and dark enough text to be readable in its closed state, while the dropdown options inherit the dark text and render on the native white background.

## Evidence

- 3 consecutive commits tried `option { color: #111 }`, `option { background: #fff }`, and various combinations — none worked reliably
- The root cause was `body { color: var(--text) }` cascading white onto the select
- The fix: remove `color` from the generic `.glass-input` rule, keep `color: var(--text)` only on `#search`, and set `color: #111` + `background: rgba(255,255,255,0.15)` explicitly on `#model-filter`

## Recommendation

- Never rely on CSS `option` styling for Windows-targeted web apps
- Keep `body` text color neutral or set explicit colors on all form controls
- For dark-themed apps: give selects a lighter glass background so dark text is readable both when closed and in the native dropdown
