# Apiary And Bumblebee Hazards

## Goal

Apiaries and wild hives should become small living-world pressure points: inspectable places that smell of honey and wax, occasionally hurt the inattentive, and later support bear, offering and settlement-economy loops.

The MVP uses a location feature rather than a full creature swarm. This keeps the slice small: a player can notice the hive, inspect it, rarely get stung while moving, looking or waiting nearby, or deliberately risk disturbing it for honey.

## First Feature

The first authored apiary is `meadow_old_log_apiary_12_02` in `meadow_12_02`.

It is a `LANDMARK` with `data.apiary === true`, not a new Prisma enum. The JSON metadata stores:

- `apiary_kind`;
- `hazard_key`;
- `aura_radius`;
- passive sting chances and damage ranges;
- passive cooldown;
- night sleeping behavior;
- active raid cooldown, success, wax, damage and reward metadata;
- future hooks for bear loops.

## Passive Sting Rules

Passive bumblebee stings are intentionally rare and rate-limited.

- center location: higher chance, `2-3` HP damage;
- adjacent aura: lower chance, `1` HP damage;
- passive stings do not fire at night when `night_passive_sleeping` is true;
- passive stings never kill in the MVP and clamp the player to at least 1 HP;
- passive cooldown is one default in-game hour;
- cooldown is stored in `WorldEvent` using `title = "Apiary sting"`, an `apiaryKey=...` marker and `absoluteMinute=...`.

Player-facing copy should stay atmospheric and not say "hazard radius" or expose raw chances.

`WorldEvent` cooldown is acceptable for the MVP, but pruning old `Apiary sting`
events can erase cooldown memory earlier than intended. The passive sting check
also reads `getCurrentWorldTimeSnapshot()`, so it can advance the world clock in
the same way as other current world-time reads; future hazard systems should
decide whether they want that coupling or a read-only snapshot path.

## Active Hive Robbery

`0.15.20` adds the first deliberate apiary raid action through `RAID_APIARY`.

- typed routes include `/search_honey`, `/search_beeswax`, `search honey`, `взяти мед`, `шукати мед`, `обібрати вулик`, `пограбувати бортю` and `добути віск`; legacy `/gather_honey` and `/gather_beeswax` routes may remain for old links, but player-facing copy should prefer `search`, because the action targets a location feature rather than a free location resource;
- the action only works at the active apiary center, not in the passive aura;
- deliberate robbery wakes the swarm even at night;
- success grants a small amount of `honey`, with a smaller chance of `beeswax`;
- failure grants nothing;
- the raid uses stronger sting damage than passive stings and still clamps the player to at least 1 HP;
- cooldown is stored in `WorldEvent` using `title = "Apiary raid"`, an `apiaryKey=...` marker and `absoluteMinute=...`, so the same hive cannot be farmed repeatedly but does reopen by in-world time instead of real wall-clock time.

Honey and beeswax are resources for inventory/storage and future systems. They are not yet a full food/remedy/crafting economy, and `0.15.20` should be treated as the first harvest endpoint rather than a reason to open a broad apiary/economy loop immediately.

Operational watchpoints:

- `RAID_APIARY` is a Prisma enum migration. Production deploys must apply migrations before the new bot runtime handles queued raid actions. If rollback is needed after PostgreSQL sees the enum value, prefer reverting runtime use and leaving the unused enum value in place unless a deliberate enum rebuild is planned.
- The current completion path applies raid reward/damage/event side effects before stamina spend. Keep that in mind if future stamina handling becomes a validation gate instead of post-completion bookkeeping.
- `/search_beeswax` does not guarantee wax. It invokes the same raid as `/search_honey`; honey is the success reward and beeswax is an additional chance.
- Events created before the `absoluteMinute` marker existed are treated as expired for cooldown purposes. This deliberately unblocks live hives that could otherwise stay unavailable until a long real-time cooldown passed.

Future disturbed-hive tuning:

- After an apiary is disturbed, lingering nearby should become sharply more dangerous for a while.
- During that disturbed period, passive sting chance can rise as high as `930` promille and damage should be stronger than ordinary passive stings, so players feel pressure to leave the location and recover.
- Player-facing copy should not expose those numbers. Use a distinct atmospheric warning that the bees are no longer simply guarding the hollow, the air has become hostile, and stepping away may be wiser than staying under the swarm's anger.

Future fire interaction:

- Decide how active campfires, smoke and carried lit torches affect bumblebee behavior before implementing a generic fire modifier.
- Campfire smoke might later calm or redirect the swarm, while a carried torch too close to the hollow might read as a threat and make the bees strike harder.
- Player-facing text should teach the difference through smell, smoke, wing-noise and distance rather than saying "fire bonus" or "sting modifier".

## Future Work

Bear loops should start as signs and constrained behavior, not full combat. A bear may later smell honey, raid an apiary, flee after stings and leave tracks or damaged wax, but this should not turn the starter camp into a bear trap.

Honey and wax should not become a generic farmable chest. Future passes can add uses, offerings, crafting and economy hooks, but each should keep stock/cooldown and anti-grief pacing.

Keep these follow-ups behind the learning/observation foundation: the next active `0.15` work should return to attention, signs, traces and first learning moments.
