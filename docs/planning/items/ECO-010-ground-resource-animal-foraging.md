---
id: ECO-010
title: Ground resource animal foraging
status: backlog
type: feature
area: ecology
priority: medium
tags:
  - animals
  - ecology
  - hunger
  - resources
  - food
depends_on:
  - ECO-001
  - PERF-001
---

# ECO-010: Ground Resource Animal Foraging

## Goal

Let animals treat some loose ground resources as food when that makes ecological sense, starting with predators eating visible raw meat on the ground.

This should be a living-world behavior, not a player reward, bait minigame, economy loop or full diet simulator.

## First Scope

- Hungry predators may eat safe, visible local `raw_meat` from the ground when they notice it.
- Use the same ownership/safety caution as corpse scavenging:
  - no player inventory access;
  - no hunter-claimed, predator-claimed or special protected food source bypass;
  - no remote scent pathing in the first pass;
  - no hidden-location or protected tutorial/dream leakage.
- Prefer a small `EAT` action or existing creature action path so the behavior is visible when a player is nearby and cheap when offscreen.
- Reduce predator hunger only when the meat is actually consumed.
- Keep local text sparse and grounded: a fox, wolf, owl, hawk or snake noticing meat should feel like opportunistic feeding, not a quest hook.

## Research-Gated Food Checks

Before implementing beyond `raw_meat`, check real-world diet plausibility and write down the accepted species/resource mapping:

- `berries`:
  - plausible for some omnivores and many birds, but not for every predator;
  - decide whether foxes, mice, bears/future species, or birds can use them.
- `mushrooms`:
  - check which local-feeling animals plausibly eat fungi;
  - avoid making mushrooms a generic food for predators without evidence.
- `honey`:
  - likely belongs first to bear/apiary follow-ups and possibly small opportunistic theft scenes;
  - decide whether any current animals should eat loose honey before `APIARY-004` / bear work exists.

## Guardrails

- Do not implement broad animal inventory, resource economy, bait traps, professions or combat changes in this slice.
- Do not let animals consume beginner-critical supplies in starter/tutorial locations without an explicit safety rule.
- Do not make every loose food vanish quickly. Consumption should be hunger-gated, occasional and bounded.
- Do not add new Prisma schema or migrations for the first pass.
- Keep raw meat on the ground distinct from corpses and freshening remains; corpse scavenging belongs to existing carrion tasks.

## Acceptance Notes

- A hungry eligible predator in the same location as visible loose `raw_meat` can choose to eat one bounded amount.
- A non-hungry predator or an ineligible species ignores the ground meat.
- Player-carried food remains untouched by this task; carried raw-meat danger belongs to `COMBAT-003`.
- Berries, mushrooms and honey either remain explicitly out of scope or have documented species/resource mappings backed by a short research note.
- Tests cover:
  - predator raw-meat eligibility;
  - no player inventory consumption;
  - no protected/tutorial consumption;
  - bounded hunger recovery;
  - berries/mushrooms/honey mapping decisions or explicit deferral.

## Follow-Ups

- Future bait/trap mechanics can use this only after trap, scent and ownership rules exist.
- Bear honey behavior should stay in `APIARY-004` unless that task deliberately extracts a shared honey-foraging helper.
- If item instances or spoilage land first, revisit whether old/spoiled meat attracts different animals or creates sickness risk.
