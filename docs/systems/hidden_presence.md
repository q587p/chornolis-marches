# Hidden Presence System

## Summary

Hidden presence is a future atmospheric layer for beings that can be near a player without becoming a normal target. The first planned slice is a hidden follower spirit: a small omen that may notice a player, follow for a few location moves or a short time, send player-only messages, and then leave.

This is not a full stealth system yet. It is a narrow bridge toward visibility, observation, light and mythic uncertainty.

## Design Goals

- Strengthen the feeling that the world watches and moves without the player.
- Add fear without combat.
- Use existing hidden creature support where possible.
- Make magic campfires feel like protective liminal anchors.
- Avoid UI clutter and fake interaction buttons.
- Prepare a path toward full hide, visibility and perception rules later.

## Non-Goals for the MVP

- Player stealth.
- Stealth skill checks.
- Potions, rituals or special senses that reveal hidden beings.
- Combat against invisible beings.
- Rich hidden tracks.
- Group pursuit tactics.
- Permanent status effects.
- Quest text or dialogue trees.

## Naming

Recommended split:

- species / visible future name: `стежник`;
- species key: `stezhnyk`;
- active omen / effect name: `Тінь за плечима`;
- service name: `hiddenFollower` or `hiddenPresence`;
- persistent state name: `HiddenPursuit`.

`Стежник` fits because it is short, easy to inflect, close to `стежка`, `стежити` and `слід`, and feels like a spirit of paths and trespassers rather than a grand mythic boss.

Suggested species forms:

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

## Player-Facing Text

First notice:

```text
Вам здається, що за спиною хтось зупинився разом із вами.
Коли ви озираєтеся — там тільки тиша.
```

Ongoing follow:

```text
Щось іде за вами.
Побачити не виходить, але тиша позаду тримається надто близько.
```

Another location:

```text
Позаду м’яко хрускає гілка.
Коли ви обертаєтесь, рух уже зник між деревами.
```

End by distance or time:

```text
Відчуття чужої присутности відстає.
Наче хтось звернув убік і пішов іншою стежкою.
```

End by magic campfire:

```text
Світло магічного вогнища стискає темряву довкола.
Те, що йшло за вами, лишається десь за межею світла.
```

## MVP Behavior

### Roaming

- One or several hidden `stezhnyk` creatures may exist in the world.
- They have `isHidden = true`.
- They randomly move through allowed locations on world ticks.
- They must not enter a location with an active `MAGIC_CAMPFIRE` feature.
- They should prefer forest, deep forest, ruins, swamp and high-danger threshold places.
- They should avoid tutorial-only dream locations unless intentionally seeded there later.

### Noticing a Player

When a hidden spirit is in the same location as one or more players:

- If the location has an active magic campfire, do nothing or leave.
- Otherwise, roll a low chance to begin following one player.
- The chance can later be affected by night, darkness, player light, perception, stealth or ritual protection.
- For the MVP, use a low fixed chance and rate limits.

Suggested defaults:

```text
HIDDEN_FOLLOWER_NOTICE_CHANCE = 12%
HIDDEN_FOLLOWER_MIN_MOVES = 2
HIDDEN_FOLLOWER_MAX_MOVES = 4
HIDDEN_FOLLOWER_MAX_DURATION_MS = 8-12 minutes
HIDDEN_FOLLOWER_MAX_ACTIVE_PER_PLAYER = 1
```

### Following

Once attached to a player:

- The player gets an initial hidden-presence message.
- When the player moves, the hidden spirit moves after them.
- The spirit follows for `remainingMoves` location changes or until `expiresAt`, whichever comes first.
- After followed moves, the player may receive a short unsettling message.
- The spirit remains hidden and targetless.
- If the player enters a magic campfire location, the pursuit ends immediately.
- If the follower cannot reach the destination or the path is blocked, the pursuit ends.
- After ending, the spirit should drift to a neighboring allowed location or continue roaming independently.

## Magic Campfire Boundary

Magic campfires are warded thresholds.

Rules:

- hidden followers cannot choose a `MAGIC_CAMPFIRE` location as a movement destination;
- active pursuit ends when the player enters such a location;
- if a hidden follower is somehow inside such a location, move it out or mark it idle elsewhere;
- do not send normal creature arrival/departure messages for the hidden spirit.

## Data Model Direction

Preferred future implementation: add a small persistent model instead of overloading `Creature.currentAction`.

```prisma
model HiddenPursuit {
  id Int @id @default(autoincrement())

  creatureId Int @unique
  creature Creature @relation(fields: [creatureId], references: [id], onDelete: Cascade)

  playerId Int
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  remainingMoves Int @default(3)
  startedAt DateTime @default(now())
  expiresAt DateTime
  lastNotifiedLocationId Int?

  endedAt DateTime?
  endReason String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([playerId, endedAt])
  @@index([expiresAt])
}
```

This leaves room for hidden pursuer type, perception checks, reveal source, warding reason and pursuit history.

## Integration Notes

Future code should keep hidden follower logic behind a clear service such as:

```text
src/services/hiddenFollower.ts
```

Useful service functions:

```ts
export async function hasActiveMagicCampfire(locationId: number): Promise<boolean>
export function isHiddenFollowerSpeciesKey(key: string): boolean
export async function processHiddenFollowerRoam(bot: Bot, creature: CreatureWithLocation): Promise<"moved" | "looked" | "idle">
export async function onPlayerMovedForHiddenFollowers(bot: Bot, playerId: number, fromLocationId: number, toLocationId: number): Promise<void>
export async function expireHiddenPursuits(bot: Bot): Promise<number>
```

Important current-code risk:

```ts
const isHidden = creature.isHidden;
if (!isAnimal && !isHidden) {
  // visible departure / arrival notifications
}
if (!isHidden) {
  await createTrack(...);
}
```

Hidden spirits are not animals, so `SPIRIT` movement needs explicit hidden guards when this feature is implemented.

## Acceptance Criteria

- A hidden spirit species exists and can be seeded.
- Hidden follower remains absent from visible target lists.
- Hidden follower cannot be inspected, greeted, attacked or exposed by ordinary UI.
- Hidden follower can roam through allowed locations.
- Hidden follower never enters active `MAGIC_CAMPFIRE` locations.
- Hidden follower can start following a player with rate limits.
- Player receives atmospheric start and follow messages.
- Pursuit ends after several location moves or a short timeout.
- Pursuit ends immediately when the player reaches a magic campfire location.
- Hidden follower movement does not send normal arrival/departure notifications.
- Hidden follower does not create ordinary visible tracks in the MVP.

## Future Expansion

Hidden creatures may later be revealed by high perception, `Спостерігати`, torchlight or moonlight, ritual chalk/ash/salt, herbal smoke, elixirs, boundary markers, or spirit consent.

Openly carried light is not a stealth-safe exception: if a hidden or stealth-like creature/NPC carries a visible lit torch, the torch should still light the location and should reveal at least an uncertain bearer. Future hidden-presence rules may still support spirit lights, foxfire or misleading omens, but those should be explicit phenomena rather than ordinary hidden actors holding ordinary torches.

Future related skills include attention, tracking, instinct, mythic lore and ritual lore. Hidden traces should stay uncertain: cold air, bent grass without footprints, silence moving between trees, disturbed ash near a fire, or animals suddenly falling quiet.
