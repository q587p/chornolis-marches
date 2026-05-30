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
- Predator and character-caused kill counters in scribe/admin `/stat`.
- Animal hunger pressure and starvation deaths.
- Starvation counters in scribe/admin `/stat` and protected web `/stat`.
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
- Predator kills leave claimed corpses and are counted in scribe/admin `/stat` next to old-age deaths.
- Carnivores do not recover hunger at kill time. They queue a later `EAT` action for the claimed corpse; if a player, hunter or another flow takes the corpse first, the predator loses that meal and stays hungry.
- Character-caused animal deaths include player kills and non-animal NPC kills, and are counted separately from predator kills in scribe/admin `/stat`, protected web `/stat`, `/stat.json`, and ecology sign technical summaries.
- If a starter animal species disappears entirely from the waking world, the world tick quietly restores its starter living population at starter locations. This is a population-floor safeguard, not a player-facing notification or full spirit/migration system.
- Predator hunger recovery uses prey food value when the predator actually eats the corpse: mice are light food, rabbit children/old rabbits are partial food, healthy young/adult rabbits are worth more.
- Hungry herbivores are more likely to eat when forage exists and more likely to move when local food is gone or vegetation is exhausted.
- Hungry predators are more likely to search for prey and attack; very hungry predators attack immediately when suitable prey is present.
- Animals that remain above the starvation threshold can die of hunger. Starvation leaves a corpse, cancels pending creature actions, writes an `Animal starved` world event, and appears in ecology statistics.
- Individual animals keep hunting counters, and scribe/admin `/stat` can show the most successful hunters.
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
- The `Винищена трава` feature can be inspected from its button or through `/examine grass`, `/examine depleted grass`, `роздивитися траву`, `оцінити траву` and `оцінити відновлення`. The player-facing text gives a rough natural-recovery read; exact grass amounts, thresholds and tick timing are shown only when technical details are enabled.

## Near Follow-Up

- Tune growth rates and resource damage after observation.
- Tune the first `Винищена трава` inspection text after observation: account for active grazing/gathering pressure, rain, season, moon/world time and future restoration magic rather than only local grass amount/max and exhausted-location regeneration.
- Tune hunger thresholds, starvation odds and species-specific hunger tolerance after observation.
- Replace direct predator births with a persistent pregnancy/den state when the creature lifecycle model is ready.
- Add weather and magic hooks that can shorten exhausted-vegetation recovery.
- Add explicit recent hunting pressure from players and NPCs.
- Add a first player-accessible prey recovery valve through animal-restoration offerings: hare/mouse statues, carved burrow markers or similar charms can accept berries, herbs or another fitting item, then later create a bounded pair of young prey animals if the local or regional population is dangerously low.
- Add low-prey warnings from Дід Лісовик when rabbits, mice or another core prey species vanish from a region/world. If he is asleep, the warning should read like a dream-mutter heard across the Порубіжжя rather than an active intervention.
- Дід Лісовик should not react to artificial carried/fuel resources such as torches or twigs disappearing from seed/resource nodes; his depletion warnings are for natural/ecological resources.
- Add species-specific fear and aggression profiles.
- Turn hunting history into animal experience, titles and bounded stat improvements.
- Add creature aggression and defense profiles. Hungry wolves or foxes may attack player characters when hunger is severe enough, but fed predators should prefer avoidance unless self-defense or offspring defense applies. Parents near persistent young may attack preventively or hold ground, and herbivores may defend offspring or fight when escape fails.

## Example Consequences

- Too few wolves → too many rabbits.
- Too few rabbits → wolves starve or migrate.
- Too much gathering → forest spirits become active.
- Many corpses → mushrooms and scavengers increase.
