---
id: ECO-008
title: Herbivore carrion and mouse cannibalism pressure
status: backlog
type: feature
area: ecology
priority: medium
estimate: 3-6h
tags:
  - ecology
  - creatures
  - hunger
  - carrion
  - mice
  - rabbits
depends_on:
  - ECO-001
  - FOOD-003
  - PERF-001
---

# ECO-008: Herbivore Carrion and Mouse Cannibalism Pressure

## Goal

Add a guarded, rare scavenging and stress-aggression layer for small prey animals once the ecology/performance foundation can support it.

This should make starving or stressed animals feel less like pure plant-eating scripts without turning rabbits or mice into ordinary carnivores.

## Real-World Basis

Keep this inspired by real animal behavior, not a blanket rule:

- Hares/rabbits are mainly herbivorous, but snowshoe hares have been documented scavenging carrion, including other hares, birds and even lynx, especially in harsh winter/food-limited contexts.
- Mice are more omnivorous and opportunistic than rabbits. Wild-mouse diet and flesh-eating/cannibal behavior support a narrow carrion/cannibalism model, especially under scarcity, crowding, stress or protein pressure.
- Cannibalism and aggression should be treated as stress/shortage behavior, not as a normal calm feeding loop.

## First Scope

- Let very hungry rabbits/hares rarely scavenge a local unclaimed corpse only when:
  - local plant forage is missing or very poor;
  - no active predator is nearby;
  - no recent character/NPC attack danger is present in the location;
  - the corpse is fresh enough and not player-carried, hunter-claimed, predator-claimed or already freshened.
- Prefer small rodent corpses first. Consider whether predator corpses are allowed only after a separate evidence/tone review; if allowed, make it rarer and riskier.
- Let hungry mice scavenge local corpses, with separate weighting for:
  - herbivore/rodent corpses;
  - other mouse corpses;
  - predator corpses, if accepted later.
- Let high-stress mouse locations sometimes produce mouse-on-mouse aggression:
  - stress sources can include overcrowding, recent attacks, exhausted forage, high danger or too many mice in one location;
  - weakest targets should be preferred first: child, young, very old, wounded or lower-HP mice;
  - if the attacker is hungry, it may later eat the corpse;
  - if the trigger is stress without hunger, it can leave the corpse behind.
- Keep all of this low-frequency and budget-aware so it does not add many individual actions in dense mouse locations.

## Guardrails

- Do not make this player-facing as "rabbits are carnivores." Use local, unsettling event text only when a player can witness it.
- Do not let ordinary herbivores eat clearly player-owned or hunter-claimed carcasses.
- Do not let this bypass the carcass drop-off, freshening or predator-claimed corpse rules.
- Do not make mouse cannibalism a primary population-control mechanism until `PERF-001` aggregate behavior can absorb dense populations safely.
- Prefer aggregate/background resolution for offscreen dense groups; use individual queued actions only for visible/player-nearby scenes.

## Acceptance

- A starving rabbit/hare can very rarely choose a safe local corpse meal when plant food is gone and danger is low.
- Hungry mice can scavenge appropriate local corpses under shortage pressure.
- Stressed, overcrowded mice can rarely attack weaker mice, with hunger deciding whether the result becomes a meal or just a corpse.
- Player-visible text stays atmospheric, sparse and non-spammy.
- Scribe/admin ecology stats can distinguish ordinary predator kills from mouse stress kills if the behavior becomes common enough to tune.
- Focused tests cover:
  - rabbit/hares refusing carrion when predators or recent attack danger is present;
  - rabbit/hares using carrion only under strong hunger/food shortage;
  - mice preferring weaker same-species targets under stress;
  - hungry mouse post-kill eating versus non-hungry stress kill leaving a corpse;
  - protection of player-carried, hunter-claimed, predator-claimed and freshened corpses.

## Later Direction

- Tie carrion/cannibalism risk to season, the future 365/366-day calendar anomalies, harsh winter circles or dangerous omens.
- Add disease/spoilage risks if animals eat old or predator-tainted carrion.
- Let ravens, foxes, owls, hawks, cats and other scavengers compete for carrion once contested-corpse rules exist.
- Let players notice indirect signs: gnawed bones, missing mouse corpses, disturbed fur or odd tracks around exhausted forage.

## Non-Goals

- Full omnivore diet simulation for rabbits/hares.
- New predator species or hunting mechanics.
- New corpse ownership schema.
- Immediate live-world tuning before queue/performance safeguards are ready.
