# Sleep and Dreams System

## Status

Ordinary sleep now has a first world-time recovery slice, but it is not yet fully woven into danger, shelter and dream-presence rules.

The existing tutorial dream should remain explicit and separate:

```text
/sleep tutorial
```

Plain `/sleep` should mean ordinary sleep once the ordinary sleep MVP is implemented. Tutorial sleep, ordinary sleep and future lucid dreams must not silently share the same assumptions.

## Goals

Sleep should deepen the survival loop without turning into a generic “rest button”.

The system should support:

- lying down as a posture;
- ordinary sleep as a stronger recovery state than active rest;
- manual waking through `Прокинутися` / `/wake`;
- automatic waking after enough in-world sleep time;
- fire, shelter and location comfort as meaningful sleep modifiers;
- tutorial and lucid dreams as explicit dream instances;
- a sleeping body that remains in the waking location while the dream presence acts elsewhere;
- interruption from danger, direct social contact or other external events.

## Core Distinctions

### Posture

Posture is the physical position of the body.

```ts
posture = STANDING | SITTING | LYING
```

Posture alone is not sleep:

- `/sit` / `сісти` changes posture to `SITTING`;
- `/lie` / `лягти` / `лежати` changes posture to `LYING`;
- `/stand` / `встати` changes posture to `STANDING`;
- a lying character may sit up first or stand directly.

### Active Rest

Active rest remains a short recovery action. It is not sleep.

```ts
isResting = true | false
```

`Відпочити` / `/rest` should keep meaning: sit down and recover for a short while.

### Ordinary Sleep

Ordinary sleep is a sleep state applied to the waking body.

```ts
sleepState = AWAKE | ORDINARY_SLEEP | DREAMING
```

Plain `/sleep` should:

1. stop incompatible queued physical actions;
2. set posture to `LYING`;
3. enter `ORDINARY_SLEEP`;
4. recover Життя and Снага more strongly than active rest;
5. suppress most ordinary local messages;
6. allow manual waking through `/wake` / `Прокинутися`.

### Tutorial Sleep

Tutorial sleep remains a special onboarding entry point:

```text
/sleep tutorial
```

It should not be treated as ordinary sleep. For now it may keep its existing implementation, but the docs and command copy should make the separation visible.

Tutorial and other explicitly dream-keyed/lucid-dream locations use their own stable dream light by default. Waking-world night, daypart notices and weather-based visibility reductions should not hide dream descriptions, lessons, visible targets, tracks or ground objects unless a later special dream opts into that rule deliberately.

Implementation note: the first slice also treats very low `z <= -10` as a reserved dream layer for dream-light and dream-notice guards. Future ordinary underground locations should avoid that reserved depth or add an explicit non-dream classification before depending on waking-world darkness and weather.

### Lucid Dreams / Усвідомлені сни

A lucid dream is a dream instance where the character’s sleeping body remains in the waking location, while a dream presence appears in a dream-space location.

A tutorial dream is one concrete kind of lucid dream, but not the only one.

## Terminology and Theme Guardrails

Avoid Christian framing. Do not use “soul”, “душа”, sin/salvation/afterlife language or church-coded explanations for dream travel.

Preferred internal/player-facing concepts:

- `сновидна присутність` — the dream-acting presence;
- `увага` — attention that turns toward the dream;
- `притомність` — wakefulness/awareness returning to the body;
- `видіння` — a dreamlike perception or omen;
- `слід сну` — an impression left by the dream.

Good phrasing:

```text
Ваша увага провалюється глибше в сон.
Сновидна присутність ступає між туманом і корінням.
Притомність повертається до тіла.
```

Avoid:

```text
Ваша душа покидає тіло.
Душа повертається з потойбіччя.
```

## Ordinary Sleep MVP

The first ordinary sleep pass should stay small.

### Commands

