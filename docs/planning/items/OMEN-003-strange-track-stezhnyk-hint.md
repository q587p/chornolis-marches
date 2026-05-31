---
id: OMEN-003
title: Strange track / stezhnyk hint omen
status: proposed
type: feature
area: world
priority: medium
tags:
  - omen
  - forest
  - hidden-presence
  - spirit
  - atmosphere
depends_on:
  - OMEN-001
---

# OMEN-003: Strange Track / Stezhnyk Hint Omen

## Goal

Create a rare atmospheric omen that hints the forest may be watching the player, without implementing the full hidden follower spirit yet.

## First Scope

- Trigger rarely in forest/border/dark threshold locations.
- Use one short player-facing message about a strange sound, backward-facing footprint, broken twig or presence behind the player.
- Optionally create a temporary/examinable trace in the location.
- Magic campfire locations should suppress or calm this omen.
- Rate-limit per player/location.

## Non-Goals

- No combat.
- No reveal mechanics.
- No stealth checks.
- No pursuit.
- No permanent status.
- No dialogue tree.
- No targetable enemy.

## Acceptance

- Player may occasionally receive one unsettling omen.
- The omen can be examined if implemented as a trace/object.
- It does not create a targetable enemy.
- It does not spam.
- Tests/build pass.

## Example Text

```text
Позаду хрускає тонка гілка.

Коли ви озираєтеся, там нікого.
Але на м'якій землі лишився слід, спрямований у той бік, звідки ви щойно прийшли.
```
