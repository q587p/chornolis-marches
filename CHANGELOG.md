# Changelog

All notable changes to this project will be documented in this file.
The format is loosely based on Keep a Changelog and this project follows semantic-ish versioning.

---

## [Unreleased]

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
