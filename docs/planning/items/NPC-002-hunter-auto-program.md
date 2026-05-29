---
id: NPC-002
title: Hunter auto-program MVP
status: backlog
type: feature
area: npc
priority: medium
estimate: 4-8h
tags:
  - npc
  - ecology
  - hunting
  - living-world
depends_on:
  - ECO-002
---

# NPC-002: Hunter Auto-Program MVP

## Goal

Add a simple NPC hunter behavior that interacts with the same ecological loop as players: seek herbivores, hunt them, collect carcasses/remains, and return to the gate drop-off.

## MVP Loop

1. Hunter starts near the settlement gate.
2. Hunter looks for a suitable herbivore target in a configured nearby region/radius.
3. Hunter moves toward the target using existing movement/action systems.
4. Hunter resolves a minimal hunt using existing combat/corpse routines.
5. Hunter collects or claims the carcass/remains.
6. Hunter returns early when burden, injury, low stamina, night or no-target conditions say so.
7. Hunter deposits through the same drop-off service as players.

## Guardrails

- Do not affect tutorial/dream regions.
- Do not make the hunter omniscient.
- Do not teleport silently.
- Do not steal clearly player-owned carcasses.
- Nearby players should be able to observe at least some compact local messages.
- Add a small thematic shout/field-line pool for departures, trail choice, returns and deposits, shared conceptually with the later player hunter auto-mode.
- Rate-limit hunter lines and keep them diegetic: no quest-state announcements, no guaranteed-kill boasting and no fixed bounty framing.

## Acceptance

- At least one seeded NPC can run the hunter behavior.
- Hunter selects herbivore targets rather than arbitrary creatures.
- Hunter deposits are counted as NPC contributions, not player rewards.
- Behavior is rate-limited and safe for world ticks.
- Hunter speech is compact, local/visible when possible and drawn from the documented hunting-pressure line pool.
