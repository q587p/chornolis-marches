# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The current lane is early `0.15.x` Attention, Learning and living-world stabilization. The `0.14.x` Night, Light and Firewood foundation is in testing; small ecology/safety patches may land when they protect the observation-learning line.

The completed `0.14.x` foundation sequence was:

1. Start with a tiny world-time/daypart foundation.
2. Add shared visibility helpers before changing what players can see.
3. Connect active light to visibility.
4. Protect `0.15` Attention and Learning MVP by landing time/visibility/light foundations first.

See also:

- `docs/planning/0.13-closure-and-0.14-transition.md`
- `docs/planning/0.14-observation-readiness.md`
- `docs/systems/world_time.md`
- `docs/systems/visibility.md`

## Closed 0.13.x

- QA-001: the repo-backed first-session closure audit is recorded.
- REL-001: keep release/patch work on a separate branch with a PR into `main`, including summary, validation and risk notes.
- New 0.13 blockers can still be fixed if they are real regressions, but new day/night work belongs to `0.14.x`.
- Public news now presents `0.14.x` as started. After the `0.14.1` merge, do not return to broad `0.13`-style backlog work unless it is a hotfix, deploy blocker or direct first-session regression.
- Older onboarding/core-loop follow-ups should stay recorded but deferred behind the 0.14 foundations: tutorial polish (`ONB-001-B` through `ONB-001-H`), prepared-name copy/forms review (`ONB-002-*`), starter prose polish (`LOOP-001-*`), gate-hunting/NPC practice loops and weapon expansion are not immediate `0.14.2` candidates.
- Prepared-name structural tests are useful, but manual form review remains a later content QA pass, not a reason to reopen the closed `0.13.x` lane.

## Start 0.14.x

Implement `0.14.x` in small slices:

1. WORLD-001-A/B/C/D: internal world-clock model, persistent state, heartbeat advancement and `/time` reading stored/derived Chornolis world state. The `0.14.1` slice covers this foundation and keeps elapsed real milliseconds only as a rate; it must not bind Chornolis day/night to real-world time of day.
2. WORLD-001-E/F: `0.14.3` adds the weather MVP display/state and the shared light snapshot helper. Keep this as a foundation slice, not a full darkness behavior change.
3. WORLD-001-G: `0.14.4` adds time/weather debug and scribe/admin safety for testing daypart, moon and weather state.
4. VIS-001-A: `0.14.4` adds the shared visibility service skeleton and wires brief `/look` through it.
5. VIS-001-B/C/D/F: `0.14.5` makes darkness reduce location descriptions, nearby beings/buttons, ground objects/resources and track details with atmospheric copy.
6. VIS-001-F follow-up: continue the copy audit for feature-specific hints and hidden target lookup. VIS-001-E ground-object visibility is in testing after the 0.14.23 reconciliation pass.
7. FIRE-001 follow-up: active light, carried torch visibility and the light-source matrix are in testing after the 0.14.23 reconciliation pass; deeper fire/light work should now be item-instance or NPC-held inventory focused.
8. HMYZ-001-F: keep deeper persisted/queued хмиз work in backlog. HMYZ-001-A/B/C/D/E are in testing after the 0.14.23 reconciliation pass.
9. MAP-002-A/B/C: first biome-aware foraging table and text variants.
10. ONB-004 / ONB-001-B / ONB-001-C / CAMP-001: `0.14.8` adds first-night guidance, first look/examine tutorial hints and starter-camp clarity after darkness starts hiding details.
11. CAMP-002: `0.14.9` adds the real starter-camp watchtower, vertical `UP`/`DOWN` movement and moves the beginner torch source above the camp; `0.14.10` makes that watchtower stand the hunter resupply source and downgrades the old gate source as a non-primary/emergency stand.
12. ONB-006: `0.14.10` adds the optional dream action ladder for `Озирнутися`, `Роздивитися`, signs and traces, and moves the tutorial completion surface forward to the new waking edge.
13. CAMP-003: `0.14.11` adds a shared beginner cache at the starter watchtower, a narrow take/contribute loop for simple supplies and hidden unobserved restock as a first maintained-camp slice.
14. SLEEP-001 and SLEEP-002: `0.14.12` adds lying posture and ordinary sleep while keeping tutorial sleep explicit.
15. SLEEP-003: `0.14.13` connects ordinary sleep to the internal world clock for a first auto-wake slice and lets active campfires improve sleep recovery.
16. WPN-001 and WPN-002: `0.14.14` adds the minimal weapon/equipped-tool foundation, starter knife grant, inventory equip controls, weapon-aware target text, attack copy and sharp-tool requirement for freshening.
17. ECO-001/ECO-004: `0.14.15` and `0.14.16` stabilize the starter ecology opening: prey breeding clusters get room and food, no-pair prey restoration prevents quiet dead-ends, and hungry predators can scavenge safe unclaimed herbivore corpses before attacking live prey. `0.14.17` adds scribe/admin restoration counters so repeated population-floor intervention can be tuned from `/stat`.
18. PERF-001: `0.14.18` adds the first creature simulation budget so large background animal populations cannot all enqueue individual behavior on every world tick; scribe/admin stats now expose processed/deferred creature counts for tuning.
19. CAMP-002/CAMP-003 follow-up: `0.14.19` caps repeated starter torch-source taking, keeps the first-night light safety rail, and records the remaining shared-supply, Herald, sleep and ecology watchpoints before the next feature slice.
20. DAYNOTICE-001: `0.14.20` adds player-level daypart notice settings so routine dawn/day/dusk/night nudges can be disabled without muting urgent gameplay messages.
21. MAP-WILLOW-001: `0.14.21` adds the first reachable Willow Floodplain contour as seed-only map content while leaving notification settings, settlement gates and observation systems untouched.
22. MAP-WILLOW-003 / QA-WILLOW-001: `0.14.22` adds inspectable Willow Floodplain landmarks, modest swamp resource defaults, feature aliases and route/content smoke validation without adding fishing, observation progression or settlement access.
23. SLEEP-002-A / ADM-001-C / planning reconciliation: `0.14.23` is the reconciliation and safety slice after `0.14.22`, adding the ordinary sleep command gate, restart confirmation parity and refreshed status for shipped world-time, visibility, fire/light and хмиз slices.
24. WORLD-003: make the next survival/time pass move player hunger, torch lifetimes, campfire burn/ash cleanup, corpse/meat decay and similar temporary states toward internal world-time hours/days instead of scattered real-minute or per-action timers.
25. OWL-001: `0.15.0` adds the first nocturnal owl ecology slice as a mouse-pressure stabilizer before the observation-learning MVP. Keep it minimal: no flight, nests, eggs, ranged hunting or owl reproduction until later.

