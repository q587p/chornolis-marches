# Codex Prompt: Hidden Follower Spirit MVP

Use this prompt only when the team is ready to implement the hidden presence omen. This is future implementation material, not an instruction to ship it immediately.

Read current repository docs/code first, especially:

- `AGENTS.md`
- `docs/codex/00-codex-start-here.md`
- `docs/systems/hidden_presence.md`
- `docs/planning/items/OMEN-002-hidden-follower-spirit-mvp.md`
- `docs/planning/items/VIS-002-hidden-presence-foundation.md`
- `docs/planning/items/WORLD-002-hidden-spirit-seed-and-boundaries.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/services/worldTick.ts`
- `src/services/actionCompletions.ts`
- `src/services/locations.ts`
- `src/services/targets.ts`

## Feature

Add an MVP hidden follower spirit:

- It is a hidden spirit creature.
- It randomly moves through the world.
- It can notice a player and start following them.
- The player gets messages like “someone is following you,” but there is no visible target and no buttons to inspect, greet or attack it.
- After a few locations or a short time, whichever happens earlier, it stops following and goes another way.
- It may later follow again.
- It must not enter a location with an active `MAGIC_CAMPFIRE`.
- Entering a magic campfire location should immediately end the pursuit.

Recommended species:

- key: `stezhnyk`
- name: `стежник`
- kind: `SPIRIT`
- diet: `SPIRITUAL`
- starts hidden: `isHidden = true`

Recommended effect/omen name: `Тінь за плечима`.

## Implementation Preference

Create a clear service, e.g.:

```text
src/services/hiddenFollower.ts
```

Preferred persistent state: a small `HiddenPursuit` Prisma model with:

- `creatureId` unique;
- `playerId`;
- `remainingMoves`;
- `startedAt`;
- `expiresAt`;
- `lastNotifiedLocationId`;
- `endedAt`;
- `endReason`.

## Key Current-Code Risk

Hidden spirits are not animals. Existing creature movement may notify locations for non-animal creature movement. Patch this so hidden creatures do not emit normal arrival/departure messages and do not create ordinary visible tracks in the MVP.

Expected direction:

```ts
const isHidden = creature.isHidden;
if (!isAnimal && !isHidden) {
  // notify visible movement
}
if (!isHidden) {
  await createTrack(...);
}
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

## Acceptance Criteria

- Hidden spirit species exists and can be seeded.
- Hidden follower does not appear in visible targets/buttons.
- Hidden follower cannot be inspected, greeted or attacked through current UI.
- It can roam through allowed locations.
- It never enters active `MAGIC_CAMPFIRE` locations.
- It can start following a player with rate limits.
- Player receives atmospheric start and limited follow messages.
- Pursuit ends after 2-4 location moves or timeout, whichever is earlier.
- Pursuit ends immediately at magic campfire.
- Hidden follower movement creates no normal arrival/departure spam.
- Hidden follower movement creates no ordinary visible tracks in the MVP.
- Build passes.
