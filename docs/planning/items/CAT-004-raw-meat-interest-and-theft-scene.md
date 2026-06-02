---
id: CAT-004
title: Raw meat interest and camp-box theft scene
status: next
type: feature
area: inventory
priority: medium
tags:
  - cat
  - meat
  - camp
  - inventory
  - give
  - affordance
---

# CAT-004 — Raw meat interest and theft scene

## Summary

When no camp mice need attention, the spirit cat may notice raw meat in a camp box, on the ground, or carried by a nearby player, then start a readable scene before stealing/eating.

Feeding the cat must not be implemented as a standalone social action. The button `Дати сире м’ясо` should call the generic `give` flow from `GIVE-001`, with `/feed_raw_meat` and typo-tolerant `/feed_raw_meet` kept only as parser aliases for `give сире м’ясо коту`. Rich Ukrainian variants such as `дати м’яса коту`, `дати мясо кіт`, or `дати сирого м’яса бережнику` belong to `GIVE-002`; they are desirable, but not required for the first meat-scene slice.

## Scope

- `0.15.11` partial slice: the player-initiated feed affordance now exists through generic `give`, while autonomous meat-interest/theft scenes and cooldowns remain future work.
- Detect raw meat in supported camp containers/ground resources/player inventory.
- Prefer mice over meat.
- Start a short scene instead of instantly removing meat.
- Show nearby players response options such as `Шуганути` and `Замахати руками` when valid.
- Show `Дати сире м’ясо` only when the player has valid raw meat and the cat is a valid nearby `give` target.
- Route `Дати сире м’ясо`, `/feed_raw_meat`, and `/feed_raw_meet` through canonical `give сире м’ясо коту` behavior.
- Do not add cat-only parsing for inflected forms; use or defer to shared `GIVE-002` lexicon/grammar work.
- If ignored, remove at most 1 raw meat and queue cat `EAT`/flavor action.
- Add cooldowns for theft, recent feeding and recent shooing.

## Out of scope

- General animal theft system.
- Locked container system.
- Complex ownership/reputation.
- Full barter/economy; see `BARTER-001`.
- Cooking/carcass rewrite.

## Dependencies / sequencing

Prefer doing `GIVE-001` before this task. If CAT-004 lands first, it should include only non-feeding meat interest and leave the feed button hidden until generic `give` exists.

## Acceptance criteria

- `0.15.11` covers the player-carried raw-meat feed option and `/feed_raw_meat`/`/feed_raw_meet` alias-to-`give` routing. The remaining acceptance criteria below still describe the fuller theft/interest scene.
- The cat can start a meat-interest scene when raw meat exists and no mice are present.
- Nearby players get at least one interrupt option.
- Players with raw meat get a `give`-backed feed option.
- `/feed_raw_meat` and `/feed_raw_meet` do not create a separate action type; both resolve to `give сире м’ясо коту`.
- If ignored, the cat can take exactly one valid raw-meat unit and eat for a short time.
- Cooldowns prevent repeated immediate theft loops.
- Tests cover box meat, player-carried meat, no-mice priority and alias-to-`give` routing.

## Suggested validation

- `node scripts/test/meat.cjs` if meat helpers are touched.
- New `node scripts/test/give.cjs` or existing command parser tests for `give` aliases.
- New `node scripts/test/camp-cat.cjs` for scene/cooldown.
- `npm test`.