Observation learning remains the main `0.15` line. Darkness, distance and light should affect learning later, but small ecology stabilizers can land first when they reduce immediate world-pressure problems.

## Small 0.14.1 Companion Slice

- PROG-005: global chronicles start as a small public `WorldEvent` surface. The first slice records new player arrivals and падальний рів start/stop state changes through `/chronicles`; personal літопис and skill milestones remain separate follow-up work.
- ONB-001-H: keep a small hidden tutorial-gate follow-up near the top of the onboarding queue. It should let players discover a `Закрийся` / `/close gate` style phrase and get one-time Сон praise/reward, without advertising the secret in ordinary tutorial hints.
- ONB-001 follow-up: after `0.14.10`, keep checking whether the new dream action ladder makes the completion surface clearer; future tutorial rooms should move the `Закінчити навчання` (`/tutorialEnd`) surface forward again instead of duplicating it.

## 0.15 Next

- OWL-001: first nocturnal owl ecology slice is in testing after `0.15.0`.
- OWL-002: `0.15.2` tunes starter owl coverage, adds quiet local owl signs and exposes predator performance by species for post-deploy owl balance checks.
- STAT-001: `0.15.4` adds the same owl/fox/wolf predator-by-species comparison to the full web `/stat` HTML page that Telegram `/stat` and `/stat.json` already expose.
- CAT-001: `0.15.3` adds the camp spirit cat foundation as a visible, inspectable, non-speaking camp-bound spirit. It is intentionally not a pet/companion system and does not yet hunt, steal meat or accept gifts.
- CAT-002: `0.15.4` keeps the camp spirit cat inside the starter camp/watchtower pair during ordinary world ticks and corrects it back to camp if it somehow leaves.
- GIVE-001: generic `give` should land before CAT-004/CAT-005 feeding UI, so `Дати сире м'ясо` becomes a reusable item-transfer path instead of a cat-only social action.
- CAT-003: `0.15.11` adds the first pre-hunt camp-local mouse priority, so local mice make the cat watch before ordinary up/down movement. `0.15.12` adds the first same-location camp/watchtower mouse pounce through the existing attack queue with cat-specific copy, while still keeping pursuit outside camp, non-mouse prey and ordinary predator status out of scope.
- CAT-006/CAT-007: `0.15.12` also adds representative full-examination body-language details for local mice, daypart/fire and the watchtower, plus focused camp-cat assertions. Weather-specific reactions, feed/shoo tests and longer simulation tuning remain future work.
- CAT-009: `0.15.6` adds the first quiet camp-cat watch-posture helper without proactive spam, exact danger detection, hunting or pet behavior.
- OWL-003: `0.15.6` adds a narrow starter-camp/watchtower owl boundary so nocturnal mouse pressure stays useful near camp edges without making the camp/watchtower pair feel like an immediate predator trap.
- CAT-010: `0.15.11` adds quiet Кіт-бережник presence copy to the starter shared-cache inspection when the cat is nearby, without turning the cat into a pet, loot source or exact danger detector.
- SOC-008: `0.15.5` adds nearby speech ranges with `/yell` / `гукнути`, reaching the current location plus visible adjacent exits while keeping `/shout` region-wide.
- NOTIF-001: `0.15.9` adds short coalescing for visible non-player movement notifications so camp spirits/NPCs do not produce repeated arrival/departure messages during quick vertical moves; `0.15.10` adds safe target buttons only for still-present living, visible, non-animal creatures at flush time.
- ANIMAL-001: `0.15.9` adds the first directed-speech reaction slice for animals; `0.15.10` adds the first repeated-wolf-speech local danger escalation. Keep richer context-sensitive behavior and direct predator-vs-player damage for later combat work.
- ONB-007: after the nearby speech slice, add the dream-tree tutorial scene that teaches vertical movement and calling up/down without turning it into region shouting.
- OBS-PREP-001: before the first observation MVP, audit older beings, objects, features and locations where `look` and `examine` still produce the same text; full examination should reward greater attention with distinct detail or a documented no-action exception.
- LEARN-001: minimal learning storage decision.
- OBS-001: observe action and herbalist learning moment.
- SOC-002: follow intent MVP, so a player can `Слідувати` / `/follow` a visible being before full `Гурт` movement exists.
- TRACK-LEARN-001: track-reading / animal movement learning moment.
- NPC-007: substantially larger hunter and herbalist/знахар line banks are in testing after `0.15.1`; tune tone and variety after live observation before moving to deeper profession behavior.
- PROG-006: backfill older registration chronicles from `Player.createdAt`, add local arrival visibility and a scribe/admin real-time audit view for registration-like events.
- OMEN-001: one small living-world omen.
- ONB-001 follow-up: tutorial hints that careful observation matters.
- Starter camp and dream onboarding follow-up: after the `0.14.11` shared cache slice, review whether the cache needs stronger newcomer-helper text, contribution etiquette, or anti-hoarding limits. Keep hunter route rewrites separate unless they become direct regressions.
- SLEEP-002-A: ordinary sleep command gate is in testing after the 0.14.23 reconciliation pass. Next sleep work should focus on comfort, danger interruption and sleeping-body/dream-presence separation rather than reopening the first command gate.
- WORLD-003: hunger pacing and temporary object lifetimes should become world-time driven. The immediate 0.14.23 bridge slows action-based hunger spikes, but the durable pass needs persisted world-minute state and explicit rules for torches, campfires, corpses/remains, raw/cooked meat and other decaying ground objects.