- `/lie`, `лягти`, `лежати` — only change posture to lying.
- `/sleep`, `спати`, `заснути` — lie down and enter ordinary sleep.
- `/sleep tutorial` — enter the tutorial dream.
- `/wake`, `прокинутися`, `прокинутись` — wake from ordinary sleep or a dream if the wake rules allow it.
- `/sit`, `сісти` — sit up from lying if awake.
- `/stand`, `встати` — stand from sitting or lying if awake; if asleep, either wake first with clear text or perform a combined wake-and-stand action only if deliberately implemented.

### Recovery

Ordinary sleep should restore more than active rest:

- Снага recovers faster than during `/rest`;
- Життя recovers slowly but more reliably than while awake;
- very comfortable sleep may eventually raise temporary Снага above the normal maximum;
- exact numbers should remain balance constants, not player-facing explanations.

Sleep records the in-world minute when ordinary sleep begins. Recovery checks may wake the character automatically after roughly eight game hours when HP and stamina have reached the relevant local cap, or after roughly ten game hours as a first hard upper bound.

Active campfires use the shared sleep recovery profile to improve stamina and HP recovery and can raise the temporary stamina cap a little. The first feature-level comfort signal is `sleep_comfort_multiplier`: dry bunks and active campfires can make sleep stamina recovery modestly faster than bare sleep. Broad shelter/safety metadata remains future work.

### Automatic waking

The first implementation:

- checks sleep progress in game-time minutes;
- wake automatically after about 8 game hours if Життя and Снага are full or have reached the local temporary cap;
- allow up to about 9–10 game hours if recovery is still incomplete;
- keeps manual `/wake` available unless a later special forced-sleep rule says otherwise.

Future work should still connect auto-wake to danger, shelter quality and dream-state exits instead of treating every location as equally safe.

### Message visibility while sleeping

Ordinary sleep should hide most ordinary local messages.

A sleeping player should not receive normal chatter, small movement spam or every ambient line. They may receive only special sleep-permeating events, such as:

```text
Крізь тишу сну до вас ледве долітає крик: «...». 
```

Good candidates for sleep-permeating events:

- someone shouting in the region;
- a nearby creature roaring/growling loudly;
- direct danger near the body;
- ritual or dream-relevant events.

### Command availability while sleeping

Ordinary sleep should also hide most ordinary agency.

While a character is in ordinary sleep, the default is "this cannot be done while asleep" unless a command is explicitly passive or sleep-relevant. The first allowlist stays small: `/wake`, `/time`, `/weather`, `/help`, `/commands`, `/chronicles`, `/news`, settings/daypart notice controls and session-safety commands such as AFK/end-session. Active commands such as movement, look/examine of the waking location, speech, socials, inventory use, gathering, pickup, drop/put, attack, freshening, cooking, fire/torch handling, auto and queue mutation are blocked with atmospheric copy and a wake option.

The `0.14.23` reconciliation slice adds this as a central ordinary-sleep command gate before ordinary handlers. Tutorial sleep is still separate and should not be treated as ordinary sleep.

Suggested copy:

```text
Сон тримає тіло важким і далеким. Це не зробити уві сні.

Хочете прокинутися?
```

Whether `/me` should remain as a safe self-status view is an open UX question. Until decided, prefer blocking it with the same wake prompt so ordinary sleep stays distinct from ordinary play.

## Comfort and Safety

Sleep quality should depend on the place.

### Campfire

A nearby active campfire can:

- improve Снага recovery;
- slightly improve Життя recovery;
- reduce cold/night discomfort;
- allow a small temporary Снага cap above the normal maximum;
- create local safety or attract attention depending on later ecology rules.

### Shelter / Comfort flag

Feature-level comfort may use a small bounded `sleep_comfort_multiplier` when a specific inspectable surface should support better ordinary sleep, such as starter cellar bunks. Locations may later gain broader comfort/shelter markers, for example:

```ts
sleepComfort = NONE | POOR | BASIC | GOOD
shelter = OUTSIDE | COVERED | INDOORS | CAVE
```

Examples:

- exposed roadside: poor sleep;
- forest floor near a fire: basic sleep;
- inside a hut: good sleep;
- dry cave with fire: good but potentially risky depending on inhabitants.

