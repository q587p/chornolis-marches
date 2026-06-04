---
id: UX-003
title: Secondary keyboard world-state audit
status: backlog
type: chore
area: ux
priority: medium
tags:
  - ux
  - keyboard
  - menu
  - world-time
  - calendar
  - weather
depends_on:
  - WORLD-004
---

# UX-003: Secondary Keyboard World-State Audit

## Goal

Bring the secondary Telegram keyboard/menu in line with the current command
surfaces after the `/time`, `/calendar` and `/weather` split.

The player should not see tutorial/help copy that mentions `Календар` or
`Погода` while the ordinary menu only exposes `Час`.

## Problem

The current secondary menu includes useful entries such as `Новини`,
`Статистика`, `Репліки`, `Хто активний`, `Час` and `Налаштування`, but it does
not expose `Календар` (`/calendar`) or `Погода` (`/weather`) as buttons.

This makes the world-state split feel unfinished:

- `/time` is now the short current-time surface;
- `/calendar` is the fuller date / lunar-circle / moon surface;
- `/weather` is the sky / rain / fog / visibility mood surface;
- the tutorial time-pool already teaches the trio together.

## Scope

- Audit the secondary menu and main reply keyboard together.
- Add buttons for:
  - `Календар` (`/calendar`);
  - `Погода` (`/weather`).
- Decide where `Час` (`/time`) should sit relative to `Календар` and `Погода`.
- Keep `Налаштування` visible, but avoid letting the menu become one flat pile
  of every command.
- Review whether current buttons should stay in the same menu or move deeper:
  - `Новини` (`/news`);
  - `Статистика` (`/stat`);
  - `Репліки` (`/chat`);
  - `Хто активний` (`/who`);
  - `AFK / відійти` (`/afk`);
  - `Завершити сесію` (`/end_session`).
- Preserve direct typed commands even if a button is moved or demoted.
- Keep tutorial/dream keyboards focused: do not show full utility clusters
  before the relevant lesson or state makes them useful.

## Candidate Layout Questions

- Should `Час`, `Погода` and `Календар` become one compact world-state row?
- Should `Новини`, `Репліки`, `Хто активний` and `Статистика` become a
  "records/social" cluster?
- Should `AFK / відійти` and `Завершити сесію` stay in the first secondary
  screen, or move under a session/safety cluster?
- Should `Статистика` be renamed or relocated if it reads too technical beside
  atmospheric world-state buttons?

## Acceptance

- `Календар` (`/calendar`) and `Погода` (`/weather`) are reachable from an
  ordinary player keyboard/menu without typing.
- `Час` (`/time`) remains available and clearly distinct from the fuller
  calendar/weather surfaces.
- The menu does not become visually crowded or misleading on mobile Telegram.
- All visible buttons have matching command handlers and Ukrainian/text aliases
  where practical.
- `/help`, tutorial references and menu labels use the same canonical names.
- Tests or focused smoke checks cover the button callbacks or command aliases
  that this audit touches.
