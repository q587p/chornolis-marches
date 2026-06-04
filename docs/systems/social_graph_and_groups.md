# Social Graph, Following and Travel Groups

## Goal

Add the first real social layer to Chornolis Marches:

- remember people/NPCs as acquaintances;
- follow someone without requiring prior contact;
- let a leader add followers into a travel group / `Гурт`;
- move together while members have enough `Снага`, `Життя`, location access and action capacity;
- allow members to leave and leaders to exclude members;
- keep the architecture compatible with NPCs as future followers and leaders.

This is not the full faction, reputation, PvP law or quest system yet. It is the small social spine those systems can later attach to.

## Design Principles

### 1. `Гурт`, Not Generic MMO Party

Player-facing UI should use `Гурт` where possible. It feels more grounded than "party" and less technical than "group". Code may use `TravelGroup`, `GroupMember`, `FollowIntent`.

Suggested UI words:

- `Знайомства` - acquaintances/contact list.
- `Запам'ятати` / `Занотувати` - add someone to acquaintances.
- `Слідувати` - start following someone.
- `Взяти до гурту` - leader accepts a follower into the group.
- `Вийти з гурту` - member leaves.
- `Виключити з гурту` - leader removes a member.
- `Повернутися до гурту` - lagging member rejoins once co-located.

### 2. Follow Intent Is Attention, Not Movement

As of `0.15.29`, follow intent is a player-side attention marker. It means:

- the player marks one visible local being whose movement/actions they are watching;
- future observation, track-learning and route-memory systems can treat that target as stronger attention context;
- the follower does not move automatically;
- the target is not notified, accepted into a group or treated as a companion by this marker alone.

This is deliberately narrower than MUD-style automatic follow. It is not a
travel-group command yet.

Future follow movement should be a separate explicit slice. It may add a visible
ordinary-exit action such as "try to keep following", but it must respect
darkness, `Снага`, action queues, hidden exits/passages and route knowledge.
Hidden routes such as the cellar water-word passage must not be auto-repeated
unless the follower has learned the route or independently triggers it.

As of `0.15.30`, follow intent has its first route-memory use:

- when the followed visible local being leaves through an ordinary visible exit,
  the follower may receive a short personal hint about the direction;
- if darkness blocks track/detail visibility, the hint becomes non-directional;
- hidden routes such as the cellar water-word passage can only leave a
  non-directional memory that something disappeared by word/sign;
- `/track` can prioritize fresh tracks that match the current follow intent.

This still does not move the follower. It is a memory/attention layer, not an
automatic travel contract.

As of `0.15.31`, that memory layer is rate-limited:

- repeated movement through the same followed source/direction does not keep
  sending the same proactive hint;
- hidden-route disappearance hints have their own longer cooldown;
- tiny silent tracking-observation progress also has a separate cooldown, so
  rapid back-and-forth movement cannot farm the same attention context.

The visibility check currently follows the existing location-wide light model.
If a torch, campfire or other local light makes the location readable, route
memory can be clear; if the location snapshot says tracks/details are hidden,
the hint stays non-directional. A future viewer-specific light pass may refine
this, but it is not part of follow movement.

As of `0.15.32`, a player can act on fresh clear route memory manually:

- `Йти слідом` (`/follow_step`) checks the current follow intent and the latest
  clear witnessed ordinary movement;
- if that memory is still fresh, still starts from the player's current
  location and still points through an ordinary visible exit, it submits a
  normal `MOVE`;
- stale, dark, hidden-route or wrong-location memory refuses with diegetic copy
  instead of moving the player.
- a dark route memory is not retroactively clarified by lighting a torch after
  the fact; light helps the next observation or `/track` search, not the old
  non-directional memory.

This is still not automatic following. It is one explicit player action, not a
continuous loop, party lock, companion behavior or route replay. Hidden routes
such as the cellar water-word passage remain non-repeatable unless the player
learns or triggers them independently.

As of `0.15.33`, `/follow` without a target reports the current follow intent
instead of always showing the setup prompt:

- visible current targets are described as an active trace in the player's
  attention;
- no-longer-visible targets are marked as `останній помічений`;
- the response explains how to change the target, clear it with `/unfollow`,
  and, where appropriate, try one manual `/follow_step`.

### 3. Following Is Weaker Than Group Membership

Following should be possible even without an existing contact. It means:

- the follower marks a chosen visible being as a leader candidate;
- leader-visible follower lists are future `SOC-003` work, not part of the `0.15.29` intent marker;
- the leader may later add that follower to a `Гурт`;
- automatic group movement starts only after accepted membership in a later group/travel slice.

This matches the intended MUD-like flow:

> first follow someone, then the leader groups you, then you move/act together.

