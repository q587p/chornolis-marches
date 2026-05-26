# 06 — Technical Context

## Repo and stack

Repository:

- `https://github.com/q587p/chornolis-marches`
- Git clone URL: `https://github.com/q587p/chornolis-marches.git`

Known/mentioned stack direction:

- TypeScript / Node.js
- grammY for Telegram bot
- Fastify mentioned for server/API direction
- PostgreSQL
- Prisma
- Redis + BullMQ mentioned for queue/world systems direction
- Docker
- GitHub Actions
- Render mentioned in prior context

## Bot runtime preference

For MVP, prefer long polling over webhook unless explicitly changed.

## Architecture direction

Potential long-term architecture:

- Game Core as the central simulation layer.
- Telegram client as one interface.
- Web `/map` and admin/status views later.
- MUD/Telnet gateway as a possible future interface.

## Important systems / files mentioned

- `prisma/data/chornolis_world_seed.json`: main hand-editable map/world seed data.
- `prisma/seed.ts`: reads the JSON and upserts world data.
- `docs/world/world_map.md`: ASCII/documentation map.
- `src/services/actionQueue.ts`: action queue, prior build issue involved imports.
- `src/handlers/start.ts`: onboarding/start flow; prior context around world year line import.
- `src/services/calendar.ts`: calendar/year formatting; prior alias suggestion.

## Commands / behavior context

- `/world` should count only alive entities in user-facing world stats.
- `/all` can show all DB creatures for debug/admin, including dead/inactive duplicates, but should probably default to live-only or clearly indicate debug semantics.
- `/cleanupCreatures` was discussed as a possible debug/admin cleanup for duplicate seeded unique NPCs.
- `/restart` should delete character and character-related work and reset onboarding from zero.
- `/adminHelp` should remain complete and visible.
- `/tick` should summarize animals/NPCs/actions.

## Known data/seed issue to remember

A prior duplicate-unique issue:

- `createCreatures()` checked uniqueness by `speciesId + locationId + name + isAlive`.
- If `Травник` moved, seed could respawn another one.
- Proposed direction: for unique seeded creatures, check by `speciesId + name + isAlive` without location; keep one live `Травник` and one `Дід Чорноліс`.

## Time system direction

User wanted a unified time system around version `0.7.5/0.7.6` ideas:

- world time, auto mode, actions, and animals should update/change through one coherent system;
- runtime tick updates should not require restart.

## Current world/year context

Previously noted world flavor:

- **587 літо після Великого Відступу — Рік Сича під Тихим Вітром**.

Treat as a desired worldbuilding direction unless the current repo says otherwise.
