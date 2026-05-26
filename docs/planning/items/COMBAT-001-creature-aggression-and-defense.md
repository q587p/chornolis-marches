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

- Wolves may attack people when hungry, cornered, protecting territory, or when a player is vulnerable.
- Foxes and smaller predators usually avoid people, but can bite in self-defense when escape fails.
- Future predators should have species-specific aggression, fear and flee thresholds.
- Herbivores should usually flee, but may defend themselves if cornered, wounded, surprised, or near offspring.
- Parent/offspring proximity should matter once animal reproduction creates persistent young in the same area.
- Kills should use the general `Creature.kills` counter, not an animal-only counter.

## Open Questions

- Should aggression be a species profile field, a derived behavior table, or both?
- How should player death/knockout from creatures interact with early respawn?
- Should creature attacks against players be opt-in/debug at first, or live once combat has clearer escape/defense choices?
