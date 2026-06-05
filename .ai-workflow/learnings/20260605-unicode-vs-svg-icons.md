---
title: Prefer SVG icons over Unicode characters for UI buttons
date: 2026-06-05
category: anti-pattern
plans: []
tags: [css, icons, viewer, web-app]
---

# Prefer SVG icons over Unicode characters for UI buttons

## Context
The toolbar buttons (wall, grid, fullscreen, rescan) initially used Unicode characters as icons: `□` (fullscreen), `▮▮`/`▯▯` (wall/grid), `↻` (rescan). Each was problematic in different ways.

## Insight
Unicode characters are unreliable as UI icons because:
- **Inconsistent sizing across platforms**: the dice `⚂` was too small and needed per-platform CSS overrides
- **Ambiguous meaning**: `↻` reads as "refresh" not "scan", `□` as "stop/square" not "fullscreen"
- **No color inheritance**: unlike SVGs with `fill="currentColor"`, Unicode inherits text color but can't be filtered or styled individually
- **Limited choices**: finding semantically appropriate symbols in Unicode is constrained

Switching to Bootstrap SVG icons solved all these problems:
- Consistent rendering at any size via `width`/`height` attributes
- Clear semantic meaning (bootstrap-icons has purpose-built icons)
- `filter: invert(1)` + `opacity` makes them work on dark themes
- Stored as standalone files in `viewer/icons/`, referenced via `<img>` tags

## Evidence
The rescan icon alone went through 5 iterations: `↻` → `🔍` → custom SVG → redesigned SVG → Bootstrap `database-up`. The final Bootstrap icon worked immediately with no sizing issues.

## Recommendation
Start with Bootstrap Icons (or any SVG icon library) from the beginning. Never use Unicode characters as primary UI icons. If an icon needs theming, inline the SVG with `fill="currentColor"`; if not, use `<img>` with CSS `filter` for dark/light mode.
