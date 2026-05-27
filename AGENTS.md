# AGENTS.md — Chornolis Marches

## Project identity

- Project: **Chornolis Marches** / **Порубіжжя Чорнолісу**.
- Short name: **Chornolis**.
- Repository: `q587p/chornolis-marches`.
- Genre: Telegram-first Ukrainian dark-fantasy / folklore RPG with a living world, liminal frontier tone, and MUD/sandbox influences.
- Ukrainian-localized title for players: **Порубіжжя Чорнолісу**.

## Always preserve these rules

- Do **not** put internal workflow notes about `package.json` / `package-lock.json` into public news or changelog entries.
- Before suggesting commit/push, prefer this order: apply changes → run build/tests/checks → only then version bump if the user asks or confirms.
- When documenting release/update dates, use the local project date and Holocene calendar year, e.g. `12026-05-26`.
- Preserve existing functionality unless the user explicitly asks to replace it.
- Prefer ready changed files/archives over patch files/scripts when the user asks for “архів” or “changed files”.
- For MVP Telegram bot mode, long polling is preferred over webhook unless the user explicitly changes this.

## Language and terminology

- Use Ukrainian UI/text where appropriate.
- Canonical terminology source: `docs/design/terminology.md`.
- Preferred spelling/style includes: `онбордінґ`, `ґенерація`, `мітологія`, `паґінація`, `паґінаційний`, `етер`, `Атени`; use `ґ` where it fits naturally.
- Important fixed UI terms:
  - Look → **Озирнутися**
  - Location → **Місцина**
  - Examine / inspect → **Роздивитися** / **Придивитися** depending on context.
- Player-facing Stamina → **Снага**.
- Base stamina should be **42**.
- Basic **Відпочити** means sit/rest briefly, not sleep. Reserve bed/sleep iconography for a future sleep mode.

## Design pillars

- Liminal frontier: borderland between settlement, wilderness, day/night, human/spirit, safety/danger, known/unknown.
- Living ecosystem: NPCs, animals, monsters, resources, weather, and world ticks should feel like an active world, not static scenery.
- Skill-based progression, no abstract character levels.
- Skills grow through use, observation, apprenticeship, imitation, and meaningful failures.
- NPCs, animals, monsters, and players may share attribute/skill logic where practical.
- Avoid over-explaining hidden numbers in player-facing UI; diegetic UI is preferred, with debug commands/modes for technical values.

## Core commands / UI concepts to respect

- Existing/recurring commands include `/look`, `/examine`, `/me`, `/world`, `/all`, `/time`, `/adminHelp`, `/tick`, `/restart`.
- `/look` is the player-facing command for **Озирнутися** / current location overview.
- `/examine` is the player-facing command for **Роздивитися** / closer inspection.
- `/location` and `/loc` may remain as legacy aliases for `/look`, but player-facing menus should prefer `/look`.
- Direction commands may include `/north /south /west /east` and `/n /s /w /e`.
- `/adminHelp` should keep the full admin command list visible.
- `/tick` should report animals/NPC/actions summary.
- Location buttons/features such as `🪧 Межовий знак` should be visible immediately in the Location view where appropriate.
- `Авто` belongs in character/game flow rather than as a detached menu; auto-state should persist across updates but reset on `/reset`.

## Map and world data

- Main hand-edited map data file: `prisma/data/chornolis_world_seed.json`.
- `prisma/seed.ts` reads this JSON and upserts regions, locations, exits, resource nodes, and features.
- ASCII map is separate documentation: `docs/world/world_map.md`.
- Do not change `z` casually; currently it is expected to remain `0` unless the task explicitly requires verticality.
- Do not create two exits from one location in the same direction.
- `blockedCells` are documentation-only; gameplay movement follows `locations` and `exits`.

## Suggested context files

When unsure, read:

- `docs/codex/00-codex-start-here.md`
- `docs/codex/01-project-memory.md`
- `docs/codex/05-workflow-and-versioning.md`
- `docs/codex/07-world-and-map-notes.md`
