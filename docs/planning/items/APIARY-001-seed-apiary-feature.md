---
id: APIARY-001
title: Seed old log apiary feature
status: in_progress
type: feature
area: ecology
priority: medium
tags:
  - apiary
  - bumblebee
  - world-seed
  - feature
---

# APIARY-001 — Seed Old Log Apiary Feature

## Summary

Add the first old log apiary / бортя as a visible, inspectable dry-meadow feature. It should be a place first, not a reward chest.

## Scope

- Add `meadow_old_log_apiary_12_02` in `meadow_12_02`.
- Use `LANDMARK` and JSON metadata, not a new enum.
- Add aliases for Ukrainian feature lookup.
- Add an `examine_summary` so brief and full inspection do not collapse into the same bare line.
- Add seed smoke assertions.

## 0.15.19 Slice

0.15.19 adds the feature and apiary metadata, including future hooks for honey, wax and bear behavior.

## Acceptance Criteria

- The feature exists in the intended location.
- The feature is inspectable through existing location-feature inspection.
- The feature has `data.apiary === true`, a one-step aura and bumblebee hazard metadata.
- Seed tests verify the location, type, aliases and core metadata.

## Suggested Validation

- `node scripts/test/world-seed.mjs`
- `npm run test:seed`
- `npm test`
