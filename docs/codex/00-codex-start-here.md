# 00 — Codex Start Here

Use this file first when working on **Chornolis Marches / Порубіжжя Чорнолісу**.

## One-paragraph project memory

Chornolis Marches is a Ukrainian dark-fantasy Telegram RPG / living-world sandbox about a liminal forest frontier: the border between settlement, wilderness, myth, human life, spirits, danger, and the unknown. The project should feel diegetic, atmospheric, folklore-inflected, and alive. The player should not feel like they are operating a generic MMO menu; they are moving through a place that notices them, changes over time, and can teach them through use, observation, and consequences.

## Most important permanent rules

1. Do not put the internal versioning/package-file workflow note into news/changelog.
1a. Do not put scribe/admin-only commands or hidden service tooling into public `news.md`; keep them in changelog, release notes, `/adminHelp`, `/adminMenu`, and admin docs.
1b. Do not expose `NPC` as a public-news category. Ukrainian `news.md` should describe people and presences diegetically, as `персонажі`, `місцеві`, professions or roles; keep `NPC` for technical/admin docs and English release notes when useful.
2. Preserve current functionality unless the user explicitly asks to replace it.
3. Prefer Ukrainian UI and project-specific terminology.
4. Use `docs/codex/` files for context before editing unfamiliar systems.
5. For map edits, start with active split files in `prisma/data/world/` and read `docs/codex/07-world-and-map-notes.md`; `prisma/data/chornolis_world_seed.json` is only a legacy mirror/fallback.
6. For release/update tasks, read `docs/codex/05-workflow-and-versioning.md`.
7. Release/update dates should use the local project date with Holocene calendar year, e.g. `12026-05-26`.
8. English changelog/release notes should use repository-technical terms such as `inventory`, `HP`, `stamina`, `twigs`, and `location`; reserve player-facing Ukrainian terms for UI, news, in-game text and examples.
9. When adding or changing player-facing gameplay, check whether onboarding, `/help`, beginner guidance and tutorial/newcomer-helper plans need updating too.
10. When adding admin/scribe commands, update `/adminHelp`, `/adminMenu`, `docs/systems/admin_commands.md` and any matching web/status documentation together.
11. Do not make `/start` reset position for existing characters; use explicit respawn/admin movement for relocation.
12. New or changed commands should keep aliases together: slash command where useful, English/MUD-style text forms, Ukrainian text forms, matching buttons, and matching `/help`, `/adminHelp` or `/adminMenu` surfaces.
12a. With rare exceptions, every new player-facing in-world action button must also have a real typed command path: stable slash command, English/MUD-style text form, and Ukrainian aliases with common cases/forms where practical. Callback-only is acceptable for now for pagination, archive navigation, confirmation/cancel controls, and other purely navigational UI; ordinary world actions should not be button-only. Even for navigation/pagination/confirmation surfaces, prefer adding typed commands in the future where practical, but treat that as follow-up work rather than a blocker for this patch.
12b. When a visible button/action or stable command surface appears in `/help`, `/commands`, news or release notes, write the stable slash command in parentheses after the label, e.g. `Речі` (`/inv`), `🌙 AFK / відійти` (`/afk`) or `🚪 Завершити сесію` (`/end_session`). In `news.md`, treat this as a smoke-check too: if the line cannot name a working command beside a player-facing action, verify the command/alias implementation before publishing. Keep actual Telegram button labels clean: use only Ukrainian labels and icons, and do not append slash-command hints inside reply/inline keyboard button text.
12c. Direct slash commands should also accept the same text without the leading slash when practical. This is especially important for scribe/admin commands that may be typed as MUD-style commands, e.g. `/teleport forest_07_00` and `teleport forest_07_00`. If the slash command has a no-argument usage response, the bare text alias and Ukrainian aliases should reach that same usage response instead of falling through to unknown-input fallback.
12d. Any clickable slash command shown in public `news.md` must work when clicked in Telegram. Before shipping news that contains inline `/...` hints, make sure the exact clicked text routes in the bot and run `node scripts/test/news-clickable-commands.cjs` or the full `npm test`. Bare slash hints such as `/give` must be registered with `bot.command(...)` or public Herald command handling; `parseAlias` alone is not enough for Telegram command clicks.
13. When a command becomes part of the tutorial/newcomer path, add a short diegetic first-use comment or planning note for Сон/Дрімота, another guide voice, or an appropriate local sign so the tutorial teaches the command in-world instead of only exposing a button.
14. When adding or changing text aliases, add or update `scripts/test/input-aliases.cjs` whenever the behavior can be checked with `parseAlias` without Telegram or database setup.
15. When adding stable world nouns, update `src/content/lexicon/worldLexicon.ts` with Ukrainian case forms. Grammar fallback remains for ordinary guesses, but seed helpers deliberately require lexicon entries when stable species/profession/spirit forms matter.
16. Near-term session presence work matters: add AFK / End Session controls, silent Auto-AFK after player inactivity, one idle reminder per scene and send-time guards for delayed/proactive bot messages so Telegram does not keep nudging a player who stepped away.
17. Visible location features, creatures, objects and new location content should not be only bare names. `/look` may keep them compact, but `/examine` and direct full inspection should provide meaningfully more text: details, interaction hints, constraints, local consequence or atmosphere. If `look <thing>` and `examine <thing>` produce the same player-facing text, treat that as a bug unless there is an explicit documented no-action decision.
18. Do not put raw HTML tags such as `<i>` into map/world JSON descriptions. Seed text is content; renderers decide markup and must escape data before Telegram HTML output.

## Preferred workflow for code tasks

- Inspect current repo state before editing.
- Identify exact files to change.
- Make the smallest coherent change that preserves behavior.
- Run the relevant test/build/check command if available. Prefer `npm test` plus `npm run build` before suggesting commit/push when the change touches code, data, seed/world structure, or behavior that could drift.
- Add or extend focused tests when a new rule can be validated cheaply and repeatably. Manual Telegram checks are useful, but they should not replace scriptable coverage for seed validation, parser/formatter helpers, world data invariants, or other deterministic behavior.
- For player-facing aliases and MUD-style text commands, prefer a focused `parseAlias` regression in `scripts/test/input-aliases.cjs` alongside the code change.
- Summarize changed files and any checks run.
- Only mention version bump when explicitly relevant; the user usually handles it manually after a green build.
- If the change introduces a new player action, menu item, command, resource use, visibility rule, survival mechanic, social flow or admin-visible beginner state, update the relevant beginner-facing docs/text or add a planning note explaining how onboarding should teach it.
- If the change touches fire, light or carried items, check `docs/systems/fire_and_light.md` and `docs/systems/item_lifetime_and_grammar.md`; lit torches currently burn out into `хмиз`, and visible held items should be described diegetically.
- If the change touches dynamic names for creatures, spirits, professions, resources, features, tracks, corpses or action text, check `docs/content/world-lexicon.md` and avoid adding new nominative-only text templates unless nominative is truly the intended case.
- If the change adds or edits a visible feature, creature, object or location, check `docs/systems/location_features.md` and any matching system docs: brief `/look` text and full `/examine` text should not collapse into the same bare line unless there is a deliberate no-action decision. Full examination costs more attention/stamina, so it should reward the player with substantially more detail.

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
