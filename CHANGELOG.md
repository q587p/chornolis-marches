# Changelog

All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.

---

## [Unreleased]

---

## 0.10.12 - Seed typecheck and deploy announcements - 12026-05-26

### Fixed

- Removed the remaining duplicated starter-animal declarations from `prisma/seed.ts` and `src/services/worldReset.ts`; both now use `src/data/starterAnimals.ts`.
- Added a seed TypeScript check to `npm test` so `prisma/seed.ts` import/type errors are caught without running the database seed.
- Deploy announcements now suppress older version messages when a same-or-newer `DEPLOY:x.y.z` world event already exists.
- Added a deployment checklist that documents when a migration is needed, when seed should run and the manual deploy order.
- Renamed the visible gatherable `herbs` resource to `лікарські трави` while keeping the stable `herbs` key and command alias.

### Changed

- Bumped package metadata to `0.10.12`.
- Added release notes for 0.10.12 and updated `news.md` with the technical patch note.

---

## 0.10.11 - Starter predators and predator ecology - 12026-05-26

### Added

- Added starter foxes and wolves to seed and `/reset`.
- Added conservative predator reproduction after small-herbivore ecology and before ordinary carnivore ticks.
- Added fox/wolf birth counters and prey-unit counters to `/stat` and `/stat.json`.

### Changed

- Renamed the small herbivore ecology processor away from the rabbit-only name.
- `/tickGet` now documents foxes, wolves, pregnancy-state limitations and prey units.
- Bumped package metadata to `0.10.11`.

### Documentation

- Added release notes for 0.10.11 and updated ecology docs/news for starter predators and predator reproduction.

---

## 0.10.10 - Predator kills in ecology stats - 12026-05-26

### Added

- Added predator-caused death counters to `/stat`, `/stat.json` and Telegram `/stat`.
- Added all-time predator kill totals to the ecology web stats.
- Added per-creature combat counters: attack attempts, successful attacks and kills.
- Added top hunter rows to web `/stat` and a compact hunter list to Telegram `/stat`.

### Changed

- Foxes and wolves now select prey by species preference, age and HP vulnerability instead of taking the first local herbivore.
- Predator hunger recovery now uses prey food value instead of a flat value for every kill.
- Fox and wolf lifecycle seed values are now much slower, leaving predator reproduction room to be added without herbivore-speed generations.
- Predator kills now mark corpses with the predator species key in their current action text.
- Bumped package metadata to `0.10.10`.

### Documentation

- Added release notes for 0.10.10 and updated ecology docs/news with predator-stat notes.
- Added a backlog item for animal experience and titles based on hunting history.
- Added a backlog item for creature aggression and defense against people or threats.

---

## 0.10.9 - Animal pressure and ecology danger - 12026-05-25

### Fixed

- Increased creature action batches and kept player batches separate, so large animal populations can drain their own backlog faster without swallowing player actions.
- Made ordinary animal movement silent in location chat; movement still updates location, stamina and tracks, while NPC/special creature movement remains visible.

### Added

- Added dynamic crowd danger: locations with more than 13 creatures/players now become much more dangerous for ecology logic, suppressing herbivore reproduction and making herbivores drift away more often.
- Attacks now leave a temporary local danger marker, making herbivores more likely to leave the attacked location for several world ticks.

### Documentation

- Added follow-up planning for visible animal migration without Telegram spam.
- Added Icebox notes for future species-specific fear, aggression and offspring-defense behavior.
- Updated `news.md`, ecology docs and release notes for 0.10.9.

---

## 0.10.8 - Timing and action queue fixes - 12026-05-25

### Fixed

- Made the action queue loop run immediately on start/restart and read the current runtime poll interval, preventing completed movement actions from sitting in `RUNNING` until another restart.
- Prioritized player due/queued actions ahead of creature backlog so animal/NPC activity cannot make player movement feel stuck.
- Removed the extra list dash before visible location features such as `Винищена трава`.
- Added spaces between compact exit labels so `Зх Сх` does not render as `ЗхСх`.

### Changed

- Bumped package metadata to `0.10.8`.
- Changed rest stamina recovery from one large +42 jump every 40 ticks to +1 every 4 ticks, while passive stamina remains +1 every 40 ticks.
- Reduced tired/non-quick action durations by lowering `ACTION_BASE_TICKS` from 9 to 3, and clarified `/tickGet` that those action durations apply during fatigue or to creatures without quick mode.
- Reduced quick player action duration to 0.1s and action queue polling to 0.1s so quick actions complete promptly.
- Decoupled attack duration from stamina cost: tired/non-quick attacks now take 2x movement time while still costing more stamina.

### Documentation

- Updated `news.md` and release notes for 0.10.8.

---

## 0.10.7 - Safer reset and tick commands - 12026-05-25

### Added

- Added an inline confirmation step before `/reset` can execute.
- Added ecology-only `grass` forage for herbivores, generated by biome and hidden from player gather menus.
- Added visible depleted-vegetation features: severe local overgrazing can mark a location as `Винищена трава`.
- Added `meadow_16_05` as a starter exhausted-vegetation example.

### Fixed

- Restored `/tickGet` and `/tickSet`; the unknown-command fallback is now registered after tick command handlers.
- Restored Holocene Calendar dates in changelog headings.

### Changed

- Bumped package metadata to `0.10.7`.
- Retuned herbivore reproduction: rabbits check every 120 world ticks with 5-10 offspring per litter; mice check every 20 world ticks with 5-10 offspring per litter and earlier maturity.
- Slowed normal gatherable-resource regeneration and made exhausted vegetation recover much more slowly.
- Kept grass off bridge spans while leaving under-bridge riverbank vegetation enabled.

### Documentation

- Updated `news.md`, release notes and admin command docs.

---

## 0.10.6 - Unknown command fallback - 12026-05-25

### Added

- Added a Telegram fallback for unrecognized slash commands with pointers to `/help` and `/menu`.
- Added a specific `/respawn` placeholder response while the real respawn flow remains planned under `SURV-001`.
- Added mixed starter mice: children, young mice, adults, old mice and corpses.
- Added mouse reproduction and overcrowding spread counters alongside rabbit ecology counters.

### Changed

- Slowed the mouse lifecycle from seconds-scale growth to a short but readable cycle that remains faster than rabbits.
- Mouse reproduction now runs faster than rabbit reproduction and uses smaller 4-8 offspring litters.
- Seed upserts now use bounded concurrency and starter animal `createMany` batches to reduce database round trips.
- Bumped package metadata to `0.10.6`.

### Documentation

- Updated `news.md` and release notes for 0.10.6.

---

## 0.10.5 - World map v7 and starter ecology - 12026-05-25

### Added

