# World seed data

`prisma/seed.ts` reads active world seed files from `prisma/data/world/`.

The top-level `prisma/data/*.json` split files were removed because they were stale duplicates of the active split seed. Keep only:

- `prisma/data/world/*.json` — active seed source.
- `prisma/data/chornolis_world_seed.json` — legacy single-file fallback/reference while older tooling still knows about it.

Files:

- `meta.json` — seed version, start location and notes.
- `regions.json` — authored regions.
- `locations.json` — authored map cells.
- `blockedCells.json` — passive blocked-map data kept for map logic/docs; current seed does not write it to DB.
- `exits.json` — authored exits between locations.
- `resourceTypes.json` — resource types used by gathering, visible ground resources and simple carried resources.
- `resourceRules.json` — deterministic resource generation rules.
- `features.json` — clickable/visible location features.
- `uniqueCreatures.json` — named NPC/spirit starting state.

Resource rules are intentionally biome-based, so map edits do not require hundreds of manual resource-node rows.
Bridge spans, the start camp and the closed gate should not seed ordinary vegetation/gatherable resources. Authored low-risk loose finds, such as a few starter-adjacent `shah` coin nodes, may still appear as explicit `ResourceNode` entries. Riverbank locations seed herbs through rules unless explicitly overridden.

0.10.7 note: `grass` is ecology-only forage for herbivores, hidden from player gather menus. Bridge spans should not have grass; under-bridge riverbank locations can.
