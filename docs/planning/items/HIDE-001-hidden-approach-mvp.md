---
id: HIDE-001
title: Hidden approach MVP
status: backlog
type: feature
area: visibility
priority: medium
estimate: 1-2d
tags:
  - hiding
  - stealth
  - visibility
  - social-memory
  - 0.15
depends_on:
  - THEFT-001
  - VIS-001-A
---

# HIDE-001 — Hidden Approach MVP

## Status

Planned after THEFT-001.

## Target

0.15.3 or nearby 0.15.x patch.

## Goal

Add a first `Сховатися` action that can improve theft detection avoidance, can itself be noticed and can support future stealth, hunting and strange presence systems.

## Scope

### Add action

Add `HIDE` to `WorldActionType`.

Action config:

- action title: `ховаємось`;
- stamina cost: 2;
- priority: below movement and theft;
- physical action: requires standing.

### State

Use either a simple set of player/creature fields or a condition table.

Fast MVP fields:

```prisma
hiddenUntil DateTime?
hiddenStartedLocationId Int?
hiddenQuality Int @default(0)
```

A cleaner later option:

```prisma
ActorCondition {
  actorType
  playerId?
  creatureId?
  key
  strength
  expiresAt
  data
}
```

### Resolution

On completion:

1. Re-resolve actor and location.
2. Calculate hide success.
3. Calculate whether the attempt is noticed.
4. On success, set hidden state.
5. On failure, do not set hidden state.
6. If noticed, notify observers.
7. Record a world event or action note for scribe/audit visibility.

## Hiding in a watched location

If other characters are present, the attempt may be seen.

Observer messages:

```text
Хтось намагається сховатися між тінню й корінням.
```

or, when clearly identified:

```text
{actor} намагається сховатися між тінню й корінням.
```

## Hidden approach

If a character hides in one location and soon enters another, keep a temporary bonus.

First version rule:

- hidden state survives one movement;
- hidden state gives a detection reduction to the next theft attempt;
- hidden state expires after one risky action or timeout;
- loud actions clear it.

This does not need silent movement yet.

## Integration with theft

`STEAL` should read hidden state and apply:

- `hiddenBonus` to success;
- `hiddenBonus` reduction to detection chance;
- `thiefWasHidden` on `TheftIncident`.

After a theft attempt, clear or weaken hidden state.

## Acceptance criteria

- A player can use `Сховатися`.
- Hiding may succeed or fail.
- Hiding in a watched location can be noticed.
- A successful hide gives a temporary bonus to theft detection avoidance.
- The bonus can carry across one movement.
- Theft incident records whether thief was hidden.
- Hidden state expires or clears after use.
- Player-facing copy does not imply perfect invisibility.
