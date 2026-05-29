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
- 0.11.6 follow-up: expired timed campfires remain as згаслі campfires and can be relit from a burning torch.
- 0.11.7/0.11.8 follow-up: light and technical details are now more carefully hidden from ordinary players, so future fire UI should keep exact timers/fuel numbers behind local technical details.
- 0.11.10 follow-up: `хмиз` can appear as a pickable ground item, live in `Речі`, and be consumed by `Додати хмиз` to extend a burning ordinary campfire or prepare a згасле one.
- Future cleanup: player/admin-created ordinary campfires should degrade after they expire instead of remaining permanent location features forever. A згасле handmade campfire can first become ashes/embers, then disappear or become a faint local trace after one or a few in-game days unless refreshed with fuel or relit.
- In forest regions, players can gather firewood.
- Firewood can be used to extend an existing timed campfire; starting a new player-made campfire remains future crafting/survival work.
- Campfires reveal night descriptions and nearby things.
- Fire may improve rest and attract or repel creatures.