- Added split `prisma/data/world/*.json` seed data from the v7 world patch as the active seed source.
- Added Ведана as a female herbalist-like NPC while preserving the current Здравомир and Дід лісовик setup.
- Added `scripts/world/render-map-ascii.mjs` and `docs/world/map_editing.md`.
- Added a mixed starter rabbit population: children, young rabbits, adults, old rabbits and corpses.
- Added first seed tests: `npm test` validates split world seed references and `npm run test:db` checks the current database start location.

### Changed

- Updated the world map docs for the v7 riverbank and under-bridge layout.
- Removed direct bridge-deck vertical exits to the under-bridge location in the active seed data.
- `getStartLocationId()` now reads `meta.startLocationKey` from split or legacy seed metadata.
- `/resetWorld` now restores the same mixed starter rabbit population.
- Lisovyk wake/sleep regional notifications and world events now use in-world growled speech about depleted and recovered resources.
- Hardened action, recovery, world-tick and debug/reset writes against records that were already removed by reset, cleanup or another concurrent loop.
- CI now runs the static world seed test before build.
- Bumped package metadata to `0.10.5`.

### Documentation

- Added release notes for 0.10.5 and updated `news.md`.

---

## 0.10.4 - Ecology web stats - 12026-05-25

### Added

- Added `/stat`, an auto-refreshing ecology statistics page for animal age groups, resources and recent tick counters.
- Added `/stat.json` for raw ecology statistics.
- Added a main status page link to `/stat`.
- Added Telegram `/stat` / `/stats` and a menu button with a compact ecology summary and a link to the full web page.

### Changed

- Added `PUBLIC_BASE_URL` for configurable Telegram web links.
- Removed the global rabbit population hard cap; only local crowding, food, danger and predators constrain reproduction now.
- Lengthened animal corpse decay windows after the rabbit lifecycle slowdown.
- Bumped package metadata to `0.10.4`.

### Documentation

- Updated `news.md`, release notes and deployment docs with the 0.10.4 stats notes.

---

## 0.10.3 - Rabbit pacing and spread - 12026-05-25

### Changed

- Slowed rabbit reproduction checks from every 3 world ticks to every 40 world ticks by default.
- Extended rabbit growth: offspring now become adults after 240 world ticks by default.
- Extended rabbit adult lifespan and reduced old-age death pressure.
- Added direct overcrowding spread: excess non-child rabbits can move into neighboring cells every 20 world ticks.
- Added `rabbitsSpread` to world tick summaries and public tick reports.
- Bumped package metadata to `0.10.3`.

### Documentation

- Updated ecology docs and ECO-001 notes with the slower pacing and overcrowding spread behavior.
- Updated `news.md` with the 0.10.3 balance note.

---

## 0.10.2 - Paginated long Telegram outputs - 12026-05-25

### Added

- Added inline pagination for `/all` and `/all dead`.
- Added inline pagination for `/locationAll`.
- Added a browsable `/news` archive: the latest entry is shown in full, version buttons open full historical entries and the archive list can be paged deeper into history.

### Changed

- Replaced manual 3500-character chunking in long admin outputs with page builders and `Next` / `Back` callbacks.
- Kept page sizes below Telegram's 4096-character message limit with a 3300-character target.
- Bumped package metadata to `0.10.2`.

### Documentation

- Updated `news.md` with the 0.10.2 pagination note.

---

## 0.10.1 - Rabbit litter tuning - 12026-05-25

### Changed

- Changed successful rabbit reproduction from 1-2 offspring to configurable litters of 5-10 offspring.
- Added `WORLD_RABBIT_MIN_LITTER_SIZE` and `WORLD_RABBIT_MAX_LITTER_SIZE` tuning knobs.
- Bumped package metadata to `0.10.1`.

### Documentation

- Updated ecology docs and ECO-001 notes with the 5-10 litter size.
- Added a future Icebox note for opportunistic rabbit consumption of small bird prey or carrion after birds, carcasses and deeper attack systems exist.
- Updated `news.md` with the 0.10.1 balance note.

---

## 0.10.0 - Rabbit reproduction and overgrazing - 12026-05-25

### Added

- Added the first ECO-001 ecology loop: adult rabbits can reproduce during world ticks when local food exists.
- Added predator, danger and crowding pressure to reduce rabbit reproduction chances.
- Added overgrazing pressure: crowded rabbit locations consume edible resource nodes (`berries`, `herbs`, `mushrooms`) outside the normal action queue.
- Added ecology counters to world tick summaries: rabbit births, overgrazed locations, overgrazed resources and resources depleted by overgrazing.
- Added starter rabbits to the regular seed flow, not only `/reset`.

### Changed

- Reset starter rabbits now begin as mature adults with alternating sex, so the reproduction loop can start after a reset.
- Bumped package metadata to `0.10.0`.

### Documentation

- Updated `news.md` with the 0.10.0 ecology note.
- Updated ecology and planning docs after implementing the first ECO-001 slice.

---

## 0.9.12 - Action completion refactor - 12026-05-25

### Changed

- Split action completion handlers into `src/services/actionCompletions.ts`.
- Reduced `src/services/actionQueue.ts` to loop wiring and public re-exports.
- Kept existing handler and world tick imports compatible through `src/services/actionQueue.ts`.
- Bumped package metadata to `0.9.12`.

### Documentation

- Updated `news.md` with the 0.9.12 technical note.
- Updated `docs/planning/next.md` after completing the action queue completion-handler split.

---

## 0.9.11 - Action lifecycle refactor - 12026-05-25

### Changed

- Split action queue lifecycle into `src/services/actionLifecycle.ts`: enqueueing, immediate-vs-queued player actions, rest start/stop, queue controls and queued action startup.
- Kept the existing public imports from `src/services/actionQueue.ts` through re-exports.
- Reduced `src/services/actionQueue.ts` to the action completion handlers and loop wiring.
- Bumped package metadata to `0.9.11`.

### Documentation

- Updated `news.md` with the 0.9.11 technical note.
- Updated `docs/planning/next.md` so the remaining action queue refactor item only covers completion handler modules.

---

## 0.9.10 - Planning export CI validation - 12026-05-25

### Changed

- Added CI validation for planning exports: `npm run planning:export` now runs in GitHub Actions and fails if generated JSON/CSV differ from committed files.
- Bumped package metadata to `0.9.10`.

### Documentation

- Updated `news.md` with the 0.9.10 technical note.
- Updated `docs/planning/next.md` after completing planning export CI validation.

---

## 0.9.9 - Planning export script - 12026-05-25

### Added

- Added `scripts/planning/export-planning.mjs` to generate planning exports from Markdown item front matter.
- Added `npm run planning:export`.

