# Theft and Hiding System

## Purpose

Theft should become a risky social action, not a simple inventory shortcut.

The system should support:

- one character trying to steal from another character;
- world-controlled characters trying to steal from players or other world-controlled characters;
- strange beings or spirits stealing small things, warmth, flame or attention;
- witnesses and targets noticing attempts;
- consequences through memory, suspicion, social signals and ordinary actions;
- scribe-visible statistics for all attempts, not only observed attempts.

This system should preserve the core tone of Chornolis: the world watches, remembers and reacts.

## Planning boundary

This is future planning, not part of the `0.14.x` Night, Light and Firewood foundation.

The first theft slice should wait until the shared visibility/observation foundation exists. Theft and hiding should then build on what the world can notice: light, darkness, witnesses, attention and local memory.

## Design principles

- Theft is an action with time, risk and consequence.
- The first version should steal at most one unit per attempt.
- Theft should not be guaranteed, even against distracted targets.
- Being hidden should help, but never make theft perfectly safe.
- Detection and success are separate checks.
- Reactions should use existing actions, commands and social signals where possible.
- New reaction signals may be added if they are useful outside theft too.
- Player-facing text should speak about персонажі, істоти and духи, not separate categories of people.
- All theft attempts should be recorded for scribe statistics.

## First actions

Add two `WorldActionType` values:

```prisma
STEAL
HIDE
```

### `STEAL`

A risky physical action against a target in the same location.

Recommended payload:

```ts
type StealPayload = {
  targetType: "player" | "creature";
  targetId: number;
  mode?: "known" | "mystery";
  requestedResourceKey?: string;
  returnCallback?: string;
};
```

The MVP should ignore precise item choice unless the UI later exposes a safe item picker. It should choose one stealable visible resource from the target.

### `HIDE`

A risky physical action that tries to create a temporary hidden-approach state.

Recommended payload:

```ts
type HidePayload = {
  source?: "command" | "button" | "autonomy";
};
```

## Suggested skills

The MVP can start with counters and later map them to a real skill/progress table.

### Скрадання

Affects:

- chance to hide;
- chance to remain unnoticed while stealing;
- bonus from entering a location after hiding elsewhere;
- future quiet movement and hunting.

### Крадіжка

Affects:

- chance to take a small item cleanly;
- chance not to fumble;
- future item-specific difficulty.

### Пильність

Affects:

- chance to notice theft;
- chance to notice someone trying to hide;
- chance to notice strange theft or hidden presence;
- future observation and threat reading.

## Outcome model

Theft should roll success and detection separately.

| Success | Detected | Result |
|---|---|---|
| yes | no | Item transfers; target does not react immediately. |
| yes | yes | Item transfers; target and/or witnesses react. |
| no | no | Nothing transfers; thief is not exposed. |
| no | yes | Nothing transfers; suspicious attempt is exposed. |

This gives theft useful uncertainty without making it pure punishment.

## Chance model

Use simple bounded percentages first. Prefer a deterministic helper for tests.

Suggested starting point:

```ts
successChance =
  35
  + theftScore * 4
  + stealthScore * 2
  + hiddenBonus
  - targetAwareness * 3
  - witnessPenalty
  - itemBulkPenalty
  - lightPenalty
  - targetAlertPenalty;

noticeChance =
  45
  + targetAwareness * 4
  + witnessBonus
  + lightBonus
  + itemNoiseBonus
  - stealthScore * 3
  - hiddenBonus
  - darknessBonus;
```

Clamp both to a safe range, for example `5..90`.

For the first implementation, `theftScore`, `stealthScore` and `targetAwareness` can be derived from simple counters:

- thief previous steal attempts and successes;
- thief previous successful hides;
- target looks, inspections and tracking actions;
- recent observed theft attempts against the same target;
- whether the target is active, resting, moving or distracted.

## Stealable resources for MVP

Allow only one unit per attempt.

Good first resources:

- `berries`;
- `mushrooms`;
- `herbs`;
- `raw_meat`;
- `cooked_meat`;
- `twigs`;
- `torch`.

Avoid in the first version:

- lit torches held in hand;
- corpses and carcasses;
- tutorial-critical resources;
- ritual or unique resources;
- all-item theft;
- exact stack sizes.

