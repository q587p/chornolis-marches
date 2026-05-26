---
id: ADM-001
status: backlog
area: admin
tags:
  - admin
  - permissions
  - reset
priority: high
depends_on: []
---

# Admin permissions and restricted reset

`/adminHelp`, `/reset` and dangerous debug commands need to stay behind a scribe/admin gate before public testing grows.

## Goal

Add a proper admin rights layer before public testing grows.

## Notes

- 0.11.6 first pass: added a `Player.role` database role with `SCRIBE`, kept `ADMIN_TELEGRAM_IDS` as an emergency/operator path, and added hidden `/adminSet <secret>` using `ADMIN_SET_SECRET` to grant the current player `Писар Порубіжжя` access.
- `/adminHelp`, `/reset`, `/addCampfire`, `/addTorch`, `/addTwigs`, creature debug commands, runtime tick commands and other technical views now require scribe/admin access.
- Log who ran `/reset` and when.
- Consider confirmation before destructive admin actions.
