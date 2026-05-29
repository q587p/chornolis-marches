---
id: OMEN-002
title: Hidden follower spirit MVP
status: backlog
type: feature
area: world
priority: medium
estimate: 4-6h
tags:
  - omen
  - hidden-presence
  - spirit
  - ambient
depends_on:
  - VIS-002
  - WORLD-002-hidden-spirit
---

# OMEN-002: Hidden follower spirit MVP

## Goal

Add a future small living-world omen: a hidden spirit that may follow a player for a few locations, creating dread without exposing a target button or combat interaction.

## Player Story

As a player, I sometimes feel that something unseen follows me through the forest. I receive unsettling messages, but I cannot target, inspect, greet or attack the thing until future visibility mechanics exist. Reaching a magic campfire breaks the pursuit.

## Scope

Implement the first hidden follower MVP using existing creature, world tick and action systems.

The MVP should:

- introduce a hidden spirit species with key `stezhnyk`;
- keep the spirit hidden from normal target lists;
- let it roam independently through allowed locations;
- let it occasionally notice a player and begin a short pursuit;
- notify only the followed player;
- end pursuit after 2-4 player moves or after a short duration, whichever happens first;
- immediately end pursuit at an active `MAGIC_CAMPFIRE` location;
- avoid normal creature arrival/departure spam;
- avoid ordinary visible tracks for hidden spirits.

## Implementation Notes

Preferred persistent state is a small `HiddenPursuit` model with:

- `creatureId` unique;
- `playerId`;
- `remainingMoves`;
- `startedAt`;
- `expiresAt`;
- `lastNotifiedLocationId`;
- `endedAt`;
- `endReason`.

Create a focused service:

```text
src/services/hiddenFollower.ts
```

Responsibilities:

- find active magic campfire boundaries;
- filter allowed hidden-follower movement destinations;
- start pursuit;
- move hidden follower after player movement;
- expire pursuit;
- send atmospheric player-only messages;
- keep rate limits and constants in one file.

Suggested defaults:

```ts
const HIDDEN_FOLLOWER_SPECIES_KEY = "stezhnyk";
const HIDDEN_FOLLOWER_NOTICE_CHANCE = Number(process.env.HIDDEN_FOLLOWER_NOTICE_CHANCE || 12);
const HIDDEN_FOLLOWER_MIN_MOVES = Number(process.env.HIDDEN_FOLLOWER_MIN_MOVES || 2);
const HIDDEN_FOLLOWER_MAX_MOVES = Number(process.env.HIDDEN_FOLLOWER_MAX_MOVES || 4);
const HIDDEN_FOLLOWER_MAX_DURATION_MS = Number(process.env.HIDDEN_FOLLOWER_MAX_DURATION_MS || 10 * 60_000);
```

## Player-Facing Text

Start:

```text
Вам здається, що за спиною хтось зупинився разом із вами.
Коли ви озираєтеся — там тільки тиша.
```

Follow:

```text
Щось іде за вами.
Побачити не виходить, але тиша позаду тримається надто близько.
```

Natural end:

```text
Відчуття чужої присутности відстає.
Наче хтось звернув убік і пішов іншою стежкою.
```

Magic campfire end:

```text
Світло магічного вогнища стискає темряву довкола.
Те, що йшло за вами, лишається десь за межею світла.
```

## Acceptance

- `stezhnyk` hidden follower species exists.
- At least one hidden follower creature can exist in seed data.
- Hidden follower does not appear in target lists or buttons.
- Hidden follower cannot be inspected, greeted or attacked through existing UI.
- Hidden follower can roam when not pursuing.
- Hidden follower never enters active `MAGIC_CAMPFIRE` locations.
- Hidden follower can start following a player with rate limits.
- Player receives start and limited follow messages.
- Pursuit ends after move limit or timeout.
- Pursuit ends immediately at magic campfire.
- Hidden follower movement creates no normal arrival/departure spam.
- Hidden follower movement creates no ordinary visible tracks in the MVP.
- Build passes.

## Implementation Order

Do after: `VIS-002`, `WORLD-002-hidden-spirit`, and enough night/light visibility work to make hidden presence meaningful.
