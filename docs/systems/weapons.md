# Weapons and Equipped Tools

## Goal

Add a minimal weapon layer that supports tools, atmosphere and existing actions without turning the game into a full combat system.

The first version should answer four player-facing questions:

1. What am I holding?
2. Can I equip or put away this weapon/tool?
3. Can I use a sharp weapon to freshen a corpse?
4. Does an attack read differently when a weapon is held?

The weapon MVP should preserve the current playable promise: movement, looking, examining, traces, stamina, light, nearby beings and first learning moments. Weapons should make those moments more readable, not replace them with a generic RPG combat loop.

## Current implementation

The 0.14.14 slice implements the first two weapon tasks:

- `Player.equippedWeaponKey` and `Creature.equippedWeaponKey`;
- a code-level weapon catalog in `src/services/weapons.ts`;
- MVP weapon resource types: `knife`, `hunting_spear`, `sickle`, `hand_axe`, `short_sword`;
- starter `knife` grant after onboarding completion;
- inventory item controls to take a weapon in hand or put it away;
- character and target descriptions that mention visible held weapons;
- weapon-aware attack copy without changing target eligibility or damage rules;
- `freshen` validation requiring an equipped sharp weapon before stamina is spent.

Still out of scope: NPC seed weapon loadouts, durability/sharpness, item instances, PvP, full hostile combat and balance math.

## MVP principles

- One equipped weapon/tool slot per actor.
- Weapons are carried as existing resource inventory entries in the MVP.
- Equipped state is a small actor field, not a new item-instance system yet.
- Existing `ATTACK` and `FRESHEN` queued actions remain the integration points.
- The current target rules remain narrow: do not unlock PvP, predator combat or full hostile combat as part of this slice.
- Weapon text matters more than numeric balance.
- Freshening requires an equipped sharp weapon/tool.
- Attack text changes by equipped weapon; unarmed attack keeps the current rough stomp/kick feeling.
- NPC weapons should be visible in `look` / `examine` when the NPC is visible.
- Durability, dulling, sharpening, armor, shields and deep damage math are future work.

## Data model

MVP fields:

```prisma
model Player {
  equippedWeaponKey String?
}

model Creature {
  equippedWeaponKey String?
}
```

This is intentionally simple. It tracks the equipped weapon by resource key, such as `knife` or `hunting_spear`.

Validation rule:

- `equippedWeaponKey` must be either `null` or a key from the weapon catalog.
- The actor should have at least one matching carried resource.
- Dropping the equipped resource should clear the equipped weapon.
- Seeded creatures may define an equipped weapon only if their resource list contains it.

Future item-instance migration:

- Later, when individual item instances exist, replace or supplement `equippedWeaponKey` with an equipped item instance id.
- Keep weapon behavior behind helper functions so the migration does not touch every combat/freshen/display call site.

## Weapon catalog

Create a code-level catalog, for example `src/services/weapons.ts`.

Suggested MVP entries:

| Key | Player name | Role | Attack text profile | Can freshen? | Initial owner |
|---|---|---|---|---|---|
| `knife` | простий ніж | starter utility blade | quick close cut/stab | yes | players, hunters |
| `hunting_spear` | мисливський спис | hunter weapon | thrust/drive back | no | hunters |
| `sickle` | серп | herbalist / знахар tool | awkward slash | yes | herbalists, знахарі |
| `hand_axe` | мала сокира | utility axe | heavy chop | yes, rough | backlog / later drops |
| `short_sword` | короткий меч | rare weapon | cut/slash | yes, awkward | guards / later drops |

Keep names and grammatical forms in the catalog instead of trying to infer all cases from `ResourceType.name`.

Minimum suggested weapon definition shape:

```ts
type WeaponDefinition = {
  key: string;
  name: string;
  forms: {
    nominative: string;
    genitive: string;
    accusative: string;
    instrumental: string;
    locative: string;
  };
  kind: "blade" | "spear" | "axe" | "sickle" | "sword";
  canFreshen: boolean;
  freshenQuality?: "clean" | "rough" | "awkward";
  attackProfile: "unarmed" | "knife" | "spear" | "sickle" | "axe" | "sword";
  futureConditionProfile?: "edge" | "point" | "haft";
};
```

