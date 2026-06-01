---
id: OBS-PREP-001
title: Look/examine content audit before observation MVP
status: next
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
