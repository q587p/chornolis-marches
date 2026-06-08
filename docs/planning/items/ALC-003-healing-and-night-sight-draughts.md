---
id: ALC-003
title: Healing and night-sight draughts
status: backlog
type: feature
area: survival
priority: medium
estimate: 4-8h
tags:
  - alchemy
  - healing
  - night
  - visibility
  - effects
  - mushrooms
  - wetland
depends_on:
  - ALC-001
  - RES-001
  - FOOD-006
---

# ALC-003: Healing and Night-Sight Draughts

## Goal

After the first stamina tincture is stable, add two stronger prepared-drink directions:

1. a limited healing tincture;
2. a temporary darkness-vision draught.

These should remain small survival tools, not a full potion economy.

## First Candidate: Soothing Willow Tincture

Suggested inputs:

```text
empty_bottle x1
herbs x2
willow_bark x1
optional honey x1 later
```

Suggested effect:

- restore a capped amount of HP;
- no overheal;
- no instant combat rescue loop;
- return `empty_bottle x1`.

Suggested Ukrainian name:

```text
вербова настоянка
```

## Second Candidate: Dark-Sight Draught

Suggested inputs:

```text
empty_bottle x1
mushrooms x2
calamus_root x1
```

Suggested effect:

- apply a temporary `dark_sight`-like effect;
- for a limited duration, darkness copy can reveal rough silhouettes, feature outlines or safer movement hints;
- do not reveal hidden beings, hidden passages, exact track direction or full technical visibility data.

Suggested Ukrainian names:

```text
темнозора настоянка
нічний настій
```

## Required Design Work

Before implementing night-sight, decide whether the project already has a suitable temporary effect model. If not, add a small effect foundation in a separate task or keep night-sight as docs-only.

## Guardrails

- No broad buff/debuff system if not needed.
- No exact public timers/chances unless technical details are enabled.
- No hidden-route bypass.
- No tracking-through-darkness bypass.
- No mushroom punishment without legible mushroom identification.
- Healing should not erase risk from bumblebee stings, predator attacks or starvation.

## Acceptance

- Healing tincture has clear capped HP behavior and bottle return.
- Night-sight only lands if a safe temporary effect/visibility hook exists.
- Ordinary text stays qualitative.
- Technical details can show raw effect duration if a debug/technical mode already supports it.
- Tests cover HP cap, bottle return, visibility-limited night-sight behavior and no hidden-route leak.
