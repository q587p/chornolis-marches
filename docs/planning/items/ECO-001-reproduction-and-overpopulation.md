---
id: ECO-001
title: Reproduction and herbivore overpopulation
status: next
type: feature
area: ecology
priority: high
tags:
  - ecology
  - reproduction
  - herbivores
  - rabbits
  - resources
  - world-reactivity
depends_on:
  - ECO-BASE
exports:
  github_issue: true
---

# ECO-001: Reproduction and herbivore overpopulation

## Goal

Add reproduction as an early living-world priority.

Animals should not only age, die and leave corpses. Herbivores, starting with rabbits, should reproduce when conditions allow it. If predators are absent or players remove them, herbivore populations should grow too quickly and become a threat to the forest.

## Why it fits

This supports the core Chornolis Marches idea of a living ecosystem.

The player should be able to create problems by “solving” other problems:

- killing wolves may make travel safer for a while;
- but without wolves, rabbits can overpopulate;
- too many rabbits eat herbs, berries and young growth;
- the forest becomes poorer, stranger or more vulnerable.

## First scope

- Rabbits can reproduce if there are enough living adults in the same region or nearby cells.
- Reproduction chance depends on:
  - adult population;
  - available food;
  - local danger;
  - predator pressure;
  - recent player hunting.
- Predator pressure from wolves, foxes or other hunters suppresses runaway growth.
- Herbivore overpopulation consumes herbs, berries and other edible resources.
- Severe overpopulation can create world events and visible location/region changes.

## Possible mechanics

### Population pressure

Each region can estimate herbivore pressure from nearby living herbivores.

High pressure means:

- faster resource depletion;
- lower resource regeneration;
- increased chance of “overgrazed” events;
- possible migration to nearby cells.

### Predator pressure

Predator pressure reduces reproduction and increases herbivore mortality.

If predator pressure is too low:

- reproduction chance rises;
- herbivores spread more aggressively;
- resource damage increases.

### Human intervention

Players can affect balance by:

- hunting rabbits;
- killing predators;
- protecting predators;
- overharvesting resources;
- possibly setting traps or managing settlements later.

## Example world events

```text
Зайці розплодилися на узліссі. Молоді пагони обгризені майже до землі.
```

```text
У місцях, де раніше траплялися вовчі сліди, тепер тихо. Зате кущі ворушаться від зайців.
```

```text
Трави тут стало помітно менше. Схоже, дрібні травоїдні об’їдають усе швидше, ніж ліс устигає відновитись.
```

## Not in first implementation

- Full genetics.
- Detailed mating pairs.
- Complex seasonal breeding.
- Full ecosystem carrying capacity formulas.
- Settlement agriculture damage.

Those can come later after the first ecological loop works.
