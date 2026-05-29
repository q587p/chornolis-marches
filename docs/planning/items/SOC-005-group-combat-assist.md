---
id: SOC-005
title: Group combat assist conservative plan
status: backlog
type: feature
area: combat
priority: medium
tags:
  - social
  - groups
  - combat
  - balance
depends_on:
  - SOC-003
---

# SOC-005 — Group Combat Assist, Conservative Plan

## Goal

Prepare group combat without turning the current instant animal attack into multiplied group instant kills.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Why Conservative

Current player attack flow can kill eligible animal targets immediately. Automatically triggering all group members to attack would make group combat too strong and hard to balance before the combat system has real rounds/damage.

## Scope For First Pass

- Add group combat design notes and optional target-call UI.
- Leader can mark/call a target for the group.
- Active members may receive a `Допомогти` button.
- Do not auto-apply multiple attacks yet.
- Do not implement PvP group attacks until crime/witness/bounty design exists.

## Suggested Copy

Leader:

```text
Ви кличете гурт бити вовка.
```

Member:

```text
Остап кличе гурт бити вовка.
[Допомогти]
```

## Later Real Combat Rules

After combat has damage/rounds:

- group members in same location can contribute attacks or assists;
- initiative/round service resolves contributions once per round;
- stamina and wounds apply per actor;
- leadership or signals can affect coordination;
- PvP consequences are handled by separate legal/reputation systems.

## Acceptance Criteria

- No automatic group damage multiplication.
- Group target call works as a non-destructive prompt.
- Documentation clearly states this is blocked on combat refactor for real assist damage.
- Build and tests pass if code is touched.
