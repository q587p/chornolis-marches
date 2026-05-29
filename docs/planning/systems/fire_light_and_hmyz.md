# Fire, Light and Хмиз

## Goal

Make fire a practical survival and exploration tool.

The first loop should be small:

> find хмиз → pick it up → add it to a campfire → light reveals what darkness hides.

## First Scope

- Active campfires provide local light.
- Expired campfires remain as `Згасле вогнище` and do not provide light.
- Lit torches carried by a player can provide light.
- Хмиз can be found in suitable regions/biomes or authored locations.
- Хмиз can be picked up into `Речі`.
- Хмиз can be added to an ordinary campfire.
- Adding хмиз extends a burning campfire or prepares an extinguished one for later lighting, depending on current code support.

## Out of Scope

- Large branches.
- Wet fuel.
- Smoke simulation.
- Weather and rain interactions.
- Crafted campfires from scratch.
- Fuel quality.
- Fire spread.

## Biome Notes

Early хмиз should be likely near:

- forest edges;
- ordinary forest;
- old camps;
- dry clearings / dry luka;
- bridge approaches where old traffic could leave small dry wood.

It should be rare or absent in:

- tutorial dream spaces unless authored;
- open water/river cells;
- protected settlement interiors unless intentionally stocked.

## Player-Facing Text

```text
Ви знаходите кілька сухих гілочок. Хмиз ламкий, але для вогню стане в пригоді.
```

```text
Ви підкидаєте хмиз у вогнище. Полум’я ворушиться й на мить розсуває темряву.
```

## Alias Rule

Any button for хмиз should have text equivalents:

- `підібрати хмиз`
- `взяти хмиз`
- `додати хмиз`
- `підкинути хмиз`
- `/add twigs campfire`
