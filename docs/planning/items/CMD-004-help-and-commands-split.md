---
id: CMD-004
title: Compact help and current command reference
status: backlog
type: feature
area: commands
priority: high
estimate: 1-2h
tags:
  - commands
  - help
  - onboarding
  - aliases
  - ux
depends_on: []
---

# CMD-004: Compact Help and Current Command Reference

## Goal

Make `/help` a short, useful beginner surface instead of a long command catalog, and move the broader implemented command reference into `/commands`.

`/help` should answer "what should I do now?".

`/commands` should answer "what can I type?".

## Scope

- Shrink `/help` to the smallest useful set:
  - beginner return path and tutorial reminder;
  - core orientation: `Озирнутися` (`/look`), `Роздивитися` (`/examine`), movement, `Речі` (`/inv`), `Персонаж` (`/me`);
  - recovery/safety: `Відпочити` (`/rest`), `Повернення` (`/respawn`), AFK / session controls;
  - a clear pointer to `/commands` for the full reference.
- Rewrite `/commands` so it is current, grouped and readable:
  - movement and location;
  - things and resources;
  - speech and social actions;
  - danger and survival;
  - world information;
  - session/settings;
  - planned commands clearly separated from implemented commands, if kept at all.
- Keep scribe/admin-only commands out of public `/help` and ordinary `/commands`; those stay in `/adminHelp`, `/adminMenu` and admin docs.
- Keep public examples aligned with real command routing: slash commands, slashless English/MUD-style input and Ukrainian aliases.
- Keep general survival advice in `/help`, tutorial signs/voices or newcomer guidance instead of burying it in the hidden command catalog.

## Acceptance

- `/help` is compact enough for a new player to scan quickly.
- `/help` points to `/commands` without becoming a wall of command text.
- `/commands` lists implemented player-facing commands accurately and does not advertise broken aliases.
- Planned/future commands are either omitted from ordinary `/commands` or clearly separated from implemented commands.
- Existing tests such as `scripts/test/help.cjs`, `scripts/test/input-aliases.cjs`, `scripts/test/slashless-command-coverage.cjs` and `scripts/test/news-clickable-commands.cjs` are updated where practical.
- No admin/scribe-only commands leak into public beginner help.

## Notes

This should stay smaller than a full shared command registry. The registry remains a separate technical follow-up; this task is the player-facing cleanup that makes current help usable.
