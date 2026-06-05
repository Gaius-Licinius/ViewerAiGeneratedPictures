---
title: Use git -c flag and fictional email to differentiate AI commits on GitHub
date: 2026-06-05
category: pattern
plans: []
tags: [git]
---

# Use git -c flag and fictional email to differentiate AI commits on GitHub

## Context
We wanted AI-made commits to appear distinct from human commits on GitHub, without creating a separate GitHub account.

## Insight
GitHub links commits to accounts by email, not by author name. Using the same email with a different name still shows the same avatar. To get a visually distinct author on GitHub:
- Use `git -c user.name="Gaius-Licinius-AI" -c user.email="ai@local" commit`
- The fictional email has no Gravatar → GitHub shows a generic gray avatar
- The `-c` flag only affects that commit, not the local git config
- The user's normal commits remain under their identity

## Evidence
First attempt: `OpenCode <tibere_44@hotmail.fr>` — same avatar as user (same email). Second attempt: `Gaius-Licinius-AI <ai@local>` — distinct gray avatar, clearly identifiable.

## Recommendation
For any project using AI-assisted coding, set up a distinct git author identity with a fictional email. Use `-c` flags per commit rather than modifying the local config, so human commits aren't affected. Document the convention in the project README or CONTRIBUTING file.
