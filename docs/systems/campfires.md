# Campfires

Campfires are part of the Chornolis fire/light survival loop. They are location features, not loose ground resources.

## Current player-made campfire MVP

As of `0.15.7`, a player can build an ordinary handmade campfire from carried `twigs`.

Rules:

- Building costs `twigs ×5`.
- The built feature is a `LocationFeature` of type `CAMPFIRE`.
- The initial player-facing name is `Складене вогнище`.
- A prepared campfire has `providesLight = false`.
- Prepared data includes `is_campfire`, `handmade`, `created_by: "player"`, `createdByPlayerId`, `prepared`, `unlit`, `fuelTwigs` and `builtAtMinute`.
- A prepared campfire can be lit from a carried `lit_torch`.
- Once lit, it becomes an ordinary timed campfire and uses the same local light path as existing campfires.
- Active handmade ordinary campfires can be doused.
- Prepared or extinguished handmade ordinary campfires can be dismantled.
- Dismantling returns fewer `twigs` than the build cost; older ash returns less.
- A location can have at most three active handmade ordinary campfires.

Magic campfires, seeded lore campfires and old authored campfire memories are not dismantlable unless future data explicitly marks them as player-made.

## Wet locations

The MVP uses `CellLocation.biome` as the wetness signal.

Wet biomes:

- `RIVER`
- `SWAMP`

Wet locations do not block building. Instead, the build button asks for confirmation first, and the resulting feature stores:

- `wetPenalty: true`
- `wetBiome: "RIVER" | "SWAMP"`

When lit, wet handmade campfires burn for a shorter duration:

- `RIVER`: about 30% of ordinary campfire duration.
- `SWAMP`: about 20% of ordinary campfire duration.

This is intentionally simple. Later weather, shelter, fuel quality and terrain-specific dryness can refine the same helper instead of scattering wetness checks through handlers.

## UI surface

Inventory:

- Opening or inspecting `twigs` can show `🪵 Скласти вогнище` when the player carries at least five.
- With fewer than five `twigs`, the resource inspection explains the missing amount instead of showing a dead action.
- Existing `🪵 Підкинути хмиз` behavior remains for nearby campfires that can accept fuel.

Feature inspection:

- Prepared/unlit campfire: `🔥 Підпалити` when the player has a lit torch, plus `🧹 Розібрати`.
- Active handmade campfire: existing rest/cook/torch/add-twigs buttons, plus `🫗 Погасити`.
- Extinguished handmade campfire: existing add-twigs/light buttons, plus `🧹 Розібрати`.
- Magic/special campfires: no douse/dismantle buttons.

Text commands:

- `/build_campfire`, `build campfire`, `make fire`, `скласти вогнище`, `розкласти вогнище`.
- `/light_campfire`, `light campfire`, `підпалити вогнище`, `розпалити вогнище`.
- `/douse_campfire`, `douse campfire`, `put out campfire`, `погасити вогнище`, `загасити вогнище`.
- `/dismantle_campfire`, `dismantle campfire`, `розібрати вогнище`, `прибрати вогнище`.

The no-target text commands choose the first suitable nearby handmade campfire for that state. If no suitable campfire is present, the command replies visibly instead of silently failing.

Actions are queued:

- `BUILD_CAMPFIRE`
- `DOUSE_CAMPFIRE`
- `DISMANTLE_CAMPFIRE`

This keeps campfire work consistent with other inventory/fire actions and lets the action queue remain the single source of pacing.

## Follow-ups

- Add text aliases for building/dousing/dismantling once the command wording settles.
- Consider queueing tree shaking and other fuel-gathering actions through the same survival pacing.
- Add richer fuel quality later: wet twigs, resinous branches, bark, old boards.
- Add shelter/weather effects without making `CellLocation.biome` carry every future detail.
- Consider one shared "fire work" helper for future craft, light and fuel actions.
