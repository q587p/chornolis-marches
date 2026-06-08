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
- Nocturnal owl predator behavior for early mouse-pressure control.
- A first camp spirit cat foundation: a visible, inspectable, non-speaking spirit in the starter camp, reserved for later camp-local mouse pressure and meat/give scenes.
- Predator and character-caused kill counters in scribe/admin `/stat`, with predator species rows generated from all ordinary animal carnivore species so predators such as owls, hawks or future carnivores do not need a hand-written stats row.
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
- Owls are nocturnal mouse predators. They sleep and hide during the day, canceling pending owl actions, then wake and unhide at dawn, dusk and night. Their current prey preference is deliberately narrow: mice are the primary target, child and young rabbits are weak fallback targets, and adult rabbits or other herbivores are not meaningful owl prey in this first slice.
- Hawks are the first daytime predator-bird counterpart. They wake and remain visible during the `day` window, hide/rest outside it, and use a narrow prey preference for frogs, mice and only very vulnerable rabbit children. This increases daytime bird presence without making birds dominate the ecology.
- Frogs and snakes add a small wet-zone starter layer for `riverbank` and `willow_floodplain`: frogs are seeded/restored prey near wet grass and pools, while snakes add local riverbank/willow predator pressure. Frogs do not yet have their own reproduction/spread loop; this is starter/restoration diversity, not a broad animal AI rewrite.
- The starter camp and starter watchtower are a narrow owl-safe pair for routine behavior: owls should not choose movement into `start_border_camp` or `start_border_watchtower`, and an owl that somehow reaches them leaves if possible or watches instead of hunting. This does not make surrounding camp-edge locations safe.
- Existing owl-sign features have conditional full-examination copy: dusk/night signs carry a stronger "night listener" echo, dawn signs feel like the night has receded, and ordinary day inspection stays quiet. This is local `/examine` atmosphere, not a global omen or a full owl magic system.
- Owl pressure is lightly signposted through local inspectable landmarks: feathers, scratched bark, wing-shadow traces and cut-off mouse trails. These signs use the internal daypart to read differently by day, dawn and night, but they do not send proactive global messages.
- Predator kills leave claimed corpses and are counted in scribe/admin `/stat` next to old-age deaths.
- Carnivores do not recover hunger at kill time. They queue a later `EAT` action for the claimed corpse; if a player, hunter or another flow takes the corpse first, the predator loses that meal and stays hungry.
- Character-caused animal deaths include player kills and non-animal NPC kills, and are counted separately from predator kills in scribe/admin `/stat`, protected web `/stat`, `/stat.json`, and ecology sign technical summaries.
- If a starter animal species disappears entirely from the waking world, the world tick quietly restores its starter living population at starter locations. This includes starter foxes, wolves, owls, hawks and snakes for now. Starter rabbits, mice and frogs can also recover when living animals remain but no adult breeding pair is left. As of `0.16.10`, Дід Лісовик can take one useful missing starter-animal group/location as a physical restoration walk: he travels there through ordinary visible routes, restores that bounded group on arrival, settles briefly, then returns toward his old-forest anchor if no next target is useful. As of `0.16.11`, that target pool includes the region-appropriate frog/hawk/snake starter groups. The older direct population-floor helper remains a fallback when he cannot reserve a useful route/target. This is a population-floor safeguard, not a player-facing notification, quest, reward, full spirit/migration system or broad profession economy, and predator restoration may become a balance/narrative switch later.
- Scribe/admin `/stat`, protected web `/stat` and `/stat.json` show recent and per-species population-floor restoration counts so collapse/recovery tuning can be observed without making the safeguard player-facing. These per-species totals are derived from `WorldEvent` descriptions, so older periods before matching restoration events/species detail are not backfilled.
- Ordinary animals do not use human-authored `UP` exits such as watchtower ladders or climbable trees unless a future route is explicitly marked animal-friendly. `DOWN` remains allowed so older live animals that already reached an upper room can leave. Future burrows, dens or tunnels should use explicit route metadata instead of letting all animals treat every vertical/human passage as natural terrain.
- Predator hunger recovery uses prey food value when the predator actually eats the corpse: mice are light food, rabbit children/old rabbits are partial food, healthy young/adult rabbits are worth more.
- Hungry herbivores are more likely to eat when forage exists and more likely to move when local food is gone or vegetation is exhausted.
- Hungry predators are more likely to search for prey and attack; very hungry predators attack immediately when suitable prey is present.
- Hungry predators can scavenge safe unclaimed local visible herbivore corpses before attacking living prey. Hunter-claimed, player-carried, predator-claimed and freshened corpses remain protected from this ordinary scavenging path. This is local opportunistic scavenging only: scent tracking, pathing toward distant corpses and contested carcasses are future work.
- Hungry predators still attack live prey when no safe corpse is available. Scavenging softens early pressure and helps predators use existing carrion, but it does not remove danger from prey-rich locations.
- Future `ECO-008` records a narrower carrion/stress layer for hungry or stressed prey animals: rabbits/hares may rarely scavenge safe local carrion under strong food shortage and low danger, while mice may scavenge corpses or, under crowding/stress, attack weaker mice. This is deliberately backlog work and should stay rare, guarded and performance-aware.
- Ordinary background creature behavior now runs through a per-world-tick processing budget. Creatures in locations with players, non-animal NPCs and predators are protected first; excess ordinary background animals defer their individual behavior to a later tick while aggregate ecology still runs. At high populations, ordinary background herbivores may therefore move or eat less often; watch `creatureDeferred` in scribe/admin stats.
- Protected creature count may exceed the budget when a player-visible location contains many animals or important actors. That is intentional for local UX, but it means the budget is not a complete fix for dense visible crowds.
- Animals that remain above the starvation threshold can die of hunger. Starvation leaves a corpse, cancels pending creature actions, writes an `Animal starved` world event, and appears in ecology statistics.
- Individual animals keep hunting counters, and scribe/admin `/stat` can show the most successful hunters.
- Fox and wolf lifecycle values are deliberately slower than rabbits and mice, so future predator reproduction does not explode as quickly as herbivore reproduction.
- Starter prey now begins in separated breeding clusters instead of directly on top of predator cells: mice at `forest_03_02` and `meadow_11_04`; rabbits at `forest_04_00` and `meadow_12_04`; frogs at `riverbank_14_01`, `willow_still_pool_15_10` and `willow_frog_pool_17_10`.
- Starter predator pressure remains present but lighter at world start: a fox pair near `forest_07_02`, a young fox at `meadow_13_04`, one remote wolf at `forest_00_08`, four first-pass owls for nighttime mouse pressure, two daytime hawks, and three small wet-zone snakes near riverbank/willow pressure points.
- The starter camp now has one seeded `camp_spirit_cat` unique creature, `Кіт-бережник`. It is modeled as a `SPIRIT`/`SPIRITUAL` being, not an ordinary animal, so ordinary animal age, hunger, starvation and corpse lifecycle do not apply. The first slices make it visible/inspectable, keep ordinary world ticks bounded to the starter camp/watchtower pair, add quiet watch-posture text for mice, night, firelight and the watchtower, let local mice take priority over the cat's ordinary up/down movement, and let a visible live mouse in the same camp/watchtower location trigger a first local pounce through the existing attack queue with cat-specific copy. As of `0.15.11`, a player with raw meat can use the first generic `give` bridge or the cat target button to offer exactly one raw-meat unit to the visible cat. The cat still does not chase prey outside camp, hunt non-mice, count as an ordinary predator species or run autonomous meat-theft scenes. Scribe/admin stats show it through the separate non-animal/special-presence rows instead of the ordinary animal predator table.
- Starter breeding clusters have local food-rich resource overrides so rabbits, mice and wet prey have a real chance to persist before predators find them. These are local authoring pockets, not a global biome-resource increase.
- These food-rich pockets are a balance watchpoint: if predators are delayed, starve elsewhere or are removed by players, the same pockets can produce a prey boom. Use `mouseBirths`, `rabbitBirths`, predator kills, restoration counts, overgrazing and resource-damage counters together when tuning them.
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
- Watch whether no-pair prey restoration and predator scavenging reduce early dead-ends without hiding too much danger from new players. Use the 0.14.17 `/stat` restoration counters to see which species still need repeated intervention. If no-pair restoration causes prey rebound to overshoot, add thresholds/cooldowns before treating it as migration or a visible ecology story.
- Tune the first `Винищена трава` inspection text after observation: account for active grazing/gathering pressure, rain, season, moon/world time and future restoration magic rather than only local grass amount/max and exhausted-location regeneration.
- Tune hunger thresholds, starvation odds and species-specific hunger tolerance after observation.
- Tune `WORLD_CREATURE_TICK_BUDGET` after production observation. If deferred creature counts remain high for long periods, promote the next `PERF-001` slice: aggregate background animal movement/eating instead of only deferring individual actions. Current aggregate ecology remains active, but richer aggregate movement/eating is still future work.
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