### Changed

- Regenerated `docs/planning/exports/items.json` and `docs/planning/exports/issues.csv` from all planning item files.
- Bumped package metadata to `0.9.9`.

### Documentation

- Updated planning docs to describe the export command.
- Updated `news.md` with the 0.9.9 technical note.
- Updated `docs/planning/next.md` after completing the local planning export workflow.

---

## 0.9.8 - Action recovery refactor - 12026-05-24

### Changed

- Split stamina spending, exhaustion messages and passive/rest recovery into `src/services/actionRecovery.ts`.
- Reduced `src/services/actionQueue.ts` further by moving recovery logic out of the queue runner.
- Bumped package metadata to `0.9.8`.

### Documentation

- Updated `news.md` with the 0.9.8 technical note.
- Updated `docs/planning/next.md` to remove stamina/rest recovery from the remaining action queue refactor TODO.

---

## 0.9.7 - Action queue refactoring and terminology cleanup - 12026-05-24

### Changed

- Split action queue rules and display text into `src/services/actionRules.ts`, keeping duration, priority, stamina cost and queued action titles outside the main queue runner.
- Split player queue and rest status rendering into `src/services/actionQueueView.ts`.
- Kept the existing public imports from `src/services/actionQueue.ts` through re-exports, so handlers and world tick code do not need broad import churn.
- Updated help and admin/debug command text to use `Озирнутися`, `Роздивитися` and `місцина` terminology consistently.
- Bumped package metadata to `0.9.7`.

### Documentation

- Updated `news.md` with the 0.9.7 technical notes.
- Updated `docs/planning/next.md` after completing the queued-action terminology cleanup and the first queue rendering/rules split.

---

## 0.9.6 - Refactoring - 12026-05-24

### Changed

- Refactored shared target resolution into `src/services/targets.ts`, so social target actions and queued action completions use the same inspect/interaction model.
- Refactored shared player text formatting into `src/utils/playerText.ts`, removing duplicated player stats and fatigue formatting from handlers and action queue code.

### Documentation

- Added this technical refactor note to `news.md`, `CHANGELOG.md` and near-term planning notes.
- Added a follow-up planning note to continue splitting the large `src/services/actionQueue.ts` into smaller queue, completion, stamina/rest and rendering modules.

---

## 0.9.5 - Озирнутися, stamina 42, character card and static time - 12026-05-24

### Added

- Added `/time` and the `🕯 Час` menu button with the current static Chornolis time.
- Added static starter time fields: late spring, `Коло Зеленого Шуму`, day 17 and `передвечір’я`.
- Added `Player.isNameApproved` to support future custom-name moderation and approved pre-generated names.
- Added a Prisma migration for stamina defaults and name approval.
- Added planning notes for random names, name validation, foraging, debug mode, action collisions, weather, contacts/groups, combat, opponent assessment, dream tutorial, cowardice/flee thresholds, water sources and food.

### Changed

- Replaced the main location reply button with `👀 Озирнутися`.
- Replaced visible `Придивитися` UI wording with `Роздивитися` in location and target buttons.
- Replaced `Локація` wording in the character card with `Місцина`.
- Increased base stamina from `13` to `42` for players and creatures.
- New players still begin with a temporary over-rested stamina buffer of `BASE_STAMINA × 3`, now `126/42`.
- Changed the normal rest button from the bed icon to `🧘 Відпочити`; the bed icon is reserved for future sleep mode.
- Basic `Озирнутися` now shows exits compactly on one line, for example `Виходи: ПнЗхПдСх`.
- Detailed `Роздивитися` now shows full named exits with destination names.
- Brief location view near active campfires now reveals nearby visible targets and adds direct interaction buttons.
- Character view now shows name cases, name approval status, registration date/time, money line and a placeholder for future active play-time tracking.
- Render deployment docs now list the env variables currently read by `src/config.ts` and mark unused tick/debug placeholders clearly.

### Documentation

- Updated planning backlog/next/icebox with the new design and admin TODOs.
- Updated calendar documentation to mention the current static `/time` output and future dynamic time model.

### Notes

- `package.json` and `package-lock.json` are intentionally not included in this archive.
- Some older queued-action internal phrasing may still say `придивляється`; the visible UI pass is covered here, and the remaining large `actionQueue.ts` wording can be cleaned in a smaller follow-up when editing the full file directly.

---

## 0.9.4 - Documentation restructure and canonical design docs - 12026-05-23

### Added

- Added canonical documentation structure under `docs/`.
- Added `docs/game_design.md` as the primary long-form design pillar document.
- Added `docs/roadmap.md` for roadmap phases and long-term direction.
- Added `docs/systems/progression.md` for use- and observation-based progression design.
- Added `docs/dev/local_setup.md` and deployment-oriented developer documentation.

### Changed

- README now acts as a cleaner landing page and project identity overview instead of storing full planning details.
- Planning and system documentation are now grouped under `docs/planning/`, `docs/systems/` and `docs/dev/`.
- Preserved core README sections such as Vision, Tech Stack, Current Features, Checklist and Inspirations.

### Documentation

- Standardized most technical/design documentation to English.
- Kept `news.md` and in-world flavor text primarily Ukrainian for atmosphere and world identity.
- Clarified liminal frontier identity and use-/observation-based progression pillars across the docs.

---

## 0.9.3 - Admin help recovery, persistent auto and visible location features - 12026-05-22

### Added

- Added persistent player auto-state through `Player.isAutoEnabled` and migration `20260522193000_persistent_player_auto`.
- Added automatic restore of enabled auto timers after process restart/deploy.
- Added `docs/systems/admin_commands.md` with the current admin/debug command list and future access-control TODO.
- Added `docs/systems/auto_mode.md` for current auto-mode behavior, persistence and reset rules.
- Added a manual `/tick` wrapper that returns the latest `World Tick` summary after running a tick.

### Changed

- Restored `/adminHelp` as the full command list instead of the short reset-only list.
- Kept `/reset` in `/adminHelp` without removing older debug commands such as `/world`, `/all`, `/locationAll`, `/addCreature`, `/cleanupCreatures`, `/tickGet`, `/tickSet`, `/auto`, `/autoStop`, `/news` and `/restart`.
- Moved auto-mode out of `☰ Меню`; it is now controlled from the character card and text commands `/auto` / `/autoStop`.
- `📍 Локація` now shows interactive location features such as `🪧 Межовий знак`, `🔥 Незгасне вогнище` and `🚪 Зачинені ворота` immediately, without requiring an extra look/details step.
- `/reset` now clears persistent auto-state together with the rest of the runtime/world reset.
- Planning docs now keep admin permissions and richer auto-mode profiles in backlog/icebox.

### Fixed

