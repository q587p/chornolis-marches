---
id: SOC-010
title: Greeting inspiration stamina
status: backlog
type: feature
area: social
priority: medium
estimate: 2-4h
tags:
  - social
  - greet
  - stamina
  - cooldown
  - anti-farm
depends_on:
  - SOC-001
  - SES-001-A
---

# SOC-010: Greeting Inspiration Stamina

## Goal

Let a sincere greeting give the greeted character a tiny, atmospheric lift:
someone noticed them, and the road feels a little less heavy.

This should make social contact feel useful without turning `greet` /
`Привітати` into a stamina-farming button.

## First Scope

- When a living character greets another visible living character, the target
  may receive a small stamina recovery or temporary ease effect.
- Keep the effect small and qualitative:
  - enough to feel kind;
  - not enough to replace rest, food, sleep or fire.
- Apply cooldown before another benefit can land:
  - recommended first pass: once per target per in-game hour;
  - alternative: once per target per daypart if hour-based cadence feels too
    frequent;
  - optionally include sender+target pair in the cooldown so one character
    cannot repeatedly farm the same recipient.
- Store cooldown through a small durable marker or `WorldEvent` bridge first;
  if greetings become mechanically important, move to a dedicated social-memory
  table later.
- Do not apply the benefit if the target is asleep, dead, gone, AFK/ended in a
  way that ordinary interaction should not reach, or otherwise cannot receive a
  live social action.

## Player-Facing Copy Direction

Use warm, diegetic text rather than raw mechanics.

Possible recipient line:

```text
Привітання торкається вас тихо: дорога на мить здається легшою.
```

Possible sender line:

```text
Ви вітаєте {name}. Здається, ця увага стала їй маленькою опорою.
```

Cooldown / already-inspired line:

```text
Це привітання все одно помічають, але снаги від нього вже не додається: недавнє тепло ще не вивітрилося.
```

Avoid saying `+1 Снага` in ordinary UI. Exact values belong to tuning tests or
scribe/admin/debug surfaces.

## Guardrails

- Do not let greeting become better stamina recovery than rest/food/sleep.
- Do not stack many greetings in a crowd into a large stamina burst.
- Do not let players greet AFK/ended characters for hidden benefits.
- Do not let NPC ambient greeting loops repeatedly feed stamina into nearby
  players unless explicitly designed and cooldowned.
- Keep local social response text compact so this does not spam busy rooms.
- If the effect applies to NPCs later, use the same actor-facing helper rather
  than a player-only special case.

## Acceptance

- A valid greeting can grant a small stamina/ease benefit to the recipient.
- A repeat greeting inside the cooldown still produces ordinary social text but
  does not grant another benefit.
- The cooldown is based on in-world time or daypart, not only real wall-clock
  time.
- AFK/ended/asleep/dead/gone targets do not receive the mechanical benefit.
- Tests cover:
  - first valid greeting benefit;
  - cooldown refusal;
  - cooldown expiry;
  - no benefit for invalid presence/state;
  - no raw numeric benefit text in ordinary player-facing copy.

## Risks

- Social stamina effects can invite farming. Keep numbers low, cooldowns clear
  and logs testable.
- If NPC greetings become common, profession/ambient loops may need their own
  stricter cooldown or no-benefit flag.
- If future morale/comfort systems arrive, this should become one source of
  morale rather than remain a separate stamina-only rule.
