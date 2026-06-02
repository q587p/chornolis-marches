# Money and Low-Risk Loot

This system records the first small money and low-risk loot slice. It is not a shop, barter, faction, law or reward economy yet.

## Resource Keys

Money uses ordinary resource keys so it can move through existing resource pickup and inventory paths:

- `shah` — Ukrainian display name `шаг`, a small darkened coin.
- `hryvnia` — Ukrainian display name `ґривня`, a larger money unit kept rare in MVP.

Do not use Ukrainian resource keys in seed data or code. Player-facing text should use the localized names and correct plurals:

- `1 шаг`, `2 шаги`, `5 шагів`;
- `1 ґривня`, `2 ґривні`, `5 ґривень`.

`src/utils/moneyText.ts` is the shared helper for money display. Use it instead of hand-rolled plural branches.

## MVP Surfaces

The first slice supports:

- visible `shah` ground resource nodes near starter-adjacent or calmer locations;
- pickup through the same visible-ground-resource path as other loose resources;
- money display in `/me`, using `Гроші: немає` when a character has no money;
- a small separate money box inside the beginner shared cache;
- a rare `shah ×1` bonus on successful waking-world gathering.

The beginner cache keeps money separate from ordinary supplies. Hidden unobserved restock must never create money; coin stock changes only through explicit player contribution/taking or seed/reset state.

## Starter Authoring

Starter money finds should remain modest and authored:

- use `ResourceNode` entries for a few `shah` finds;
- do not place starter `hryvnia` nodes broadly;
- do not seed tutorial-dream money;
- keep amounts small enough that careful looking feels rewarded without turning nearby camp into a money route.

Future low-risk loot can add small objects, empty-search atmosphere and item lifetime rules, but this MVP intentionally stops before generic treasure tables.

## Gather Bonus

`src/services/smallLoot.ts` owns the rare gather coin bonus.

- Default chance: `LOOT_GATHER_SHAH_CHANCE_PERMILLE=30`.
- It grants directly to the player's `PlayerResource`, not as a ground drop.
- It applies only after successful player gather completion in the waking world.
- Tutorial and dream locations are excluded.
- The result message is separate and short, so the gather result stays readable.

## Follow-Up Boundaries

Keep these out of the first money/loot slice unless a later task explicitly promotes them:

- shops, vendors, price lists or currency conversion;
- factions, taxes, law, theft or fines;
- common `hryvnia` drops;
- combat loot tables;
- automatic NPC money handling;
- shrine/offering mechanics beyond planning notes.
