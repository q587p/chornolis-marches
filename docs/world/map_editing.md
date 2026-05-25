# Map Editing

The authored world map is now split into small JSON files under:

```text
prisma/data/world/
```

`prisma/seed.ts` prefers this split directory when it exists. The older single-file seed, `prisma/data/chornolis_world_seed.json`, can remain as legacy/reference data.

## Mini cheat sheet

- Change a location description: edit `prisma/data/world/locations.json`, field `description`.
- Change a location name: edit `locations.json`, field `name`.
- Move a location: edit `x`, `y`, `z`, then update nearby `exits.json` records.
- Change a region: edit `locations[].regionKey` and make sure that key exists in `regions.json`.
- Make a dead end: remove one or more exits from that location in `exits.json`.
- Add a normal two-way path: add two exits, one in each direction.
- Add a one-way or strange path: add only one exit.
- Make a cell impassable: do not include it in `locations.json`, do not point exits to it, and optionally document it in `blockedCells.json`.
- Add a visible landmark, sign, grave, bridge detail, gate or campfire: add a record to `features.json`.
- Add berries, mushrooms or herbs: edit `resourceNodes.json`, or later add rules in `resourceRules.json`.
- Move a unique NPC: edit `uniqueCreatures[].locationKey` in `uniqueCreatures.json`.
- Change the start / `/respawn` location: edit `meta.json`, field `startLocationKey`; `players.ts` reads it from the seed metadata.
- Refresh the ASCII map after edits: run `npm run map:render`.

## Files

```text
prisma/data/world/meta.json             # world seed version, startLocationKey, notes
prisma/data/world/regions.json          # region records
prisma/data/world/locations.json        # playable locations
prisma/data/world/blockedCells.json     # impassable cells for map/docs
prisma/data/world/exits.json            # authored graph links
prisma/data/world/resourceTypes.json    # resource definitions
prisma/data/world/resourceNodes.json    # resource amounts by location
prisma/data/world/features.json         # landmarks, campfires, gates, bridge details
prisma/data/world/uniqueCreatures.json  # named NPCs and spirits
```

## Locations

A normal location looks like this:

```json
{
  "key": "meadow_11_04",
  "x": 11,
  "y": 4,
  "z": 0,
  "name": "Жовта трава",
  "description": "Суха трава шелестить під вітром...",
  "regionKey": "dry_luka",
  "biome": "CLEARING",
  "dangerLevel": 1
}
```

`key` should be stable. It is used by exits, resources, features, NPC placement and sometimes game logic.

For the current MVP, the map is mostly flat. Keep `z: 0` unless the location is intentionally special, such as the under-bridge location at `z: -1`.

## Exits

Exits are authored graph links, not automatic grid movement.

```json
{
  "fromKey": "meadow_11_04",
  "toKey": "meadow_11_05",
  "direction": "NORTH",
  "label": "північ",
  "travelCost": 1,
  "isHidden": false
}
```

A two-way path needs two records:

```json
{
  "fromKey": "meadow_11_04",
  "toKey": "meadow_11_05",
  "direction": "NORTH",
  "label": "північ",
  "travelCost": 1,
  "isHidden": false
},
{
  "fromKey": "meadow_11_05",
  "toKey": "meadow_11_04",
  "direction": "SOUTH",
  "label": "південь",
  "travelCost": 1,
  "isHidden": false
}
```

Do not create two exits with the same `fromKey` and `direction`. The database has a unique constraint for one direction from one location.

The under-bridge location is intentionally **not** connected to the bridge deck. It only links to nearby riverbank locations.

## Blocked cells

`blockedCells` are documentation and map-rendering data for impassable cells. Gameplay movement is controlled by `locations` and `exits`.

```json
{
  "x": 19,
  "y": 6,
  "z": 0,
  "kind": "RIVER",
  "note": "Непрохідна річка."
}
```

## Features

Features are visible location details: signs, graves, campfires, bridge parts, gates and other landmarks.

```json
{
  "key": "forest_moss_gravestone",
  "locationKey": "forest_02_02",
  "type": "LANDMARK",
  "name": "Вивітрений могильний камінь",
  "description": "На камені лишилися лише кілька рисок...",
  "providesLight": false,
  "restStaminaCapMultiplier": null,
  "data": {
    "inspectable": true
  }
}
```

Current feature types:

```text
BORDER_MARKER
MAGIC_CAMPFIRE
BRIDGE
GATE
LANDMARK
```

`providesLight` and `restStaminaCapMultiplier` are meant for light/rest systems. `data.inspectable` is a design marker for future inspect interactions.

## Resources

Current gathered resource keys are:

```text
berries
mushrooms
herbs
```

The UI displays rough amounts:

- `0` — not shown;
- `1–7` — майже немає;
- `8–19` — трохи;
- `20+` — багато.

## Large edits

For small text, resource, feature and exit edits, usually run:

```bash
npm run map:render
npm run seed
```

For big shape changes where keys are deleted or renamed during active development, reset the dev database first:

```bash
npx prisma migrate reset --force --skip-seed
npm run map:render
npm run seed
```
