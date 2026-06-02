---
id: ECO-009
title: Seasonal ecology and environment variation
status: backlog
type: system
area: ecology
priority: low
tags:
  - ecology
  - seasons
  - calendar
  - resources
  - animals
  - atmosphere
depends_on:
  - CAL-001
  - WORLD-001-E
---

# ECO-009 — Seasonal Ecology and Environment Variation

## Goal

Let the current season and lunar circle gradually affect the living world: local descriptions, resources, animal behavior, travel mood and village work rhythms.

This should grow out of the existing world-time/weather/calendar foundation. It should not become a full simulation before the core ecology, resource, weather and calendar systems are stable.

## Direction

Seasonal variation can eventually affect:

- resource availability and regeneration: herbs, berries, mushrooms, grass, honey, fish, twigs, dry fuel;
- animal reproduction and movement: quieter cold circles, stronger spring/summer breeding pressure, autumn foraging and winter scarcity;
- local `look` / `examine` atmosphere: wet thaw, green abundance, dry heat, yellow leaves, frost, long nights;
- settlement and camp signs: repairs, drying herbs, storing food, checking bridges, counting who has not returned;
- weather weighting and wet/dry ground behavior;
- future omens, rumors, rituals and learning hints tied to seasonal work.

## Tone Note

Use diegetic text like the starter calendar/work-sign copy:

> In cold circles people keep warmth, repair roofs and listen for the forest. In thawing circles they clean paths, gather twigs, dry herbs and check crossings. In green and hot circles they mow, fish, mend nets, store honey and learn not to waste stamina. In harvest, heather and yellow-leaf circles they count supplies, repair weapons and do not boast before darkness.

The player should feel the year through what the world does, not through a raw seasonal stat table.

## Out of Scope for First Slice

- Exact crop calendar simulation.
- Full regional climate model.
- External real-world weather or dates.
- Complex per-species seasonal AI.
- Hard seasonal lockouts that can strand beginner-critical resources.

## Acceptance Direction

- `/time` or local signs can name the broad seasonal feel without exposing debug numbers.
- At least one calm visible resource family varies by season in a small, tested way.
- At least one animal behavior/reproduction parameter can read a season helper without duplicating calendar math.
- Location text can opt into seasonal variants without raw HTML in seed JSON.
- Beginner-critical resources keep safety floors or fallback sources.
