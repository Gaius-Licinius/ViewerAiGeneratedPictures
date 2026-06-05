---
title: Relocating files breaks frontend fetch URLs silently
date: 2026-06-05
category: anti-pattern
plans: []
tags: [web-app, viewer]
---

# Relocating files breaks frontend fetch URLs silently

## Context
During the refactoring, `config.json` was moved from `viewer/config.json` to `viewer/config/config.json`. The JavaScript fetch at `config.json` started returning the HTML index page instead (because the server serves `index.html` as the default for unknown paths).

## Insight
When moving files that are fetched by the frontend, the `fetch()` call may not throw an error — it just receives unexpected content. In this case, `config.json` resolved to the server root, served `index.html`, and `res.json()` parsed it as JSON which succeeded on the HTML content (or failed silently depending on content). The NSFW keywords array ended up empty, so NSFW detection silently stopped working.

## Evidence
The NSFW toggle stopped working after the config file was moved. The browser showed no console errors because the fetch succeeded (200 OK, served index.html). The bug was only caught during manual testing.

## Recommendation
After moving any file that is fetched by the frontend:
1. Grep the codebase for all HTTP fetch/resource URLs referencing the old path
2. Update all references in JavaScript, HTML, and CSS
3. Test the feature immediately after the move

Better yet: keep file paths stable once established, or use a build-time path resolution mechanism if the project grows.
