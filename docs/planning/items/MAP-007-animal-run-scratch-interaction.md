---
id: MAP-007
title: Animal run scratch interaction
status: backlog
type: feature
area: world
priority: medium
estimate: 1-2h
tags:
  - map
  - dry_luka
  - location-features
  - interactions
  - atmosphere
depends_on:
  - MAP-004
---

# MAP-007 — Animal Run Scratch Interaction

## Goal

Make `Низький звіриний лаз` answer the player with one small local interaction: a character can leave one tiny scratch among the existing animal marks, and later `Роздивитися` / `/examine` can show the exact local scratch count.

This should make the location feel touched by people without turning the crawl into loot, a quest or a broad graffiti system.

## Player-Facing Direction

The existing location text:

```txt
Тут чути землю ближче, ніж небо. Низький лаз не веде до скарбів; він просто показує, що не кожна дорога любить бути дорогою. Трава над головою глушить вітер, а в сухій землі лишаються дрібні риски тих, хто проходив тут раніше.
```

should gain an examine/action hint along these lines:

```txt
Можете і ви <i>лишити</i> риску.
```

Use italic markup at the rendering/service boundary, not raw HTML inside authored world JSON.

If the same character already left a scratch here:

```txt
Ви вже лишали тут риску.
```

The first shipped slice should start with one existing local scratch so examine can already show that the place remembers prior passage.

## Visibility

In closer inspection, count these scratches exactly, unlike ordinary vague resource amounts:

```txt
Ви помічаєте:
- ягоди: багато
- лікарські трави: багато
- дрібні риски: дві
```

Use Ukrainian number words/cases for the count (`одна`, `дві`, `три`, etc.) where practical. If the counter grows beyond a comfortable written range, fall back to a clear exact numeral only after the localized small-number forms.

If `/look` is the view that currently shows only the exit, consider including an inline `Роздивитися` button under the location description when this feature is present, so the player notices that the location has a closer action.

## Implementation Notes

- Reuse the existing `meadow_16_05_animal_run` feature / `Низький звіриний лаз` destination context where possible.
- Prefer no Prisma schema or migration.
- One-time-per-character state can use an existing marker/event pattern, for example a `WorldEvent` marker keyed by player and feature/location.
- The visible count can live in `LocationFeature.data` or another existing lightweight state store.
- Only use a `ResourceNode`/resource-like representation if it can stay non-pickable and cannot leak into pickup, economy, admin grant or ordinary resource-gathering surfaces as loot.
- Do not add a broad public graffiti/signature system in this slice.

## Guardrails

- No rewards, quest flags, economy, combat, mentorship, `/spirit`, group movement, Prisma schema or migration changes.
- Do not expose exact hidden player ids or marker keys in player-facing text.
- Do not allow one character to increment the same local scratch counter repeatedly.
- Keep room notifications quiet; this is a subtle local interaction, not a camp-wide announcement.
- Keep `/look` compact and `/examine` richer.

## Tests

Add focused coverage where practical:

- feature/examine copy includes the italicized Ukrainian `лишити` action hint;
- a player can leave one scratch once;
- the same player receives the already-left text on repeat;
- a second player can increase the visible count;
- the exact count appears in examine/observed details with Ukrainian wording;
- the scratch count is not pickable, grantable loot or ordinary resource economy;
- no Prisma schema/migration changes.

## Codex Prompt

```txt
Implement MAP-007 from docs/planning/items/MAP-007-animal-run-scratch-interaction.md.

Keep it narrow: only the Низький звіриний лаз scratch interaction. Add an italicized Ukrainian leave-scratch hint in examine/action text, allow each player to leave one scratch, increase a visible exact local scratch count, and keep it out of loot/economy/resource pickup. Prefer existing WorldEvent/LocationFeature data patterns and do not add Prisma schema or migrations.
```
