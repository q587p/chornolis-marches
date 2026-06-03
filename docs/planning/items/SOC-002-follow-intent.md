---
id: SOC-002
title: Follow intent MVP
status: testing
type: feature
area: social
priority: high
tags:
  - social
  - following
  - actors
  - telegram
  - groups
depends_on:
  - SOC-001
---

# SOC-002 — Follow Intent MVP

## Goal

Let a player mark a visible local being as the one whose movement/actions they
are watching. This is follow intent, not follow movement.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Add `PlayerFollowIntent` model and migration.
- Add `src/services/following.ts`.
- Add `/follow <target>` and Ukrainian/MUD-style aliases for visible living players and creatures.
- Add cancel action: `Не слідувати` / `/unfollow`.
- Show the active intent in the player's own character view without raw IDs.
- Do not auto-move followers yet.
- Do not repeat visible exits, hidden routes or target actions for the follower.

## Rules

- A follower can have only one active follow intent.
- Following requires a visible local target when the intent is set.
- Following is attention context for future observation, track-learning and route-memory systems.
- Following does not automatically create a group.
- Following does not automatically move the follower.
- If follower and target are no longer co-located later, keep the intent as a last-followed attention marker until cleared or replaced.
- Following animals is allowed as attention context only; it does not tame, assist or command them.

Future follow movement is a separate slice. It should expose an explicit "try to
keep following" action for visible ordinary exits and must respect darkness,
stamina, action queues, hidden passages and learned route knowledge. Hidden
routes such as the cellar water-word passage must not be auto-repeated unless
the follower has learned the route or independently triggers it.

## Suggested Copy

Follower:

```text
Ви тримаєтесь за Мареною, але ще не йдете з її гуртом.
```

Cancel:

```text
Ви більше не слідуєте за Мареною.
```

## Acceptance Criteria

- Player can follow a visible target.
- Follower can cancel intent.
- The intent does not move the follower and does not notify/accept into a group.
- Group acceptance, leader follower lists and travel-group movement are deferred to SOC-003.
- Hidden routes are not auto-repeated through this intent.
- Build and tests pass.
