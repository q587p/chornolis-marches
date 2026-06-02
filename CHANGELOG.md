# Changelog

All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.

---

## [Unreleased]

## 0.15.13 - Strange totems and dismantle action - 12026-06-02

### Changed

- Added Strange Totem `LANDMARK` features to the dry luka and riverbank seed data as a first small wilderness trace.
- Added a queued `DISMANTLE_TOTEM` action with a feature button, `/dismantle_totem`, English MUD-style aliases and Ukrainian aliases.
- Dismantling an active Strange Totem now rewards `twigs`: fresh totems yield a small variable amount, while old last-day totems yield a smaller amount.
- Strange Totems now age on world time: old totems can shed a small `twigs` bundle once, and active totems expire after seven in-game days.
- Added a guarded daily ambient spawn pass for Strange Totems in dry luka and riverbank locations, with region caps, player/presence safety checks and suspicious tracks toward a visible exit.
- Updated location feature inspection, `/help`, `/commands`, deep-link handling and regression coverage for the new dismantle path.
- Scribe/admin `/addCampfire` now creates a lit handmade campfire by default, while `/addCampfire debug` keeps the old service-fire path.
- Added `/addLitTorch`, `/addItem`, a scribe/admin inventory-items submenu, and coordinate teleport buttons on `/locationAll`.
- Polished short Telegram usage prompts so command verbs such as `give`, `дати`, `say`, `whisper`, `reply` and `shout` are visually emphasized in examples.
- Refreshed the main reply-keyboard vitals after stamina-spending action results such as freshening, speech and item actions when exact or visible status labels change.
- Added a `Підібрати все` button for visible ground objects so players can pick up all loose location items and visible corpses listed under `Лежить`.
- Kept buffered non-player movement notifications and their target buttons aligned with visibility: uncertain `Хтось` movement no longer exposes a concrete target button, while lit/visible movement keeps the actor name.
- Target action keyboards now hide `Атакувати` when the target is not actually attackable, including spirit presences such as the camp spirit cat.

- Polished the world-date line used by `/start`, `/time` and tutorial date hints: named years now use lowercase `рік`, lunar circles are separated with a comma, and `/start` keeps the formal `Ви` tone.
- Added a short return-from-AFK/end-session hint to `/start` when the player resumes after a quiet session pause.

## 0.15.12 - Ukrainian give parser and rest recovery polish - 12026-06-02

### Changed

- Added the first Ukrainian inflection-tolerant `give` parser slice for the existing raw-meat-to-camp-spirit-cat transfer.
- Canonicalized common raw-meat item phrases such as `сире м'ясо`, `сирого м'яса`, `м'яса` and apostrophe-less `мясо` to the supported `raw_meat` give item in this narrow transfer path.
- Canonicalized camp cat target forms such as `коту`, `котові`, `кіт`, `бережнику` and hyphenated `котові-бережнику` to the same visible target search.
- Extended input-alias and target-alias coverage so `/give`, slashless `give`, Ukrainian `дати`, `/feed_raw_meat` and `/feed_raw_meet` remain on one canonical action path.
- Updated camp spirit cat, input-alias and planning docs for the first `GIVE-002` parser slice while keeping broader gifts, item-instance transfer and barter as follow-up work.
- Increased active-rest stamina recovery from `13` to `26` stamina per rest interval.
- Active campfires now provide a minimum `x3` stamina-rest speed multiplier, while authored stronger rest multipliers still win when present.
- Split character-card recovery hints so stamina timing no longer gets hidden behind HP recovery, and the player sees separate `without rest`, `with rest` and `near campfire` estimates.
- Added a runtime first-use mushroom warning so the first mushroom eaten after this release cautions that mushrooms can be poisonous and may be worth saving for future elixirs or tinctures.
- Recorded follow-up planning for food-use statistics, including eaten resources and mushroom poisoning outcomes.
- Registered `/give` as a direct Telegram bot command so clickable public-news command hints no longer rely on text-alias middleware.
- Tightened the public-news clickable-command regression test so bare slash hints must be registered bot commands or public Herald commands.

## 0.15.11 - Camp cat raw-meat give bridge - 12026-06-02

### Changed

- Added a first generic `give` bridge for giving one raw-meat unit to a visible valid target, currently the camp spirit cat.
- Added `Дати сире м'ясо` target UI for the camp spirit cat when the player has raw meat, plus `/give`, slashless `give`, Ukrainian `дати`, `/feed_raw_meat` and typo-tolerant `/feed_raw_meet` parser coverage.
- Compacted starter shared-cache contribution buttons so each resource shows one-row `leave one` / `leave all` controls instead of doubling the button stack.
- Polished the no-argument `yell` usage prompt so command examples are visually emphasized.
- Stopped completed freshening source messages from being rewritten to the old generic “prey freshened” summary after the newer weapon-aware result message is sent.
- Hardened direct player-target Telegram deliveries for greetings, whispers, creature replies and social signals so blocked-user private sends no longer fail the action queue.
- Polished the no-argument `/yell` usage prompt and kept the command examples visually emphasized.
- Updated help, camp cat ecology docs and planning notes for the small exchange/feeding slice.

## 0.15.10 - Camp cat cache presence, mouse priority and pounce - 12026-06-02

### Changed

- Added quiet camp spirit cat presence copy to starter shared-cache inspection when the cat is visibly in the same location.
- Added a first camp-local mouse-priority behavior for the spirit cat: local live mice now make the cat choose its mouse-listening watch posture before ordinary up/down movement.
- Added a first same-location mouse pounce for the camp spirit cat in the starter camp/watchtower pair, queued through the existing attack action flow.
- Added cat-specific miss, wound and kill copy for that local pounce so it no longer falls back to generic predator text.
- Added contextual full-examination detail for the camp spirit cat based on local mice, daypart, active campfire light and watchtower position.
- Added safe main-bot deep links and `/start cmd_*` routing for public news references to `/say`, `/build_campfire`, `/light_campfire`, `/douse_campfire` and `/dismantle_campfire`.
- Updated camp cat, beginner cache, ecology, onboarding and planning docs for the combined behavior slice.

## 0.15.9 - Movement target buttons and animal escalation - 12026-06-02

### Changed

- Coalesced non-player/non-animal creature movement notifications can now include target buttons only for living, visible creatures still present in the location at flush time, while stale movement buttons are still cleared.
- Repeated directed speech toward a wolf within a short runtime window can escalate from a warning growl to a local danger marker.
- Added `ANIMAL_SPEECH_PROVOCATION_WINDOW_MS` and `WOLF_SPEECH_PROVOCATION_THRESHOLD` runtime knobs for tuning repeated animal-speech escalation.
- Clarified campfire-adjacent action button icons so rest, cooking and torch-lighting controls are easier to distinguish.
- Player-facing `/time` now renders the borderland clock as an approximate phrase without exact minutes; exact minute-level time remains in scribe/admin debug surfaces.
- Softened posture-block copy for pickup/build-adjacent actions so failed physical actions while sitting or lying describe the intended work more accurately.
- Web `/news` now renders inline backtick text as emphasis and turns whitelisted public slash commands into deep links to the main game bot.
- `/addCampfire` now creates a player-made-like prepared campfire by default for scribe/admin QA of light/douse/dismantle buttons; `/addCampfire debug` keeps the old immediately burning debug campfire behavior.

## 0.15.8 - Polish, quieter movement and survival edges - 12026-06-02

### Changed

- Added a temporary raw mushroom poison bridge: eating carried `mushrooms` now has a 1-in-10 chance to consume the mushroom, reduce HP by roughly one third without dropping below 1 HP in this first slice, and increase hunger by `+1`.
- Documented the temporary mushroom risk as a bridge toward the future mushroom-variety and poison/effect system.
- Corpse target resolution now treats corpses as ground objects: darkness hides corpse inspection, pickup and freshening targets, including stale inline buttons and queued freshening completion.
- Stopped completed freshening source messages from being rewritten to the old generic “prey freshened” summary after the newer weapon-aware result message is sent.
- Coalesced visible non-player/non-animal creature movement notifications per location so quick arrival/departure sequences send one compact message with one tracks button instead of several short Telegram messages.
- Added `NON_PLAYER_MOVEMENT_NOTIFICATION_WINDOW_MS` for tuning the non-player movement notification coalescing window.
- Added the first animal-directed speech reaction slice: targeted `SAY` / `WHISPER` to visible animals can produce species-shaped local reactions, and startled mice/rabbits can queue ordinary movement through existing animal movement boundaries.
- Added text and slash aliases for handmade campfire work: `/build_campfire`, `/light_campfire`, `/douse_campfire`, `/dismantle_campfire`, plus Ukrainian and MUD-style forms such as `скласти вогнище`, `make fire`, `підпалити вогнище`, `put out campfire` and `розібрати вогнище`.

## 0.15.7 - Player-made campfires - 12026-06-02

### Added

- Added player-made ordinary campfires built from `twigs ×5`, starting as prepared unlit `CAMPFIRE` location features.
- Added queued `BUILD_CAMPFIRE`, `DOUSE_CAMPFIRE` and `DISMANTLE_CAMPFIRE` actions with stamina costs, priorities and action titles.
- Added inventory and feature-inspection buttons for building, lighting, dousing and dismantling handmade campfires.
- Added wet-location campfire handling for `RIVER` and `SWAMP` biomes: wet builds ask for confirmation and burn for a shorter duration once lit.
- Added local handmade campfire clutter limits and focused helper tests for build state, dismantling, wet duration, location limits and action costs.
- Added campfire system and implementation-planning docs for the new survival loop.

### Changed

- Lighting a prepared handmade campfire from a lit torch now uses the existing ordinary campfire light path while preserving the handmade feature state.
- `twigs` inventory inspection now explains when fewer than five are carried, instead of silently hiding the build action.
- Magic and seeded lore campfires remain protected from dousing/dismantling controls.

### Validation

- Ran `node scripts/test/campfire-build.cjs`.
- Ran `node scripts/test/campfire-dismantle.cjs`.
- Ran `node scripts/test/campfire-location-limit.cjs`.
- Ran `node scripts/test/campfire-wet-location.cjs`.
- Ran `node scripts/test/action-costs.cjs`.
- Ran `cmd /c npm test`.
- Ran `cmd /c npm run build`.
- Ran `git diff --check`.

## 0.15.6 - Camp cat watch and owl boundary - 12026-06-01

### Added

- Added a camp spirit cat watch-posture helper so cat `LOOK` actions can surface nonverbal camp-watch body language for mice, night, dusk, dawn, active campfire light and the watchtower.
- Added a passive player hunger bridge tied to the internal world clock: after onboarding and outside tutorial dream locations, hunger rises by `+1` for each full four in-game hours, with a persisted marker so deploys and time resets do not backfill surprising hunger debt; eating food that reduces hunger refreshes that marker.
- Added focused camp-cat and owl-boundary assertions for the new helper behavior.
- Added focused passive hunger progression assertions.

### Changed

- Creature `LOOK` completions now preserve a queued `payload.reason` as the visible current action, instead of flattening every creature look into `озирається`.
- Direct `look` and `examine` text for the camp spirit cat are now distinct: brief look stays compact, while full examination gives richer attentive detail.
- Starter camp and watchtower are now routine owl-safe locations: owls do not choose exits into those locations, and an owl that somehow reaches them tries to leave or only watches instead of hunting there.
- No-argument speech aliases such as `yell`, `call`, `гукнути`, `whisper`, `say` and `shout` now route to the same usage prompts as their slash commands instead of falling through to unknown-input fallback.
- Local speech now notices when `say` / `сказати` starts with the exact name of a known player or non-animal creature who is not visible nearby, and suggests yelling, shouting or checking tracks instead of treating the name as ordinary spoken text.
- Vertical `Гукнути вгору` / `Гукнути вниз` buttons now ask for the next chat message and submit it through the `/yell` path, instead of only telling the player to type `/yell <text>` manually.
- `Гукнути вгору` now appears inside inspected upward vertical features such as the starter camp `Сторожова вежа`, instead of as a general location-level button.
- The starter watchtower now has an inspectable `Сходи вниз` feature with `Спуститися вниз` and `Гукнути вниз` actions, so downward calling is also tied to a visible vertical feature instead of the whole location view.
- The starter camp newcomer board now points more atmospherically toward the watchtower as the place to seek light before leaving camp.
- The starter shared cache now offers per-supply `Лишити всі/весь/все` contribution buttons that queue one item at a time into the cache, while taking from the cache remains one item at a time.
- `/put` can now route supplies into the starter shared cache as well as carcasses into the dropoff pit; `put twigs 3 cache` and `put all twigs in cache` use the same one-at-a-time queue as the new cache buttons.
- Documented the broader rule that new visible features, creatures, objects and locations should keep brief `look` text meaningfully distinct from full `examine` text.
- Marked `CAT-009` and `OWL-003` as testing after this narrow implementation slice.

### Validation

- Ran `node scripts/test/camp-cat.cjs`.
- Ran `node scripts/test/owl-nocturnal.cjs`.
- Ran `node scripts/test/creature-movement.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/speech-ranges.cjs`.
- Ran `node scripts/test/tree-features.cjs`.
- Ran `node scripts/test/news-clickable-commands.cjs`.
- Ran `cmd /c npm run planning:export`.
- Ran `cmd /c npm test`.
- Ran `cmd /c npm run build`.
- Ran `git diff --check`.

## 0.15.5 - Nearby speech ranges - 12026-06-01

### Added

- Added nearby speech through `/yell`, `yell`, `call`, `гукнути`, `покликати` and related aliases. Nearby speech reaches the current location plus visible adjacent exits, including vertical `UP`/`DOWN` links.
- Added contextual vertical prompt buttons for visible `UP`/`DOWN` exits so tree and tower views can offer a nearby call without using region-wide `/shout`.
- Added speech-range system docs, command-compatibility notes and focused helper/parser tests.
- Added follow-up planning items for camp-cat watch posture, camp-cat beginner-cache presence and starter-camp owl boundary tuning.

### Changed

- Kept `/shout` and aliases such as `крикнути` / `волати` region-wide while moving `гукнути` / `покликати` to the smaller nearby speech range.
- Kept `SPIRIT` / `SPIRITUAL` beings out of public `/who`, web `/who` and `/who.json`, so guardian presences such as the camp spirit cat and Дід лісовик are not listed as active characters.
- Marked `SOC-008` as testing and recorded `ONB-007` as the follow-up dream-tree tutorial scene for teaching vertical voice.
- Recorded `CAT-009`, `CAT-010` and `OWL-003` as small future camp ecology/atmosphere slices.

### Validation

- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/speech-ranges.cjs`.
- Ran `node scripts/test/who-public-creatures.cjs`.
- Ran `node scripts/test/help.cjs`.
- Ran `node scripts/test/news-clickable-commands.cjs`.
- Ran `cmd /c npm run planning:export`.
- Ran `cmd /c npm test`.
- Ran `cmd /c npm run build`.
- Ran `git diff --check`.

## 0.15.4 - Camp cat boundary and web predator stats - 12026-06-01

### Added

- Added web `/stat` predator-by-species rows so owl, fox and wolf pressure can be compared in the browser, reusing existing ecology stats data.
- Added a first camp-bound behavior layer for the `camp_spirit_cat`: normal world ticks now keep it between the starter camp and the watchtower instead of letting ordinary movement pick wilderness exits.
- Added focused web-stat rendering and camp-cat boundary coverage.

### Changed

- Marked `STAT-001` and `CAT-002` as testing after this narrow implementation slice.
- Kept cat mouse hunting, raw-meat `give` scenes and pet/companion behavior deferred to later `CAT-*` / `GIVE-*` work.

### Validation

- Ran `cmd /c npm run planning:export`.
- Ran `node scripts/test/web-stat-render.cjs`.
- Ran `node scripts/test/camp-cat.cjs`.
- Ran `node scripts/test/ecology-stats.cjs`.
- Ran `cmd /c npm test`.
- Ran `cmd /c npm run build`.

## 0.15.3 - Camp spirit cat foundation - 12026-06-01

### Added

- Added the `camp_spirit_cat` spirit species and seeded one visible `Кіт-бережник` in the starter camp.
- Added camp-spirit-cat inspection copy that presents the cat as non-speaking body language rather than a normal NPC dialogue target.
- Added the camp spirit cat system note, implementation plan and small `CAT-*` / `GIVE-*` / `BARTER-*` planning items from the feature handoff.
- Added `STAT-001` to track the missing web `/stat` predator-by-species table for owl/fox/wolf comparison.
- Added focused camp-cat seed/lexicon/inspection coverage.

### Changed

- Marked `CAT-001` as testing and recorded `GIVE-001` as the prerequisite before later raw-meat feeding UI.
- Kept the camp cat out of ordinary animal lifecycle pressure by modeling it as `SPIRIT` / `SPIRITUAL`, not as a normal animal.

### Validation

- Ran `cmd /c npm run planning:export`.
- Ran `node scripts/test/camp-cat.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `cmd /c npm test`.
- Ran `cmd /c npm run build`.

## 0.15.2 - Owl pressure signs and tuning - 12026-06-01

### Added

- Added a fourth starter owl at the riverbank edge so night mouse pressure covers the riverbank cluster without placing a predator directly inside the breeding cell.
- Added four inspectable local owl-sign landmarks with daypart-aware text for night, dawn and day.
- Added predator performance grouped by species to scribe/admin ecology stats so owl impact can be compared against fox and wolf pressure.
- Added focused tests for owl-sign copy and seed authoring.

### Changed

- Moved `OWL-002` into testing with implementation notes for the starter owl placement, indirect signs and post-deploy tuning watchpoints.
- Updated ecology docs and next-planning notes for the owl tuning slice.

### Validation