### 4. Active Group Members Are Co-Located And Capable

A group member participates only when they are:

- alive / conscious enough;
- in the same location as the leader at the moment of the leader action;
- not resting;
- not blocked by a locked/hidden exit;
- not out of `Снага` for the action;
- not already occupied by an incompatible action.

When a member cannot keep up, they do not break the whole group. They become `LAGGING` or simply remain behind. The leader and other capable members continue. When leader/member meet again, the lagging member can rejoin.

### 5. Do Not Expose Player-vs-NPC Too Much

The long-term goal is that it becomes harder to instantly know who is a live player and who is an NPC. Therefore:

- UI should not label contacts as "player" / "NPC" by default;
- debug mode may show actor keys and technical actor types;
- group logic should support both `PLAYER` and `CREATURE` actor refs from the start even if the MVP UI exposes only player-led groups.

### 6. Low-Spam Telegram UX

Group movement can easily spam. Prefer compact messages:

For leader:

```text
Ви ведете гурт на північ.
З вами йдуть: Марена, Остап.
Відстав: Боривітер — бракує снаги.
```

For member:

```text
Ви йдете за Мареною на північ.
```

For location observers:

```text
Гурт іде звідси на північ.
```

If exact names are hidden by darkness, reuse existing visibility rules and say `Хтось` / `Гурт`.

## Suggested Data Model

Use actor keys to avoid Prisma polymorphic uniqueness problems:

```prisma
model PlayerContact {
  id Int @id @default(autoincrement())

  ownerPlayerId Int
  ownerPlayer   Player @relation("PlayerContacts", fields: [ownerPlayerId], references: [id], onDelete: Cascade)

  targetKey String // PLAYER:12 or CREATURE:77
  targetType WorldActorType
  targetPlayerId Int?
  targetCreatureId Int?

  displayName String?
  nameNominative String?
  nameGenitive String?
  nameDative String?
  nameAccusative String?
  nameInstrumental String?
  nameLocative String?
  nameVocative String?

  status ContactStatus @default(KNOWN)
  source ContactSource @default(MANUAL)
  note String?
  data Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([ownerPlayerId, targetKey])
  @@index([ownerPlayerId, status])
  @@index([targetKey])
}

model FollowIntent {
  id Int @id @default(autoincrement())

  followerKey String
  followerType WorldActorType
  followerPlayerId Int?
  followerCreatureId Int?

  leaderKey String
  leaderType WorldActorType
  leaderPlayerId Int?
  leaderCreatureId Int?

  status FollowIntentStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([followerKey, leaderKey, status])
  @@index([leaderKey, status])
  @@index([followerKey, status])
}

model TravelGroup {
  id Int @id @default(autoincrement())

  leaderKey String
  leaderType WorldActorType
  leaderPlayerId Int?
  leaderCreatureId Int?

  status TravelGroupStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members TravelGroupMember[]

  @@index([leaderKey, status])
}

model TravelGroupMember {
  id Int @id @default(autoincrement())

  groupId Int
  group TravelGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  memberKey String
  memberType WorldActorType
  memberPlayerId Int?
  memberCreatureId Int?

  role TravelGroupRole @default(MEMBER)
  status TravelGroupMemberStatus @default(ACTIVE)
  lastKnownLocationId Int?
  joinedAt DateTime @default(now())
  leftAt DateTime?
  updatedAt DateTime @updatedAt

  @@unique([groupId, memberKey])
  @@index([memberKey, status])
  @@index([groupId, status])
}

enum ContactStatus {
  KNOWN
  HIDDEN
  BLOCKED
}

enum ContactSource {
  MANUAL
  GREET
  SAY
  FOLLOW
  GROUP
  OBSERVED
}

enum FollowIntentStatus {
  ACTIVE
  ACCEPTED
  CANCELLED
  DECLINED
}

enum TravelGroupStatus {
  ACTIVE
  DISBANDED
}

enum TravelGroupRole {
  LEADER
  MEMBER
}

enum TravelGroupMemberStatus {
  ACTIVE
  LAGGING
  LEFT
  KICKED
}
```

Notes:

- Add relation arrays to `Player` / `Creature` only where Prisma requires them. Keep naming explicit to avoid relation ambiguity.
- `targetKey`, `leaderKey`, `memberKey` are the stable app-level identifiers.
- Store snapshot forms for contacts so old acquaintances still render nicely if the original actor disappears or is hidden.

## Core Services

Add a service layer instead of stuffing logic into Telegram handlers:

```text
src/services/actorRefs.ts
src/services/contacts.ts
src/services/following.ts
src/services/travelGroups.ts
src/services/groupMovement.ts
```

### `actorRefs.ts`

Responsibilities:

