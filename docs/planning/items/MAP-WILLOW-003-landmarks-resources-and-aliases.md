---
id: MAP-WILLOW-003
title: Willow Floodplain landmarks, resources and aliases
status: testing
type: content
area: world
priority: high
estimate: 1-2h
tags:
  - map
  - world
  - willow-floodplain
  - resources
  - aliases
depends_on:
  - MAP-WILLOW-001
---

# MAP-WILLOW-003: Willow Floodplain landmarks, resources and aliases

## Goal

Make the first Willow Floodplain pocket worth examining without adding fishing, observation progression, combat, economy or another new system.

## 0.14.22 Slice

- Added six inspectable floodplain landmarks:
  - `Густа очеретяна стіна`;
  - `Мулові сліди`;
  - `Підтоплений корінь`;
  - `Жаб’яче плесо`;
  - `Стара сіть`;
  - `Темна заводь`.
- Added Ukrainian and English aliases for those landmarks, so typed `look` / `examine` feature targeting can find them.
- Added short `examine_summary` copy so `/examine` location views reveal more meaning than the compact `/look` feature list.
- Added modest `SWAMP` resource defaults for grass, mushrooms and herbs.
- Kept swamp berries out of the default table; the dry islet has only a tiny berries/herbs exception.
- Opted out the blind channel and dark backwater from gatherable vegetation.

## Out Of Scope

- No fishing mechanics.
- No observation or learning progression.
- No new resource types, loot containers, creatures, combat, theft, economy or notification settings.
- No settlement gate changes.

## Acceptance

- Floodplain landmarks appear as active location features with non-generic icons.
- Direct feature inspection works through authored aliases.
- Floodplain resources are modest and do not turn the pocket into a high-yield farming area.
- Existing seed/map/content validation passes.
