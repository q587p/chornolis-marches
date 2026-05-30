---
id: NPC-002
title: Hunter auto-program MVP
status: backlog
type: feature
area: npc
priority: high
estimate: 4-8h
tags:
  - npc
  - ecology
  - hunting
  - living-world
depends_on:
  - NAV-001
  - ECO-002
  - NPC-004
  - NPC-005
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
- Do not ignore hunter hunger forever; a hungry hunter should be able to stand down from hunting work to process, cook or eat food once shared NPC food behavior exists.
- Nearby players should be able to observe at least some compact local messages.
- Add a small thematic shout/field-line pool for departures, trail choice, returns and deposits, shared conceptually with the later player hunter auto-mode.
- Rate-limit hunter lines and keep them diegetic: no quest-state announcements, no guaranteed-kill boasting and no fixed bounty framing.
- Respect future gate-hunting saturation: if the settlement sign says enough for now, hunters should stop seeking new rodents/herbivores for this loop and switch to waiting/resting behavior.

## Acceptance

- At least one seeded NPC can run the hunter behavior.
- Hunter can route from the gate to a configured magic campfire and back without teleporting.
- Hunter takes a bounded torch bundle, lights the first torch at the magic campfire and switches to a spare torch before the current flame expires.
- Hunter selects herbivore targets rather than arbitrary creatures.
- Hunter does not select child animals; if several suitable prey are visible in the same location, preferred order is adult, old, then young.
- Hunter attacks, inspects/checks and continues only through delayed action/combat flow.
- Hunter deposits are counted as NPC contributions, not player rewards.
- Behavior is rate-limited and safe for world ticks.
- Hunter speech is compact, local/visible when possible and drawn from the documented hunting-pressure line pool.
- When gate-hunting saturation is active, hunter speech switches to a distinct stand-down/waiting line pool and the hunter rests instead of continuing the hunt loop.

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
- Seeded a second hunter NPC, `Орина`, near the forest edge as a returning-from-the-field case with one visible lit torch and one spare torch represented by the lightweight hunter bundle marker.
- Added a first `tickNpcHunter()` state-machine slice that:
  - routes the hunter through ordinary exits rather than teleporting;
  - prefers reaching the known magic campfire before the first hunt route;
  - selects visible mice or rabbits, not arbitrary creatures;
  - skips child animals and prefers adult prey before old prey, then young prey;
  - attacks through the existing delayed creature action queue;
  - marks killed prey as hunter-claimed carcasses instead of leaving ordinary visible corpse spam;
  - returns claimed carcasses to the gate and records them through `recordNpcCarcassDropoffContribution()`.
- Added helper coverage for hunter profession detection, claimed-carcass markers and grouped corpse resource keys.
- Added a narrow ground-torch pickup step: if the hunter notices `torch` or `lit_torch` on the ground, he can take it toward the current hunting bundle before continuing.
- Added a return-for-torches marker so a hunter with low field supply can route back to the gate while still attacking visible local prey on the way.
- 0.13.18 hardens the current claimed-carcass bridge: ordinary corpse decay preserves the `claimed_by_hunter:<id>` marker, so returning hunters do not lose field kills before the drop-off service can see them.
- 0.13.18 also routes direct hunter field lines through a shared speech helper so visible hunter speech records a `SAY` event and increments the creature `says` counter used by ecology/status statistics.
- 0.13.18 formats hunter field speech as quoted speech in Telegram, but the helper still emits those field lines directly instead of routing every such line through a real queued `SAY` action.

Remaining work before closing the full MVP:

- model the bounded torch bundle and lit-torch switching as real NPC-held state instead of only planning constants; this is now high-priority because hunters should move toward the same inventory/light rules as players;
- replace the current lightweight ground-torch pickup marker with real NPC-held item state, including lit-torch lifetime preservation and real light emission;
- let hunters craft torches later if they have gathered the required resources;
- add stronger route/radius tuning for hunting grounds;
- route all hunter field speech through ordinary queued `SAY` actions once that can be done without reintroducing world-tick spam or stand-down loops;
- respect `ECO-003` saturation so hunters can stand down and rest near the magic campfire when more rodent/herbivore pressure is not needed;
- respect `NPC-005` hunger behavior so hunters sometimes freshen/butcher suitable corpses, cook meat at a real campfire and eat instead of continuing the loop;
- add an inspect/check beat between attack and next decision;
- replace hunter-claimed carcasses with real carried/claimed actor state instead of `Creature.currentAction`; the 0.13.18 decay-preservation fix is only a bridge and still needs death, interrupt, disappearance and reset semantics;
- decide whether hunter-claimed carcasses should ever be recoverable if the hunter dies, disappears or is reset mid-route;
- add hunter rate limits if the world grows beyond the current tiny seeded set. Two seeded hunters are acceptable without extra throttling, but high-density worlds with many hunters may need caps on hunt decisions, route retries, attacks, pickups, deposits and field lines per tick.
- add keyword-aware hunter conversation replies: the current reply-mode pool is intentionally abstract, but future hunters should recognize simple words around hunting, gates, torches, carcass drop-off, danger and route hints, then answer with useful information or point toward nearby ecological tasks without turning into a formal quest giver.
- expand profession-aware social reactions carefully: the first hunter slice can answer fitting directed signals such as nod, wave, smile and bow, but later hunters should react differently when busy, wounded, returning with prey or standing down at saturation.

Verification notes for the next hunter slices:

- Claimed carcasses still use a lightweight marker in `Creature.currentAction`, though 0.13.18 preserves that marker through ordinary corpse decay. This is acceptable as a bridge, but explicitly test death, interrupt, disappearance and reset paths when replacing or extending the marker flow.
- Any high-density hunter test should check that the loop does not flood the action queue, deposit service, local messages or `WorldEvent` rows once more hunters are seeded.
