# 07 — World and Map Notes

## Main editable map file

The main hand-edited map/world data file is:

```text
prisma/data/chornolis_world_seed.json
```

`prisma/seed.ts` reads this JSON and upserts:

- regions;
- locations;
- exits;
- resource nodes;
- features;
- unique creature placements.

## What can usually be edited

In `prisma/data/chornolis_world_seed.json`, edits may include:

- `regions[].name`
- `regions[].description`
- `locations[].name`
- `locations[].description`
- `locations[].x`
- `locations[].y`
- `locations[].z`
- `locations[].biome`
- `locations[].dangerLevel`
- `exits`
- `resourceNodes`
- `features`
- `uniqueCreatures[].locationKey`

## Important constraints

- Do not casually change `z`; currently it is expected to remain `0` unless a task explicitly introduces verticality.
- Do not create two exits from one location in the same direction.
- `blockedCells` are documentation-only; the game walks through `locations` and `exits`.
- ASCII map is separate documentation in:

```text
docs/world/world_map.md
```

## Larger map shape changes

For large changes to the map shape/data, previously discussed reset flow:

```bash
npx prisma migrate reset --force --skip-seed
npm run prisma:seed
```

Only suggest destructive/reset commands when the user clearly wants that and understands the consequence.

## Coordinates

Location coordinates appear as three numbers, e.g. `(1,0,0)`:

- `x`: east/west-like axis;
- `y`: north/south-like axis;
- `z`: vertical/depth/layer axis, currently usually `0`.

## Bridge / threshold location note

A small bridge before a settlement is a good place to express the project’s liminality. It does not have to be a combat encounter. It can be a boundary marker between ordinary settlement logic and the older/stranger Chornolis logic.

Possible motifs:

- a mundane bridge that feels subtly watched;
- water/threshold symbolism;
- a signpost or offering place;
- a local rumor about who/what crosses at night;
- small supernatural feedback rather than a full boss or quest.
