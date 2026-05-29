---
id: VIS-002
title: Hidden presence foundation
status: backlog
type: technical
area: visibility
priority: medium
estimate: 2-3h
tags:
  - visibility
  - hidden-presence
  - targets
depends_on:
  - VIS-001
---

# VIS-002: Hidden presence foundation

## Goal

Make current hidden-creature behavior explicit and safe before building richer stealth, hidden presence and visibility systems.

## Why

The project already has `Creature.isHidden` and UI filtering for hidden creatures. The hidden follower omen depends on those guarantees. This task makes the assumptions visible, tested and harder to break accidentally.

## Scope

- Confirm hidden creatures are excluded from location target lists.
- Confirm hidden creatures cannot be resolved as interaction targets.
- Confirm hidden non-animal creature movement does not send normal visible arrival/departure messages.
- Confirm hidden creature movement does not create ordinary visible tracks in the MVP.
- Add comments or helper functions so future tasks do not accidentally break this behavior.

## Suggested Helpers

```ts
export function isVisibleLivingCreature(c: CreatureLike): boolean
export function canRenderCreatureAsTarget(c: CreatureLike): boolean
export function shouldEmitCreatureMovementNotice(c: CreatureWithSpecies): boolean
export function shouldCreateOrdinaryTrackForCreature(c: CreatureWithSpecies): boolean
```

Suggested logic:

```ts
shouldEmitCreatureMovementNotice =
  creature.isAlive && !creature.isGone && !creature.isHidden && creature.species.kind !== "ANIMAL";

shouldCreateOrdinaryTrackForCreature = !creature.isHidden;
```

Later this can evolve into richer logic: hidden-but-noisy, hidden-but-trackable, visible only with light, visible only with an elixir, or visible to some players and not others.

## Acceptance

- Hidden living creatures do not appear in `Поруч` sections.
- Hidden living creatures do not create target buttons.
- Hidden creatures cannot be resolved by stale callback target IDs.
- Hidden creature movement does not emit normal non-animal movement notifications.
- Hidden creature movement does not create ordinary tracks.
- Tests or smoke notes cover the hidden visibility guarantees.
- Build passes.

## Implementation Order

Do after: `VIS-001`. Do before: `OMEN-002`.