## Protected contexts

Do not allow theft in protected dream/tutorial contexts.

Use a service such as:

```ts
isTheftProtectedLocation(locationKey: string): boolean
```

The protected list should include tutorial/dream locations and any place where theft would break onboarding.

If a theft is blocked by protection, do not count it as an attempt unless the action had already started. If the action started and then the target context changed, record a blocked incident with a reason for scribe visibility.

## Critical item protection

Do not steal the last critical item if it would break onboarding or survival instruction.

Examples:

- last tutorial resource needed for a hint;
- last required torch in a protected first-light step;
- a resource explicitly marked as protected by feature or tutorial service.

MVP rule:

```ts
if target has amount <= 1 and resource is protected:
  do not choose this resource
```

If no safe resource exists, the action should fail softly:

```text
Пальці шукають нагоди, але нічого безпечного для крадіжки не знаходять.
```

## Pair cooldown

Prevent repeated harassment between the same thief and target.

Suggested first rule:

- one theft attempt per thief-target pair per 10 minutes real time, or configurable equivalent;
- cooldown applies regardless of success;
- cooldown should include both player and creature actors.

Recommended environment variable:

```ts
THEFT_PAIR_COOLDOWN_MS
```

Default: `10 * 60 * 1000`.

If blocked by cooldown, do not start the action. Reply:

```text
Ця ціль зараз надто насторожена. Краще не тягнути руку знову так швидко.
```

## Hiding and hidden approach

`HIDE` attempts to create a temporary hidden approach state.

Recommended player fields or condition model:

```prisma
hiddenUntil DateTime?
hiddenStartedLocationId Int?
hiddenQuality Int @default(0)
```

A cleaner long-term option is an `ActorCondition` table, but fields are faster for the MVP.

### Hiding in a watched location

If other characters are present, the attempt may itself be noticed.

Possible observer message:

```text
Хтось намагається сховатися між тінню й корінням.
```

If clearly seen:

```text
{actor} намагається сховатися між тінню й корінням.
```

### Hiding elsewhere before approaching

If a character hides in another location, then moves to the target location, give a temporary bonus to theft detection avoidance.

The first version does not need fully silent movement. It is acceptable if ordinary movement messages still happen. The hidden approach bonus should represent prior preparation, not perfect invisibility.

## First warning

Before the first theft attempt, show a confirmation warning.

Suggested text:

```text
Це крадіжка.

Якщо вас помітять, це запам’ятають. Довіра до вас може впасти, інші можуть розсердитися, відступити, попередити вас, покликати увагу до спроби або відповісти іншою дією. Персонажі поруч теж можуть побачити спробу.

Спробувати?
```

Buttons:

- `Так, ризикнути`
- `Ні, не чіпати`

Store the warning as a player flag or a simple nullable timestamp.

Suggested field:

```prisma
theftWarningSeenAt DateTime?
```

A generic flag table is better long-term, but this field is enough for the first slice.

## Detection and notification rules

### Target is a player

If the thief is detected by the target or any witness, the target player must receive a message.

If the target saw the thief:

```text
{thief} тягнеться до вашої поклажі.
```

If someone else saw movement, but the target did not clearly see the thief:

```text
Хтось порпався біля вашої поклажі. Не все було видно, але спроба не лишилася непоміченою.
```

If a resource was stolen and detection happened:

```text
Бракує: {resourceName} ×1.
```

### Witness sees the thief

A witness may receive or cause a room message.

If the thief is not clearly identified:

```text
Хтось намагається поцупити щось із поклажі {target}.
```

If identified:

```text
{thief} намагається поцупити щось із поклажі {target}.
```

### Unobserved theft

Do not send a room message. Record the incident silently.

## Reactions through actions and social signals

Detected theft should not invent a separate “law” response in the MVP.

Use ordinary tools:

- `SAY` for a warning line;
- `MOVE` for stepping away or fleeing;
- existing social signals such as `glare`, `hush`, `point`;
- new social signals if useful.

Suggested new social signals:

### `guard`

Label:

```text
🎒 Притиснути поклажу
```

Room message:

