---
id: WEB-002
title: Independent status site and deploy visibility
status: backlog
type: technical
area: server
priority: medium
tags:
  - web
  - status
  - deploy
  - operations
  - reliability
---

# WEB-002: Independent Status Site And Deploy Visibility

## Summary

Move the public status/help surface out of the same Render web service that runs the game, or add a separate out-of-band status page that remains available when the game build, deploy or runtime fails.

The current in-game web status pages can show the running app's HTTP, Telegram bot, database, world tick and queue state. They cannot reliably say "a new deploy is currently running" while the game service itself is being replaced, failing to build or temporarily unavailable.

## Problem

During a Render deploy, the old instance can keep answering until the new one replaces it. If the build fails or the runtime crashes, users may see an old version, a new version, a temporary outage, or no useful page at all. That makes the game-hosted website a poor source for answering:

- whether a deploy is in progress;
- whether the newest commit reached production;
- whether the failure is the site, Telegram bot, database, or build pipeline;
- who to contact or where to look when the game service is down.

## Goals

- Keep a minimal public page available even when the game service is down.
- Show current or last-known deploy state from GitHub/Render when practical.
- Show the latest expected app version, deployed version if known, and last successful deploy time.
- Link to contact/help channels and basic "what is broken" guidance.
- Keep secrets, admin data and internal IDs out of the public page.
- Keep the current game-hosted `/`, `/health`, `/world` and admin pages useful for runtime state once the game is up.

## Non-goals

- No full replacement of the game website in the first slice.
- No public exposure of private Render/GitHub tokens.
- No admin control surface on the public independent status page.
- No requirement to move the Telegram bot itself.

## Possible Shape

First slice:

- add a static or separately hosted status page, for example GitHub Pages, Cloudflare Pages, Netlify, a separate Render static site, or another low-maintenance host;
- publish project links, contact text, latest release/version, and last-known deploy status;
- document that the game-hosted page is runtime status, while the independent page is outage/deploy status.

Later:

- add a small scheduled job or GitHub Action that writes a public JSON artifact with last successful deploy/version;
- optionally poll a safe Render/GitHub status source without leaking tokens;
- surface "deploy in progress", "deploy failed", "runtime down", "Telegram down", "database down" as separate states when reliable signals exist.

## Acceptance

- A public status/help page remains reachable when the game Render service is unavailable.
- The page explains how to tell game runtime issues from deploy/build issues.
- The page links to contact/support information.
- Runtime status pages in the game continue to show HTTP, Telegram bot, DB, world tick and queue state when the game is running.
- Deployment docs explain which page to check during build/deploy trouble.

