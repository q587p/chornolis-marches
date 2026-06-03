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

Let a player start following a visible being before being accepted into a group.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Add `PlayerFollowIntent` model and migration.
- Add `src/services/following.ts`.
- Add `/follow <target>` and Ukrainian/MUD-style aliases for visible living players and creatures.
- Add cancel action: `Не слідувати` / `/unfollow`.
- Show the active intent in the player's own character view without raw IDs.
- Do not auto-move followers yet.

## Rules

- A follower can have only one active follow intent.
- Following requires a visible local target when the intent is set.
- Following does not automatically create a group.
- If follower and target are no longer co-located later, keep the intent as a last-followed attention marker until cleared or replaced.
- Following animals is allowed as attention context only; it does not tame, assist or command them.

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
- Build and tests pass.