```text
{actor} притискає поклажу ближче до себе.
```

Targeted message:

```text
{actor} притискає поклажу ближче до себе, дивлячись на {target}.
```

### `warn`

Label:

```text
⚠️ Попередити
```

Room message:

```text
{actor} різко попереджає {target}.
```

Target message:

```text
{actor} різко попереджає вас.
```

### `back`

Label:

```text
↩️ Відступити
```

Room message:

```text
{actor} відступає на крок.
```

If an actual location change is needed, use `MOVE` instead of this signal.

## Incident logging

All theft attempts should be recorded, including:

- success unnoticed;
- success observed;
- failed unnoticed;
- failed observed;
- blocked after action start;
- protected-resource failure;
- no-stealable-resource failure.

Prefer a dedicated table for complete stats.

Suggested model:

```prisma
model TheftIncident {
  id Int @id @default(autoincrement())

  thiefActorType WorldActorType
  thiefPlayerId Int?
  thiefCreatureId Int?

  targetActorType WorldActorType
  targetPlayerId Int?
  targetCreatureId Int?

  observerActorType WorldActorType?
  observerPlayerId Int?
  observerCreatureId Int?

  locationId Int?

  attemptedResourceKey String?
  stolenResourceKey String?
  amount Int @default(1)

  success Boolean @default(false)
  observed Boolean @default(false)
  observedByTarget Boolean @default(false)

  blocked Boolean @default(false)
  blockReason String?

  thiefWasHidden Boolean @default(false)
  detectionRoll Int?
  successRoll Int?
  detectionChance Int?
  successChance Int?

  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([thiefActorType, thiefPlayerId, createdAt])
  @@index([thiefActorType, thiefCreatureId, createdAt])
  @@index([targetActorType, targetPlayerId, createdAt])
  @@index([targetActorType, targetCreatureId, createdAt])
  @@index([locationId, createdAt])
}
```

Also log observed theft to `WorldEvent` for world history. Add `THEFT` to `WorldEventType` if useful.

Silent unobserved theft does not need a public `WorldEvent`, but it must have a `TheftIncident`.

## Scribe statistics

Scribes should be able to see aggregate numbers without exposing unnecessary private detail to ordinary play.

Minimum stats:

- total theft attempts;
- total successful thefts;
- total observed attempts;
- total unobserved attempts;
- total blocked attempts;
- attempts by day / recent window;
- success rate;
- observed rate;
- top stolen resource keys;
- attempts by location;
- attempts by actor kind;
- number of attempts against players.

Suggested command or report:

```text
/stats theft
```

or attach to the existing scribe/admin stats surface.

Example output:

```text
Крадіжки:
- спроб: 42
- вдалих: 17
- помічених: 21
- непомічених: 21
- заблокованих: 4
- найчастіше цупили: ягоди, хмиз, смажене м'ясо
```

## Player-facing text samples

### Success, unseen

```text
Пальці повертаються з чужої поклажі. Ви здобули: {resourceName} ×1.

Здається, ніхто не ворухнувся.
```

### Success, seen

```text
Ви встигаєте схопити {resourceName} ×1, але {target} різко помічає ваш рух.

Це запам’ятається.
```

### Failure, unseen

```text
Ви майже торкаєтесь чужої поклажі, але мить минає. Нічого не взято.
```

### Failure, seen

```text
{target} помічає вашу руку раніше, ніж ви щось берете.

Довіра тріскає швидше, ніж суха гілка.
```

### No safe item

```text
Пальці шукають нагоди, але нічого безпечного для крадіжки не знаходять.
```

### Pair cooldown

```text
Ця ціль зараз надто насторожена. Краще не тягнути руку знову так швидко.
```

## Testing notes

Add tests for:

- warning confirmation is shown once;
- canceling warning does not create an incident;
- one unit transfers on success;
- no unit transfers on failure;
- target player is notified when any detection happens;
- witness-only detection can keep thief text anonymous;
- cooldown blocks repeated attempts;
- protected location blocks theft;
- last critical item is not stolen;
- every started attempt writes `TheftIncident`;
- scribe stats aggregate all incidents;
- `HIDE` can create hidden approach;
- hiding can itself be observed.