- build `ActorRef` from player/creature;
- convert to/from actor key: `PLAYER:1`, `CREATURE:5`;
- load current location, hp, stamina and display forms for either actor type;
- check whether actor is active/alive/conscious.

### `contacts.ts`

Responsibilities:

- add/update player contact;
- resolve contact list for `/contacts` / `Знайомства`;
- snapshot names and grammatical forms;
- never reveal actor technical type unless debug mode is enabled.

### `following.ts`

Responsibilities:

- start/cancel follow intent;
- list active followers for a leader;
- accept a follow intent into a group;
- decline/cancel stale intents.

As of `0.15.29`, only the first part exists: a player can store one active
follow intent for a visible local player or creature. It is an attention marker,
not movement, party membership, companion ownership or learning progress. Group
acceptance, follower lists for leaders and stale-intent moderation remain
future `SOC-003` work. Future follow movement must be explicit and route-aware:
darkness, stamina, queues, hidden passages and learned route knowledge should
matter, and hidden passages should not be repeated just because the target used
them.

### `travelGroups.ts`

Responsibilities:

- create group if leader has no active group;
- add member;
- remove/kick member;
- leave group;
- disband group when leader leaves or group becomes empty;
- list group status and lagging members.

### `groupMovement.ts`

Responsibilities:

- after leader `MOVE` succeeds, determine active group members at the old location;
- check exit visibility/lock, hp, stamina, resting/action queue constraints;
- enqueue or directly process member movement using existing action queue rules;
- mark blocked/exhausted members as `LAGGING`;
- send compact messages.

## Movement Algorithm

When a leader successfully completes `MOVE`:

1. Load active `TravelGroup` for `leaderKey`.
2. Load active members except leader.
3. For each member:
   - must be at the leader's `fromLocationId`;
   - must have the same exit available and unlocked;
   - must have `hp > 0` and enough `stamina` for `MOVE`;
   - must not be resting;
   - must not have an incompatible active action.
4. Cap number of pulled members with config, e.g. `GROUP_MOVE_MEMBER_LIMIT=6`.
5. For capable members, enqueue `MOVE` with payload `{ direction, groupId, leaderKey, reason: "йде гуртом" }`.
6. For blocked members, keep membership but mark `LAGGING`, set `lastKnownLocationId`.
7. Notify leader and members compactly.

Important: avoid recursive group movement. A member move caused by group movement must not trigger their own group movement. Use payload marker `groupFollow: true` or call a service with recursion guard.

## Group Combat Stance

Current player attack is mostly instant animal kill. Do not multiply this with group attacks yet.

MVP group combat should be conservative:

- group status can show who is "ready";
- leader can mark a target / call for attack;
- members get a `Допомогти` button or queued assist intent;
- true automatic multi-attacker damage should wait for a combat refactor with HP/damage/rounds.

Once combat supports real damage:

1. Leader starts `ATTACK` on target.
2. Service finds active capable group members in same location.
3. Each member contributes an attack action or assist roll.
4. Target selection and damage are resolved once per tick/round, not instant duplicated kills.
5. Friendly fire and crime/PvP consequences are separate later systems.

## NPC Compatibility

Design all core services around actor keys and `WorldActorType` from the start.

For MVP:

- player-led groups may include players only;
- NPC follow/group behavior can be hidden behind service tests and later commands.

Later:

- NPCs may follow players after dialogue, payment, fear, respect, ritual obligation or quest state;
- NPCs may lead a group along a route;
- NPCs may refuse to follow if scared, wounded, hostile, guarding a location or bound to another duty;
- NPCs should use the same `TravelGroup` and `FollowIntent` tables.

## Quest Hooks Later

Do not implement full quests in this pass, but leave hooks:

- group can be attached to a future `QuestRun` / `Matter` / `Доручення`;
- NPC leader can guide player to a location;
- escort quests become group movement with leader/member state;
- ambush/raid/protection tasks become group goals.

## Failure Cases To Handle

- follower loses target before being accepted;
- leader goes through locked/hidden exit;
- member lacks `Снага`;
- member has `Життя <= 0`;
- member is resting;
- member is in another group;
- leader logs out or becomes unavailable;
- leader excludes a member;
- member leaves voluntarily;
- group movement attempts to trigger itself recursively;
- NPC/creature disappears, dies or becomes `isGone`.

## Debug Tools

Add debug-only output to `/debugGet` or equivalent later:

```text
Group #12 leader=PLAYER:1 status=ACTIVE
- PLAYER:1 LEADER ACTIVE loc=45 stamina=38 hp=20
- PLAYER:2 MEMBER ACTIVE loc=45 stamina=15 hp=20
- CREATURE:7 MEMBER LAGGING loc=43 stamina=0 hp=12
```

Do not show these keys in normal UI.
