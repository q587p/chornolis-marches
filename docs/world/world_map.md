# World Map — 0.8.5 draft

This document describes the static 2D world seed for the current MVP map.

The map intentionally stays flat for now: all locations use `z = 0`.

## Main layout

- West: authored 10×10 starter forest.
- North, south and west of the forest: one-cell impassable forest wall.
- East of the forest: widened dry luka / dry meadow.
- North and south of the narrow ends of the dry luka: impassable edge caps.
- East of the luka: separate riverbank region.
- Farther east: impassable river.
- Middle row: old bridge across the river.
- East of the bridge: closed settlement gate.
- West side of the bridge: starter / `/respawn` location with a border marker and an unfading campfire.

## ASCII overview

```text
      -1  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
y
 10    █  █  █  █  █  █  █  █  █  █  █  █  █  █
  9    █  #  #  F  #  #  #  #  #  F  F  .  .  .  ,  ~  ~
  8    █  F  F  F  #  F  F  F  F  F  #  .  #  .  .  ,  ~  ~
  7    █  F  #  #  #  F  #  #  #  F  F  .  .  .  .  .  ,  ~  ~
  6    █  F  F  F  F  F  #  F  F  F  F  .  .  .  .  .  #  ,  ~  ~
  5    █  #  #  F  #  #  #  F  #  F  #  .  .  .  .  .  .  .  S  =  =  G
  4    █  F  F  F  #  F  F  F  #  F  F  .  .  .  .  .  .  .  ,  ~  ~
  3    █  F  #  #  #  F  #  F  #  #  F  .  .  .  #  .  .  ,  ~  ~
  2    █  F  F  F  F  F  #  F  F  F  F  .  .  .  .  .  ,  ~  ~
  1    █  #  #  F  #  F  #  #  F  #  F  .  .  #  .  ,  ~  ~
  0    █  F  F  F  #  F  F  F  F  #  F  .  .  .  ,  ~  ~
 -1    █  █  █  █  █  █  █  █  █  █  █  █  █  █
```

Legend:

- `F` — forest location.
- `.` — dry luka / dry meadow location.
- `,` — riverbank location.
- `~` — impassable river cell.
- `#` — local impassable thicket.
- `█` — impassable wall / map-edge cap.
- `S` — start / `/respawn` location with border marker and unfading campfire.
- `=` — old bridge location.
- `G` — closed settlement gate.

## Special exits

- `meadow_11_09` has a northward wrap exit to `meadow_11_00`.
- `meadow_11_00` has the reciprocal southward wrap exit to `meadow_11_09`.
- `riverbank_13_09` has a northward wrap exit to `riverbank_13_00`.
- `riverbank_13_00` has the reciprocal southward wrap exit to `riverbank_13_09`.

## Notes

- The first draft accidentally walled the forest from the east. This version walls it from the west instead.
- The dry luka is widened by two cells compared to the original 1/2/3/4/5/5/4/3/2/1 shape.
- The narrow north/south ends of the dry luka now have impassable caps, with a deliberate wrap footpath through the middle.
- The river is authored as blocked cells rather than locations.
- Settlement content behind the closed gate is intentionally postponed.
