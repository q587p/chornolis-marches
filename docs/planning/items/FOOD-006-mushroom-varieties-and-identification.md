---
id: FOOD-006
title: Mushroom varieties and identification
status: backlog
type: feature
area: survival
priority: medium
tags:
  - food
  - mushrooms
  - foraging
  - alchemy
  - risk
depends_on:
  - FOOD-001
  - MAP-002
---

# FOOD-006: Mushroom varieties and identification

## Goal

Turn generic gathered mushrooms into a small risky foraging layer: some mushrooms are good food, some are better cooked, some are poisonous, and some are dangerous but valuable for future alchemy or elixirs.

## Problem

Right now `гриби` are a simple edible resource. That makes early hunger relief easy, but it also removes a very Chornolis-shaped question: did the character actually recognize what they picked?

The intended direction is not "randomly punish eating mushrooms". It should reward attention:

- `Роздивитися` (`/examine`) before eating can reveal hints;
- repeated experience or later herbalism/alchemy skills can improve recognition;
- risky mushrooms can still have uses beyond food.

## Scope

- Split generic mushrooms into a few first mushroom categories or hidden subtypes.
- Let `Роздивитися гриби` / `/examine mushrooms` show a qualitative identification hint.
- Start with broad, readable types:
  - ordinary edible mushrooms;
  - nourishing mushrooms, especially better after cooking;
  - conditionally edible mushrooms that are risky raw but safer cooked;
  - poisonous mushrooms;
  - bitter/strange mushrooms useful later for alchemy, poison, sleep, dream or spirit-adjacent elixirs.
- Let cooking improve at least some mushroom outcomes.
- Make the risk legible before eating when the player has examined the mushrooms or has enough relevant knowledge.
- Keep early tutorial mushrooms safe unless the tutorial explicitly teaches mushroom caution.

## Design Notes

Possible first pass:

- gathered `mushrooms` remain a generic stack for compatibility;
- new item-instance work can later store actual subtype per stack;
- before item instances, use a small "known mushroom sample" or inspection state to avoid exploding the resource model too early.

Player-facing text should sound like observation, not a spreadsheet:

```text
Капелюшки світлі й м'ясисті. Такі краще не їсти сирими, але жар вогнища може зробити їх лагіднішими.
```

```text
Пластинки під капелюшком темніші, ніж хотілося б. Сон у навчанні такого не підсовував.
```

## Acceptance

- Examining mushrooms can reveal a useful risk/food hint.
- Some mushrooms are safer or more nourishing after cooking.
- Poisonous mushrooms can cause a noticeable but non-instantly-fatal downside if eaten carelessly.
- At least one risky mushroom type has a future alchemy/elixir use recorded in docs or data.
- Tutorial mushrooms remain safe by default.
- Tests cover safe, risky, cooked and poisonous paths, plus the examine hint.