- Ran `cmd /c npm exec -- prisma generate`.
- Ran `node scripts/test/starter-animals.cjs`.
- Ran `node scripts/test/owl-nocturnal.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `node scripts/test/ecology-stats.cjs`.
- Ran `node scripts/test/news-clickable-commands.cjs`.
- Ran `npm run planning:export`.

## 0.15.1 - Profession line-bank polish - 12026-06-01

### Added

- Expanded hunter field line banks across departure, trail, return, deposit, give-up and stand-down moments.
- Expanded hunter conversation replies and herbalist ambient lines so early profession NPCs repeat less during mapping and observation-heavy play.
- Added owl-specific predator action text so owl attacks read as nocturnal, winged signs instead of generic predator messages.
- Added focused ambient-line coverage for hunter field lines, hunter replies and the larger herbalist line bank.

### Changed

- Moved `NPC-007` into testing after this line-bank slice without changing NPC message cadence or profession behavior.
- Added `OWL-002` planning for the next owl tuning pass after live ecology observation.
- Added focused owl text coverage for the new predator attack helper.

### Fixed

- Made `cook all` account for already queued cooking actions and the remaining player action slots, so it no longer tries to overfill the queue when raw meat is already planned for cooking.

### Validation

- Ran `npm run planning:export`.
- Ran `node scripts/test/ambient-lines.cjs`.
- Ran `node scripts/test/npc-hunter.cjs`.
- Ran `node scripts/test/owl-nocturnal.cjs`.
- Ran `node scripts/test/attack-rules.cjs`.
- Ran `node scripts/test/news-clickable-commands.cjs`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.15.0 - Nocturnal owl ecology - 12026-06-01

### Added

- Added `owl` as an `ANIMAL` / `CARNIVORE` creature species seeded with three starter animals.
- Added a nocturnal activity sync for owls: they hide and sleep during the day, canceling queued or running owl actions, then wake and unhide at dawn, dusk and night.
- Added owl predator targeting rules that strongly prefer mice, only lightly target child or young rabbits, and avoid other prey in this minimal patch.
- Added owl-specific starter action text and a focused owl nocturnal regression script.

### Changed

- Included owls in starter predator population-floor restoration while keeping breeding-pair restoration limited to rabbits and mice.
- Set owl attack base chance to `42` to make them a meaningful mouse predator without adding flight, nests, eggs, ranged hunting or reproduction.

### Fixed

- Added an extra creature attack completion guard so hidden or sleeping attackers cannot finish a queued attack if daypart sync has already put them out of action.

### Documentation

- Updated ecology and next-planning notes for the first early `0.15.x` ecology stabilization slice before the observation-learning line.

### Validation

- Ran `node scripts/test/starter-animals.cjs`.
- Ran `node scripts/test/population-restoration.cjs`.
- Ran `node scripts/test/owl-nocturnal.cjs`.
- Ran `npm test`.
- Ran `npm run build`.

## 0.14.23 - Reconciliation and safety slice - 12026-06-01

### Added

- Added a central ordinary sleep command gate so active player commands and active callback buttons are blocked while a character is asleep, while passive commands such as `/wake`, `/time`, `/weather`, `/help`, `/commands`, `/chronicles`, `/news`, settings and session-safety commands remain available.

### Fixed

- Added an explicit `/shout` bot command route so clickable command hints open a useful usage prompt instead of falling through when no shout text is supplied.
- Made `/restart` and slashless `restart` share an explicit confirmation prompt before deleting character state.
- Slowed player hunger spikes so ordinary stamina-spending actions no longer add hunger every time; hunger now rises from strenuous actions or overexertion until the fuller world-time hunger pass lands.

### Documentation

- Added `MAP-WILLOW-002` backlog planning for a future under-bridge / watchtower integration pass around the Willow Floodplain.
- Added `WORLD-003` near-term planning for moving hunger, torches, campfires, corpse/meat decay and related temporary lifetimes onto internal world-time hours/days.
- Added `LOOT-001` backlog planning for local low-risk loot and small coin finds around starter-adjacent or calm locations.
- Reconciled planning status for shipped world-time, visibility, fire/light, `twigs`, ordinary sleep and restart-safety slices after 0.14.22.
- Clarified that `PROG-002` is now an umbrella learning-design item, with narrower LEARN/OBS/TRACK-LEARN slices carrying near-term implementation.

### Validation

- Ran `node scripts/test/news-clickable-commands.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/sleep.cjs`.
- Ran `node scripts/test/admin-reset.cjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.

## 0.14.22 - Willow Floodplain landmarks and resources - 12026-06-01

### Added

- Added six inspectable Willow Floodplain landmarks with authored descriptions, direct-inspection aliases and concise examine summaries.
- Added modest `SWAMP` resource defaults for grass, mushrooms and herbs.
- Added a tiny dry-islet resource exception and vegetation opt-outs for the blind channel and dark backwater.
- Added a creature movement boundary helper and regression coverage so ordinary animals cannot newly climb human-authored `UP` exits such as watchtower ladders or trees.
- Added a direct cook-meat action to active campfire feature inspections when the player carries raw meat.
- Added cook-all controls and aliases so carried raw meat can be queued for campfire cooking one piece at a time.
- Added eat-all controls and aliases for edible inventory resources, with queue trimming once HP, stamina or hunger no longer benefits.
- Added `MAP-WILLOW-003` and `QA-WILLOW-001` planning coverage for floodplain landmarks, resources, aliases and route/content smoke checks.
- Added planning coverage for starter supply guards and animal movement boundaries.
- Added `AUTH-001` icebox planning for future profile protection, account recovery and client-neutral login beyond Telegram ids.
- Added documentation notes for the daypart notification settings MVP and future settings-menu grouping.
- Added `ECO-007` icebox planning for future animal taming and small companions.
- Added weapon/torch hand-slot follow-up documentation for future carried-item behavior.
- Added a `T` marker to the generated ASCII world map for authored climbable or shakeable tree locations.

### Changed

- Updated `next` planning notes for the 0.14.22 Willow follow-up slice.
- Split the admin `/all` view into player pages and creature pages so the Telegram message stays below API limits as player counts grow.

### Fixed

- Fixed held-item inspection so characters holding a weapon or tool no longer also appear to have empty hands.
- Fixed regional shout notification queries so `/shout` delivery targets active players in the whole current region.
- Fixed attack observer text so bystanders see the attacker's name in daylight or clear local visibility while darkness can still hide details.
- Fixed duplicate nearby target action labels such as `goes south; goes south` when a creature has the same stored and queued action.

### Validation

- Ran `npm run test:seed`.
- Ran `npm run test:seed:types`.
- Ran `node scripts/test/route-finding.cjs`.
- Ran `node scripts/test/world-content-html.cjs`.
- Ran `node scripts/test/text-targets.cjs`.
- Ran `node scripts/test/notifications.cjs`.
- Ran `node scripts/test/player-notification-settings.cjs`.
- Ran `node scripts/test/creature-movement.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/meat.cjs`.
- Ran `node scripts/test/target-formatting.cjs`.
- Ran `node scripts/test/weapons.cjs`.
- Ran `npm run map:render`.
- Ran `npm test`.
- Ran `npm run build`.

## 0.14.21 - Willow Floodplain first contour - 12026-06-01

### Added

- Added the first Willow Floodplain seed region with twelve authored swamp, river and clearing locations near the current riverbank.
- Added a small bidirectional route loop from existing riverbank anchors into the new pocket and back out again.
- Added `MAP-WILLOW-001` planning coverage and refreshed the rendered world map.

### Changed

- Updated world seed metadata and next-planning notes for the floodplain content slice.

### Validation

- Ran `npm run test:seed`.
- Ran `npm run test:seed:types`.
- Ran `node scripts/test/route-finding.cjs`.
- Ran `npm run map:render`.
- Ran `npm run build`.

## 0.14.20 - Daypart notification settings - 12026-06-01

### Added

- Added player-level daypart notice settings for routine dawn/day/dusk/night proactive messages.
- Added `/settings`, `/notifications`, `/daynotices`, `/daynotices on` and `/daynotices off` with Ukrainian and English text aliases.
- Added `Player.daypartNoticesEnabled`, `Player.daypartNoticeHintShown` and `Player.ordinaryWakeCount` with a Prisma migration.
- Added a one-time hint after the second ordinary wake-up explaining how to disable routine daypart notices.
- Added focused notification-settings tests for daypart eligibility, second-wake hint behavior, settings copy and alias parsing.

### Changed

- Daypart proactive broadcasts now use a dedicated recipient filter that respects the new player setting while preserving world-event creation.
- The menu reply keyboard now includes `Settings` under the utility menu rather than on the main gameplay keyboard.
- `/help`, `/commands`, input-alias docs and planning docs now describe the settings surface.

### Validation

- Added `node scripts/test/player-notification-settings.cjs`.
- Ran `npm run planning:export`.
- Ran `npm run build`.
- Ran `npm test`.

## 0.14.19 - Stabilization and safety rails - 12026-06-01

### Added

- Added capped starter torch-source behavior so players cannot keep taking torches indefinitely after already carrying enough.
- Added focused torch-source helper coverage to the `npm test` chain.
- Added notification replacement-lock coverage for repeated Telegram update paths.
- Added planning items for Herald outbox reliability, chronicle chat relay, deferred private messages, profession line banks, herbal stamina elixirs, craftable chests, pit traps and the ordinary sleep command gate.

### Changed

- Starter torch-source pickup now checks carried torch totals and recent take history before granting another torch.
- World seed validation now checks route/location authoring around starter safety rooms more strictly.
- Updated sleep, ecology, Herald, weapons, beginner-cache, world-time and performance docs with post-0.14.18 watchpoints and near-term priorities.
- Promoted follow intent and ordinary sleep command gating in planning so they stay near the next implementation lane.

### Validation

- Added `node scripts/test/torch-source.cjs`.
- Added `node scripts/test/notifications.cjs`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `npm run planning:export`.

## 0.14.18 - Creature simulation budget - 12026-06-01

### Added

- Added a per-world-tick creature processing budget for ordinary background creatures.
- Added focused regression coverage for creature tick selection priorities.
- Added creature candidate, processed, deferred and protected counters to tick events and scribe/admin ecology stats.

### Changed

- World ticks now load lightweight creature candidates first, protect player-visible locations, non-animal NPCs and predators, then fetch heavier location/resource data only for creatures selected for individual behavior.
- Updated ecology and performance planning docs for the first `PERF-001` scaling slice.

### Validation

- Added `node scripts/test/creature-tick-budget.cjs` to the `npm test` chain.

## 0.14.17 - Ecology restoration observability - 12026-06-01

### Changed

- Scribe/admin `/stat`, protected web `/stat` and `/stat.json` now include recent and total population-floor restoration counts.
- Ecology statistics now parse `Population floor restored` events by species, including restored counts, event counts and latest restoration time.
- Updated ecology/admin docs and planning notes for the restoration-observability slice.

### Validation

- Ran `node scripts/test/ecology-stats.cjs`.

## 0.14.16 - Ecology recovery follow-ups - 12026-06-01

### Changed

- Population-floor restoration now also protects starter mice and rabbits when living animals remain but no adult breeding pair is left, while keeping predator restoration tied to total disappearance.
- Hungry predators now prefer safe unclaimed local herbivore corpses before attacking living prey, without exposing or consuming hunter-claimed, player-carried or already freshened corpses.
- Updated ecology docs and planning notes for the 0.14.16 recovery slice.

### Validation

- Ran `node scripts/test/population-restoration.cjs`.
- Ran `node scripts/test/predator-feeding.cjs`.

## 0.14.15 - Ecology start-balance stabilization - 12026-06-01

### Added

- Added focused starter animal authoring coverage for prey breeding clusters, predator overlap and local food-rich resource overrides.
- Added a compatibility starter-knife grant for older characters who first hit the new freshening weapon requirement without any weapon in hand.

### Changed

- Starter animal seeding now counts existing starter groups by species, location, alive/corpse state, age and explicit sex, so adult female and adult male groups in the same location remain idempotent but distinct.
- Starter mice and rabbits now begin in separated breeding clusters with local food-rich resource overrides, giving prey a better chance to reproduce before predators reach them.
- Starter predators remain present but lighter: foxes stay near the forest/meadow pressure points, while the initial wolf count is reduced to one.
- The freshening completion path now gives and equips a plain knife for legacy characters with empty hands, then continues the queued freshening action instead of failing.
- Updated ecology docs and planning notes for the 0.14.15 start-balance slice.

### Validation

- Ran `node scripts/test/starter-animals.cjs`.
- Ran `node scripts/test/weapons.cjs`.
- Ran `npm run test:seed`.
- Ran `npm run test:seed:types`.

## 0.14.14 - Minimal weapon equipment foundation - 12026-06-01

### Added

- Added nullable equipped weapon fields for players and creatures, with a committed Prisma migration.
- Added a minimal weapon catalog and resource types for `knife`, `hunting_spear`, `sickle`, `hand_axe` and `short_sword`.
- Added inventory equip/unequip controls and text aliases for taking a weapon in hand or putting it away.
- Added starter knife grant after onboarding completion.
- Added durable Herald publication queue pause/resume state and admin cancel controls for pending news/archive rows.
- Added focused weapon helper and alias regression coverage.

### Changed

- Character, target and location descriptions can now show visible held weapons.
- Player attack completion text and observer text now react to the equipped weapon while keeping existing target eligibility.
- Corpse freshening now requires an equipped sharp weapon before stamina is spent.
- Dropping an equipped weapon clears the equipped weapon field.
- Starter shared cache stock no longer duplicates the nearby torch stand and now carries more beginner food/supplies, especially raw meat.
- Herald publisher loop now skips automatic publication while paused, and pending news/archive rows can be marked canceled without deleting published history.
- Updated weapon system and planning docs for the WPN-001/WPN-002 slice.

### Validation

- Ran `node scripts/test/weapons.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/beginner-cache.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `npm run build`.

## 0.14.13 - Sleep world-time and campfire comfort - 12026-06-01

### Added

- Added persisted ordinary-sleep start minute tracking on `Player`.
- Added world-time auto-wake rules for ordinary sleep after enough in-world time passes.
- Added a shared ordinary-sleep recovery profile that uses active campfires and local rest-cap signals.
- Added a Prisma migration for ordinary sleep timing.
- Added `HeraldPublication.archiveOrder` and archive backfill ordering support so historical `news.md` posts keep stable chronological/source order.
- Added safe Herald-to-game deep links for public commands such as `/look`, `/examine`, `/news`, `/auto`, `/autoStop`, `/me` and `/help`.
- Added focused regression coverage for ordinary sleep duration, auto-wake thresholds and campfire sleep comfort.

### Changed

- Ordinary sleep can now wake a player proactively after recovery reaches the local cap, while keeping the body lying down after waking.
- Active campfires now improve ordinary sleep recovery and can raise the temporary stamina cap slightly.
- Rest, wake, admin teleport/restore and beginner-return paths now clear stale ordinary-sleep timing state whenever they force the player awake.
- The shared beginner cache can now hold raw meat and cooked meat as take/contribute supplies.
- Herald historical backfill now defaults to 13-minute spacing, sorts semantic-like versions numerically and can reschedule pending archive posts after Render sleep/wake-up instead of publishing a burst.
- Herald public news/archive rendering now links only whitelisted non-admin game commands to the main bot and leaves admin/debug/backfill/unknown commands as plain text.
- Updated sleep, survival and planning docs for the first SLEEP-003 slice.
- Updated Herald Render docs with archive catch-up env controls and the `/backfill_news_reschedule_pending` command.

### Validation

- Ran `node scripts/test/sleep.cjs`.
- Ran `node scripts/test/herald-smoke.cjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.14.12 - Lying posture and ordinary sleep - 12026-06-01

### Added

- Added persisted `LYING` player posture and a separate ordinary `sleepState`.
- Added `/lie` plus English and Ukrainian lie-down aliases.
- Added ordinary `/sleep` behavior that lies the player down, starts sleep recovery and disables auto-mode.
- Added `/wake` support for ordinary sleep while preserving `/sleep tutorial` and tutorial wake behavior.
- Added posture, sleep and physical-action guard regression coverage.
- Added `docs/systems/sleep.md` for the posture/rest/sleep boundary.

### Changed

- Physical actions now block while lying with lying-specific copy, and while sleeping with a wake-up prompt.
- Ordinary sleep restores stamina more strongly than active rest without sending recovery chatter while the player remains asleep.
- Character/profile and location posture text now distinguish standing, sitting, lying, resting and ordinary sleep.
- Updated `/help`, planning docs and terminology notes so plain sleep is no longer described as reserved or tutorial-routed.

### Validation

- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.14.11 - Shared beginner cache - 12026-06-01

### Added

- Added `start_beginner_shared_cache`, an inspectable shared supply cache at the starter-camp watchtower.
- Added focused cache actions for taking one simple supply item and contributing one carried item.
- Added `/cache`, `/take_cache` and `/contribute_cache` alias parsing, with English/MUD-style and Ukrainian cache phrases.
- Added hidden unobserved cache restock through `LocationFeature.data`, without adding a new persistent table.
- Added parser, cache-helper and world-seed regression coverage for the beginner cache.

### Changed

- Updated starter-camp, onboarding and location-feature docs so the watchtower cache is framed as shared first-road support rather than a shop or quest reward.

### Validation

