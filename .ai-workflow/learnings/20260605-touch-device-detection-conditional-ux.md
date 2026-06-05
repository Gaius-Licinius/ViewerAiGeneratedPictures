---
title: Use ontouchstart to conditionally disable hover-dependent UX on mobile
date: 2026-06-05
category: pattern
plans: []
tags: [css, mobile, viewer, web-app]
---

# Use ontouchstart to conditionally disable hover-dependent UX on mobile

## Context
The viewer had auto-hiding controls triggered by `mousemove`. On mobile, there's no mouse, so controls would disappear with no way to bring them back. The user found this frustrating during mobile testing.

## Insight
Using `'ontouchstart' in window` in JavaScript is a simple, reliable way to detect touch devices and branch UX behavior:
- Desktop: auto-hide controls after 3 seconds of inactivity (mouse-driven)
- Mobile: controls stay permanently visible (no hover to reveal them)

The same detection was used to hide the "Show in folder" button on mobile, since opening Windows Explorer only makes sense on the PC running the server.

## Evidence
The mobile review feedback was immediate: the user couldn't switch between view modes because the controls bar disappeared. Adding the touch detection fixed it in one commit.

## Recommendation
Any feature that relies on `mouseover`, `mousemove`, or `:hover` for core interactions should have a touch-device fallback. Use `'ontouchstart' in window` (JS) or `@media (hover: hover)` (CSS) to scope hover-dependent behaviors to desktop. For the controls bar specifically, just don't auto-hide on touch devices.
