---
id: ALC-004
title: Herbalist bottle route and brewing demonstration
status: backlog
type: feature
area: npc
priority: high
estimate: 4-8h
tags:
  - npc
  - herbalist
  - alchemy
  - bottles
  - observation-learning
  - living-world
depends_on:
  - NPC-003
  - NPC-004
  - RECIPE-001
  - ALC-001
  - ALC-002
---

# ALC-004: Herbalist Bottle Route and Brewing Demonstration

## Goal

Let herbalist-like local characters use the same bottle/tincture loop as players in a narrow, observable way.

A herbalist should be able to visit the cellar/root-pocket bottle source, take or restock a small number of empty bottles, gather herbs/berries through existing behavior, and visibly prepare a tincture when enough resources are available.

## First Scope

- Add bottle-resupply intent to the existing herbalist route/service.
- Let herbalists recognize `empty_bottle_source` features.
- Let the herbalist carry a small number of `empty_bottle` resources through existing `CreatureResource` / actor inventory assumptions.
- If the herbalist has:
  - `empty_bottle x1`;
  - `herbs x2`;
  - `berries x1`;
  then they may choose a `BREW` / tincture-prep action instead of gathering/looking/resting.
- Use the same recipe helper as players where practical.
- Create a visible local action/source event so nearby players can observe the work.
- Optionally record creature `herbalism` / `practice` progress, or `gathering` / `practice` if `herbalism` is not yet introduced.
- Nearby players can learn through the existing observation bridge if supported.

## Suggested Visible Text

```text
Знахарка присідає біля полиці, притискає пляшечку коліном і розтирає трави з темними ягодами. Вона не поспішає: гіркота мусить перейти в сік, а не лишитися на пальцях.
```

## Guardrails

- Do not make herbalists drain player-owned resources.
- Do not make herbalists spam tinctures every tick.
- Do not create a shop, price, gift or barter loop here.
- Do not require a public `/skills` sheet.
- Do not let NPC crafting bypass recipe validation.
- Keep route behavior bounded and sparse.
- If actor inventory is incomplete for non-player resources, land the player path first and leave this task as follow-up.

## Acceptance

- A herbalist can resupply bottles from the authored source.
- A herbalist with sufficient ingredients can perform a visible tincture-prep action.
- The action uses shared recipe/resource assumptions where practical.
- Nearby players can observe it as a learning source without raw progress UI.
- Cooldowns/rate limits prevent message spam and recipe spam.
- Tests cover route planning, bottle resupply, recipe validation and observation-source recording.
