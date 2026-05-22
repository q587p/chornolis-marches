# World seed data

`prisma/seed.ts` reads these files from `prisma/data/world/`.

Files:

- `meta.json` — seed version, start location and notes.
- `regions.json` — authored regions.
- `locations.json` — authored map cells.
- `blockedCells.json` — passive blocked-map data kept for map logic/docs; current seed does not write it to DB.
- `exits.json` — authored exits between locations.
- `resourceTypes.json` — gatherable resource types.
- `resourceRules.json` — deterministic resource generation rules.
- `features.json` — clickable/visible location features.
- `uniqueCreatures.json` — named NPC/spirit starting state.

Resource rules are intentionally biome-based, so map edits do not require hundreds of manual resource-node rows.
Bridge spans, the start camp and the closed gate have no resources. Riverbank locations seed herbs only.
