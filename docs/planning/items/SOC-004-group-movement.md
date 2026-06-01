---
id: SOC-004
title: Group movement MVP
status: backlog
type: feature
area: social
priority: high
tags:
  - social
  - groups
  - movement
  - action-queue
  - stamina
depends_on:
  - SOC-003
---

# SOC-004 — Group Movement MVP

## Goal

When a group leader moves, active capable members in the same location follow through the same exit. Members who cannot keep up are left behind but stay known to the group as lagging.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Add `src/services/groupMovement.ts`.
- Hook group movement after successful leader `MOVE` completion.
- Reuse existing action queue and stamina spending for member moves.
- Add recursion guard so group-triggered member moves do not trigger their own group movement.
- Mark members as `LAGGING` when they cannot follow.
- Add compact Telegram notifications.

## Rules

A member follows only if:

- status is `ACTIVE`;
- member is co-located with leader before movement;
- member has `Життя > 0`;
- member has enough `Снага` or at least passes the same movement rules as normal player/creature movement;
- member is not resting;
- the exit is visible/unlocked for that member;
- member has no incompatible active action.

If any check fails:

- do not block leader movement;
- mark member `LAGGING`;
- set `lastKnownLocationId`;
- notify leader and member if possible.

## Suggested Copy

Leader success:

```text
Ви ведете гурт на північ.
З вами йдуть: Остап, Марена.
```

Leader with lagging member:

```text
Ви ведете гурт на північ.
З вами йде: Остап.
Відстала Марена — бракує снаги.
```

Member:

```text
Ви йдете за Остапом на північ.
```

Lagging member:

```text
Гурт рушив далі, але ви не встигаєте: бракує снаги.
```

Observer:

```text
Гурт іде звідси на північ.
```

## Implementation Notes

- Prefer adding a service call near the end of `completeMove` after leader movement succeeds and before/around final notifications.
- Do not duplicate the whole movement logic if possible; enqueue `MOVE` actions with payload marker `{ groupFollow: true, groupId, leaderKey }`.
- Cap followers per movement with config, e.g. `GROUP_MOVE_MEMBER_LIMIT=6`.
- Avoid recursive movement: if action payload has `groupFollow: true`, do not call group movement service.

## Acceptance Criteria

- Leader movement pulls active co-located members.
- Exhausted/resting/unconscious/not-co-located members do not move and become `LAGGING`.
- Leader movement is never blocked by member failure.
- Member movement spends stamina and creates tracks like normal movement.
- No recursive movement loops.
- Build and tests pass.
