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
  - NAV-001
  - ECO-002
---

# NPC-002: Hunter Auto-Program MVP

## Goal

Add a simple NPC hunter behavior that interacts with the same ecological loop as players: seek herbivores, hunt them, collect carcasses/remains, and return to the gate drop-off.

## MVP Loop

1. Hunter starts near the settlement gate.
2. Hunter takes a small hunting bundle from the gate torch stand, currently five unlit torches while the stand is still an infinite feature.
3. Hunter routes to a known magic campfire through ordinary exits and lights the first torch there.
4. Hunter moves from location to location through likely rodent/herbivore pressure areas using existing movement/action systems and ordinary action delays.
5. Hunter looks for a suitable rodent/herbivore target in a configured nearby region/radius.
6. Hunter attacks visible prey through existing delayed combat/corpse routines, then inspects/checks the result before choosing the next target.
7. Hunter collects or claims the carcass/remains.
8. Hunter watches torch lifetime; when the burning torch is close to going out, lights the next torch from the current flame if a spare remains.
9. Hunter returns early when only the last torch remains, or when burden, injury, low stamina, night or no-target conditions say so.
10. Hunter deposits through the same drop-off service as players.

## Guardrails

- Do not affect tutorial/dream regions.
- Do not make the hunter omniscient.
- Do not teleport silently.
- Do not move without a route helper; if no route exists, the hunter should stop or choose another target.
- Do not attack instantly in a tight loop; use the same delayed action pacing expected from auto herbalist behavior.
- Do not steal clearly player-owned carcasses.
- Do not drain beginner-critical torch supply if the gate torch stand later becomes limited stock.
- Nearby players should be able to observe at least some compact local messages.
- Add a small thematic shout/field-line pool for departures, trail choice, returns and deposits, shared conceptually with the later player hunter auto-mode.
- Rate-limit hunter lines and keep them diegetic: no quest-state announcements, no guaranteed-kill boasting and no fixed bounty framing.

## Acceptance

- At least one seeded NPC can run the hunter behavior.
- Hunter can route from the gate to a configured magic campfire and back without teleporting.
- Hunter takes a bounded torch bundle, lights the first torch at the magic campfire and switches to a spare torch before the current flame expires.
- Hunter selects herbivore targets rather than arbitrary creatures.
- Hunter attacks, inspects/checks and continues only through delayed action/combat flow.
- Hunter deposits are counted as NPC contributions, not player rewards.
- Behavior is rate-limited and safe for world ticks.
- Hunter speech is compact, local/visible when possible and drawn from the documented hunting-pressure line pool.

## 0.13.9 Foundation Note

- `NAV-001` now provides route finding for gate-to-campfire and return movement.
- `ECO-002` now exposes an NPC-facing drop-off helper, so hunter deposits can be recorded without inventing a separate counter or player reward path.
- The remaining MVP work is the actual delayed hunter state machine: taking torches, moving by route, choosing prey, attacking through existing action pacing, collecting/claiming remains and returning to the gate.

## 0.13.10 Foundation Note

- Added `src/services/npcHunter.ts` with route-plan helpers for gate-to-magic-campfire and magic-campfire-to-gate movement.
- The helper returns explicit no-route reasons instead of guessing or teleporting.
- The remaining MVP work is now the actual delayed hunter state machine on top of this route plan.

## 0.13.11 State-Machine Slice

- Seeded the first gate hunter NPC, `Лукан`, near the closed settlement gate.
- Added a first `tickNpcHunter()` state-machine slice that:
  - routes the hunter through ordinary exits rather than teleporting;
  - prefers reaching the known magic campfire before the first hunt route;
  - selects visible mice or rabbits, not arbitrary creatures;
  - attacks through the existing delayed creature action queue;
  - marks killed prey as hunter-claimed carcasses instead of leaving ordinary visible corpse spam;
  - returns claimed carcasses to the gate and records them through `recordNpcCarcassDropoffContribution()`.
- Added helper coverage for hunter profession detection, claimed-carcass markers and grouped corpse resource keys.

Remaining work before closing the full MVP:

- model the bounded torch bundle and lit-torch switching as real NPC-held state instead of only planning constants;
- add stronger route/radius tuning for hunting grounds;
- add an inspect/check beat between attack and next decision;
- decide whether hunter-claimed carcasses should ever be recoverable if the hunter dies, disappears or is reset mid-route.
