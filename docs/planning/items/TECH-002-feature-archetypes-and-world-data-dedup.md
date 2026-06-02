---
id: TECH-002
title: Location feature archetypes and world-data deduplication
status: backlog
type: technical
area: world_data
priority: medium
estimate: 2-4h
tags:
  - world-data
  - features
  - seed
  - cleanup
  - templates
depends_on: []
---

# TECH-002: Location feature archetypes and world-data deduplication

## Goal

Reduce repeated authored `LocationFeature` data by introducing reusable feature archetypes/templates with explicit per-instance overrides.

The first pressure point is Strange Totems: several feature rows can share the same static fields and `data` defaults, including:

- `type: LANDMARK`;
- `providesLight: false`;
- `restStaminaCapMultiplier: null`;
- `data.icon`;
- `data.inspectable`;
- `data.strange_totem`;
- `data.seeded`;
- `data.future_hook`;
- twig yield defaults;
- aliases such as `тотем`, `підозрілий тотем`, `strange totem` and `totem`.

Keeping those defaults in every world JSON row makes map content noisier, makes future wording/icon changes easier to miss, and increases the chance that two visually identical features drift apart by accident.

## First Scope

- Add a reusable feature archetype dictionary for authored world data, for example `prisma/data/world/featureArchetypes.json` or a similarly named file.
- Let a feature instance reference an archetype key and override only fields that differ for that specific location.
- Resolve archetype defaults during seed/world-data loading into the same effective `LocationFeature` shape used today.
- Keep the first implementation focused on static authored defaults. Do not make archetypes responsible for mutable runtime state such as cooldowns, aging, stock, last-shaken timestamps or one-off event markers except as documented initial defaults.
- Start with Strange Totems or another repeated authored feature family where behavior can stay equivalent.

## Merge Semantics

- Document whether `data` is shallow-merged or deep-merged.
- Treat array fields such as `aliases` deliberately: either replace the archetype array or support an explicit append field such as `aliasesExtra`.
- Avoid mutating archetype defaults when resolving feature instances.
- Fail loudly on unknown archetype keys so seed mistakes do not silently create partial features.

## Acceptance

- Repeated Strange Totem defaults can live in one archetype with per-location differences kept in each feature row.
- Seed/reset output remains behavior-equivalent for the converted features.
- Tests cover:
  - archetype resolution;
  - per-instance override behavior;
  - alias merge/replace semantics;
  - unknown archetype failure;
  - no mutation of archetype defaults between feature rows.
- `docs/systems/location_features.md` and world-data notes explain the authoring pattern.
- Existing map/content validation and build checks stay green.

## Non-goals

- No Prisma schema change for the first pass.
- No broad map rewrite in the same slice.
- No migration of runtime feature state into archetypes.
- No player-facing wording changes unless the converted feature text already needs a separate content pass.

## Risks

- Loose merge semantics can hide authored differences or accidentally remove aliases.
- A schema-less template file can make seed debugging harder unless validation messages are clear.
- Overusing archetypes could make unique landmarks feel generic; the template should remove duplication, not flatten atmosphere.
