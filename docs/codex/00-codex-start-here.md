# 00 — Codex Start Here

Use this file first when working on **Chornolis Marches / Порубіжжя Чорнолісу**.

## One-paragraph project memory

Chornolis Marches is a Ukrainian dark-fantasy Telegram RPG / living-world sandbox about a liminal forest frontier: the border between settlement, wilderness, myth, human life, spirits, danger, and the unknown. The project should feel diegetic, atmospheric, folklore-inflected, and alive. The player should not feel like they are operating a generic MMO menu; they are moving through a place that notices them, changes over time, and can teach them through use, observation, and consequences.

## Most important permanent rules

1. Do not put the internal versioning/package-file workflow note into news/changelog.
2. Preserve current functionality unless the user explicitly asks to replace it.
3. Prefer Ukrainian UI and project-specific terminology.
4. Use `docs/codex/` files for context before editing unfamiliar systems.
5. For map edits, start with `prisma/data/chornolis_world_seed.json` and read `docs/codex/07-world-and-map-notes.md`.
6. For release/update tasks, read `docs/codex/05-workflow-and-versioning.md`.
7. Release/update dates should use the local project date with Holocene calendar year, e.g. `12026-05-26`.
8. English changelog/release notes should use repository-technical terms such as `inventory`, `HP`, `stamina`, `twigs`, and `location`; reserve player-facing Ukrainian terms for UI, news, in-game text and examples.
9. When adding or changing player-facing gameplay, check whether onboarding, `/help`, beginner guidance and tutorial/newcomer-helper plans need updating too.
10. When adding admin/scribe commands, update `/adminHelp`, `docs/systems/admin_commands.md` and any matching web/status documentation together.
11. Do not make `/start` reset position for existing characters; use explicit respawn/admin movement for relocation.
12. New or changed commands should keep aliases together: slash command where useful, English/MUD-style text forms, Ukrainian text forms, matching buttons, and matching `/help` or `/adminHelp` docs.

## Preferred workflow for code tasks

- Inspect current repo state before editing.
- Identify exact files to change.
- Make the smallest coherent change that preserves behavior.
- Run the relevant test/build/check command if available. Prefer `npm test` plus `npm run build` before suggesting commit/push when the change touches code, data, seed/world structure, or behavior that could drift.
- Add or extend focused tests when a new rule can be validated cheaply and repeatably. Manual Telegram checks are useful, but they should not replace scriptable coverage for seed validation, parser/formatter helpers, world data invariants, or other deterministic behavior.
- Summarize changed files and any checks run.
- Only mention version bump when explicitly relevant; the user usually handles it manually after a green build.
- If the change introduces a new player action, menu item, command, resource use, visibility rule, survival mechanic, social flow or admin-visible beginner state, update the relevant beginner-facing docs/text or add a planning note explaining how onboarding should teach it.
- If the change touches fire, light or carried items, check `docs/systems/fire_and_light.md` and `docs/systems/item_lifetime_and_grammar.md`; lit torches currently burn out into `хмиз`, and visible held items should be described diegetically.

## Context routing

- Project overview and memories: `01-project-memory.md`
- Core design: `02-design-pillars.md`
- Roadmap/icebox: `03-roadmap-and-icebox.md`
- Ukrainian language/style: `04-terminology-and-language.md`
- Canonical UI/gameplay terminology: `../design/terminology.md`
- Version/build/release rules: `05-workflow-and-versioning.md`
- Tech stack and architecture: `06-technical-context.md`
- Map/world seed: `07-world-and-map-notes.md`
- Prior updates/fixes: `08-prior-version-notes.md`
- Open questions: `09-open-questions.md`
