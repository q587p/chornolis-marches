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

- `prisma/data/world/*.json`: active hand-editable map/world seed data.
- `prisma/data/chornolis_world_seed.json`: legacy single-file fallback/reference; do not edit it as the only live world source.
- `prisma/seed.ts`: prefers the split world JSON directory and upserts world data.
- `docs/world/world_map.md`: ASCII/documentation map.
- `src/services/actionQueue.ts`: action queue, prior build issue involved imports.
- `src/handlers/start.ts`: onboarding/start flow; prior context around world year line import.
- `src/services/calendar.ts`: calendar/year formatting; prior alias suggestion.

## Refactor hotspots

Recent 0.11.x work made several files broad enough to deserve careful boundary cleanup:

- `src/services/worldTick.ts`: ecology, reproduction, creature AI, lisovyk behavior, lifecycle, runtime tick timer and tick admin text.
- `src/handlers/status.ts`: Telegram status/stat/chat/all/admin character and NPC pages.
- `src/services/actionCompletions.ts`: completion logic for many unrelated actions.
- `src/server/statusServer.ts`: HTTP routing, HTML rendering and admin-gated status pages.
- `src/services/locations.ts`: location render data, feature text, target visibility, resources and fire/torch feature actions.
- `src/handlers/aliases.ts`: Ukrainian/MUD-style input routing and target resolution.

Prefer behavior-preserving extractions first. See `docs/planning/items/TECH-001-service-boundary-and-duplication-cleanup.md`.

## Commands / behavior context

- `/start` should continue an existing character where they already are; explicit movement back to the beginning belongs to `/respawn` or admin `/teleport`, not ordinary start/menu refresh.
- `/world` is a service/admin-style world view and should keep sensitive details behind scribe/admin access where applicable.
- `/all` is a scribe/admin service list with player detail buttons and visible NPC detail buttons; keep exact service metadata out of ordinary player-facing UI.
- `/cleanupCreatures` was discussed as a possible debug/admin cleanup for duplicate seeded unique NPCs.
- `/restart` should delete character and character-related work and reset onboarding from zero.
- `/adminHelp` should remain complete and visible.
- `/tick` should summarize animals/NPCs/actions.
- `/chat` supports `time`, `location` and `character` groupings; older `/chat 1` and `/chat all` remain compatible time-mode forms.
- `/teleport [character] <locationKey|x,y,z>` is a scribe command. Without an explicit character, it moves the current character.

## Current fire/light and visible-held-item context

- Carried lit torches are stored as `lit_torch` resources with `updatedAt` as the burn timer.
- Before inventory rendering, torch state is synchronized; expired `lit_torch` becomes `twigs` / `хмиз`, not an unlit `torch`.
- A player can visibly hold up to two lit torches. Inspecting another character should show one lit torch, two lit torches, or `Руки порожні.` only when no obvious held item is visible.
- `Додати хмиз` / `/add twigs campfire` now consumes carried `twigs` / `хмиз`: burning ordinary campfires get a capped timer extension, while згаслі ordinary campfires can receive prepared fuel before being relit. Magical campfires do not need хмиз.

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