- Avoided the duplicate `/adminHelp` behavior where the new short admin handler could hide the older full debug command list.
- Made manual tick feedback more useful for checking animal/NPC behavior by surfacing the world tick counters in chat.

---

## 0.9.2 - Chornolis calendar service - 12026-05-22

### Added

- Added a lightweight Chornolis calendar service with the current world year line: `587 літо після Великого Відступу — Рік Сича під Тихим Вітром.`
- Added `docs/systems/calendar.md` with the basic era, year naming, 13 lunar circles and 13 year-creature cycle direction.
- Added Icebox planning item `CAL-001` for deeper calendar simulation: moon phases, seasons, sacred/dangerous days and generated year names.

### Changed

- `/start` and the post-onboarding welcome message now mention the current Chornolis year.
- Calendar text uses explicit `\n` line breaks in Telegram strings instead of physical newlines inside template literals.

---

## 0.9.1 - Improve menu, location features, added reset the world - 12026-05-22

### Added

- Added `/adminHelp` and development-only `/reset` for resetting non-player world state to the authored starter state.
- Added starter reset rules: one hidden sleeping `Дід лісовик` at `forest_00_00`, `Здравомир` the знахар at the respawn camp, and a small starter rabbit population in forest and dry luka.
- Added creature visibility/profession fields and `SLEEPING` activity state.
- Added `CAMPFIRE` as a normal location feature type alongside `MAGIC_CAMPFIRE`.
- Added documentation for NPC professions, player-like NPCs, and passive/interactive location features.

### Changed

- Moved `Новини`, `Допомога` and `Авто` under `☰ Меню` / `/menu`.
- Main reply keyboard now shows `📋 Черга` only when there is an active queue/rest and shows `🛌/🔥 Відпочити` only when rest is useful.
- Any active campfire-like feature can switch the rest button to `🔥 Відпочити`.
- `Травник` is now represented as profession/fах; the starter NPC is named `Здравомир`.
- `Зачинені ворота` now belongs to the `Поселення` region instead of being its own region.
- Bridge plank features are no longer clickable until bridge/fishing mechanics exist.
- World seed resources are normalized: no gatherables at bridge/start camp/gate, riverbanks seed herbs only, and dry luka has no mushrooms.
- Chornolis split seed package

---

## 0.9.0 - Expanded world seed and bridge start - 12026-05-21

### Added

- Added data-driven static world seed under `prisma/data/chornolis_world_seed.json`.
- Expanded the starter world from the old hardcoded 3×3 map into:
  - western 10×10 starter forest;
  - north, south and west impassable forest walls;
  - widened dry luka / dry meadow east of the forest;
  - separate riverbank region;
  - impassable river cells;
  - old bridge crossing;
  - closed settlement gate;
- Added authored exits instead of automatic full-grid neighbor linking.
- Added blocked-cell metadata in the seed JSON for thickets, river cells and local obstacles.
- Added `LocationFeature` model and `LocationFeatureType` enum for landmarks, bridge/gate objects, light sources and local rest modifiers.
- Added start/respawn location key `start_border_camp`.
- Added start location features:
  - carved border marker;
  - unfading magical campfire;
  - location light flag;
  - stamina rest cap multiplier `×5`.
- Added `docs/world/world_map.md` with map assumptions and deferred work.
- Added `MAP-002: Biome-based resources and spawn rules` to near-term planning.
- Added `seedWorld()` refactor to Icebox instead of doing it in this patch.

### Changed

- Updated `prisma/seed.ts` to read static world data from JSON and seed regions, locations, exits, resource nodes, features and unique creatures.
- Updated start location lookup to use `start_border_camp` instead of the old `center_chornolis_edge`.
- Updated location rendering to show active local features such as campfires, border markers, bridges and gates.
- Kept generic animal spawning out of seed until biome-based spawn rules are designed.

### Notes

- For a local dev database, the cleanest way to replace the old 3×3 map is still `npx prisma migrate reset` followed by `npm run seed`.

---

## 0.8.4 - Visual identity and generated art prompts - 12026-05-21

### Added

- Added first visual identity notes for Chornolis Marches under `docs/art/visual_identity.md`.
- Added preserved generation prompts under `docs/art/prompts/chornolis_art_prompts.md`.
- Added generated concept art assets under `assets/art/generated/`:
  - emblem/logo direction;
  - Telegram welcome screen direction;
  - Ukrainian-inspired forest frontier concept art.
- Captured the main visual palette:
  - dark green;
  - black;
  - deep red;
  - muted gold;
  - cold gray fog.

### Changed

- Documented the preferred visual style as dark Ukrainian / Slavic inspired forest frontier fantasy.
- Clarified that generated images are concept/direction references for Telegram UI, README, landing page, future banners and icon work.

---

## 0.8.3 - Web map and multi-client server idea in Icebox - 12026-05-21

### Added

- Added Icebox planning item `WEB-001: Web map, multi-client server and future MUD gateway`.
- Captured the long-term direction where Telegram, web and MUD clients are different interfaces over the same game core.
- Added first design notes for a future web `/map` page:
  - ASCII/table/grid rendering;
  - location, exit, resource, player, NPC and animal markers;
  - optional `z` and render-mode query parameters;
  - future `/api/map.json` endpoint.
- Added the idea of a shared `MapViewService` so Telegram `/map`, web `/map`, debug tools and a future MUD `map` command can reuse the same data model.
- Added a future MUD/Telnet gateway concept with limited commands such as `look`, `map`, movement, `say`, `inventory`, `attack`, `gather`, `track` and `help`.

### Changed

- Clarified that Telegram should remain an important client, but not the only place where game logic lives.
- Framed web and MUD support as a future multi-client server direction rather than an immediate implementation task.

---

## 0.8.2 - Planning-as-code and portable backlog - 12026-05-21

### Added

- Added planning-as-code structure under `docs/planning/`:
  - `README.md`;
  - `backlog.md`;
  - `next.md`;
  - `icebox.md`;
  - `items/` with export-friendly Markdown planning items;
  - `decisions/` with ADR/DDR-style design decision records;
  - `exports/` with example JSON/CSV exports.
- Added `scripts/planning/export-planning.mjs` for generating machine-readable exports from Markdown planning items.
- Added example backlog/next items for:
  - day/night cycle;
  - campfires and light;
  - early `/respawn`;
  - starter settlement;
  - barter and trade;
  - observation-based learning.
- Added example Icebox items for:
  - mythic skills;
  - rituals and sacred days;
  - caravans;
  - construction.
- Added design decision records for:
  - liminal frontier identity;
  - use- and observation-based progression;
  - repository-first planning.
- Added first-priority ecology planning item:
  - `ECO-001: Reproduction and herbivore overpopulation`.
