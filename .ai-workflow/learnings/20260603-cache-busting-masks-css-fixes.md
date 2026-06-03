---
title: Stale browser cache masks CSS fixes — add Cache-Control from the start
date: 2026-06-03
category: anti-pattern
plans:
  - .ai-workflow/plans/20260428-ai-image-viewer.md
tags: [css, testing, viewer, web-app]
---

# Stale browser cache masks CSS fixes — add Cache-Control from the start

## Context

During UX improvements on the AI Image Viewer, a CSS fix for unreadable select dropdowns was deployed but appeared broken to the user. The fix was correct on disk and served correctly via HTTP, but the browser held a cached copy of `style.css` with the old rule.

## Insight

When iterating on CSS with a local `http.server`, the browser caches static assets aggressively. A fix can be deployed and correctly served, yet the user sees the old version — leading to wasted debugging cycles and frustration. The problem is invisible until someone tests with a fresh browser.

## Evidence

- 4 commits were spent on the select dropdown readability issue
- The actual fix (removing `color: var(--text)` from `.glass-input`) was in commit `e9e96f9` — but 3 more commits followed, trying to fix a problem that the served CSS had already solved
- HTTP verification (`Invoke-WebRequest`) showed the correct CSS, proving the issue was client-side
- The final fix (commit `d77b389`) added `Cache-Control: no-cache` server-side + `?v=2` query strings on asset URLs + `<meta>` no-cache tags — and the problem immediately vanished

## Recommendation

Add cache-busting before starting any CSS/JS iteration:
- Set `Cache-Control: no-cache, no-store, must-revalidate` via `end_headers()` in the server
- Append `?v=N` query strings to `<link>` and `<script>` tags in HTML
- Add `<meta http-equiv="Cache-Control" content="no-cache">` as a belt-and-suspenders measure
- Always verify fixes via HTTP (`curl` / `Invoke-WebRequest`), not just by reading files on disk