This should be location metadata, not hardcoded prose only.

## Interruptions and Waking

A sleeping body should be interruptible.

Wake immediately or strongly consider waking when:

- the body takes damage;
- someone attacks the body;
- a creature begins a direct hostile action against the body;
- another character uses a direct wake/shake/poke social action;
- an alarm-like world event affects the exact location;
- the dream instance resolves or forcibly ejects the participant.

Do not wake for every small event. Sleep should feel like sleep.

## Lucid Dream Architecture

Future lucid dreams should use explicit dream instances.

Suggested model:

```ts
type DreamKind = 'tutorial' | 'ordinary_lucid' | 'ritual' | 'forced' | 'place_spirit';

type DreamInstance = {
  id: string;
  kind: DreamKind;
  state: 'active' | 'resolving' | 'ended';
  dreamLocationId: string;
  dreamZ: -13;
  startedAtWorldTime?: string;
  entryReason: 'tutorial' | 'manual' | 'ritual' | 'creature' | 'elixir' | 'quest';
  participants: DreamParticipant[];
};

type DreamParticipant = {
  characterId: string;
  sleepingBodyLocationId: string;
  sleepingBodyPosture: 'LYING';
  dreamPresenceActorId: string;
  joinedAtWorldTime?: string;
  wakeReason?: string;
};
```

The important rule: the body stays where it fell asleep. The dream presence acts elsewhere.

The dream-space can use unusual places, including a reserved low `z` layer such as `-13`, but this should be explicit map/world data rather than a hidden teleport of the body.

## Group Dreams

Lucid dreams may be solo or group instances.

Group dream support should eventually answer:

- who initiated the dream;
- who consented or was pulled in;
- whether all participants appear in the same dream location;
- whether participants can separate inside the dream;
- what happens when one body is woken early;
- what messages the remaining dream participants see.

This should build on `Гурт` / follow systems later, not precede them.

## Dream Outcomes

Dreams can return more than recovery.

Possible outcomes:

- experience or skill progress;
- knowledge flags;
- quest nuance;
- ritual conditions;
- memories/impressions shown in later text;
- changed attitude of place spirits;
- rare physical items only under explicit special rules.

Rare item transfer must be guarded by item origin metadata. A dream-created item should not casually become a real inventory item unless the dream rule allows it.

## External Sleep Causes

A character may enter sleep because of an outside force:

- a creature or spirit casts/causes sleep;
- an elixir or food induces sleep;
- a ritual pulls the character into a lucid dream;
- a trap, gas, exhaustion or illness forces ordinary sleep.

If allies are nearby, they may wake the sleeper. If the character is alone, they may remain asleep for a long in-world time and wake in a changed situation.

## Edge Cases to Track

The implementation should deliberately handle or defer:

- sleeping with queued actions;
- trying to move, gather, fight, cook or pick up while lying/asleep;
- logging out while asleep;
- death of the sleeping body while the dream presence exists;
- body moved or carried while dreaming;
- campfire extinguishing while asleep;
- weather changing comfort;
- hunger/thirst while sleeping once those systems mature;
- NPCs seeing a sleeping player;
- NPCs sleeping later under the same rules;
- duplicate `/sleep` calls;
- `/sleep tutorial` after tutorial completion;
- waking from tutorial without losing onboarding state;
- local-history spam and privacy for dream events;
- item transfer from dream to waking world.

## Implementation Sequence

1. Add `LYING` posture and `/lie` / `лягти` / `лежати`.
2. Add ordinary `/sleep` and `/wake` as a small recovery MVP.
3. Keep `/sleep tutorial` explicitly routed to tutorial dream behavior.
4. Add world-time automatic waking after `WORLD-001` is stable.
5. Add campfire and comfort modifiers after visibility/fire foundations are stable.
6. Split tutorial/lucid dreams into dream instances where the sleeping body stays behind.
7. Add group dreams, place-spirit influence, forced sleep and rare dream item transfer only after the basic body/dream split is safe.