- Added reproduction as an early living-world priority:
  - rabbits and other herbivores should reproduce when conditions allow;
  - predator pressure should suppress runaway growth;
  - player intervention can destabilize the ecosystem;
  - herbivore overpopulation can consume herbs, berries and young growth.
- Added example world events for rabbit overpopulation and overgrazing.

### Changed

- GitHub Issues/Projects are now treated as a working interface, not the only source of truth.
- Roadmap/backlog ideas can now be stored, reviewed, exported and migrated as plain text files in the repository.

---

## 0.8.1 - Liminal identity and progression design - 12026-05-20

### Added

- Added liminal frontier / Порубіжжя as a core design pillar.
- Added project identity formula:
  - Chornolis Marches is a liminal survival sandbox between settlement, wilderness and міт.
- Added use-based and observation-based progression as a core design pillar.
- Added `docs/systems/progression.md` with:
  - no universal character level;
  - skills improve through relevant actions;
  - skills can be discovered by observing NPCs, animals, monsters or mythical beings;
  - observation can improve a skill when the observed being is more skilled;
  - learning chance depends on attributes, current skill, context, visibility, attention and skill gap.
- Added example learning messages for herbalism, tracking and liminal/mythic observation.

### Changed

- Updated roadmap pillars to include liminality and skill progression through use, observation and apprenticeship.
- Updated roadmap Phase 2 with observation-based learning.

---

## 0.8.0 - Roadmap and design documentation - 12026-05-21

### Added

- Added `ROADMAP.md` with long-term phases:
  - Atmospheric MVP;
  - Survival & Crafting;
  - Living World;
  - Settlements, Economy & Society;
  - Deep Simulation.
- Added `GAME_DESIGN.md` with project pillars:
  - atmosphere first;
  - incomplete information;
  - living ecosystem;
  - survival over power fantasy;
  - world reactivity;
  - Telegram-native play.
- Added system design notes under `docs/systems/`:
  - world time;
  - survival;
  - ecology;
  - crafting;
  - settlements.
- Added GitHub workflow notes under `docs/ux/github_workflow.md`.

---

### 0.7.6 - unified player actions and auto timing - 12026-05-20

### 🎮 Gameplay / UX

- Player actions no longer complete immediately when stamina is non-negative and the queue is empty.
- Manual actions, auto-mode actions, NPC actions and animal actions now all go through `WorldAction` and resolve through tick-based duration.
- Auto-mode is now based on `AUTO_INTERVAL_TICKS` instead of an independent `PLAYER_AUTO_INTERVAL_MS` timer.
- `/tickSet <ms>` now restarts player auto timers together with the world tick and action/recovery loop.
- `/tickGet` now includes auto-mode timing.
- Public “Світ ворухнувся” reports now explicitly say that they are shown once per 5 ticks.

### 🐛 Fixed

- Fixed inconsistent gather result text such as “Ви витратили час на пошуки (1 с)” caused by immediate actions using `durationMs: 0`.
- The first auto action is still scheduled immediately after enabling auto, but it now enters the action queue and completes through normal time.

### 🛠 Technical

- Added live `AUTO_INTERVAL_MS` derived from runtime `TICK_MS`.
- Added auto timer restart support after runtime tick changes.

---

### 0.7.5 - runtime tick tuning - 12026-05-19

### ✨ Added

- Added runtime tick reconfiguration through `/tickSet <ms>` without process restart.
- Added `getRuntimeTimingConfig()` / `setRuntimeTickMs()` in `src/gameConfig.ts`.
- `/tickGet` now explains the full timing model: base tick, world tick, action/recovery loop, action durations, regeneration intervals, resource regeneration and track TTL.

### 🎮 Gameplay / UX

- HP recovery is now faster: passive +1 per 156 ticks, active rest +1 per 78 ticks.
- Rest status text now separates time to regain consciousness, full stamina and full health.
- The old confusing single “До повного відновлення” number is removed.

### 🛠 Technical

- Tick-derived constants in `gameConfig.ts` are now live `let` exports recalculated by `setRuntimeTickMs()`.
- The action/recovery loop can be restarted after runtime tick changes.

---

### 0.7.4 - unified tick, help and knockout - 12026-05-18

### ✨ Added

- Added `hpMax` and `lastHpRegenAt` to `Player`.
- Added migration `20260518194500_hp_recovery_knockout`.
- Added `/help` and persistent `🧭 Допомога` reply-keyboard button.
- Added newcomer help after onboarding completion.
- Added location region display in location cards and `/me`.

### 🎮 Gameplay / UX

- `WORLD_TICK_INTERVAL_MS` is now the main tick value used at startup by:
  - world tick loop;
  - action duration calculations;
  - stamina recovery intervals;
  - health recovery intervals;
  - track TTL.
- `TICK_MS` is kept as a legacy alias only when `WORLD_TICK_INTERVAL_MS` is absent.
- Movement, general actions and gathering are now derived from tick counts instead of being hardcoded to separate millisecond constants.
- Gathering duration now respects each resource's `gatherConfig.ticks`.
- `/news` now shows the latest news section fully and the previous 12 sections as titles only.
- When player HP reaches 0:
  - the player becomes unconscious;
  - active and queued actions are cancelled;
  - rest starts automatically;
  - non-rest actions are blocked until HP recovers to at least 1.
- Passive HP recovery works only while idle; active rest recovers HP faster.
- When HP rises from 0 to 1, the player receives a warning that actions are available again but they are still very weak.

### 🛠 Technical

- Added `config.tickMs` and centralized tick-derived gameplay constants in `src/gameConfig.ts`.
- Updated `/tickGet` / `/tickSet` messaging to clarify runtime tick changes versus env-driven boot configuration.

---

### 0.7.3 - rest/queue/navigation follow-up - 12026-05-18

### ✨ Added

- Added typed movement commands:
  - `/north` / `/n`;
  - `/south` / `/s`;
  - `/west` / `/w`;
  - `/east` / `/e`.
- Movement buttons now call the same command-style movement flow as typed commands.
- Added `/gather` for general gathering from available local resources.
- `/gather herbs`, `/gather berries`, and `/gather mushrooms` can still target a specific material.
- Added rest statistics:
  - how many times rest was started;
  - how many times stamina was fully restored.
- `/me` now shows approximate time to recover stamina passively and by active rest.

### 🎮 Gameplay / UX

- Queue start notifications no longer create a separate `Починаємо...` message; the queue/status message stays the main UI surface.
- Rest interruption and rest queue choices now edit the existing prompt when possible instead of adding another message below it.
- Queue `cancel current` and `clear` now also stop active rest, because rest is shown as part of the action plan.
- `Очистити чергу` now cancels both queued and running interruptible player actions.
- General and specific gathering now both use the same stamina cost: `5`, so the expected base duration is `65 с`, not `78 с`.

