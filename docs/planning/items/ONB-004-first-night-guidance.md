---
id: ONB-004
title: First night guidance
status: done
type: ux
area: onboarding
priority: medium
estimate: 1-2h
tags:
  - onboarding
  - night
  - light
  - tutorial
  - copy
---

# ONB-004: First Night Guidance

## Goal

Give new players a small diegetic hint the first time darkness meaningfully reduces what they can see.

This should connect the `0.13` onboarding work with the `0.14` night/light systems without turning night into a checklist tutorial.

## Trigger Shape

Possible first implementation:

- player is in ordinary waking world, not tutorial dream;
- current daypart is dusk or night;
- visibility service hides or reduces at least one meaningful detail;
- player has not already seen the first-night hint;
- player is active, not AFK/ended.

## Example Copy

```text
Темрява тут не просто гасить барви. Вона забирає дрібні речі: сліди, рухи, те, що лежить під ногами.

Світло вогнища чи факела може повернути частину побаченого.
```

Shorter variant:

```text
Без світла ніч ховає дрібні сліди й рухи. Вогонь або факел допоможуть бачити більше.
```

## Out of Scope

- Full tutorial branch for fire/light.
- Forced torch grants.
- Ordinary sleep.
- Hidden presence.

## Acceptance

- The hint appears at most once per character unless tutorial/progress reset explicitly allows it.
- It respects AFK/end-session proactive-message guards.
- It is short and atmospheric.
- It does not reveal raw visibility mechanics.

## 0.14.8 Result

- First-night guidance now appears only in the waking world when dim/dark visibility is actually reducing what the player can see.
- The hint is stored as a per-character world event and respects the session-presence proactive-message guard.
- Tutorial dream locations and locally lit places do not trigger the first-night hint.

## Watchpoint

- First-night guidance is an extra proactive/follow-up message. The guard shape is intentional, but after deploy we should watch the first dark hour of a new character: it should teach light once, not feel like chatter layered on top of ordinary location output.
