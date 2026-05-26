---
id: PROG-003
title: Animal experience and titles
status: backlog
type: feature
area: progression
priority: medium
tags:
  - animals
  - ecology
  - progression
  - combat
depends_on:
  - PROG-002
---

# Animal experience and titles

## Goal

Let individual animals become noticeably more dangerous or capable through repeated survival, hunting and movement.

## Direction

- Use existing creature counters such as `attackAttempts`, `successfulAttacks`, `kills`, `steps`, `looks` and age.
- Derive soft titles from accumulated history: `досвідчена лисиця`, `материй вовк`, `старий слідопит` and similar.
- Improve animals carefully: small HP, strength, agility, perception or instinct bonuses should depend on species and role.
- Keep bonuses bounded so old successful predators feel memorable without becoming unkillable.
- Expose this through inspection text and ecology stats before making it affect combat heavily.

## Open Questions

- Should titles be stored on `Creature`, derived at read time, or both?
- Should bonuses be permanent stat changes, temporary modifiers, or a separate skill profile?
- Can players learn tracking/hunting by observing experienced animals?
