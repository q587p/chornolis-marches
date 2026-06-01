# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The current lane is `0.14.x` Night, Light and Firewood:

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
6. VIS-001-E and VIS-001-F follow-ups: continue the copy audit for feature-specific hints and hidden target lookup.
7. FIRE-001-A/C and FIRE-001-D: active light connects to visibility; carried, dropped and NPC-held light sources are covered by a matrix test.
8. HMYZ-001-A/B/C/D: audit, seed, pickup and add-to-fire polish for хмиз/firewood.
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

Observation learning remains the `0.15` line. Darkness, distance and light should affect learning later, but the visibility foundation must land first.

## Small 0.14.1 Companion Slice

- PROG-005: global chronicles start as a small public `WorldEvent` surface. The first slice records new player arrivals and падальний рів start/stop state changes through `/chronicles`; personal літопис and skill milestones remain separate follow-up work.
- ONB-001-H: keep a small hidden tutorial-gate follow-up near the top of the onboarding queue. It should let players discover a `Закрийся` / `/close gate` style phrase and get one-time Сон praise/reward, without advertising the secret in ordinary tutorial hints.
- ONB-001 follow-up: after `0.14.10`, keep checking whether the new dream action ladder makes the completion surface clearer; future tutorial rooms should move the `Закінчити навчання` (`/tutorialEnd`) surface forward again instead of duplicating it.

## 0.15 Next

- LEARN-001: minimal learning storage decision.
- OBS-001: observe action and herbalist learning moment.
- TRACK-LEARN-001: track-reading / animal movement learning moment.
- OMEN-001: one small living-world omen.
- ONB-001 follow-up: tutorial hints that careful observation matters.
- Starter camp and dream onboarding follow-up: after the `0.14.11` shared cache slice, review whether the cache needs stronger newcomer-helper text, contribution etiquette, or anti-hoarding limits. Keep hunter route rewrites separate unless they become direct regressions.

Keep theft/hiding after the first observation MVP is stable:

- THEFT-000/THEFT-001: risky theft and incident logging are recorded as a later 0.15.x social-risk slice, not an immediate 0.14 follow-up.
- HIDE-001 and SOCIAL-003: hidden approach and theft reaction signals depend on the visibility and observation foundation, so they should not leap ahead of VIS-001/OBS-001.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- Sleep and dreams: after the `0.14.13` world-time sleep slice, review DREAM-001 and the remaining SLEEP-003 follow-ups so sleeping-body/dream-presence separation, location comfort metadata and danger interruptions do not drift away from ordinary sleep.
- Inventory item actions: the dedicated inventory view exists, and the 0.12.15 drop feedback pass makes the item-instance gap more visible. Item details, safer dropped-item pickup, dream-item origin and richer per-item actions are now small enough to promote when the survival loop needs them.
- Corpse freshening and meat: the existing corpse/freshen path, hunger and campfire inventory actions are close enough to support a first raw meat -> cooked meat -> eat loop. This has been promoted to `FOOD-001`.
- Weapons as tools: WPN-001/WPN-002 have shipped as the utility/display layer. Near-term review can look at WPN-003 seed/NPC weapon loadouts, but keep WPN-004 durability and WPN-ICE-001 deep combat cold.
- Pickup/gather command semantics: `підібрати`/`take` should mean visible ground-item pickup, while `зібрати`/`gather` should mean spending time and stamina on a local resource node. This has been promoted to `ITEM-001`.
- Queued pickup actions: after `ITEM-001`, review `ITEM-002` so large `get all` / `підняти все` piles can move from immediate pickup with stamina charge into the action queue without losing typed bulk filters.
- PERF-001: runtime performance plan and creature simulation budget. Recent production logs show `/all` and large creature counts are already visible pressure points; next performance work should keep following the recorded plan.
- ADM-001: admin permissions, name approval and restricted reset hardening. A first `Писар`/admin gate exists now, so remaining near-term work is audit logging, clearer role UX, first name-review tools and closing any leftover dangerous paths. Next small hardening slice: `ADM-001-C` for slashless `restart` confirmation parity and HTML escaping of feature fields.
- Speech and quick navigation commands: `glance`, `exits`, `enter`, `leave`, `/reply`, `whisper` and `shout` have shipped through `CMD-001`. Later work should move toward a shared command registry and per-command help without reopening this whole pack.
- Socialization / contacts / groups: the social planning pack is now split into `SOC-001` through `SOC-007`. Keep the implementation order conservative: `Знайомства`, follow intent, `Гурт` core, then group movement and UI polish; do not pull full factions, PvP law or automatic group combat forward.
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
