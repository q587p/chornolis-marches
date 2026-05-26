# 08 — Prior Version / Update Notes

This is not a complete changelog. It preserves remembered context from past patch/update discussions.

## 0.6.x context

- At one point `main` / `package.json` were around `0.6.0`.
- `/restart` was framed as `0.6.1` without a new Prisma migration.
- `/restart` should delete the character and its work, then reset onboarding from zero.
- `start.ts` already had onboarding with pronouns and cases.

## 0.7.2 supplement context

Remembered archive/update direction:

- no separate `Починаємо...` message;
- `rest:interrupt`, `rest:queue`, `rest:queue-rest` edit current message;
- direction commands `/north /south /west /east` plus `/n /s /w /e`;
- direction buttons use command-style flow;
- `Скасувати поточну` and `Очистити чергу` also cancel active rest;
- `/me` shows passive/active recovery time;
- `/gather` without args gathers random available material;
- `/gather herbs|berries|mushrooms` remain exact;
- gather cost unified to `5` stamina = `65 с` in that discussion.

## 0.7.4 context

Main remembered rule from this period:

- a build issue was mentioned in `src/services/actionQueue.ts` related to missing imports at the top of the file.

## 0.7.5 / 0.7.6 direction

User wanted a unified time system:

- world time;
- auto mode;
- actions;
- animals/NPCs;
- runtime tick updates without restart.

## 0.8.1 / liminal skills pack direction

Planned/previous archive idea included:

- update `ROADMAP.md`;
- update `GAME_DESIGN.md`;
- add `docs/systems/progression.md`;
- include liminality and skill growth through use/observation;
- possibly include changelog/news snippets if requested.

## 0.8.3 direction

Planning/documentation memory:

- `docs/planning/icebox.md` as cold storage;
- `items/`, `decisions/`, `exports/` concepts;
- user later preferred ready files instead of patch files.

## 0.9.2 / 0.9.3 context

Remembered current-ish project state around late May 2026:

- `/adminHelp` should keep full command list visible;
- `/tick` should report animals/NPC/actions summary;
- `🪧 Межовий знак` and other location buttons should be visible immediately in Location;
- `Авто` should be in character/game flow, not a detached menu;
- auto-state should persist across updates but reset on `/reset`.

## Prior build issue note

A prior build error cause:

- `src/handlers/start.ts` imported `renderCurrentWorldYearLine` from `../services/calendar`;
- `calendar.ts` exported `formatCurrentWorldYear()` instead;
- suggested fix: add alias `renderCurrentWorldYearLine()` returning `${formatCurrentWorldYear()}.`

Verify current repo before applying this.
