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

## Closed 0.13.x

- QA-001: the repo-backed first-session closure audit is recorded.
- REL-001: keep release/patch work on a separate branch with a PR into `main`, including summary, validation and risk notes.
- New 0.13 blockers can still be fixed if they are real regressions, but new day/night work belongs to `0.14.x`.

## Start 0.14.x

Implement `0.14.x` in small slices:

1. WORLD-001-A/B/C: internal world-clock model, persistent state and heartbeat advancement. This uses elapsed real milliseconds only as a rate; it must not bind Chornolis day/night to real-world time of day.
2. WORLD-001-D: `/time` reads stored/derived Chornolis world state: year, lunar circle, day, clock, daypart, moon phase and weather summary.
3. WORLD-001-E: weather MVP state, `/weather` alias/display and non-spammy world event when weather changes.
4. WORLD-001-F: shared light snapshot helper combining daypart, moon illumination, weather and active local light sources.
5. WORLD-001-G: time/weather debug and scribe/admin safety for testing daypart, moon and weather state.
6. VIS-001-A: shared visibility service skeleton consumes the light snapshot helper.
7. VIS-001-B/C/D/E: darkness affects location detail, nearby beings, tracks and ground objects.
8. VIS-001-F: darkness copy audit, so hidden/reduced details sound atmospheric rather than technical.
9. FIRE-001-A/C and FIRE-001-D: active light connects to visibility; carried, dropped and NPC-held light sources are covered by a matrix test.
10. HMYZ-001-A/B/C/D: audit, seed, pickup and add-to-fire polish for хмиз/firewood.
11. MAP-002-A/B/C: first biome-aware foraging table and text variants.
12. ONB-004: first-night guidance once darkness is visible to beginners.
13. SLEEP-001 and SLEEP-002: lying posture and ordinary sleep only after time/light/visibility foundations are stable.

Observation learning remains the `0.15` line. Darkness, distance and light should affect learning later, but the visibility foundation must land first.

## 0.15 Next

- LEARN-001: minimal learning storage decision.
- OBS-001: observe action and herbalist learning moment.
- TRACK-LEARN-001: track-reading / animal movement learning moment.
- OMEN-001: one small living-world omen.
- ONB-001 follow-up: tutorial hints that careful observation matters.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- Sleep and dreams: after SLEEP-001/SLEEP-002 land, review SLEEP-003 and DREAM-001 so world-time auto-waking and sleeping-body/dream-presence separation do not drift away from the tutorial dream work.
- Inventory item actions: the dedicated inventory view exists, and the 0.12.15 drop feedback pass makes the item-instance gap more visible. Item details, safer dropped-item pickup, dream-item origin and richer per-item actions are now small enough to promote when the survival loop needs them.
- Corpse freshening and meat: the existing corpse/freshen path, hunger and campfire inventory actions are close enough to support a first raw meat -> cooked meat -> eat loop. This has been promoted to `FOOD-001`.
- Weapons as tools: WPN-001/WPN-002 are small enough to promote because they reuse current resource inventory, target descriptions and queued `ATTACK`/`FRESHEN` actions. Keep them as a utility/display layer; do not pull WPN-004 durability or WPN-ICE-001 deep combat forward.
- Pickup/gather command semantics: `підібрати`/`take` should mean visible ground-item pickup, while `зібрати`/`gather` should mean spending time and stamina on a local resource node. This has been promoted to `ITEM-001`.
- Queued pickup actions: after `ITEM-001`, review `ITEM-002` so large `get all` / `підняти все` piles can move from immediate pickup with stamina charge into the action queue without losing typed bulk filters.
- PERF-001: runtime performance plan and creature simulation budget. Recent production logs show `/all` and large creature counts are already visible pressure points; next performance work should keep following the recorded plan.
- ADM-001: admin permissions, name approval and restricted reset hardening. A first `Писар`/admin gate exists now, so remaining near-term work is audit logging, clearer role UX, first name-review tools and closing any leftover dangerous paths. Next small hardening slice: `ADM-001-C` for slashless `restart` confirmation parity and HTML escaping of feature fields.
- Speech and quick navigation commands: `glance`, `exits`, `enter`, `leave`, `/reply`, `whisper` and `shout` have shipped through `CMD-001`. Later work should move toward a shared command registry and per-command help without reopening this whole pack.
- Socialization / contacts / groups: the social planning pack is now split into `SOC-001` through `SOC-007`. Keep the implementation order conservative: `Знайомства`, follow intent, `Гурт` core, then group movement and UI polish; do not pull full factions, PvP law or automatic group combat forward.
- Hidden presence / hidden follower spirit: the planning pack is now split into `VIS-002`, `WORLD-002-hidden-spirit` and `OMEN-002`, with `docs/systems/hidden_presence.md` as the design source. Keep it as future work until the visibility and light foundations are ready; do not implement the стежник pursuit as an immediate patch.
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
