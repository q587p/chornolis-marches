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
- Output resource types must already exist; the foundation does not create future tincture resources by itself.
- The first planned gameplay consumer is `ALC-001`, after `ALC-006` defines the herbalism success/failure policy.

## Herbalism Outcome Policy

`ALC-006` keeps brewing outcome policy separate from the recipe helper.

- The recipe helper validates and applies resource stacks.
- The herbalism policy decides whether a brewing attempt should succeed, fail while keeping the empty bottle, or fail harshly enough that the bottle can break.
- Failed validation, such as missing ingredients or an unavailable action, happens before the policy roll and must consume nothing.
- Ordinary player-facing text should stay qualitative; raw chances and levels remain technical/admin context.
- There is still no public `/brew`, tincture resource, broad crafting UI or economy in this foundation slice.
