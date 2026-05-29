---
id: SOC-002
title: Follow intent MVP
status: backlog
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

- Add `FollowIntent` model and migration.
- Add `src/services/following.ts`.
- Add target action button `Слідувати` for visible living players/non-animal creatures.
- Add cancel action: `Не слідувати` / `/unfollow`.
- Show leader a compact notification and an accept button: `Взяти до гурту`.
- Do not auto-move followers yet.

## Rules

- A follower can have only one active follow intent.
- Following does not require contact.
- Following does not automatically create a group.
- If follower and leader are no longer co-located when accepted, show a soft failure.
- Following an animal is delayed unless specifically enabled later.

## Suggested Copy

Follower:

```text
Ви тримаєтесь за Мареною, але ще не йдете з її гуртом.
```

Leader:

```text
Остап намагається триматися за вами.
[Взяти до гурту]
```

Cancel:

```text
Ви більше не слідуєте за Мареною.
```

## Acceptance Criteria

- Player can follow a visible target.
- Leader can see active followers.
- Follower can cancel intent.
- Accepting is not implemented here except as a stub/handoff to SOC-003.
- Build and tests pass.