Keep theft/hiding after the first observation MVP is stable:

- THEFT-000/THEFT-001: risky theft and incident logging are recorded as a later 0.15.x social-risk slice, not an immediate 0.14 follow-up.
- HIDE-001 and SOCIAL-003: hidden approach and theft reaction signals depend on the visibility and observation foundation, so they should not leap ahead of VIS-001/OBS-001.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- Sleep and dreams: after the `0.14.13` world-time sleep slice, review DREAM-001 and the remaining SLEEP-003 follow-ups so sleeping-body/dream-presence separation, location comfort metadata and danger interruptions do not drift away from ordinary sleep.
- Inventory item actions: the dedicated inventory view exists, and the 0.12.15 drop feedback pass makes the item-instance gap more visible. Item details, safer dropped-item pickup, dream-item origin and richer per-item actions are now small enough to promote when the survival loop needs them.
- Local low-risk loot: `LOOT-001` should be reviewed before adding much more early survival pressure. New players need small useful things to find around calmer nearby locations, including possible `шаг` coin finds, without being pushed straight into defending distant forest resource spots.
- Corpse freshening and meat: the existing corpse/freshen path, hunger and campfire inventory actions are close enough to support a first raw meat -> cooked meat -> eat loop. This has been promoted to `FOOD-001`.
- Weapons as tools: WPN-001/WPN-002 have shipped as the utility/display layer. Near-term review can look at WPN-003 seed/NPC weapon loadouts, but keep WPN-004 durability and WPN-ICE-001 deep combat cold.
- Pickup/gather command semantics: `підібрати`/`take` should mean visible ground-item pickup, while `зібрати`/`gather` should mean spending time and stamina on a local resource node. This has been promoted to `ITEM-001`.
- Queued pickup actions: after `ITEM-001`, review `ITEM-002` so large `get all` / `підняти все` piles can move from immediate pickup with stamina charge into the action queue without losing typed bulk filters.
- Herbal stamina elixir: `ALC-001` is a good small survival/crafting candidate once gathered herbs/berries need a stronger practical use than direct eating or tiny HP/stamina nudges.
- PERF-001: runtime performance plan and creature simulation budget. Recent production logs show `/all` and large creature counts are already visible pressure points; next performance work should keep following the recorded plan.
- ADM-001: admin permissions, name approval and restricted reset hardening. A first `Писар`/admin gate exists now, and `ADM-001-C` restart confirmation parity / feature HTML safety is in testing after 0.14.23. Remaining near-term work is audit logging, clearer role UX and first name-review tools.
- Speech and quick navigation commands: `glance`, `exits`, `enter`, `leave`, `/reply`, `whisper` and `shout` have shipped through `CMD-001`. Later work should move toward a shared command registry and per-command help without reopening this whole pack.
- Socialization / contacts / groups: live players arriving together makes the first social spine a near-term usability need, not just future flavor. Prioritize `SOC-001` contacts / `Знайомства`, `SOC-002` follow intent, `SOC-003` `Гурт` core, then `SOC-004` group movement and `SOC-007` Telegram UI/copy. Keep `SOC-005` group combat assist, full factions/kurins, PvP law and automatic group combat out of this push.
- Hidden presence / hidden follower spirit: the planning pack is now split into `VIS-002`, `WORLD-002-hidden-spirit` and `OMEN-002`, with `docs/systems/hidden_presence.md` as the design source. Keep it as future work until the visibility and light foundations are ready; do not implement the стежник pursuit as an immediate patch.
- Theft and hiding: the planning pack is now split into `THEFT-000`, `THEFT-001`, `HIDE-001`, `SOCIAL-003`, `THEFT-002` and `THEFT-003`, with `docs/systems/theft-and-hiding.md` as the design source. Keep it behind first observation/visibility work; it should be risky social play, not a shortcut for looting.
- Darkness creature / small coin omen: this becomes much more attractive right after WORLD-001 because it explicitly depends on darkness, light and calm observation.
- TECH-001: service boundary and duplication cleanup. Keep this mostly behavior-preserving, but make it visible during patch planning because `worldTick.ts`, `status.ts`, `actionCompletions.ts`, `statusServer.ts`, `locations.ts` and `aliases.ts` are now large enough to slow safe feature work.
- WEB-002: independent status site and deploy visibility. The current game-hosted status pages can report runtime state once the app is up, but a separate out-of-band page should survive failed builds/deploys and explain how to contact someone when the game service itself is unavailable.
- LANG-001: lexicon and agreement audit for recurring Ukrainian gameplay text, especially resource/corpse/inventory summaries that still use local display maps instead of grammar-aware helpers.
- Gate hunting loop: 0.13.7 adds the notice, падальний рів, narrow `put` flow and player contribution accounting. `NAV-001`, the 0.13.9 NPC drop-off helper, the 0.13.10 hunter route plan and the 0.13.11 first hunter state-machine slice now exist, so the next small slice should focus on `NPC-004` real NPC-held torch/light state, `ECO-003` enough-for-now saturation, and better hunter route tuning rather than a second hidden counter.

## Review Checklist

Before moving an item here, ask:

1. Does it support the active vertical slice?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
5. Does it have text/alias parity if player-facing?
