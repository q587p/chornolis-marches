---
id: ITEM-003
title: Item weight and encumbrance
status: backlog
type: feature
area: inventory
priority: medium
estimate: 4-8h
tags:
  - inventory
  - items
  - stamina
  - movement
  - pickup
  - survival
depends_on:
  - ITEM-001
  - ITEM-002
  - WPN-005
---

# ITEM-003: Item Weight and Encumbrance

## Goal

Give carried things weight, let heavy loads affect physical effort, and make
overloaded characters feel tired before the system becomes a hard inventory
wall.

This should support the living-world survival loop: a carcass, spare torches,
food, хмиз, weapons and future parcels should not all feel equally weightless.

## First Scope

- Add lightweight weight metadata for stable carried resources/items:
  - resource types such as berries, mushrooms, herbs, twigs, meat, torches,
    money and corpses/remains;
  - weapons/tools once their catalog is stable enough;
  - future containers can add capacity/weight modifiers later.
- Add a shared helper for carried load:
  - player inventory first;
  - NPC/creature carried resources later through the same shape where possible.
- Convert raw carried load into qualitative bands:
  - light / ordinary;
  - heavy;
  - overburdened;
  - barely manageable.
- Show qualitative load in `/me` or `Речі` only when useful. Avoid turning the
  ordinary UI into a numeric spreadsheet.
- Apply small effects to physical actions:
  - movement stamina cost or duration;
  - pickup / bulk pickup;
  - gathering;
  - freshening / butchering;
  - combat later, once combat posture and weapons settle.
- Keep the first implementation gentle:
  - mild load increases cost;
  - severe overload can block or require dropping something;
  - short atmospheric warnings explain what is happening.

## Player-Facing Copy Direction

Use diegetic, qualitative text:

```text
Поклажа тягне плечі. Крок ще можливий, але снаги йде більше.
```

```text
Цього вже забагато для дороги. Варто щось лишити або перекласти.
```

Avoid exposing exact formulas in ordinary UI. Exact weight, thresholds and
per-item values belong to scribe/admin/debug surfaces.

## Design Questions

- Whether weight is measured as simple integer `bulk` units or a named
  `weight` value.
- Whether carried corpses use species/body-size weight directly or a simplified
  corpse category.
- Whether coins/money stay very light but not perfectly free.
- Whether held items count differently from packed items.
- Whether future packs/bags reduce encumbrance, increase capacity or only
  organize items.
- Whether hunger/wounds reduce effective carry capacity later.

## Guardrails

- Do not make first-session starter items immediately overburden a newcomer.
- Do not punish players for tutorial/beginner safety supplies.
- Do not make weight a hidden death spiral: warnings should appear before a
  character becomes unable to move.
- Do not let `get all` or future queued pickup bypass load checks.
- Do not create raw numeric load spam in ordinary player messages.
- Keep scribe/admin tools able to inspect exact values for tuning.
- If adding item attachments to mail/parcels later, use this weight helper
  instead of inventing a second parcel capacity rule.

## Acceptance

- Stable carried item/resource definitions have weight metadata or an explicit
  default.
- A shared helper can compute carried load for a player.
- Ordinary UI can describe heavy load qualitatively.
- Physical actions can ask the helper for stamina/duration modifiers.
- `get all` / queued pickup respects load before adding too much at once.
- Dropping items immediately reduces carried load.
- Tests cover:
  - load calculation for stacked resources;
  - qualitative load bands;
  - stamina/duration modifier boundaries;
  - pickup refusal or warning at overload;
  - no overload for the intended newcomer starter kit.

## Risks

- Weight can become frustrating if it arrives before containers, packs or clear
  drop/put flows feel good.
- Current carried resources are stack-based, not item instances, so per-item
  quality/condition weight should stay out of scope.
- Corpse and carcass weight can change gate hunting and freshening balance; tune
  those loops separately rather than making every corpse impossible to carry.
- NPC inventory should eventually use the same weight rules, but player-facing
  encumbrance can land first.
