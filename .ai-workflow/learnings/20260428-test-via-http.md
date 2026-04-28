---
title: Always test web apps via HTTP, not just disk files
date: 2026-04-28
category: anti-pattern
plans:
  - .ai-workflow/plans/20260428-ai-image-viewer.md
tags: [testing, web-app]
---

# Always test web apps via HTTP, not just disk files

## Context

During development of the AI Image Viewer, multiple bugs were missed because testing relied on reading source files from disk rather than fetching the actual served content via HTTP.

## Insight

File-on-disk verification (`Get-Content`, `node --check`) is insufficient for web apps. Stale server processes, caching, or encoding mismatches can cause the browser to receive different content than what exists on disk. Always test the actual HTTP response.

## Evidence

- 10 zombie Python processes on port 8080 served old CSS with `height: 100vh` while the file on disk was already fixed
- The wall mode appeared broken for hours because the served JavaScript still contained the old `renderWall()` empty method
- Disk hash vs served hash showed mismatches that were only detectable via HTTP fetch

## Recommendation

For every web app change: start the server, `Invoke-WebRequest` or `curl` every relevant file (HTML, CSS, JS, JSON), and verify the response contains the expected code. Never trust disk state alone.
