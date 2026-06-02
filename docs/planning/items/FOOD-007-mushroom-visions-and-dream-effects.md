---
id: FOOD-007
title: Mushroom visions and dream effects
status: icebox
type: feature
area: survival
priority: low
estimate: 4-8h
tags:
  - food
  - mushrooms
  - dreams
  - visions
  - effects
  - alchemy
depends_on:
  - FOOD-006
  - DREAM-001
  - SLEEP-003
---

# FOOD-007: Mushroom Visions and Dream Effects

## Goal

Let some strange mushroom use lead to vivid visions, bright or unsettling dreams, altered perception, or other atmospheric "cartoon" moments once the game has enough food, effect and dream foundations to support it safely.

## Problem

Mushrooms should not be only calories with a small poison chance. In Chornolis, a player who eats the wrong or rare mushroom might see a place differently, dream too vividly, hear an old sign in a new voice, or wake with a clue, fear or lingering effect.

This should be memorable and folklore-shaped, not a generic status popup.

## Future Scope

- Add rare mushroom outcomes such as:
  - vivid visual distortions or brief visions;
  - bright, strange or frightening dreams after sleep;
  - temporary perception changes while awake;
  - dream fragments that hint at tracks, hidden features, omens or old events;
  - rare useful outcomes for alchemy, learning or spirit-adjacent rituals.
- Keep ordinary tutorial mushrooms safe unless a tutorial scene deliberately teaches caution.
- Use future effect/condition state instead of one-off hidden flags where practical.
- Tie stronger outcomes to mushroom identification, alchemy knowledge, sleep/lucid dream systems or special locations.
- Make the player-facing text atmospheric and legible: the player should understand that the mushroom did something, even if the meaning is uncertain.

## Non-Goals

- No immediate full hallucination engine.
- No random forced dream jumps before dream/presence separation is ready.
- No lethal surprise mushroom outcome without clear prior risk.
- No broad poison/disease system in this item; that belongs to food/effect foundations.

## Design Notes

Possible first player-facing tones:

```text
Світ на мить стає надто яскравим: трава ніби має власну пам'ять, а тіні ворушаться повільніше за вас.
```

```text
Сон приходить кольоровим і неспокійним. Ви пам'ятаєте не події, а знак: мокрий корінь, чорну воду і щось, що кликало з-під берега.
```

Use these as inspiration, not final canonical copy. The important direction is: mushrooms can become a bridge between food, risk, dreams, omens and future alchemy.

## Acceptance Direction

- At least one rare mushroom outcome can produce a vision or dream-flavored follow-up.
- The outcome is gated by mushroom type, prior examination, location, sleep state or an explicit risky choice.
- The player gets clear text and no hidden silent punishment.
- Tutorial mushrooms remain safe unless intentionally scripted.
- Tests cover the trigger guard and at least one vision/dream text path when this ships.
