---
title: Keep feature branches focused — fix unrelated issues on separate branches
date: 2026-06-05
category: anti-pattern
plans: []
tags: [git, viewer]
---

# Keep feature branches focused — fix unrelated issues on separate branches

## Context
The `feature/explorer-link` branch for issue #9 (Show in folder) accumulated 8 commits about icon replacements that had nothing to do with the explorer feature. The branch ended up with 12 commits mixing two unrelated topics.

## Insight
Even when the repo owner suggests making unrelated changes on the current branch during review, it's better to create a separate branch. Mixing concerns in one branch causes:
- **Unclear PR scope**: reviewers see changes unrelated to the stated issue
- **Messy git history**: the branch tells two unrelated stories
- **Costly cleanup**: required cherry-picking 8 commits to a new branch + force push to untangle

The cleanup was: `git cherry-pick` 8 icon commits onto `feature/icons`, then `git reset --hard` + `git push --force-with-lease` on `feature/explorer-link`.

## Evidence
This exact situation occurred during the issue #9 PR review. The user suggested icon improvements as a quick aside, which snowballed into 8 commits spanning Bootstrap icons, SVG design iterations, and file reorganization.

## Recommendation
When asked to make an unrelated change during a PR review, say: "Let me put that on a separate branch." Create the branch off master, implement the change, create its own PR. The original branch stays clean and focused on its issue.
