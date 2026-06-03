---
id: OBS-PREP-001
title: Look/examine content audit before observation MVP
status: testing
type: design
area: learning
priority: high
estimate: 2-4h
tags:
  - look
  - examine
  - observation
  - content-audit
depends_on:
  - LOOP-001-A
---

# OBS-PREP-001: Look/examine content audit before observation MVP

## Goal

Audit older creatures, objects, features, locations and other visible surfaces before the observation-learning block depends on them.

The project rule is now explicit: `look` may stay brief, but `examine` should reward greater attention with meaningfully richer text. If `look <thing>` and `examine <thing>` produce the same player-facing text, treat it as a bug or record an explicit no-action decision.

## First Scope

- Review older visible beings:
  - ordinary animals;
  - hunter/herbalist/знахар-style NPCs;
  - spirits and special presences such as camp cat / лісовик.
- Review visible objects and ground targets:
  - corpses/remains;
  - torches, twigs, food and other resource-like objects where direct inspection exists;
  - any target action view that currently reuses a terse label as full description.
- Review older location features:
  - gates, signs, boards, campfires, bridges, trees, caches, resource hints, omens;
  - feature aliases that route to a direct interaction view.
- Review location descriptions where a full `examine` should add details, constraints, interaction hints or atmospheric consequences beyond ordinary `look`.
- Mark each issue as one of:
  - quick copy fix;
  - needs system support;
  - acceptable same-text no-action decision with reason.

## Audit Checklist

- **Location features:** keep compact feature labels in `/look`; direct `/examine <feature>` should add use, constraint, local consequence or atmosphere.
- **Creatures:** brief views can show name/posture/action; full inspection should add condition, held item, behavior cue or special-presence context where available.
- **Corpses and tracks:** brief views can show presence; full inspection should add freshness, direction, age, usable action or uncertainty without raw debug values.
- **Starter camp / watchtower / beginner cache:** inspection should explain light, first-road safety and mutual supplies without turning the cache into a shop.
- **Apiary:** the old log apiary should read as a risky living place, not only a honey button.
- **Strange totems:** overview should list the object; inspection should explain suspicious construction, age/state and why dismantling may matter.
- **Campfires:** overview should stay compact; inspection should explain light, rest, fuel, fading or magical support depending on state.
- **Willow Floodplain landmarks:** inspection should reward attention to reeds, mud, roots, water and hidden routes without opening a new visibility system.
- **Tutorial dream features:** every lesson surface should make the `look` / `examine` difference legible through action consequences rather than glossary text.

## 0.15.22 Representative Pass

- Added richer `examine_summary` text for the old log apiary, starter watchtower ladder, starter torch source and shared beginner cache.
- Added short full-detail cues for tutorial hub/bush/rest/fox-motion surfaces that previously depended mostly on the long direct description.
- Strengthened Willow reed-wall and mudflat summaries so careful inspection hints at paths and fading tracks.
- Added missing seeded Strange Totem summaries so location detail views do not show only a bare suspicious object before full inspection.

Remaining cleanup should stay incremental: creatures, corpses/tracks and broader campfire/context variants can use this checklist as OBS-001 and TRACK-LEARN-001 begin consuming examination output.

## Acceptance

- A concrete audit list exists for old beings, objects, features and locations with repeated `look`/`examine` text.
- At least the most player-visible old surfaces have follow-up copy tasks or small fixes.
- Observation-learning tasks can assume that full examination has distinct content to consume.
- Any deliberate same-text exception is documented instead of accidental.

## Implementation Order

Do after: `LOOP-001-A`.

Do before: `OBS-001-A`, `TRACK-LEARN-001-B` and any broader observation-learning MVP that uses existing `look`/`examine` output as learning evidence.

## Notes

- Keep this as content/UX preparation, not a new skill system.
- Prefer small focused copy fixes when the issue is local.
- If repeated text comes from shared rendering, record the shared helper that needs a behavior split instead of patching every caller manually.
