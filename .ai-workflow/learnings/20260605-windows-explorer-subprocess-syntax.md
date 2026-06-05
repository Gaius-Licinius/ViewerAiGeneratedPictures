---
title: Windows Explorer subprocess needs shell=True and joined /select flag
date: 2026-06-05
category: surprise
plans: []
tags: [windows, viewer]
---

# Windows Explorer subprocess needs shell=True and joined /select flag

## Context
Adding a "Show in folder" button in the details popup that opens Windows Explorer with the image file selected. The server needed to run `explorer /select,<path>` via `subprocess`.

## Insight
`subprocess.Popen(['explorer', '/select,', abs_path])` with the flag and path as separate list arguments does NOT work. Explorer ignores the `/select,` flag when passed as a standalone argument. The flag and path must be concatenated: `['explorer', f'/select,{abs_path}']`.

Even then, the most reliable approach is to use `shell=True` with quotes around the path, because Explorer is a shell-dependent process: `subprocess.Popen(f'explorer /select,"{abs_path}"', shell=True)`.

## Evidence
Three commits were needed to get this working:
1. Initial: `['explorer', '/select,', abs_path]` → nothing happened
2. Fix 1: `['explorer', f'/select,{abs_path}']` → still didn't work
3. Fix 2: `f'explorer /select,"{abs_path}"', shell=True` → worked

The frontend used fire-and-forget `fetch()` with no response checking, so the button showed "✅ Opened" even when Explorer silently failed, making debugging harder.

## Recommendation
For any Windows shell command that involves Explorer, use `shell=True` with a properly quoted command string. Always add server-side logging (`print()`) when implementing fire-and-forget endpoints so failures are visible in the console.
