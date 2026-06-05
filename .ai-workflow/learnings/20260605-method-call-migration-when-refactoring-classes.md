---
title: Update all callers when migrating methods between classes during refactoring
date: 2026-06-05
category: anti-pattern
plans: []
tags: [web-app, viewer]
---

# Update all callers when migrating methods between classes during refactoring

## Context
During the JS refactoring, methods were moved from the monolithic `App` class to specialized component classes. `setMode()` was moved to `Controls`, but `store.onFilterChange()` still called `this.app.setMode()` instead of `this.app.controls.setMode()`.

## Insight
When extracting methods from a god class into specialized classes, all references across the codebase must be updated. A runtime `TypeError` (not a function) is the typical symptom — easy to catch, but annoying during testing. Grep for the method name across all source files after refactoring.

## Evidence
The error `this.app.setMode is not a function` appeared in the browser console after the refactoring was pushed. The fix was a one-line change in `store.js`: `this.app.setMode()` → `this.app.controls.setMode()`.

## Recommendation
After any refactoring that moves methods between classes:
1. Grep for the old call pattern (e.g., `this\.app\.setMode`)
2. Update all remaining references
3. Test each user interaction path at least once (filter change triggers `onFilterChange` → mode re-render)
