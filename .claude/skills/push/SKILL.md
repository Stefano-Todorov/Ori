---
name: push
description: Commit all changes with a descriptive message and push to remote. Use when the user says "commit", "push", "ship it", or asks to save their work.
disable-model-invocation: true
allowed-tools: Bash(git *)
---

Commit and push the current changes:

1. Run `git status` to see all changed and untracked files
2. Run `git diff` to understand what changed (both staged and unstaged)
3. Run `git log --oneline -5` to match the existing commit message style
4. Stage all relevant files (avoid staging `.env*`, `credentials*`, or other secrets)
5. Write a concise commit message that describes the **why**, not just the **what**
6. Commit the changes
7. Push to the remote (`git push`)
8. Report the commit hash and confirm the push succeeded

IMPORTANT: Always push immediately after committing — this project auto-deploys from main via Vercel.
