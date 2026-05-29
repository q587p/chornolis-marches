# World Time and Visibility

## Goal

Make day, dusk, night and light matter before adding weather, moon phases or deep calendar systems.

The first version should be simple enough to support:

- `/time` reading actual world state;
- darkness hiding location detail;
- campfires and torches revealing what darkness hides;
- future night-only encounters and omens;
- future observation-learning rules affected by light.

## First Scope

- Track a simple daypart: `DAWN`, `DAY`, `DUSK`, `NIGHT`.
- Advance daypart through world ticks or a small world-clock service.
- Make `/time` read the same state.
- Add a shared visibility helper used by location rendering, targets, tracks and ground objects.
- At night without light, show only minimal location information.
- Active campfires and carried lit torches should reveal more detail.

## Out of Scope

- Moon phases.
- Seasons.
- Named weekdays or sacred calendar days.
- Weather.
- Temperature, wet clothes, snow, mud or deep survival effects.

## Visibility Questions

The first helper can answer:

```ts
canSeeLocationDescription(actor, location)
canSeeNearbyBeings(actor, location)
canSeeTracks(actor, location)
canSeeGroundObjects(actor, location)
canStudyForLearning(actor, targetOrEvent)
```

## Player-Facing Tone

Darkness should not feel like a bug or hidden debug flag.

Good text:

```text
Ніч стискає місцину. Ви впізнаєте силуети поруч, але подробиці ховаються без світла.
```

Avoid:

```text
Visibility = false. Description hidden.
```

## Implementation Rule

Do not duplicate darkness checks in every handler.

Add one small visibility service first, then gradually move callers to it.
