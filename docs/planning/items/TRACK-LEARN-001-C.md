---
id: TRACK-LEARN-001-C
title: Learning respects visibility and light
status: testing
type: feature
area: learning
priority: high
estimate: 1h
tags:
  - learning
  - visibility
  - light
depends_on:
  - TRACK-LEARN-001-B
  - VIS-001-D
---

# TRACK-LEARN-001-C: Learning respects visibility and light

## Goal

Make poor visibility reduce or block learning.

## First Scope

- Check shared visibility helper before granting observation/track learning.
- Use gentle refusal or reduced chance.

## Acceptance

- Observation learning is affected by darkness.
- Light can make learning possible.

## Implementation Order

Do after: `TRACK-LEARN-001-B`, `VIS-001-D`.

## 0.16.34 Testing Note

- Added a shared visibility helper for learning from visible observations.
- `/track` practice no longer records learning progress when tracks cannot be read in darkness.
- Existing rabbit movement observation and local look/inspect observation-learning paths now require visible nearby detail; local light makes those paths possible again.
- Full `TRACK-LEARN-001` / following-skill behavior remains future work.
