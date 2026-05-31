---
id: FIRE-001-D
title: Light source matrix test
status: next
type: qa
area: survival
priority: high
estimate: 1-2h
tags:
  - fire
  - light
  - visibility
  - torch
  - campfire
  - npc
---

# FIRE-001-D: Light Source Matrix Test

## Goal

Protect the first darkness/visibility implementation from inconsistent light-source behavior.

`0.13.x` already has several light-like states. `0.14.x` should connect them through one shared visibility path.

## Matrix

Check these sources:

| Source | Should count as light? | Notes |
|---|---:|---|
| Lit campfire | Yes | Ordinary local light source. |
| Old/expired campfire | No | May have memory/omen text, but no active light. |
| Player-held lit torch | Yes | Uses torch duration. |
| Player-held doused torch | No | Can be relit later if supported. |
| Dropped lit torch | Yes | Counts until burn timer expires. |
| Dropped expired torch | No | Should be cleaned up or shown as non-light. |
| NPC-held lit torch | Yes | Should use same assumptions as player-held lit torch. |
| NPC-held unlit torch | No | Inventory/state only. |

## Scope

Add focused helper tests or manual checks proving visibility uses active light consistently.

## Out of Scope

- Full crafting.
- Torch durability beyond existing timers.
- Weather extinguishing fire.
- Shelter/comfort rules.

## Acceptance

- The visibility service can ask one shared helper whether a location has active light.
- Player-held, dropped and NPC-held lit torches behave consistently.
- Expired/doused/unlit torches do not reveal darkness-hidden details.
- Tests cover at least the main positive and negative cases.
