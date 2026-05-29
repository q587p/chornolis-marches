---
id: COMBAT-001
title: Creature aggression and defense
status: backlog
type: feature
area: combat
priority: medium
tags:
  - animals
  - combat
  - predators
  - ecology
depends_on:
  - PROG-003
---

# Creature aggression and defense

## Goal

Allow creatures to attack players and defend themselves in ways that fit their species, fear, hunger and situation.

## Direction

- Hungry wolves and foxes may independently choose to attack player characters when hunger is severe enough and the situation looks viable.
- Fed or only mildly hungry wolves and foxes should not randomly attack people as ordinary ambient behavior.
- Wolves and foxes may still attack in self-defense if attacked, cornered, trapped, wounded, or unable to flee.
- If persistent young / offspring are nearby, a parent predator may attack preventively or hold ground to protect them instead of waiting for a direct hit.
- Wolves may attack people when hungry, cornered, protecting territory or offspring, or when a player is vulnerable.
- Foxes and smaller predators usually avoid people, but can bite in self-defense or when protecting offspring and escape fails.
- Future predators should have species-specific aggression, fear and flee thresholds.
- Herbivores should usually flee, but may defend themselves if cornered, wounded, surprised, or near offspring.
- Parent/offspring proximity should matter once animal reproduction creates persistent young in the same area.
- Kills should use the general `Creature.kills` counter, not an animal-only counter.

## Acceptance Notes

- A hungry predator can schedule or immediately perform a player attack only when its hunger/aggression profile allows it.
- A non-hungry predator near a player should prefer avoidance, watching, fleeing, or ordinary ecology behavior unless self-defense or offspring defense applies.
- The first implementation should make the reason visible in technical/admin logs, for example `hungry_predator`, `self_defense`, or `protecting_offspring`, without over-explaining hidden numbers in player-facing text.
- Player-facing attack messages should make the behavior feel grounded in the world: hunger, being cornered, or protecting young, not generic random hostility.

## Open Questions

- Should aggression be a species profile field, a derived behavior table, or both?
- How should player death/knockout from creatures interact with early respawn?
- Should creature attacks against players be opt-in/debug at first, or live once combat has clearer escape/defense choices?
