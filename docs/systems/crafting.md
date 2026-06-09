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
