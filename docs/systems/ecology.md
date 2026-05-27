# Ecology System

## Goals

The forest should feel alive even when players do nothing.

## Existing Direction

- Individual creature records, not abstract counters.
- Animal aging.
- Corpse lifecycle.
- Rabbit and mouse reproduction and offspring.
- Rabbit and mouse overpopulation pressure on edible resources.
- Ecology-only `grass` resource for ordinary herbivore grazing.
- Visible depleted-vegetation location features.
- Longer animal corpse windows for inspection, freshening and future scavengers.
- Resource regeneration.
- Mushrooms grow from decayed corpses.
- Predator prey choice by age, HP and species preference.
- Predator kill counters in `/stat`.
- Animal hunger pressure and starvation deaths.
- Starvation counters in `/stat` and web `/stat`.
- Individual predator hunting counters for attack attempts, successful attacks and kills.
- Players can interfere with the balance.

## Planned Systems

- Reproduction for herbivores beyond rabbits and mice.
- Migration.
- Richer overpopulation pressure, including region degradation.
- Regional depletion and recovery.
- Weather and magic effects on exhausted vegetation recovery.
- Consequences for overhunting or resource stripping.

## Current Rabbit Loop

- Mixed starter rabbit and mouse populations are seeded in the forest and dry luka.
- During world ticks, adult rabbits in the same location can reproduce if edible resources are available.
- A successful rabbit litter creates 5-10 offspring. Locations can produce more than one litter when several adult females have access to a mate.
- By default, rabbit reproduction is checked every 120 world ticks. This keeps the test loop readable while approximating a three-litters-per-year cadence better than the earlier rapid loop.
- Rabbit offspring become adults after 240 world ticks. With the default 1.5s tick, this is about 6 minutes.
- Predator pressure, local danger and crowding reduce reproduction.
- If more than 13 creatures or player characters are present in one location, that crowd adds a strong dynamic danger bonus for ecology decisions.
- Herbivores react to crowded danger gradually: they do not all flee instantly, but their chance to choose movement rises noticeably while the crowd remains.
- Recent attacks add temporary local danger for ecology decisions. Herbivores become more likely to leave the attacked location for several world ticks.
- Foxes prefer mice, then vulnerable rabbits; wolves prefer rabbits, especially young, old or wounded prey.
- Predator kills leave corpses, reduce predator hunger and are counted in `/stat` next to old-age deaths.
- Predator hunger recovery uses prey food value: mice are light food, rabbit children/old rabbits are partial food, healthy young/adult rabbits are worth more.
- Hungry herbivores are more likely to eat when forage exists and more likely to move when local food is gone or vegetation is exhausted.
- Hungry predators are more likely to search for prey and attack; very hungry predators attack immediately when suitable prey is present.
- Animals that remain above the starvation threshold can die of hunger. Starvation leaves a corpse, cancels pending creature actions, writes an `Animal starved` world event, and appears in ecology statistics.
- Individual animals keep hunting counters, and `/stat` can show the most successful hunters.
- Fox and wolf lifecycle values are deliberately slower than rabbits and mice, so future predator reproduction does not explode as quickly as herbivore reproduction.
- Starter predators now include a fox pair near `forest_07_02`, lone foxes near the dry luka, and a cautious wolf pair in remote `DEEP_FOREST`.
- Predator reproduction runs after small-herbivore ecology and before ordinary carnivore ticks. It uses prey-unit thresholds and very slow wolf checks.
- Fox prey units count mice and rabbits; wolf prey units currently count rabbits while mice are mostly ignored.
- If a location has too many rabbits or mice, they consume `grass`, `berries`, `herbs` and `mushrooms` as background overgrazing.
- Overcrowded rabbit locations spread up to 4 non-child rabbits into neighboring cells every 20 world ticks.
- Rabbit corpses remain for 180 world ticks by default. With the default 1.5s tick, this is about 4.5 minutes.
- World tick summaries and system events report rabbit births, spread and overgrazing pressure for balancing.
- Mice use the same early ecology pattern, but faster: reproduction is checked every 20 world ticks by default, litters are 5-10 offspring, and several adult females can produce litters in the same location.
- Mice reach adult breeding age after about 42 world ticks and have a shorter lifecycle than rabbits.
- `grass` is not shown in player gather menus. It is ordinary forage for animals, not a collected resource.
- `old_bridge_west_span`, `old_bridge_east_span`, the start camp and closed gate have no vegetation resources. `under_bridge_18_05` keeps riverbank vegetation.
- When overgrazing empties all local edible resources, the location gains a visible `Винищена трава` feature and regenerates much more slowly until grass recovers to a visible baseline.
- `meadow_16_05` starts with exhausted vegetation as a visible test case.
- Gatherable berries, herbs and mushrooms now regenerate more slowly than before; exhausted locations regenerate much more slowly.

## Near Follow-Up

- Tune growth rates and resource damage after observation.
- Add an `Оцінити відновлення` inspection action for the `Винищена трава` feature. It should be reachable both from the feature button and from `/examine` aliases such as `/examine grass`, `роздивитися траву` and `оцінити відновлення`, and should describe approximate natural recovery time without exposing exact tick math unless technical details are enabled.
- Tune hunger thresholds, starvation odds and species-specific hunger tolerance after observation.
- Replace direct predator births with a persistent pregnancy/den state when the creature lifecycle model is ready.
- Add weather and magic hooks that can shorten exhausted-vegetation recovery.
- Add explicit recent hunting pressure from players and NPCs.
- Add a first player-accessible prey recovery valve through animal-restoration offerings: hare/mouse statues, carved burrow markers or similar charms can accept berries, herbs or another fitting item, then later create a bounded pair of young prey animals if the local or regional population is dangerously low.
- Add low-prey warnings from Дід Лісовик when rabbits, mice or another core prey species vanish from a region/world. If he is asleep, the warning should read like a dream-mutter heard across the Порубіжжя rather than an active intervention.
- Add species-specific fear and aggression profiles.
- Turn hunting history into animal experience, titles and bounded stat improvements.
- Add creature aggression and defense profiles, including wolves attacking people and herbivores defending offspring or fighting when escape fails.

## Example Consequences

- Too few wolves → too many rabbits.
- Too few rabbits → wolves starve or migrate.
- Too much gathering → forest spirits become active.
- Many corpses → mushrooms and scavengers increase.
