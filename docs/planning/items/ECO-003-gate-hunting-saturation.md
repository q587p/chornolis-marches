---
id: ECO-003
title: Gate hunting saturation and stand-down state
status: next
type: feature
area: ecology
priority: high
estimate: 2-4h
tags:
  - ecology
  - hunting
  - settlement
  - npc
  - rewards
depends_on:
  - ECO-001
  - ECO-002
  - NPC-002
---

# ECO-003: Gate Hunting Saturation and Stand-Down State

## Goal

Add a visible "enough for now" state to the gate hunting loop so the settlement does not keep asking for rodent/herbivore kills after local pressure has eased.

This keeps the loop ecological rather than quest-like: the world should react to changed conditions, not pay forever for the same input.

## Trigger Shape

The first implementation can use a conservative domain helper rather than a full ecological model:

- recent drop-off totals;
- nearby living herbivore/rodent pressure;
- recent overgrazing/depleted-resource signals;
- optional time since the last saturation state changed.

The exact numbers should stay technical/admin-visible. Player-facing text should say that the border has enough pressure again, not expose raw thresholds.

## Behavior

When saturation is active:

- the gate notice/sign changes from asking for carcasses to saying the pressure is enough for now;
- valid carcass/remains drop-offs can still be accepted physically, but no new reward/supply threshold should fire;
- player text should make clear that the settlement is no longer urging more killing right now;
- NPC hunters should stop seeking new rodents/herbivores for the loop;
- hunters can sit/rest near the magic campfire or another safe gate-side waiting point;
- hunter speech should switch to a quieter waiting/stand-down line pool rather than hunt-start or deposit lines.

## Example Stand-Down Lines

- "Досить на сьогодні. Хай трава трохи підведеться."
- "Не кожен рух у лісі треба гнати ножем."
- "Посидимо біля вогню. Якщо межа знову просяде, підемо."
- "Гризуни ще лишаться. Але тепер не вони диктують день."
- "Писар знак змінив. Значить, поки чекаємо."

## Acceptance

- The gate hunting loop has a technical saturation helper or state.
- The gate notice/drop-off text changes when saturation is active.
- Player reward thresholds do not grant new supplies while saturation is active.
- NPC hunters can enter a waiting/resting behavior instead of continuing the hunt loop.
- Waiting hunters use a distinct compact line pool.
- The loop can leave saturation later when ecological pressure rises again.
- Focused tests cover saturation reward suppression and hunter stand-down line selection.
