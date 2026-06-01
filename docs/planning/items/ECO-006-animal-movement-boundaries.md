---
id: ECO-006
title: Animal movement boundaries for authored vertical exits
status: testing
type: feature
area: ecology
priority: high
estimate: 30m
tags:
  - ecology
  - animals
  - movement
  - verticality
  - camp
depends_on:
  - CAMP-002
---

# ECO-006: Animal movement boundaries for authored vertical exits

## Goal

Keep ordinary animals from using human-authored vertical routes such as watchtower ladders and climbable trees unless a future route is explicitly designed for animals.

## 0.14.22 Slice

- Ordinary animal movement now treats `UP` exits as restricted.
- Animal panic/flee movement, herbivore/carnivore wandering and overcrowding spread all use the same exit filter.
- Already-stranded animals can still use `DOWN`, so a live world can recover from older movement quirks.
- Non-animal NPCs can still use the current authored vertical routes.
- The helper recognizes future `animalFriendly` / `animal_friendly` flags, but the current database schema does not yet persist such exit metadata.

## Follow-Ups

- If true animal passages are needed, add persisted exit metadata such as `animalFriendly` and seed/test support for it.
- Review `INSIDE` / `OUTSIDE` routes separately once animal burrows, dens or tunnels become real map features.
- Add cleanup/admin tooling if live data leaves many animals stranded in human-only upper rooms.

## Acceptance

- Mice, rabbits and other ordinary animals cannot newly climb to the starter watchtower or tree crowns through `UP` exits.
- Existing animals above ground can still leave by `DOWN`.
- Hunters, herbalists and other non-animal NPCs are not blocked from vertical routes.
- Focused tests cover the boundary helper.
