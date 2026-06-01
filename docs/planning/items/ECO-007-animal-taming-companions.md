---
id: ECO-007
title: Animal taming and small companions
status: icebox
type: feature
area: ecology
priority: medium
estimate: unknown
tags:
  - ecology
  - creatures
  - companions
  - following
  - feeding
depends_on:
  - SOC-002
  - SOC-004
---

# ECO-007: Animal Taming and Small Companions

## Goal

Let players eventually earn the trust of small animals such as mice, hares or similar local creatures, turning them into fragile companions that can follow the player for a time.

This should feel like building trust with a living creature, not pressing a generic pet button.

## Future Shape

- Add a taming/trust layer for selected animal species.
- Start with small, low-combat animals such as:
  - mouse;
  - hare;
  - possibly later foxes or other borderline cases only after stronger ecology and safety rules exist.
- A tamed animal can follow the player through ordinary routes it can physically use.
- The companion needs to be fed and cared for.
- Hunger, fear, darkness, injury, crowding, predator presence or rough movement can make the animal stop following, flee or refuse.
- Taming should likely require repeated gentle interactions, food, patience and a low-threat context.

## Design Notes

- Reuse future follow/group actor foundations where practical instead of inventing a separate movement system.
- Reuse hunger/feeding systems so companion care has real ecological cost.
- A companion should remain vulnerable; it should not become a combat pet or inventory bonus in the first version.
- Animal movement boundaries still apply: a mouse or hare should not climb a watchtower ladder unless an exit is explicitly animal-friendly.
- The UI should present this diegetically, e.g. `Пригостити`, `Покликати`, `Не лякати`, `Відпустити`, rather than as a generic `tame`.

## Open Questions

- Should taming be permanent, timed, location-bound or trust-decaying?
- Should multiple companions be allowed, or one small companion per player?
- How much danger should predators pose to a companion?
- Should other players be able to feed, scare, steal or harm a companion?
- Can a companion enter dreams, shelters, boats or future group travel?

## Non-Goals

- Full pet/companion combat.
- Mounts or beasts of burden.
- Breeding owned animals.
- Stable/cage/kennel systems.
- Making ordinary wild animals safe or predictable.
