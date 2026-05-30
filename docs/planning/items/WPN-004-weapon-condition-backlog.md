---
id: WPN-004
title: Weapon condition, dulling and sharpening hooks
status: backlog
type: technical
area: items
priority: low
estimate: TBD
tags:
  - weapons
  - durability
  - item-instances
  - backlog
depends_on:
  - WPN-001
  - WPN-002
---

# WPN-004 — Weapon condition, dulling and sharpening hooks

Status: cold backlog

Depends on: item-instance groundwork, WPN-001/WPN-002 learning from production

## Goal

Design the future durability and sharpness model so the MVP weapon catalog does not block it.

This is not an immediate implementation task.

## Future design

Weapons should eventually have at least two lifetime concepts:

1. **Integrity** — can the object still function, or is it cracked/broken?
2. **Edge / point condition** — is it sharp, dull, bent or nicked?

Possible future fields on item instances:

```ts
type WeaponCondition = {
  integrity: number; // 0..100
  edge: number;      // 0..100 for blades/axes/sickles/swords
  point: number;     // 0..100 for spears/knives
  haft: number;      // 0..100 for spears/axes
  lastSharpenedAtTick?: number;
  repairedCount: number;
};
```

## Future effects

- Freshening dulls knives/sickles/axes slowly.
- Rough tools such as axes may produce worse yields or more waste later.
- Spears lose point condition through hunting.
- A dull knife can still freshen, but with lower yield or more time.
- A broken weapon cannot be equipped for combat/freshening.
- Sharpening can happen with whetstones, smiths or settlement services.
- Blacksmiths/woodworkers may repair different parts.

## MVP hook to keep now

The WPN-001 catalog may include:

```ts
futureConditionProfile?: "edge" | "point" | "haft";
```

No code should decrement condition in the MVP.

## Do not implement yet

- per-item condition storage;
- sharpening commands;
- blacksmith services;
- repair costs;
- breakage chance;
- quality tiers.

## Acceptance checklist when promoted

- Item instances exist or are being introduced.
- The old `equippedWeaponKey` path has a migration story.
- Freshening and attacks consume condition in a way that is visible but not spammy.
- Dullness affects text before it heavily affects mechanics.
- Repair/sharpening has at least one grounded world interaction.

## Codex prompt for later

```txt
Do not implement WPN-004 until item-instance groundwork exists. When promoted, design weapon condition as an extension of item instances, not as counters on ResourceType or aggregate PlayerResource rows.
```
