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
- Do **not** expose `NPC` as a public-news category. In Ukrainian `news.md`, describe visible people as `персонажі`, `місцеві`, professions, or diegetic roles as if they belong to the world; keep `NPC` for technical docs, admin/scribe surfaces and English release notes where useful.
- When a PR changes player-facing tutorial flow, beginner safety, visible buttons, world-time/light feedback, or other UX that players will notice, update public `news.md`, `CHANGELOG.md`, release notes and the relevant planning/backlog docs together, and keep the PR summary/risks aligned.
- Every numbered release needs a `news.md` entry before merge. For player-visible, world-balance, tutorial, ecology, performance or UX releases, describe the visible change directly. For purely internal, scribe-only or operator-focused releases, add a short atmospheric public note that avoids admin-only commands, hidden tooling and implementation details, so version numbers do not leave gaps in public news.
- If the task creates a release/version commit, bump `package.json` and `package-lock.json` in that same commit.
- Use the version from `package.json` as the release version. The expected git tag is `vX.Y.Z`, for example `v0.12.12`.
- For ordinary release PRs, create/push the `vX.Y.Z` tag after the release branch is merged to `main`, and point it at the merge/release commit on `main`. Do not pre-tag an unmerged release branch unless the user explicitly asks for a pre-merge tag.
- Open PRs against `main` by default. Do not infer a stacked PR base from the current local branch, commit ancestry, or convenience. Stacked PRs may target another feature branch only when that exception is explicitly discussed for the current slice; once the parent branch lands, retarget/rebase the child PR back onto `main`.
- Before presenting a PR as ready, fetch the latest `origin/main` and verify it has no merge conflicts. If conflicts exist, rebase or merge from `main`, resolve them locally, rerun relevant checks, and push the resolved branch before handing over the PR.
- Public English changelog and release-note entries should describe mechanics in repository-technical terms such as `inventory`, `HP`, `stamina`, `twigs`, and `location`. Reserve player-facing Ukrainian terminology such as `Речі`, `Життя`, `Снага`, `хмиз`, and `місцина` for UI text, in-game/news copy, Ukrainian examples, aliases, and terminology/design docs.
- Before suggesting commit/push, prefer this order: apply changes → run tests/build/checks → only then version bump if the user asks or confirms.
- Tests matter alongside build. Run `npm test` for changes that touch world seed data, map/seed loading, Prisma data shape, planning around seed behavior, or shared systems where seed/type drift is plausible. Add or extend focused tests when a new rule can be checked cheaply and repeatably; do not rely on manual Telegram playthroughs alone for behavior that can be covered by a script.
- On Windows PowerShell, prefer `npm.cmd test` / `npm.cmd run build` when `npm` is blocked by execution policy. The full `npm.cmd test` suite often exceeds 120 seconds as the manifest grows; start it with a longer command timeout, currently at least 300 seconds, and increase that baseline periodically as tests are added.
- When changing `docs/planning/items/*.md`, run `npm run planning:export` and include the regenerated `docs/planning/exports/issues.csv` and `docs/planning/exports/items.json`.
- When documenting release/update dates, use the local project date and Holocene calendar year, e.g. `12026-05-26`.
- Preserve existing functionality unless the user explicitly asks to replace it.
- Prefer ready changed files/archives over patch files/scripts when the user asks for “архів” or “changed files”.
- For MVP Telegram bot mode, long polling is preferred over webhook unless the user explicitly changes this.

## Language and terminology

- Use Ukrainian UI/text where appropriate.
- Canonical terminology source: `docs/design/terminology.md`.
- When adding a new player-facing or scribe/admin command, or changing an existing one, keep command aliases in sync: slash command where appropriate, English/MUD-style text aliases, and Ukrainian text aliases. Buttons, `/help`, `/adminHelp`, `/adminMenu`, and docs should point to the same canonical action.
- When adding a new resource type, inventory item, food, material, weapon, or other grantable thing, update the scribe/admin item and resource surfaces too: `/adminHelp`, `/adminMenu`, `docs/systems/admin_commands.md`, and the relevant admin submenu/buttons. If it intentionally stays text-only through `/addItem` or `/addResource`, document that decision.
- With rare exceptions, every new player-facing in-world action button must also have a real typed command path: a stable slash command, an English/MUD-style text form, and Ukrainian aliases with common cases/forms where practical. Callback-only is acceptable for now for pagination, archive navigation, confirmation/cancel buttons, or other purely navigational UI, but not for ordinary world actions. Even for those UI/navigation exceptions, prefer adding typed commands in the future where practical, instead of treating callback-only as the permanent default.
- When public `news.md` mentions a visible action, button, or stable command surface, write the player-facing label with the working slash command in parentheses, for example `Речі` (`/inv`) or `Підпалити вогнище` (`/light_campfire`). Treat this as a smoke-check: if the command cannot be named honestly, implement or fix the command/alias before publishing the news.
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

- Existing/recurring commands include `/look`, `/examine`, `/me`, `/world`, `/all`, `/time`, `/calendar`, `/adminHelp`, `/tick`, `/restart`.
- `/look` is the player-facing command for **Озирнутися** / current location overview.
- `/examine` is the player-facing command for **Роздивитися** / closer inspection.
- `/location` and `/loc` may remain as legacy aliases for `/look`, but player-facing menus should prefer `/look`.
- Direction commands may include `/north /south /west /east` and `/n /s /w /e`.
- `/adminHelp` should keep the full admin command list visible.
- `/adminMenu` should keep the current scribe/admin quick-action menu aligned with `/adminHelp` and `docs/systems/admin_commands.md`.
- `/tick` should report animals/NPC/actions summary.
- Location buttons/features such as `🪧 Межовий знак` should be visible immediately in the Location view where appropriate.
- Player-facing auto mode is **Поклик духа** (`/spirit`), not `Провід`; keep `auto` only for internal notes, DB/log identifiers and legacy `/auto` command compatibility. It belongs in character/game flow rather than as a detached menu; auto-state should persist across updates but reset on `/reset`.

## Map and world data

- Active hand-edited map data lives in split JSON files under `prisma/data/world/` (`regions.json`, `locations.json`, `exits.json`, `features.json`, etc.).
- `prisma/seed.ts` prefers `prisma/data/world/` when it exists; `prisma/data/chornolis_world_seed.json` is a legacy mirror/fallback and should not be the only file changed for live world edits.
- When adding or changing a visible location feature, keep `/look` and `/examine` distinct where practical: `/look` can list the feature briefly, while `/examine` or direct feature inspection should add useful meaning, interaction hints, constraints, or atmosphere.
- Authored location names must be unique across the playable map, and full location descriptions should not be duplicated. Repeated names/descriptions make player-made maps and exit lists confusing; vary the landmark or microfeature instead.
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
