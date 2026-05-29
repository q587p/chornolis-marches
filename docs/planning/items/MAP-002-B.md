---
id: MAP-002-B
title: Generic gather uses biome candidates
status: next
type: feature
area: world
priority: high
estimate: 1-2h
tags:
  - gather
  - biome
  - foraging
depends_on:
  - MAP-002-A
---

# MAP-002-B: Generic gather uses biome candidates

## Goal

Make `/gather` without arguments use local biome candidates.

## First Scope

- Keep exact `/gather herbs` style actions working.
- Use candidate table for generic local search.
- Respect visibility if needed.

## Acceptance

- Generic gather differs by biome.
- Specific gather remains stable.

## Implementation Order

Do after: `MAP-002-A`.
