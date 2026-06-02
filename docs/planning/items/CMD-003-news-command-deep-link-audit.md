---
id: CMD-003
title: Public news command deep-link audit
status: backlog
type: technical
area: commands
priority: high
tags:
  - commands
  - news
  - telegram
  - deep-links
  - web
---

# CMD-003 — Public News Command Deep-Link Audit

## Summary

Make every public, non-scribe slash command mentioned in `news.md` become an active deep link to the main game bot on the web news page and in Herald/channel-rendered news where practical.

## Current Slice

`0.15.10` adds deep-link/start-payload support for the public commands explicitly found missing in older news:

- `/say`
- `/build_campfire`
- `/light_campfire`
- `/douse_campfire`
- `/dismantle_campfire`

## Follow-Up Scope

- Audit every backticked slash hint in `news.md`.
- Separate public game commands from scribe/admin/debug/service references.
- Add safe `gameCommandDeepLink` payloads for public player commands.
- Ensure each new `cmd_*` payload routes to the same behavior or usage prompt as the typed command.
- Keep admin/scribe commands, API paths and hidden service tooling out of public bot deep links.
- Extend tests so web/news rendering fails when a public safe command is not linkable.

## Acceptance Criteria

- Public `news.md` slash hints that are safe player commands render as active bot links.
- Clicking each link opens the bot through a supported `/start cmd_*` payload.
- Admin/scribe/debug/API references remain unlinked or explicitly allowlisted as non-bot references.
- `node scripts/test/news-clickable-commands.cjs` and `node scripts/test/web-news.cjs` cover the routing/rendering rule.
