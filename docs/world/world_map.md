# World Map

Generated from `prisma/data/world/*.json`.

To refresh this file after editing the seed data, run:

```bash
node scripts/world/render-map-ascii.mjs --write
```

## Legend

- `F` — forest location.
- `.` — dry luka / open meadow location.
- `,` — riverbank location.
- `~` — impassable river cell.
- `#` — local impassable thicket / obstacle.
- `█` — impassable outer boundary.
- `S` — start / `/respawn`, border marker and unfading campfire.
- `=` — old bridge.
- `G` — closed settlement gate / future settlement placeholder.
- `u` — under-bridge location at `z = -1`; it is not connected to the bridge deck.
- `D` — dream tutorial location in `Дрімотна Межа` at `z = -13`.

## Layer z = 0

```text
      -1  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21
y
 10    █  █  █  █  █  █  █  █  █  █  █  █  █  █
  9    █  #  #  F  #  #  #  #  #  F  F  .  .  .  ,  ~  ~
  8    █  F  F  F  #  F  F  F  F  F  #  .  #  .  .  ,  ~  ~
  7    █  F  #  #  #  F  #  #  #  F  F  .  .  .  .  .  ,  ,  ~
  6    █  F  F  F  F  F  #  F  F  F  F  .  .  .  .  .  #  ,  ,  ,  ~  ~
  5    █  #  #  F  #  #  #  F  #  F  #  .  .  .  .  .  .  .  S  =  =  G  G
  4    █  F  F  F  #  F  F  F  #  F  F  .  .  .  .  .  .  .  ,  ,  ~  ~
  3    █  F  #  #  #  F  #  F  #  #  F  .  .  .  #  .  .  ,  ~  ~
  2    █  F  F  F  F  F  #  F  F  F  F  .  .  .  .  .  ,  ~  ~
  1    █  #  #  F  #  F  #  #  F  #  F  .  .  #  .  ,  ~  ~
  0    █  F  F  F  #  F  F  F  F  #  F  .  .  .  ,  ~  ~
 -1    █  █  █  █  █  █  █  █  █  █  █  █  █  █
```

## Layer z = -1

```text
      18
y
  5    u
```

## Layer z = -13

```text
      -1  0  1
y
  5       D
  4       D
  3    D  D  D
  2       D
  1       D
  0       D
```

## Special authored links

- `meadow_11_00` — SOUTH → `meadow_11_09`
- `meadow_11_09` — NORTH → `meadow_11_00`
- `riverbank_13_00` — SOUTH → `riverbank_13_09`
- `riverbank_13_09` — NORTH → `riverbank_13_00`
- `riverbank_18_04` — NORTH → `under_bridge_18_05`
- `riverbank_18_06` — SOUTH → `under_bridge_18_05`
- `under_bridge_18_05` — NORTH → `riverbank_18_06`
- `under_bridge_18_05` — SOUTH → `riverbank_18_04`
- `closed_east_gate` — EAST is a visible locked exit (Зачинені ворота).
- `dream_tutorial_gate` — SOUTH is a visible locked exit (Брама Сну).
- `dream_tutorial_hub` — NORTH back to `dream_tutorial_gate` is the matching visible locked exit while Брама Сну is closed.

## Editing

See [Map Editing](./map_editing.md) for the short manual editing guide.
