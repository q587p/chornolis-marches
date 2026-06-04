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

Do not open another broad content loop before the learning/observation foundation is used by real attention moments. Honey/wax uses, shops, barter, economy, theft, bear behavior, deep crafting and new profession loops should stay behind the attention-learning spine.

## Immediate Sequence

1. **TRACK-LEARN-002:** review live route-memory cadence after the `0.15.31` cooldown pass and decide whether the next slice should teach explicit track reading, not movement.
2. **LEARN-002 follow-up:** extend bounded skill effects only after reviewing the `0.15.23` gathering tuning, `0.15.26` herbalist observation route and `0.15.30` followed-movement memory in live play.
3. **SOC-003:** only after follow intent feels useful, decide whether any explicit group/travel acceptance layer is worth promoting.

Near-term content candidates after that foundation:

- `FISH-002`: riverbank fisher tiny slice.
- `RAVEN-001`: dream-raven presence near the carrion ravine.

## Deferred From Next

- `APIARY-004`: bear honey loop scaffold.
- Honey/wax food, remedy, offering, crafting, shop, barter and economy uses.
- Broader theft/hiding or social-risk systems before observation/visibility learning is stable.
- Full profession/economy loops before the first observation-learning spine exists.
- Broad `/skills` UI and skill modifiers/effects before bounded learning moments prove the foundation.

## Promotion Checklist

Before moving an item into `next`, ask:

1. Does it support Attention and Learning?
2. Can it be implemented and tested independently?
3. Does it preserve incomplete information and atmosphere?
4. Does it avoid becoming a new broad loop?
5. Does it have text/alias parity if player-facing?
