---
id: WORLD-002
title: Campfires and light
status: next
type: feature
area: survival
priority: high
tags:
  - survival
  - light
  - crafting
  - night
depends_on:
  - WORLD-001
---

# Campfires and light

## Goal

Make fire a basic survival and exploration tool.

## Rules

- 0.11.5 first pass: debug campfires can exist multiple times in one місцина, burn on a timer, and count as local light.
- 0.11.5/0.11.6 first pass: carried torches can be lit/refreshed near campfires and count as local light while burning; torches come from seed/reset world objects or explicit admin/Писар Порубіжжя placement, not automatic player inventory grants.
- 0.11.6 follow-up: expired timed campfires remain as згаслі campfires and can be relit from a burning torch; fuel-aware relighting remains backlog.
- In forest regions, players can gather firewood.
- Firewood can be used to start a campfire or extend an existing timed campfire.
- Campfires reveal night descriptions and nearby things.
- Fire may improve rest and attract or repel creatures.
