---
id: WPN-005
title: Hand slots and visible held items
status: backlog
type: feature
area: items
priority: high
estimate: 3-5h
tags:
  - weapons
  - inventory
  - equipment
  - visibility
  - npcs
depends_on:
  - WPN-001
  - WPN-002
---

# WPN-005 — Hand slots and visible held items

## Goal

Replace the current loose “in hand” display with a small hand-slot model that can say what is held in each hand for both player characters and NPC / local characters.

Current examples can look contradictory:

```txt
У вас горить запалений факел.
У руці: простий ніж.
```

or worse, after torch relighting:

```txt
У вас горять запалені факели (2).
У руці: короткий меч.
```

The player should instead be able to understand whether the torch and weapon fit together:

```txt
У руці: короткий меч.
У іншій руці: запалений факел.
```

or:

```txt
У руках: запалені факели (2).
```

or, later:

```txt
У правій руці: мисливський спис.
У лівій руці: нічого помітного.
```

## Scope

Add the smallest coherent equipment/visibility layer for hands:

- define two hand slots for visible held items;
- support lit torches, weapons and simple tools as openly held things;
- decide how to display “one torch + one weapon/tool”;
- decide what happens when both hands are occupied by lit torches and a weapon/tool is equipped;
- for the first non-schema slice, treat lit torches and one-handed weapons/tools as one-hand items; two lit torches occupy both hands and should force a currently held weapon/tool back to inventory or require an explicit put-away choice;
- if implementation needs a pragmatic bridge before explicit left/right slots, auto-unequip the held weapon/tool when a second lit torch is created, and make that response clear in player-facing text;
- update player self-view, `look` / `examine` target text and NPC / local-character descriptions;
- keep hidden inventory private unless technical/admin views or future search skills reveal it.

This should cover:

- player characters;
- named NPC / local characters;
- profession characters such as hunters and herbalists;
- future authored creatures that visibly carry tools or weapons.

## Player-facing wording

Ordinary text should stay diegetic and visible-state focused:

- `У руці: короткий меч.`
- `У іншій руці: запалений факел.`
- `У руках: запалені факели (2).`
- `Руки порожні.` only when no obvious held item exists.

Avoid raw slot names in ordinary UI unless the player explicitly chooses a left/right action later. Scribe/debug views may show exact slot keys.

## Decisions to make

- Whether the first implementation stores explicit `leftHandKey` / `rightHandKey`, or derives the visible hand state from current lit-torch count plus `equippedWeaponKey`.
- Whether future spear / bow / long tool items occupy one hand or both hands.
- Whether “dominant hand” should exist later or stay out of scope.
- How automatic readying works for freshening: a carried knife may be readied if one hand is free, but both hands full should produce a clear prompt.
- Whether the first implementation should auto-unequip a weapon/tool when lighting a second torch, or ask for explicit confirmation. If confirmation is too large for the first slice, prefer auto-unequip with clear text over contradictory hand display.

## Out of scope

- full item instances;
- weapon durability or quality;
- concealed equipment;
- inventory weight / encumbrance;
- full combat stance system;
- left/right targeted attacks.

## Acceptance checklist

- A player with one lit torch and one equipped knife does not also see `Руки порожні`.
- A player with one lit torch and one equipped knife sees that both are held coherently.
- A player with two lit torches sees both hands occupied.
- A player with two lit torches and an equipped short sword never sees both `У руках: запалені факели (2)` and `У руці: короткий меч` at the same time.
- Lighting a second torch while a one-handed weapon/tool is equipped either unequips the weapon/tool into inventory with clear text, or asks for an explicit put-away choice before the second torch is lit.
- NPC / local-character `look` and `examine` descriptions can show visible held items with the same helper.
- Existing torch visibility and weapon display tests still pass.
- Dropping, dousing or burning out a torch updates visible hand text.
- Equipping or unequipping a weapon/tool updates visible hand text.
- Ordinary player-facing output does not expose hidden inventory or raw debug slot keys.

## Codex prompt

```txt
Implement WPN-005 from docs/planning/items/WPN-005-hand-slots-and-visible-held-items.md.
Keep the first slice focused on visible held-item display for players and NPC/local characters. Do not add item instances, durability, encumbrance or broader combat stance. Preserve existing torch and weapon behavior while making hand text coherent.
```
