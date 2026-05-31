---
id: THEFT-001
title: Risky theft MVP
status: backlog
type: feature
area: social
priority: medium
estimate: 1-2d
tags:
  - theft
  - social-memory
  - inventory
  - action-queue
  - 0.15
depends_on:
  - THEFT-000
  - VIS-001-A
  - OBS-001-A
---

# THEFT-001 — Risky Theft MVP

## Status

Ready for implementation planning.

## Target

0.15.2 or nearby 0.15.x patch.

## Goal

Add a first player-facing `Вкрасти` action that can steal one small visible resource from a nearby target, with chance-based success, chance-based detection, first-use warning, cooldown and incident statistics.

## Scope

### Add action

Add `STEAL` to `WorldActionType`.

Add action config:

- action title: `крадемо`;
- stamina cost: 3;
- priority: near `GATHER` / `FRESHEN`, below `ATTACK`;
- physical action: requires standing.

### Add target UI

Add a target action button:

```text
🖐 Вкрасти
```

Show it for:

- player targets;
- living non-animal creature targets with carried resources;
- later, selected strange beings if they carry resources.

Do not show it for:

- corpses;
- animals in the first slice;
- targets without stealable resources, unless the UX is better with a failed attempt.

### First warning

Before the first attempt, show confirmation:

```text
Це крадіжка.

Якщо вас помітять, це запам’ятають. Довіра до вас може впасти, інші можуть розсердитися, відступити, попередити вас, покликати увагу до спроби або відповісти іншою дією. Персонажі поруч теж можуть побачити спробу.

Спробувати?
```

Buttons:

- `Так, ризикнути`
- `Ні, не чіпати`

Canceling does not create an incident.

### Stealable resources

Allow one unit from:

- `berries`;
- `mushrooms`;
- `herbs`;
- `raw_meat`;
- `cooked_meat`;
- `twigs`;
- `torch`.

Do not steal:

- held lit torches;
- corpses;
- final protected tutorial-critical resources;
- unique/ritual items.

### Resolution

On completion:

1. Re-resolve thief, target and location.
2. Check protected location.
3. Check pair cooldown.
4. Find one safe stealable resource.
5. Roll success.
6. Roll detection.
7. Transfer one unit if successful.
8. Record `TheftIncident`.
9. Notify target/witnesses if detected.
10. Apply local memory/suspicion if available.
11. If target is world-controlled and detected, queue or perform ordinary reaction.

## Required data

Prefer a `TheftIncident` table for all started attempts.

Also add a player flag or timestamp:

```prisma
theftWarningSeenAt DateTime?
```

A later generic flag system may replace this.

## Pair cooldown

Default: 10 minutes between the same thief and target.

This should apply to both player and creature actors.

## Scribe statistics

Add aggregate stats for scribes:

- total attempts;
- successful attempts;
- observed attempts;
- blocked attempts;
- success rate;
- observed rate;
- stolen resources by key;
- attempts against players.

## Acceptance criteria

- A player can attempt to steal from another nearby player.
- A player can attempt to steal from a nearby living world-controlled character with carried resources.
- First warning is shown once before the first attempt.
- Canceling first warning does not enqueue `STEAL`.
- A successful theft transfers exactly one unit.
- A failed theft transfers nothing.
- A detected theft notifies the player target.
- A witness-only detection can keep the thief anonymous in target text.
- A started attempt always writes a `TheftIncident`.
- Protected dream/tutorial locations block theft.
- Cooldown blocks repeated theft against the same target.
- Scribe stats include all attempts.
- Player-facing copy uses `персонаж`, `істота`, `дух`, names or neutral “хтось”.
