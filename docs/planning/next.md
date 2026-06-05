# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The active `0.15.x` lane is **Attention and Learning MVP**:

> dream -> waking edge -> location -> look/examine -> signs/traces/small finds -> stamina/rest -> day/night/light -> first safe return -> first learning by observation.

The last apiary slices are now treated as completed/in-testing content endpoints, not the center of the next sequence:

- `APIARY-001` / `APIARY-002`: `0.15.19` shipped the old log apiary and passive bumblebee hazard.
- `APIARY-003`: `0.15.20` shipped the first risky honey/beeswax harvest/raid slice.
- `APIARY-004`: bear honey behavior remains backlog/future.

The `LEARN-001` foundation is in testing after the minimal persistent learning/progress slice. Future observation and track-learning work should use `src/services/learning.ts` and `CharacterLearningProgress` instead of inventing separate storage. `0.15.22` stabilized the first attentive gathering bridge, and `0.15.23` adds a technical `0..5` level policy plus the first narrow herbs/berries/mushrooms gathering effect. This still is not a broad skill-sheet lane.

`OBS-PREP-001` has a representative look/examine audit pass in testing. Use its checklist for incremental cleanup, but do not keep expanding it before the first narrow observation moment.

`0.15.25` adds a tiny starter-adjacent waking-world cellar for map-making and verticality texture. Treat it as a completed content support slice, not a new map-expansion lane or follow-intent implementation.

`0.15.26` puts that cellar to work as a small observation bridge: a herbalist can occasionally stage through the cellar/watchtower, gather herbs/berries/mushrooms through existing actions and return to sort/rest. This is the first visible profession-route MVP, not a full profession system or follow-intent implementation.

`0.15.28` adds a rare herbalist demonstration of the cellar's hidden spoken passage. Treat it as another proof that world actions can teach attentive players, while leaving follow intent, auto-follow and route-learning storage for later slices.

`0.15.29` adds follow intent as a narrow attention marker: a player can choose one visible local being whose movement they are trying to keep in mind. This is not auto-follow, not a group system and not learning by itself; it is support infrastructure for the next observation/track-learning slice.

`0.15.30` turns that marker into the first route-memory MVP: followed visible ordinary movement can leave a personal direction hint and `/track` can prioritize the fresh trail. Darkness can still hide direction, and hidden water-word passages remain non-repeatable without independent learning/triggering.

`0.15.31` stabilizes that route-memory layer with cooldowns for repeated hints
and silent tracking-observation progress. Treat follow intent as useful
attention context now, but do not promote automatic follow movement until live
cadence and darkness/hidden-route behavior feel settled.

`0.15.32` adds the first explicit manual step from that memory: `Йти слідом`
(`/follow_step`) can submit an ordinary move only from fresh clear route memory.
This is not continuous following, not route replay and not group travel; it is a
small player-confirmed bridge between attention and movement.

`0.15.35` adds the first MAP-004 runtime proof: a tiny starter-adjacent
attention-gated waking-world pocket that needs light-aware `/examine` before it
offers a careful `Пролізти` (`/crawl`) action. Treat this as a small proof of
attention-gated access, not a broad skill-lock framework or loot location.

`0.15.37` adds the second MAP-004 proof with a different attention path:
fresh tracks or clear follow-route memory can reveal `Пройти за слідом`
(`/follow_trace`) through a tiny grass-run passage. Treat this as a track-aware
micro-place, not auto-follow, route replay or a loot/content loop.

Do not open another broad content loop before the learning/observation foundation is used by real attention moments. Honey/wax uses, shops, barter, economy, theft, bear behavior, deep crafting and new profession loops should stay behind the attention-learning spine.

## Immediate Sequence

1. **0.15.38 / LEARN-002:** freshening learning and skill tuning is in testing: canonical freshening observation progress plus a small bounded success effect, with meat yield and combat deferred.
2. **0.15.39 / LEARN-003:** cooking observation/effect parity is in testing: canonical cooking observation progress plus a small bounded success effect, with recipes, food quality and economy deferred.
3. **0.15.40 / LEARN-004:** actor learning foundation is in testing: creature learning storage, conservative observed-actor defaults and qualitative/technical learning summaries.
4. **0.15.41 / LEARN-004 follow-up:** NPC observation learning MVP is in testing: eligible local characters can learn from nearby supported non-combat gathering source events without a broad scheduler or combat effects.
5. **0.15.42 / LEARN-005:** attack practice/observation canonical learning bridge is in testing: storage only, with no attack effects and no full combat expansion.
6. **0.15.43 candidate:** stabilize actor/attack learning surfaces, review live `Навички:` noise, or move `observedActorSkillLevel(...)` defaults into a small data/config map before adding stronger skill effects.
7. **TRACK-LEARN-002:** review live route-memory, follow-step and `0.15.37` track-gated passage cadence before teaching broader explicit track reading.
8. **MAP-004 follow-up:** after the light/examine and track/follow-memory proofs, decide whether the next gated place should use minimal gathering/herbalism/tracking progress and atmospheric below-threshold refusal copy.
9. **SOC-003:** only after follow intent feels useful, decide whether any explicit group/travel acceptance layer is worth promoting.

Watch the new actor-learning surfaces before widening them: `0.15.41` proves
one NPC observation bridge, but freshening/cooking observation should remain a
focused follow-up; `observedActorSkillLevel(...)` defaults should move to a
small config map if they spread; and public target inspection should be trimmed
if `Навички:` starts feeling too much like a stat sheet in live play.

Near-term content candidates after that foundation:

- `MAP-005`: regional active curiosities for swamp, riverbank, forest and meadow, with small interactions and different consequences instead of only prose variation.
- `RET-001`: daily/weekly world tasks as optional return rhythm, not login streak punishment or a raw quest treadmill.
- `FISH-002`: riverbank fisher tiny slice.
- `RAVEN-001`: dream-raven presence near the carrion ravine.

## Deferred From Next

- `APIARY-004`: bear honey loop scaffold.
- Honey/wax food, remedy, offering, crafting, shop, barter and economy uses.
- Broader theft/hiding or social-risk systems before observation/visibility learning is stable.
- Full profession/economy loops before the first observation-learning spine exists.
- Broad `/skills` UI and skill modifiers/effects before bounded learning moments prove the foundation.
- `SURV-002`: authored death locations and lethal hazard pacing. Keep this as a survival/world-hazard framework task until death/knockout/respawn handling and clueing rules are ready; do not add unavoidable instant-death cells to beginner paths.

## Promotion Checklist

Before moving an item into `next`, ask:

1. Does it support Attention and Learning?
2. Can it be implemented and tested independently?
3. Does it preserve incomplete information and atmosphere?
4. Does it avoid becoming a new broad loop?
5. Does it have text/alias parity if player-facing?
