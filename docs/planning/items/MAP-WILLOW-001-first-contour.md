---
id: MAP-WILLOW-001
title: Willow Floodplain first contour
status: testing
type: content
area: world
priority: high
estimate: 1-2h
tags:
  - map
  - world
  - willow-floodplain
  - riverbank
  - exploration
depends_on:
  - MAP-003
---

# MAP-WILLOW-001: Willow Floodplain first contour

## Goal

Add the first reachable `Вербові Низи` / Willow Floodplain pocket as authored seed content near the current riverbank and old bridge.

This is a narrow content slice. It makes the riverbank feel deeper without adding fishing, economy, combat, settlement access, observation, new visibility rules or notification settings.

## 0.14.21 Slice

- Added the `willow_floodplain` region.
- Added twelve authored `z = 0` swamp/river/clearing locations.
- Added a small loop with two returns to known territory:
  - `riverbank_16_07` through `NORTH` into the willow entry;
  - `riverbank_13_09` through `INSIDE` into a low return edge.
- Kept `closed_east_gate` and `settlement_inner_placeholder` unchanged and unreachable through this pocket.
- Added only seed content and map/planning documentation; no features, creatures, resources or new systems in this slice.

## Acceptance

- New region exists in active split world seed data.
- New locations seed successfully and have unique names/descriptions.
- The pocket is reachable from at least one known riverbank anchor.
- Return paths exist.
- No settlement bypass exists.
- Map render completes.
- Build passes.

## Follow-Ups

- `MAP-WILLOW-002`: under-bridge and watchtower integration, if still useful after the first contour is tested.
- `MAP-WILLOW-003`: landmarks, resources and aliases for the floodplain.
- `QA-WILLOW-001`: smoke-test routes and map readability after more floodplain content lands.
