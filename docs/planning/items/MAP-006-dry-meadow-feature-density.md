---
id: MAP-006
title: Dry meadow feature density pass
status: backlog
type: feature
area: world
priority: medium
estimate: 1-2h
tags:
  - map
  - dry_luka
  - location-features
  - atmosphere
  - content
depends_on: []
---

# MAP-006: Dry Meadow Feature Density Pass

## Goal

Add a small authored feature pass for `dry_luka` so meadow locations feel less empty when the player looks around.

The current dry meadow can read as too sparse: large open grassland, exits and occasional animals, but not enough local landmarks or inspectable texture to make nearby cells distinct.

## Scope

- Add a narrow set of visible/inspectable meadow features across several dry-luka locations.
- Prefer grounded frontier details over new systems:
  - wind-bent grass marks;
  - old mowing traces;
  - ant mounds;
  - hare forms;
  - dry gullies;
  - bee-heavy flower patches;
  - boundary stakes;
  - trampled or recovered grass signs;
  - small omen-like but non-quest curiosities.
- Keep `/look` compact and `/examine` more meaningful.
- Give features aliases where players are likely to type them.
- Use existing `LocationFeature` seed data and existing inspection behavior.

## Guardrails

- No new resource economy, profession system, quest, combat rule, Prisma schema or migration.
- Do not turn every meadow cell into a busy landmark; leave some open space.
- Do not add player rewards unless a separate resource/foraging PR explicitly owns them.
- Do not broaden strange-totem behavior or animal spawning in this pass.
- Keep descriptions original, Ukrainian and region-specific.

## Acceptance

- Several dry-luka locations gain distinct visible features without duplicated names/descriptions.
- Feature inspection provides more than the one-line `/look` label.
- Tests or world-content checks cover:
  - features are in `dry_luka`;
  - names/descriptions are not duplicated accidentally;
  - no raw HTML leaks into authored world JSON;
  - seed/export checks stay green.
- `docs/systems/location_features.md` or nearby world docs are updated only if a new authoring rule is introduced.

## Follow-ups

- Later passes can connect selected meadow features to foraging, animal signs, weather, sound or skill-gated observation. This first pass is content density and atmosphere only.
