# Campfires Implementation Plan

This note records the campfire MVP direction used for `0.15.7` and the next follow-ups.

## Shipped MVP slice

- Service helpers live in `src/services/fire.ts`.
- Player-made campfires are ordinary `CAMPFIRE` location features.
- Building costs `twigs ×5`.
- Local handmade campfire clutter is capped at three active handmade ordinary campfires per location.
- Wet `RIVER` and `SWAMP` locations warn before building and shorten burn duration after lighting.
- Build, douse and dismantle use queued player actions.
- Inventory and feature inspection expose the new buttons.
- Focused helper tests cover build state, dismantling, local limits, wet duration and action costs.

## Intended player loop

1. Gather or find `twigs`.
2. Open `Речі` and inspect `хмиз`.
3. Use `🪵 Скласти вогнище`.
4. If the location is wet, confirm the warning or cancel by doing something else.
5. Light the prepared campfire from a lit torch.
6. Use it for local light, rest, cooking and torch work.
7. Douse or let it expire.
8. Dismantle prepared/extinguished handmade campfires when the location gets cluttered.

## Boundaries

Do not make authored old campfires or magic campfires destructible in this MVP. They carry map/lore meaning and are not just piles of `twigs`.

Do not move prepared campfires into `ResourceNode`. A campfire is a visible location feature with state, buttons and future observation hooks.

Do not add deep weather/shelter simulation here. Wetness uses existing biome data until a later weather/shelter slice needs more detail.

## Follow-up tasks

- Add slashless/Ukrainian text aliases for build, douse and dismantle once UI wording is stable.
- Add richer player-facing examine copy for wet handmade campfires at each state.
- Add smoke/wet-fire ambient lines if live play shows the wet penalty is too invisible.
- Consider a queue action for tree shaking if fuel gathering should take time/stamina like other survival work.
- Revisit local cap and recovered `twigs` numbers after live balance.
- Add DB-backed integration tests for inventory consumption and feature creation if a test database becomes available in the routine suite.
