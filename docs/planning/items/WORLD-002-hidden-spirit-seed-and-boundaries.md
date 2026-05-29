---
id: WORLD-002-hidden-spirit
title: Hidden spirit seed and boundaries
status: backlog
type: feature
area: world
priority: medium
estimate: 2-3h
tags:
  - world
  - hidden-presence
  - spirit
  - campfire
depends_on:
  - WORLD-002
---

# WORLD-002-hidden-spirit: Hidden spirit seed and boundaries

## Goal

Add future seed and movement boundaries for a hidden follower spirit, especially around magic campfires.

## Recommended Creature

Species key: `stezhnyk`

Visible future name: `стежник`

Effect name while unseen: `Тінь за плечима`

Suggested forms:

```ts
{
  key: "stezhnyk",
  name: "стежник",
  nameGenitive: "стежника",
  nameDative: "стежнику",
  nameAccusative: "стежника",
  nameInstrumental: "стежником",
  nameLocative: "стежнику",
  nameVocative: "стежнику",
  grammaticalGender: "MASCULINE",
  animacy: "ANIMATE",
  kind: "SPIRIT",
  diet: "SPIRITUAL",
  baseHp: 12,
  strength: 2,
  agility: 7,
  perception: 9,
  endurance: 5,
  instinct: 10,
}
```

## Seed Guidance

Seed one or more hidden followers only in places that fit the atmosphere:

- forest;
- deep forest;
- ruins;
- swamp;
- high-danger threshold places.

Avoid:

- starter safety locations;
- tutorial-only locations unless intentionally used later;
- any location with active `MAGIC_CAMPFIRE`;
- settlements with strong protection.

Suggested unique creature state:

```ts
{
  speciesKey: "stezhnyk",
  locationKey: "some_deep_forest_location",
  name: "Стежник у тіні",
  isAlive: true,
  action: "іде там, де на нього не дивляться",
  activity: "LOOKING",
  isHidden: true,
}
```

If named unique creatures feel too concrete, create anonymous hidden creatures instead. They should still use the `stezhnyk` species.

## Boundary Rules

A hidden follower must not enter active magic campfire locations.

Suggested helper:

```ts
async function hasActiveMagicCampfire(locationId: number) {
  return prisma.locationFeature.count({
    where: {
      locationId,
      isActive: true,
      type: "MAGIC_CAMPFIRE",
    },
  }).then((count) => count > 0);
}
```

Movement destination is allowed only when:

- exit is not hidden;
- target location exists;
- target location has no active `MAGIC_CAMPFIRE`;
- target region/location is not tutorial-forbidden or explicitly warded.

## Acceptance

- `stezhnyk` species is seeded with Ukrainian case forms.
- At least one hidden follower can be created in seed data or by debug helper.
- Hidden follower starts with `isHidden: true`.
- Hidden follower is `CreatureKind.SPIRIT` and `DietType.SPIRITUAL`.
- Movement filter blocks active `MAGIC_CAMPFIRE` locations.
- If a hidden follower somehow appears in a magic campfire location, it leaves or pursuit ends safely.
- Build passes.

## Implementation Order

Do after: `WORLD-002`. Do before or together with: `OMEN-002`.