- Ran `node scripts/test/beginner-cache.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.14.10 - Hunter torch route cleanup and dream action ladder - 12026-06-01

### Added

- Added a `HUNTER_TORCH_SOURCE_FEATURE_KEY` route assumption so hunter torch resupply can target the starter-camp watchtower source instead of the gate/drop-off location.
- Added an inline `Вгору` button for inspectable features that point to an authored upward route, starting with the starter-camp watchtower.
- Added `вверх` as a text alias for the existing `UP` movement command.
- Added four optional tutorial dream rooms after the existing safety room: `dream_tutorial_attention_path`, `dream_tutorial_signs`, `dream_tutorial_traces` and `dream_tutorial_waking_edge`.
- Added inspectable dream features for look/examine, signs, traces and the new final tutorial marker.
- Added tutorial movement voice lines for the new dream action ladder.
- Added seed coverage for the new tutorial rooms, ladder exits, moved tutorial completion surface and hunter torch-source markers.

### Changed

- Hunters returning for torches now route toward the watchtower torch source and then toward the known magic campfire before seeking prey.
- The old closed-gate torch source remains available, but is marked as downgraded and no longer the hunter resupply source.
- Moved the `Закінчити навчання` tutorial completion surface from `Затишок останнього кроку` to `Край пробудження`, while keeping direct wake/end commands available.
- Updated hunter, fire/light, gate hunting, onboarding and planning docs for the new route assumptions and dream ladder.

### Validation

- Ran `npm run planning:export`.
- Ran `node scripts/world/render-map-ascii.mjs --write`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `node scripts/test/npc-hunter.cjs`.
- Ran `node scripts/test/tutorial-voices.cjs`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.14.9 - Starter camp verticality - 12026-06-01

### Added

- Added `start_border_watchtower`, a real `z = 1` location above `start_border_camp`.
- Added explicit `UP` / `DOWN` exits between the starter border camp and the watchtower.
- Added an inspectable `Сторожова вежа` camp feature and a lexicon entry for watchtower targeting.
- Added world-seed coverage for the watchtower location, vertical exits and starter torch placement.

### Changed

- Reworked `start_border_camp` prose to mention the watchtower and ladder as part of the shared border camp.
- Moved the beginner `start_camp_torch_stand` from the camp floor to the watchtower awning, preserving its first-session safety role.
- Kept the old `closed_gate_torch_stand` in place until hunter routes and gate-side supply are audited.
- Updated world-map, fire/light, onboarding and z-level documentation for the new starter-camp verticality.
- Updated `CAMP-002` planning notes to mark the watchtower slice as implemented/testing.

### Validation

- Ran `npm run planning:export`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `node scripts/test/route-finding.cjs`.
- Ran `node scripts/world/render-map-ascii.mjs --write`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.14.8 - First-session clarity after darkness - 12026-06-01

### Added

- Added one-time waking-world first-night guidance when dim/dark visibility is actively hiding location details, nearby presence, ground objects, resources or tracks, while skipping tutorial dream locations and locally lit places.
- Added one-time tutorial-dream hints after the first `look` and first `examine` flows, keeping `Озирнутися` as location context and `Роздивитися` as focused attention.
- Added an inspectable newcomer board and a beginner torch source at `start_border_camp`, without removing the existing closed-gate torch source.
- Added starter-camp planning items for the completed prose pass and the future watchtower/source route pass, plus a first-session smoke checklist.

### Changed

- Reworked `start_border_camp` prose so the start/respawn location reads as a shared border camp and safe return anchor near the bridge, river, gate and forest edge.
- Daypart transition notices now skip tutorial dream and future dream-layer locations, so waking-world time does not interrupt dream scenes.
- `/help` now uses an in-dream tutorial follow-up when the character is already in the tutorial dream, instead of saying they can return there.
- Rest-ready and passive recovery messages now keep exact HP/stamina values behind technical-detail access and show ordinary players qualitative state text.
- Cooking result messages now show a repeat-cooking button when the player still has raw meat left.
- `/help` no longer advertises the hidden `/commands` catalog to ordinary players.
- Updated onboarding, fire/light, roadmap and planning docs for the first-session guidance slice.

### Validation

- Ran `npm run planning:export`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `node scripts/test/tutorial-voices.cjs`.
- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/help.cjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `node scripts/test/meat.cjs`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

## 0.14.7 - Post-merge Herald Render operations docs - 12026-06-01

### Added

- Added post-merge Render service documentation for running the main game bot and Boundary Mark Chancery Herald from the same `main` branch as two separate Render services.
- Added a dedicated ops guide covering main-game and Herald Start Commands, Herald-specific env variables, shared database expectations, duplicate polling warnings, Prisma migration rules, status-page expectations and future embedded-mode tradeoffs.
- Added durable Herald publication snapshots with rendered text, source date/version metadata where available and a committed Prisma migration, so queued or published news can be recovered after `news.md` changes.
- Added admin-only `/show_publication <id>` and `/repost_publication <id>` commands for inspecting and explicitly reposting saved HeraldPublication snapshots.
- Added admin-only `/list_publications` and `/mark_publication_deleted <id>` commands for manual channel-publication recovery when a Telegram channel post is removed outside the bot.
- Added admin-only `/info_full` for a fuller Herald character record while keeping public `/info` safe.
- Added planning updates for the future embedded Herald mode and the independent status/deploy-visibility backlog item.

### Changed

- Updated Render deployment docs to distinguish the main game's seed-aware deploy flow from the Herald Web Service build/start flow.
- Updated Herald ops docs to point at the post-merge two-service model and to mark `HERALD_STARTUP_NOTICE_THREAD_ID` as reserved until runtime support exists.
- Kept latest-news and backfill deduplication based on `contentHash` while backfilling missing snapshot metadata on existing rows when possible.
- Made Herald `/info` public and reply-aware: it now shows a safe atmospheric record for the caller, or for the Telegram user whose message it replies to, without exposing service/debug details.

### Validation

- Ran `npm run planning:export`.
- Ran `npm run build`.
- Ran `npm test`.
- Ran `git diff --check`.

---

## 0.14.6 - Boundary Mark Chancery Herald bot - 12026-06-01

### Added

- Added the Boundary Mark Chancery as a separate Telegram bot runtime with its own standalone entrypoint, token configuration, health server and Render Web Service deployment documentation.
- Added Herald admin commands for `/ping`, `/help`, `/whoami`, latest-news preview/posting, publication queue inspection, manual pending publication, world digest preview/queue/post, atmospheric `/info`, and historical `news.md` backfill.
- Added durable `HeraldPublication` outbox storage with content-hash deduplication, publisher-loop support, failure recording and committed Prisma migration.
- Added a shared `ServiceHeartbeat` table and Herald heartbeat loop so the public/admin status page can show the Chancery service mode, freshness, queued/published publication counts, latest news publication time and stale-heartbeat warnings.
- Added Telegram deep-link start payload support for safe main-bot actions such as `cmd_look` and `cmd_examine`.
- Added focused Herald smoke coverage for news parsing, content hashes, admin/channel parsing, safety helpers, `/whoami`, archive formatting, atmospheric info thresholds and runtime status helpers.

### Changed

- Split the main game bot runtime into a reusable game-bot app module while keeping `src/bot.ts` as the existing production compatibility entrypoint.
- Documented standalone Herald Render deployment, future embedded-mode migration notes and the rule that only one poller may use a Herald token at a time.
- Updated the status page service section to name the main game bot, world tick, action queue and Boundary Mark Chancery in a clearer operational overview.

### Validation

- Ran `npm run planning:export`.
- Ran `npm run build`.
- Ran `npm test`.
- Ran `git diff --check`.

---

## 0.14.2 - Tutorial polish and visible world-time beats - 12026-05-31

### Added

- Added compact heartbeat notices for internal daypart changes, so dawn, day, dusk and night announce that the world is getting lighter or darker before full visibility penalties arrive.
- Added wrong-keyboard-layout suggestions for common mistyped commands, so inputs such as `[nj` can suggest the intended Ukrainian command.
- Added pagination for prepared onboarding names, replacing one oversized list and button wall with compact pages.
- Added a future theft/hiding design note and planning items while keeping implementation deferred behind visibility and observation foundations.

### Changed

- Kept tutorial foraging reliable by refilling dream berries and herbs on location render, gather-menu render and gather completion, so one player cannot exhaust the lesson for another.
- Kept `Зручна лавка` as a fast-rest tutorial feature without raising max stamina; extra stamina remains reserved for `Жар легкого перепочинку`.
- Protected the tutorial rest return path so returning from the deep-rest fire preserves stamina instead of replaying the one-third stamina lesson.
- Moved the tutorial-completion button surface from the fox-observation lesson to the safety room, `Затишок останнього кроку`, and recorded that the surface should move forward again as new final tutorial rooms appear.
- Cleaned up direct tutorial voice formatting so Сон/Дрімота lines use blockquote-style presentation where Telegram supports HTML instead of inline `каже: «...»` text.
- Updated world-time docs to clarify that chronicle Kyiv grouping is display-only, weather display/simulation remains deferred, and stats reset must not reset the internal world clock.

### Validation

- Ran `npm run planning:export`.
- Ran `node scripts/test/character-names.cjs`.
- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/tutorial-foraging.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `node scripts/test/tutorial-voices.cjs`.
- Ran `node scripts/test/hunger-cues.cjs`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

---

## 0.14.3 - Weather MVP and light snapshot foundation - 12026-05-31

### Added

- Added a small internal weather service backed by the existing `WorldState` weather fields, including weather key, intensity, next-change world minute and non-proactive `WorldEvent` logs for weather changes.
- Added `/weather` plus `weather`/`погода` text aliases for the current Chornolis weather.
- Added a shared light snapshot helper that combines daypart, moon illumination, weather modifiers and optional local active light.
- Added focused world-time tests for weather text, weather light modifiers and light snapshot behavior.

### Changed

- `/time` now includes compact weather and light summary lines from the stored/derived internal world state.
- Player/admin-created ordinary campfire ashes now decay by internal world time: after two in-game days they disappear from ordinary location lists, with a near-gone state during the final two in-game hours.
- `/help`, `/commands` and input-alias docs now include `/weather`.
- Updated planning/system docs so `WORLD-001-E/F` reflect the `0.14.3` implementation slice and keep visibility reduction/darkness behavior deferred.

### Validation

- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/campfire-decay.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/slashless-command-coverage.cjs`.

---

## 0.14.5 - Darkness visibility reduction - 12026-05-31

### Added

- Added shared darkness copy helpers for obscured location descriptions, nearby presence, ground objects, resources and tracks.
- Added focused visibility tests for darkness rules and representative darkness copy.

### Changed

- Brief and detailed location rendering now reduce long descriptions, nearby target names/buttons, ground object pickup buttons, resource details and track hints when visibility is dim or dark without local light.
- `/track` completion now checks the same visibility helper before revealing track details.
- Local active light or clear enough natural light restores normal location detail.
- Prepared onboarding-name summaries now keep plural-form notes player-facing and Ukrainian instead of leaking internal English notes.
- Hunter NPCs now queue a delayed social response to direct greetings, and NPC greeting counts in ecology/status statistics now reflect completed creature `GREET` actions.
- Scribe `/locationAll` output now sorts locations by region first, with the dream tutorial region shown before the rest of the world.
- Updated visibility/world-time docs and planning items for the `VIS-001-B/C/D/F` slice.
- Bumped package metadata to `0.14.5`.

### Validation

- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/character-names.cjs`.
- Ran `node scripts/test/npc-hunter.cjs`.
- Ran `node scripts/test/ecology-stats.cjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `git diff --check`.

---

## 0.14.4 - Visibility debug foundation - 12026-05-31

### Added

- Added a shared visibility service that turns light snapshots into location-view visibility rules.
- Added scribe/admin `/timeDebug`, `/timeSet` and `/weatherSet` controls for QA of daypart, moon, weather and local light cases.
- Added a `🌒 Час світу` admin-menu button for the new time debug readout.
- Added focused world-time tests for visibility rules and debug parser helpers.

### Changed

- Brief `/look` now asks the shared visibility service whether nearby beings, ground objects and target buttons should be shown.
- Daylight and clear light can now reveal brief nearby details without requiring a local campfire or torch, while dim/dark brief views remain more cautious until the deeper darkness slices land.
- Production seed refresh no longer rewinds an existing `WorldState` clock during redeploy; it only creates the row when missing.
- Updated admin docs, world-time docs and planning docs for the `WORLD-001-G` and `VIS-001-A` slices.

### Validation

- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `node scripts/test/slashless-command-coverage.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.14.3 - Weather MVP and light snapshot foundation - 12026-05-31

### Added

- Added a small internal weather service backed by the existing `WorldState` weather fields, including weather key, intensity, next-change world minute and non-proactive `WorldEvent` logs for weather changes.
- Added `/weather` plus `weather`/`погода` text aliases for the current Chornolis weather.
- Added a shared light snapshot helper that combines daypart, moon illumination, weather modifiers and optional local active light.
- Added focused world-time tests for weather text, weather light modifiers and light snapshot behavior.

### Changed

- `/time` now includes compact weather and light summary lines from the stored/derived internal world state.
- `/help`, `/commands` and input-alias docs now include `/weather`.
- Updated planning/system docs so `WORLD-001-E/F` reflect the `0.14.3` implementation slice and keep visibility reduction/darkness behavior deferred.

### Validation

- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/slashless-command-coverage.cjs`.

---

## 0.14.1 - Stored internal world clock - 12026-05-31

### Added

- Added persistent `WorldState` storage for the internal Chornolis clock, including the current absolute world minute, last advancement timestamp and starter weather fields for the next weather slice.
- Added shared world-clock helpers for daypart, clock labels, lunar circle/day, moon phase and moon illumination.
- Added a focused world-time regression test for the canonical `587` / fifth lunar circle / day `17` / `17:00` starter timestamp and advancement math.
- Added `/chronicles` as a small global chronicle surface backed by public world events.
- Added chronicle entries for new player arrivals and carcass ravine start/stop state changes.
- Added a tutorial-gate helper test covering the already-open response and opening phrase parsing.

### Changed

- `/time` now advances and reads the stored internal world-clock state instead of rendering static placeholder time.
- World tick now advances the stored clock by elapsed real milliseconds as a rate, without binding day/night to server local hour, player timezone or real-world time of day.
- Seed, world reset and full reset now return the internal world clock to the canonical starter timestamp; stats reset remains separate.
- Attack-miss feedback now includes a quick look button so players can immediately check whether the target stayed nearby.
- Repeating the tutorial dream gate opening phrase while the gate is already open now gets a quiet already-open response instead of replaying the opening beat or refreshing the timer.
- Telegram side command menus now put `/help` right after `/afk`, with `/respawn` directly below help.
- `/help`, `/commands` and input-alias docs now include the new global chronicle command.
- Tutorial dream gate copy no longer stores raw HTML tags in world data, preventing escaped `<i>` markup from appearing in location text.
- Updated planning and system docs so `WORLD-001-B/C/D` reflect the `0.14.1` implementation slice and keep visibility, weather, light and sleep deferred.

### Validation

- Ran `npx prisma generate`.
- Ran `node scripts/test/world-time.cjs`.
- Ran `node scripts/test/chronicles.cjs`.
- Ran `node scripts/test/tutorial-gate.cjs`.
- Ran `node scripts/test/world-content-html.cjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.14.0 - Internal world-clock planning and prepared names - 12026-05-31

### Added

- Added the `0.14.x` internal world-clock plan for Night, Light and Firewood: elapsed-real-time advancement, stored world-clock state, 28-day lunar circles, 13 circles per year, moon illumination, weather MVP, light snapshots and visibility consumers.
- Added `docs/systems/world_time.md` as the design source for the internal Chornolis clock, including the starter timestamp and reset behavior.
- Added `docs/planning/0.14-observation-readiness.md` so visibility/light work can prepare for later observation-learning without implementing `/observe` in this line.
- Added new planning items for weather state, light snapshots, time/weather debug controls, riverbank fisher setup, visible herbalist observation and a strange-track omen.
- Expanded the prepared character-name pool with many more masculine, feminine and plural options, with coverage for minimum available counts and duplicate/form validation.

### Changed

- Updated `docs/roadmap.md`, `docs/planning/next.md`, transition notes, calendar docs and Icebox so `0.14.x` uses an internal Chornolis clock rather than real-world time of day, server timezone or user timezone.
- Moved minimal moon phase and moon illumination into the `0.14.x` light foundation while keeping sacred days, ritual calendars and deeper calendar lore in Icebox.
- Documented that scribe/admin world/full reset should return the internal clock and weather state to the starter world state, while stats reset should not change world time.
- Kept the first runtime implementation deferred: this release does not add day/night visibility effects, real-time daypart binding or external weather APIs.

### Validation

- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.13.27 - Core loop closure audit and attack misses - 12026-05-31

### Added

- Added the `0.13` first-session closure audit report with a live-smoke script for onboarding, tutorial dream, first waking locations, `/respawn`, AFK/end-session guards and scribe support checks.
- Added the final `QA-001` planning note update for closing the Core Loop & Onboarding Stability line before starting `0.14.x`.
- Added shared attack-hit rules so player, NPC and creature attacks can miss through the same layer.

### Changed

- Updated near-term planning to treat `0.13.x` as ready for one final live Telegram smoke after deployment instead of continuing to absorb new systems.
- Attacks against mice now miss 20% of the time, and attacks against rabbits miss 40% of the time. A miss still spends stamina, counts as an attempted creature attack where applicable and marks the location as recently dangerous, but leaves the target alive for a later attempt if it stays nearby.
- Border marker ecology text now avoids repeating the "зарубки" image in every count and separates recent births/deaths from their causes.

### Validation

- Ran `npm run planning:export`.
- Ran `npm run build`.
- Ran `npm test`.

---

## 0.13.26 - Queued inventory, firewood upkeep and 0.14 planning - 12026-05-31

### Added

- Added clickable website news archive entries on `/news`, with direct `?entry=` links and newer/older navigation for reading older `news.md` updates in full.
- Added natural `twigs` regeneration for eligible forest locations, capped as a slow fallback so firewood can reappear without exceeding manually placed piles.
- Added picked-up inventory actions to the action queue: using food/herbs, dropping carried items, cooking meat, lighting/dousing torches, adding twigs and lighting campfires now share queued action handling.
- Added stamina costs and queue labels for inventory/fire actions.
- Added session presence reason/timestamp display to scribe player detail views, so AFK/end-session state is easier to audit.
- Added self-target aliases such as `me`, `я`, `мене` and `мій персонаж` for look/examine flows.
- Added focused tests for web news archive rendering, natural twigs, meat/freshening rules, action costs, session presence labels, text targets and Ukrainian verb agreement.
- Added planning docs for closing `0.13.x` as Core Loop & Onboarding Stability and starting `0.14.x` as Night, Light and Firewood.
- Added planning items for first-session closure QA, world-time admin safety, darkness copy, light-source matrix testing and first-night guidance.

### Changed

- Freshening corpses now has species-based success chances: mice are easiest, rabbits are moderate, foxes and wolves are harder.
- Failed freshening attempts now consume the corpse as processed remains without granting meat, and food-learning event descriptions record success/failure.
- `/respawn` remains available for the first 7 real days after character creation, in addition to weak-character fallback, before the progress threshold can refuse it.
- Lit ground torches now explicitly say they provide light while burning.
- Visible ground resources can show pickup buttons in brief illuminated location views, not only detailed views.
- Fire/light docs, survival docs, location-feature docs and render deploy docs now cover the current firewood/light behavior and related environment controls.
- Ukrainian grammar helpers for actor past-tense agreement now live in the shared grammar layer, with docs clarifying the boundary between the world lexicon and grammar utilities.
- The `0.14.x` planning order now starts with a small world-time foundation before visibility, light, firewood, biome foraging or ordinary sleep work.

### Fixed

- Inventory buttons and text aliases no longer bypass the action queue for eating, dropping, cooking, torch and campfire actions.
- Fire feature callbacks now queue the same campfire/twig/torch actions as inventory and text commands.
- Character self-inspection no longer falls through to nearby target ambiguity when players type natural self-targets.

### Validation

- Ran `npm run planning:export`.
- Ran `npm run build`.
- Ran `npm test`.

---

## 0.13.25 - Feature inspection layers and slashless command parity - 12026-05-31

### Changed

- Direct feature inspection now separates brief and full detail: `look <feature>` returns the compact feature line with a deeper-inspection button, while `examine <feature>` keeps the richer interaction text and available feature actions.
- Extended slashless command parity beyond teleport for common typed commands such as `addResource`, `addTorch`, `addTwigs`, `addCampfire`, `carcassQuest`, `addCreature`, `addCreatureCorpse`, queue controls, status/maintenance commands and related help/restore forms.
- Recorded the existing 0.13.21 operational notes for live seed/map refresh, predator population-floor restoration and action-queue-dependent predator feeding.
- Updated `LOOP-001-A` planning notes with the first implemented two-layer feature-inspection behavior.
- Bumped package metadata to `0.13.25`.

### Tests

- Extended slashless command helper coverage for admin resource, corpse-creation, queue, status and maintenance command forms.
- Added slashless command coverage so new `bot.command(...)` entries must have a direct text form, shared alias, or explicit equivalent.
- Extended tree/location-feature helper coverage for brief feature inspection.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.13.24 - Hunger cues, tutorial completion and inventory polish - 12026-05-31

### Added

- Added threshold-based player hunger cues after stamina-spending actions raise hunger into moderate or serious states.
- Added contextual hunger cue copy that points toward `inventory` when edible carried food exists, cooking when raw meat and local fire are available, nearby food resources when present, or a general atmospheric warning otherwise.
- Added a one-time tutorial dream wellbeing aside after the first successful tutorial food use, with a tutorial event flag so it does not repeat unless tutorial progress is reset.
- Added focused `hunger-cues` helper coverage to `npm test`.
- Added `/respawn` as a confirmed atmospheric return to the start location for early or weak characters who get lost.
- Added `/tutorialEnd` / `Закінчити навчання` as a confirmed tutorial-completion flow that marks the tutorial completed, returns from the dream when needed, and removes unfinished-tutorial reminders from help/profile surfaces.

### Changed

- Rearranged the character card action keyboard so `Inventory`, `Signals`, posture, `Rest`, `Sleep` and `Auto` controls are grouped into clearer rows.
- Moved the scribe technical-details toggle out of the character card keyboard and into the scribe admin menu.
- Moved `/respawn` near the top of the Telegram side command menu.
- Marked `FOOD-004`, `ONB-003` and `SURV-001` beginner-return slices as testing and refreshed planning exports.
- Bumped package metadata to `0.13.24`.

### Fixed

- Made corpse drops resilient when an inventory corpse stack exists but its hidden carried creature row can no longer be matched, by consuming the carried item and placing a matching corpse resource on the ground instead of leaving the item stuck in inventory.
- Made the scribe teleport command accept the same direct text form without a slash, so `teleport forest_07_00` routes like `/teleport forest_07_00`.

### Tests

- Ran `node scripts/test/hunger-cues.cjs`.
- Ran `node scripts/test/beginner-return.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/tutorial-voices.cjs`.
- Ran `node scripts/test/session-presence.cjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `node scripts/test/world-seed.mjs`.
- Ran `npm run planning:export`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.13.23 - Target-list return context, scribe corpse setup and climbable trees - 12026-05-31

### Added

- Added a scribe-only `/addCreatureCorpse` command for creating animal corpse rows directly, with current-location defaults, corpse freshness presets, batching and the same one-command cap as `/addCreature`.
- Added a `Creatures` submenu to the scribe admin keyboard so creature keys, live animal spawning, corpse setup and cleanup/test state commands are grouped together without slash hints in button labels.
- Added two climbable dry-meadow tree features with real `UP`/`DOWN` exits to upper locations.
- Added `/up` and `/down` movement commands, vertical reply/inline movement labels and text aliases for `вгору` / `вниз`.
- Added `/shake_tree` / `потрусити дерево` interaction for upper-tree branch features; a successful shake drops 5-8 `twigs` at the tree base and then enters a real-time cooldown.

### Changed

- Paginated target and corpse list buttons now carry their source page into target detail/action views, so `Back` returns to the same target-list page instead of resetting to the first page.
- `/addCreatureHelp`, `/adminHelp`, admin command docs and scribe audit notes now document the corpse setup command and its species-key flow.
- Marked `ADM-002` and `UX-002` as testing and refreshed planning exports.
- Location-feature docs now list climbable trees and shakeable branches as current interactive feature examples.

### Tests

- Added focused tree-shake amount/cooldown helper coverage to `npm test`.
- Ran `node scripts/test/admin-creatures.cjs`.
- Ran `node scripts/test/target-formatting.cjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `node scripts/test/tree-features.cjs`.
- Ran `npm run planning:export`.
- Ran `npm run map:render`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.13.22 - Queue visibility, AFK labels and command-menu polish - 12026-05-31

### Changed

- `freshen all` / `/freshen_all` replies now include the rendered player action queue after adding freshening work.
- Character cards now show a `Queue` button when the character has a running/queued action or active rest.
- `/who`, the public `/who` web page and `/who.json` now append ` (відійшов)` to AFK player character names.
- `/all` now shows the same AFK suffix in player rows for scribe/admin visibility.
- Telegram side command menus now keep `/afk` as the second command, immediately after `/start`, while `/end_session` sits at the end of the shared command block.
- Removed standalone `Стан: ...` keyboard-refresh messages that could appear after quick actions or quiet recovery ticks; real action/recovery messages still carry refreshed keyboards when they are already being sent.
- Dropped burning torches now explicitly count as local light sources until their burn timer expires, and expired ground torches are cleaned up before location render.
- Sexed animal age adjectives now agree with the displayed creature form, so male mouse labels use masculine age adjectives instead of the species-level feminine fallback.
- Scribe-scoped Telegram side command menus no longer list `/adminmenu` or the operational `/carcassquest` toggle; the commands remain available through direct input, admin help and the scribe keyboard/menu surfaces.
- Removed a stray UTF-8 BOM from `src/services/actionCompletions.ts`.

### Tests

- Extended session-presence coverage for the AFK display suffix.
- Extended fire helper coverage for active dropped lit torches.
- Extended target-formatting coverage for sexed mouse age and state agreement.
- Ran `node scripts/test/session-presence.cjs`.
- Ran `node scripts/test/campfire-memory.cjs`.
- Ran `node scripts/test/posture.cjs`.
- Ran `node scripts/test/target-formatting.cjs`.
- Ran `node scripts/test/telegram-commands.cjs`.
- Ran `node scripts/test/reply-keyboard-refresh.cjs`.
- Ran `npm test`.
- Ran `npm run build`.

---

## 0.13.21 - Population recovery and northern forest pocket - 12026-05-31

### Added

- Added a population-floor restoration pass to `worldTick`: if a starter animal species has no living, non-gone animals left, the tick restores its starter living population at starter locations.
- Added `src/services/populationRestoration.ts` to plan and execute starter population restoration from `src/data/starterAnimals.ts`.
- Added `populationFloorRestored` to world tick system events, debug output and technical scribe tick summaries.
- Added a first `MAP-003` playable expansion slice north of `forest_02_09` with three reachable forest locations, bidirectional exits and local resources.
- Added an inspectable `Камінь малого сліду` location feature as the first seeded animal-restoration charm hook for future `ECO-005` offering actions.
- Added focused population restoration helper coverage to `npm test`.
- Added predator prey-claim and feeding markers so carnivores eat killed prey through a later `EAT` action instead of receiving hunger relief immediately at kill time.

### Changed

- Marked `ECO-004` and the first `MAP-003` slice as testing, and updated `ECO-005` to point at the seeded charm while keeping the actual offering action layer as next work.
- Refreshed the generated world map after opening the northern forest pocket.
- Documented the quiet population-floor safeguard in the ecology system notes.
- Predator kills now leave an interceptable claimed corpse: if a player or another flow takes the corpse before the predator eats, the predator stays hungry and loses the meal.

### Tests

- Ran `node scripts/test/population-restoration.cjs`.
- Ran `node scripts/test/predator-feeding.cjs`.
- Ran `node scripts/test/input-aliases.cjs`.
- Ran `npm run test:seed`.
- Ran `npm test`.
- Ran `npm run planning:export`.
- Ran `npm run map:render`.
- Ran `npm run build`.

---

## 0.13.20 - Name review, social hints, admin menu and visibility polish - 12026-05-30

### Changed

- Prepared character names now explicitly tell players that scribes have already checked the name.
- Custom character names now clearly say they can be used immediately while still waiting for later scribe review.
- Character cards reuse the same name-review wording so pending custom names no longer sound like a blocking error.
- Unknown-input suggestions now include stable slash-command hints for more actions, and the fallback points to `❔ Help` (`/help`) and `Menu` (`/menu`) with clearer labels.
- Targetless social inputs such as `smile`, `посміх` and `усміхнутися` now perform a visible location gesture, and typo suggestions can point toward close social-signal aliases.
- Character cards now include a `Signals` button beside inventory, opening targetless gestures such as smile, nod, sigh or wave without needing to inspect a target first.
- Standing up now cancels any queued or running rest action as well as the resting flag, so stale rest actions no longer block the next command after pressing `Stand`.
- The tutorial gate fallback now nudges players who type the written phrase directly to say it aloud with `say` / `/say`, and copied `Ви сказали:` echoes now parse back into speech.
- Auto stand-up notices now include the matching `/stand` command hint.
- Sitting, standing, rest start/stop, tutorial sleep entry and tutorial wake now broadcast concise observer messages to other players in the same location.
- Visible reply-keyboard status changes now get a short refresh message after quick actions or recovery, so stamina labels update without requiring a chat reopen.
- Local movement notifications now clean up older movement inline buttons: only the latest tracks button stays active per location/chat, and a character's arrival target button is removed when that character leaves.
- Bulk pickup now treats visible corpses as ground items too: `get all`, `get all corpse` and type filters such as `get all berries` can collect matching visible items, and `drop all [type]` can drop whole carried stacks while plain `drop all` keeps held lit torches in hand.
- Corpse target buttons now hide decay timer details and use cleaner labels without the old colon/action suffix.
- Mouse creature text now uses sexed Ukrainian lexicon forms: male mice are `миш`, female mice are `миша`, with matching cases in corpse and target labels.
- Herb resource descriptions now use the clearer Ukrainian `алхімія` wording.
- The "deaths by characters" stat now includes non-animal NPC kills as well as player kills.
- Scribes now get an `adminMenu` button in the main keyboard instead of the ordinary help button, with submenus for statistics, world views, teleport, resources, fire tools and full admin help.
- Scribe fire-supply commands `/addTorch [player] [amount]` and `/addTwigs [player] [amount]` now accept a final amount, defaulting to 1.
- Scribe `/addCreature` no longer silently clamps larger counts to 50; larger additions are created in batches of 50 with an explicit one-command cap.
- Tutorial dream pacing lines now use the correct nominative pronoun in one monument/hesitation response.
- Onboarding now keeps incomplete players out of location-level proactive messages until their name is confirmed.
- Target lists now show a `freshen all` (`/freshen_all`) button when several suitable corpses can be queued for freshening.
- Scribes can now force the gate carcass-dropoff hunting loop on or into stand-down with `/carcassQuest start` and `/carcassQuest stop`.
- Gate-hunting saturation now counts nearby locations by coordinate radius instead of only the gate's own technical region, so bridge, riverbank and meadow prey pressure can reactivate the hunter loop.

### Tests

- Extended character-name helper coverage for prepared-name and custom-name review copy.
- Extended input-alias coverage for formatted suggestion slash-command hints.
- Extended ecology-stat helper coverage for NPC character kill counting.
- Extended reply-keyboard coverage for the scribe admin menu and its resource/fire submenus.
- Added admin creature helper coverage for count parsing, batching and cap reporting.
- Extended tutorial voice coverage for the corrected nominative-pronoun line.
- Extended posture helper coverage for observer-facing state-change text.
- Extended posture helper coverage for reply-keyboard status label visibility.
- Extended target-formatting and text-target coverage so corpse buttons cannot leak decay timer text.
- Extended character-name helper coverage for sexed mouse lexicon forms.
- Extended gate-hunting helper coverage for manual start/stop overrides.
- Extended gate-hunting helper coverage for the cross-region coordinate radius.
- Ran `npm test`.
- Ran `npm run build`.
- Ran `node scripts/test/character-names.cjs`.

---

## 0.13.19 - Session presence, quieter forest reactions and PR discipline - 12026-05-30

### Added

- Added persisted session presence for players with `active`, `afk` and `ended` states, reminder pause state and player-interaction timestamps.
- Added `AFK / away` (`/afk`) and `End Session` (`/end_session`) controls with slash/text aliases.
- Added `/endSession` as a compatibility alias for ending the current session.
- Added silent Auto-AFK after a configurable player inactivity timeout.
- Added a one-idle-reminder-per-scene guard so tutorial idle nudges cannot repeat in the same unresolved prompt before Auto-AFK.
- Added send-time proactive-message guards so delayed tutorial nudges, companion lines, action-queue notices, deploy notices, fire timer notices and location notifications skip AFK or ended players.
- Added `/addResource`, `/addResourse`, `/addResourceHelp` and resource-specific admin shortcuts for restoring location resource nodes.
- Added focused coverage for session presence helpers and AFK/end-session aliases.

### Changed

- Дід лісовик now waits through a configurable depletion delay before waking, instead of waking immediately from the last gathered resource.
- Slowed default resource regeneration cadences so depleted locations recover less abruptly.
- Documented the release workflow expectation that patch/minor work starts on a separate `codex/` branch and opens a PR into `main`.
- Added PR description expectations for summary, validation/checks and explicit risks or rollback notes.
- Updated GitHub workflow docs to point at the current 0.13-0.15 planning milestones and docs-as-source-of-truth planning model.
- Added `REL-001` and `SES-001` planning slices for release branch discipline and session presence.

### Tests

- Added session presence tests to `npm test`.
- Added admin resource helper tests to `npm test`.
- Ran planning export after updating planning items.
- Ran `npm run build`.
- Ran `npm test`.

---

## 0.13.18 - Hunter hardening, weapon planning and scribe audit - 12026-05-30

### Added

- Added weapon-system planning docs for the minimal weapon catalog/equip slice, weapon-aware action text, themed NPC weapons, later weapon condition work and cold-storage combat/lifetime work.
- Added a reusable scribe audit helper and covered confirmed `/reset world`, `/reset stats` and `/reset full` actions with quiet `WorldEvent` audit records.
- Added a scribe-audit system note listing dangerous admin/scribe tools that should keep or gain structured audit coverage.
- Added a compact dream tutorial flow audit that confirms the next onboarding follow-up slices.
- Added text-only learning feedback for corpse freshening and cooking: every thirteenth personal action can show a private growth line, and every fifth observation of another actor's recent action can show a smaller one.
- Added `freshen all` / `свіжувати все` support that queues one freshening action per suitable visible corpse instead of resolving the whole location instantly.

### Changed

- Hunter-claimed carcasses now preserve their hunter marker while ordinary corpse decay updates the remaining lifetime text, so returning hunters can still deposit prey through the gate drop-off service.
- Hidden hunter-claimed carcasses no longer appear in text target lookup, location target lists or corpse action entry points.
- Freshened corpses are hidden from player-facing target/location surfaces for now, with visible remains split into future work.
- Direct hunter field lines now record `SAY` events and increment the creature speech counter used by ecology/status statistics.
- Hunter replies and social reactions now use a slower queued creature action instead of firing as instant follow-up messages.
- Hunter field speech now appears as quoted speech in Telegram instead of an inline quoted sentence.
- Freshening now costs `3` stamina per corpse, and immediate pickup paths now spend `1` stamina per picked-up item/resource unit.
- Updated hunter and actor-inventory planning notes to keep the remaining claimed-carcass `currentAction` bridge visible as future structural work.
- Updated planning exports for the weapon task pack and completed first scribe-audit task slices.
- Marked `ONB-001-A` complete with follow-ups for first-look, first-examine, rest and wake polish.

### Tests

- Extended NPC hunter helper coverage for hunter-claimed carcass decay markers.
- Extended NPC hunter helper coverage for slower queued hunter reactions.
- Extended NPC hunter helper coverage for quoted hunter field speech.
- Added text-target visibility coverage for hidden hunter-claimed carcasses.
- Added helper coverage for freshening and cooking practice/observation milestone cadence.
- Added alias coverage for bulk freshening commands and action-cost coverage for the freshening stamina cost.
- Added scribe-audit helper coverage.
- Ran the full project test suite.

---

## 0.13.17 - Small polish, status visibility and target interactions - 12026-05-30

### Added

- Added player-caused creature death counts to ecology/stat surfaces.
- Added split runtime status checks for HTTP, Telegram bot, database, world tick and action queue state.
- Added `/reset world`, `/reset stats` and `/reset full` admin reset modes with clearer `/reset` guidance.
- Added targeted `look` support for visible players, NPCs, animals and features.
- Added a `Look` action to target interaction keyboards alongside `Examine`, `Attack`, speech and social actions.
- Added target speech prompts for `Say` and `Whisper` buttons.
- Added an independent status-site planning item for future deploy/outage visibility outside the game Render service.

### Changed

- Tutorial dream keyboards now use the ordinary grid shape with unavailable slots hidden as placeholders, and return to the normal keyboard after revisiting earlier tutorial cells.
- The Dream Gate focused keyboard no longer exposes the speech phrase before the player inspects the gate.
- Public target `examine` text now avoids exact HP/stat counters unless the viewer has technical/scribe access.
- Hunter NPCs can answer direct speech through the reply path and react to a fitting subset of social signals.
- Runtime status pages and docs now distinguish server, Telegram bot and database state more clearly.
- The `/help` text is now rubricated, points first-time players to the tutorial dream, documents map expectations and includes `/restart`.
- Multi-word clickable slash hints with underscores now parse as spaces, such as `/sleep_tutorial`, `/queue_cancel`, `/queue_clear` and `/auto_stop`.
- Updated lexicon, tutorial, social-signal, NPC profession and operations docs with the new maintenance rules and future follow-ups.

### Tests

- Added or extended regression coverage for runtime status helpers, ecology death counters, admin reset modes, target keyboard layout, reply targets and input aliases.
- Ran the project build and full test suite.

---

## 0.13.16 - World lexicon case forms - 12026-05-30

### Added

- Added a central world lexicon for stable creature, profession, spirit, resource, feature and common-noun Ukrainian case forms.
- Added world-lexicon documentation and README pointers for content structure.

### Changed

- Grammar known-form lookup now reads from the world lexicon instead of a local hardcoded block.
- Seed species name fields now use the lexicon helper for active species and current NPC profession species.

### Tests

- Extended character-name and grammar coverage for lexicon lookups and seed species helper forms.

---

## 0.13.15 - Auto stand-up after rest - 12026-05-30

### Fixed

- Player auto mode now stands a sitting character up before automatic physical actions such as movement or gathering, so an auto-rested character no longer loops into posture guard errors after rest completes.

### Tests

- Extended posture helper coverage for the auto stand-up decision.

---

## 0.13.14 - Core loop omen and tutorial keyboard polish - 12026-05-30

### Added

- Added a first old-campfire memory omen slice: seeded old ordinary campfires can reveal one short atmospheric trace when fed with `twigs` or relit from a torch, and the trace remains visible in later campfire inspection text.
- Added the `LOOP-003` planning item and system notes for future old-campfire memory omen tuning.
- Added sleep and dream planning docs, including `SLEEP-001` through `SLEEP-004`, `DREAM-001` through `DREAM-004`, and a future implementation prompt pack for ordinary sleep and dream-presence foundations.

### Changed

- Tutorial dream reply keyboards now keep ordinary `Help`, `Menu`, `Status` and `Examine` controls hidden until the matching lesson has surfaced them, while `Inventory` appears once the character actually carries something.
- Entering the tutorial dream now turns off player auto mode so automatic actions do not keep running inside the dream.
- Targeted `look` now stays focused on visible character/NPC state, while targeted `examine` can show fuller carried inventory or hunter field-supply details with approximate public quantities instead of exact counts.
- Updated gate hunting saturation planning with future persisted linger/cooldown, per-tick saturation caching for larger hunter counts, and the temporary plain `/put` default that should later be removed or redefined for generic containers.
- Updated survival, terminology, roadmap, backlog and icebox docs with the distinction between sitting/resting, lying, ordinary sleep, tutorial sleep and future lucid dream instances.

### Tests

- Added `scripts/test/campfire-memory.cjs` coverage for first-reveal and later-inspection behavior.
- Extended posture/reply-keyboard coverage for progressive tutorial dream controls.
- Extended input-alias coverage for brief/full target inspection parsing and hidden hunter marker cleanup.

---

## 0.13.13 - NPC held torch inventory foundation - 12026-05-30

### Added

- Added `CreatureResource`, a carried-resource table for NPCs and other creatures.
- Added seed/reset support for unique NPC carried resources.
- Seeded `Орина` with a real held `lit_torch` and spare `torch` instead of the lightweight `hunter_torches` marker.
- Added NPC-held torch state helpers so lit torches use the same duration assumptions as player-held torches.
- NPC-held lit torches now count as active local torch light.

### Changed

- Hunter ground-torch pickup and gate resupply now write real NPC carried resources.
- Hunter `currentAction` still carries route/intent markers such as returning for torches, but basic torch count now comes from carried resources with a legacy marker fallback.
- `/look` and `/examine` style target text can show when a visible NPC is holding a lit torch.
- Tutorial dream reply keyboards now hide `Help`, `Menu` and ordinary status buttons outside the rest lesson, replacing hidden utility actions with empty slots like unavailable directions.
- The first blocked attempt to move through the closed Dream Gate now gives a one-time Сон hint to inspect the gate.
- Ukrainian feature inspection now recognizes Dream Gate case forms such as `оглянути браму` and `придивитися до брами`.
- Failed `inspect`/`look at` target attempts now use diegetic "I do not see this here" wording instead of generic target-list language.
- Feature inspection now accepts the short Ukrainian form `огл брама`.
- Unknown-command suggestions can now show a matching slash command shortcut in parentheses, such as `оглянутися (/look)` or `швидкий огляд (/glance)`.
- `/glance` now renders only the location name and visible exits, without an extra "quick look" label or nearby presence text.
- The tutorial hub `Майбутні уроки` feature now has its own feather icon instead of the generic landmark marker.
- Remaining generic landmark, bridge and tutorial prompt features now use distinct icons, including the fisher post, old bridge planks, old stones, dry well and tutorial hints.
- The tutorial dream now reveals the main-keyboard inventory button after pickup, gather success or explicit inventory commands, not only after the first gather.
- Hunter stand-down no longer queues extra `SAY` / `REST` actions on world tick; hunters at the waiting fire now enter a resting state directly and use a rate-limited speech event.
- World tick summaries now count hunter `stoodDown` state separately from queued rest actions.
- Updated gate hunting loop and `NPC-004` planning docs for the first actor-inventory slice.

### Tests

- Updated NPC hunter helper coverage so new hunter torch action text no longer depends on the lightweight torch-count marker.
- Added world-seed coverage for unique NPC carried resources and Орина's real torch inventory.
- Extended reply-keyboard posture coverage for the focused dream gate keyboard and tutorial rest status exception.
- Added reply-keyboard helper coverage for tutorial inventory-button visibility.
- Added parser, suggestion and seed coverage for Dream Gate inspection aliases.

---

## 0.13.12 - Gate hunting saturation stand-down - 12026-05-30

### Added

- Added a conservative gate-hunting saturation helper based on drop-off contribution, nearby mouse/rabbit pressure and nearby depleted-vegetation signals.
- Added saturation-aware inspect text for the gate hunting notice and carcass drop-off feature.
- Added a hunter stand-down path: hunters without claimed carcasses stop seeking prey while saturation is active, route toward the magic campfire, rest and use a quieter waiting line pool.

### Changed

- Player carcass/remains drop-offs remain physically accepted while saturation is active, but new supply reward thresholds are suppressed.
- Player auto mode now avoids choosing the same broad automatic action twice in a row when another candidate action is available.
- Plain `/put`, `put` and `покласти` now temporarily default to `/put туша рів`, so the drop-off hint remains usable even without typed parameters.
- Location features can now use per-feature icons; the torch stand, hunting notice and carcass drop-off near the gate no longer all share the generic landmark glyph, and the unlit torch supply avoids the fire icon reserved for actual flame.
- `/open` now acknowledges visible non-openable local gates such as the closed settlement gate instead of saying no gate is present.
- `/open`, `open`, `o`, `відкрити`, `відчинити`, `відкрий`, `відчини` and related forms now accept optional gate-like targets such as `ворота`, `брама` or `gate`.
- Gathering now has the same text-only learning bridge as attack: every thirteenth personal gather attempt can show a growth message, and every fifth observation of another player or NPC gathering can show a smaller growth message.
- Updated gate hunting loop docs and `ECO-003` planning notes with the first implemented saturation boundary and remaining tuning.

### Tests

- Extended gate hunting loop helper coverage for saturation activation/deactivation, reward suppression and hunter stand-down line selection.
- Added auto action ordering coverage for the non-repeat preference.
- Added parser coverage for plain `/put` defaults and the `put out torch` collision guard.
- Added seed coverage so nearby explicit feature icons do not repeat, and so the gate torch stand does not use the fire icon.
- Added parser/helper coverage for `/open` feedback on visible but currently non-openable gates.
- Added parser coverage for targeted open aliases such as `відкрити ворота` and `o gate`.
- Added helper coverage for gathering practice and observation milestones.

---

## 0.13.11 - NPC hunter state-machine slice - 12026-05-30

### Added

- Added the first seeded gate hunter NPC, `Лукан`, near the closed settlement gate.
- Added `Орина`, a second seeded hunter NPC near the forest edge, returning toward the gate with one visible lit torch and one spare torch represented in the lightweight hunter bundle state.
- Added the hunter and herbalist NPC names to the scribe-approved prepared-name corpus as reserved records.
- Added a first NPC hunter state-machine slice that routes through ordinary exits, seeks visible mice or rabbits, attacks through the delayed creature action queue and returns claimed carcasses to the gate.
- Added hunter-claimed carcass markers and grouped corpse resource helpers so NPC deposits can use the existing carcass drop-off contribution service.
- Added narrow hunter pickup for visible ground torches so found `torch` and `lit_torch` stacks can feed the current hunting bundle slice.
- Expanded herbalist ambient speech and player auto-mode speech banks to 50 lines each.
- Added text-only attack learning hints: every thirteenth player animal kill through `ATTACK` and every fifth personal observation of another actor's recent kill can send a private skill-growth line without changing numeric skills yet.

### Changed

- Creature attack completion now treats `hunter` profession kills differently from predator feeding: hunter kills are claimed for the `Падальний рів` instead of becoming ordinary visible prey corpses.
- Hunters marked as returning for torches now keep moving toward the gate unless they see local prey on the way.
- Hunter prey selection now skips child animals and prefers adult prey before old prey, then young prey.
- Unique creature seeding and world reset now reuse prepared-name case forms for named NPCs before falling back to local overrides.
- Updated gate hunting loop docs and `NPC-002` planning notes to distinguish the first state-machine slice from the still-future real torch bundle/light-state work.
- Documented future hunter torch crafting from gathered resources.

### Tests

- Extended NPC hunter helper coverage for profession detection, claimed-carcass markers and grouped corpse resource keys.
- Added NPC hunter prey-order coverage for child-skip and adult/old/young target priority.
- Added ambient line-bank coverage so herbalist and auto speech variety does not shrink below 50 unique lines each.
- Added attack-learning helper coverage for practice and observation milestone cadence.

---

## 0.13.10 - Hunter route plan and posture action guards - 12026-05-30

### Added

- Added an NPC hunter route-plan helper that resolves the gate drop-off location, a configured magic campfire and routes in both directions through existing location exits.
- Added route-plan constants for the first hunter torch bundle and return reserve.
- Added bulk loose-ground pickup for commands such as `get all`, `pick all`, `взяти все` and `підняти все`.
- Added compact `всі` pickup buttons beside visible loose resource stacks so players can pick up all items of one type.

### Changed

- Updated `NPC-002` planning notes so the remaining hunter MVP can build on explicit route planning instead of teleporting between gate, campfire and hunting areas.
- Sitting now blocks physical actions such as movement, pickup, gathering, attacking, freshening, dropping, putting items into features, cooking and fire/torch handling; blocked actions show a stand-up prompt.
- Tutorial sleep posture text now distinguishes outer sleep from the action happening inside the dream.
- Location and target-detail callbacks now prefer sending a fresh message when their source message is no longer the latest tracked bot message, reducing missed edits to older descriptions.

### Tests

- Added focused NPC hunter helper coverage for route directions, total travel cost, missing route reasons and torch bundle constants.
- Added parser and posture text regression coverage for bulk pickup and dream-sleep posture layering.

---

## 0.13.9 - NPC drop-off contribution foundation - 12026-05-30

### Added

- Added an NPC-facing carcass drop-off contribution helper so future hunters can record deposits through the same service as player `put` actions.
- Added a compact hunter field-line pool for future NPC hunter state changes such as departures, trail choices, returns, deposits and giving up.

### Changed

- NPC drop-off records now keep source identity without granting player inventory rewards.
- Updated gate hunting loop planning notes so `NPC-002` can build on the shared drop-off service and the 0.13.8 route finder.

### Tests

- Extended gate hunting loop helper coverage for deterministic hunter field lines.

---

## 0.13.8 - Location route finding foundation - 12026-05-30

### Added

- Added a reusable location-to-location route finder for world exits, with hidden exits and caller-blocked directions excluded by default.
- Added a Prisma-backed route lookup that also respects currently locked exits before future NPC and auto-mode movement uses it.

### Changed

- Marked `NAV-001` as testing and updated the near-term gate hunting loop plan so NPC hunter integration can build on route finding instead of teleporting.

### Tests

- Added route-finding coverage for simple routes, no-route results, hidden-exit filtering, caller-blocked directions and depth limits.

---

## 0.13.7 - Gate hunting loop foundation - 12026-05-30

### Added

- Added `docs/systems/gate_hunting_loop.md` as the design source for a settlement-facing ecological pressure loop instead of a formal quest/bounty board.
- Added planning items for the gate hunting loop, narrow `put` command, carcass drop-off reactions and future NPC hunter behavior.
- Added a gate notice and physical carcass drop-off feature near the closed settlement gate.
- Added a narrow `put` / `/put` command that can place carried carcasses/remains into matching local features.
- Added a carcass drop-off contribution table and service so valid drop-offs record contributor, resource kind and amount.
- Added first and threshold settlement reactions for carcass/remains contributions without fixed per-corpse pricing.

### Changed

- `/help`, `/commands` and input-alias docs now list the first narrow `put` forms for carcass/remains drop-off.
- Planning exports now include the new gate hunting loop task pack.
- The second tutorial dream location now keeps a narrow reply keyboard with only look, north and south, instead of exposing the full main keyboard too early.
- `reply` now remembers direct addressed speech and whispers per recipient, so a player can answer the last speaker even if that speaker is no longer visible.
- `shout` now accepts more natural Ukrainian shout forms such as `кричати`, `крик`, `вигукнути` and `волати`.
- Unknown-text suggestions now include regex-backed speech commands such as `крикнути`, `кричати`, `шепнути` and `відповісти`.
- Gate hunting loop docs now include thematic hunter shout/field-line guidance for the future NPC hunter and player hunter auto-mode.
- Documented the future NPC hunter route-and-torch loop, including gate torch bundles, magic campfire ignition, delayed hunting actions and a new `NAV-001` route-finding planning item.

### Tests

- Added parser coverage for default, numeric and `all` / `все` `put` forms.
- Added focused helper coverage for carcass-resource validation and drop-off threshold reactions.
- Added reply-keyboard coverage for the second tutorial dream location.
- Added helper coverage for the per-recipient reply target memory payload.
- Added parser coverage for additional Ukrainian `shout` synonyms.
- Added suggestion coverage for speech-command aliases that are parsed by regex instead of exact command entries.

---

## 0.13.6 - Speech commands and sitting rest posture - 12026-05-29

### Added

- Added shared-alias speech commands for `whisper [player] [message]`, `reply <message>` and `shout <message>`.
- `whisper` sends private local speech to one visible player target while bystanders only see that a whisper happened.
- `reply` answers the most recent local speech event that addressed the character by name/forms.
- `shout` sends a wider region-level speech message and spends extra stamina through the existing speech/action queue path.
- Added a separate player posture field with `STANDING` / `SITTING` states, plus `/sit`, `/stand`, `сісти`, `присісти`, `встати` and related aliases.

### Changed

- `/commands`, input-alias docs, `CMD-001` and `docs/planning/next.md` now mark the near-term command pack as shipped through the speech slice.
- Inventory fire actions such as lighting/dousing torches and adding twigs now send the action result as a separate message before refreshing the inventory view.
- `/rest` now starts active recovery while sitting; rest completion or interruption stops recovery but leaves the character sitting until they stand up.
- Character and location descriptions now distinguish standing, sitting and sitting while resting.
- Main reply keyboards and character-card actions now show `Сісти`, `Встати` and `Відпочити` according to the current posture/rest state.

### Tests

- Added parser coverage for English and Ukrainian `whisper`, `reply` and `shout` forms.
- Added parser coverage for posture aliases and focused helper coverage for posture text/button states.

---

## 0.13.5 - Enter and leave text navigation - 12026-05-29

### Added

- Added `/enter`, `enter [place]`, `/leave` and `leave [place]` aliases on top of the existing `INSIDE` / `OUTSIDE` movement directions.
- Ukrainian natural forms such as `увійти в кущі` and `вийти з кущів` are now covered by input-alias regression tests.

### Changed

- Help, `/commands`, input-alias docs and `CMD-001` now mark the `enter` / `leave` slice as shipped.

### Tests

- Added parser coverage for `/enter`, `enter bushes`, `увійти в кущі`, `/leave`, `leave cave` and `вийти з кущів`.

---

## 0.13.4 - Quick navigation commands - 12026-05-29

### Added

- Added shared-alias quick navigation commands: `/glance`, `glance`, `глянути швидко` and `швидко глянути` show a compact current-location read without the full location description.
- Added `/exits`, `exits`, `виходи` and `куди можна йти` to show only visible exits from the current location, including visible locked exits.
- Help, `/commands` and input-alias documentation now list the quick navigation commands as current behavior.
- Added future planning and system documentation for social contacts/groups and hidden presence / hidden follower spirits.

### Changed

- `CMD-001` now records the shipped quick-navigation slice and keeps `enter`, `leave`, `whisper`, `reply` and `shout` as the remaining near-term command work.

### Tests

- Added input-alias regression coverage for the new `glance` and `exits` forms.

---

## 0.13.3 - Meat and campfire cooking loop - 12026-05-29

### Added

- Freshening a sufficiently fresh animal corpse now adds universal raw meat to inventory instead of being a debug-only action.
- Raw meat can be cooked into cooked meat when the player is near a campfire; a torch alone is not enough.
- Cooking raw meat now has an imperfect first success rate of roughly three successes out of five attempts; failed attempts consume the raw meat without producing cooked meat.
- Cooked meat can be eaten from inventory to reduce hunger by a modest amount.
- Added text aliases for cooking and eating cooked meat, plus freshening/butchering wording.
- Added a hidden `/commands` reference that lists current text commands, aliases and planned MUD-style command directions.

### Changed

- Freshened corpses are marked so they cannot be harvested for meat twice.
- Inventory food buttons now use eat wording while `use` / `використати` remain compatibility aliases for edible items.
- `FOOD-001` is now in testing.

### Tests

- Added input-alias regression coverage for meat cooking, cooked meat eating, edible herb aliases and corpse butchering aliases.

---

## 0.13.2 - Pickup and gather command semantics - 12026-05-29

### Changed

- Pickup text commands such as `take herbs`, `get mushrooms`, `підібрати ягоди` and `взяти трави` now stay in the pickup flow instead of silently becoming resource gathering.
- Natural resources are picked up only when they are actually visible loose ground items; otherwise pickup text gives a hint to gather them instead.
- Gather text commands such as `gather herbs`, `збирати ягоди` and `шукати гриби` continue to use the ordinary resource-gathering flow.
- Marked `ITEM-001` as testing and updated input-alias documentation for the pickup versus gather split.
- Added `FOOD-001` to the near-term plan for corpse freshening, raw meat, campfire cooking and cooked meat hunger relief.

### Tests

- Updated input-alias regression coverage for pickup verbs on natural resources.

---

## 0.13.1 - Forbidden-name normalization - 12026-05-29

### Changed

- Custom-name validation now normalizes casing, apostrophe/separator variants, internal whitespace and hyphen splitting before checking obvious forbidden names.
- Expanded forbidden-name coverage for creature, spirit, sacred, famous-character and common-word examples.
- Updated character-name onboarding documentation for the stricter custom-name guardrail.
- Simplified `/adminHelp` by removing ordinary player-help commands and grouping scribe/admin tools by purpose.
- The first tutorial dream location now uses a focused starter keyboard with only `Look` and the visible south movement button.
- Direction suggestions now treat `пів` as ambiguous instead of moving south directly, so unknown-command hints can offer both `північ` and `південь`.
- Changed the tutorial bushes and inside-movement button emoji so they no longer resemble gathering/resource actions.
- Added `наз` as a Ukrainian text alias for outside movement to match compact exit labels.
- Added a matching tutorial bushes feature inside the observation room with an explicit `Outside` action button.
- Successful tutorial gathering now refreshes the reply keyboard immediately so the inventory button appears after the first find.
- The onboarding name confirmation now bolds the chosen character name and example case forms.
- Custom-name onboarding now shows three available prepared-name examples for the chosen pronoun/gender and accepts matching prepared names directly with saved case forms.
- Inventory use callbacks now send the action result as a separate message while keeping the inventory message as a clean inventory view.
- Fatigue and recovery threshold messages now refresh the main reply keyboard so the status button reflects the updated stamina immediately.
- Gather result text and the tutorial foraging hint now make stamina spending explicit, and the inventory hint clarifies that the inventory button appears after the first gather only if it is not already available.
- Text commands such as `take herbs`, `get mushrooms`, `підібрати ягоди` and `взяти трави` temporarily route to gathering instead of trying to resolve those resources as nearby targets; follow-up planning now tracks the cleaner split where pickup verbs mean visible ground-item pickup and gather verbs mean local resource gathering.
- Location feature section headings are now bolded in Telegram location views for easier scanning.
- Interactive location features can now be inspected by text, such as `look bench`, `/examine лавка` or `оглянути лавку`, with fallback to ordinary visible targets when no feature matches.
- Feature callbacks now avoid editing an older feature message after the same flow has sent newer follow-up voice/tutorial messages.
- The tutorial rest-seat feature was renamed from `Лавка короткого перепочинку` to the shorter `Зручна лавка`.
- `/restAdmin` now accepts an optional player target, matching `/playerAdmin`-style lookup by id, local number, name or username, and notifies/logs when a scribe restores another player's stamina.
- Added `ITEM-001` to the near-term plan for pickup versus gather command semantics.

### Tests

- Added regression cases for spaced-out or separator-split forbidden names.
- Added coverage to ensure prepared character names are not accidentally rejected by forbidden-name checks.

---

## 0.13.0 - Prepared-name pool expansion - 12026-05-29

### Added

- Added 9 new prepared character names to the onboarding name pool, covering masculine, feminine and plural-form choices.
- Added prepared-name regression checks for duplicate keys, duplicate nominative forms and complete Ukrainian case forms.

### Changed

- Prepared-name onboarding now has a larger minimum available pool: at least 8 masculine names, 8 feminine names and 6 plural-form names for playtesting.
- Updated character-name and onboarding documentation for the 0.13 Core Loop & Onboarding Stability lane.
- Marked the repository-docs planning source-of-truth slice as ready for testing after verifying the planning index and roadmap language.

---

## 0.12.15 - Tutorial gate, inside movement and drop feedback - 12026-05-29

### Added

- Added a matching locked dream-gate feature on the tutorial hub side, so the gate passage is visibly locked from both directions.
- Added natural speech variants and shorthand text aliases for the tutorial gate phrase, including Ukrainian `говорити`, `ск`, `сказ` and `гов` forms.
- Added an inspectable tutorial hub bush feature with an `INSIDE` movement action, plus input aliases for non-compass inside/outside movement.
- Added near-term planning notes for per-command help pages and dream item origin tracking.

### Changed

- The tutorial dream gate now opens and closes both sides of the passage together, and closing notifications rebuild each player's current reply keyboard.
- Tutorial observation voices now render as separate quote messages, and the placeholder skill-progress result is sent as a separate HTML message.
- The tutorial observation lesson now belongs to the fox-motion feature interaction instead of triggering from the whole location examine view.
- The tutorial rest branch now uses a rest-seat feature for the first rest room while keeping the deeper dream fire as the faster rest room.
- Help and input-alias documentation now describe the expanded `/say` aliases and visible locked exits from both sides of the dream gate.

### Fixed

- Location and region notifications no longer replace current reply keyboards with an empty generic keyboard when no inline keyboard is provided.
- The dream gate close message no longer describes only the south path after both sides are locked.
- Inventory drops now send a clear actor confirmation instead of burying the result inside the inventory view.
- Tutorial dream berries, herbs and mushrooms can appear as visible loose ground resources when they are on the ground.
- Parser regression tests now use a neutral target example instead of a real player name.

---

## 0.12.14 - Tutorial rest and location readability - 12026-05-29

### Changed

- Tutorial rest guidance now sends Сон and Дрімота as separate quoted messages instead of appending them to the rest status block.
- Rest status messages now hide HP, stamina and state lines from ordinary players while keeping the rough time-to-full-rest estimate visible.
- The tutorial world-date hint from Крук now uses the same quoted Telegram style as other voiced text.
- Location feature names and nearby beings are highlighted in HTML output, and nearby players now show their current queued/running action or posture.
- Player auto mode now announces the selected automatic action for speech, gathering, inspection and movement, and its confirmation text states the auto cadence is slower than manual play.
- Custom-name onboarding warning examples now visually emphasize rejected example names and transliteration examples.
- Refreshed roadmap, game design and planning documentation around the next 0.13-0.15 direction: onboarding stability, beginner return, night/light/firewood, observation and learning.

### Fixed

- Completing rest now refreshes the main reply keyboard/status label along with the completion message.
- Stale onboarding inline buttons no longer reopen name selection after the character has already completed onboarding; they show a restart hint instead.

---

## 0.12.13 - Tutorial speech and onboarding polish - 12026-05-29

### Added

- The tutorial dream gate now opens when a player says `/say Відчинитися`, with a one-time tutorial voice comment about text affecting the world.

### Changed

- The tutorial dream gate button now says `Сказати «Відчинитися»` instead of advertising a generic open action.
- Tutorial dream gate timing text now frames the closing pressure as Дрімота losing patience, while Сон remains the steadier guide voice.
- Onboarding now refers to Порубіжжя before the forest proper, and splits name confirmation, dream entry and the world date into separate messages with Крук voicing the date.
- Custom-name onboarding now restores concrete rejection examples, keeps saved names Cyrillic, and lets players without a Ukrainian keyboard enter fully Latin transliteration that is converted before case review.
- Custom-name case prompts now offer a `+ (далі)` button, better decline simple masculine descriptive compound names such as `Великий Вова`, and review all case forms before saving.
- Main and menu Telegram reply keyboards now explicitly avoid persistent mode, so mobile clients can dismiss them more naturally.
- Prepared character-name choices now match the selected onboarding pronoun/grammatical gender and include a first 5/5/3 masculine, feminine and plural-form pool.
- Prepared character-name onboarding now offers a gender-aware `Випадкове ім'я` button and rechecks name availability immediately before saving.
- `/restart` messages now use in-world wording for erased characters, things and records instead of technical onboarding/inventory language.
- Player speech now reports the speaker by name to others in the same location.

### Fixed

- `/tutorialReset` now refreshes the target character's reply keyboard after moving them back to the tutorial dream start.
- `↩️ Назад` in the Telegram menu now returns the main reply keyboard instead of hiding buttons; explicit hide-keyboard text still hides it.
- `/restart` now removes the stale reply keyboard after deleting the character, so old game buttons cannot be tapped during fresh onboarding.
- `/restart` now also works while character onboarding is still in progress, clearing the pending onboarding state before the next `/start`.
- Prepared onboarding names now exclude names already used by named NPCs, including `Ведана`.

---

## 0.12.12 - Prepared-name reservations - 12026-05-28

### Changed

- Moved the prepared character-name pool into a typed data module with explicit reservation state.
- Prepared names now stay hidden when reserved for future NPCs or events, not only when already used by a character.
- Expanded focused character-name regression coverage for reserved prepared names.

---

## 0.12.11 - Prepared character names - 12026-05-28

### Added

- New character onboarding now offers a choice between prepared names and custom name entry after pronoun selection.
- Added the first curated prepared-name pool with stored Ukrainian case forms, origin and rarity.
- Prepared names are filtered out when already used and are saved as pre-approved by scribes.
- Custom name entry now shows a setting-fit warning and rejects exact duplicates plus a first set of creature, spirit, sacred and famous-name conflicts.
- Added focused regression coverage for prepared-name availability and forbidden custom names.

---

## 0.12.10 - Beginner tutorial return prompts - 12026-05-28

### Changed

- `/start`, `/help` and unknown-input fallback messages now remind unfinished characters how to return to the tutorial dream.
- `/help` now adds a direct tutorial button for characters who have not completed the tutorial yet.
- Added natural Ukrainian tutorial-return aliases such as `навчання`, `пройти навчання` and `повернутися до навчання`.

---

## 0.12.9 - Border marker ecology report - 12026-05-28

### Added

- Added a public ecology report to the inspectable border marker feature, showing rough wildlife and recent birth/death notes without reopening the full `/stat` surface.
- Added `/examine sign`, `/examine border marker` and Ukrainian text aliases for inspecting the local border marker.
- Added near-term planning notes for a local console client that can later drive command smoke tests before a full MUD server exists.
- Added parser regression tests for shared text aliases so future Telegram, console and MUD-style command input can stay aligned.

### Changed

- Border marker ecology text now hides exact counts by default; exact values are only appended for scribes/admins with technical details enabled.

---

## 0.12.8 - Tutorial observation branch - 12026-05-28

### Added

- Added a side branch to the tutorial dream where players can inspect fox movement as the first scripted proof of observation-based learning.
- Added a one-time tutorial observation event so the lesson can say that Tracking improved slightly without requiring the full skill system yet.
- Added `observe`, `watch`, `спостерігати` and `поспостерігати` as text aliases for closer inspection.
- Added a second tutorial rest room with a dream campfire that makes rest speed visibly faster and can restore stamina above the ordinary maximum.

### Changed

- Updated tutorial hub text and planning notes so the dream now points to foraging, rest, time/safety and observation as separate beginner lessons.
- Tutorial rest rooms now use a data-driven rest regeneration multiplier, and rest-time estimates account for that faster recovery.
- The first tutorial use of `/rest` now gets a short Сон/Дрімота comment, with docs reminding future tutorial commands to do the same.
- Passive and active rest stamina recovery now restore larger chunks per interval so recovery is much less sluggish during early testing.
- Dropped lit torches now remain burning ground items, light their location, can be picked back up and later burn out into `twigs` with a local message and world event.
- Brief location views now include visible pickable ground items under `Лежить`, not only corpses.
- Depleted-grass inspection text no longer repeats the same recovery warning in multiple paragraphs.
- `/restAdmin` now reports the actual saved stamina value and refreshes the main reply keyboard after use.
- Full `/stat`, the menu stats button and web `/stat` / `/stat.json` are now scribe/admin surfaces; public ecology reporting is planned as a separate diegetic feature.

---

## 0.12.7 - Website news and tutorial polish - 12026-05-28

### Added

- Added a public `/news` web page and linked the latest news from the status site home page.
- Added `див` and `дивитися` as Ukrainian text aliases for the location overview action.
- Added first tutorial inventory voice hints from Сон and Дрімота when opening inventory inside the dream.
- Added `/tutorialReset [character]` for scribes to clear tutorial completion and return the saved dream tutorial position to the start.

### Changed

- Refreshed the Ukrainian status site copy to match the current README identity around a living liminal frontier sandbox.
- Extinguished campfires now use a non-fire icon in location feature lists so they do not look lit at a glance.
- Location detail output now groups nearby creatures and their repeated actions instead of printing duplicate `nearby` and `movement nearby` rows for every animal.
- Detailed location inspection now shows age-category creature labels in grouped animal movement, while exact age ticks remain limited to technical details.
- Berries now ease hunger by a tiny amount in addition to restoring a small amount of stamina, so they can still be used when stamina is full but hunger is present.
- The character profile now shows when the tutorial dream has not yet been completed.
- Tutorial pace reminders now draw from 13 Сон/Дрімота pairs and use a cycling 30s, 1m, 2m, 4m, 8m rhythm; repeated dream-gate openings use the same timing windows.
- Tutorial berries and herbs in the dream foraging room no longer deplete the location resource node, and dream foraging items fade away when leaving that room.
- Tutorial voice comments from Сон and Дрімота are treated as private player guidance and no longer write world-event log entries.
- Expanded docs/planning for rest posture, tutorial observation-learning, first skill vocabulary and future fox/attack observation lessons.

---

## 0.12.6 - Roadmap and performance planning refresh - 12026-05-28

### Changed

- Updated the public roadmap and game design docs so the post-tutorial path emphasizes the minimal core loop, living-world feel, observation learning and social signals before broad combat, crafting or economy systems.
- Refreshed README and Codex memory docs with the current identity: a Telegram-first living liminal frontier sandbox where characters grow through use, observation and survival.
- Expanded progression, social-signal and onboarding docs so future tutorial branches teach attention to the world rather than a mechanical checklist.
- Promoted the runtime performance notes into the planning backlog: world tick staging, action lifecycle metrics, status DB pagination, auto scheduler refactor and creature simulation budgeting.

---

## 0.12.5 - Status and player action performance - 12026-05-28

### Changed

- Narrowed heavy admin/status database reads for `/all` and location listing pages so they select only the fields those views render.
- `/all` now uses database pagination for creature rows instead of loading and formatting every creature on each page request.
- Added optional `STATUS_PERF_DEBUG=true` timing logs around the heavy status page builders, including failure paths.
- Status callbacks now ignore Telegram's harmless "message is not modified" response when a scribe taps the current page again.
- Web `/all` now avoids writing response headers before its page is built, preventing a failed status render from crashing the process with duplicate headers.
- Fixed the narrowed `/all` player query to use actual `Player` schema fields, avoiding a Prisma validation crash after the status optimization.
- Due player actions now complete with bounded concurrency instead of a fully serial loop, matching the existing creature-action completion shape while keeping each actor's actions ordered.
- Added `PLAYER_COMPLETION_CONCURRENCY` as a Render/runtime tuning knob for due player-action completion.

---

## 0.12.4 - Tutorial time and safety rooms - 12026-05-27

### Added

- Added two optional dream tutorial rooms south of the hub: one teaches `/time`, and one teaches basic safety habits around `/look`, `/rest`, `/me` and waking from the tutorial.
- Added tutorial landmark prompts and a direct time button for the new `/time` lesson.
- Added Сон voice comments for entering the new time and safety branches and returning toward the hub.
- Added a stamina drop each time the player enters the tutorial rest room so `rest` has an immediate reason to matter there.

### Changed

- Updated the tutorial hub text and `Майбутні уроки` feature so the optional branch list includes the new south route.
- The tutorial foraging room now guarantees berries/herbs gathering success and keeps the inventory button hidden there until the player gathers for the first time.
- The tutorial rest room now keeps the reply keyboard stamina label qualitative, lets dream rest show `extra` stamina when it rises above the ordinary cap, and explains that dream surplus with a Сон comment.
- `/start` now restores the current tutorial reply keyboard while preserving the player's saved dream position.
- The tutorial now uses the same main 3×3 reply keyboard shape from the first room onward, with exits and tutorial actions opening by location.
- Updated beginner guidance and ONB-001 planning notes for the new tutorial branch coverage.

---

## 0.12.3 - Action queue performance pass - 12026-05-27

### Changed

- Reduced repeated active-action checks in the recovery loop by loading active player and creature action ids once per cycle.
- Reduced heavy `worldTick` reads by loading full creature context only for idle, non-sleeping creatures that can actually receive a new action.
- Added actor-specific `WorldAction` indexes for due-action polling and queued-action startup.
- Added the architecture/performance audit under `docs/dev/`.
- Changed `/start` so it does not repaint the reply keyboard while the player is inside the tutorial dream.
- Varied tutorial pace comments and added escalating cooldowns so repeated idle/look reminders become less frequent.
- Changed the character card in the tutorial dream to show sleeping posture, hide the Sleep button and warn that nested sleep is not implemented.
- Reworded locked exit messages so the blocker name comes before the closed state, for example `Брама сну (закрито)`.

---

## 0.12.2 - Tutorial branches and inventory fire polish - 12026-05-27

### Added

- Added two optional dream tutorial rooms: one teaches `examine`, gathering and inventory; the other teaches brief stamina rest.
- Added tutorial berries, herbs, a dream campfire and Сон voice comments for the new tutorial branches.
- Added paired Дрімота and Сон pace comments when a tutorial player keeps looking around or finishes a wait action.
- Added inventory actions for adding carried `twigs` to a nearby campfire and dousing carried lit torches while preserving remaining burn time for relighting.

### Changed

- Expanded tutorial location descriptions so the dream teaches with more atmosphere and context before relying on buttons alone.
- Added `tutorial` as a text alias for `/sleep tutorial`.
- Made the settlement gate near the bridge explicitly behave like a visible locked exit without any current way to open it.
- Changed `Назад` in the Telegram menu to hide the persistent reply keyboard, with `/menu` or `/start` available to bring buttons back.
- Updated the Telegram command-menu description for `/start` and clarified in the `/start` response that buttons live under the input field while text commands still work.
- Updated the tutorial hub, beginner guidance and ONB-001 planning notes to reflect the new optional branch coverage.

---

## 0.12.1 - Tutorial dream polish and visible actions - 12026-05-27

### Changed

- Simplified the first tutorial dream location keyboard so the opening only shows the location overview action and the south movement button.
- Hidden inventory, examine, help, menu and status buttons from the first tutorial step to keep the onboarding path focused.
- Clarified the first tutorial dream location text so it points players toward the only visible path south.
- Added first tutorial spirit voice comments for forward and backward movement in the dream, logged as NPC speech events.
- Renamed the tutorial dream gate from `Сонні ворота` to `Брама Сну` to avoid implying that the gate itself is sleepy.
- Moved the visible `Прокинутися` tutorial button out of the early gate step; direct wake commands still work as an escape hatch.
- Direction buttons now mark visible locked exits with compact parentheses around the direction label while the lock is active.
- Added a tutorial hub feature that offers the visible wake-up action after the first tutorial path opens, with voice text explaining that the player can return to the saved dream position later.
- Expired tutorial dream gates now close as explicit world events and notify nearby dream locations instead of silently becoming locked again.
- Track-detail buttons now use a clear `Сліди` label, and the tutorial dream voices react when a player studies tracks closely.
- Clarified the second tutorial step text so it explicitly points players to the south button or text command.
- Immediate pickup and drop item actions now notify other players in the location, write world events, and appear in admin recent-action history.
- Lisovyk depletion warnings now ignore artificial torch/twigs resources and use more natural Ukrainian resource wording.
- Public `/stat` character rows no longer expose whether a listed character is player-controlled or NPC-backed.
- The character card now exposes a Sleep button, and unavailable normal sleep offers a direct tutorial sleep button.

---

## 0.12.0 - Dream tutorial - 12026-05-27

### Added

- Added the first tutorial dream region, `Дрімотна Межа`, on a separate `z = -13` map layer.
- New characters now enter the tutorial dream after onboarding, and `/sleep tutorial` can return a character to the saved tutorial position.
- Added `/sleep` routing to the tutorial while it is incomplete, plus `/wake` / `Прокинутися` to leave the dream and restore a valid real-world location.
- Added reusable visible locked exits: locked directions appear in location exit lists, movement into them is blocked with a reason, and queued moves re-check the lock before completing.
- Added the first interactive gate, `Брама Сну`: `/open` / `Відкрити` opens the locked south exit for about 30 seconds before it lazily closes again.

### Changed

- The closed settlement gate now has a visible locked east exit instead of only being represented as a feature.
- Updated onboarding, input-alias, map and release documentation for the new tutorial flow.
- Removed stale top-level split seed JSON duplicates from `prisma/data/`; the active world seed source is now unambiguous under `prisma/data/world/`.

---

## 0.11.12 - First inventory uses - 12026-05-27

### Added

- Added the first usable gathered resources from inventory: berries can restore a small amount of stamina, mushrooms can ease hunger, and herbs can be used for a small HP recovery when wounded.
- Added inventory action buttons for carried berries, mushrooms and herbs.
- Added an inventory `Запалити факел` action when the character carries an unlit torch and has fire nearby, either from a location campfire or another lit torch.
- Added first inventory inspect/drop actions for carried resource stacks.
- Added Ukrainian and English/MUD-style text aliases for the same actions, including `з'їсти ягоди`, `використати гриби`, `використати трави`, `запалити факел`, `викинути ягоди`, `item berries`, `eat berries`, `use mushrooms`, `use herbs` and `light torch`.

### Changed

- Updated survival, fire/light, input-alias and planning docs now that the inventory screen has first modest item actions.

---

## 0.11.11 - Vegetation inspection and firewood fuel - 12026-05-27

### Added

- Added inspection for the `Винищена трава` location feature: players can open it from the feature button or use `/examine grass`, `/examine depleted grass`, `роздивитися траву`, `оцінити траву` and `оцінити відновлення` to get a rough recovery read.
- Added the first twigs fuel loop: loose `twigs` can be picked up, carried in inventory, and added to ordinary campfires.
- Seed/reset data now places small pickable `twigs` bundles in selected forest and dry-luka locations.

### Changed

- `Додати хмиз` now consumes carried `twigs`: burning ordinary campfires get a capped time extension, while extinguished campfires can receive prepared fuel before being relit.
- Updated fire/light, input-alias and planning docs now that `twigs` is a working fuel item instead of a placeholder.

---

## 0.11.10 - Ecology pressure, track details and admin polish - 12026-05-27

### Added

- Added first creature starvation deaths: animals above the hunger threshold may die, leave corpses, cancel pending actions and write `Animal starved` world events.
- Added starvation death counters to Telegram `/stat`, web `/stat` and `/stat.json`.
- Added `/who` pagination in Telegram, web `/who?page=0` and `/who.json?page=0`.
- Added Ukrainian and Latin cancellation aliases for pending scribe prompts such as name-rejection comments and requested teleport destinations.
- Added targetless NPC social nods, so a herbalist can gesture to the location with text such as `Здравомир киває.` without targeting themselves.

### Changed

- Hungry herbivores now prioritize eating or moving to find food more strongly, and hungry predators search/attack more aggressively.
- `/track` remains a quick track scan without age details. `Роздивитися` on the location shows that tracks exist, and the follow-up track inspection shows approximate track age.
- Admin auto-toggle world events now name both the scribe and the affected character in the event title, with ids in the event description.
- Targetless `SOCIAL_SIGNAL` events no longer expose the internal `location` marker in `/chat`, web `/chat` or `/chat.json`.
- Extracted shared creature action text normalization so location views and text-target alias resolution reuse one helper.
- Extracted shared torch-in-hands wording so the character card and player inspection stay aligned.
- Extracted shared random helper utilities used by action completions and world ticks.
- Added a technical planning item for large-file/service-boundary cleanup after reviewing current refactor hotspots.
- Updated ecology docs and backlog notes now that the first hunger/starvation loop exists.
- Updated Codex and project docs to emphasize tests, command aliases in English/Ukrainian, Holocene-local release dates, and current 0.11.10 planning notes.

---

## 0.11.9 - Softer player text, clearer admin tools and fire cleanup - 12026-05-27

### Added

- Added `/teleport [character] <locationKey|x,y,z>` for scribes to move the current or named character to a selected місцина.
- Added location and character grouping modes for `/chat` in Telegram and on the web chat page.
- Added service detail buttons for visible NPCs in `/all`, alongside existing player admin buttons.

### Changed

- `/start` now keeps an existing character in their current місцина instead of moving them back to the starting location.
- Direction buttons refresh after movement so the persistent keyboard follows the exits available in the current місцина.
- `/look` now keeps features as a compact visible list, while `/examine` explains gameplay details such as light, rest effects, torch stands and campfire state.
- A carried lit torch now burns out into `хмиз` instead of turning back into a dry torch.
- Inspecting another character now shows whether they visibly hold one lit torch, two lit torches, or have empty hands.
- Inventory and action text hides more technical clutter by default: single items omit `×1`, simple action durations stay behind technical details, and fading torches use calmer inventory wording.
- Player-facing text better respects grammatical gender for player inspection, social signals and statistics.
- `/stat` is labelled simply as `Статистика`; deeper ecology pressure remains planned as a separate view.
- Admin player cards now show fuller service details, name approval controls and auto toggles regardless of the viewer's local technical-detail setting.
- `/addCreatureHelp` now uses current location examples and no longer suggests stale location keys.

### Documentation

- Updated fire/light documentation for the torch-to-хмиз lifecycle.
- Added release notes for 0.11.9 and refreshed planning notes for onboarding upkeep, first gathered-resource uses, teaching, starter clothing and future NPC/admin controls.

---

## 0.11.8 - Chat privacy, stable keyboard grid and web stat polish - 12026-05-27

### Changed

- The main keyboard now keeps a stable 3-column layout: missing north/west/east/south exits and an empty inventory slot render as quiet blank cells instead of collapsing the row.
- Moved `Допомога` from the secondary menu into the main keyboard row before `Південь`, keeping `Меню` as a shorter navigation button.
- Web `/stat` now includes the same top-player block as Telegram `/stat`, showing player hunting, gathering, greeting, speech and movement counters alongside the top predator list.
- Ordinary human-like NPC speech now appears as `SAY` in Telegram `/chat`, the web chat page and `/chat.json`; visibly non-human voices such as the lisovyk elder still keep `NPC_SAY`.
- Telegram `/chat` and the scribe `/world` status now trim oversized pages before sending, preventing Telegram `message is too long` runtime errors while keeping full records available on the web/JSON views.
- The public website home page now gives `emblem-logo-01.png` more visual weight and lets the long tone line span the full tone grid instead of wrapping as a narrow column.

---

## 0.11.7 - Local detail mode, keyboard UX and public web status - 12026-05-27

### Added

- Added scribe-only `/debugGet` and `/debugSet <0|1>` as a local per-character technical detail toggle, with `true`/`false` aliases.
- Added a scribe-only technical-details button under the character card auto controls.
- Kept `/debugGet` and `/debugSet` available through `/adminHelp`, direct commands and the character-card toggle without adding them to the scribe-scoped Telegram command menu.
- Added a dedicated `Речі` view for the current inventory; `/inventory`, `речі` and `інвентар` open the same list.
- Added public `/who` and the `Хто активний` menu button for characters active in the last real hour.
- Added public web `/who` and `/who.json` with the same active-character list and a shared active-character count that does not distinguish players from NPCs.
- Added `/playerAdmin <#id|name|username>` for scribes to inspect player details from anywhere; Telegram `/all` now includes player detail buttons for the current page.
- Added `docs/systems/item_lifetime_and_grammar.md` documenting lifetime bands, sex-aware names, animacy and Ukrainian cases.

### Changed

- Main movement buttons now live in the persistent reply keyboard instead of under the location message. The keyboard shows available north/west/east/south exits, `Озирнутися`, `Роздивитися`, `Меню`, an inventory button when the character carries items, and a bottom life/stamina strip.
- The life/stamina strip stays qualitative by default and shows exact `Життя` / `Снага` numbers only when the current player is a scribe/admin with local technical details enabled.
- The character card no longer prints the full inventory inline; it keeps the character summary and opens `Речі` as a separate view above rest/auto controls.
- Character and player-inspection views now hide exact life, stamina, hunger and statistics unless the viewer is a scribe/admin with local technical details enabled; ordinary text uses visible states such as standing/sitting, rested/tired and hunger intensity.
- Detailed location inspection now hides coordinates and danger unless the viewer is a scribe/admin with local technical details enabled.
- Inspecting another player now also shows a gender-aware visible state, a simple unarmed/no-weapon line, and what they visibly hold in their hands.
- Player hunger is capped to the current simple 13-point scale for new action updates.
- Empty money now appears as `немає` instead of `0 ґривень, 0 шагів`; carried money is still summarized when present.
- Inspecting another player no longer reveals their hunger, money or inventory, but a lit torch is visible.
- Lit torches are limited to two active carried flames; a third torch cannot be lit because the character has no free hands.
- Player attack buttons stay generically labeled as `Атакувати`; successful unarmed attacks against small prey are currently described as trampling, predator and character attacks answer that this combat is not implemented yet, and corpse follow-up buttons say `Оглянути труп`.
- Feature rows now hide technical light/rest bonuses such as `дає світло` and `відпочинок до ×5 снаги` unless the current player is a scribe/admin with local technical details enabled.
- Corpse inspection and `Лежить` output now use condition bands by default instead of exact decay ticks: `жахливо`, `скоро зіпсується`, `не дуже добре`, `середньо`, `ідеально`.
- Exact corpse ticks are shown only for scribes/admins who enabled local technical details.
- `/say` and text aliases now first try to parse the opening word or phrase as a visible speech target, so `/say Аїд Доброго вечора, ми з України` addresses Аїд when that target is visible.
- Fading torch warnings are no longer rendered as part of location text; the world tick sends a separate chat message when a carried lit torch enters its final minutes.
- Fading campfires now also send a local chat warning when their flame starts going out.
- Fading campfires now change their visible location and feature text to say they are burning low while still lighting the місцина.
- Telegram `/stat` now includes a top-player block alongside the top predator list, showing player hunting, gathering, greeting, speech and movement counters.
- Social signals now write `SOCIAL_SIGNAL` world events and appear in `/chat`.
- Player auto-mode can occasionally use a visible social signal when someone or something is nearby.
- Herbalist NPCs can now use a small signature social vocabulary: they may ask for quiet, nod to nearby characters, or point out animals.
- Living animals can now make a simple reaction to directed social signals: a startled animal may cancel what it was doing and flee to another location.
- The periodic `Світ ворухнувся` tick summary is now a local technical report and is sent only to scribe/admin players who enabled technical details, not to every player in the region.
- The lisovyk elder no longer wakes, appears or wanders into the Old Bridge region or locations with an active magical campfire.
- Added a protected web `/all` page that asks for `ADMIN_SET_SECRET` before showing the service list of players and creatures.
- Reworked the public website home page into a Ukrainian status and project overview page with `запущено`, version, shared active-character `/who` count, navigation links, `emblem-logo-01.png`, and a short description of the living-world vision and tone; the detailed world/status diagnostics moved to protected `/world` behind `ADMIN_SET_SECRET`.
- Added a temporary infinite torch stand at the closed settlement gate.
- Trimmed the public Telegram command menu to the core entries: `/start`, `/me`, `/look`, `/menu`, `/news` and `/help`.

---

## 0.11.6 - Fire, light, nearby text and scribe access - 12026-05-26

### Added

- Added timed debug campfires: repeated `/addCampfire` calls now create separate campfires, each burning for 8 in-game hours / 16 real minutes and warning when the flame is close to going out.
- Added torches as world items: a carried torch can be lit or refreshed near a campfire, and a lit torch gives local light for 5 in-game hours / 10 real minutes.
- Added seeded loose torches in several forest, dry luka and riverbank locations.
- Added seeded згаслі campfires in the forest and dry luka.
- Added `docs/systems/fire_and_light.md` documenting the current campfire and torch timing model.

### Changed

- Nearby output is less technical: ordinary location text no longer labels animals as `тварина/об’єкт`, duplicate target buttons no longer show numbering by default, visible actions are shown directly in `Поруч`, and corpses are separated into `Лежить`.
- Target lists and target buttons now include an active or last known creature action where available, so picking a creature also shows what it is doing.
- Unrecognized text input now gets a short fallback reply with `/help` / `/menu` hints and close alias suggestions instead of going silent.
- Detailed `/examine` now only hints that tracks are present and shows a `🔎 Сліди` action; `/track`, `/examine tracks` and text aliases then spend time/stamina to reveal track details.
- Detailed `/examine` movement output now uses Ukrainian age labels and third-person action wording, such as `миша (доросла особина, 148 тіків): шукає їжу` or `миша (молодняк, 29 тіків): йде на схід`.
- The main reply keyboard now puts `☰ Меню` in the former `Персонаж` slot; the character card remains available through `/me`, text aliases and the `❤️`/`⚡` status button.
- Campfire and torch light can now reveal nearby targets from the current location view; fading torches and fading campfires produce player-facing warnings.
- Expired timed campfires now remain in the місцина as `Згасле вогнище`, stop giving light/rest benefits, and can be relit with a burning torch.
- Added `/addTorch [player]` and `/addTwigs [player]`, scribe/admin commands listed in `/adminHelp` that add a torch or twigs to the current or named player's inventory for configured admin Telegram IDs.
- `/addCampfire` now accepts an optional location key, `x,y,z` coordinate, or player name; without a parameter it still creates a campfire in the current location.
- Ordinary bot startup, `/start` and `/reset` no longer restore torches directly into player inventory; torches exist in seed/reset world objects or can be added by `/addTorch`.
- Loose torches are now picked up as ground items, not gathered through `/gather`: they appear under `Лежить`, use `Підібрати`, have no chance roll or delay, and require the character not to be exhausted.
- Corpse inventory labels now include sex-aware Ukrainian names for foxes and wolves, such as `труп лиса`, `труп лисиці`, `труп вовка` and `труп вовчиці`.
- Admin/debug commands now use scribe access: configured admin Telegram IDs still work, and a hidden `/adminSet <secret>` can grant the current character the `Писар Порубіжжя` role when `ADMIN_SET_SECRET` is configured for the environment.
- The Telegram command menu keeps `/adminHelp` hidden globally, but adds `/adminhelp` back as a chat-scoped command for players who already have `Писар Порубіжжя` access; the handler still accepts both `/adminHelp` and `/adminhelp`.

---

## 0.11.5 - Ukrainian command aliases and button parity - 12026-05-26

### Added

- Added Ukrainian text/slash aliases for common player actions, including `озирнутися`, `роздивитися`, `де я`, `хто я`, `статистика`, `репліки`, `час`, `новини`, `допомога`, movement directions, gathering, rest, queue, auto, speech and target-focused actions.
- Added MUD-style text inputs for several target actions and social signals, such as `кивнути 1`, `помахати мандрівник`, `атакувати вовка`, `роздивитися труп`, `освіжити труп` and `підібрати труп`.
- Added `docs/systems/input_aliases.md` documenting the Ukrainian alias layer and the rule that Telegram buttons should have equivalent text/server commands where practical.

### Changed

- Menu buttons now have canonical command-equivalent paths: `Статистика` maps to `/stat`, `Репліки` to `/chat`, `Час` to `/time`, `Новини` to `/news`, and shared renderers are reused to avoid drift.
- Existing slash commands and buttons remain available; the new alias layer sits before the unknown-command fallback and passes through unrecognized text.
- Movement and gathering aliases now reuse the same command handlers as `/north`/`/south`/`/gather`, instead of maintaining parallel behavior.

### Documentation

- Updated release notes, system docs and planning notes for command/button parity and future shared command registry work.

---

## 0.11.4 - Social signals, chat menu and planning refresh - 12026-05-26

### Added

- Added MVP **Сигнали** for target-focused social gestures: `Усміхнутися`, `Засміятися`, `Кивнути`, `Вклонитися`, `Вказати`, `Насупитися`, `Зітхнути` and `Помахати`.
- Added contextual target buttons and a full `Ще сигнали` menu after focusing on a visible player, NPC or creature.
- Added separate social-signal messages for the actor, the target player and other observers in the same location.
- Added `docs/systems/social-signals.md` with the MVP social signals model and future direction.
- Added `💬 Репліки` to the `Меню` keyboard, opening the existing `/chat` log.
- Added backlog planning for `/reply`, quick reply buttons and custom addressed replies.

### Changed

- `/adminHelp` now uses a single canonical handler again, avoiding drift between admin command lists.
- `/adminHelp` and admin-command docs now include `/stat`, `/chat` and `/addCampfire`.
- `docs/planning/next.md` now reflects the current `next` planning lane: biome resources, day/night, campfires/light and early respawn.

---

## 0.11.3 - Chat polish, campfire debug and panic reaction - 12026-05-26

### Added

- Added `/addCampfire`, an admin/debug command that creates or reactivates a normal non-magical campfire feature in the current location.
- World update announcements now include an `Архів новин` inline button that opens the paginated news archive.

### Changed

- Deadly attacks by players or predators now trigger an immediate local panic response: nearby herbivores may interrupt their current actions and flee through an exit with high-priority movement, while the existing recent-attack danger still lingers for follow-up ticks.
- New `/chat` speech events now store the speaker name in the event title instead of generic `Player said` / `Creature said` labels.
- `/chat` now includes greeting/addressed speech events, with new entries storing the speaker, target and quote text instead of technical target ids.
- The main reply keyboard now keeps `Персонаж` as a plain navigation button and shows `❤️`/`⚡` life and stamina state as a separate button below `Меню`.

### Documentation

- Added agent/workflow notes that release and update dates should use the local project date with the Holocene calendar year.
- Added backlog planning for speech range and privacy modes such as whispering, shouting and wider announcement-like speech.

---

## 0.11.2 - Player action responsiveness, chat log and UI terminology - 12026-05-26

### Added

- Added `/chat` for admins with paginated recent speech, plus `/chat` and `/chat.json` pages on the status server.
- Added fresh movement tracks to detailed `/examine` output so close inspection shows who recently passed through the місцина.
- Added a dynamic character button that shows qualitative `Життя` and `Снага` state at a glance.

### Changed

- Player action processing now stays responsive even when the creature queue has a large backlog; creature queue work is handled separately from player completions.
- Ordinary `/say` and NPC speech now render spoken text as Telegram quote blocks.
- Killing an animal now immediately shows the corpse action buttons, including pickup and freshening when available.
- Player-facing health and stamina text in touched surfaces now prefers `Життя` and `Снага` over `HP` and technical endurance wording.
- Corpse inventory labels now use Ukrainian genitive forms such as `труп зайця`, with sex-aware forms for rabbits where known.

### Fixed

- Clearing or cancelling the action queue refreshes the main keyboard after the queue becomes empty.
- Legacy corpse item keys now display with a readable Ukrainian fallback instead of raw species names.

### Documentation

- Added planning notes for visible local pickup/gather feedback, interactive map features, localization, vegetation recovery and deeper predator/resource ecology.

---

## 0.11.1 - Creature queue throughput - 12026-05-26

### Changed

- Creature action completion now processes a larger due batch with bounded concurrency so animal backlogs clear faster.
- Routine animal movement/gathering no longer writes a world event for every completed creature action.
- Location target buttons are now paginated and duplicate creature labels are numbered, so crowded places no longer produce huge Telegram keyboards.
- Corpse target cards now offer `Підібрати`; picked-up corpses appear in `Речі` and keep decaying until the world removes them.
- Greeting/social output now uses separate actor, target and observer messages, with spoken text formatted as a quote block.
- Render deployment docs now list the creature action batch/concurrency tuning knobs.

---

## 0.11.0 - Terminology, rest flow and project vision - 12026-05-26

### Added

- Added `docs/design/terminology.md` as the canonical Ukrainian terminology source for player-facing UI, gameplay copy and future docs.
- Added `/restAdmin`, an admin command that immediately restores player stamina to an elevated admin rest cap.
- Added a configurable admin/magical-rest stamina cap multiplier, with a backlog note for future moon phase, holiday or event-based variation.
- Added a rest action button to the action queue, character view and campfire interactions.
- Added a new 0.11.0 release note document.

### Changed

- The Telegram command menu now presents `/look` as `Озирнутися` and `/examine` as `Роздивитися`; `/location` and `/loc` remain available as legacy aliases for `/look`.
- The side menu and docs now prefer `Поточна місцина` and `Місцина` over direct `локація` calques.
- Player-facing stamina and inventory text in touched UI surfaces now prefers `Снага` and `Речі`.
- The main reply keyboard is leaner: `Відпочити` moved out of the always-visible keyboard and into contextual places.
- The action queue screen shows controls only while there is an active queue or rest state.
- Vision, roadmap, setup and design docs were refreshed around the current Chornolis Marches direction.

### Fixed

- When the last long queued player action finishes and no new action starts, the bot now redraws the main reply keyboard.
- The rest UI no longer advertises bed iconography for the basic `Відпочити` action.
- Help and admin command lists now point to `/look` / `Озирнутися`, `/examine` / `Роздивитися` and updated terminology.

---

## 0.10.13 - Action queue diagnostics and latency cleanup - 12026-05-26

### Added

- Added action queue diagnostics to `/world`: queued/running player actions, queued/running creature actions, overdue running actions and oldest queue delay.
- Added the same action queue diagnostics to the HTTP status page and `/health` JSON.

### Changed

- `/tickGet` now formats `100ms` quick actions as `0,1 с` instead of rounding them up to `1 с`.
- Player queue completion and queued-action startup now run ahead of creature backlog in the action loop.
- Reduced the completed-creature batch per action-loop pass from 500 to 100 so animal backlogs cannot monopolize the loop as long.
- World ticks now preload active creature action IDs once instead of running one active-action count per living creature.

### Fixed

- Quick action timing text now matches the actual `100ms` player quick-action duration.

---

## 0.10.12 - Seed typecheck and deploy announcements - 12026-05-26

### Fixed

- Removed the remaining duplicated starter-animal declarations from `prisma/seed.ts` and `src/services/worldReset.ts`; both now use `src/data/starterAnimals.ts`.
- Added a seed TypeScript check to `npm test` so `prisma/seed.ts` import/type errors are caught without running the database seed.
- Deploy announcements now suppress older version messages when a same-or-newer `DEPLOY:x.y.z` world event already exists.
- Added a deployment checklist that documents when a migration is needed, when seed should run and the manual deploy order.
- Renamed the visible gatherable `herbs` resource to `лікарські трави` while keeping the stable `herbs` key and command alias.

---

## 0.10.11 - Starter predators and predator ecology - 12026-05-26

### Added

- Added starter foxes and wolves to seed and `/reset`.
- Added conservative predator reproduction after small-herbivore ecology and before ordinary carnivore ticks.
- Added fox/wolf birth counters and prey-unit counters to `/stat` and `/stat.json`.

### Changed

- Renamed the small herbivore ecology processor away from the rabbit-only name.
- `/tickGet` now documents foxes, wolves, pregnancy-state limitations and prey units.

### Documentation

- Updated ecology docs for starter predators and predator reproduction.

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

### Documentation

- Updated ecology docs with predator-stat notes.
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
- Updated ecology docs for animal pressure and recent-attack danger.

---

## 0.10.8 - Timing and action queue fixes - 12026-05-25

### Fixed

- Made the action queue loop run immediately on start/restart and read the current runtime poll interval, preventing completed movement actions from sitting in `RUNNING` until another restart.
- Prioritized player due/queued actions ahead of creature backlog so animal/NPC activity cannot make player movement feel stuck.
- Removed the extra list dash before visible location features such as `Винищена трава`.
- Added spaces between compact exit labels so `Зх Сх` does not render as `ЗхСх`.

### Changed

- Changed rest stamina recovery from one large +42 jump every 40 ticks to +1 every 4 ticks, while passive stamina remains +1 every 40 ticks.
- Reduced tired/non-quick action durations by lowering `ACTION_BASE_TICKS` from 9 to 3, and clarified `/tickGet` that those action durations apply during fatigue or to creatures without quick mode.
- Reduced quick player action duration to 0.1s and action queue polling to 0.1s so quick actions complete promptly.
- Decoupled attack duration from stamina cost: tired/non-quick attacks now take 2x movement time while still costing more stamina.

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

- Retuned herbivore reproduction: rabbits check every 120 world ticks with 5-10 offspring per litter; mice check every 20 world ticks with 5-10 offspring per litter and earlier maturity.
- Slowed normal gatherable-resource regeneration and made exhausted vegetation recover much more slowly.
- Kept grass off bridge spans while leaving under-bridge riverbank vegetation enabled.

### Documentation

- Updated admin command docs.

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

### Documentation

- Updated deployment docs with the 0.10.4 stats notes.

---

## 0.10.3 - Rabbit pacing and spread - 12026-05-25

### Changed

- Slowed rabbit reproduction checks from every 3 world ticks to every 40 world ticks by default.
- Extended rabbit growth: offspring now become adults after 240 world ticks by default.
- Extended rabbit adult lifespan and reduced old-age death pressure.
- Added direct overcrowding spread: excess non-child rabbits can move into neighboring cells every 20 world ticks.
- Added `rabbitsSpread` to world tick summaries and public tick reports.

### Documentation

- Updated ecology docs and ECO-001 notes with the slower pacing and overcrowding spread behavior.

---

## 0.10.2 - Paginated long Telegram outputs - 12026-05-25

### Added

- Added inline pagination for `/all` and `/all dead`.
- Added inline pagination for `/locationAll`.
- Added a browsable `/news` archive: the latest entry is shown in full, version buttons open full historical entries and the archive list can be paged deeper into history.

### Changed

- Replaced manual 3500-character chunking in long admin outputs with page builders and `Next` / `Back` callbacks.
- Kept page sizes below Telegram's 4096-character message limit with a 3300-character target.

---

## 0.10.1 - Rabbit litter tuning - 12026-05-25

### Changed

- Changed successful rabbit reproduction from 1-2 offspring to configurable litters of 5-10 offspring.
- Added `WORLD_RABBIT_MIN_LITTER_SIZE` and `WORLD_RABBIT_MAX_LITTER_SIZE` tuning knobs.

### Documentation

- Updated ecology docs and ECO-001 notes with the 5-10 litter size.
- Added a future Icebox note for opportunistic rabbit consumption of small bird prey or carrion after birds, carcasses and deeper attack systems exist.

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

### Documentation

- Updated ecology and planning docs after implementing the first ECO-001 slice.

---

## 0.9.12 - Action completion refactor - 12026-05-25

### Changed

- Split action completion handlers into `src/services/actionCompletions.ts`.
- Reduced `src/services/actionQueue.ts` to loop wiring and public re-exports.
- Kept existing handler and world tick imports compatible through `src/services/actionQueue.ts`.

### Documentation

- Updated `docs/planning/next.md` after completing the action queue completion-handler split.

---

## 0.9.11 - Action lifecycle refactor - 12026-05-25

### Changed

- Split action queue lifecycle into `src/services/actionLifecycle.ts`: enqueueing, immediate-vs-queued player actions, rest start/stop, queue controls and queued action startup.
- Kept the existing public imports from `src/services/actionQueue.ts` through re-exports.
- Reduced `src/services/actionQueue.ts` to the action completion handlers and loop wiring.

### Documentation

- Updated `docs/planning/next.md` so the remaining action queue refactor item only covers completion handler modules.

---

## 0.9.10 - Planning export CI validation - 12026-05-25

### Changed

- Added CI validation for planning exports: `npm run planning:export` now runs in GitHub Actions and fails if generated JSON/CSV differ from committed files.

### Documentation

- Updated `docs/planning/next.md` after completing planning export CI validation.

---

## 0.9.9 - Planning export script - 12026-05-25

### Added

- Added `scripts/planning/export-planning.mjs` to generate planning exports from Markdown item front matter.
- Added `npm run planning:export`.

### Changed

- Regenerated `docs/planning/exports/items.json` and `docs/planning/exports/issues.csv` from all planning item files.

### Documentation

- Updated planning docs to describe the export command.
- Updated `docs/planning/next.md` after completing the local planning export workflow.

---

## 0.9.8 - Action recovery refactor - 12026-05-24

### Changed

- Split stamina spending, exhaustion messages and passive/rest recovery into `src/services/actionRecovery.ts`.
- Reduced `src/services/actionQueue.ts` further by moving recovery logic out of the queue runner.

### Documentation

- Updated `docs/planning/next.md` to remove stamina/rest recovery from the remaining action queue refactor TODO.

---

## 0.9.7 - Action queue refactoring and terminology cleanup - 12026-05-24

### Changed

- Split action queue rules and display text into `src/services/actionRules.ts`, keeping duration, priority, stamina cost and queued action titles outside the main queue runner.
- Split player queue and rest status rendering into `src/services/actionQueueView.ts`.
- Kept the existing public imports from `src/services/actionQueue.ts` through re-exports, so handlers and world tick code do not need broad import churn.
- Updated help and admin/debug command text to use `Озирнутися`, `Роздивитися` and `місцина` terminology consistently.

### Documentation

- Updated `docs/planning/next.md` after completing the queued-action terminology cleanup and the first queue rendering/rules split.

---

## 0.9.6 - Refactoring - 12026-05-24

### Changed

- Refactored shared target resolution into `src/services/targets.ts`, so social target actions and queued action completions use the same inspect/interaction model.
- Refactored shared player text formatting into `src/utils/playerText.ts`, removing duplicated player stats and fatigue formatting from handlers and action queue code.

### Documentation

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

- Added a lightweight Chornolis calendar service with the current world year line: `587 літо після Великого Відступу — рік Сича під Тихим Вітром.`
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
