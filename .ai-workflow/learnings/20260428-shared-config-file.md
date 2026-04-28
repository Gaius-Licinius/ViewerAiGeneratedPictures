---
title: Config file shared between Python backend and vanilla JS frontend
date: 2026-04-28
category: pattern
plans:
  - .ai-workflow/plans/20260428-ai-image-viewer.md
tags: [configuration, web-app]
---

# Config file shared between Python backend and vanilla JS frontend

## Context

The AI Image Viewer needed `collection_root` on the Python side and `nsfw_keywords` on the JavaScript side. Both were initially hardcoded.

## Insight

A single `config.json` file in the viewer directory works well for sharing configuration between a Python backend and a vanilla JS frontend without a build step. The server reads it at startup; the frontend fetches it via `GET /config.json` since the server serves static files from the same directory.

## Evidence

- `viewer/config.json` contains `collection_root` (used by server.py) and `nsfw_keywords` (used by app.js)
- No duplicated configuration, no hardcoded paths
- User can modify all settings without touching code

## Recommendation

For small local web apps without a build pipeline, a shared JSON config file served as a static asset is the simplest approach. It avoids environment variables (which can't be read by client-side JS) and keeps everything in one place.
