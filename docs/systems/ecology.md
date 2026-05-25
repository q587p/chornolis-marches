# Ecology System

## Goals

The forest should feel alive even when players do nothing.

## Existing Direction

- Individual creature records, not abstract counters.
- Animal aging.
- Corpse lifecycle.
- Rabbit reproduction and offspring.
- Rabbit overpopulation pressure on edible resources.
- Longer animal corpse windows for inspection, freshening and future scavengers.
- Resource regeneration.
- Mushrooms grow from decayed corpses.
- Players can interfere with the balance.

## Planned Systems

- Reproduction for herbivores beyond rabbits.
- Predator priority by age, HP and vulnerability.
- Animal hunger.
- Migration.
- Richer overpopulation pressure, including visible location and region degradation.
- Regional depletion and recovery.
- Consequences for overhunting or resource stripping.

## Current Rabbit Loop

- A small adult rabbit population is seeded in the forest and dry luka.
- During world ticks, adult rabbits in the same location can reproduce if edible resources are available.
- A successful rabbit breeding event creates a litter of 5-10 offspring.
- By default, rabbit reproduction is checked every 40 world ticks. With the default 1.5s tick, this is about once per minute.
- Rabbit offspring become adults after 240 world ticks. With the default 1.5s tick, this is about 6 minutes.
- Predator pressure, local danger and crowding reduce reproduction.
- If a location has too many rabbits, they consume `berries`, `herbs` and `mushrooms` as background overgrazing.
- Overcrowded rabbit locations spread up to 4 non-child rabbits into neighboring cells every 20 world ticks.
- Rabbit corpses remain for 180 world ticks by default. With the default 1.5s tick, this is about 4.5 minutes.
- World tick summaries and system events report rabbit births, spread and overgrazing pressure for balancing.

## Near Follow-Up

- Tune growth rates and resource damage after observation.
- Surface severe overgrazing in location/region descriptions.
- Add explicit recent hunting pressure from players and NPCs.

## Example Consequences

- Too few wolves → too many rabbits.
- Too few rabbits → wolves starve or migrate.
- Too much gathering → forest spirits become active.
- Many corpses → mushrooms and scavengers increase.