### 🛠 Technical

- Added migration `20260518072200_rest_statistics` for rest counters on `Player`.

---

## 0.7.2 - stamina/rest queue UX fixes - 12026-05-18

### 🐛 Fixed

- Player actions now execute immediately while stamina is non-negative and there is no active player queue.
- Once stamina drops below zero, subsequent player actions are added to the queue and use `stamina cost × 13 seconds` duration.
- Normal queue order is FIFO again: priorities can interrupt actions, but they no longer reorder planned movement routes.
- Empty `/queue` output now shows only `Черга дій порожня.` without inline queue/rest buttons.
- Queue controls no longer include `📋 Черга` or `🛌 Відпочити`; rest remains available from the persistent reply keyboard and tired-state prompts.
- Queue feedback is now sent as a separate message below the location instead of replacing the location message.
- Rest button behavior was revised:
  - if there is no active queue, it starts active rest without queue buttons;
  - if a queue exists, the player is asked whether to cancel it and rest now or add rest to the end of the queue;
  - while resting, queued actions render as `Відпочиваєте` followed by `Потім ...`.
- NPCs and animals can now decide to rest when tired; the chance grows as they approach `Дуже втомлений`.
- Herbivores in dangerous locations can ignore fatigue and keep moving, risking HP loss from exhaustion.
- Auto mode now uses the same stamina rule: immediate actions while stamina is non-negative, queued actions when tired.
- The location movement keyboard is more compact: `Придивитися` sits between `Захід` and `Схід`.

### 🎮 Gameplay / UX

- Positive stamina now means quick, immediate actions instead of forcing everything through a delayed queue.
- Tiredness remains meaningful: after stamina drops below zero, the player starts planning slower queued actions until they recover.
- Rest is clearer and less noisy: the persistent `🛌 Відпочити` button is the main rest entry point, while fatigue warnings can suggest rest contextually.
- Planned routes are stable again: movement is appended to the end of the plan instead of jumping to the front because of priority.

### 🛠 Technical

- No new Prisma migration is required beyond the existing 0.7.1 stamina/rest and track migrations.
- Priority remains available for interruption logic, but normal queue ordering is FIFO.
- Auto mode uses the same stamina/action flow as manual player input.
- Immediate actions no longer race with the queue loop, preventing one click from completing movement/look twice.
- `renderPlayerActionQueue()` now uses real newlines instead of a visible `\n` sequence.
- `queue:clear` now cancels both waiting and currently running interruptible actions.
- Queue completion re-checks the latest DB status before applying effects, so recently cancelled actions do not still complete.
- `Придивитися` edits the current location message when possible instead of always creating a new location card.
- Resource and target submenus now include `↩️ Назад` to return to the location details.
- The `Поруч:` list now shows visible current actions for nearby players, NPCs and animals.

### 📝 Notes

- This release supersedes the previous 0.7.1 fix3 archive and should be applied on top of committed 0.7.1.

---

## 0.7.1 - stamina, rest, priorities and tracks - 12026-05-18


### ✨ Added

- Added base stamina model for players and creatures:
  - `stamina` defaults to `13`;
  - `staminaMax` defaults to `13`;
  - `FatigueState`: `RESTED`, `TIRED`, `VERY_TIRED`;
  - `isResting` for players;
  - `lastStaminaRegenAt` for timed recovery.
- Added action costs based on stamina:
  - movement: `1`;
  - look/inspect/track: `3`;
  - gather/freshen/set trap: `5`;
  - attack: `7`;
  - say/greet/eat: `1`.
- Action duration is now calculated as `stamina cost × 13 seconds`.
- Added active and passive stamina recovery:
  - idle recovery: `+1` stamina per minute;
  - resting recovery: `+13` stamina per minute;
  - recovery stops at current `staminaMax`.
- Added `/rest`, `🛌 Відпочити`, and `rest:start` action button.
- Added rest interruption flow:
  - while resting, the first new action asks whether to interrupt rest or queue the action after rest;
  - later queued actions append normally.
- Added `priority`, `interruptible` and `note` fields to `WorldAction`.
- Added `WorldTrack` records for movement traces with actor, direction, strength and expiration time.
- Added text queue controls:
  - `/queue clear`;
  - `/queue cancel`.
- Added first queued carnivore attacks against herbivore prey.

### 🎮 Gameplay / UX

- Everyone starts from a simple baseline: 13 stamina and the `Відпочивший` state.
- Spending stamina below zero moves the actor into `Втомлений` state and sends a warning message for players.
- Reaching `-39` stamina moves the actor into `Дуже втомлений`; further actions start draining HP until the actor recovers above the threshold.
- Recovery sends state messages:
  - partial recovery from very tired;
  - recovery to zero stamina;
  - full rest at maximum stamina.
- `/me` and target inspection now show stamina as `current/max` and a readable fatigue/rest state.
- `/rest` cancels current/waiting player actions and starts active recovery.
- Movement, gathering, look, inspect, greet, say, attack, track and freshen now spend stamina through the same queue layer.
- Urgent actions such as attacks can still jump ahead of slow plans.
- Movement creates fading traces that can be found by queued tracking.
- `/track` reports recent traces in the current location when available.
- Carnivores can queue attacks against prey instead of only “looking” at it.

### 🛠 Technical

- Added migration `20260518070100_action_queue_priorities_tracks`.
- Added migration `20260518071100_stamina_rest_states`.
- Queue processing now pauses player queued actions while the player is resting.
- Queue processing also handles timed stamina recovery for idle/resting players and idle creatures.
- Existing 0.7.0 action queue migration remains unchanged; 0.7.1 is a follow-up release.

### 📝 Notes

- This is still not a full combat system. Creature attacks use a simple debug damage flow.
- `staminaMax` is intentionally stored now so future housing, campfire, skills, traits or environment bonuses can modify it.
- Track interpretation is intentionally minimal for now; richer scents, footprints, freshness and stealth can build on `WorldTrack`.


---

## 0.7.0 - universal delayed action queue - 12026-05-16

### ✨ Added

- Added persistent universal world action queue stored in PostgreSQL via new `WorldAction` model.
- Added Prisma enums:
  - `WorldActorType`;
  - `WorldActionType`;
  - `WorldActionStatus`.
- `WorldAction` supports both actor kinds:
  - players;
  - creatures, including animals and NPCs.
- Added action queue service:
  - starts queued actions;
  - completes due actions;
  - validates action state at execution time;
  - survives bot restarts/deploys because actions are no longer only in memory.
