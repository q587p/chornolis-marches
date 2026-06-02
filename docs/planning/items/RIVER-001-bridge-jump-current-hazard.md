---
id: RIVER-001
title: Bridge jump and river-current hazard
status: backlog
type: feature
area: survival
priority: medium
estimate: 1-2h
tags:
  - river
  - bridge
  - movement
  - hazard
  - survival
depends_on:
  - MAP-WILLOW-002
---

# RIVER-001: Bridge Jump and River-Current Hazard

## Goal

Let a player try a risky `jump` / `стрибнути` action from the old bridge or similar high riverbank features, with consequences that feel physical and diegetic instead of acting like a free shortcut.

The first version should make the bridge and river feel dangerous without becoming a full swimming, drowning or water-travel system.

## Scope

- Add a contextual bridge/river jump action only where authored location features allow it.
- Support command aliases such as `/jump`, `jump`, `стрибнути`, and likely target forms like `стрибнути з моста`.
- On success/failure as appropriate, move the character downstream to a strongly lower riverbank / floodplain location.
- Apply serious but survivable consequences for the MVP:
  - low HP;
  - unconscious or incapacitated state if that foundation is available;
  - stamina loss;
  - short atmospheric arrival text about the current carrying them away.
- Make the current destination authored rather than random for the first slice, so it can be tested and balanced.

## Out Of Scope

- No full swimming skill yet.
- No repeatable fast travel by river.
- No broad drowning simulation.
- No underwater map layer.
- No automatic rescue NPC unless a later task adds it deliberately.

## Player-Facing Direction

Example tone:

```text
Вода приймає не м’яко. Течія змикається над головою, міст лишається десь угорі, а берег довго не знаходить вас.

Коли ви приходите до тями, річка вже винесла вас нижче. Життя тримається тонко.
```

If jumping is unavailable:

```text
Тут немає такого краю, з якого стрибок мав би сенс. Річка лиш шумить десь осторонь.
```

## Acceptance Criteria

- `jump` / `стрибнути` near a supported bridge or steep river feature triggers the hazard flow.
- The character is moved to the configured downstream location.
- HP/stamina/incapacitation consequences are applied and visible in the response.
- The action cannot be used as a harmless shortcut.
- Unsupported locations give a clear atmospheric refusal.
- Aliases and `/help` or local feature hints are updated if the action becomes player-facing.
- Focused tests cover supported jump, unsupported jump and the downstream destination.
