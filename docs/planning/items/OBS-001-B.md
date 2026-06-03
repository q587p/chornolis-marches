---
id: OBS-001-B
title: Visible gathering action
status: testing
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - observe
  - npc
  - gathering
depends_on:
  - OBS-001-A
---

# OBS-001-B: Visible gathering action

## Goal

Create or expose one visible gathering action that can be learned from.

## First Scope

- Use existing gathering source events where present.
- Treat witnessed gathering of medicinal herbs, berries and mushrooms as the first learnable contexts.
- Herbalists / знахарі remain a natural teaching example, but they are not the only valid source.
- Keep apiary harvest, honey, beeswax, twigs, money, loot and other gather-like actions outside this first canonical learning bridge unless a later task explicitly designs them.
- Leave a deeper dedicated herbalist service/action layer to `NPC-003` if it grows beyond this first bridge.

## Acceptance

- Player can witness the action.
- Text shows what was done clearly enough to learn from.
- The first MVP can work without adding a new command.

## Implementation Order

Do after: `OBS-001-A`.

## 0.15.21 Note

`0.15.21` uses existing visible gathering source events for medicinal herbs, berries and mushrooms as the first observation source. It does not add a new herbalist behavior loop, and apiary honey/wax remains outside this bridge.
