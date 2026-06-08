---
id: ALC-001
title: First herbal stamina tincture
status: backlog
type: feature
area: survival
priority: high
estimate: 2-4h
tags:
  - alchemy
  - herbs
  - berries
  - stamina
  - bottles
  - crafting
  - inventory
depends_on:
  - RECIPE-001
  - ALC-002
---

# ALC-001: First Herbal Stamina Tincture

## Goal

Revise the existing first herbal elixir task into a bottle-based first tincture: a practical prepared drink made from gathered herbs and berries that strongly restores stamina and returns the empty bottle after use.

This should be the first player-facing proof that gathered resources can become something made, not only something eaten.

## Recipe

Inputs:

```text
empty_bottle x1
herbs x2
berries x1
```

Output:

```text
herbal_tincture x1
```

Suggested Ukrainian name:

```text
трав’яна настоянка
```

## Commands and Aliases

Target forms:

```text
/brew tincture
/make_tincture
/brew herbal_tincture
зробити настоянку
приготувати настоянку
зробити зілля
приготувати зілля
```

Drink forms:

```text
/drink tincture
/use tincture
випити настоянку
випити зілля
```

## Effect

- Restore a large capped amount of stamina.
- Suggested first tuning: restore `32` or `36` stamina, capped by max stamina.
- If stamina is already full, do not consume the tincture.
- After drinking, remove one `herbal_tincture` and add one `empty_bottle`.
- No dirty bottle yet.
- No water/thirst/washing dependency yet.
- Optional: record `herbalism` or `gathering` practice if the learning service can do this cheaply and without broad skill UI.

## Player-Facing Tone

Example craft success:

```text
Ви розтираєте лікарські трави з темними ягодами й зливаєте гіркий сік у пляшечку. Настоянка не пахне гостинцем, але тіло таке запам’ятовує.
```

Example drink:

```text
Настоянка гірка, аж щелепи стискаються. За кілька вдихів у тіло повертається дорога.
```

## Guardrails

- Do not make rest, sleep or campfires obsolete.
- Do not expose exact hidden formulas in ordinary text beyond clear missing ingredients.
- Do not add a full recipe book or crafting menu.
- Do not add HP healing or night-sight in this first slice.
- Do not consume ingredients or bottles on failed validation.
- Do not allow tutorial dream resources to become a grind source unless explicitly allowed.

## Acceptance

- A player with bottle, herbs and berries can craft one tincture.
- Missing bottle, herbs or berries fail clearly without consuming anything.
- Drinking restores stamina up to cap and returns one empty bottle.
- Drinking at full stamina does not consume the tincture.
- `/help` / `/commands` mention stable commands only if the action becomes player-facing.
- Tests cover recipe validation, stamina cap behavior, bottle return and aliases.
