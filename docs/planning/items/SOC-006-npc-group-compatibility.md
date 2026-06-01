---
id: SOC-006
title: NPC group compatibility
status: backlog
type: feature
area: social
priority: medium
tags:
  - social
  - groups
  - npc
  - actors
  - creatures
depends_on:
  - SOC-003
---

# SOC-006 — NPC Group Compatibility

## Goal

Make the group/follow/contact architecture compatible with NPCs as followers and leaders, even if the first visible MVP is player-led.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Ensure `actorRefs.ts`, `contacts.ts`, `following.ts`, `travelGroups.ts`, and `groupMovement.ts` support both `PLAYER` and `CREATURE` actor refs.
- Add service-level tests for creature actors in groups.
- Do not expose broad NPC recruitment UI yet unless a specific NPC is designed for it.
- Add debug output for actor keys and group status.

## NPC Rules For Later

NPC may follow or lead because of:

- quest/doruchennia state;
- payment or trade;
- fear, trust, debt or ritual obligation;
- profession route, patrol, escort, hunting or guiding.

NPC may refuse or leave because of:

- low hp/stamina;
- darkness/fear/danger;
- hostile reputation;
- guarding duty;
- incompatible faction/order;
- leader attacks a forbidden target;
- group strays too far from NPC goal.

## Acceptance Criteria

- Service tests can create a group with creature leader/member actor keys.
- Player UI still avoids exposing technical actor type.
- NPC creature disappearance/death marks relevant membership as lagging/disbanded rather than crashing.
- Build and tests pass.
