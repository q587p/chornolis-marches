---
id: THEFT-002
title: World-controlled thief character
status: backlog
type: feature
area: npc
priority: low
estimate: 1-2d
tags:
  - theft
  - npc
  - autonomy
  - social-memory
  - future
depends_on:
  - THEFT-001
  - SOCIAL-003
---

# THEFT-002 — World-Controlled Thief Character

## Status

Future 0.15.x or 0.16 follow-up.

## Goal

Allow a world-controlled human character with thief-like behavior to attempt rare theft from nearby characters using the same `STEAL` action.

## Prerequisites

- `THEFT-001` implemented.
- `TheftIncident` exists.
- Pair cooldown works for both player and creature actors.
- Detected theft can trigger ordinary social reactions.
- Scribe stats include all attempts.

## Character identity

Use profession-style metadata:

```ts
professionKey: "thief"
professionName: "крадій"
```

Player-facing descriptions should simply present the person as a character in the world. The profession should not need to be obvious unless discovered through inspection, rumor, observation or repeated behavior.

## Behavior loop

A thief-character may consider theft when:

- they are alive and present;
- they are not already doing a higher-priority action;
- nearby target has stealable resources;
- pair cooldown allows it;
- location is not protected;
- the attempt is rare enough not to feel spammy.

Suggested autonomy:

1. Find candidate thief-characters.
2. Find nearby targets with safe stealable resources.
3. Pick target by opportunity.
4. Enqueue `STEAL`.
5. If detected, react through `MOVE`, `SAY` or social signal.
6. Record incident exactly like player theft.

## Detection

Use the same theft service as player theft.

The target player must receive a message if the thief-character is detected by anyone.

## Acceptance criteria

- A world-controlled thief-character can attempt `STEAL`.
- The same incident logging is used.
- Cooldown prevents repeated harassment.
- Detected attempts use ordinary actions/socials.
- Scribe stats distinguish actor type without changing player-facing tone.
