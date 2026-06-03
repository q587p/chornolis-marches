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

The player should instead be able to understand whether the torch and weapon fit together:

```txt
В одній руці горить запалений факел.
В іншій руці: простий ніж.
```

or:

```txt
В обох руках горять запалені факели.
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
- update player self-view, `look` / `examine` target text and NPC / local-character descriptions;
- keep hidden inventory private unless technical/admin views or future search skills reveal it.

This should cover:

- player characters;
- named NPC / local characters;
- profession characters such as hunters and herbalists;
- future authored creatures that visibly carry tools or weapons.

## Player-facing wording

Ordinary text should stay diegetic and visible-state focused:

- `В одній руці горить запалений факел.`
- `В іншій руці: простий ніж.`
- `В обох руках горять запалені факели.`
- `Руки порожні.` only when no obvious held item exists.

Avoid raw slot names in ordinary UI unless the player explicitly chooses a left/right action later. Scribe/debug views may show exact slot keys.

## Decisions to make

- Whether the first implementation stores explicit `leftHandKey` / `rightHandKey`, or derives the visible hand state from current lit-torch count plus `equippedWeaponKey`.
- Whether future spear / bow / long tool items occupy one hand or both hands.
- Whether “dominant hand” should exist later or stay out of scope.
- How automatic readying works for freshening: a carried knife may be readied if one hand is free, but both hands full should produce a clear prompt.

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
