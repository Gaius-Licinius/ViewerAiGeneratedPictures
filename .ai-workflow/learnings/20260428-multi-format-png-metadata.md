---
title: AI-generated PNGs use multiple incompatible metadata formats
date: 2026-04-28
category: surprise
plans:
  - .ai-workflow/plans/20260428-ai-image-viewer.md
tags: [ai-images, metadata]
---

# AI-generated PNGs use multiple incompatible metadata formats

## Context

When building the metadata scanner for the AI Image Viewer, the initial parser only handled the A1111 `parameters` tEXt chunk format. 79.5% of images showed empty prompts.

## Insight

AI-generated PNGs from different tools use at least 4 distinct metadata formats:
1. **A1111/SDNext** — tEXt key `parameters`, prompt on first line, comma-separated params on second line
2. **ComfyUI** — tEXt key `prompt`, JSON workflow. Prompts must be extracted by tracing KSampler `positive`/`negative` connections to CLIPTextEncode nodes. `_meta.title` is unreliable.
3. **NovelAI** — tEXt keys `Description` (plain text prompt), `Comment` (JSON with prompt field), `Source` (model), `Software`, `Generation time`
4. **Mixed** — both `parameters` and `prompt`/`workflow` keys in same file

## Evidence

- 522 files: ComfyUI format only
- 411 files: NovelAI/EXIF format
- 158 files: mixed A1111 + ComfyUI
- 90 files: A1111 only
- After multi-format support: empty prompt rate dropped from 79.5% to 4.3%

## Recommendation

Always scan for ALL tEXt chunk keys before deciding the parse strategy. For ComfyUI, trace KSampler connections rather than relying on `_meta.title`. For NovelAI, prefer `Description` over `Comment` for the prompt text.