- Added `/queue` command for showing the current player action plan.
- Added inline queue controls:
  - `📋 Черга`;
  - `✋ Скасувати поточну`;
  - `🧹 Очистити чергу`.

### 🎮 Gameplay / UX

- Movement is no longer instant for players.
- Pressing a direction button now adds movement to the player's action queue.
- Repeated movement presses build a route-like plan, e.g. north → east → south.
- Gathering also goes through the same queue, so players can mix movement and gathering in one plan.
- Player actions now queued:
  - movement;
  - gathering;
  - `/look` / `Придивитися`;
  - target inspection;
  - greeting;
  - attack;
  - corpse freshening;
  - `/say`;
  - tracking placeholder.
- NPCs and animals now use the same queue for world tick actions:
  - movement;
  - gathering;
  - eating;
  - looking/tracking behavior;
  - speaking;
  - resting/waiting.
- Lisovyk awakening/sleeping remains an immediate systemic state transition, but active Lisovyk behavior after awakening is now queued:
  - moving through the forest;
  - looking/listening;
  - future hunting behavior.
- World tick now plans creature actions instead of instantly moving or gathering with creatures.
- Movement notifications and location changes happen when the movement action finishes, not when the action is planned.
- Gathering and social actions check the current location, target and resource availability at completion time, so stale queued actions can fail naturally if the world changed.

### 🛠 Technical

- Added `src/services/actionQueue.ts` as the central queue processor for players and creatures.
- Added `src/handlers/actionQueue.ts` for `/queue` and queue control callbacks.
- Updated `src/handlers/movement.ts` to enqueue movement instead of directly changing `currentLocationId`.
- Updated `src/handlers/gather.ts` to enqueue gathering instead of using memory-only `runDelayed()`.
- Updated `src/handlers/look.ts`, `src/handlers/social.ts` and `src/handlers/say.ts` to enqueue active player actions.
- Updated `src/services/worldTick.ts` so animal/NPC behavior queues `WorldAction` records instead of applying movement/gather/eat instantly.
- Updated Lisovyk tick behavior to queue either `MOVE` with `нишпорить між деревами` or `LOOK` with `полює й дослухається до лісу`, while keeping wake/sleep transitions immediate.
- Added action queue gameplay constants:
  - `DEFAULT_ACTION_DURATION_MS = 13_000`;
  - `ACTION_QUEUE_POLL_MS = 1_000`;
  - `MIN_ACTION_DURATION_MS = 1_000`;
  - `MAX_QUEUED_ACTIONS_PER_ACTOR = 12`;
  - per-action durations in `actionDurationConfig`.
- `startActionQueueLoop(bot)` now starts beside the world tick loop in `src/bot.ts`.

### 📝 Notes

- This release intentionally keeps combat simple: queued attack still uses the current debug animal-kill behavior.
- Predator hunting can later become queued `ATTACK`/`EAT` behavior without changing the overall queue architecture.
- Future crafting, traps, resting effects, gathering professions and travel skills should reuse `WorldAction`.

---

## 0.6.2 - compound Ukrainian names grammar - 12026-05-16

### ✨ Added

- `guessNameForms()` now declines every word in a Cyrillic compound name instead of changing only the last word.
- Added support for hyphenated name parts by declining each hyphen-separated piece.
- Added a small indeclinable-parts list for particles such as:
  - `де`;
  - `фон`;
  - `ван`;
  - `аль`;
  - `ібн`;
  - `огли`.

### 🎮 Gameplay / UX

- Suggested onboarding forms are better for names like:
  - `Дід Чорноліс` → `Діда Чорноліса`;
  - `Сірий Вовк` → `Сірого Вовка`;
  - `Трегол Син Туману` → `Трегола Сина Туману`;
  - `Око-Буревій` → `Ока-Буревія`.
- Character name length limit increased from 32 to 64 characters for two- and three-word names.

### 🛠 Technical

- No Prisma migration required.
- Stored full-case forms remain the source of truth after onboarding confirmation.

---

## 0.6.1 - restart onboarding reset command - 12026-05-16

### ✨ Added

- Added `/restart` debug/admin command for resetting the current player character.
- `/restart` removes the current player's inventory/resources and then deletes the player row.
- After `/restart`, `/start` begins the 0.6.0 onboarding flow again from the beginning.

### 🛠 Technical

- Exported `stopPlayerAuto()` from `src/handlers/auto.ts` so reset can stop in-memory auto mode before deleting the character.
- Added a `SYSTEM` world event when a player reset is performed.
- No Prisma migration is needed.

### 📝 Notes

- `/restart` resets only the current Telegram user's own character. It does not delete other players.

---

## 0.6.0 - Ukrainian grammar and character onboarding - 12026-05-14

### ✨ Added

- Added first-login character onboarding for new players:
  - pronoun selection: `Він`, `Вона`, `Вони`;
  - character name validation;
  - Cyrillic/Latin-only name policy without mixed alphabets;
  - Unicode NFKC normalization and invisible/bidi character stripping;
  - Ukrainian case confirmation for Cyrillic names.
- Added player name forms:
  - nominative;
  - genitive;
  - dative;
  - accusative;
  - instrumental;
  - locative;
  - vocative.
- Added grammar fields for creature species and unique named creatures.
- Added `src/services/grammar.ts` as a reusable Ukrainian grammar layer for names, forms, animacy and simple fallback declension.
- Added Prisma enums:
  - `GrammaticalGender`;
  - `Animacy`;
  - `PlayerPronoun`.
- Added migration `20260511060000_ukrainian_grammar_onboarding`.

### 🎮 Gameplay / UX

- Social/combat text can now use correct Ukrainian cases:
  - `Ви сказали Травнику`;
  - `Ви атакували зайця`;
  - `Ви придивляєтесь до вовка`;
  - `Ви освіжували труп зайця`.
- Existing players are marked as onboarded during migration so deployment does not lock old accounts behind the new flow.
- New players must complete onboarding before entering the world.

### 🛠 Technical

- Creature species now store canonical Ukrainian forms seeded for:
  - заєць;
  - миша;
  - лисиця;
  - вовк;
  - лісовик;
  - травник.
- Unique NPCs can override species forms, e.g. `Дід Чорноліс` and `Травник`.

### 📝 Notes

- This is a foundation for fuller localization, not a complete Ukrainian morphology engine.
- Manual forms remain the source of truth for NPCs, monsters, fantasy names and future quest entities.

---

## 0.5.3 - corpse inspection, greetings and stats UX - 12026-05-11

### ✨ Added

- Corpses can now be inspected as targets after an animal is killed.
- Fresh corpses show an `Освіжувати` action while enough decay time remains.
- `/me` now shows player statistics:
  - steps;
  - looks;
  - sayings;
  - greetings;
  - gather attempts and success rate;
  - gathered berries/mushrooms/herbs;
  - killed animals.
