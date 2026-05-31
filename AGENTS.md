# AGENTS.md — Chornolis Marches

## Project identity

- Project: **Chornolis Marches** / **Порубіжжя Чорнолісу**.
- Short name: **Chornolis**.
- Repository: `q587p/chornolis-marches`.
- Genre: Telegram-first Ukrainian dark-fantasy / folklore RPG with a living world, liminal frontier tone, and MUD/sandbox influences.
- Ukrainian-localized title for players: **Порубіжжя Чорнолісу**.

## Always preserve these rules

- Do **not** put internal workflow notes about `package.json` / `package-lock.json` into public news or changelog entries.
- Do **not** put scribe/admin-only commands or hidden service tooling into public `news.md`; keep those details in changelog, release notes, `/adminHelp`, `/adminMenu`, and admin docs.
- If the task creates a release/version commit, bump `package.json` and `package-lock.json` in that same commit.
- Use the version from `package.json` as the release version. The expected git tag is `vX.Y.Z`, for example `v0.12.12`.
- Public English changelog and release-note entries should describe mechanics in repository-technical terms such as `inventory`, `HP`, `stamina`, `twigs`, and `location`. Reserve player-facing Ukrainian terminology such as `Речі`, `Життя`, `Снага`, `хмиз`, and `місцина` for UI text, in-game/news copy, Ukrainian examples, aliases, and terminology/design docs.
- Before suggesting commit/push, prefer this order: apply changes → run tests/build/checks → only then version bump if the user asks or confirms.
- Tests matter alongside build. Run `npm test` for changes that touch world seed data, map/seed loading, Prisma data shape, planning around seed behavior, or shared systems where seed/type drift is plausible. Add or extend focused tests when a new rule can be checked cheaply and repeatably; do not rely on manual Telegram playthroughs alone for behavior that can be covered by a script.
- When changing `docs/planning/items/*.md`, run `npm run planning:export` and include the regenerated `docs/planning/exports/issues.csv` and `docs/planning/exports/items.json`.
- When documenting release/update dates, use the local project date and Holocene calendar year, e.g. `12026-05-26`.
- Preserve existing functionality unless the user explicitly asks to replace it.
- Prefer ready changed files/archives over patch files/scripts when the user asks for “архів” or “changed files”.
- For MVP Telegram bot mode, long polling is preferred over webhook unless the user explicitly changes this.

## Language and terminology

- Use Ukrainian UI/text where appropriate.
- Canonical terminology source: `docs/design/terminology.md`.
- When adding a new player-facing or scribe/admin command, or changing an existing one, keep command aliases in sync: slash command where appropriate, English/MUD-style text aliases, and Ukrainian text aliases. Buttons, `/help`, `/adminHelp`, `/adminMenu`, and docs should point to the same canonical action.
- Any direct slash command should also accept the same direct text form without the leading slash when practical, especially scribe/admin commands. For example, `/teleport forest_07_00` and `teleport forest_07_00` should route to the same handler.
- Preferred spelling/style includes: `онбордінґ`, `ґенерація`, `мітологія`, `паґінація`, `паґінаційний`, `етер`, `Атени`; use `ґ` where it fits naturally.
- Stable world nouns such as creature species, NPC profession labels, spirits, resources, features, and common gameplay nouns should be added to `src/content/lexicon/worldLexicon.ts` with Ukrainian case forms. Grammar fallback remains available for non-critical/generated text, but seed helpers such as `creatureSpeciesNameFields(...)` intentionally require explicit lexicon forms where stable world data depends on them.
- The lexicon does not yet remove every hardcoded nominative insertion in gameplay text. When touching dynamic descriptions, prefer `creatureForms`, `speciesForms`, `playerForms`, or lexicon-backed helpers and leave unrelated cleanup for a focused pass.
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
- `/adminMenu` should keep the current scribe/admin quick-action menu aligned with `/adminHelp` and `docs/systems/admin_commands.md`.
- `/tick` should report animals/NPC/actions summary.
- Location buttons/features such as `🪧 Межовий знак` should be visible immediately in the Location view where appropriate.
- `Авто` belongs in character/game flow rather than as a detached menu; auto-state should persist across updates but reset on `/reset`.

## Map and world data

- Active hand-edited map data lives in split JSON files under `prisma/data/world/` (`regions.json`, `locations.json`, `exits.json`, `features.json`, etc.).
- `prisma/seed.ts` prefers `prisma/data/world/` when it exists; `prisma/data/chornolis_world_seed.json` is a legacy mirror/fallback and should not be the only file changed for live world edits.
- When adding or changing a visible location feature, keep `/look` and `/examine` distinct where practical: `/look` can list the feature briefly, while `/examine` or direct feature inspection should add useful meaning, interaction hints, constraints, or atmosphere.
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
