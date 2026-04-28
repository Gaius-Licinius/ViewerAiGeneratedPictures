---
title: CSS columns with fixed height cause horizontal overflow, not vertical scroll
date: 2026-04-28
category: anti-pattern
plans:
  - .ai-workflow/plans/20260428-ai-image-viewer.md
tags: [css, viewer, web-app]
---

# CSS columns with fixed height cause horizontal overflow, not vertical scroll

## Context

The wall view used `column-width: 420px` combined with `height: 100vh; overflow-y: auto` to create a masonry-like layout. Only ~12 images were visible.

## Insight

CSS multi-column layout with an explicit `height` constrains columns to that height. Content that doesn't fit in the current column row overflows to new columns to the RIGHT, not below. With `overflow-x: hidden`, the overflow is invisible. The fix is to remove the fixed height from the columns container and make the parent element the scrollable container instead.

## Evidence

- Wall showed only 12 images regardless of total count (1209)
- Removing `height: 100vh` from `.wall-container` and adding `overflow-y: auto` to `#viewer` fixed it immediately
- Verified by comparing served CSS before and after via HTTP

## Recommendation

Never combine `column-width`/`column-count` with a fixed `height` on the same element. If scrolling is needed, make a parent wrapper the scroll container and let the columns container grow naturally.
