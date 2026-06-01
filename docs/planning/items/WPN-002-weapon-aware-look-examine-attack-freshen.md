---
id: WPN-002
title: Weapon-aware look, examine, attack and freshen
status: done
type: feature
area: items
priority: medium
estimate: 2-4h
tags:
  - weapons
  - inventory
  - combat
  - freshening
depends_on:
  - WPN-001
---

# WPN-002 — Weapon-aware look, examine, attack and freshen

Status: done in 0.14.14.

Depends on: WPN-001

## Goal

Make equipped weapons visible and useful in existing actions:

- `look` / `examine` shows held weapon when the actor is visible;
- `freshen` requires a sharp equipped weapon;
- `attack` keeps current simple rules but uses weapon-aware text;
- unarmed behavior remains available and keeps the current rough stomp/kick tone.

This task should not build a full combat system.

## Scope

### Player and target descriptions

Update target inspection so players no longer always look unarmed.

Examples:

```txt
Тримає простий ніж.
```

or:

```txt
Виглядає беззбройним.
```

Update visible location target lines when targets are revealed:

```txt
Поруч:
- Лукан — тримає мисливський спис; перевіряє ремінь ножа біля падального рову
```

Preserve visibility rules. If darkness currently hides the target, darkness should also hide the weapon.

### Freshen requirement

Before `freshenCorpseForMeat`, resolve the player's equipped weapon.

Rules:

- no equipped weapon: fail with a useful message;
- equipped weapon that is not `canFreshen`: fail with a useful message;
- equipped sharp weapon: current freshen behavior proceeds;
- include weapon key/name in event log description.

Suggested messages:

```txt
Для освіжування потрібен ніж або інше гостре знаряддя в руці.
```

```txt
Мисливський спис не підходить для чистого освіжування. Потрібне гостре лезо ближче до руки.
```

```txt
🔪 Ви освіжували труп зайця простим ножем і отримали сире м’ясо ×2.
```

Do not change meat yield in this task.

### Player attack text

Keep current target eligibility.

If the player has no equipped weapon, keep current unarmed result semantically close to the existing text.

Suggested unarmed text:

```txt
⚔️ Ви збиваєте тварину ногою. Труп лишився на землі.
```

Knife:

```txt
⚔️ Ви рвучко б’єте ножем. Тварина падає, і труп лишається на землі.
```

Axe:

```txt
⚔️ Ви б’єте малою сокирою. Тварина падає, і труп лишається на землі.
```

Spear:

```txt
⚔️ Ви виставляєте спис і пробиваєте коротким ударом. Здобич падає.
```

Observer text should also change:

```txt
Хтось збиває тварину ножем. Труп лишається на землі.
```

Do not introduce miss chances, damage rounds, armor, wounds or counterattacks here.

### Creature attack text

If a creature/NPC has `equippedWeaponKey`, use weapon-aware observer text.

Hunter with spear:

```txt
Лукан виставляє мисливський спис і збиває зайця, тоді підбирає здобич для падального рову.
```

Creature without weapon should keep current animal/predator text.

### Action title

Optional: keep queue titles generic (`атакуємо`, `освіжуємо труп`) unless a safe player-aware title helper already exists.

Do not force weapon-aware queue titles if it causes broad action queue refactors.

## Out of scope

- NPC seed changes beyond reading equipped weapon if present;
- item durability or dullness;
- combat target expansion;
- PvP;
- predator combat;
- item instances;
- weapon skills.
- full hand-slot conflict resolution between lit torches and held weapons/tools. Preserve the current MVP behavior until the follow-up can model "one torch + one tool" versus "two torches fill both hands" without surprising inventory loss.

## Acceptance checklist

- `npm run build` passes.
- `examine` of a player with an equipped knife says they hold it.
- `examine` of a player without equipped weapon still says they look unarmed.
- Location details show visible NPC/player weapons only when actors are visible.
- Freshen fails without an equipped sharp weapon.
- Freshen succeeds with `knife`, `sickle`, `hand_axe` or other catalog weapon marked `canFreshen`.
- Later follow-up: if a carried sharp tool is not currently in hand, freshening can auto-ready it when hands allow; if both hands are occupied by lit torches, the player should get a clear prompt to put something away first.
- Freshen failure does not consume stamina if validation happens before stamina spend.
- Attack without weapon keeps current unarmed behavior.
- Attack with knife/spear/axe/sword changes player and observer text.
- Target eligibility remains unchanged.

## Codex prompt

```txt
Implement WPN-002 from docs/planning/items/WPN-002-weapon-aware-look-examine-attack-freshen.md.
Use the weapon helpers from WPN-001. Do not expand combat rules or target eligibility. The goal is better display and action text, plus requiring a sharp equipped weapon for corpse freshening.
```
