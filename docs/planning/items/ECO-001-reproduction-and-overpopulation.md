---
id: ECO-001
title: Reproduction and herbivore overpopulation
status: testing
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

## Implemented in 0.10.0

- Adult rabbits and mice in the same location can produce offspring during world ticks.
- Reproduction uses individual creature records and starts newborns as `CHILD` creatures.
- A successful rabbit breeding event creates a litter of 5-10 offspring.
- Rabbit reproduction is checked every 120 world ticks by default and can create multiple litters in one location when several adult females have access to a mate.
- Rabbit offspring become adults after 240 world ticks by default.
- Available edible resources increase viability; local danger, predator pressure and crowding suppress reproduction.
- Mouse reproduction is checked every 20 world ticks by default; mouse litters are 5-10 offspring and mice reach adult breeding age after about 42 world ticks.
- Crowded rabbit and mouse locations consume `grass`, `berries`, `herbs` and `mushrooms` as overgrazing pressure.
- `grass` is an ecology-only forage resource and is hidden from player gather menus.
- Severe local depletion creates an active `Винищена трава` location feature and slows recovery.
- `meadow_16_05` starts as an exhausted-vegetation test location.
- Overcrowded rabbit locations spread excess non-child rabbits into neighboring cells.
- Rabbit corpses remain for 180 world ticks by default, long enough to observe the aftermath and support future freshening/scavenger loops.
- World tick summaries expose rabbit/mouse births, rabbit/mouse spread, overgrazed locations and resource damage counters.
- The regular seed flow and `/reset` both provide small mixed starter rabbit and mouse populations.
- 0.14.15 stabilizes starter authoring so adult female and adult male groups in the same location remain distinct during repeated seed runs.
- 0.14.15 moves starter rabbit and mouse breeding clusters away from predator start cells and gives those clusters local food-rich resource overrides.
- 0.14.16 extends the population floor for starter mice and rabbits so it can recover when living animals remain but no adult breeding pair is left.
- 0.14.16 lets hungry predators consume safe unclaimed local herbivore corpses before selecting live prey, while still protecting hunter-claimed, player-carried and freshened corpses.

## Remaining follow-up

- Tune reproduction, overgrazing and regeneration numbers after live or simulated observation.
- Add hunger and starvation deaths when herbivores cannot find food.
- Watch whether the 0.14.16 no-pair restoration and scavenging valves reduce early prey dead-ends without making prey pressure explode.
- Watch the 0.14.15 starter food-rich pockets specifically: they give rabbits and mice a fair opening, but can still create a prey boom if predators are delayed, starved elsewhere or removed by players. Track `mouseBirths`, `rabbitBirths`, predator kills, overgrazed locations and resource-damage counters together before raising food or reproduction rates further.
- Restore visible animal movement in a cheaper form: local signs, fresh tracks, aggregated migration notices, `/stat` deltas or opt-in/debug client views, not raw Telegram departure/arrival spam for every animal step.
- Add weather and magic hooks that reduce exhausted-vegetation recovery time.
- Track recent player hunting as an explicit local pressure term instead of relying only on current surviving population.
- Extend the same pattern to other herbivores when their ecosystem role is clearer.

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
- Predator mate-seeking, den/nest preparation, pregnancy or delayed litters.
- Full ecosystem carrying capacity formulas.
- Settlement agriculture damage.

Those can come later after the first ecological loop works.
