---
id: WPN-001
title: Minimal weapon catalog and equip foundation
status: done
type: feature
area: items
priority: medium
estimate: 2-4h
tags:
  - weapons
  - inventory
  - equipment
  - freshening
depends_on:
  - FOOD-001
---

# WPN-001 — Minimal weapon catalog and equip / unequip

Status: done in 0.14.14.

## Goal

Add the smallest persistent weapon foundation:

- weapon resource types;
- one equipped weapon key on players and creatures;
- a code-level weapon catalog;
- inventory equip and unequip actions;
- text aliases for equipping and unequipping;
- starter knife grant for players.

This task should not change combat rules yet, except where needed to support later tasks.

## Scope

### Data

Add nullable equipped weapon keys:

```prisma
model Player {
  equippedWeaponKey String?
}

model Creature {
  equippedWeaponKey String?
}
```

Add a migration for these fields.

Add resource types to `prisma/data/world/resourceTypes.json`:

```json
{
  "key": "knife",
  "name": "простий ніж",
  "description": "Простий робочий ніж: для різання, освіжування й останнього захисту, якщо стежка стане злою."
}
```

Suggested MVP resource types:

- `knife` — простий ніж;
- `hunting_spear` — мисливський спис;
- `sickle` — серп;
- `hand_axe` — мала сокира;
- `short_sword` — короткий меч.

### Service

Create `src/services/weapons.ts`.

Minimum helpers:

- `WEAPON_DEFINITIONS`;
- `isWeaponResourceKey(key)`;
- `weaponDefinitionByKey(key)`;
- `weaponName(key)`;
- `weaponForms(key)`;
- `canWeaponFreshen(key)`;
- `getPlayerEquippedWeapon(playerId)`;
- `getCreatureEquippedWeapon(creatureId)`;
- `equipPlayerWeapon(playerId, resourceKey)`;
- `unequipPlayerWeapon(playerId, resourceKey?)`;
- `clearEquippedWeaponIfDropped(playerId, resourceKey)`;
- `grantStarterKnifeIfMissing(playerId)`.

Validation:

- non-weapons cannot be equipped;
- a player cannot equip a weapon they do not carry;
- unequip is idempotent;
- dropping the equipped weapon clears the equipped field.

### Inventory UI

Update inventory item keyboard:

- weapon not equipped: `Взяти в руку`;
- currently equipped weapon: `Зняти з руки`;
- keep inspect and drop.

Add callbacks:

- `inventory:equip:<resourceKey>`;
- `inventory:unequip:<resourceKey>`.

Add text aliases that route to the same inventory action:

- `equip <item>`, `wield <item>`, `hold <item>`;
- `unequip [item]`, `unwield [item]`, `free hand`;
- `взяти в руку <річ>`, `тримати <річ>`, `озброїтися <річ>`;
- `зняти з руки [річ]`, `прибрати з руки [річ]`, `звільнити руку`.

Character view should show the currently equipped weapon.

Suggested text:

```txt
У руці: простий ніж.
```

If none:

```txt
У руці: нічого для бою.
```

### Starter knife

Grant new players a `knife` once.

Implementation choice:

- call `grantStarterKnifeIfMissing(player.id)` after onboarding completes;
- optionally call it for existing completed players when they open inventory for the first time after the patch.

Avoid duplicate knives on repeated `/start`.

## Out of scope

- deep combat changes;
- NPC seed weapon loadout changes;
- NPC seed weapons;
- durability and sharpness;
- hand conflicts with torches;
- item instances.

## Follow-up notes

- The MVP equipment state is resource-key based (`equippedWeaponKey`), not item-instance based. This is acceptable for the first slice, but it means several identical knives are not distinguishable: equipping "knife" means "one carried knife", not a specific blade with quality, history, condition or ownership.
- Existing completed players do not automatically receive the starter knife unless they pass through the implemented grant/backfill path. If live balance requires every existing player to have one, add an explicit admin/backfill script or a safe inventory-open backfill instead of relying on `/start`.

## Acceptance checklist

- `npm run build` passes.
- Prisma migration adds nullable equipped fields.
- Weapon resource types seed successfully.
- A new player receives exactly one `knife`.
- Inventory inspection for a weapon shows equip/unequip control.
- Text aliases such as `equip knife`, `wield knife`, `unwield`, `взяти в руку ніж`, `зняти з руки ніж` and `звільнити руку` route to the same equip/unequip behavior.
- Equipping `knife` sets `Player.equippedWeaponKey = "knife"`.
- Unequipping clears it.
- Dropping an equipped weapon clears it.
- Non-weapon resources cannot be equipped.
- Existing food/torch/twigs inventory actions still work.

## Codex prompt

```txt
Implement WPN-001 from docs/planning/items/WPN-001-minimal-weapon-catalog-and-equip.md.
Keep it as a minimal equipment foundation only. Do not expand combat, PvP, target eligibility, durability or item instances. Add tests or smoke-safe helper coverage where practical, and keep the code behind src/services/weapons.ts so later WPN tasks can reuse it.
```
