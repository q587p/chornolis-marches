---
id: SOC-001
title: Contacts / acquaintances MVP
status: backlog
type: feature
area: social
priority: high
tags:
  - social
  - contacts
  - acquaintances
  - actors
  - telegram
depends_on: []
---

# SOC-001 — Contacts / Acquaintances MVP

## Goal

Add the first persistent `Знайомства` layer for players: a player can remember visible people/NPCs without revealing too much about whether they are players or NPCs.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Add `PlayerContact` model and migration.
- Add `src/services/actorRefs.ts` helper for actor keys and display forms.
- Add `src/services/contacts.ts`.
- Add command or button flow to add a visible target to acquaintances.
- Add `/contacts` or `/znaiomstva` command to list known contacts.
- Do not implement reputation, factions, notes UI or trust levels yet.

## Suggested Player-Facing Copy

```text
Ви запам’ятали Марену.
```

```text
Знайомства:
- Марена — бачили нещодавно
- Остап — ішов крізь ліс мовчки
```

If target is unclear:

```text
Ви вже не бачите цієї постаті поруч.
```

## Implementation Notes

- Store `targetKey` as `PLAYER:<id>` or `CREATURE:<id>`.
- Snapshot visible name and grammatical forms at add time.
- In debug mode, optionally show actor key. In normal UI, do not show "player" / "NPC".
- Good auto-contact sources later: greet, say-to-target, group membership, quest interaction.

## Acceptance Criteria

- Player can add a visible player or non-animal creature to `Знайомства`.
- Duplicate add updates the existing contact instead of creating duplicates.
- `/contacts` lists contacts without exposing technical actor type.
- Build and tests pass.

## Suggested Tests

- actor key generation/parsing;
- add same target twice is idempotent;
- hidden/dead/gone target cannot be manually added unless already known.