## Starter weapon

New players should receive one `knife` as a starter item.

The grant should be idempotent:

- do not duplicate the knife on repeated `/start`;
- grant after onboarding completion or during first inventory/backfill if the player predates the slice;
- do not make the knife feel heroic or special.

Suggested text:

> У речах лежить простий ніж. Не прикраса, а річ для роботи.

## Equip / unequip UX

Inventory item view should show:

- `Взяти в руку` for weapons not equipped;
- `Зняти з руки` for the currently equipped weapon;
- regular inspect/drop actions remain.

Character view should show:

```txt
У руці: простий ніж.
```

If no weapon is equipped:

```txt
У руці: нічого для бою.
```

Player examination should no longer always say “беззбройний”. It should say one of:

```txt
Тримає простий ніж.
Виглядає беззбройним.
```

Creature examination should show equipped weapons for visible NPCs:

```txt
У руці: мисливський спис.
Мисливський набір:
- простий ніж: один
- факели: трохи
```

## Freshening

Freshening should require an equipped weapon with `canFreshen: true`.

No weapon:

```txt
Для освіжування потрібен ніж або інше гостре знаряддя в руці.
```

Wrong weapon, for example spear:

```txt
Мисливський спис не підходить для чистого освіжування. Потрібне гостре лезо ближче до руки.
```

Knife:

```txt
🔪 Ви освіжували труп зайця простим ножем і отримали сире м’ясо ×2.
```

Axe:

```txt
🪓 Ви грубо освіжували труп малою сокирою і отримали сире м’ясо ×2.
```

Do not add rich yield differences in the MVP. Quality can be recorded in logs for later.

## Attack text

Do not add deep combat yet. For the current simple animal attack flow:

Unarmed:

```txt
⚔️ Ви збиваєте тварину ногою. Труп лишився на землі.
```

Knife:

```txt
⚔️ Ви рвучко б’єте ножем. Тварина падає, і труп лишається на землі.
```

Spear:

```txt
⚔️ Ви виставляєте спис і пробиваєте коротким ударом. Здобич падає.
```

Hunter observer text:

```txt
Лукан виставляє мисливський спис і збиває зайця, тоді підбирає здобич для падального рову.
```

Keep current target eligibility. This slice should not make carnivores or players attackable.

## Look / examine integration

Integrate weapons in three places:

1. `/me` / character view.
2. `target inspect` for players and creatures.
3. location `look` / `examine` presence lines when targets are visible.

Examples:

```txt
Поруч:
- Лукан — тримає мисливський спис; перевіряє падальний рів
- Здравомир — тримає серп; сушить трави біля торби
```

Do not reveal weapons through darkness if the actor is not already visible.

## NPC theme

Suggested first seeded equipment:

- Players: `knife`, equipped by default or carried with an onboarding prompt to equip.
- Hunters: `hunting_spear` equipped, `knife` carried for carcasses.
- Herbalists / знахарі: `sickle` carried or equipped when gathering.
- Guards later: `short_sword`, maybe spear.
- Woodcutters later: `hand_axe`.

## What this intentionally does not solve

- Durability and dullness.
- Sharpening and repairs.
- Weapon skill progression.
- Armor, shields and blocking.
- Two hands, offhand items and torch conflicts.
- Per-item history, quality or ownership.
- Loot tables and corpse equipment drops.
- PvP law and witnesses.
- Full predator combat.

## Future hooks to leave now

Even without implementing durability, leave future-facing metadata in the catalog:

- `futureConditionProfile` for edge/point/haft.
- `attackProfile` for text and future damage.
- `canFreshen` and `freshenQuality` for future yield/dulling.
- helper functions such as `getEquippedWeaponForPlayer`, `getEquippedWeaponForCreature`, `weaponFreshenText`, `weaponAttackText`.

This keeps the MVP from hardcoding all text directly into `actionCompletions.ts`.
