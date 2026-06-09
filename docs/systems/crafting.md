# Crafting System

## Goals

Crafting should support survival, exploration, hunting and economy.

## Early Recipes

- Campfire.
- Torch.
- Cooked meat from raw meat at a campfire.
- Bandage.
- Simple trap.
- Fishing rod.
- Bait.
- Basic tools.

## Material Sources

- Firewood from forest regions.
- Herbs from resource nodes.
- Raw meat from freshened animal corpses.
- Bones, hide, fur, feathers and differentiated meat from animals later.
- Fish from water regions.
- Metal and stone later.

## Design Notes

Crafting should start simple and gradually become profession-based.

## Resource Recipe Foundation

`RECIPE-001` adds a small helper-backed recipe layer for authored resource-stack recipes.

- Recipes declare input resource stacks, one output resource stack, optional actor support and an optional feature tag.
- Validation reports exact missing amounts before inventory changes happen.
- The current runtime helper supports player `PlayerResource` application through a transaction, but does not add a public recipe book, broad crafting UI or economy.
- Output resource types must already exist; recipe application does not create future resource definitions by itself.
- `ALC-001` is now the first live gameplay consumer for this helper.

## Herbalism Outcome Policy

`ALC-006` keeps brewing outcome policy separate from the recipe helper.

- The recipe helper validates and applies resource stacks.
- The herbalism policy decides whether a brewing attempt should succeed, fail while keeping the empty bottle, or fail harshly enough that the bottle can break.
- Failed validation, such as missing ingredients or an unavailable action, happens before the policy roll and must consume nothing.
- Ordinary player-facing text should stay qualitative; raw chances and levels remain technical/admin context.
- The policy stays separate from inventory validation so live brewing can fail without partially consuming inputs before checks pass.

## First Herbal Tincture

`ALC-001` adds the first live prepared remedy loop without turning crafting into a broad public recipe book.

- Recipe: `empty_bottle x1`, `herbs x2`, `berries x1` -> `herbal_tincture x1`.
- Brewing uses `/brew tincture`, `/make_tincture`, `зробити настоянку`, `приготувати настоянку`, `зробити зілля` and `приготувати зілля`.
- Missing ingredients are reported before any herbalism outcome roll; failed validation consumes nothing and records no practice.
- Success uses the recipe helper to consume the full stack and produce one tincture.
- Ordinary failure consumes the herbs and berries but keeps the empty bottle.
- Harsh failure consumes the herbs, berries and empty bottle, but still does not create a broken-bottle resource in this slice.
- Drinking uses `/drink tincture`, `/use tincture`, `випити настоянку`, `випити зілля` or the inventory button. It restores stamina up to the character cap and returns one `empty_bottle`.

Still out of scope: broad crafting UI, healing or night-sight draughts, dirty bottles, washing, water/thirst, NPC brewing, shops/barter/economy and public raw skill sheets.
