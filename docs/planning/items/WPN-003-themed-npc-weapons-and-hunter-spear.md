---
id: WPN-003
title: Themed NPC weapons and hunter spear
status: testing
type: feature
area: npc
priority: medium
estimate: 1-2h
tags:
  - weapons
  - npc
  - hunter
  - seed
depends_on:
  - WPN-001
  - WPN-002
---

# WPN-003 — Themed NPC weapons and hunter spear

Status: testing in 0.16.32

Depends on: WPN-001, WPN-002

## Goal

Give existing seeded NPC roles thematic weapons/tools and make hunters visibly use spears in their hunting loop.

This should strengthen atmosphere and readability without making NPC professions into full equipment loadouts.

Current note: WPN-001/WPN-002 only added the player/creature field and weapon-aware helpers. NPC weapons will not appear in hunter/creature text until this or another seed slice actually sets `equippedWeaponKey` and matching resources for those NPCs.

## Scope

### Seed support

Extend unique creature seed data to support an equipped weapon key:

```ts
type SeedUniqueCreature = {
  resources?: SeedCreatureResource[];
  equippedWeaponKey?: string;
}
```

When seeding a unique creature:

- create/update its resource list as before;
- set `equippedWeaponKey` only if that key exists in `resources` and the key is a weapon;
- clear invalid equipped weapon keys rather than crashing production seed data after a typo, or fail loudly during local seed depending on existing project preference.

### Suggested existing NPC equipment

`Здравомир`, знахар at the starter camp:

```json
"resources": [
  { "resourceKey": "sickle", "amount": 1 }
],
"equippedWeaponKey": "sickle"
```

`Ведана`, травниця:

```json
"resources": [
  { "resourceKey": "sickle", "amount": 1 }
],
"equippedWeaponKey": "sickle"
```

`Лукан`, мисливець near the closed gate:

```json
"resources": [
  { "resourceKey": "hunting_spear", "amount": 1 },
  { "resourceKey": "knife", "amount": 1 }
],
"equippedWeaponKey": "hunting_spear"
```

`Орина`, мисливиця with torches:

```json
"resources": [
  { "resourceKey": "hunting_spear", "amount": 1 },
  { "resourceKey": "knife", "amount": 1 },
  { "resourceKey": "lit_torch", "amount": 1 },
  { "resourceKey": "torch", "amount": 1 }
],
"equippedWeaponKey": "hunting_spear"
```

MVP may allow torch + spear at the same time. Hand conflicts are future work.

### Hunter attack text

When a hunter creature attacks prey and has `hunting_spear` equipped, observer text should mention the spear.

Example:

```txt
Лукан виставляє мисливський спис і збиває зайця, тоді підбирає здобич для падального рову.
```

If no weapon is equipped, keep the current generic hunter text.

### Hunter freshening prep

Do not implement full NPC freshening yet unless it already exists. But ensure hunters carry `knife` so future carcass processing can use it.

## Out of scope

- NPC loot drops;
- NPC equipment decisions;
- weapon swapping AI;
- hunter butchering;
- guard combat;
- full profession gear lists.

## Acceptance checklist

- `npm run build` passes.
- Seed supports `equippedWeaponKey` for unique creatures.
- Existing unique NPCs seed with intended weapons.
- Hunter/herbalist examine text shows their held weapon/tool.
- Hunter attack observer text mentions spear when equipped.
- Existing hunter torch behavior still works.
- Existing hunter carcass claim/dropoff behavior still works.

## 0.16.32 Testing Note

`0.16.32` seeds the existing authored знахар/травниця/hunter NPCs with narrow thematic tools and weapons: sickles for Здравомир and Ведана, hunting spears plus knives for Лукан and Орина, while preserving Орина's torch resources. The seed/reset path now applies valid `equippedWeaponKey` values only when the creature also carries that weapon resource. This remains display/readability polish: no combat mechanics, loot, weapon swapping, hand-slot model or broader NPC gear AI.

## Codex prompt

```txt
Implement WPN-003 from docs/planning/items/WPN-003-themed-npc-weapons-and-hunter-spear.md.
Keep NPC equipment as authored seed data and simple display/action text. Do not add NPC gear AI, loot tables, weapon swapping or full combat.
```
