# Apiary And Bumblebee Hazards

## Goal

Apiaries and wild hives should become small living-world pressure points: inspectable places that smell of honey and wax, occasionally hurt the inattentive, and later support honey, wax, bear, offering and settlement-economy loops.

The first MVP uses a location feature rather than a full creature swarm. This keeps the slice small: a player can notice the hive, inspect it, and rarely get stung while moving, looking or waiting nearby.

## First Feature

The first authored apiary is `meadow_old_log_apiary_12_02` in `meadow_12_02`.

It is a `LANDMARK` with `data.apiary === true`, not a new Prisma enum. The JSON metadata stores:

- `apiary_kind`;
- `hazard_key`;
- `aura_radius`;
- passive sting chances and damage ranges;
- passive cooldown;
- night sleeping behavior;
- future hooks for honey, wax and bear loops.

## Passive Sting Rules

Passive bumblebee stings are intentionally rare and rate-limited.

- center location: higher chance, `1-2` HP damage;
- adjacent aura: lower chance, `1` HP damage;
- passive stings do not fire at night when `night_passive_sleeping` is true;
- passive stings never kill in the MVP and clamp the player to at least 1 HP;
- cooldown is stored in `WorldEvent` using `title = "Apiary sting"` and an `apiaryKey=...` marker.

Player-facing copy should stay atmospheric and not say "hazard radius" or expose raw chances.

## Future Work

Honey and wax should not become a generic farmable chest. Future robbery/harvest actions need warning copy, action timing, stronger disturbance stings, stock/cooldown limits and clear anti-grief pacing.

Bear loops should start as signs and constrained behavior, not full combat. A bear may later smell honey, raid an apiary, flee after stings and leave tracks or damaged wax, but this should not turn the starter camp into a bear trap.
