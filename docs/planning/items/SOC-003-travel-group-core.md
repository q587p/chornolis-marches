---
id: SOC-003
title: Travel group core
status: next
type: feature
area: social
priority: high
tags:
  - social
  - groups
  - travel
  - actors
  - telegram
depends_on:
  - SOC-002
---

# SOC-003 — Travel Group Core

## Goal

Add persistent `Гурт` state: leader, members, active/lagging/left/kicked statuses, and basic commands/buttons.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Add `TravelGroup` and `TravelGroupMember` models and migration.
- Add `src/services/travelGroups.ts`.
- Accept active `FollowIntent` into a group.
- Add commands/buttons:
  - `Гурт` / `/group` — show group status.
  - `Взяти до гурту` — leader accepts follower.
  - `Вийти з гурту` — member leaves.
  - `Виключити з гурту` — leader kicks member.
- Disband empty group or group with no leader.
- Do not implement group movement yet.

## Rules

- A leader is also a group member with role `LEADER`.
- A member can be active in only one group.
- Leader can exclude members.
- Member can leave voluntarily.
- Group membership may create/update contact entries with source `GROUP`.
- The UI should say `Гурт`, not `party`.

## Suggested Group Status

```text
Гурт Марени:
- Марена — веде
- Остап — поруч
- Боривітер — відстав
```

No group:

```text
Ви не в гурті.
Можете слідувати за кимось поруч або взяти до гурту того, хто слідує за вами.
```

## Acceptance Criteria

- Leader can create a group by accepting a follower.
- Leader and follower appear in group status.
- Member can leave.
- Leader can kick member.
- No duplicate active groups for one actor.
- Build and tests pass.
