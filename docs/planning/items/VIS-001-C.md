---
id: VIS-001-C
title: Nearby beings visibility in darkness
status: testing
type: feature
area: visibility
priority: high
estimate: 1-2h
tags:
  - visibility
  - targets
  - night
depends_on:
  - VIS-001-B
---

# VIS-001-C: Nearby beings visibility in darkness

## Goal

Hide or reduce nearby beings in darkness.

## First Scope

- Use visibility helper in target/nearby rendering.
- Show vague presence if useful.
- Reveal details with light.

## Acceptance

- Names/details are not fully visible in darkness.
- Interactions do not crash when target hidden.

## Implementation Order

Do after: `VIS-001-B`.

## 0.14.5 Slice

- Brief and detailed location rendering now gate nearby target names/buttons through the shared visibility helper.
- In dim/dark views without light, players get vague nearby-presence copy rather than full names or target buttons.
- Local light or clear enough daylight restores normal nearby details.
