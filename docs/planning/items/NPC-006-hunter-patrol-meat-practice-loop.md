---
id: NPC-006
title: Hunter patrol and meat practice loop
status: next
type: feature
area: npc
priority: high
estimate: 4-8h
tags:
  - npc
  - hunting
  - cooking
  - freshening
  - observation-learning
  - living-world
depends_on:
  - NPC-002
  - NPC-005
  - PROG-002
---

# NPC-006: Hunter Patrol and Meat Practice Loop

## Goal

Give settlement hunters a useful, observable routine when the gate carcass-dropoff loop does not currently need more carcasses.

Hunters should not get stuck forever between "the drop-off accepts carcasses" and "hunter is resting/standing down". When the settlement has no urgent need, hunters can still do ordinary work around the campfire, meadow edge and nearby forest: patrol, hunt a little, freshen carcasses, cook meat and build a small food reserve.

This should make the world feel alive while also creating safe moments for players to watch and learn freshening/cooking without requiring a formal tutorial room.

## First Scope

- Add a hunter stand-down fallback routine separate from the urgent gate-hunting loop.
- Let eligible hunters periodically choose a short patrol route around the settlement fire, bridge, meadow edge and nearest forest cells.
- Let hunters hunt only small suitable prey in that patrol area, with ordinary action delays and route movement.
- Let hunters freshen a suitable fresh corpse and turn it into raw meat when they are near a safe work point.
- Let hunters cook raw meat at a real campfire or magic campfire, then store or eat the result depending on hunger/reserve state.
- Keep local observer messages compact, visible and rate-limited:
  - hunter leaves the fire toward the edge;
  - hunter returns with prey or empty-handed;
  - hunter freshens a corpse;
  - hunter cooks meat.
- Record observation-learning sources for visible hunter freshening and cooking actions so players can improve by watching.

## Guardrails

- Do not run this routine when the urgent gate carcass-dropoff loop is actively calling for prey.
- Do not make hunters kill every animal in beginner-adjacent locations; use cooldowns, caps and local pressure checks.
- Do not create fixed bounty or quest-completion framing.
- Do not make hunters drain player-owned corpses or food.
- Do not bypass route finding or action delays.
- Do not spam local chats; repeated patrol/cooking lines should collapse into sparse, diegetic messages.
- If the hunter is wounded, exhausted, hungry or out of light, they should prefer rest, food or return-to-fire behavior over another patrol.
- If the patrol cannot find a route or safe target, the hunter should return to waiting/resting instead of retrying every tick.

## Acceptance

- A hunter in stand-down can leave the campfire, patrol a small configured radius and return without teleporting.
- If small prey is available in the patrol area, the hunter can hunt through the existing delayed action flow.
- If the settlement does not currently need carcasses, the hunter can freshen/cook some prey into meat instead of depositing every carcass.
- Meat reserve/eating behavior reuses ordinary actor food assumptions where practical.
- Players nearby can observe freshening and cooking actions and receive learning credit through the existing observation-learning bridge.
- The urgent gate-hunting loop can still reactivate later and take priority over ordinary patrol.
- Tests cover at least:
  - stand-down hunter chooses patrol instead of remaining permanently resting;
  - urgent carcass-dropoff demand suppresses ordinary meat-practice patrol;
  - freshening/cooking observer source is recorded;
  - cooldown/rate limit prevents repeated local message spam.

## Notes

This is deliberately a near-term follow-up, not part of the current 0.13.20 polish PR. It should probably land after the stuck-state fix around hunter stand-down and after the NPC food behavior shape is clear enough to avoid inventing a parallel meat inventory.

Route-finding tests only prove that the map path exists. Before treating this as complete, watch live hunter behavior under real action-queue timing: movement, returning for torches, hunting, resting, freshening and cooking should feel natural rather than like a route solver stepping through a checklist.
