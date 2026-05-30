---
id: FOOD-003
title: Freshened corpse remains
status: backlog
type: feature
area: survival
priority: medium
estimate: 2-4h
tags:
  - food
  - corpses
  - remains
  - hunting
  - dropoff
depends_on:
  - FOOD-001
---

# FOOD-003: Freshened Corpse Remains

## Goal

Replace the current first-pass behavior where a corpse is hidden after freshening with real visible remains that belong to the world.

The 0.13.x bridge hides the original corpse after meat is taken so player-facing lists do not expose internal markers such as `freshened_by_player`. That is acceptable for the first food loop, but it makes the aftermath too abrupt and removes useful physical material from future hunting, scavenging and gate drop-off play.

## Player Story

As a player, after I take usable meat from a corpse, I want the place to remember that something was left behind without showing raw technical state. The remains should be inspectable, movable or usable where the world has a reason for it.

## First Scope

- Create a visible remains representation after freshening, instead of leaving a visible raw creature marker.
- Keep remains text diegetic: `рештки миші`, `рештки зайця`, or similar genitive forms.
- Remains should not offer the same freshen/butcher action again.
- Remains should have a lifetime and eventually decay or disappear.
- Decide whether remains are:
  - a transformed creature/corpse state;
  - a resource/item stack;
  - or a small dedicated world object.
- Let the gate drop-off accept suitable remains through the same contribution service as carried carcasses when appropriate.

## Non-Goals

- Full per-body anatomy.
- Detailed bones/hide/fur material economy.
- Scavenger AI.
- Disease/scent simulation.

## Design Notes

- Do not expose `freshened_by_player`, `freshened_by_hunter` or meat-yield markers in player-facing text.
- If remains are visible in target lists, they need their own action keyboard rules, not the ordinary corpse keyboard.
- This pairs with future item lifetime work and with the gate hunting loop, but should stay small enough to land as a focused survival polish slice.

## Acceptance

- Freshening a visible corpse removes the fresh corpse target and creates visible remains.
- The remains can be looked at or examined without exposing technical markers.
- The remains cannot be freshened again.
- The remains decay/disappear through a clear lifetime rule.
- Relevant docs and tests cover the visibility and non-duplicate-harvest behavior.