- Inspecting another player now shows the same statistics.

### 🐛 Fixed

- Inspecting a corpse no longer says that the target is gone while the corpse still exists.
- `/news` now shows only the latest five news entries instead of the full history.

### 🛠 Technical

- Greeting actions continue to notify other players in the same location.
- Greeting actions continue to write `GREET` world events.

---

## 0.5.2 - debug hunting and expanded stats - 12026-05-11

### ✨ Added

- Added temporary debug attack system for animals.
- Attacking an animal now:
  - kills it instantly;
  - creates a corpse;
  - starts corpse decay lifecycle.
- Added expanded player statistics:
  - `animalsKilled`
  - `berriesGathered`
  - `mushroomsGathered`
  - `herbsGathered`

### 🎮 Gameplay

- `⚔️ Атакувати` now works on animals instead of showing a placeholder message.
- Corpses produced by attacks integrate into the existing aging/corpse lifecycle system.

### 🛠 Technical

- Updated social interaction handler for creature combat debug flow.
- Extended Prisma Player schema with gathering/hunting counters.

---

## 0.5.1 - creature debug helpers and safer addCreature - 12026-05-11

### ✨ Added

- Added `/forceOld [speciesKey] [count]` debug command to force selected animals in the current location into old age for testing aging, old-age death and corpse decay.
- Extended `/addCreature` to accept either `locationKey` or `x,y,z` coordinates.
- Extended `/addCreature` with optional age: `YOUNG`, `ADULT` or `OLD`.
- `/addCreatureHelp` now shows species lifecycle parameters.

### 🐛 Fixed

- Restored admin/status commands from 0.4.x after the aging patch.
- Fixed `/addCreature` diagnostics for unknown species and locations.
- Removed the invalid `maxHp` write from `/addCreature` so the command matches the current Prisma schema.

### 🧪 Testing

- Added a quicker manual way to verify non-zero old-age deaths and corpse decay counters by spawning old animals and running `/tick`.

---

## 0.5.0 - aging and corpse lifecycle - 12026-05-06

### ✨ Added

- Added animal aging to the world tick loop.
- Added lifecycle profile fields to `CreatureSpecies`:
  - child/young/adult/old duration in ticks;
  - old-age death chance and growth;
  - corpse decay duration;
  - mushroom bonus after decay.
- Added lifecycle fields to `Creature`:
  - `ageTicks`;
  - `diedAtTick`;
  - `corpseDecayTicksLeft`;
  - `isGone`.
- Aging currently uses the existing `CreatureAge` stages: `YOUNG`, `ADULT`, `OLD`; corpse state is represented by `isAlive`, `isGone`, `diedAtTick` and `corpseDecayTicksLeft`.
- Added visible animal corpses to location details.
- Added mushroom growth after corpse decay.
- `/world` and status data now show animal corpse and gone-animal counts.
- `/all dead` now shows age, age ticks, corpse state, and decay counter.

### 🎮 Gameplay

- Player and NPC time is still effectively stopped for aging purposes.
- Animals now age every world tick.
- Old animals have a growing chance to die from old age.
- Dead animals remain as corpses for several ticks before disappearing.
- Corpse decay feeds the forest by increasing mushrooms in the same location.
- Existing movement, herbalist behavior, resource regeneration, Lisovyk awakening/recovery and debug tick commands are preserved from 0.4.x.

### 🛠 Technical

- The 0.5.0 patch is based on 0.4.12 and keeps the 0.4.x `worldTick.ts` changes:
  - `notifyLocation` / `notifyRegion`;
  - `buildTargetListKeyboard` / `buildTrackKeyboard`;
  - `WORLD_DEBUG` / `WORLD_TICK_DEBUG`;
  - `HERBALIST_SPEAK_CHANCE` and herbalist phrases;
  - directional entry text;
  - manual `/tick`, `/tickGet`, `/tickSet` commands.
- Seed now updates lifecycle profile values for animal species but still does not spawn animals automatically.

### 📝 Notes

- Reproduction is intentionally not included in 0.5.0.
- Predator hunting priority by old/weak prey is planned for a later version.
- Full track freshness system is still planned separately.

---

## 0.4.12 - latest 0.4.x baseline - 12026-05-06

### 🛠 Technical

- 0.5.0 was prepared on top of this version.
- See Git history for detailed 0.4.9–0.4.12 changes.

---

## 0.4.8 - player auto mode and cleaner Telegram menu - 12026-05-06

### ✨ Added

- Added `/location` / `/loc` command and the persistent `📍 Локація` button.
- Added persistent `Персонаж` button for `/me`.
- Added `/auto` and `/autoStop` (`/autostop`) player auto mode.

### 🐛 Fixed

- Removed `/start` from the persistent keyboard.
- Removed quick-access command hints from deploy/world tick broadcasts.
- Broadcasts now keep the persistent keyboard attached so location/player buttons remain available.
- Animal movement notifications now use “щось” instead of “хтось”.
- Animal presence is visible in location descriptions as `Поруч щось є`.
- Locations with animals show only `Оглянути` and `Атакувати` interaction buttons, without greeting.

---

## 0.4.7 - creature control and debug status UX - 12026-05-06

### ✨ Added

- Added `/addCreature <speciesKey> <locationKey|x,y,z> [count]` debug command.
- Added a minimal persistent Telegram keyboard.
- `/world`, `/health`, and the status page expose latest world events.

### 🐛 Fixed

- `/cleanupCreatures` removes all animals and leaves only canonical unique NPCs.
- Seed no longer spawns animals on every deploy/seed run.

---

## 0.4.0 - world tick - 12026-05-06

### Added

- Added basic async world tick service.
- World tick periodically updates living creatures without requiring player actions.
- Herbalist autonomously gathers herbs and moves toward nearby herb sources.
- Lisovyk awakening is handled by world tick when resources are depleted.

---

## 0.3.0 - bot.ts refactor - 12026-05-06

### Changed

- Split large `src/bot.ts` into focused modules.
- Kept `src/bot.ts` as app composition/startup file.

---

## [0.2.0] - 12026-05-05

### ✨ Added

- Detailed `/look` system.
- Resource gathering system.
- Basic inventory support.
- World events logging.

---

## [0.1.0] - 12026-05-04

### ✨ Added

- Initial Telegram bot using grammY.
- Player creation via `/start`.
- PostgreSQL + Prisma integration.
- Deployment to Render.

---

## [0.0.x] - Early prototype

### ✨ Added

- Initial project idea: Telegram-based RPG.
- Naming: **Chornolis Marches**.
