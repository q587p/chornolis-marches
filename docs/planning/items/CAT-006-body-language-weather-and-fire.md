---
id: CAT-006
title: Body-language reactions to weather, daypart, fire and darkness
status: next
type: content
area: atmosphere
priority: low
tags:
  - cat
  - weather
  - daypart
  - fire
  - visibility
  - copy
  - ukrainian
---

# CAT-006 — Body-language weather and fire reactions

## Summary

Add nonverbal cat ambient behavior for weather, daypart, fire/light and darkness, keeping signals atmospheric rather than exact debug hints.

## Scope

- Add ambient lines for dawn/day/dusk/night.
- Add weather reactions for rain, storm, snow/cold, fog and clear night when helpers exist.
- Add fire comfort behavior near active campfire/light/embers.
- Add contextual `look` / `examine` variants for the cat so full examination can notice more than brief posture: moonlight, daypart, weather, active fire/light, recent mouse pressure and watchtower/camp position.
- Add vague darkness/danger body-language lines without revealing exact hidden targets.
- Add cooldowns so ambient lines do not spam.

## 0.15.10 Partial Slice

0.15.10 adds a small contextual full-examination layer for `Кіт-бережник`:

- full `examine` can now add a different body-language detail when local mice are present;
- night, dusk, dawn, active campfire light and watchtower position can also shape the extra full-examination line;
- brief `look` stays compact and does not expose the richer context detail.

Weather-specific reactions and cooldowned ambient proactive lines remain deferred until the weather/ambient line surfaces need them.

## Out of scope

- Exact warning system.
- Hidden-presence reveal mechanics.
- Magical detection.
- Speech/dialogue.

## Acceptance criteria

- The cat has at least one ambient behavior for each supported daypart group.
- The cat reacts to rain/storm/cold/fog if those weather states exist.
- The cat prefers warmth during cold/night/rain when a fire exists.
- Brief `look` and full `examine` remain distinct; full examination gives richer context and can vary with daypart/moon/fire/weather when those helpers are available.
- Darkness/danger copy is vague and does not reveal hidden entity names.
- Tests or lightweight assertions cover representative copy helpers where practical.

## Suggested validation

- `node scripts/test/world-time.cjs` if daypart helpers are touched.
- `node scripts/test/ambient-lines.cjs` if ambient line helpers exist.
- New `node scripts/test/camp-cat.cjs` for representative cat lines.
- `npm test`.
