# 07 — World and Map Notes

## Main editable map files

The active hand-edited map/world data lives in split JSON files:

```text
prisma/data/world/
```

Important files:

- `regions.json`
- `locations.json`
- `exits.json`
- `features.json`
- `resourceTypes.json`
- `resourceRules.json`
- `resourceNodes.json`
- `uniqueCreatures.json`

Legacy fallback/mirror:

```text
prisma/data/chornolis_world_seed.json
```

`prisma/seed.ts` prefers `prisma/data/world/` when that directory exists. Do not change only the legacy fallback for live map/world edits.

The seed upserts:

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

- Do not casually change `z`; most waking-world surface locations are still `z = 0`, and new non-zero layers should be deliberate authored vertical/interior spaces.
- `Дрімотна Межа`, the tutorial dream, intentionally uses `z = -13`; this is a separate authored layer, not a casual terrain-height edit.
- The current dream-light heuristic treats very low `z <= -10` as a reserved dream layer. Future non-dream underground/deep places should avoid that reserved layer or carry an explicit non-dream marker before they rely on ordinary darkness/weather visibility.
- `start_border_watchtower` intentionally uses `z = 1` as the starter-camp watchtower above `start_border_camp`; it is connected by `UP` / `DOWN` exits and is part of the first waking-world verticality slice.
- `start_border_cellar` intentionally uses `z = -1` as the starter-camp cellar below `start_border_camp`; it is connected by `DOWN` / `UP` exits and is a safe waking-world storage/interior landmark, not a dream layer.
- `under_bridge_18_05` uses `z = -1` as an ordinary lower waking-world place under the bridge; it is not a dream layer.
- Do not create two exits from one location in the same direction.
- Keep authored location names unique across the playable map; repeated names make player-made maps and exit lists hard to read.
- Keep full authored location descriptions unique too. Similar terrain can share motifs, but not the exact same paragraph.
- `blockedCells` are documentation-only; the game walks through `locations` and `exits`.
- Do not put raw HTML tags such as `<i>...</i>` into `name`, `description`, aliases or `data` fields in world JSON. These fields are content, not markup; Telegram renderers may escape them, and `scripts/test/world-content-html.cjs` should catch accidental tags.
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

## Planned verticality

There is a backlog direction to add a small, authored vertical/interior map pass. This should be explicit and diegetic, not a casual `z` change:

- a climbable tree can use an `UP` exit to a high branch/lookout;
- the starter-camp watchtower uses an `UP` exit to a real upper room and a `DOWN` exit back to the camp;
- a bear den or similar lair can use an `INSIDE` exit into a real interior location;
- a pit, ravine or hole can use a `DOWN` exit to a lower place.

When this lands, update both the world seed and `docs/world/world_map.md`, and make the surface entry features inspectable so players understand the available movement.

Current climbable-tree MVP note: tree-shake cooldowns live in `Feature.data`, so reset/reseed can reset them, and `Потрусити дерево` / `/shake_tree` currently resolves immediately rather than through the action queue. See `HMYZ-001-F` for the future persistent cooldown / queued-action cleanup.

## Bridge / threshold location note

A small bridge before a settlement is a good place to express the project’s liminality. It does not have to be a combat encounter. It can be a boundary marker between ordinary settlement logic and the older/stranger Chornolis logic.

Possible motifs:

- a mundane bridge that feels subtly watched;
- water/threshold symbolism;
- a signpost or offering place;
- a local rumor about who/what crosses at night;
- small supernatural feedback rather than a full boss or quest.
